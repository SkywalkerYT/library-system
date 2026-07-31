// ============================================
// 共享类型（前后端约定）
// 后端 DTO 时间字段全部为 ISO 字符串
// ============================================

export type BookStatus = 'AVAILABLE' | 'BORROWED';

export interface User {
  id: number;
  email: string;
  displayName: string;
  createdAt: string; // ISO
}

export interface Book {
  id: number;
  title: string;
  author: string;
  category: string;
  status: BookStatus;
  summary: string | null;
  borrowerName: string | null;
  borrowerPhone: string | null;
  borrowedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookStats {
  total: number;
  borrowed: number;
  available: number;
}

// ★ 单个分类项：name 给 pill 用，count 留给「分类 + 书数小角标」用
export interface CategoryItem {
  name: string;
  count: number;
}

export interface ListQuery {
  keyword?: string;
  category?: string;
  status?: BookStatus;
  page: number;
  pageSize: number;
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// API 响应统一外壳
export interface ApiOk<T> {
  success: true;
  data: T;
}
export interface ApiErr {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
export type ApiResp<T> = ApiOk<T> | ApiErr;
