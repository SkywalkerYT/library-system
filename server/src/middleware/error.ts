// ============================================
// 全局错误处理
// 把 HttpError / zod 错误 / Prisma 错误 / 未知错误统一为 { success: false, error: { code, message } } 格式
// ============================================
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 1) 自定义业务错误
  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // 2) zod 校验错误（v3 用 issues 字段，errors 是 deprecated 别名）
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues[0]?.message || '参数校验失败',
      },
    });
    return;
  }

  // 3) Prisma 已知错误（用官方类型守卫，避免 as any）
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: '数据已存在' },
      });
      return;
    }
    if (err.code === 'P2025') {
      // 记录未找到（一般不会到这里，仓储层已先校验；兜底用）
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '记录不存在' },
      });
      return;
    }
  }

  // 4) 未捕获错误
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: '服务器内部错误' },
  });
};
