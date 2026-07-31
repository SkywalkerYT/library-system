// ============================================
// 启动入口
// ============================================
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { seedDemoBooksIfEmpty } from './modules/auth/demo-books.js';

async function bootstrap() {
  // ★ 社区馆藏种子：表为空时插入 162 本示例；非空跳过（部署到 Railway / 重启都幂等）
  const result = await seedDemoBooksIfEmpty(
    () => prisma.book.count(),
    (data) => prisma.book.create({ data }),
  );
  if (result.skipped) {
    console.log(`📚 Seed skipped (${result.existing} books already exist)`);
  } else {
    console.log(`📚 Seeded ${result.inserted} demo books into community library`);
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`🚀 Library API listening on http://localhost:${env.PORT}`);
    console.log(`📦 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 CORS origin: ${env.CLIENT_ORIGIN}`);
  });
}

bootstrap().catch((e) => {
  console.error('❌ Bootstrap failed:', e);
  process.exit(1);
});