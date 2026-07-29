// ============================================
// JWT 工具：签发 / 校验
// Payload 只放 userId —— 不要塞敏感信息（payload 是明文 base64）
// ============================================
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthPayload {
  userId: number;
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
  return { userId };
}