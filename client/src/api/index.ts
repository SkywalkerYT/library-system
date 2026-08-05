// ============================================
// API 模式切换:Web 走 axios / 桌面走 window.api
// ============================================
// 这是整个方案的关键开关点:
//
// 关键设计:
//   - 定义统一的 BooksApi 接口(签名一致)
//   - 两套实现:webBooksApi(axios) 和 desktopBooksApi(window.api)
//   - 根据运行环境决定注入哪套
//   - 检测方式:window.api 存在 = 在 Electron 里运行
//
// 这样做的好处:
//   - 现有 Vue 组件代码零修改(只看到 inject('booksApi'))
//   - Web 部署(Vercel)和桌面打包(.exe)用同一份前端代码
//   - 切换只发生在 main.ts 注入时,业务层完全透明

import { booksApi as webBooksApi } from './books';
import { desktopBooksApi, type BooksApi } from './desktop-books';

// ============================================
// 运行模式检测
// ============================================
export type RuntimeMode = 'web' | 'desktop';

export function detectMode(): RuntimeMode {
  // @ts-ignore - window.api 由 preload 注入,Web 模式不存在
  if (typeof window !== 'undefined' && window.api) {
    return 'desktop';
  }
  return 'web';
}

// ============================================
// ★ 关键:根据模式返回对应实现
// ============================================
export function createBooksApi(mode: RuntimeMode = detectMode()): BooksApi {
  if (mode === 'desktop') {
    console.log('[api] 桌面模式:走本地缓存 + Sealos 远程写入');
    return desktopBooksApi;
  }
  console.log('[api] Web 模式:走 axios + Sealos API');
  return webBooksApi as unknown as BooksApi;
}

// ============================================
// 默认导出(给 main.ts 用)
// ============================================
export const booksApi = createBooksApi();

// ============================================
// Vue 集成示例(在 client/src/main.ts 里)
// ============================================
// import { createBooksApi } from './api';
// const booksApi = createBooksApi();   // 自动检测模式
// app.provide('booksApi', booksApi);
//
// 现有组件用法(完全不变):
// const booksApi = inject<BooksApi>('booksApi');
// const result = await booksApi.list({ keyword: '三体' });