// ============================================
// 集成测试配置（需要真实 MySQL）
// ============================================
// 与默认配置分开：默认配置排除了 integration/**，
// 这份配置只跑 integration/**，并要求必须有 DATABASE_URL。
//
// 命令：npm run test:integration
// （脚本里用 --config 指到这里，绕开默认 exclude）

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // ★ 不挂 setup.ts：集成测试自己连真 DB，setup.ts 里的假 URL 会污染这里
    setupFiles: [],
    // ★ 只挑 integration 目录里的文件
    include: ['src/__tests__/integration/**/*.test.ts'],
    // ★ 不许反咬回默认 include 里的文件
    exclude: ['node_modules/**', 'dist/**'],
    reporters: ['default'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // ★ 集成测试争抢同一张表，必须串行
      },
    },
    // ★ 单个用例超时：真 DB 比 in-memory 慢，给 15s 余量
    testTimeout: 15_000,
  },
});