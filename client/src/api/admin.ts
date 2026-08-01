import { http, request } from './client';
import type { AdminUserListItem } from '@/types';

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
};
