// ============================================
// Books 仓储层（Prisma 调用封装）
// ★ 社区馆藏：所有 Book 查询不再带 userId 隔离条件
// ★ 业务逻辑下沉到 service 层，repo 只做"翻译" Prisma
// ============================================
import { prisma } from '../../config/prisma.js';
import { HttpError } from '../../utils/errors.js';
import type { Book, BookStatus, Prisma } from '@prisma/client';

export const booksRepo = {
  async findMany(params: {
    keyword?: string;
    category?: string;
    status?: BookStatus;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.BookWhereInput = {};
    if (params.keyword) {
      where.OR = [
        { title: { contains: params.keyword } },
        { author: { contains: params.keyword } },
      ];
    }
    if (params.category) where.category = params.category;
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.book.count({ where }),
    ]);

    return { items: items.map(toDto), total };
  },

  async findById(id: number) {
    const book = await prisma.book.findFirst({ where: { id } });
    return book ? toDto(book) : null;
  },

  async create(data: { title: string; author: string; category: string; summary?: string | null }) {
    const book = await prisma.book.create({ data });
    return toDto(book);
  },

  async update(id: number, data: { title: string; author: string; category: string; summary?: string | null }) {
    // ★ 先检查存在（避免 update 0 条返回 OK 导致 404 误报成 200）
    const existing = await prisma.book.findFirst({ where: { id } });
    if (!existing) return null;
    const book = await prisma.book.update({ where: { id }, data });
    return toDto(book);
  },

  async delete(id: number) {
    const existing = await prisma.book.findFirst({ where: { id } });
    if (!existing) return false;
    await prisma.book.delete({ where: { id } });
    return true;
  },

  async batchDelete(ids: number[]) {
    const result = await prisma.book.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  },

  async borrow(id: number, data: { borrowerName: string; borrowerPhone: string; dueAt: Date }) {
    // ★ 原子借出：用 updateMany 带 WHERE status='AVAILABLE'，
    //   MySQL 行锁保证并发只有一个请求能成功，避免 findFirst+update 的 TOCTOU 窗口
    const updated = await prisma.book.updateMany({
      where: { id, status: 'AVAILABLE' },
      data: {
        status: 'BORROWED',
        borrowerName: data.borrowerName,
        borrowerPhone: data.borrowerPhone,
        borrowedAt: new Date(),
        dueAt: data.dueAt,
      },
    });
    if (updated.count === 0) {
      // 没匹配上：要么不存在，要么已被借出 —— 再查一次区分
      const exists = await prisma.book.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;
      throw new HttpError(409, 'ALREADY_BORROWED', '该书已被借出');
    }
    const book = await prisma.book.findUnique({ where: { id } });
    return book ? toDto(book) : null;
  },

  async return(id: number) {
    // ★ 原子归还：WHERE status='BORROWED' 才能匹配上
    const updated = await prisma.book.updateMany({
      where: { id, status: 'BORROWED' },
      data: {
        status: 'AVAILABLE',
        borrowerName: null,
        borrowerPhone: null,
        borrowedAt: null,
        dueAt: null,
      },
    });
    if (updated.count === 0) {
      const exists = await prisma.book.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;
      throw new HttpError(409, 'NOT_BORROWED', '该书未借出');
    }
    const book = await prisma.book.findUnique({ where: { id } });
    return book ? toDto(book) : null;
  },

  async stats() {
    const [total, borrowed] = await Promise.all([
      prisma.book.count(),
      prisma.book.count({ where: { status: 'BORROWED' } }),
    ]);
    return { total, borrowed, available: total - borrowed };
  },

  // ★ 全量分类聚合：不受分页 / 筛选影响，按书数倒序
  // 给前端分类 pill 列表用——前端不能从当前页 items 推断（只 12 本会丢分类）
  async categories() {
    const groups = await prisma.book.groupBy({
      by: ['category'],
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
    });
    return groups.map((g) => ({ name: g.category, count: g._count._all }));
  },
};

// ★ DTO 转换：Prisma 的 Date 字段 → ISO 字符串（JSON 序列化友好）
function toDto(book: Book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    status: book.status,
    summary: book.summary,
    borrowerName: book.borrowerName,
    borrowerPhone: book.borrowerPhone,
    borrowedAt: book.borrowedAt?.toISOString() ?? null,
    dueAt: book.dueAt?.toISOString() ?? null,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}