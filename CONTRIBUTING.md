# Contributing to bSmart Works

## Start here
1. Read [`CLAUDE.md`](CLAUDE.md) — the canonical rules (every AI tool reads it too).
2. Read [`docs/ENGINEERING-PRINCIPLES.md`](docs/ENGINEERING-PRINCIPLES.md) — the *why*.

## One-time setup
```bash
npm install                    # repo root — installs husky git hooks
cd works-frontend && npm ci    # frontend deps (lets the pre-commit hook lint)
cd ../works-backend && ./mvnw verify   # backend build + tests + checkstyle
```

## Daily loop
- **Frontend:** `cd works-frontend && npm run dev`
- **Backend:** `cd works-backend && ./mvnw spring-boot:run`
- **Before committing:** the pre-commit hook runs guardrails, regenerates the AI-rules files
  from `CLAUDE.md` (auto-staged), and lints your staged frontend files. To run the checks
  manually: `npm run verify`.

## Editing the rules
[`CLAUDE.md`](CLAUDE.md) is the single source of truth; the AI-tool rules files are **generated**
from it. To change a rule, **just edit `CLAUDE.md` and commit** — the pre-commit hook regenerates
and stages `.github/copilot-instructions.md`, `.cursor/rules/bsmart.mdc`, `.windsurfrules`, and
`AGENTS.md` for you. (To regenerate by hand: `npm run ai-rules`.) Never hand-edit the generated
files — your changes will be overwritten.

## Definition of Done
Every PR must satisfy the checklist in [`CLAUDE.md` §7](CLAUDE.md) — also reproduced in the
[PR template](.github/pull_request_template.md). CI enforces most of it automatically.

## Where things live
| Path | What |
|------|------|
| `works-backend/` | Java 21 + Spring Boot 4 + PostgreSQL + Flyway |
| `works-frontend/` | React 19 + Vite + Tailwind |
| `docs/specifications/` | Product specs (capability map, iteration guide, tech stack) |
| `docs/brand/` | Brand & identity |
| `scripts/` | `guardrails.sh`, `generate-ai-rules.mjs` |
| `.github/workflows/ci.yml` | The merge gate |
