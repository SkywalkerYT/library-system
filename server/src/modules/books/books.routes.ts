// ============================================
// Books 路由（完整版）
// 全部受 requireAuth 保护 → 用户鉴权
// 写操作（POST/PATCH/DELETE）额外挂 writeLimiter → 防滥用
// ============================================
import express, { Router, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { requireAuth } from '../../middleware/auth.js';
import { booksController } from './books.controller.js';
import { writeLimiter } from './books.rateLimit.js';

export const booksRouter = Router();

// ★ 全部路由先 requireAuth —— 一行覆盖全部
booksRouter.use(requireAuth);

// ★ 上传封面：multer 落盘到 <cwd>/uploads/covers/<uuid>.<ext>
//   - 文件名 uuid 化 → 防止特殊字符 / 路径穿越 / 嗅探
//   - 5MB 上限：5MB 对 600×800 封面已经过 4K 远，足够清晰
//   - 白名单 mime：jpeg/png/webp，禁止 gif/svg（svg 可内联脚本，安全风险）
//   - storage 用 diskStorage 而非 memoryStorage：落盘后 multer 立刻释放内存，
//     避免 100 并发上传把 Node 内存打爆；文件大小有 limit 兜底
const COVER_DIR = path.join(process.cwd(), 'uploads', 'covers');
fs.mkdirSync(COVER_DIR, { recursive: true });

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const coverUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, COVER_DIR),
    filename: (_req, file, cb) => {
      const ext = ALLOWED_MIME[file.mimetype];
      const uuid = crypto.randomUUID();
      cb(null, `${uuid}.${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) return cb(null, true);
    cb(new Error('UNSUPPORTED_MEDIA_TYPE'));
  },
});

booksRouter.get('/', booksController.list);
booksRouter.get('/stats', booksController.stats); // ★ /stats 必须在 /:id 之前，否则会被当成 id
booksRouter.get('/categories', booksController.categories); // ★ 同上：必须在 /:id 之前
booksRouter.get('/:id', booksController.get);

// ★ 上传封面 → 返回 coverUrl 路径，前端再写进表单
//   必须在 /:id 之前注册路由（避免被 /:id 拦截）；同理先于 batch-delete
//   单独 limiter：上传成本更高，但写操作 60/min 已够，不另开限流
booksRouter.post('/upload-cover', writeLimiter, coverUpload.single('file'), booksController.uploadCover);

// ★ 写操作挂 writeLimiter（60 次/分钟）—— 读操作不限流
booksRouter.post('/', writeLimiter, booksController.create);
booksRouter.patch('/:id', writeLimiter, booksController.update);
booksRouter.delete('/:id', writeLimiter, booksController.remove);
booksRouter.post('/batch-delete', writeLimiter, booksController.batchDelete);
booksRouter.post('/:id/borrow', writeLimiter, booksController.borrow);
booksRouter.post('/:id/return', writeLimiter, booksController.return);

// ★ multer 错误（UNSUPPORTED_MEDIA_TYPE / LIMIT_FILE_SIZE）→ 转 4xx
//   必须放最后：multer 抛错时 next(err) 才走到这里
booksRouter.use((err: unknown, _req: express.Request, res: express.Response, next: NextFunction) => {
  const e = err as { code?: string; message?: string };
  if (e?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: '封面大小不能超过 5MB' },
    });
  }
  if (e?.message === 'UNSUPPORTED_MEDIA_TYPE') {
    return res.status(415).json({
      success: false,
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: '仅支持 jpg/png/webp 格式' },
    });
  }
  next(err);
});
