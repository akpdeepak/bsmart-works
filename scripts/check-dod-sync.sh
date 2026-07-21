#!/usr/bin/env bash
# Compatibility check for the machine-readable PR/policy contract. The old duplicated
# dod-version marker was removed because generated provider files are not policy authorities.
set -euo pipefail

grep -q 'bsmart-pr-evidence' .github/pull_request_template.md || {
  echo 'BLOCK: PR template is missing the bsmart-pr/v1 evidence marker' >&2
  exit 1
}
grep -q 'BSW-TASK-001' ai-rules/policy-registry.json || {
  echo 'BLOCK: policy registry is missing BSW-TASK-001' >&2
  exit 1
}
echo 'OK — PR evidence marker and task policy are present.'
