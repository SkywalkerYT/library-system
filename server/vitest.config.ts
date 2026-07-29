// ============================================
// Vitest 配置
// ============================================
// 不连真实 DB：测试用 supertest 打 createApp()，命中纯内存路由。
// 与生产数据库无关 —— DATABASE_URL 在测试环境不会被真正连接。
// 命令：npm run test（一次性）/ npm run test:watch（开发）

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ★ 测试环境：node（不模拟浏览器）
    environment: 'node',
    // ★ 全局 setup：注入测试用环境变量（避免 env 校验抛错）
    setupFiles: ['./src/__tests__/setup.ts'],
    // ★ 默认只跑单元/集成（无 DB），集成（带 DB）见 vitest.integration.config.ts
    include: ['src/**/*.test.ts', 'src/__tests__/**/*.test.ts'],
    exclude: ['src/__tests__/integration/**', 'node_modules/**', 'dist/**'],
    // 测试报告器
    reporters: ['default'],
    // 跑测试时的并行上限（CI 内存敏感时调小）
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // 单线程：测试用例极少时减少开销
      },
    },
  },
});