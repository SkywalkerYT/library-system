// ============================================
// Admin 路由
// ★ 模块级双重守卫：所有 /api/admin/* 都自动经过 requireAuth + requireAdmin
//   未来加端点只需 router.get('/xxx', ...) 即可，权限无需重复挂载
// ============================================
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { requireAuth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { adminController } from './admin.controller.js';

const adminRouter = Router();

// ★ 一次性挂载：每个 handler 都会先经过两层中间件
adminRouter.use(requireAuth, requireAdmin);

// ────────────────────────────────────────────
// Admin 批量上传封面（cover-XXXX.jpg 命名约定）
// ────────────────────────────────────────────
//
// 设计要点：
//   1. 用 memoryStorage —— 不在 multer 阶段决定文件名，因为我们要在 service 层
//      根据 :id 或 originalname 解析出 bookId，再以 cover-{id}.{ext} 命名
//   2. 文件名是契约：cover-{4位ID}.{ext} —— 前端能直接 GET /api/covers/cover-0042.jpg 预览
//   3. 5MB / jpg|png|webp / 单次最多 20 张（保护 pod 内存：20×5MB = 100MB 上限）
//
const COVER_DIR = path.join(process.cwd(), 'uploads', 'covers');
fs.mkdirSync(COVER_DIR, { recursive: true });

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) return cb(null, true);
    cb(new Error('UNSUPPORTED_MEDIA_TYPE'));
  },
});

// ★ 已有路由
adminRouter.get('/users', adminController.listUsers);

// ★ 新增：单本封面上传
//   - 文件字段名 'file'（前端 FormData 用这个名字）
//   - 文件名由 :id 决定，前端可省略 originalname 约束
adminRouter.post(
  '/books/:id/cover',
  coverUpload.single('file'),
  adminController.uploadCoverForBook,
);

// ★ 新增：批量封面上传
//   - 字段名 'files'（数组）
//   - 文件名由 originalname 解析出 bookId（支持 cover-0042.jpg / Cover-42.JPG 等）
adminRouter.post(
  '/books/batch-cover',
  coverUpload.array('files', 20),
  adminController.batchUploadCovers,
);

export { adminRouter };
