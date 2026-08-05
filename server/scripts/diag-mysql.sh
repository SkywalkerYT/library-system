#!/usr/bin/env bash
# Diag: read DATABASE_URL from .env, connect to MySQL, dump DB schema state.
# NEVER print password — only length & first 2 chars for sanity check.

set -euo pipefail

cd /home/devbox/project/library-system/server

# Parse DATABASE_URL via node
URL=$(node -e "
  const fs=require('fs');
  const txt=fs.readFileSync('.env','utf8');
  const m=txt.match(/^DATABASE_URL=(.*)\$/m);
  if(!m){process.exit(1)}
  process.stdout.write(m[1].replace(/['\"]/g,''));
")

HOST=$(node -e "process.stdout.write(new URL('$URL').hostname)")
PORT=$(node -e "process.stdout.write(new URL('$URL').port||'3306')")
USER=$(node -e "process.stdout.write(new URL('$URL').username)")
PASS=$(node -e "process.stdout.write(new URL('$URL').password)")
DB=$(node -e "process.stdout.write(new URL('$URL').pathname.replace(/^\//,''))")

echo "=== connection: $USER@$HOST:$PORT/$DB (pass length=${#PASS}) ==="

# Use MYSQL_PWD env to avoid password on argv
export MYSQL_PWD="$PASS"
mysql -h "$HOST" -P "$PORT" -u "$USER" "$DB" --table -e "
  SELECT '--- User columns (isAdmin presence) ---' AS section;
  SHOW COLUMNS FROM User WHERE Field IN ('id','email','displayName','isAdmin','createdAt');
  SELECT '--- Book columns (borrowerUserId presence) ---' AS section;
  SHOW COLUMNS FROM Book WHERE Field IN ('id','title','status','borrowerPhone','borrowerName','borrowerUserId');
  SELECT '--- indexes on User.isAdmin / Book.borrowerUserId ---' AS section;
  SHOW INDEX FROM User WHERE Key_name LIKE '%isAdmin%';
  SHOW INDEX FROM Book WHERE Key_name LIKE '%borrowerUserId%';
  SELECT '--- _prisma_migrations rows ---' AS section;
  SELECT migration_name,
         (finished_at IS NOT NULL) AS finished,
         applied_steps_count,
         started_at
    FROM _prisma_migrations
   ORDER BY started_at;
"
unset MYSQL_PWD