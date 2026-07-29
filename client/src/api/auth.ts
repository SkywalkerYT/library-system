import { http, request } from './client';
import type { User } from '@/types';

interface AuthResp {
  token: string;
  user: User;
}

export const authApi = {
  async register(email: string, password: string, displayName: string) {
    return request<AuthResp>(
      http.post('/auth/register', { email, password, displayName })
    );
  },
  async login(email: string, password: string) {
    return request<AuthResp>(http.post('/auth/login', { email, password }));
  },
  async me() {
    // ★ /auth/me 后端返回的是扁平的 user 对象（与 toSafeUser 对齐），
    //   而不是 {user: User}。login/register 用 AuthResp 包装，二者口径不同。
    return request<User>(http.get('/auth/me'));
  },
};
