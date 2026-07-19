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

# Package rename complete (TD-001): all code must use com.bcits.works; no com.example.demo allowed.
if [ -d "$BE" ]; then
  check BLOCK "No com.example.demo package declarations (renamed to com.bcits.works — TD-001)" \
    "$(grep -RIn '^package com\.example\.demo' "$BE" 2>/dev/null || true)"
fi

# RBAC must not be enforced in controllers (belongs in the service layer).
if [ -d "$BE" ]; then
  check BLOCK "No RBAC annotations in controllers (enforce in RbacService — CLAUDE.md §3)" \
    "$(find "$BE" -type f -name '*Controller.java' -exec grep -HnE '@PreAuthorize|@Secured|hasRole\(' {} + 2>/dev/null || true)"
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

# New tables must be PLURAL (CLAUDE.md §3 / §6). Every non-plural name below is historical — the
# V21/V22 singular tables, the core role_audit_log, and the dropped event_log — and is
# grandfathered. Any NEW CREATE TABLE that isn't plural is a violation. If you ever introduce a
# legitimately non-"s" plural (e.g. "media"), add it to this allowlist with a note.
if [ -d "$MIG" ]; then
  grandfathered='^(action_item|assumption|decision|dependency|event_log|field_def|field_layout|field_visibility|lesson_learned|meeting|meeting_note|permission_scheme|pm_issue|risk|role_audit_log|role_def|role_permission|stakeholder|bql_filter|work_item_field_value|work_item_type_config|workflow|workflow_transition)$'
  singular=""
  while IFS= read -r t; do
    [ -z "$t" ] && continue
    case "$t" in *s) continue ;; esac                  # plural — ok
    echo "$t" | grep -qE "$grandfathered" && continue  # historical — grandfathered
    singular="${singular:+$singular$'\n'}$t"
  done < <(grep -rhiE '^[[:space:]]*create table' "$MIG" 2>/dev/null \
            | tr 'A-Z' 'a-z' \
            | sed -E 's/^[[:space:]]*create table (if not exists )?//; s/[[:space:](].*$//' \
            | sort -u)
  check BLOCK "New tables must be PLURAL (CLAUDE.md §3; legacy singular tables grandfathered)" "$singular"
fi

# Backend: System.out.println is banned — use SLF4J Logger. Currently zero usages; keep clean.
if [ -d "$BE" ]; then
  check BLOCK "No System.out.println in backend (use SLF4J — CLAUDE.md §2)" \
    "$(grep -RIn 'System\.out\.print' "$BE" 2>/dev/null || true)"
fi

# @Transactional belongs in the service layer, not controllers (CLAUDE.md §3).
if [ -d "$BE" ]; then
  check BLOCK "No @Transactional in controllers (belongs in service layer — CLAUDE.md §3)" \
    "$(find "$BE" -type f -name '*Controller.java' -exec grep -HnE '@Transactional' {} + 2>/dev/null || true)"
fi

# No raw identity PII into the append-only event log or immutable audit chain (RB-40 §3 rule 1,
# EPIC-P1-pii-vault Slice 4d). A getFullName()/getEmail() must never be an argument to an
# EventService.record*/recordDiff or an audit-log record() call: PII is tokenized into the per-subject
# vault and resolved at render, so the immutable log carries only ids/tokens (crypto-shred cannot reach
# it). Same-line tripwire — the structural backstop is ArchitectureTest (event/audit layer ⊥ PII
# entities). Currently clean (Slices 1/2 + 4a); keep it clean.
if [ -d "$BE" ]; then
  check BLOCK "No raw PII (getFullName/getEmail) in event/audit writes (RB-40 §3 rule 1)" \
    "$(grep -RInE '\.(record|recordDiff|recordInWorkspace)[[:space:]]*\(.*\.get(FullName|Email)\(\)' "$BE" 2>/dev/null || true)"
fi

# Every @Query that issues a SELECT in a Repository must reference workspace scope (RB-40 §1).
# Safe tokens: workspace_id, workspace_members, workspaceId, callerId.
# Scans up to 8 lines per @Query block so multi-line annotations are covered.
# findById / findBy* derived methods have no @Query annotation and are not checked here;
# callers must ensure their inputs (e.g. project_id) are pre-validated to the tenant.
if [ -d "$BE" ]; then
  _unscoped=""
  while IFS= read -r _f; do
    while IFS= read -r _lnum; do
      _block=$(sed -n "${_lnum},$((${_lnum} + 7))p" "$_f" 2>/dev/null | tr '\n' ' ')
      if echo "$_block" | grep -qiE '\bSELECT\b'; then
        if ! echo "$_block" | grep -qiE '(workspace_id|workspace_members|workspaceId|callerId|caller_id)'; then
          _unscoped="${_unscoped:+${_unscoped}$'\n'}${_f}:${_lnum}"
        fi
      fi
    done < <(grep -n '@Query' "$_f" 2>/dev/null | grep -oE '^[0-9]+')
  done < <(find "$BE" -name '*Repository.java' 2>/dev/null)
  check BLOCK "Repository @Query SELECT must reference workspace scope (RB-40 §1)" "$_unscoped"
  unset _unscoped _f _lnum _block
fi

