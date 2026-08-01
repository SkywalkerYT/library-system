// ============================================
// 手机号脱敏工具（展示层）
// 用户原话：「第 4 到第 7 位隐藏」
//   11 位 CN 手机号规则：1-3 可见 + 4-7 隐 + 8-11 可见
//   138****5678 ← 例
//
// 两端口实现完全一致（server/utils/mask.ts == client/utils/maskPhone.ts）
//   前端做"防御性冗余"：即使后端某天忘了加 masked 字段，前端也兜得住
//
// 调用方：toDto / AdminUsersView / BookCard 等
// ============================================

/**
 * 11 位中国大陆手机号（1[3-9]开头）→ 138****5678
 * 其他格式 → 由 ★ 协作点 1 的降级策略决定（见函数体内 TODO）
 *
 * @param phone 原始手机号字符串（可能含空格、+、-、() 等）
 * @returns 脱敏后的字符串；输入为空时返回 null（与 API 字段类型保持一致）
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // 去掉所有空白（含半角/全角空格、tab）—— 国际号常带空格分隔
  const trimmed = phone.replace(/\s/g, '');

  // ★ 主分支：11 位 CN 手机号（1[3-9] 开头 + 9 位数字）→ 用户原话要求的格式
  if (/^1[3-9]\d{9}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)}****${trimmed.slice(7)}`;
  }

  // ──────────── ★协作点 1 已决策：策略 (d) ────────────
  // 自适应「前 3 + 后 4 + 中间 ****」（短号降级到「前 3 + 后 2」）
  // 同时剥离视觉分隔符（- ( )），保留 + 与数字 —— 国际号前缀不丢
  const stripped = trimmed.replace(/[-()]/g, '');
  if (stripped.length >= 7) {
    return `${stripped.slice(0, 3)}****${stripped.slice(-4)}`;
  }
  if (stripped.length >= 5) {
    return `${stripped.slice(0, 3)}****${stripped.slice(-2)}`;
  }
  if (stripped.length >= 2) {
    return `${stripped[0]}****${stripped[stripped.length - 1]}`;
  }
  return '****';
}
