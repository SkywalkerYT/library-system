// ============================================
// 应用本地预抓取好的封面到 DB（pod 端一次性脚本）
//
// 背景：local fetch-covers-local.mjs（PC 端，豆瓣源）已生成
//       cover-map.json + covers-output/*.jpg
//       通过 scp 推到 pod 后，本脚本批量回写到 Book 表。
//
// 输入：cover-map.json = [{bookId, coverUrl}, ...]
// 输出：Book.coverUrl 更新 + 控制台汇总报告
//
// 跑法（在 pod 上）：
//   cd ~/library-system/server
//   npx tsx scripts/apply-covers.ts /tmp/cover-map.json
// ============================================
import { readFile } from 'node:fs/promises';
import { prisma } from '../src/config/prisma.js';

// ---------- CLI args ----------
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const jsonPath = args.find((a) => !a.startsWith('--'));
if (!jsonPath) {
  console.error('用法：npx tsx scripts/apply-covers.ts [--dry-run] <cover-map.json>');
  process.exit(1);
}

// ---------- main ----------
interface CoverMapItem {
  bookId: number;
  coverUrl: string;
}

async function main() {
  console.log('🚀 应用封面回写 DB');
  console.log(`  json:    ${jsonPath}`);
  console.log(`  dryRun:  ${dryRun}`);

  const items: CoverMapItem[] = JSON.parse(await readFile(jsonPath, 'utf8'));
  console.log(`📋 计划回写：${items.length} 本`);

  let ok = 0, failed = 0, skipped = 0;

  for (const item of items) {
    if (!item.bookId || !item.coverUrl) {
      console.warn(`  ⚠ 跳过：bookId=${item.bookId} coverUrl=${item.coverUrl}`);
      skipped++;
      continue;
    }

    // 先查现况，避免覆盖已存在的封面
    const before = await prisma.book.findUnique({
      where: { id: item.bookId },
      select: { id: true, title: true, coverUrl: true },
    });

    if (!before) {
      console.warn(`  ⚠ [${item.bookId}] DB 无此 id，跳过`);
      failed++;
      continue;
    }

    if (before.coverUrl) {
      console.log(`  ⏭ [${item.bookId}] ${before.title} 已有封面（${before.coverUrl}），跳过`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  🔎 [dry-run] [${item.bookId}] ${before.title} ← ${item.coverUrl}`);
      ok++;
      continue;
    }

    try {
      await prisma.book.update({
        where: { id: item.bookId },
        data: { coverUrl: item.coverUrl },
      });
      ok++;
      console.log(`  ✅ [${item.bookId}] ${before.title} ← ${item.coverUrl}`);
    } catch (e) {
      console.error(`  ❌ [${item.bookId}] ${before.title} 失败：${(e as Error).message}`);
      failed++;
    }
  }

  console.log('');
  console.log('========== 汇总 ==========');
  console.log(`计划：                ${items.length}`);
  console.log(`回写成功：            ${ok}`);
  console.log(`跳过（已存在/空字段）：${skipped}`);
  console.log(`失败（DB 无此 id）：   ${failed}`);
  console.log('==========================');

  if (!dryRun) {
    const total = await prisma.book.count({ where: { coverUrl: { not: null } } });
    const nullCount = await prisma.book.count({ where: { coverUrl: null } });
    console.log(`📊 DB 现况：有封面 ${total} 本 / 无封面 ${nullCount} 本`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ 回写失败：', e);
    await prisma.$disconnect();
    process.exit(1);
  });