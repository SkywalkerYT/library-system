// ============================================
// Books 仓储层（Prisma 调用封装）
// ★ 所有查询强制带 userId → 用户隔离
// ★ 业务逻辑下沉到 service 层，repo 只做"翻译" Prisma
// ============================================
import { prisma } from '../../config/prisma.js';
import { HttpError } from '../../utils/errors.js';
import type { Book, BookStatus, Prisma } from '@prisma/client';

export const booksRepo = {
  async findMany(userId: number, params: {
    keyword?: string;
    category?: string;
    status?: BookStatus;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.BookWhereInput = { userId };
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

  async findById(userId: number, id: number) {
    const book = await prisma.book.findFirst({ where: { id, userId } });
    return book ? toDto(book) : null;
  },

  async create(userId: number, data: { title: string; author: string; category: string; summary?: string | null }) {
    const book = await prisma.book.create({
      data: { ...data, userId },
    });
    return toDto(book);
  },

  async update(userId: number, id: number, data: { title: string; author: string; category: string; summary?: string | null }) {
    // ★ 先检查存在（避免 update 0 条返回 OK 导致 404 误报成 200）
    const existing = await prisma.book.findFirst({ where: { id, userId } });
    if (!existing) return null;
    const book = await prisma.book.update({ where: { id }, data });
    return toDto(book);
  },

  async delete(userId: number, id: number) {
    const existing = await prisma.book.findFirst({ where: { id, userId } });
    if (!existing) return false;
    await prisma.book.delete({ where: { id } });
    return true;
  },

  async batchDelete(userId: number, ids: number[]) {
    const result = await prisma.book.deleteMany({ where: { id: { in: ids }, userId } });
    return result.count;
  },

  async borrow(userId: number, id: number, data: { borrowerName: string; borrowerPhone: string; dueAt: Date }) {
    const existing = await prisma.book.findFirst({ where: { id, userId } });
    if (!existing) return null;
    if (existing.status === 'BORROWED') {
      throw new HttpError(409, 'ALREADY_BORROWED', '该书已被借出');
    }
    const book = await prisma.book.update({
      where: { id },
      data: {
        status: 'BORROWED',
        borrowerName: data.borrowerName,
        borrowerPhone: data.borrowerPhone,
        borrowedAt: new Date(),
        dueAt: data.dueAt,
      },
    });
    return toDto(book);
  },

  async return(userId: number, id: number) {
    const existing = await prisma.book.findFirst({ where: { id, userId } });
    if (!existing) return null;
    if (existing.status === 'AVAILABLE') {
      throw new HttpError(409, 'NOT_BORROWED', '该书未借出');
    }
    const book = await prisma.book.update({
      where: { id },
      data: {
        status: 'AVAILABLE',
        borrowerName: null,
        borrowerPhone: null,
        borrowedAt: null,
        dueAt: null,
      },
    });
    return toDto(book);
  },

  async stats(userId: number) {
    const [total, borrowed] = await Promise.all([
      prisma.book.count({ where: { userId } }),
      prisma.book.count({ where: { userId, status: 'BORROWED' } }),
    ]);
    return { total, borrowed, available: total - borrowed };
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
