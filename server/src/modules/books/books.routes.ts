// ============================================
// Books 路由（完整版）
// 全部受 requireAuth 保护 → 用户隔离
// ============================================
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { booksController } from './books.controller.js';

export const booksRouter = Router();

// ★ 全部路由先 requireAuth —— 一行覆盖全部
booksRouter.use(requireAuth);

booksRouter.get('/', booksController.list);
booksRouter.get('/stats', booksController.stats); // ★ /stats 必须在 /:id 之前，否则会被当成 id
booksRouter.get('/:id', booksController.get);
booksRouter.post('/', booksController.create);
booksRouter.patch('/:id', booksController.update);
booksRouter.delete('/:id', booksController.remove);
booksRouter.post('/batch-delete', booksController.batchDelete);
booksRouter.post('/:id/borrow', booksController.borrow);
booksRouter.post('/:id/return', booksController.return);
