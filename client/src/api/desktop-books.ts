// ============================================
// 桌面模式 API 适配层
// ============================================
// 设计目标:
//   - 现有 Vue 组件调用方式不变(booksApi.create({...}) 这种)
//   - 桌面模式下,读走本地(秒开),写走远程(数据真源)
//   - 离线时写入自动排队,UI 提示"待同步"
//
// 集成方式:
//   - 在 main.ts 里根据环境变量注入全局 booksApi
//   - 现有 components/BookList.vue 不用改一行代码

// ============================================
// 类型:和现有 client/src/api/books.ts 保持兼容
// ============================================
export interface Book {
  id: number;
  title: string;
  author: string;
  category: string;
  status: 'AVAILABLE' | 'BORROWED';
  summary?: string;
  coverUrl?: string;
  borrowerName?: string;
  borrowerPhone?: string;
  borrowedAt?: string;
  dueAt?: string;
  updatedAt: string;
}

interface CreateBookInput {
  title: string;
  author: string;
  category: string;
  summary?: string;
}

// ============================================
// ★ 核心:统一的 API 接口(供 Vue 调用)
// ============================================
export interface BooksApi {
  list(filter?: { keyword?: string; category?: string; status?: string }): Promise<Book[]>;
  get(id: number): Promise<Book>;
  create(input: CreateBookInput): Promise<{ id: number; queued?: boolean }>;
  update(id: number, input: Partial<Book>): Promise<{ success: boolean; queued?: boolean }>;
  delete(id: number): Promise<{ success: boolean; queued?: boolean }>;
  borrow(id: number, body: { borrowerName: string; borrowerPhone: string; dueAt: string }):
    Promise<{ success: boolean; queued?: boolean }>;
  return(id: number): Promise<{ success: boolean; queued?: boolean }>;
}

// ============================================
// 桌面模式实现:走 window.api(由 preload 暴露)
// ============================================
export const desktopBooksApi: BooksApi = {
  list: async (filter) => {
    // @ts-ignore - window.api 由 preload 注入
    return await window.api.listBooks(filter);
  },

  get: async (id) => {
    // @ts-ignore
    const list = await window.api.listBooks();
    const book = list.find((b: Book) => b.id === id);
    if (!book) throw new Error(`Book ${id} not found in local cache`);
    return book;
  },

  create: async (input) => {
    // @ts-ignore
    return await window.api.createBook(input);
  },

  update: async (id, input) => {
    // @ts-ignore
    return await window.api.updateBook(id, input);
  },

  delete: async (id) => {
    // @ts-ignore
    return await window.api.deleteBook(id);
  },

  borrow: async (id, body) => {
    // @ts-ignore
    return await window.api.borrowBook(id, body);
  },

  return: async (id) => {
    // @ts-ignore
    return await window.api.returnBook(id);
  },
};

// ============================================
// Web 模式实现(你现有的代码,作为对比)
// ============================================
// 现状:client/src/api/books.ts 用 axios 直接打 /api
// 桌面模式:被 desktopBooksApi 替换,行为一致但走 IPC

// ============================================
// ★ Vue 集成示例(在 main.ts 里)
// ============================================
// import { desktopBooksApi } from './api/desktop-books';
// app.provide('booksApi', desktopBooksApi);   // 全局注入
//
// 现有组件用法(零改动):
// const booksApi = inject<BooksApi>('booksApi');
// const books = await booksApi.list();