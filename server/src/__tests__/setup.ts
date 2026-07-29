// ============================================
// Vitest 全局 setup（在每个测试文件前执行）
// ============================================
// 注入测试用环境变量，让 src/config/env.ts 的 zod 校验通过。
// 数据库 URL 是占位符 —— health 测试不真正连库。

process.env.DATABASE_URL = 'mysql://test:test@127.0.0.1:3306/test_db';
process.env.JWT_SECRET = 'test-secret-at-least-16-chars-long';
process.env.NODE_ENV = 'test';