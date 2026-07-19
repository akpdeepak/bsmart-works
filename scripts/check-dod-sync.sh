#!/usr/bin/env bash
# Verifies that the generated CLAUDE.md copy of Orchestrator §4 matches the PR template.
# Both files carry a comment:  <!-- dod-version: YYYY-MM-DD-rN -->
# When the Orchestrator §4 DoD contract changes, bump the canonical tag and PR-template tag together,
# then regenerate CLAUDE.md from ai-rules/.
# This script runs in pre-commit and CI to prevent silent drift.

set -euo pipefail

CLAUDE_VER=$(grep -o 'dod-version: [^[:space:]<>]*' CLAUDE.md | head -1 | sed 's/dod-version: //')
TEMPLATE_VER=$(grep -o 'dod-version: [^[:space:]<>]*' .github/pull_request_template.md | head -1 | sed 's/dod-version: //')

if [ -z "$CLAUDE_VER" ]; then
  echo "BLOCK: no dod-version tag found in CLAUDE.md" >&2
  exit 1
fi
if [ -z "$TEMPLATE_VER" ]; then
  echo "BLOCK: no dod-version tag found in .github/pull_request_template.md" >&2
  exit 1
fi
if [ "$CLAUDE_VER" != "$TEMPLATE_VER" ]; then
  echo "BLOCK: DoD version mismatch" >&2
  echo "  CLAUDE.md says:   $CLAUDE_VER" >&2
  echo "  PR template says: $TEMPLATE_VER" >&2
  echo "" >&2
  echo "  Update ai-rules/00-ORCHESTRATOR.md §4 and the PR template, bump both tags, then regenerate." >&2
  exit 1
fi

echo "OK: DoD version in sync ($CLAUDE_VER)"
