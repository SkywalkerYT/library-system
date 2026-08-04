import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/books',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/books',
    name: 'books',
    component: () => import('@/views/BookListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/views/AdminUsersView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/covers',
    name: 'admin-covers',
    component: () => import('@/views/AdminCoversView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/books',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

// ★ 全局守卫
//   - 未登录 → login（带 redirect）
//   - 已登录访问 login/register → books
//   - ★ 非 admin 访问 requiresAdmin → books（保留登录态、显式 toast）
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.token && !auth.user) {
    await auth.fetchMe();
  }
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'books' };
  }
  // ★ admin 守卫：放在最后，避免未登录用户被错误地跳到 books
  if (to.meta.requiresAdmin && !auth.user?.isAdmin) {
    return { name: 'books' };
  }
});
