// ============================================
// 启动入口
// ============================================
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { seedDemoBooksIfEmpty } from './modules/auth/demo-books.js';

async function bootstrap() {
  // ★ Sealos 探针要求端口尽快可用 → 先 listen 让平台探针通过，
  //   种子挪到 listen 之后，DB 暂时不通也不阻塞服务。
  const app = createApp();
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 Library API listening on http://localhost:${env.PORT}`);
    console.log(`📦 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 CORS origin: ${env.CLIENT_ORIGIN}`);
  });

  // 社区馆藏种子：表为空时插入 162 本示例；非空跳过（重启幂等）
  //   失败不阻塞 HTTP 服务，再启动后端探针就能过
  try {
    const result = await seedDemoBooksIfEmpty(
      () => prisma.book.count(),
      (data) => prisma.book.create({ data }),
    );
    if (result.skipped) {
      console.log(`📚 Seed skipped (${result.existing} books already exist)`);
    } else {
      console.log(`📚 Seeded ${result.inserted} demo books into community library`);
    }
  } catch (e) {
    console.error('⚠️ Seed failed (non-fatal, service already accepting requests):', e);
  }
}

bootstrap().catch((e) => {
  console.error('❌ Bootstrap failed:', e);
  process.exit(1);
});