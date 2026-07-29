// ============================================
// Books 控制器
// ============================================
import { Request, Response, NextFunction } from 'express';
import { booksService } from './books.service.js';
import { HttpError } from '../../utils/errors.js';
import {
  bookCreateSchema,
  bookUpdateSchema,
  batchDeleteSchema,
  borrowSchema,
  listQuerySchema,
} from './books.schema.js';

// ★ 统一从 path 中解析并校验 id（避免每个 handler 重复 Number + 判断）
// 失败时抛 HttpError → 错误中间件统一处理
function parseIdParam(req: Request): number {
  const raw = req.params.id;
  // 路径里的 id 必须是正整数（防 /books/abc、/books/-1、/books/1.5）
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'BAD_ID', `无效的 id：${raw}`);
  }
  return id;
}

export const booksController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const q = listQuerySchema.parse(req.query);
      const data = await booksService.list(req.userId!, q);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseIdParam(req);
      const data = await booksService.get(req.userId!, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = bookCreateSchema.parse(req.body);
      const data = await booksService.create(req.userId!, input);
      // ★ 201 Created：POST 创建资源 → REST 语义
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseIdParam(req);
      const input = bookUpdateSchema.parse(req.body);
      const data = await booksService.update(req.userId!, id, input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseIdParam(req);
      await booksService.remove(req.userId!, id);
      res.json({ success: true, data: { id } });
    } catch (err) {
      next(err);
    }
  },

  async batchDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = batchDeleteSchema.parse(req.body);
      const data = await booksService.batchDelete(req.userId!, ids);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async borrow(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseIdParam(req);
      const input = borrowSchema.parse(req.body);
      const data = await booksService.borrow(req.userId!, id, input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async return(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseIdParam(req);
      const data = await booksService.return(req.userId!, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await booksService.stats(req.userId!);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
