// ============================================
// 写入队列:离线时把写操作排队,联网后重试
// ============================================
// 存储用 IndexedDB(通过 idb 库,Promise 化)
//
// 数据结构:
//   {
//     id: 自增,
//     method: 'POST' | 'PATCH' | 'DELETE',
//     path: '/api/books/123',
//     body: {...},
//     retries: 0,
//     createdAt: ISO 时间,
//     lastError: string | null
//   }
//
// 重试策略:
//   - 网络恢复后,按 FIFO 顺序重试
//   - 单条失败 3 次后标记为 dead,需要用户手动重试
//   - 重试间隔: 2^n 秒(避免雪崩)

import { openDB, type IDBPDatabase } from 'idb';

interface QueueItem {
  id?: number;
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body: any;
  retries: number;
  createdAt: string;
  lastError: string | null;
}

let db: IDBPDatabase | null = null;

const DB_NAME = 'library-sync';
const STORE_NAME = 'write-queue';

async function getDb(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('createdAt', 'createdAt');
      }
    },
  });
  return db;
}

/**
 * 入队:Vue 发起写操作时调用
 * 返回:立即入队成功(不等待远程响应)
 */
export async function enqueueWrite(
  method: QueueItem['method'],
  path: string,
  body: any
): Promise<number> {
  const database = await getDb();
  const id = await database.add(STORE_NAME, {
    method,
    path,
    body,
    retries: 0,
    createdAt: new Date().toISOString(),
    lastError: null,
  });
  console.log(`[queue] 入队: ${method} ${path} (id=${id})`);
  return id as number;
}

/**
 * 重试队列里的所有项
 * 在网络恢复时被调用
 */
export async function flushQueue(remoteApi: string): Promise<{
  success: number;
  failed: number;
}> {
  const database = await getDb();
  const items = (await database.getAll(STORE_NAME)) as QueueItem[];

  // 按 createdAt 升序(先入先出)
  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let success = 0;
  let failed = 0;

  for (const item of items) {
    if (item.retries >= 3) {
      failed++;  // 跳过死信
      continue;
    }

    try {
      const res = await fetch(`${remoteApi}${item.path}`, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (res.ok) {
        await database.delete(STORE_NAME, item.id!);
        success++;
        console.log(`[queue] 重试成功: ${item.method} ${item.path}`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      // 更新重试次数和错误信息
      item.retries++;
      item.lastError = err.message;
      await database.put(STORE_NAME, item);
      failed++;
      console.warn(`[queue] 重试失败(${item.retries}/3): ${item.path} - ${err.message}`);

      // 指数退避:1s, 2s, 4s
      await new Promise((r) => setTimeout(r, Math.pow(2, item.retries) * 1000));
    }
  }

  return { success, failed };
}

/**
 * 查看队列状态(给 UI 显示"待同步 X 条")
 */
export async function getQueueStats(): Promise<{
  pending: number;
  dead: number;
}> {
  const database = await getDb();
  const items = (await database.getAll(STORE_NAME)) as QueueItem[];
  const pending = items.filter((i) => i.retries < 3).length;
  const dead = items.filter((i) => i.retries >= 3).length;
  return { pending, dead };
}