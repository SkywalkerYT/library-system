// ============================================
// Auth 路由
// /me 需要鉴权，其他均为公开
// login/register 加限流中间件防爆破 / 防垃圾注册
// ============================================
import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginLimiter, registerLimiter } from './auth.rateLimit.js';

export const authRouter = Router();

authRouter.post('/register', registerLimiter, authController.register);
authRouter.post('/login', loginLimiter, authController.login);
authRouter.get('/me', requireAuth, authController.me);
