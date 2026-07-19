# Contributing to bSmart Works

## Before you write a line of code

1. Read [`ai-rules/AGENT-CORE.md`](ai-rules/AGENT-CORE.md), then the applicable rulebook.
2. Open or claim one GitHub `agent-task` issue and use its scope, acceptance criteria, validation map,
   risk, lease, and reserved paths. GitHub—not a historical iteration narrative—owns active work.
3. For code, capture the failing test first, implement the smallest passing change, then refactor on
   green. For migrations, derive the next number from
   [`ai-rules/current-state.generated.json`](ai-rules/current-state.generated.json).

---

## One-time setup (per clone)

```bash
# 1. Install root dev dependencies — this also wires the Husky pre-commit hook
npm install

# 2. Start local backing services (Postgres, MailHog, ClamAV)
docker compose up -d

# 3. Set up backend environment variables
cp works-backend/.env.example works-backend/.env
# .env is gitignored — edit it if your local Postgres config differs from the defaults

# 4. Install frontend dependencies
cd works-frontend && npm ci && cd ..

# 5. Verify the backend builds and all unit tests pass
cd works-backend && ./mvnw verify && cd ..

# 6. Verify the frontend builds and lints clean
cd works-frontend && npm test && npm run build && cd ..
```

### Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Java (Temurin) | 21 | `java -version` must show 21 |
| Maven wrapper | included | Use `./mvnw`, not a system `mvn` |
| Node.js | 22 | Match the CI runner version |
| Docker + Compose | current stable | `docker compose up -d` (Compose v2, no hyphen) |

---

## Daily development loop

### Start services

```bash
docker compose up -d   # idempotent — safe to re-run
```

### Run the backend

```bash
cd works-backend
./mvnw spring-boot:run
# API available at http://localhost:8080
# Flyway migrations run automatically on startup
```

### Run the frontend

```bash
cd works-frontend
npm run dev
# Dev server at http://localhost:5173 (hot-reload enabled)
```

### Before you commit

The pre-commit hook runs automatically. To run the same checks manually:

```bash
# Impact-based checks for changed paths:
npm run verify

# Full and release backstops:
npm run verify:full
npm run verify:release

# Or individually:
bash scripts/guardrails.sh                           # brand/arch checks
node scripts/generate-ai-rules.mjs --check           # AI rules in sync
bash scripts/check-dod-sync.sh                       # PR/policy contract shape
cd works-frontend && npm run lint                    # ESLint
cd works-frontend && npm test                        # Vitest unit + component tests
cd works-frontend && npm run build                   # Vite production build
cd works-backend && ./mvnw -B -Dgroups=unit verify   # unit tests + JaCoCo coverage gate
```

---

## Branching workflow

See [`ai-rules/rulebooks/05-TASK-EXECUTION.md`](ai-rules/rulebooks/05-TASK-EXECUTION.md) for the
full coordination strategy. Use an isolated worktree for concurrent agent work:

```bash
# Start a new feature (always branch from main)
git checkout main && git pull origin main
git checkout -b feat/gh-47-sprint-velocity-chart

# Keep your branch current with main (rebase, not merge)
git fetch origin main && git rebase origin/main

# Open a PR when ready — title must follow Conventional Commits format:
# feat(sprint): add velocity chart to sprint board
```

**Branch naming:** `type/gh-<issue>-<short-description>`, using `feat`, `fix`, `hotfix`, `chore`,
`docs`, `refactor`, or `ci` as the type.

**Merge strategy:** squash merge only — the PR title becomes the squash commit message.

---

## Writing a good PR

- PR title = the squash commit message → must be Conventional Commits: `type(scope): description`
- Link the task issue and keep the machine-readable `bsmart-pr/v1` evidence marker valid
- Map every acceptance criterion to a validation result and include RED/GREEN/final-green evidence
  when TDD applies
- Keep PRs small: one logical change per PR. If a branch has grown beyond 400 lines of diff,
  consider whether it can be split.
- For UI changes: include before/after screenshots in the PR description.

---

## Editing the rules (`ai-rules/`)

The canonical rules live in **`ai-rules/`** (`00-ORCHESTRATOR.md`, `SOURCE-OF-TRUTH.md`, and `rulebooks/`). Every per-tool file is **generated** from it — never hand-edit the generated files:

```bash
# 1. Edit the source in ai-rules/
# 2. Regenerate every per-tool file
node scripts/generate-ai-rules.mjs

# 3. Commit the ai-rules/ change + all regenerated files together
```

Files that are auto-generated (never edit these directly):
- `CLAUDE.md`
- `AGENTS.md`
- `.windsurfrules`
- `.cursor/rules/*.mdc`
- `.claude/rules/*.md`
- `.agents/rules/*.md`
- nested `AGENTS.md` and `CLAUDE.md` files
- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`

Policy IDs and enforcement classes live in `ai-rules/policy-registry.json`; update the canonical
rule, registry, generated views, and its executable check together.

---

## Troubleshooting common problems

### `docker compose up -d` — Postgres port 5432 already in use

```bash
# Find what's using the port
lsof -i :5432
# Stop any local Postgres service, or change the port mapping in docker-compose.yml
# and update BSMART_DB_URL in works-backend/.env accordingly
```

### Flyway migration fails on startup

```bash
# See the exact SQL error in the Spring Boot logs
# Fix the migration file — do NOT use repair-on-migrate to skip it
# To reset your local DB entirely:
docker compose down -v    # wipes volumes
docker compose up -d      # fresh Postgres
./mvnw spring-boot:run    # migrations re-run from V1
```

### Pre-commit hook blocks my commit

The hook runs `guardrails.sh` and `generate-ai-rules.mjs --check`. Read the output carefully:
- `BLOCK: gray-* class` — use `neutral-*` token classes instead (CLAUDE.md §4.2)
- `BLOCK: raw hex` — use a design token class (CLAUDE.md §4.2)
- `BLOCK: AI rules out of sync` — run `node scripts/generate-ai-rules.mjs` and stage the output

### ESLint fails on a new component

New components must be clean — only App.jsx carries a legacy suppress comment. Check:
- No `gray-*` Tailwind classes (use `neutral-*`)
- No raw hex in className (`bg-[#0B2F5C]` → `bg-brand-navy`)
- No inline `fetch()` — use `apiClient`
- A11y: `aria-label` on icon-only buttons, keyboard handlers on click targets

### Backend unit tests fail the coverage check

The JaCoCo gate requires ≥60% LINE coverage on `@Tag("unit")` tests. If you've added new
service or utility code without tests, add unit tests for the new code. The JaCoCo HTML report
is at `works-backend/target/site/jacoco/index.html` after running `./mvnw verify`.

---

## Where things live

| Path | What |
|------|------|
| `works-backend/` | Java 21 + Spring Boot 4 + PostgreSQL + Flyway |
| `works-frontend/` | React 19 + Vite + Tailwind |
| `docs/specifications/` | Product specs (capability map, iteration guide, tech stack) |
| `docs/brand/` | Brand & identity |
| `scripts/` | `guardrails.sh`, `generate-ai-rules.mjs`, `check-dod-sync.sh` |
| `.github/workflows/ci.yml` | The merge gate — all jobs must pass |
| `docker-compose.yml` | Local backing services (Postgres, MailHog, ClamAV) |
| `works-backend/.env.example` | Backend env var template — copy to `.env` and fill in |
| `works-frontend/.env.example` | Frontend env var template |
