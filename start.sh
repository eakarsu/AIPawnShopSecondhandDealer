#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

[[ -f .env ]] || { echo 'Missing .env; configure it before starting.' >&2; exit 1; }
set -a
source .env
set +a

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${BACKEND_PORT:?BACKEND_PORT is required}"
: "${FRONTEND_PORT:?FRONTEND_PORT is required}"
[[ "${ALLOW_SCHEMA_MIGRATION:-}" == "true" ]] || { echo 'ALLOW_SCHEMA_MIGRATION=true is required for additive runtime preparation.' >&2; exit 1; }

for dependency_dir in server/node_modules client/node_modules; do
  [[ -d "$dependency_dir" ]] || { echo "Missing $dependency_dir; install dependencies explicitly." >&2; exit 1; }
done

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use." >&2
    exit 1
  fi
done

(cd server && node scripts/prepareRuntime.js)

API_PID=
UI_PID=
cleanup() {
  local status=$?
  trap - EXIT INT TERM
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "${UI_PID:-}" ]] && kill "$UI_PID" 2>/dev/null || true
  [[ -n "${API_PID:-}" ]] && wait "$API_PID" 2>/dev/null || true
  [[ -n "${UI_PID:-}" ]] && wait "$UI_PID" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT INT TERM

(cd server && node index.js) &
API_PID=$!
(cd client && npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort) &
UI_PID=$!

while kill -0 "$API_PID" 2>/dev/null && kill -0 "$UI_PID" 2>/dev/null; do
  sleep 1
done

status=0
if ! kill -0 "$API_PID" 2>/dev/null; then
  wait "$API_PID" || status=$?
else
  wait "$UI_PID" || status=$?
fi
exit "$status"
