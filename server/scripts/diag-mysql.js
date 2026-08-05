#!/usr/bin/env node
// Diag: dump DB schema state. NEVER print password.
const fs = require('fs');
const envTxt = fs.readFileSync('/home/devbox/project/library-system/server/.env', 'utf8');
const m = envTxt.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.error('DATABASE_URL not in .env'); process.exit(1); }
const url = m[1].replace(/['"]/g, '');
const u = new URL(url);
const cfg = {
  host: u.hostname,
  port: Number(u.port || 3306),
  user: u.username,
  password: u.password,
  database: u.pathname.replace(/^\//, ''),
};
console.log(`=== connection: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database} (pass len=${cfg.password.length}) ===`);

const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection(cfg);

  console.log('\n=== User columns ===');
  const [userCols] = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = '${cfg.database}' AND TABLE_NAME = 'User'
     ORDER BY ORDINAL_POSITION`
  );
  console.table(userCols);

  console.log('\n=== Book columns ===');
  const [bookCols] = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = '${cfg.database}' AND TABLE_NAME = 'Book'
     ORDER BY ORDINAL_POSITION`
  );
  console.table(bookCols);

  console.log('\n=== Indexes (isAdmin / borrowerUserId) ===');
  const [idx] = await conn.query(
    `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = '${cfg.database}'
       AND ((TABLE_NAME='User' AND INDEX_NAME LIKE '%isAdmin%')
         OR (TABLE_NAME='Book' AND INDEX_NAME LIKE '%borrowerUserId%'))
     ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`
  );
  console.table(idx);

  console.log('\n=== _prisma_migrations ===');
  const [mig] = await conn.query(
    `SELECT migration_name,
            (finished_at IS NOT NULL) AS finished,
            applied_steps_count,
            started_at,
            finished_at
     FROM _prisma_migrations
     ORDER BY started_at`
  );
  console.table(mig);

  await conn.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });