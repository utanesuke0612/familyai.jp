#!/usr/bin/env bash
# Local-only workaround for Google Fonts CDN flake during pnpm build.
# Each successful font subset is cached in node_modules/next/dist/.cache/...,
# so retrying the build picks up where the previous run left off.
# Stops on first success.

set -u
MAX_RETRIES=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_RETRIES ]; do
  echo "═══ pnpm build attempt $ATTEMPT/$MAX_RETRIES ═══"
  if DATABASE_URL="${DATABASE_URL:-postgres://dummy:dummy@localhost:5432/dummy}" \
     NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-dummy-secret-for-build-only}" \
     NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}" \
     pnpm build; then
    echo "✓ build succeeded on attempt $ATTEMPT"
    exit 0
  fi
  ATTEMPT=$((ATTEMPT + 1))
  sleep 3
done

echo "✗ build failed after $MAX_RETRIES attempts — investigate network or font config"
exit 1
