import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
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
    } catch {
      clear();
      return null;
    }
  }

  function clear() {
    setToken(null);
    user.value = null;
  }

  return { token, user, isLoggedIn, login, register, fetchMe, clear };
});
