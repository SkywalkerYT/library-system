// ============================================
// 数据迁移前先去重（一次性脚本）
//
// 背景：重构前每个用户都有一份 162 本示例书；
//       现在去掉 Book.userId，需要把 (title, author) 重复的
//       行合并为单条（保留 id 最小行）。
//
// 合并策略（保守）：
//   - 保留行 = id 最小的那条（创建时间最早）
//   - 若保留行 status === 'AVAILABLE' 但删除行中有 BORROWED → 把最早借出的那一条的借阅字段上挪
//   - 若保留行已 BORROWED 且删除行也 BORROWED → 保留最早借出的那条（不动）
//   - 都不 BORROWED → 直接保留最早那条
//
// 跑法：DATABASE_URL=mysql://root:root123@localhost:3306/mybook_db npx tsx scripts/dedup-books.ts
// ============================================
import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('🔍 正在扫描重复书（按 title + author 分组）...');

  const groups = await prisma.book.groupBy({
    by: ['title', 'author'],
    _count: { _all: true },
    having: { id: { _count: { gt: 1 } } },
  });

  if (groups.length === 0) {
    console.log('✅ 没有重复，无需处理。');
    return;
  }

  console.log(`📦 发现 ${groups.length} 组重复书，准备合并...`);

  let mergedBorrow = 0;
  let deletedTotal = 0;

  for (const g of groups) {
    const dupes = await prisma.book.findMany({
      where: { title: g.title, author: g.author },
      orderBy: { id: 'asc' },
    });
    const keep = dupes[0]!;
    const drop = dupes.slice(1);

    // 借阅字段合并：若 keep 未借出但某个 drop 借出 → 选最早借出的那条上挪
    if (keep.status === 'AVAILABLE') {
      const borrowedDrops = drop
        .filter((b) => b.status === 'BORROWED')
        .sort((a, b) => {
          const aTime = a.borrowedAt?.getTime() ?? Number.POSITIVE_INFINITY;
          const bTime = b.borrowedAt?.getTime() ?? Number.POSITIVE_INFINITY;
          return aTime - bTime;
        });
      const pick = borrowedDrops[0];
      if (pick) {
        await prisma.book.update({
          where: { id: keep.id },
          data: {
            status: 'BORROWED',
            borrowerName: pick.borrowerName,
            borrowerPhone: pick.borrowerPhone,
            borrowedAt: pick.borrowedAt,
            dueAt: pick.dueAt,
          },
        });
        mergedBorrow++;
        console.log(
          `  ↻ "${g.title}" / ${g.author} → 上挪借阅记录（来自 id=${pick.id}）`,
        );
      }
    }

    // 删重复行
    await prisma.book.deleteMany({
      where: { id: { in: drop.map((b) => b.id) } },
    });
    deletedTotal += drop.length;
    console.log(
      `  ✓ "${g.title}" / ${g.author}：保留 id=${keep.id}，删除 ${drop.length} 条`,
    );
  }

  console.log('');
  console.log('========== 汇总 ==========');
  console.log(`重复组数：     ${groups.length}`);
  console.log(`删除书数：     ${deletedTotal}`);
  console.log(`借阅字段上挪： ${mergedBorrow}`);
  console.log('========================');

  // 二次校验：应该没有 (title, author) 重复了
  const remain = await prisma.book.groupBy({
    by: ['title', 'author'],
    _count: { _all: true },
    having: { id: { _count: { gt: 1 } } },
  });
  if (remain.length > 0) {
    console.error(`❌ 仍有 ${remain.length} 组重复，请检查！`);
    process.exit(1);
  } else {
    console.log('✅ 二次校验通过：无 (title, author) 重复。');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ 去重失败：', e);
    await prisma.$disconnect();
    process.exit(1);
  });