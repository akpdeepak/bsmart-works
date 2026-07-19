#!/usr/bin/env sh
# Compatibility wrapper. The manifest-driven Node verifier is the single implementation.
set -eu
cd "$(dirname "$0")/.."

profile="changed"
case "${1:-}" in
  --full) profile="full" ;;
  --release) profile="release" ;;
  --fast|--frontend|--backend)
    echo "Legacy verification flags were replaced by changed-path selection." >&2
    ;;
esac
exec node scripts/verify.mjs --profile "$profile"
