#!/usr/bin/env bash
# Verifies that the DoD version tag in CLAUDE.md §7 matches the one in the PR template.
# Both files carry a comment:  <!-- dod-version: YYYY-MM-DD-rN -->
# When §7 checklist is updated, bump the tag in BOTH files together.
# This script runs in pre-commit and CI to prevent silent drift.

set -euo pipefail

CLAUDE_VER=$(grep -oP '(?<=dod-version: )[^\s<>]+' CLAUDE.md | head -1)
TEMPLATE_VER=$(grep -oP '(?<=dod-version: )[^\s<>]+' .github/pull_request_template.md | head -1)

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
  echo "  Update CLAUDE.md §7 and the PR template together, then bump the dod-version tag in both." >&2
  exit 1
fi

echo "OK: DoD version in sync ($CLAUDE_VER)"
