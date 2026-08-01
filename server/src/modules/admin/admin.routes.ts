// ============================================
// Admin 路由
// ★ 模块级双重守卫：所有 /api/admin/* 都自动经过 requireAuth + requireAdmin
//   未来加端点只需 router.get('/xxx', ...) 即可，权限无需重复挂载
// ============================================
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { adminController } from './admin.controller.js';

const adminRouter = Router();

// ★ 一次性挂载：每个 handler 都会先经过两层中间件
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', adminController.listUsers);

export { adminRouter };
