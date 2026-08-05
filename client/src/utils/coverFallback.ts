// ============================================
// 封面占位图（内联 SVG，零网络请求）
// ============================================
//
// 设计要点：
//   - data:image/svg+xml;utf8,<svg>...：纯字符串 URL，浏览器直接解析 SVG
//     无需网络往返，失败率 0%、零延迟
//   - 不在 SVG 里嵌字体/图片：依赖越少越稳
//   - 用 title 文字生成对比色块（首字母）：让占位图也能区分书
//   - 故意做成"通用图书封面"造型：顶部浅带 = 装帧条，底部标题条 = 书名
//
// 用法：
//   <img :src="book.coverUrl ?? FALLBACK_COVER(book.title)" @error="onCoverError" />

function hashColor(title: string): string {
  // ★ 稳定 hash → 不同书不同色 —— 用 djb2，10 行就够
  let h = 5381;
  for (let i = 0; i < title.length; i++) h = ((h << 5) + h + title.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

function svgEscape(s: string): string {
  // 防 SVG 注入：& < > " ' 转义
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function FALLBACK_COVER(title: string, w = 600, h = 800): string {
  const safe = svgEscape(title || '');
  const initial = safe.charAt(0).toUpperCase() || '?';
  const color = hashColor(title || '');
  // ★ 故意截断长标题 —— SVG 内 text 长度靠 maxlength + 字号约束
  const displayTitle = safe.length > 24 ? safe.slice(0, 23) + '…' : safe;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect x="0" y="0" width="${w}" height="14" fill="rgba(0,0,0,0.18)"/>
  <text x="${w / 2}" y="${h * 0.45}" font-family="Georgia, 'Times New Roman', serif"
        font-size="${w * 0.32}" font-weight="bold" fill="#fff" text-anchor="middle"
        dominant-baseline="middle">${initial}</text>
  <rect x="${w * 0.08}" y="${h * 0.78}" width="${w * 0.84}" height="${h * 0.14}"
        fill="rgba(0,0,0,0.32)" rx="6"/>
  <text x="${w / 2}" y="${h * 0.855}" font-family="system-ui, sans-serif"
        font-size="${Math.max(20, w * 0.05)}" fill="#fff" text-anchor="middle"
        dominant-baseline="middle">${displayTitle}</text>
</svg>`;
  // ★ encodeURIComponent：处理中文、空格、# 等 URL 敏感字符
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}