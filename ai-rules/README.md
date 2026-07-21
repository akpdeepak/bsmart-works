# bSmart Works AI rules

This directory is the canonical policy source for human and AI contributors.

| File | Purpose |
|---|---|
| `AGENT-CORE.md` | compact always-on task contract |
| `00-ORCHESTRATOR.md` | routing and control index |
| `SOURCE-OF-TRUTH.md` | authority and conflict-resolution policy |
| `policy-registry.json` | stable policy IDs and truthful enforcement classes |
| `current-state.generated.json` | reproducible executable-state projection |
| `rulebooks/` | domain detail loaded only when applicable |

Provider-specific files are generated projections. Do not edit `AGENTS.md`, `CLAUDE.md`, nested
agent files, `.agents/rules/`, `.claude/rules/`, `.cursor/rules/`, `.windsurfrules`, or Copilot
instructions directly.

```bash
node scripts/generate-project-state.mjs
node scripts/generate-project-state.mjs --check
node scripts/generate-ai-rules.mjs
node scripts/generate-ai-rules.mjs --check
```

Live task state is not stored here. GitHub `agent-task` issues own scope, acceptance criteria,
validation, leases, reserved paths, and resumable state; linked pull requests own review evidence;
required checks own validation results.
