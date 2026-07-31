// ============================================
// Books 路由限流（写操作）
//
// 只对 POST/PATCH/DELETE 生效——读操作（list/stats/get/categories）不限流，
// 因为它们是高频低风险场景，限流反而影响正常使用。
//
// 策略：60 次 / 分钟 ≈ 日常操作充足，足以挡住脚本滥用。
// 部署到 Sealos / Railway 等反代后必须在 app.ts 设 app.set('trust proxy', 1)，
// 否则所有请求都被识别为代理 IP，全局一刀切封禁。
//
// 响应格式与 errorHandler 对齐：{ success: false, error: { code, message } }
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

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7', // RateLimit-* (RFC draft 7)
  legacyHeaders: false,
  handler: makeHandler('RATE_LIMITED', '操作过于频繁，请稍后再试'),
});