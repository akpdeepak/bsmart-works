---
status: generated-view
authority: github
generated_by: scripts/generate-roadmap-snapshot.mjs
---

# bSmart Works live roadmap state

This file is a stable pointer, not a manually edited resume ledger. GitHub issues with the
`agent-task` label, their `bsmart-task/v1` state comments, linked pull requests, and required checks
are the live source of delivery truth.

Generate a point-in-time snapshot locally or in the scheduled workflow:

```bash
GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo node scripts/generate-roadmap-snapshot.mjs
```

Snapshots are uploaded as workflow artifacts and written to the workflow summary. Resume work from
the active issue and pull request; do not reconstruct progress from prose completion narratives.
