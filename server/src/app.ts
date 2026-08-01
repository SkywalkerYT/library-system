// ============================================
// Express App 装配
// 类似 Lego：按顺序拼装中间件
// ============================================
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { booksRouter } from './modules/books/books.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // ★ 信任一层反向代理（Sealos / Railway / Nginx 等）——
  //   否则 express-rate-limit 拿到的全是代理 IP，全局一刀切封禁
  app.set('trust proxy', 1);

  // ★ CORS：双层白名单
  //   1) 精确白名单：env.CLIENT_ORIGIN（逗号分隔），覆盖本地 + Vercel 生产域
  //   2) Vercel preview 子域：env.VERCEL_PREVIEW_ORIGINS（逗号分隔）—— 显式白名单
  //      之前用通配正则放开所有 *.vercel.app，攻击者可注册任意 vercel.app 子域绕过。
  //      现在必须显式声明每个 preview 域名。
  // credentials: true 让未来切换 cookie 鉴权也能直接用
  const exactOrigins = env.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
  const vercelPreviewOrigins = (env.VERCEL_PREVIEW_ORIGINS ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin: (origin, cb) => {
        // 同源 / server-to-server（curl、health check）没有 Origin 头，默认放行
        if (!origin) return cb(null, true);
        if (exactOrigins.includes(origin)) return cb(null, true);
        if (vercelPreviewOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    })
  );

  // ★ JSON 解析器：JSON 始终按 UTF-8 处理（defaultCharset 只对 urlencoded 生效，无意义）
  app.use(express.json({ limit: '1mb' }));

  // ★ 路由按模块挂载
  // /api/health 真实探活：DB 能查 → ok=true，否则 false（仍返 200，让 LB 通过 data.ok 判断）
  app.get('/api/health', async (_req, res) => {
    const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    res.json({
      success: true,
      data: { ok: dbOk, uptime: process.uptime(), ts: Date.now() },
    });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/books', booksRouter);
  // ★ /api/admin/* 走 adminRouter —— 模块级 requireAuth + requireAdmin 双重守卫
  app.use('/api/admin', adminRouter);

  // ★ 404 兜底
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `路由不存在: ${req.method} ${req.path}` },
    });
  });

  app.use(errorHandler);
  return app;
}
