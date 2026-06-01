# Contributing to bSmart Works

## Before you write a line of code

1. Read [`CLAUDE.md`](CLAUDE.md) — the canonical rules (every AI tool reads it too).
2. Read [`docs/ENGINEERING-PRINCIPLES.md`](docs/ENGINEERING-PRINCIPLES.md) — the *why*.
3. Confirm the **active iteration** with Deepak. Do not build iteration N+1 while N is in scope.
4. For any backend change: identify the next Flyway migration number (currently `V27+`) and the
   API contract before touching code.

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
| Node.js | 20 | Match the CI runner version |
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
# From the repo root:
npm run verify          # guardrails + AI-rules sync + frontend lint

# Or individually:
bash scripts/guardrails.sh                           # brand/arch checks
node scripts/generate-ai-rules.mjs --check           # AI rules in sync
cd works-frontend && npm run lint                    # ESLint
cd works-backend && ./mvnw -Dgroups=unit verify      # unit tests + coverage check
```

---

## Branching workflow

See [`CLAUDE.md §7`](CLAUDE.md) for the full branching strategy. Quick reference:

```bash
# Start a new feature (always branch from main)
git checkout main && git pull origin main
git checkout -b feat/47-sprint-velocity-chart

# Keep your branch current with main (rebase, not merge)
git fetch origin main && git rebase origin/main

# Open a PR when ready — title must follow Conventional Commits format:
# feat(sprint): add velocity chart to sprint board
```

**Branch naming:** `feat/`, `fix/`, `hotfix/`, `chore/`, `docs/`, `refactor/`, `ci/` prefixes.
Always include the issue number: `feat/47-short-description`.

**Merge strategy:** squash merge only — the PR title becomes the squash commit message.

---

## Writing a good PR

- PR title = the squash commit message → must be Conventional Commits: `type(scope): description`
- Fill in the iteration and work item fields in the PR template
- Tick the Definition of Done checklist honestly — CI enforces most items automatically
- Keep PRs small: one logical change per PR. If a branch has grown beyond 400 lines of diff,
  consider whether it can be split.
- For UI changes: include before/after screenshots in the PR description.

---

## Editing the rules (CLAUDE.md)

The AI-tool rules files are **generated** from CLAUDE.md. Never hand-edit them:

```bash
# 1. Edit CLAUDE.md directly
# 2. Regenerate all derived AI rules files
node scripts/generate-ai-rules.mjs

# 3. Commit CLAUDE.md + all regenerated files together
```

Files that are auto-generated (never edit these directly):
- `.github/copilot-instructions.md`
- `.cursor/rules/bsmart.mdc`
- `.windsurfrules`
- `AGENTS.md`

If you change the Definition of Done checklist in CLAUDE.md, bump the `dod-version` tag in both
CLAUDE.md and `.github/pull_request_template.md` to the same value (`YYYY-MM-DD-rN`).

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
