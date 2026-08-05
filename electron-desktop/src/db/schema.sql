-- ============================================
-- 本地缓存表结构(只镜像 Book,User 不缓存)
-- ============================================
-- 字段选择原则:
--   - 列表/详情需要的字段全要(避免读本地还要回查远程)
--   - 不缓存敏感字段(密码哈希等)
--   - updatedAt 必须存,用于冲突检测

CREATE TABLE IF NOT EXISTS book_cache (
  id              INTEGER PRIMARY KEY,    -- 与 Sealos 的 Book.id 对齐
  title           TEXT    NOT NULL,
  author          TEXT    NOT NULL,
  category        TEXT    NOT NULL,
  status          TEXT    NOT NULL,       -- AVAILABLE / BORROWED
  summary         TEXT,
  cover_url       TEXT,
  borrower_name   TEXT,
  borrower_phone  TEXT,
  borrowed_at     TEXT,                   -- ISO 8601 字符串
  due_at          TEXT,
  borrower_user_id INTEGER,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,       -- ★ 冲突检测锚点
  -- 本地元数据
  cached_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  is_deleted      INTEGER NOT NULL DEFAULT 0  -- 软删除标记(避免删除后又复活)
);

-- 索引:按状态/分类快速筛选(与线上 schema 对齐)
CREATE INDEX IF NOT EXISTS idx_book_status ON book_cache(status);
CREATE INDEX IF NOT EXISTS idx_book_category ON book_cache(category);
CREATE INDEX IF NOT EXISTS idx_book_updated_at ON book_cache(updated_at);

-- 同步状态表:记录最后一次拉取时间,用于增量同步
CREATE TABLE IF NOT EXISTS sync_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);