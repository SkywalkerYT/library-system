// ============================================
// Auth 入参校验 schema（zod）
// 同样的 schema 在前端复用：packages/shared/src/index.ts
// ============================================
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少 8 位').max(72, '密码最多 72 位（bcrypt 限制）'),
  displayName: z.string().min(1, '昵称不能为空').max(50, '昵称最多 50 字'),
});

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
