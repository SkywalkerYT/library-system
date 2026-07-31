// ============================================
// 头像工具：纯前端生成（零依赖）
//
// 设计选择：
//   - 不调后端：后端 User 表没有 avatar 字段，加字段要改 schema+迁移+存储，
//     现阶段不必要
//   - 不调外部 API（DiceBear 等）：避免外网依赖，Sealos 容器对外网访问
//     不稳定
//   - 确定性：同一用户（email 或 displayName）每次生成同一颜色，不刷新变色
//   - 中文支持：首字符不是 ASCII 字母时直接保留（例：「小王」→「小」）
// ============================================

// 8 色调色板 —— 避开太浅（#fff/浅黄），保证白色文字可读
const PALETTE = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6', // teal
] as const;

/**
 * djb2 字符串哈希 → 稳定正整数
 * 同一字符串永远映射到同一颜色；不同字符串冲突概率 = 1/8（在调色板内可接受）
 */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    // 用位运算替代乘法，避免浮点精度问题
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

/**
 * 根据种子字符串算出背景色（固定调色板内循环）。
 */
export function getAvatarColor(seed: string): string {
  // ★ PALETTE 标了 as const，TS 严格模式下 tuple 索引返回 string | undefined，
  //   加 fallback 兜底（哈希永远落在 [0, PALETTE.length) 区间，fallback 几乎不触发）
  return PALETTE[hash(seed) % PALETTE.length] ?? PALETTE[0];
}

/**
 * 取首字符作为头像文字：
 *   - 优先 displayName（如「Alice」「小王」）
 *   - 否则 email @ 前缀（如「alice@x.com」→「A」）
 *   - 都拿不到 → 「?」
 *  - ASCII 字母大写
 *  - 中日韩文字直接保留首字
 */
export function getInitials(displayName?: string | null, email?: string | null): string {
  const source =
    (displayName && displayName.trim()) ||
    (email ? email.split('@')[0] : '') ||
    '?';
  const ch = source ? source.charAt(0) : '?';
  if (!ch) return '?';
  return /[A-Za-z]/.test(ch) ? ch.toUpperCase() : ch;
}

/**
 * 给定 user 对象返回头像三件套：{ initials, color }
 * 用于模板内 :style="{ background: avatar.color }" + {{ avatar.initials }}
 */
export function avatarFor(user: {
  displayName?: string | null;
  email?: string | null;
} | null | undefined): { initials: string; color: string } {
  if (!user) return { initials: '?', color: PALETTE[0] };
  const seed = user.email || user.displayName || '?';
  return {
    initials: getInitials(user.displayName, user.email),
    color: getAvatarColor(seed),
  };
}