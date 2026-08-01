// ============================================
// Admin 业务层
// 仅做查询，不做写操作（本次范围不提供升降权 / 删除 UI —— 最小满足"用户列表页"）
// ============================================
import { prisma } from '../../config/prisma.js';
import type { AdminUserListQuery } from './admin.schema.js';
import type { Prisma } from '@prisma/client';

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
};
