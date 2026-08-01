// ============================================
// JWT 鉴权中间件
// 校验通过后将 userId 挂到 req 上供下游 controller 使用
// ============================================
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyJwt } from '../utils/jwt.js';

// 扩展 Express Request 类型
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: number;
      isAdmin?: boolean;   // ★ 新增：requireAuth 挂上、requireAdmin 二次校验
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '未登录或登录已过期' },
    });
  }

  try {
    const payload = verifyJwt(header.slice(7));
    req.userId = payload.userId;
    req.isAdmin = payload.isAdmin;   // ★ 挂到 req（仅"快速路径"，admin 路由还要 requireAdmin 再查 DB）
    next();
  } catch (err) {
    // ★ 区分过期 vs 伪造 —— 给前端更精确的提示，前端可选择「静默续签」或「强制跳登录」
    // ★ 显式 return —— 否则 Express 会继续往下走 middleware
    const code = err instanceof jwt.TokenExpiredError ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    const message =
      err instanceof jwt.TokenExpiredError ? '登录已过期，请重新登录' : '身份凭证无效，请重新登录';
    return res.status(401).json({
      success: false,
      error: { code, message },
    });
  }
}