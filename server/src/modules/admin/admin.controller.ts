// ============================================
// Admin 控制器
// 仅解析入参 + 调用 service；权限由路由层 adminRouter.use(requireAuth, requireAdmin) 统一拦截
// ============================================
import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service.js';
import { adminUserListQuerySchema } from './admin.schema.js';
import { HttpError } from '../../utils/errors.js';

export const adminController = {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // ★ query string 校验：page/pageSize coerce、isAdmin union+transform 都已就绪
      const q = adminUserListQuerySchema.parse(req.query);
      const data = await adminService.listUsers(q);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ────────────────────────────────────────────
  // 单本封面上传：/api/admin/books/:id/cover
  //   - URL :id 决定 bookId
  //   - body.replace='true' 时允许覆盖已有封面，否则 409
  // ────────────────────────────────────────────
  async uploadCoverForBook(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(400, 'BAD_ID', `无效的 id：${req.params.id}`);
      }
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        throw new HttpError(400, 'NO_FILE', '未收到文件');
      }
      // ★ FormData 里 replace 字段：字符串 'true' 才算 true
      const replace = String(req.body?.replace ?? '') === 'true';

      const data = await adminService.applyCoverForBook(id, file, replace);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ────────────────────────────────────────────
  // 批量封面上传：/api/admin/books/batch-cover
  //   - files 数组，originalname 解析 bookId
  //   - 单张失败不影响其他图（结果分 items[] / errors[]）
  // ────────────────────────────────────────────
  async batchUploadCovers(req: Request, res: Response, next: NextFunction) {
    try {
      const files = ((req as Request & { files?: Express.Multer.File[] }).files) ?? [];
      if (files.length === 0) {
        throw new HttpError(400, 'NO_FILE', '未收到任何文件');
      }
      const replace = String(req.body?.replace ?? '') === 'true';

      const data = await adminService.batchApplyCovers(files, replace);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
