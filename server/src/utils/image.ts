// ============================================
// 图片格式识别 —— 按 buffer magic number,不信任 mimetype
//
// 背景:浏览器 / 操作系统 / 用户都可能给出错的扩展名或 mimetype:
//   - Chrome 看 file.name 决定 multipart 里的 Content-Type
//   - macOS 截图默认 PNG,但很多工具保存为 .jpg(扩展名撒谎)
//   - 用户拖文件到浏览器,mimetype 完全不可信
//
// 结果:存到磁盘的文件"扩展名 ≠ 真实格式",服务器返错 MIME,
// 浏览器加载失败,触发 <img onerror> → 占位 SVG。
//
// 解法:用文件头 magic number 判定,这是图像处理库的标准做法。
//   - JPEG: FF D8 FF (SOI marker)
//   - PNG : 89 50 4E 47 0D 0A 1A 0A (固定 8 字节)
//   - WebP: RIFF????WEBP (前 4 字节 + 8-12 字节)
//
// 扩展性:不引依赖(magic bytes 都很短),零运行时开销。
// ============================================

export type ImageExt = 'jpg' | 'png' | 'webp';

/**
 * 按 buffer magic number 判定图片格式。
 * @returns 真实格式;不支持的格式返回 null
 */
export function detectImageExt(buf: Buffer): ImageExt | null {
  if (!buf || buf.length < 12) return null;

  // ★ PNG:89 50 4E 47 0D 0A 1A 0A(8 字节固定)
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }

  // ★ JPEG:FF D8 FF(SOI marker;第 3 字节常 E0/JFIF 或 E1/EXIF)
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg';
  }

  // ★ WebP:RIFF????WEBP —— RIFF + 4 字节文件大小 + WEBP
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}
