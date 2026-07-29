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

  // ★ CORS：明确白名单前端域，credentials 允许前端发 Authorization 头
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(',').map((s) => s.trim()),
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
