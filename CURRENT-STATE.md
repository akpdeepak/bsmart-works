---
status: generated-view
authority: executable-repository
generated_by: scripts/generate-project-state.mjs
---

# bSmart Works current state

The machine-readable current-state record is
[`ai-rules/current-state.generated.json`](ai-rules/current-state.generated.json). It is derived from
the Maven POM, frontend package manifest, Java package tree, and Flyway filenames.

Regenerate and verify it with:

```bash
node scripts/generate-project-state.mjs
node scripts/generate-project-state.mjs --check
```

GitHub issues, pull requests, and checks own live delivery status. Historical roadmap narratives do
not override executable repository facts or GitHub task state.
