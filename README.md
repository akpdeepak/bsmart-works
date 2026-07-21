# bSmart Works

> **Where work gets done.** AI-native project management workspace built for BCITS and utility industry clients.

bSmart Works is a full-stack, multi-tenant project management platform covering the complete delivery lifecycle — work items, sprints, compliance, SLA, knowledge, AI assistance, and enterprise security — across 20 planned iterations.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | Java 21 · Spring Boot 4.1.0 · Maven |
| Database | PostgreSQL · Flyway migrations · append-only event/audit history (`events`) |
| Auth | Spring Security · JWT (stateless) · MFA TOTP · WebAuthn/passkeys |
| Frontend | React 19.2 · Vite 8 · JavaScript/JSX · Tailwind CSS |
| AI | Provider-neutral model adapters via the AI Control Plane |

---

## Quick start

**Run locally with Docker Compose (recommended):**
```bash
docker compose -f docker-compose.deploy.yml up -d --build
# App: http://localhost:8088
# Backend health: http://localhost:8090/actuator/health
# Mail UI: http://localhost:8025
```

See [DEPLOY-LOCAL.md](DEPLOY-LOCAL.md) for full instructions, environment variables, and troubleshooting.

**Develop locally (hot-reload):**
```bash
# Prerequisites: Java 21, Node 22, Docker
npm install                          # wires husky pre-commit hook
docker compose up -d                 # backing services
cd works-backend && ./mvnw spring-boot:run   # API on :8080
cd works-frontend && npm run dev             # SPA on :5173
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow.

---

## Key docs

| Doc | What it covers |
|-----|----------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, daily loop, branching, pre-commit, PR checklist |
| [DEPLOY-LOCAL.md](DEPLOY-LOCAL.md) | Docker Compose full-stack deployment |
| GitHub issues labelled `tech-debt` | Known deliberate shortcuts, owner, and payoff trigger |
| [CURRENT-STATE.md](CURRENT-STATE.md) | Pointer to the generated executable-state inventory |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [SECURITY.md](SECURITY.md) | Vulnerability disclosure + security posture |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | WCAG 2.2 AA conformance |
| [PERFORMANCE.md](PERFORMANCE.md) | NFR budgets + load-test plan |
| [ai-rules/](ai-rules/) | Canonical AI-tool rules (source for CLAUDE.md, AGENTS.md, etc.) |
| [docs/ENGINEERING-PRINCIPLES.md](docs/ENGINEERING-PRINCIPLES.md) | Architecture + development philosophy |

---

## Rules for AI tools

The canonical rules for all AI coding tools live in [`ai-rules/`](ai-rules/). The per-tool files (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules/bsmart.mdc`, `.windsurfrules`) are **generated** from it — never hand-edit them. To update rules:

```bash
# 1. Edit the source in ai-rules/
# 2. Regenerate all per-tool files
node scripts/generate-ai-rules.mjs
# 3. Commit ai-rules/ changes + all regenerated files together
```

---

## Project status

- **Executable state:** [`ai-rules/current-state.generated.json`](ai-rules/current-state.generated.json)
- **Active work:** GitHub `agent-task` issues, linked pull requests, and required checks
- **Program reference:** bSmart Transformation Roadmap V.20 / V1.6 overlay
- **Owner:** Deepak Pandey / BCITS
