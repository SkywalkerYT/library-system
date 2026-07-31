#!/bin/bash
# 后端部署后烟测脚本——覆盖 4 个修复点
#   T1: 修 #3 注册返回 token
#   T2: 修 #3 重复注册 → 409 EMAIL_TAKEN
#   T3: 修 #2 borrow (原子 updateMany) → 200 + status=BORROWED
#   T4: 修 #2 return → 200 + status=AVAILABLE
#   T5: 修 #5 login 限流头 (RateLimit-*)
#   T6: 修 #5 第 6 次 login → 429 RATE_LIMITED

set -u
BASE=http://localhost:3000
TS=$(date +%s)
EMAIL="smoke-${TS}@example.com"

PASS_LINE() { printf "\n\033[1;36m=== %s ===\033[0m\n" "$1"; }
OK()        { printf "  \033[1;32m✓ %s\033[0m\n" "$1"; }
FAIL()      { printf "  \033[1;31m✗ %s\033[0m\n" "$1"; }
PYJSON()    { python3 -c "import json,sys; print(json.load(open('$1'))['data']['$2'])"; }
PYERR()     { python3 -c "import json; d=json.load(open('$1')); print(d['error']['code'])"; }

PASS_LINE "T1 注册新用户 (期望 201)"
RA_FILE=/tmp/ra.json
HC=$(curl -sS -o "$RA_FILE" -w "%{http_code}" -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"pass1234\",\"displayName\":\"smoke$TS\"}")
echo "  HTTP=$HC"
[ "$HC" = "201" ] && OK "注册成功" || FAIL "注册失败"
TOKEN=$(PYJSON "$RA_FILE" token 2>/dev/null || echo "")
echo "  token 前缀: ${TOKEN:0:24}..."

PASS_LINE "T2 重复注册同邮箱 (期望 409 EMAIL_TAKEN, 修 #3)"
HC=$(curl -sS -o /tmp/ra2.json -w "%{http_code}" -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"pass1234\",\"displayName\":\"dup\"}")
CODE=$(PYERR /tmp/ra2.json 2>/dev/null || echo "")
echo "  HTTP=$HC code=$CODE"
[ "$HC" = "409" ] && [ "$CODE" = "EMAIL_TAKEN" ] && OK "EMAIL_TAKEN 409" || FAIL "邮箱冲突未归一化"

PASS_LINE "T3 拿一本书 id (用 A token, 期望 200)"
curl -sS -o /tmp/list.json -w "HTTP=%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" "$BASE/api/books"
BID=$(python3 -c "import json; d=json.load(open('/tmp/list.json')); print(d['data']['items'][0]['id'])" 2>/dev/null)
echo "  first book id=$BID"

PASS_LINE "T4 borrow (期望 200, status=BORROWED, 修 #2 原子 updateMany)"
HC=$(curl -sS -o /tmp/br.json -w "%{http_code}" -X POST "$BASE/api/books/$BID/borrow" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"borrowerName":"烟测人","borrowerPhone":"13900000000","dueAt":"2026-12-31T00:00:00Z"}')
ST=$(python3 -c "import json; d=json.load(open('/tmp/br.json')); print(d.get('data',{}).get('status',''))" 2>/dev/null)
echo "  HTTP=$HC status=$ST"
[ "$HC" = "200" ] && [ "$ST" = "BORROWED" ] && OK "borrow 原子成功" || FAIL "borrow 失败"

PASS_LINE "T5 return (期望 200, status=AVAILABLE, 修 #2)"
HC=$(curl -sS -o /tmp/rr.json -w "%{http_code}" -X POST "$BASE/api/books/$BID/return" \
  -H "Authorization: Bearer $TOKEN")
ST=$(python3 -c "import json; d=json.load(open('/tmp/rr.json')); print(d.get('data',{}).get('status',''))" 2>/dev/null)
echo "  HTTP=$HC status=$ST"
[ "$HC" = "200" ] && [ "$ST" = "AVAILABLE" ] && OK "return 原子成功" || FAIL "return 失败"

PASS_LINE "T6 login 限流头 (期望含 RateLimit-*, 修 #5)"
RH_FILE=/tmp/login_h.txt
curl -sS -D "$RH_FILE" -o /dev/null -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"pass1234\"}"
echo "  headers:"
grep -iE "ratelimit-|http/" "$RH_FILE" | sed 's/^/    /'

PASS_LINE "T7 login 限流触发 (6 次错误密码, 期望 5×401 + 1×429, 修 #5)"
declare -a CODES=()
for i in 1 2 3 4 5 6; do
  HC=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"wrongpwd-$i\"}")
  CODES+=("$HC")
  echo "  attempt $i: HTTP $HC"
done
# 第 6 次必须 429
[ "${CODES[5]}" = "429" ] && OK "第 6 次 429 触发" || FAIL "限流未触发 (第6次=${CODES[5]})"

echo ""
printf "\033[1;33m=========================\n"
printf "  烟测完成\n"
printf "=========================\033[0m\n"