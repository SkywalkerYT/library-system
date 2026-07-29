// ============================================
// 环境变量校验（启动时立刻发现缺配）
// 用 zod 替代 if (!process.env.X) throw —— 错误信息更友好
// ============================================
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET 至少 16 个字符'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ 环境变量配置错误：');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
