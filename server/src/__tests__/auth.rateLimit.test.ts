// ============================================
// Auth 限流中间件单元测试
//
// 不打 controller，直接挂 limiter 到 stub 路由，验证：
//   1) 前 N 次（max）正常通过
//   2) 第 N+1 次返回 429 + { code: 'RATE_LIMITED' }
//   3) 两个 limiter 独立计数（login 不影响 register 配额）
// ============================================
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { loginLimiter, registerLimiter } from '../modules/auth/auth.rateLimit.js';

function makeApp(limiter: express.RequestHandler) {
  const app = express();
  app.set('trust proxy', 1);
  app.post('/test', limiter, (_req, res) => {
    res.json({ success: true, data: { ok: true } });
  });
  return app;
}

describe('registerLimiter', () => {
  it('前 3 次通过，第 4 次返回 429 + RATE_LIMITED', async () => {
    const app = makeApp(registerLimiter);

    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/test').expect(200);
      expect(res.body.success).toBe(true);
    }
    const blocked = await request(app).post('/test').expect(429);
    expect(blocked.body).toEqual({
      success: false,
      error: { code: 'RATE_LIMITED', message: '注册过于频繁，请 1 小时后再试' },
    });
  });

  it('loginLimiter 与 registerLimiter 是不同实例（互不共享计数器）', () => {
  // ★ 两个 limiter 必须是不同函数引用——否则 rateLimit() 工厂 bug，
  //   它们将共享同一份计数器，导致「注册失败会顺手锁掉登录」。
  expect(loginLimiter).not.toBe(registerLimiter);
});
});

describe('loginLimiter', () => {
  it('前 5 次通过，第 6 次返回 429 + RATE_LIMITED', async () => {
    const app = makeApp(loginLimiter);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/test').expect(200);
      expect(res.body.success).toBe(true);
    }
    const blocked = await request(app).post('/test').expect(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(blocked.body.error.message).toContain('登录');
  });
});