import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import type { User } from '@/types';

const STORAGE_KEY = 'lib_token';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEY));
  const user = ref<User | null>(null);

  const isLoggedIn = computed(() => !!token.value && !!user.value);

  function setToken(t: string | null) {
    token.value = t;
    if (t) localStorage.setItem(STORAGE_KEY, t);
    else localStorage.removeItem(STORAGE_KEY);
  }

  async function login(email: string, password: string) {
    const { token: t, user: u } = await authApi.login(email, password);
    setToken(t);
    user.value = u;
  }

  async function register(email: string, password: string, displayName: string) {
    const { token: t, user: u } = await authApi.register(email, password, displayName);
    setToken(t);
    user.value = u;
  }

  async function fetchMe() {
    if (!token.value) return null;
    try {
      user.value = await authApi.me();
      return user.value;
    } catch (err) {
      // ★ 网络抖动 / 后端短暂不可用：保留 token，只清 user。
      //   下次路由守卫会再触发 fetchMe 自愈；如果 token 真过期，
      //   后续 API 调用的 401 拦截器会处理（走 TOKEN_EXPIRED 分支）。
      //   唯一例外：API 明确返回 TOKEN_EXPIRED / TOKEN_INVALID，
      //   这时清掉 token，避免无限重试同一个死 token。
      if (err instanceof ApiError && (err.code === 'TOKEN_EXPIRED' || err.code === 'TOKEN_INVALID')) {
        clear();
      } else {
        user.value = null;
      }
      return null;
    }
  }

  function clear() {
    setToken(null);
    user.value = null;
  }

  return { token, user, isLoggedIn, login, register, fetchMe, clear };
});
