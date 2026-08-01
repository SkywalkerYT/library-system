// ============================================
// JWT 工具：签发 / 校验
// Payload 只放 userId + isAdmin —— 不要塞敏感信息（payload 是明文 base64）
// ============================================
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthPayload {
  userId: number;
  isAdmin: boolean;
}

// ★ 显式钉死算法：防止 algorithm confusion（HS/RS 互换攻击）
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}

export function verifyJwt(token: string): AuthPayload {
  // ★ algorithms: ['HS256'] —— 拒绝任何其他算法的 token
  // ★ 不预信任 shape：解出 unknown，运行时校验字段类型
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  }) as JwtPayload;

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('INVALID_PAYLOAD');
  }
  const userId = (decoded as Record<string, unknown>).userId;
  if (typeof userId !== 'number' || !Number.isInteger(userId) || userId <= 0) {
    throw new Error('INVALID_PAYLOAD');
  }
  // ★ 关键：旧 token 没有 isAdmin 字段默认 false（不踢在线用户）。
  //   但 requireAdmin 会再做 DB 二次校验，所以伪造 / 越权也进不来。
  const isAdminRaw = (decoded as Record<string, unknown>).isAdmin;
  const isAdmin = typeof isAdminRaw === 'boolean' ? isAdminRaw : false;
  return { userId, isAdmin };
}