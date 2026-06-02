# bSmart Works

> *Where work gets done.*

AI-native, role-tuned project management and delivery workspace for BCITS internal teams and utility-industry clients. Combines work management, compliance, SLAs, PM artifacts (RAID), knowledge, KPIs, and AI assistance — with role-aware surfaces for Developers, Scrum Masters, Product Owners, Executives, and Admins.

---

## Quick start

### Prerequisites

| Tool | Minimum | Check |
|------|---------|-------|
| Java (Temurin) | 21 | `java -version` |
| Node.js | 20 | `node --version` |
| Docker + Compose | latest | `docker compose version` |
| Maven wrapper | bundled | `./works-backend/mvnw --version` |

### One-time setup

```bash
# 1. Wire Husky pre-commit hooks
npm install

# 2. Start Postgres, MailHog, ClamAV
docker compose up -d

# 3. Backend env vars (dev defaults work out of the box)
cp works-backend/.env.example works-backend/.env

# 4. Frontend env vars
cp works-frontend/.env.example works-frontend/.env

# 5. Install frontend dependencies
cd works-frontend && npm ci && cd ..
```

### Run locally

```bash
# Backend (starts on :8080, Flyway migrations run automatically)
cd works-backend && ./mvnw spring-boot:run

# Frontend (starts on :5173)
cd works-frontend && npm run dev
```

Open `http://localhost:5173`. Backend health: `http://localhost:8080/actuator/health`.

---

## Verify before every PR

```bash
bash scripts/verify.sh            # all DoD gates (CLAUDE.md §21.9)
bash scripts/verify.sh --frontend # frontend-only (no JVM)
bash scripts/verify.sh --backend  # backend-only
```

---

## Key references

| File | What it is |
|------|-----------|
| [`CLAUDE.md`](CLAUDE.md) | **Single source of truth** — rules for AI tools and developers |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Setup, workflow, and branching guide |
| [`TECH-DEBT.md`](TECH-DEBT.md) | Known debt register (TD-001 … TD-014) |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
| [`docs/ENGINEERING-PRINCIPLES.md`](docs/ENGINEERING-PRINCIPLES.md) | Architecture reasoning |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | Java 21 · Spring Boot 4 · Spring Security + JWT · JPA + Flyway · PostgreSQL |
| Frontend | React 19 · Vite 8 · Tailwind CSS 4 · TanStack Query · lucide-react |
| Tests | JUnit 5 (unit, `@Tag("unit")`) · Vitest + RTL (component) |
| CI | GitHub Actions — guardrails · lint · test · coverage · secrets scan |

---

## Project status

Current iteration: **~6** (knowledge repository, releases, worklogs, article publishing — V27 on `main`).
Next migration: **V28**. See [`CLAUDE.md §5`](CLAUDE.md) for the full iteration roadmap.
