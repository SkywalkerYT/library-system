// ============================================
// Auth 业务层
// 注册 / 登录 / 取当前用户——三个最简单的 case
// ============================================
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { HttpError } from '../../utils/errors.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

export class AuthService {
  async register(input: RegisterInput) {
    // ★ 预检查：用户输入友好提示。但并发注册同一邮箱时，两个请求都可能
    //   通过 findUnique 检查，最终 create 抛 P2002 —— 下面 try/catch 兜底归一化。
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new HttpError(409, 'EMAIL_TAKEN', '该邮箱已注册');

    const passwordHash = await hashPassword(input.password);
    try {
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          displayName: input.displayName,
        },
      });

      // ★ 不再注册即送书目——示例馆藏由 index.ts 启动时种一次（社区共享）

      return { token: signToken({ userId: user.id, isAdmin: user.isAdmin }), user: this.toSafeUser(user) };
    } catch (err) {
      // 并发注册同一邮箱：第二个请求会因 UNIQUE 索引抛 P2002
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new HttpError(409, 'EMAIL_TAKEN', '该邮箱已注册');
      }
      throw err;
    }
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new HttpError(401, 'INVALID_CREDENTIALS', '邮箱或密码错误');

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'INVALID_CREDENTIALS', '邮箱或密码错误');

    return { token: signToken({ userId: user.id, isAdmin: user.isAdmin }), user: this.toSafeUser(user) };
  }

  async me(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', '用户不存在');
    return this.toSafeUser(user);
  }

  private toSafeUser(user: { id: number; email: string; displayName: string; isAdmin: boolean; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,   // ★ 前端 router/AccountMenu 据此显示管理员入口
      createdAt: user.createdAt.toISOString(),
    };
  }
}