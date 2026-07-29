// ============================================
// 冒烟测试：/api/health 应返回 200 + { ok: true }
// ============================================
// 这是 CI 的"金丝雀"用例 —— 它只要通过，说明：
//   1) Express 能正常启动
//   2) 中间件链路没断（CORS / JSON / errorHandler）
//   3) 路由挂载正确
// 不依赖数据库、不依赖鉴权。

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /api/health', () => {
  it('应返回 200 与 ok=true', async () => {
    const app = createApp();

    const res = await request(app).get('/api/health').expect(200);

    expect(res.body).toEqual({
      success: true,
      data: { ok: true },
    });
  });
});

describe('未知路由', () => {
  it('应返回 404 + NOT_FOUND 错误码', async () => {
    const app = createApp();

    const res = await request(app).get('/api/does-not-exist').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});