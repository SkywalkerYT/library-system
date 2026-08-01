// ============================================
// Admin 控制器
// 仅解析入参 + 调用 service；权限由路由层 adminRouter.use(requireAuth, requireAdmin) 统一拦截
// ============================================
import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service.js';
import { adminUserListQuerySchema } from './admin.schema.js';

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
};
