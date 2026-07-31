// ============================================
// Auth 路由限流
//
// 策略：
//   - login:    5 次 / 15 min  —— 防密码爆破
//   - register: 3 次 / 1 hour  —— 防垃圾注册（区分 keyGenerator 计数器）
//
// 部署到 Sealos / Railway 等反向代理后，必须在 app.ts 设 app.set('trust proxy', 1)
//   否则所有请求都被识别为代理 IP，导致一刀切全局封禁。
//
// 响应格式与 errorHandler 对齐：{ success: false, error: { code, message } }
//   code 用 RATE_LIMITED，方便前端 axios 拦截器识别。
// ============================================
import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

function makeHandler(code: string, message: string): RequestHandler {
  return (_req, res, _next) => {
    res.status(429).json({
      success: false,
      error: { code, message },
    });
  };
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7', // RateLimit-* (RFC draft 7)
  legacyHeaders: false,
  handler: makeHandler('RATE_LIMITED', '登录尝试过多，请 15 分钟后再试'),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: makeHandler('RATE_LIMITED', '注册过于频繁，请 1 小时后再试'),
});