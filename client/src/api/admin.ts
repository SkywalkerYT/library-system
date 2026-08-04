import { http, request } from './client';
import type { AdminUserListItem, CoverBatchResult } from '@/types';

/**
 * Admin API 客户端
 * ★ 路由层 beforeEach 已拦截非 admin；这里只关注业务请求。
 *   后端模块级 requireAuth + requireAdmin 双重守卫兜底——客户端拦截只是 UX。
 */
export const adminApi = {
  /**
   * 用户列表（分页 + 搜索 + 角色筛选）
   * @param q.keyword  模糊匹配 email / displayName
   * @param q.isAdmin  筛选 admin / 普通用户（不传 → 全部）
   */
  async listUsers(q: { keyword?: string; isAdmin?: boolean; page?: number; pageSize?: number } = {}) {
    return request<{ items: AdminUserListItem[]; total: number }>(
      http.get('/admin/users', { params: q })
    );
  },

  // ────────────────────────────────────────────
  // 单本封面上传：POST /api/admin/books/:id/cover
  //   - 适用：编辑/补传单张图
  // ────────────────────────────────────────────
  async uploadCoverForBook(bookId: number, file: File, replace = false) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('replace', String(replace));
    return request<{ id: number; coverUrl: string; replaced: boolean }>(
      http.post(`/admin/books/${bookId}/cover`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  },

  // ────────────────────────────────────────────
  // 批量封面上传：POST /api/admin/books/batch-cover
  //   - files: File[]（从文件夹拖拽或 webkitdirectory 拿到的本地文件）
  //   - 服务端按 originalname 解析 bookId，错误隔离
  //   - 单张 ≤5MB、一次 ≤20 张（后端 multer 限制）
  // ────────────────────────────────────────────
  async batchUploadCovers(files: File[], replace = false) {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    fd.append('replace', String(replace));
    return request<CoverBatchResult>(
      http.post('/admin/books/batch-cover', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // ★ 批量上传给足时间：20 张 × 5MB 在弱网下可能慢
        timeout: 60_000,
      })
    );
  },
};
