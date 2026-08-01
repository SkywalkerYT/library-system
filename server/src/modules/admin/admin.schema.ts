// ============================================
// Admin 入参校验 schema
// 与 books.listQuerySchema 对齐风格（page/pageSize 上限 100、keyword 长度上限 50）
// ============================================
import { z } from 'zod';

// ★ 用 .coerce 处理 query string（前端发的永远是 string），与 books 一致
export const adminUserListQuerySchema = z.object({
  keyword: z.string().trim().max(50).optional(),
  // ★ optional() 后用 preprocess 处理 "true"/"false"/"1"/"0"，避免前端发空字符串时 zod 默认转 undefined 丢失意图
  isAdmin: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
