// ============================================
// 同步引擎:从 Sealos 拉取数据
// ============================================
// 两阶段同步:
//   1. 首次启动 → 全量拉取所有 Book
//   2. 之后每 5 分钟 → 增量拉取(updated_at > 上次同步时间)
//
// 注意:
//   - Sealos 的 list API 支持 keyword/category/page 分页
//   - 增量同步需要后端支持(你的 server 有 updatedAt 字段,
//     但 /api/books?since=xxx 可能需要新增,见下一步 TODO)

import {
  bulkUpsertBooks,
  upsertBook,
  softDeleteBook,
  getSyncMeta,
  setSyncMeta
} from '../db/local-db.ts';
import type { WebContents } from 'electron';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;  // 5 分钟
const LAST_FULL_SYNC_KEY = 'last_full_sync';
const LAST_INCREMENTAL_KEY = 'last_incremental_sync';

interface SyncEngineContext {
  remoteApi: string;
  getWebContents: () => WebContents;
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startSyncEngine(
  remoteApi: string,
  getWebContents: () => WebContents
): void {
  const ctx: SyncEngineContext = { remoteApi, getWebContents };

  // 启动后立即跑一次全量同步(不等 5 分钟)
  fullSync(ctx).catch((err) => {
    console.error('[sync] 首次全量同步失败:', err);
  });

  // 之后每 5 分钟跑一次增量
  intervalHandle = setInterval(() => {
    incrementalSync(ctx).catch((err) => {
      console.error('[sync] 增量同步失败:', err);
    });
  }, SYNC_INTERVAL_MS);
}

/**
 * 全量同步:拉所有 Book(分页循环)
 * 把拉到的数据写入本地 SQLite
 */
async function fullSync(ctx: SyncEngineContext): Promise<void> {
  console.log('[sync] 开始全量同步...');
  let page = 1;
  const pageSize = 100;
  let total = 0;

  while (true) {
    const res = await fetch(`${ctx.remoteApi}/books?page=${page}&pageSize=${pageSize}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const books = json.data?.items ?? [];
    if (books.length === 0) break;

    bulkUpsertBooks(books);
    total += books.length;

    if (books.length < pageSize) break;
    page++;
  }

  setSyncMeta(LAST_FULL_SYNC_KEY, new Date().toISOString());
  console.log(`[sync] 全量同步完成,共 ${total} 本`);

  // 通知 Vue 刷新 UI
  ctx.getWebContents().send('sync:full-complete', { total });
}

/**
 * 增量同步:只拉上次同步后变化的 Book
 * TODO: 需要 Sealos 后端新增 GET /api/books?since=<ISO时间>
 *       返回 updatedAt > since 的 Book 列表
 */
async function incrementalSync(ctx: SyncEngineContext): Promise<void> {
  const lastSync = getSyncMeta(LAST_INCREMENTAL_KEY);
  const since = lastSync ?? getSyncMeta(LAST_FULL_SYNC_KEY);

  if (!since) {
    console.log('[sync] 无上次同步时间,跳过增量');
    return;
  }

  const res = await fetch(`${ctx.remoteApi}/books?since=${encodeURIComponent(since)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const changes = json.data?.items ?? [];

  for (const change of changes) {
    if (change._deleted) {
      softDeleteBook(change.id);
    } else {
      upsertBook(change);
    }
  }

  setSyncMeta(LAST_INCREMENTAL_KEY, new Date().toISOString());
  console.log(`[sync] 增量同步完成,${changes.length} 条变化`);

  if (changes.length > 0) {
    ctx.getWebContents().send('sync:changes', { count: changes.length });
  }
}