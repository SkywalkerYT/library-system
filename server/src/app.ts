// ============================================
// Express App 装配
// 类似 Lego：按顺序拼装中间件
// ============================================
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { booksRouter } from './modules/books/books.routes.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // ★ CORS：双层白名单
  //   1) 精确白名单：env.CLIENT_ORIGIN（逗号分隔），覆盖本地 + Vercel 生产域
  //   2) Vercel 子域正则：覆盖所有 *.vercel.app（生产 + 每个 PR 的 preview）
  //      Vercel 控制所有 .vercel.app 域名，不会误放行第三方
  // credentials: true 让未来切换 cookie 鉴权也能直接用
  const exactOrigins = env.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
  const vercelPreviewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
  app.use(
    cors({
      origin: (origin, cb) => {
        // 同源 / server-to-server（curl、health check）没有 Origin 头，默认放行
        if (!origin) return cb(null, true);
        if (exactOrigins.includes(origin)) return cb(null, true);
        if (vercelPreviewPattern.test(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    })
  );

  // ★ JSON 解析器：JSON 始终按 UTF-8 处理（defaultCharset 只对 urlencoded 生效，无意义）
  app.use(express.json({ limit: '1mb' }));

  // ★ 路由按模块挂载
  app.get('/api/health', (_req, res) => res.json({ success: true, data: { ok: true } }));
  app.use('/api/auth', authRouter);
  app.use('/api/books', booksRouter);

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
