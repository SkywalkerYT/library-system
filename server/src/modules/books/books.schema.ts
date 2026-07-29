// ============================================
// Books 入参校验 schema
// ============================================
import { z } from 'zod';

const trimmed = (max: number) => z.string().trim().min(1, '不能为空').max(max, `最多 ${max} 字`);

// ★ 空白 / 全空格 summary 归一为 null —— 避免 DB 里塞一堆 "   " 干扰搜索/显示
const summaryField = z
  .string()
  .max(500, '最多 500 字')
  .transform((s) => (s.trim() === '' ? null : s.trim()))
  .optional()
  .nullable();

export const bookCreateSchema = z.object({
  title: trimmed(50),
  author: trimmed(30),
  category: trimmed(20),
  summary: summaryField,
});

export const bookUpdateSchema = z.object({
  title: trimmed(50),
  author: trimmed(30),
  category: trimmed(20),
  summary: summaryField,
});

export const borrowSchema = z
  .object({
    borrowerName: trimmed(30),
    borrowerPhone: z
      .string()
      .trim()
      .regex(/^[\d\s\-+()]{5,20}$/, '请输入有效的电话号码'),
    dueAt: z.string().datetime({ message: '截止时间格式错误' }),
  })
  .refine((d) => new Date(d.dueAt).getTime() > Date.now(), {
    message: '应还时间必须晚于现在',
    path: ['dueAt'],
  });

export const listQuerySchema = z.object({
  keyword: z.string().trim().max(50).optional(),
  category: z.string().trim().max(20).optional(),
  status: z.enum(['AVAILABLE', 'BORROWED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const batchDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, '至少选一个').max(100, '一次最多 100 本'),
});

export type BookCreateInput = z.infer<typeof bookCreateSchema>;
export type BookUpdateInput = z.infer<typeof bookUpdateSchema>;
export type BorrowInput = z.infer<typeof borrowSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
