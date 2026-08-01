// ============================================
// 手机号脱敏（前端防御性冗余）
//   与 server/src/utils/mask.ts 实现完全一致 —— 两端各自维护一份
//   原因：packages/shared 当前是空目录，不依赖 monorepo workspace
//
// 触发场景：
//   - 渲染前再 mask 一次（即便后端 mask 漏了也兜底）
//   - 输入校验失败时给用户友好提示（例：「格式不正确，请重新输入」）
//
// ★ 降级策略：与 server 对齐 —— 选项 (d) 自适应
//   11 位 CN：  138****5678        （1-3 可见 + 4-7 隐 + 8-11 可见）
//   ≥7 字符：  前3****后4
//   ≥5 字符：  前3****后2
//   ≥2 字符：  首1****末1
//   其余：     ****
// ============================================

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.replace(/\s/g, '');
  if (/^1[3-9]\d{9}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)}****${trimmed.slice(7)}`;
  }
  // ★ 降级：去掉中划线 / 括号（兼容 '+1 (555) 123-4567' 等国际号）
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
