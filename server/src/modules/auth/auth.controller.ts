// ============================================
// Auth 控制器
// Controller 只负责：解析 req → 调 service → 包装 res
// 不放业务逻辑，不直接接触 Prisma
// ============================================
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.schema.js';

const service = new AuthService();

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = registerSchema.parse(req.body);
      const result = await service.register(input);
      // ★ 201 Created：POST 创建资源 → REST 语义
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body);
      const result = await service.login(input);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      // ★ requireAuth 中间件已把 userId 挂到 req
      const user = await service.me(req.userId!);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
};