# Raw JdbcTemplate SQL over work_items in a Controller/Service must carry a tenant-scope signal
# (RB-40 §1). This is the neighbour of the @Query check above, for the *other* place tenant leaks
# hide: hand-written JdbcTemplate SQL in the controller/service layer (the shape of the leaks fixed
# in AggregationController + BqlController). It is a TRIPWIRE, not the real fix.
#
# Why this is deliberately COARSE (file-level) and a WARN, not a BLOCK:
#   The precise, leak-proof enforcement is a central Hibernate tenant filter / mandatory predicate
#   applied once (RB-40 §1: "scoping applied centrally, not re-typed per query") — a separate,
#   sign-off-gated architectural task (issue #243), OUT OF SCOPE here. A per-SQL-statement grep was
#   investigated and REJECTED (see docs/INSIGHTS-AI-ALIGNMENT-REVIEW.md §1.2): the workspace
#   predicate is almost always built into a `where`/`scope` variable on adjacent lines, or the row
#   is fetched by a pre-validated id (`WHERE id = ?`), so a line-level rule false-positives on the
#   legitimate id-scoped+RBAC pattern (SprintController, ReleaseController, WorkLogController,
#   StatusDurationService, WidgetDataService, DashboardService, …). So we scope to the file:
#   we only flag a Controller/Service that queries work_items via JdbcTemplate yet references
#   NONE of the tenant-scope signals ANYWHERE in the file — no workspace token, no id-scope key,
#   and no RbacService/workspaceFor/require() call. On the current tree this is zero files (verified),
#   so it adds no noise; it fires only when a brand-new raw-SQL surface ships with no scope signal
#   at all (the exact regression we want to catch early). Kept as WARN because the file-level
#   exemption is intentionally generous (an unrelated rbac.* elsewhere in the file silences it) —
#   the real guarantee is the central filter in #243, not this grep.
if [ -d "$BE" ]; then
  _ws='workspace_id|workspace_members|workspaceId'
  _idscope='project_id|sprint_id|release_id|work_item_id|parent_id|aggregate_id|[^a-zA-Z_]id *= *\?'
  _rbac='rbac\.|RbacService|workspaceFor|\.require\('
  _rawleak=""
  while IFS= read -r _f; do
    grep -qE 'FROM work_items' "$_f" 2>/dev/null || continue   # raw SQL over the table
    grep -qE '\bjdbc' "$_f" 2>/dev/null || continue            # via JdbcTemplate (not JPQL/@Query)
    grep -qiE "$_ws" "$_f" 2>/dev/null && continue             # has a workspace token — scoped
    grep -qiE "$_idscope" "$_f" 2>/dev/null && continue        # has an id-scope key — narrowed
    grep -qE "$_rbac" "$_f" 2>/dev/null && continue            # resolves/checks tenant via RBAC
    _rawleak="${_rawleak:+${_rawleak}$'\n'}${_f}"
  done < <(find "$BE" \( -name '*Controller.java' -o -name '*Service.java' \) 2>/dev/null)
  check WARN "Raw JdbcTemplate work_items SQL must carry a tenant-scope signal (RB-40 §1; central filter is #243)" "$_rawleak"
  unset _ws _idscope _rbac _rawleak _f
fi

# Native JPQL/SQL queries must use bind parameters, never string concatenation (CLAUDE.md §17).
# Targets strings that contain SQL keywords AND are concatenated with a variable — not general
# Java string building (error messages, rate-limiter keys, URL construction etc.).
# Use \b word boundaries so "param" does not match "params", "id" does not match "idx" etc.
if [ -d "$BE" ]; then
  check WARN "No string-concatenated queries (use bind parameters — CLAUDE.md §17)" \
    "$(grep -RInE '"[^"]*(SELECT|INSERT|UPDATE|DELETE|FROM\s|WHERE\s|JOIN\s|LIKE\s)[^"]*"\s*\+\s*\b(userId|id|name|title|email|input|param|value)\b' "$BE" 2>/dev/null || true)"
fi

# ── Frontend architecture and design-system rules ─────────────────────────────

# Raw hex colours in component JSX (the global index.css token defs and test files are exempt).
check BLOCK "No raw hex in frontend components (use brand-*/neutral-* tokens — CLAUDE.md §4)" \
  "$(grep -RInE '#[0-9a-fA-F]{3,8}\b' "$FE" 2>/dev/null \
     | grep -vE '(tailwind\.config|tokens|/index\.css:|\.svg|\.test\.)' || true)"

# Arbitrary pixel/rem spacing in className (use the 4px scale).
check BLOCK "No arbitrary spacing values (use Tailwind 4px scale — CLAUDE.md §4)" \
  "$(grep -RInE '\b[pmgw]+-\[[0-9]+(px|rem)\]' "$FE" 2>/dev/null || true)"

# Inline fetch()/axios in components (use the apiClient wrapper).
check WARN "No inline fetch/axios in components (use apiClient — CLAUDE.md §3)" \
  "$(grep -RInE '\bfetch\(|from .axios.' "$FE" 2>/dev/null \
     | grep -viE 'apiClient|api-client' || true)"

# Arbitrary z-index — use the named stacking tokens (z-sticky/z-panel/z-modal/z-toast …) so
# layers can't fight. See CLAUDE.md §4.21 and the zIndex scale in tailwind.config.js.
check BLOCK "No arbitrary z-index (use z-index tokens — CLAUDE.md §4.21)" \
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
