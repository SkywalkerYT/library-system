// ============================================
// ESLint v9 flat config
// ============================================
// 设计目标：抓明显错误（未用变量、any 滥用、Promise 未 await），
// 不抓风格偏好（缩进/单双引号），让团队不与 lint 打架。
// 命令：npm run lint

import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ★ 1) 全局忽略：build 产物、依赖、Prisma 生成代码、测试产物
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'src/generated/**',
    ],
  },

  // ★ 2) TS 推荐规则 + 自定义收紧
  ...tseslint.configs.recommended,

  // ★ 3) 项目级覆盖
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        // Node 20 + Express 测试环境常用全局
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      // 业务代码里没必要用 any；用了就强制改成 unknown 或具体类型
      '@typescript-eslint/no-explicit-any': 'error',
      // 未使用的变量直接报错（CI 用 --max-warnings 0）
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 关闭几条与本项目无关的规则（推荐集默认开启）
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  // ★ 4) 测试文件放宽（supertest + vi.mock 经常需要 any / unused args）
  {
    files: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);