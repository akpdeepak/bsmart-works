#!/usr/bin/env bash
# bSmart Works — architecture & brand guardrails.
# Project-specific checks that ESLint/Checkstyle can't easily express.
# Runs in pre-commit and CI. Each check maps to a rule in CLAUDE.md.
#
# Two tiers, because the current baseline has known debt (the App.jsx monolith):
#   BLOCK rules  — currently clean; a violation fails the build (exit 1).
#   WARN  rules  — pre-existing baseline debt; reported but non-blocking for now.
#                  Remediate the baseline, then run with --strict to make them BLOCK.
#
# Usage:
#   bash scripts/guardrails.sh            # BLOCK rules fail; WARN rules report only
#   bash scripts/guardrails.sh --strict   # everything is blocking (target state)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1

FE="works-frontend/src"
BE="works-backend/src/main/java"
MIG="works-backend/src/main/resources/db/migration"
block_fail=0
warn_count=0

red()    { printf '\033[31m✗ %s\033[0m\n' "$1"; }
green()  { printf '\033[32m✓ %s\033[0m\n' "$1"; }
yellow() { printf '\033[33m! %s\033[0m\n' "$1"; }

# check <tier BLOCK|WARN> <name> <matches>
check() {
  local tier="$1" name="$2" matches="$3"
  if [ -z "$matches" ]; then
    green "$name"
    return
  fi
  if [ "$tier" = "BLOCK" ] || [ "$STRICT" = "1" ]; then
    red "$name"; echo "$matches" | sed 's/^/    /'; block_fail=1
  else
    yellow "$name  (baseline debt — non-blocking; fix then run with --strict)"
    echo "$matches" | head -5 | sed 's/^/    /'
    local n; n=$(echo "$matches" | grep -c .)
    [ "$n" -gt 5 ] && echo "    … and $((n - 5)) more"
    warn_count=$((warn_count + 1))
  fi
}

# ── BLOCK rules (currently clean — keep them clean) ────────────────────────────

# Wrong token namespace: works-navy / works-orange (these classes do not exist).
check BLOCK "No works-* token names (use brand-navy/brand-orange — CLAUDE.md §4)" \
  "$(grep -RInE '\bworks-(navy|orange|blue|amber|teal)\b' "$FE" 2>/dev/null || true)"

# Tailwind's default gray-* palette is not ours — the token set is neutral-* (CLAUDE.md §4.2).
# Currently zero usages; keep it that way.
check BLOCK "No Tailwind gray-* classes (use neutral-* tokens — CLAUDE.md §4.2)" \
  "$(grep -RInE '\b(bg|text|border|ring|ring-offset|from|to|via|divide|fill|stroke|placeholder|outline|decoration|shadow|accent|caret)-gray-[0-9]' "$FE" 2>/dev/null || true)"

# New code must stay in com.example.demo until a rename is scheduled.
if [ -d "$BE" ]; then
  check BLOCK "No new com.bcits.works.* packages yet (match com.example.demo — CLAUDE.md §3)" \
    "$(grep -RIn '^package com\.bcits\.works' "$BE" 2>/dev/null || true)"
fi

# RBAC must not be enforced in controllers (belongs in the service layer).
if [ -d "$BE" ]; then
  check BLOCK "No RBAC annotations in controllers (enforce in RbacService — CLAUDE.md §3)" \
    "$(grep -RInE '@PreAuthorize|@Secured|hasRole\(' "$BE"/*Controller.java 2>/dev/null || true)"
fi

# Flyway files must be V{n}__snake_case.sql (basename check — portable across macOS/Linux).
if [ -d "$MIG" ]; then
  bad=""
  while IFS= read -r f; do
    b=$(basename "$f")
    echo "$b" | grep -qE '^V[0-9]+__[a-z0-9_]+\.sql$' || bad="${bad:+$bad$'\n'}$f"
  done < <(find "$MIG" -name '*.sql' 2>/dev/null)
  check BLOCK "Flyway files follow V{n}__snake_case.sql (CLAUDE.md §3)" "$bad"
fi

# Backend: System.out.println is banned — use SLF4J Logger. Currently zero usages; keep clean.
if [ -d "$BE" ]; then
  check BLOCK "No System.out.println in backend (use SLF4J — CLAUDE.md §2)" \
    "$(grep -RIn 'System\.out\.print' "$BE" 2>/dev/null || true)"
fi

# ── WARN rules (baseline debt in App.jsx — flip to BLOCK after remediation) ─────

# Raw hex colours in component JSX (the global index.css token defs are exempt).
check WARN "No raw hex in frontend components (use brand-*/neutral-* tokens — CLAUDE.md §4)" \
  "$(grep -RInE '#[0-9a-fA-F]{3,8}\b' "$FE" 2>/dev/null \
     | grep -vE '(tailwind\.config|tokens|/index\.css:|\.svg)' || true)"

# Arbitrary pixel/rem spacing in className (use the 4px scale).
check WARN "No arbitrary spacing values (use Tailwind 4px scale — CLAUDE.md §4)" \
  "$(grep -RInE '\b[pmgw]+-\[[0-9]+(px|rem)\]' "$FE" 2>/dev/null || true)"

# Inline fetch()/axios in components (use the apiClient wrapper).
check WARN "No inline fetch/axios in components (use apiClient — CLAUDE.md §3)" \
  "$(grep -RInE '\bfetch\(|from .axios.' "$FE" 2>/dev/null \
     | grep -viE 'apiClient|api-client' || true)"

# Arbitrary z-index — use the named stacking tokens (z-sticky/z-panel/z-modal/z-toast …) so
# layers can't fight. See CLAUDE.md §4.21 and the zIndex scale in tailwind.config.js.
check WARN "No arbitrary z-index (use z-index tokens — CLAUDE.md §4.21)" \
  "$(grep -RInE '\bz-\[[0-9]+\]' "$FE" 2>/dev/null || true)"

# NOTE: contrast (CLAUDE.md §4.17) is intentionally NOT grep-enforced here. `text-neutral-400`
# is a legitimate token for placeholders/disabled/icons, so a blanket grep can't tell those
# apart from misuse as body text. That check lives in eslint-plugin-jsx-a11y + code review.

echo
if [ "$block_fail" -ne 0 ]; then
  red "Guardrails failed (blocking rules). Fix the items above, or update CLAUDE.md if the rule changed."
  exit 1
fi
if [ "$warn_count" -gt 0 ]; then
  yellow "$warn_count baseline-debt rule(s) reported. Blocking rules passed."
  yellow "Remediate the debt (extract apiClient, tokenize colours) then enforce with: scripts/guardrails.sh --strict"
else
  green "All guardrails passed."
fi
exit 0
