#!/usr/bin/env bash
# scripts/smoke-test.sh
# Phase T1 スモークテスト — curl で全URLを叩いてHTTPステータスを検証
#
# 使い方:
#   BASE_URL=http://localhost:3000 bash scripts/smoke-test.sh
#   BASE_URL=http://localhost:3000 bash scripts/smoke-test.sh > result.txt

set -u
BASE_URL="${BASE_URL:-http://localhost:3000}"

PASS=0
FAIL=0
FAILED_CASES=()

check() {
  local id="$1"
  local expected="$2"
  local method="$3"
  local path="$4"
  shift 4
  local extra=("$@")

  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" ${extra[@]+"${extra[@]}"} "$BASE_URL$path")

  if [[ "$actual" == "$expected" ]]; then
    printf "  ✅ %-5s %-6s %-50s  %s (expected %s)\n" "$id" "$method" "$path" "$actual" "$expected"
    PASS=$((PASS+1))
  else
    printf "  ❌ %-5s %-6s %-50s  %s (expected %s)\n" "$id" "$method" "$path" "$actual" "$expected"
    FAIL=$((FAIL+1))
    FAILED_CASES+=("$id $method $path → $actual (expected $expected)")
  fi
}

# ──────────────────────────────────────────────────────────
# 1. 公開ページ（Server Components）
# ──────────────────────────────────────────────────────────
echo "── [1] Public Pages ──────────────────────────────────────"
check P1  200 GET "/"
check P2  200 GET "/learn"
check P3a 200 GET "/learn?page=2"
check P3b 200 GET "/learn?cat=education&level=beginner"
check P3c 200 GET "/learn?cat=work&sort=popular"
check P3d 200 GET "/learn?search=AI&cat=creative"
check P3e 200 GET "/learn?sort=popular&cat=lifestyle"
check P4a 200 GET "/learn?cat=creative"
check P4b 200 GET "/learn?cat=work&cat=education"
check P4c 200 GET "/learn?cat=education"
check P4d 200 GET "/learn?cat=lifestyle"
check P5  200 GET "/learn?search=AI"
check P6  200 GET "/learn?search=%25"     # ILIKE escape
check P7  200 GET "/learn/english-learning-voice-ai"
check P8  200 GET "/about"
check P9  200 GET "/privacy"
check P10 200 GET "/terms"
check P11 200 GET "/auth/signin"
check P12 404 GET "/this-does-not-exist-xyz"

# ──────────────────────────────────────────────────────────
# 2. 公開API
# ──────────────────────────────────────────────────────────
echo ""
echo "── [2] Public API ────────────────────────────────────────"
check F1  200 GET "/api/articles"
check F2  200 GET "/api/articles?cat=education"
check F3  200 GET "/api/articles?cat=work&cat=creative"
check F4  200 GET "/api/articles?search=AI"
check F5  200 GET "/api/articles?search=%25"   # ILIKE escape
check F6  200 GET "/api/articles/english-learning-voice-ai"
check F7  404 GET "/api/articles/nonexistent-slug-xyz"

# ──────────────────────────────────────────────────────────
# 3. 管理者API（未認証）
# ──────────────────────────────────────────────────────────
echo ""
echo "── [3] Admin API (no auth) ───────────────────────────────"
check G1  403 GET    "/api/admin/articles"   # requireAdmin()は未認証/非管理者共に 403
check G2  403 POST   "/api/admin/articles" -H "content-type: application/json" --data '{}'
check G3  403 PUT    "/api/admin/articles/x" -H "content-type: application/json" --data '{}'
check G4  403 DELETE "/api/admin/articles/x"
check G5  403 PATCH  "/api/admin/articles/x/toggle"

# ──────────────────────────────────────────────────────────
# 4. 管理者API（CSRF違反 = 異Origin）
# ──────────────────────────────────────────────────────────
echo ""
echo "── [4] Admin API (CSRF violation) ────────────────────────"
check CS1 403 POST   "/api/admin/articles" -H "content-type: application/json" -H "origin: https://evil.example.com" --data '{}'

# ──────────────────────────────────────────────────────────
# 5. 認証API
# ──────────────────────────────────────────────────────────
echo ""
echo "── [5] Auth API ──────────────────────────────────────────"
check AU1 200 GET "/api/auth/session"
check AU2 200 GET "/api/auth/providers"
check AU3 200 GET "/api/auth/csrf"

# ──────────────────────────────────────────────────────────
# 6. その他
# ──────────────────────────────────────────────────────────
echo ""
echo "── [6] Misc ──────────────────────────────────────────────"
check M1  200 GET "/sitemap.xml"
check M2  200 GET "/robots.txt"

# ──────────────────────────────────────────────────────────
# サマリ
# ──────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
echo ""
echo "═════════════════════════════════════════════════════════"
echo " 合計: $TOTAL 件  /  成功: $PASS  /  失敗: $FAIL"
echo "═════════════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "失敗ケース:"
  for c in "${FAILED_CASES[@]}"; do
    echo "  - $c"
  done
  exit 1
fi

exit 0
