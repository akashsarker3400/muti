#!/usr/bin/env bash
# Starts the production server on a known-free port 3000.
#
# `pkill next` does not always release the port (npm wrappers, orphaned
# workers), and a stale listener silently serves the *previous* build — which
# is easy to mistake for a code change not working.
set -euo pipefail

PORT="${PORT:-3000}"
LOG="${LOG:-/tmp/muti-prod.log}"

if pid=$(lsof -ti "TCP:${PORT}" -sTCP:LISTEN 2>/dev/null); then
  echo "==> Port ${PORT} held by pid ${pid}; stopping it"
  kill -9 ${pid} 2>/dev/null || true
  sleep 1
fi

npm start >"${LOG}" 2>&1 &
echo $! > /tmp/muti-prod.pid

for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://localhost:${PORT}/api/health"; then
    echo "==> Serving http://localhost:${PORT}"
    exit 0
  fi
  sleep 1
done

echo "==> Server did not become healthy; last log lines:" >&2
tail -20 "${LOG}" >&2
exit 1
