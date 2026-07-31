import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';
import type { ApiErr, ApiResp } from '@/types';

// ★ axios 实例：基础路径
//   - 开发：'/api'（Vite proxy 转发到 http://localhost:3000）
//   - 生产：读 VITE_API_BASE_URL 环境变量（如 'https://library-api.up.railway.app/api'）
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const http = axios.create({
  baseURL,
  timeout: 15000,
});

// ★ 请求拦截：自动带 Authorization
http.interceptors.request.use((cfg) => {
  const auth = useAuthStore();
  if (auth.token) {
    cfg.headers.Authorization = `Bearer ${auth.token}`;
  }
  return cfg;
});

// ★ 响应拦截：
//   - 401 TOKEN_EXPIRED → 清登录态 + 静默跳登录（保留 redirect）
//   - 401 TOKEN_INVALID → 清登录态 + 跳登录（可疑，需重新登录）
//   - 401 其他/无 code → 视为网络抖动，不动登录态，让上层捕获
//   - 非 401 → 原样抛出
http.interceptors.response.use(
  (resp) => resp,
  (err: AxiosError<ApiErr>) => {
    if (err.response?.status !== 401) {
      return Promise.reject(err);
    }
    const code = err.response.data?.error?.code;
    const auth = useAuthStore();

    // 只有显式 TOKEN_EXPIRED / TOKEN_INVALID 才清登录态并跳登录
    // 其他 401（无 code / 自定义 code）当作可疑但不动 token，
    // 让调用方自己处理，避免被踢下线后无法自愈。
    if (code !== 'TOKEN_EXPIRED' && code !== 'TOKEN_INVALID') {
      return Promise.reject(err);
    }

    auth.clear();
    if (router.currentRoute.value.name !== 'login') {
      router.replace({
        name: 'login',
        query: { redirect: router.currentRoute.value.fullPath },
      });
    }
    return Promise.reject(err);
  }
);

// ★ 帮助函数：解包 {success, data}，把后端业务错误抛成 ApiError
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function request<T>(p: Promise<{ data: ApiResp<T> }>): Promise<T> {
  try {
    const { data } = await p;
    if (data.success) return data.data;
    throw new ApiError(data.error.message, data.error.code, 0);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as ApiErr | undefined;
      throw new ApiError(
        body?.error?.message ?? err.message,
        body?.error?.code ?? 'NETWORK_ERROR',
        err.response?.status ?? 0
      );
    }
    throw err;
  }
}
