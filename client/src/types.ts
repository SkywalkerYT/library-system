// ============================================
// 共享类型（前后端约定）
// 后端 DTO 时间字段全部为 ISO 字符串
// ============================================

export type BookStatus = 'AVAILABLE' | 'BORROWED';

export interface User {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;   // ★ 新增：登录态带 admin 标记
  createdAt: string; // ISO
}

export interface Book {
  id: number;
  title: string;
  author: string;
  category: string;
  status: BookStatus;
  summary: string | null;
  coverUrl: string | null;                 // ★ 封面路径：/api/covers/<uuid>.<ext>，null 用内联 SVG 占位
  borrowerName: string | null;
  borrowerPhone: string | null;          // ★ 明文（admin 用）
  borrowerPhoneMasked: string | null;    // ★ 遮罩版（非 admin 用）
  borrowedAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ★ Admin 用户列表项（仅后端 /api/admin/users 返回）
export interface AdminUserListItem {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
  borrowedCount: number;
}

export interface BookStats {
  total: number;
  borrowed: number;
  available: number;
}

// ★ Admin 批量封面上传响应（POST /api/admin/books/batch-cover）
export interface CoverUploadItem {
  id: number;
  coverUrl: string;
  replaced: boolean;
  filename: string;
}

export interface CoverUploadError {
  filename: string;
  bookId?: number;
  reason: string;
  message: string;
}

export interface CoverBatchResult {
  total: number;
  success: number;
  failed: number;
  items: CoverUploadItem[];
  errors: CoverUploadError[];
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
