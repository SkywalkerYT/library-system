// ============================================
// 批量抓取图书封面（一次性脚本）
//
// 背景：上线 coverUrl 字段后，已有 161 本书没有封面。
//       从公开 API 批量补全：Google Books → Open Library 兜底。
//
// 匹配策略：严格匹配 + 跳过（推荐）
//   - title 归一化后完全相等；或短串是长串的子串且 ≥ 4 字符
//   - author：取第一作者，归一化后相等 / 子串
//   - 任一不匹配 → 跳过，不写 DB
//
// 跑法（在 pod 上）：
//   DATABASE_URL=... npx tsx scripts/fetch-covers.ts [options]
//
// 选项：
//   --dry-run          只查 API，不写文件、不写 DB
//   --limit N          只处理前 N 本（默认 100）
//   --book-id 123      只处理指定 ID
//   --delay-ms 200     两次请求间隔（默认 200ms，礼貌抓取）
// ============================================
import { prisma } from '../src/config/prisma.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

// ---------- CLI args ----------
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const getArg = (name: string, fallback: string): string => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const limit = parseInt(getArg('--limit', '100'), 10);
const bookIdRaw = getArg('--book-id', '');
const bookId = bookIdRaw ? parseInt(bookIdRaw, 10) : null;
const delayMs = parseInt(getArg('--delay-ms', '200'), 10);

// ---------- paths ----------
const __dirname = dirname(fileURLToPath(import.meta.url));
const COVERS_DIR = join(__dirname, '..', 'uploads', 'covers');

// ---------- HTTP ----------
const HTTP_TIMEOUT_MS = 10_000;

async function httpGetJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'library-fetch-covers/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function httpDownload(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(t);
  }
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------- normalize & match ----------
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, ' ')  // 空白 + 标点 → 单空格
    .trim();
}

/**
 * 严格匹配：
 *   - 归一化后完全相等                → 命中
 *   - 短串 ≥ 4 字符且是长串子串       → 命中
 *   - 任一为空或短串 < 4 字符          → 不命中（避免 "a" / "the" 误中）
 */
function isMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (short.length < 4) return false;
  return long.includes(short);
}

// ---------- Google Books ----------
interface GBItem {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}
interface GBResponse { items?: GBItem[] }

async function searchGoogleBooks(title: string, author: string): Promise<string | null> {
  const q = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&printType=books&projection=lite`;
  try {
    const data = (await httpGetJson(url)) as GBResponse;
    if (!data.items?.length) return null;
    for (const item of data.items) {
      const t = item.volumeInfo.title ?? '';
      const a = item.volumeInfo.authors?.[0] ?? '';
      if (!isMatch(title, t)) continue;
      if (author && !isMatch(author, a)) continue;
      const link = item.volumeInfo.imageLinks?.thumbnail ?? item.volumeInfo.imageLinks?.smallThumbnail;
      if (!link) continue;
      return link.replace(/^http:/, 'https:');  // 强制 https，避免 mixed-content
    }
    return null;
  } catch (e) {
    console.warn(`  ⚠ Google Books 查询失败：${(e as Error).message}`);
    return null;
  }
}

// ---------- Open Library ----------
interface OLDoc {
  title?: string;
  author_name?: string[];
  cover_i?: number;
}
interface OLResponse { docs?: OLDoc[] }

async function searchOpenLibrary(title: string, author: string): Promise<string | null> {
  const params = new URLSearchParams({ title, author, limit: '5' });
  const url = `https://openlibrary.org/search.json?${params.toString()}`;
  try {
    const data = (await httpGetJson(url)) as OLResponse;
    if (!data.docs?.length) return null;
    for (const doc of data.docs) {
      const t = doc.title ?? '';
      const a = doc.author_name?.[0] ?? '';
      if (!isMatch(title, t)) continue;
      if (author && !isMatch(author, a)) continue;
      if (!doc.cover_i) continue;
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }
    return null;
  } catch (e) {
    console.warn(`  ⚠ Open Library 查询失败：${(e as Error).message}`);
    return null;
  }
}

// ---------- 图片扩展名推断 ----------
function sniffExt(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// ---------- main ----------
async function main() {
  console.log('🚀 批量抓取封面启动');
  console.log(`  dryRun:   ${dryRun}`);
  console.log(`  limit:    ${limit}`);
  console.log(`  delayMs:  ${delayMs}`);
  if (bookId) console.log(`  bookId:   ${bookId}`);

  if (!dryRun) {
    await mkdir(COVERS_DIR, { recursive: true });
  }

  const where = bookId ? { id: bookId } : { coverUrl: null };
  const books = await prisma.book.findMany({
    where,
    select: { id: true, title: true, author: true, coverUrl: true },
    take: limit,
    orderBy: { id: 'asc' },
  });
  console.log(`📚 候选书数：${books.length}`);

  let okGb = 0;
  let okOl = 0;
  let skippedNoMatch = 0;
  let skippedEmpty = 0;
  let failedDownload = 0;
  let failedExt = 0;

  for (const book of books) {
    process.stdout.write(`[${book.id}] ${book.title} / ${book.author} → `);

    if (!book.title || !book.author) {
      console.log('⏭ 跳过（标题或作者为空）');
      skippedEmpty++;
      continue;
    }

    let imgUrl = await searchGoogleBooks(book.title, book.author);
    let source: 'GB' | 'OL' | null = imgUrl ? 'GB' : null;
    await delay(delayMs);

    if (!imgUrl) {
      imgUrl = await searchOpenLibrary(book.title, book.author);
      if (imgUrl) source = 'OL';
      await delay(delayMs);
    }

    if (!imgUrl) {
      console.log('⏭ 未匹配 (GB + OL)');
      skippedNoMatch++;
      continue;
    }

    if (dryRun) {
      console.log(`🔎 [dry-run] ${source} 命中：${imgUrl}`);
      if (source === 'GB') okGb++;
      else okOl++;
      continue;
    }

    // 下载
    let buf: Buffer;
    try {
      buf = await httpDownload(imgUrl);
    } catch (e) {
      console.log(`❌ 下载失败：${(e as Error).message}`);
      failedDownload++;
      continue;
    }

    const ext = sniffExt(buf);
    if (!ext) {
      console.log(`❌ 格式未知（${buf.length} bytes），丢弃`);
      failedExt++;
      continue;
    }

    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(COVERS_DIR, filename);
    await writeFile(filepath, buf);

    const coverUrl = `/api/covers/${filename}`;
    await prisma.book.update({
      where: { id: book.id },
      data: { coverUrl },
    });

    if (source === 'GB') okGb++;
    else okOl++;
    console.log(`✅ ${source} → ${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
  }

  console.log('');
  console.log('========== 汇总 ==========');
  console.log(`候选：                ${books.length}`);
  console.log(`Google Books 命中：   ${okGb}`);
  console.log(`Open Library 命中：   ${okOl}`);
  console.log(`跳过（无匹配）：      ${skippedNoMatch}`);
  console.log(`跳过（标题/作者空）：  ${skippedEmpty}`);
  console.log(`失败（下载）：        ${failedDownload}`);
  console.log(`失败（格式未知）：    ${failedExt}`);
  console.log('==========================');
  if (dryRun) console.log('⚠ DRY-RUN：未写文件、未写 DB');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ 抓取失败：', e);
    await prisma.$disconnect();
    process.exit(1);
  });
