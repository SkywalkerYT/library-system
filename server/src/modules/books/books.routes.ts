// ============================================
// Books 路由（完整版）
// 全部受 requireAuth 保护 → 用户鉴权
// 写操作（POST/PATCH/DELETE）额外挂 writeLimiter → 防滥用
// ============================================
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { booksController } from './books.controller.js';
import { writeLimiter } from './books.rateLimit.js';

export const booksRouter = Router();

// ★ 全部路由先 requireAuth —— 一行覆盖全部
booksRouter.use(requireAuth);

booksRouter.get('/', booksController.list);
booksRouter.get('/stats', booksController.stats); // ★ /stats 必须在 /:id 之前，否则会被当成 id
booksRouter.get('/categories', booksController.categories); // ★ 同上：必须在 /:id 之前
booksRouter.get('/:id', booksController.get);

// ★ 写操作挂 writeLimiter（60 次/分钟）—— 读操作不限流
booksRouter.post('/', writeLimiter, booksController.create);
booksRouter.patch('/:id', writeLimiter, booksController.update);
booksRouter.delete('/:id', writeLimiter, booksController.remove);
booksRouter.post('/batch-delete', writeLimiter, booksController.batchDelete);
booksRouter.post('/:id/borrow', writeLimiter, booksController.borrow);
booksRouter.post('/:id/return', writeLimiter, booksController.return);
