// ============================================
// 端到端冒烟测试（需要真 MySQL）
// 跑法：DATABASE_URL=... npm run test:integration
// ============================================
// 流程：
//   register → login → addBook → borrow → return → stats → delete
// 验证每个环节的 200/4xx/响应体形状都对。

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const TEST_EMAIL = `smoke_${Date.now()}@test.local`;
const TEST_PASSWORD = 'pw_smoke_123';
const TEST_NAME = 'Smoke User';

describe('端到端冒烟（需要 DATABASE_URL 可达）', () => {
  let token: string;
  let bookId: number;

  beforeAll(async () => {
    // ★ 防御：没设 DATABASE_URL 时直接跳过整个 suite，不让 CI 误挂
    if (!process.env.DATABASE_URL || process.env.SKIP_INTEGRATION === '1') {
      throw new Error('SKIP_INTEGRATION');
    }
    // 保证测试库有表结构（CI 也跑得起来：连 GitHub Actions services.mysql）
    await prisma.$executeRawUnsafe('SELECT 1');
  });

  beforeEach(async () => {
    // 每个用例前清干净，避免互相干扰
    // （FK 关系：先删 Book 再删 User）
    await prisma.book.deleteMany({});
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  });

  it('完整链路：register → login → add → borrow → return → stats → delete', async () => {
    // 1) 注册
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, displayName: TEST_NAME })
      .expect(201);
    expect(reg.body.success).toBe(true);
    expect(reg.body.data.token).toBeTypeOf('string');
    token = reg.body.data.token;

    // 2) 登录拿到同一个 token（用同一份密码）
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);
    expect(login.body.data.user.email).toBe(TEST_EMAIL);
    const loginToken = login.body.data.token;

    // 3) 新增图书
    const add = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${loginToken}`)
      .send({
        title: '深入理解计算机系统',
        author: 'Bryant',
        category: '计算机',
        summary: 'CSAPP 教科书',
      })
      .expect(201);
    expect(add.body.data.title).toBe('深入理解计算机系统');
    expect(add.body.data.status).toBe('AVAILABLE');
    bookId = add.body.data.id;

    // 4) 借出（dueAt 取明天）
    const dueAt = new Date(Date.now() + 86400_000).toISOString();
    const borrow = await request(app)
      .post(`/api/books/${bookId}/borrow`)
      .set('Authorization', `Bearer ${token}`)
      .send({ borrowerName: '张三', borrowerPhone: '13800000000', dueAt })
      .expect(200);
    expect(borrow.body.data.status).toBe('BORROWED');
    expect(borrow.body.data.borrowerName).toBe('张三');

    // 5) 重复借出 → 409
    await request(app)
      .post(`/api/books/${bookId}/borrow`)
      .set('Authorization', `Bearer ${token}`)
      .send({ borrowerName: '李四', borrowerPhone: '13900000000', dueAt })
      .expect(409);

    // 6) 归还
    const ret = await request(app)
      .post(`/api/books/${bookId}/return`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(ret.body.data.status).toBe('AVAILABLE');
    expect(ret.body.data.borrowerName).toBeNull();

    // 7) 再借一次（验证归还后状态真的清干净了）
    await request(app)
      .post(`/api/books/${bookId}/borrow`)
      .set('Authorization', `Bearer ${token}`)
      .send({ borrowerName: '王五', borrowerPhone: '13700000000', dueAt })
      .expect(200);

    // 8) stats 全库数字
    const stats = await request(app)
      .get('/api/books/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(stats.body.data).toEqual({ total: 1, borrowed: 1, available: 0 });

    // 9) 删除
    await request(app)
      .delete(`/api/books/${bookId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // 10) 列表为空
    const list = await request(app)
      .get('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.data.items).toEqual([]);
    expect(list.body.data.total).toBe(0);
  });
});
