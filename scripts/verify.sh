#!/usr/bin/env bash
# bSmart Works — Definition of Done gate (ai-rules/00-ORCHESTRATOR.md §4).
# Run this before calling any task complete. All commands must pass.
#
# Usage:
#   bash scripts/verify.sh             # run all gates
#   bash scripts/verify.sh --fast      # skip backend (no JVM startup needed for frontend-only changes)
#   bash scripts/verify.sh --frontend  # frontend gates only
#   bash scripts/verify.sh --backend   # backend gates only
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

FAST=0; FRONTEND_ONLY=0; BACKEND_ONLY=0
for arg in "${@:-}"; do
  case "$arg" in
    --fast)      FAST=1 ;;
    --frontend)  FRONTEND_ONLY=1 ;;
    --backend)   BACKEND_ONLY=1 ;;
  esac
done

pass=0; fail=0

run() {
  local label="$1"; shift
  printf '\n\033[1;34m▶ %s\033[0m\n' "$label"
  if "$@"; then
    printf '\033[32m✓ %s passed\033[0m\n' "$label"
    pass=$((pass + 1))
  else
    printf '\033[31m✗ %s FAILED\033[0m\n' "$label"
    fail=$((fail + 1))
  fi
}

# ── Architecture & brand guardrails ────────────────────────────────────────────
if [ "$BACKEND_ONLY" = "0" ]; then
  run "Guardrails (blocking rules)"   bash scripts/guardrails.sh
fi

# ── CLAUDE.md derived files in sync ────────────────────────────────────────────
if [ "$BACKEND_ONLY" = "0" ] && [ "$FRONTEND_ONLY" = "0" ]; then
  run "AI rules in sync"              node scripts/generate-ai-rules.mjs --check
  run "Task execution contract"       node scripts/check-task-execution-contract.mjs
  run "DoD version in sync"           bash scripts/check-dod-sync.sh
fi

# ── Frontend gates ──────────────────────────────────────────────────────────────
if [ "$BACKEND_ONLY" = "0" ]; then
  run "Frontend lint"    sh -c 'cd works-frontend && npm run lint'
  run "Frontend tests"   sh -c 'cd works-frontend && npm test'
  run "Frontend build"   sh -c 'cd works-frontend && npm run build'
fi

# ── Backend gates ───────────────────────────────────────────────────────────────
if [ "$FRONTEND_ONLY" = "0" ] && [ "$FAST" = "0" ]; then
  run "Backend unit tests + coverage" sh -c 'cd works-backend && ./mvnw -B -Dgroups=unit verify -q'
fi

# ── Summary ─────────────────────────────────────────────────────────────────────
echo
if [ "$fail" -eq 0 ]; then
  printf '\033[32m✓ All %d gate(s) passed — task is done.\033[0m\n' "$pass"
  exit 0
else
  printf '\033[31m✗ %d gate(s) failed. Fix the items above before marking the task done.\033[0m\n' "$fail"
  exit 1
fi
