// ============================================
// 本地 SQLite 缓存层
// ============================================
// 使用 better-sqlite3(同步 API,主进程里调用最方便)
// 关键决策:
//   - 用 WAL 模式提升并发(读不阻塞写)
//   - 同步连接用 ?mode=wal&cache=shared 编译进 better-sqlite3
//   - 启动时跑 schema.sql 建表(IF NOT EXISTS 幂等)

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export async function initLocalDb(): Promise<void> {
  // 缓存文件存在用户数据目录(各操作系统路径正确)
  // Windows: %APPDATA%/community-library/cache.db
  // macOS:   ~/Library/Application Support/community-library/cache.db
  const userDataPath = path.join(
    process.env.APPDATA ?? process.cwd(),
    'community-library'
  );
  // ★ 简化:这里直接用项目根目录,生产应该用上面的 userDataPath

  const dbPath = path.join(__dirname, '../../cache.db');
  db = new Database(dbPath);

  // WAL 模式:读写并发,主进程同步引擎写 + Vue 读 不冲突
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // 建表(读 schema.sql 拆分执行)
  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  console.log('[db] 本地缓存初始化完成:', dbPath);
}

// ============================================
// Book 缓存的 CRUD
// ============================================

/**
 * 全量替换本地缓存(启动时首次同步用)
 * 用事务批量 upsert,避免逐条写入慢
 */
export function bulkUpsertBooks(books: any[]): void {
  if (!db) throw new Error('DB not initialized');
  if (books.length === 0) return;

  const upsert = db.prepare(`
    INSERT INTO book_cache (
      id, title, author, category, status, summary, cover_url,
      borrower_name, borrower_phone, borrowed_at, due_at, borrower_user_id,
      created_at, updated_at, cached_at, is_deleted
    ) VALUES (
      @id, @title, @author, @category, @status, @summary, @coverUrl,
      @borrowerName, @borrowerPhone, @borrowedAt, @dueAt, @borrowerUserId,
      @createdAt, @updatedAt, datetime('now'), 0
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      author = excluded.author,
      category = excluded.category,
      status = excluded.status,
      summary = excluded.summary,
      cover_url = excluded.cover_url,
      borrower_name = excluded.borrower_name,
      borrower_phone = excluded.borrower_phone,
      borrowed_at = excluded.borrowed_at,
      due_at = excluded.due_at,
      borrower_user_id = excluded.borrower_user_id,
      updated_at = excluded.updated_at,
      cached_at = datetime('now'),
      is_deleted = 0
  `);

  const txn = db.transaction((rows: any[]) => {
    for (const book of rows) upsert(book);
  });
  txn(books);
}

/**
 * 增量更新单本(同步引擎拉取单条变化时用)
 */
export function upsertBook(book: any): void {
  if (!db) throw new Error('DB not initialized');
  bulkUpsertBooks([book]);   // 复用批量逻辑
}

/**
 * 软删除(标记 is_deleted=1,不真删,避免同步引擎再拉到时"复活")
 */
export function softDeleteBook(id: number): void {
  if (!db) throw new Error('DB not initialized');
  db.prepare('UPDATE book_cache SET is_deleted = 1, cached_at = datetime("now") WHERE id = ?')
    .run(id);
}

/**
 * Vue 读取列表(走本地缓存)
 */
export function listBooksLocal(filter?: {
  keyword?: string;
  category?: string;
  status?: string;
}): any[] {
  if (!db) throw new Error('DB not initialized');

  let sql = 'SELECT * FROM book_cache WHERE is_deleted = 0';
  const params: any[] = [];

  if (filter?.keyword) {
    sql += ' AND (title LIKE ? OR author LIKE ?)';
    const kw = `%${filter.keyword}%`;
    params.push(kw, kw);
  }
  if (filter?.category) {
    sql += ' AND category = ?';
    params.push(filter.category);
  }
  if (filter?.status) {
    sql += ' AND status = ?';
    params.push(filter.status);
  }
  sql += ' ORDER BY updated_at DESC';

  return db.prepare(sql).all(...params);
}

/**
 * 获取同步元数据(上次同步时间)
 */
export function getSyncMeta(key: string): string | null {
  if (!db) throw new Error('DB not initialized');
  const row = db.prepare('SELECT value FROM sync_meta WHERE key = ?').get(key) as any;
  return row?.value ?? null;
}

export function setSyncMeta(key: string, value: string): void {
  if (!db) throw new Error('DB not initialized');
  db.prepare(`
    INSERT INTO sync_meta (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}