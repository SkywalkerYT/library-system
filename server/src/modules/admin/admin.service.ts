// ============================================
// Admin 业务层
// - 用户列表：仅查询
// - 批量封面上传：写文件 + 更新 Book.coverUrl，单图失败隔离
// ============================================
import { prisma } from '../../config/prisma.js';
import type { AdminUserListQuery } from './admin.schema.js';
import type { Prisma } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HttpError } from '../../utils/errors.js';
import { detectImageExt } from '../../utils/image.js';

const COVER_DIR = path.join(process.cwd(), 'uploads', 'covers');

// ────────────────────────────────────────────
// 文件名 → bookId 解析
//
// 接受的变体（容错友好）：
//   - cover-0042.jpg / cover-42.png
//   - Cover-42.JPG（大小写不敏感）
//   - cover  0042.jpg / cover_42.jpg（空格/下划线）
//   - cover-42’.jpg（含 U+2019 全角单引号 —— 用户的真实坑）
//   - cover0042.jpg（无连字符）
//
// 不接受：
//   - abc.jpg、cover.jpg、cover-.jpg、cover-abc.jpg
// ────────────────────────────────────────────
export function parseBookIdFromFilename(filename: string): number | null {
  // 1) 标准化：全角 → 半角、去掉空白/下划线/各种引号（含 U+2019 ’ U+2018 ‘）
  const cleaned = filename
    .normalize('NFKC')
    .replace(/[\s_'’‘""]/g, '')
    .toLowerCase();
  // 2) 抓主名 + 扩展名
  const m = cleaned.match(/^cover-?(\d+)\.(jpg|jpeg|png|webp)$/);
  if (!m) return null;
  const id = parseInt(m[1] ?? '0', 10);
  return id > 0 ? id : null;
}

// 简单的并发限流器（避免一次性 20 张图全打 DB + 磁盘）
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      const item = items[i];
      if (item === undefined) continue;
      results[i] = await worker(item, i);
    }
  };
  const runners = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(runners);
  return results;
}

export const adminService = {
  /**
   * 用户列表 + 当前借阅数
   * 借阅数走 Book.borrowerUserId 索引（已在 schema 加 @@index([borrowerUserId, status])）
   *   → 单条统计：WHERE borrowerUserId = ? AND status = 'BORROWED'
   *   → 列表 N 条：Promise.all 并行执行，避免 N+1 串行
   */
  async listUsers(q: AdminUserListQuery) {
    const where: Prisma.UserWhereInput = {};
    if (q.keyword) {
      where.OR = [
        { email: { contains: q.keyword } },
        { displayName: { contains: q.keyword } },
      ];
    }
    if (q.isAdmin !== undefined) where.isAdmin = q.isAdmin;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          id: true,
          email: true,
          displayName: true,
          isAdmin: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    // ★ 借阅数：并行 groupBy（一次 SQL 拿全部，按 userId 聚合）
    //   比 N+1 串行 count 节省 ~50ms/page
    const userIds = users.map((u) => u.id);
    const borrowedCounts = userIds.length === 0
      ? []
      : await prisma.book.groupBy({
          by: ['borrowerUserId'],
          where: {
            borrowerUserId: { in: userIds },
            status: 'BORROWED',
          },
          _count: { _all: true },
        });
    const countMap = new Map<number, number>();
    for (const row of borrowedCounts) {
      if (row.borrowerUserId !== null) {
        countMap.set(row.borrowerUserId, row._count._all);
      }
    }

    const items = users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt.toISOString(),
      borrowedCount: countMap.get(u.id) ?? 0,
    }));

    return { items, total };
  },

  // ────────────────────────────────────────────
  // 单本封面落盘 + DB 更新
  //   - filename = cover-{id 4位零填充}.{ext}
  //   - replace=false 时已有封面抛 409（防误覆盖）
  //   - ext 按 buffer magic number 判定：不信 mimetype（浏览器按扩展名撒谎）
  //     修 2026-08-05「批量上传的图后端不显示」bug：原 ALLOWED_EXT[mimetype] 把 PNG 存为 .jpg，
  //     Express.static 返 image/jpeg，Safari/iOS 拒绝渲染 → onerror → 占位 SVG
  // ────────────────────────────────────────────
  async applyCoverForBook(bookId: number, file: Express.Multer.File, replace: boolean) {
    const ext = detectImageExt(file.buffer);
    if (!ext) {
      throw new HttpError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        `不支持的图片格式（mimetype=${file.mimetype ?? 'unknown'}，` +
          `期望 JPEG/PNG/WebP）`,
      );
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, coverUrl: true },
    });
    if (!book) throw new HttpError(404, 'BOOK_NOT_FOUND', `图书 ID ${bookId} 不存在`);

    if (book.coverUrl && !replace) {
      throw new HttpError(409, 'ALREADY_HAS_COVER', `ID=${bookId} 已有封面，请传 replace=true 覆盖`);
    }

    const filename = `cover-${String(bookId).padStart(4, '0')}.${ext}`;
    const filepath = path.join(COVER_DIR, filename);
    await fs.writeFile(filepath, file.buffer);

    const coverUrl = `/api/covers/${filename}`;
    await prisma.book.update({
      where: { id: bookId },
      data: { coverUrl },
    });

    return { id: bookId, coverUrl, replaced: !!book.coverUrl };
  },

  // ────────────────────────────────────────────
  // 批量封面上传（错误隔离）
  //   - 解析失败的 originalname → errors[]
  //   - 解析成功的图：并发上限 5，每张独立 try/catch
  // ────────────────────────────────────────────
  async batchApplyCovers(files: Express.Multer.File[], replace: boolean) {
    const results = await mapWithConcurrency(files, 5, async (file) => {
      const bookId = parseBookIdFromFilename(file.originalname);
      if (!bookId) {
        return {
          ok: false as const,
          filename: file.originalname,
          reason: 'FILENAME_PARSE_FAILED',
          message: `文件名 ${file.originalname} 无法解析出 bookId（期望 cover-{id}.{jpg|png|webp}）`,
        };
      }
      try {
        const data = await this.applyCoverForBook(bookId, file, replace);
        return { ok: true as const, filename: file.originalname, ...data };
      } catch (err) {
        const e = err as { code?: string; message?: string };
        return {
          ok: false as const,
          filename: file.originalname,
          bookId,
          reason: e.code ?? 'UNKNOWN',
          message: e.message ?? String(err),
        };
      }
    });

    const items = results.filter((r) => r.ok);
    const errors = results.filter((r) => !r.ok);

    return {
      total: files.length,
      success: items.length,
      failed: errors.length,
      items,
      errors,
    };
  },
};
