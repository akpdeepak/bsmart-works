<!-- bSmart Works PR — keep this concise. The linked issue owns the full task contract. -->

## Summary

<!-- What changed and why? -->

## Scope

- Task: <!-- GH-123 / #123 -->
- In scope:
- Out of scope:
- Risk lane: <!-- docs | standard | large/risky | release -->

## Validation

<!-- Human-readable summary. Exact AC/test mappings belong in the JSON evidence block below. -->

<!-- bsmart-pr-evidence
{
  "protocol": "bsmart-pr/v1",
  "task": "GH-000",
  "planUrl": "https://github.com/akpdeepak/bsmart-works/issues/000",
  "acceptance": [
    { "id": "AC-1", "evidence": ["TEST-1"] }
  ],
  "validation": [
    { "id": "TEST-1", "command": "replace with exact command", "status": "passed" }
  ],
  "tdd": {
    "applicable": true,
    "red": { "command": "replace", "evidence": "intended failure" },
    "green": { "command": "replace", "evidence": "targeted pass" },
    "finalGreen": { "command": "replace", "evidence": "pass after refactor" }
  }
}
-->

## Review-only decisions

- [ ] Scope matches the linked task; follow-ups are separate.
- [ ] Data model, migration, security, tenant isolation, RBAC, and AI risks have the required decision record/reviewer, or are not applicable.
- [ ] UI evidence is attached for user-visible changes, or is not applicable.
- [ ] The PR is ready only when its required checks and mapped acceptance evidence are green.

## Screenshots or operational evidence

<!-- Add links or N/A. Keep full logs in check artifacts. -->

<!-- dod-version: 2026-07-19-r1 -->
