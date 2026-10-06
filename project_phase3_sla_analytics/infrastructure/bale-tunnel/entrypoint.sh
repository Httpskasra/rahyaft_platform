#!/bin/sh

set -eu

BACKEND_URL="${BACKEND_URL:-http://backend:3000}"
STATE_DIR="${STATE_DIR:-/state}"
URL_FILE="${STATE_DIR}/tunnel-url"
LOG_FILE="${STATE_DIR}/cloudflared.log"

mkdir -p "${STATE_DIR}"

rm -f "${URL_FILE}" "${LOG_FILE}"

echo "Starting Cloudflare Quick Tunnel..."
echo "Backend target: ${BACKEND_URL}"

cloudflared tunnel \
  --no-autoupdate \
  --protocol "${CLOUDFLARED_PROTOCOL:-http2}" \
  --url "${BACKEND_URL}" \
  >"${LOG_FILE}" 2>&1 &

CLOUDFLARED_PID=$!

cleanup() {
  echo "Stopping Cloudflare Tunnel..."

  if kill -0 "${CLOUDFLARED_PID}" 2>/dev/null; then
    kill "${CLOUDFLARED_PID}"
    wait "${CLOUDFLARED_PID}" || true
  fi
}

trap cleanup INT TERM EXIT

echo "Waiting for public Tunnel URL..."

ATTEMPT=0
MAX_ATTEMPTS="${TUNNEL_STARTUP_ATTEMPTS:-60}"

while [ "${ATTEMPT}" -lt "${MAX_ATTEMPTS}" ]; do
  if ! kill -0 "${CLOUDFLARED_PID}" 2>/dev/null; then
    echo "Cloudflared exited unexpectedly."
    cat "${LOG_FILE}"
    exit 1
  fi

  TUNNEL_URL="$(
    grep -o 'https://[-a-zA-Z0-9.]*\.trycloudflare\.com' "${LOG_FILE}" \
      | tail -n 1 \
      || true
  )"

  if [ -n "${TUNNEL_URL}" ]; then
    printf '%s' "${TUNNEL_URL}" > "${URL_FILE}"

    echo
    echo "Cloudflare Tunnel is ready:"
    echo "${TUNNEL_URL}"
    echo

    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  sleep 2
done

if [ ! -s "${URL_FILE}" ]; then
  echo "Tunnel URL was not generated."
  cat "${LOG_FILE}"
  exit 1
fi

wait "${CLOUDFLARED_PID}"