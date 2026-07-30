// ============================================
// CORS 白名单测试
// ============================================
// 守护 app.ts 里的 CORS 规则不被人不小心改坏。
// 不依赖数据库 / 鉴权，只挂 createApp()。

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('CORS 白名单', () => {
  const app = createApp();

  it('应放行精确白名单内的 origin（本地 5173）', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('应放行 Vercel 生产域名', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://library-system.vercel.app');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://library-system.vercel.app');
  });

  it('应放行 Vercel preview 子域（含 PR 部署）', async () => {
    // Vercel preview 真实格式：<project>-<branch-slug>-<user>.vercel.app
    //   分支 feature/auth 变成 feature-auth，全部用 - 连接，**中间没有点**
    const previewOrigin = 'https://library-system-git-feature-auth-alice.vercel.app';
    const res = await request(app).get('/api/health').set('Origin', previewOrigin);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(previewOrigin);
  });

  it('应拒绝 vercel.app 的二级域伪装（如 attacker.vercel.app.example.com）', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://attacker.vercel.app.example.com');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('应拒绝不在白名单的 origin（不允许 * echo）', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');
    // cors() 中间件会直接返回 500（origin 函数返回 Error）
    expect(res.status).toBeGreaterThanOrEqual(400);
    // 没有响应 access-control-allow-origin 头（cors 拒绝时不会设置）
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('同源请求（无 Origin 头）应正常通过', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });
});