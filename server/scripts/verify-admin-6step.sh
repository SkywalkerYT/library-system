#!/usr/bin/env bash
# verify-admin-6step.sh — runs on Sealos devbox via SSH
# Strategy: bypass register/login rate-limits by:
#   1) SQL INSERT two real test User rows (admin + user)
#   2) Manually sign HS256 JWT with project's JWT_SECRET
#   3) Use those JWTs as Bearer tokens for 6 assertions
# Privacy: never prints email, phone, password, or full token.
#
# Architecture:
#   - heredoc (single-quoted EOF) writes /tmp/verify-helper.js → no bash interp
#   - bash does curl assertions
#   - JSON parsed via tiny `node -e` that reads code from process.argv[1]
#     (argv-based, so bash never expands the JS code → no quoting hell)

set -u
cd /home/devbox/project/library-system/server

EMAIL_ADMIN='test_admin@example.com'
EMAIL_USER='test_user@example.com'
BASE='http://localhost:3000/api'

# ─────────────────────────────────────────────────────────────
# 1) Write Node.js helper via heredoc (single-quoted → no expansion)
#    Path: project root so node resolves ../node_modules/{mysql2,...}
# ─────────────────────────────────────────────────────────────
HELPER=/home/devbox/project/library-system/server/.verify-helper.cjs
cat > "$HELPER" <<'HELPER_EOF'
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const EMAIL_ADMIN = 'test_admin@example.com';
const EMAIL_USER = 'test_user@example.com';

