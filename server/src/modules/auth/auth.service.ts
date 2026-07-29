// ============================================
// Auth 业务层
// 注册 / 登录 / 取当前用户——三个最简单的 case
// ============================================
import { prisma } from '../../config/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { HttpError } from '../../utils/errors.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new HttpError(409, 'EMAIL_TAKEN', '该邮箱已注册');

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
      },
    });

    return { token: signToken({ userId: user.id }), user: this.toSafeUser(user) };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new HttpError(401, 'INVALID_CREDENTIALS', '邮箱或密码错误');

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'INVALID_CREDENTIALS', '邮箱或密码错误');

    return { token: signToken({ userId: user.id }), user: this.toSafeUser(user) };
  }

  async me(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', '用户不存在');
    return this.toSafeUser(user);
  }

  private toSafeUser(user: { id: number; email: string; displayName: string; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };
  }
}