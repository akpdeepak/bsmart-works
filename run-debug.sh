#!/usr/bin/env bash
# Self-contained local E2E backstop: ephemeral Postgres + backend + Vite + Playwright.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
E2E_TMP=$(mktemp -d)
DB_CONTAINER="bsmart-e2e-${RANDOM}-$$"
BACKEND_PID=''
FRONTEND_PID=''

free_port() {
  node -e "const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"
}

cleanup() {
  if [ -n "$FRONTEND_PID" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
  if [ -n "$BACKEND_PID" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  docker stop "$DB_CONTAINER" >/dev/null 2>&1 || true
  rm -rf -- "$E2E_TMP"
}
trap cleanup EXIT

DB_PORT=$(free_port)
API_PORT=$(free_port)
WEB_PORT=$(free_port)

echo 'E2E: starting ephemeral PostgreSQL'
docker run --detach --rm --name "$DB_CONTAINER" \
  -e POSTGRES_DB=works_db \
  -e POSTGRES_USER=bcits_admin \
  -e POSTGRES_PASSWORD=works_secure_pass \
  -p "127.0.0.1:${DB_PORT}:5432" postgres:16-alpine >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$DB_CONTAINER" pg_isready -U bcits_admin -d works_db >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$DB_CONTAINER" pg_isready -U bcits_admin -d works_db >/dev/null

cd "$ROOT/works-backend"
echo 'E2E: packaging backend'
./mvnw -B -DskipTests -Djacoco.skip=true package >/dev/null
JAR=$(find target -maxdepth 1 -name '*.jar' ! -name '*.original' | head -n 1)
BSMART_DB_URL="jdbc:postgresql://127.0.0.1:${DB_PORT}/works_db" \
BSMART_DB_USERNAME=bcits_admin BSMART_DB_PASSWORD=works_secure_pass \
  java -jar "$JAR" --server.port="$API_PORT" --app.attachments.virus-scan-enabled=false \
  >"$E2E_TMP/backend.log" 2>&1 &
BACKEND_PID=$!

echo 'E2E: waiting for backend migrations and startup'
for _ in $(seq 1 120); do
  if grep -qE 'Started .* in .* seconds' "$E2E_TMP/backend.log"; then break; fi
  if grep -qE 'APPLICATION FAILED TO START|FlywayException|Error creating bean' "$E2E_TMP/backend.log"; then
    tail -120 "$E2E_TMP/backend.log"; exit 1
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then tail -120 "$E2E_TMP/backend.log"; exit 1; fi
  sleep 1
done
grep -qE 'Started .* in .* seconds' "$E2E_TMP/backend.log" || { tail -120 "$E2E_TMP/backend.log"; exit 1; }

echo 'E2E: provisioning isolated test credentials'
curl -fsS -X POST "http://127.0.0.1:${API_PORT}/api/v1/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"email":"e2e-seed@e2e.test","password":"E2ePass123!","fullName":"E2E Seed"}' >/dev/null
docker exec "$DB_CONTAINER" psql -U bcits_admin -d works_db -v ON_ERROR_STOP=1 -c \
  "UPDATE users SET password_hash=(SELECT password_hash FROM users WHERE email='e2e-seed@e2e.test'), email_verified=true WHERE email='deepak@bcits.com';" >/dev/null

cd "$ROOT/works-frontend"
echo 'E2E: starting Vite'
VITE_API_BASE_URL=/api/v1 VITE_PROXY_TARGET="http://127.0.0.1:${API_PORT}" \
  npm run dev -- --host 127.0.0.1 --port "$WEB_PORT" >"$E2E_TMP/frontend.log" 2>&1 &
FRONTEND_PID=$!
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then cat "$E2E_TMP/frontend.log"; exit 1; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:${WEB_PORT}" >/dev/null

echo 'E2E: running Playwright'
E2E_BASE_URL="http://127.0.0.1:${WEB_PORT}" \
E2E_API_URL="http://127.0.0.1:${API_PORT}/api/v1" \
E2E_EMAIL=deepak@bcits.com E2E_PASSWORD='E2ePass123!' npx playwright test get_headings.spec.js