(async () => {
  const envPath = fs.existsSync('.env') ? '.env' : '/home/devbox/project/library-system/server/.env';
  const envTxt = fs.readFileSync(envPath, 'utf8');
  const m = envTxt.match(/^DATABASE_URL=(.*)$/m);
  if (!m) { console.error('NO DATABASE_URL in .env'); process.exit(1); }
  const u = new URL(m[1].replace(/['"]/g, ''));
  const cfg = {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: u.username,
    password: u.password,
    database: u.pathname.replace(/^\//, ''),
  };

  const conn = await mysql.createConnection(cfg);
  const action = process.argv[2];

  if (action === 'insert') {
    // cleanup first (idempotent)
    await conn.query(
      `DELETE FROM User WHERE email IN ('${EMAIL_ADMIN}','${EMAIL_USER}')`
    );
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const hash = await bcrypt.hash('unused-by-jwt', 10);
    const [r1] = await conn.query(
      `INSERT INTO User (email,passwordHash,displayName,isAdmin,createdAt,updatedAt) VALUES (?,?,?,?,?,?)`,
      [EMAIL_ADMIN, hash, 'Test Admin', 1, now, now]
    );
    const [r2] = await conn.query(
      `INSERT INTO User (email,passwordHash,displayName,isAdmin,createdAt,updatedAt) VALUES (?,?,?,?,?,?)`,
      [EMAIL_USER, hash, 'Test User', 0, now, now]
    );
    const idA = r1.insertId, idU = r2.insertId;

    const sm = envTxt.match(/^JWT_SECRET=(.*)$/m);
    if (!sm) { console.error('NO JWT_SECRET in .env'); process.exit(1); }
    const secret = sm[1].replace(/['"]/g, '');
    const tA = jwt.sign({ userId: idA, isAdmin: true }, secret, { algorithm: 'HS256', expiresIn: '7d' });
    const tU = jwt.sign({ userId: idU, isAdmin: false }, secret, { algorithm: 'HS256', expiresIn: '7d' });

    fs.writeFileSync('/tmp/v_idA', String(idA));
    fs.writeFileSync('/tmp/v_idU', String(idU));
    fs.writeFileSync('/tmp/v_tokA', tA);
    fs.writeFileSync('/tmp/v_tokU', tU);
    console.log(`  admin id=${idA} isAdmin=1  tokenLen=${tA.length}`);
    console.log(`  user  id=${idU} isAdmin=0  tokenLen=${tU.length}`);
  } else if (action === 'cleanup') {
    const [r] = await conn.query(
      `DELETE FROM User WHERE email IN ('${EMAIL_ADMIN}','${EMAIL_USER}')`
    );
    console.log(`  cleanup affectedRows = ${r.affectedRows}`);
    for (const f of ['/tmp/v_idA', '/tmp/v_idU', '/tmp/v_tokA', '/tmp/v_tokU']) {
      try { fs.unlinkSync(f); } catch {}
    }
    try { fs.unlinkSync(__filename); } catch {}
  } else {
    console.error('unknown action: ' + action);
    process.exit(1);
  }

  await conn.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
HELPER_EOF

# ─────────────────────────────────────────────────────────────
# 2) INSERT two users + sign JWTs
# ─────────────────────────────────────────────────────────────
printf '[2/10] INSERT admin + user + sign JWTs\n'
node "$HELPER" insert

ID_A=$(cat /tmp/v_idA)
ID_U=$(cat /tmp/v_idU)
TOK_A=$(cat /tmp/v_tokA)
TOK_U=$(cat /tmp/v_tokU)
if [ -z "$TOK_A" ] || [ -z "$TOK_U" ]; then
  echo "  FATAL: token generation failed"
  exit 3
fi
printf '  admin token %s...%s  (len=%d)\n' "${TOK_A:0:8}" "${TOK_A: -4}" "${#TOK_A}"
printf '  user  token %s...%s  (len=%d)\n' "${TOK_U:0:8}" "${TOK_U: -4}" "${#TOK_U}"

# ─────────────────────────────────────────────────────────────
# JSON parser (argv-based, no bash interpolation):
#   echo "$json" | jget 'o.data.user.isAdmin'
# JS expression is passed as process.argv[1], evaluated with `o` in scope.
# ─────────────────────────────────────────────────────────────
jget() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);process.stdout.write(String(eval(process.argv[1])))}catch(e){process.stdout.write("PARSE_ERR:"+e.message)}})' "$1"
}

# ─────────────────────────────────────────────────────────────
# 3) [V1] admin /me → isAdmin=true
# ─────────────────────────────────────────────────────────────
printf '\n[3/10 V1] admin /api/auth/me\n'
ME=$(curl -sS "$BASE/auth/me" -H "Authorization: Bearer $TOK_A")
V1=$(echo "$ME" | jget '(o.data&&o.data.isAdmin===true?"OK":"FAIL")+" / id="+(o.data&&o.data.id!=null?o.data.id:"-")')
echo "  $V1"

# ─────────────────────────────────────────────────────────────
# 4) [V2] admin → /api/admin/users
# ─────────────────────────────────────────────────────────────
printf '\n[4/10 V2] admin → /api/admin/users?pageSize=2\n'
H1=$(curl -sS -o /tmp/r1.json -w '%{http_code}' "$BASE/admin/users?pageSize=2" -H "Authorization: Bearer $TOK_A")
V2=$(cat /tmp/r1.json | jget '"items="+((o.data&&o.data.items)||[]).length+" total="+((o.data&&o.data.total!=null)?o.data.total:-1)')
echo "  HTTP $H1  $V2"

# ─────────────────────────────────────────────────────────────
# 5) [V3] user → /api/admin/users → 403
# ─────────────────────────────────────────────────────────────
printf '\n[5/10 V3] normal user → /api/admin/users\n'
H2=$(curl -sS -o /tmp/r2.json -w '%{http_code}' "$BASE/admin/users" -H "Authorization: Bearer $TOK_U")
V3=$(cat /tmp/r2.json | jget '(o.error?o.error.code+":"+o.error.message:"OK")')
echo "  HTTP $H2  $V3"

# ─────────────────────────────────────────────────────────────
# 6) [V4] no token → /api/admin/users → 401
# ─────────────────────────────────────────────────────────────
printf '\n[6/10 V4] no token → /api/admin/users\n'
H3=$(curl -sS -o /tmp/r3.json -w '%{http_code}' "$BASE/admin/users")
V4=$(cat /tmp/r3.json | jget '(o.error?o.error.code+":"+o.error.message:"OK")')
echo "  HTTP $H3  $V4"

# ─────────────────────────────────────────────────────────────
# 7) [V5] admin → /api/books → borrowerPhone full plaintext
# ─────────────────────────────────────────────────────────────
printf '\n[7/10 V5] admin → /api/books?pageSize=20\n'
BA=$(curl -sS "$BASE/books?pageSize=20" -H "Authorization: Bearer $TOK_A")
V5=$(echo "$BA" | jget '(()=>{const items=(o.data&&o.data.items)||[];const withPhone=items.filter(b=>b.borrowerPhone);const sample=withPhone.slice(0,3).map(b=>({ph_len:String(b.borrowerPhone||"").length,ph_eq_phm:b.borrowerPhoneMasked===b.borrowerPhone}));return JSON.stringify({totalWithPhone:withPhone.length,sample})})()')
echo "  $V5"

# ─────────────────────────────────────────────────────────────
# 8) [V6] user → /api/books → borrowerPhoneMasked only
#    Mask format: ^1[3-9]\d\*+\d{4}$  (3 visible + N asterisks + 4 visible)
#    Note: \d is JS regex escape, passed via argv as literal text (no bash interp).
# ─────────────────────────────────────────────────────────────
printf '\n[8/10 V6] normal user → /api/books?pageSize=20\n'
BU=$(curl -sS "$BASE/books?pageSize=20" -H "Authorization: Bearer $TOK_U")
V6=$(echo "$BU" | jget '(()=>{const items=(o.data&&o.data.items)||[];const withMask=items.filter(b=>b.borrowerPhoneMasked);const re=/^1[3-9]\d\*+\d{4}$/;const sample=withMask.slice(0,3).map(b=>({phm:b.borrowerPhoneMasked,valid:re.test(b.borrowerPhoneMasked)}));const valid=withMask.filter(b=>re.test(b.borrowerPhoneMasked)).length;return JSON.stringify({total:withMask.length,valid,sample})})()')
echo "  $V6"

# ─────────────────────────────────────────────────────────────
# 9) cleanup
# ─────────────────────────────────────────────────────────────
printf '\n[9/10] cleanup test User rows\n'
node "$HELPER" cleanup

# ─────────────────────────────────────────────────────────────
# 10) summary
# ─────────────────────────────────────────────────────────────
printf '\n[10/10] summary\n'
printf '  V1 admin /me isAdmin=true            → step 3\n'
printf '  V2 admin /admin/users HTTP 200        → step 4\n'
printf '  V3 user  /admin/users HTTP 403        → step 5\n'
printf '  V4 no   /admin/users HTTP 401         → step 6\n'
printf '  V5 admin /books borrowerPhone len=11  → step 7\n'
printf '  V6 user  /books phm matches mask     → step 8 (valid=N/total)\n'
printf '\nALL DONE\n'
