# Sprint Cockpit — Playwright E2E

Browser-driven end-to-end coverage of the role-adaptive Sprint Cockpit (Cap V). The suite
authenticates via the API, seeds the persisted session, then drives the real cockpit UI.

## Prerequisites — bring up the stack

The tests need the backend (`:8080`), a Postgres, and the frontend (`:5173`) running, plus a
**loginable workspace member** (the committed seed users carry placeholder password hashes).

```bash
# 1. Postgres (Docker, or a local cluster) on :5432 with db works_db / bcits_admin / works_secure_pass
docker compose up -d            # or provision Postgres however you like

# 2. Backend (Flyway migrates + seeds on boot)
cd works-backend
BSMART_DB_URL=jdbc:postgresql://127.0.0.1:5432/works_db \
BSMART_DB_USERNAME=bcits_admin BSMART_DB_PASSWORD=works_secure_pass \
./mvnw spring-boot:run

# 3. Provision a loginable member (seed hashes are placeholders). Mint a real bcrypt hash by
#    signing up a throwaway account, then copy it onto a seed workspace member:
curl -s -X POST http://127.0.0.1:8080/api/v1/auth/signup -H 'Content-Type: application/json' \
  -d '{"email":"e2e-seed@e2e.test","password":"E2ePass123!","fullName":"E2E Seed"}'
psql "postgresql://bcits_admin:works_secure_pass@127.0.0.1:5432/works_db" -c \
  "UPDATE users SET password_hash=(SELECT password_hash FROM users WHERE email='e2e-seed@e2e.test'), \
   email_verified=true WHERE email='deepak@bcits.com';"
```

## Run

```bash
cd works-frontend
npm install
npx playwright install chromium     # one-time; needs egress to cdn.playwright.dev
npm run test:e2e                    # starts Vite itself (webServer) and runs the suite
```

## Configuration (env)

| Var | Default | Purpose |
|-----|---------|---------|
| `E2E_BASE_URL` | `http://localhost:5173` | Frontend origin. If set, the suite assumes the server is already running and does not start Vite. |
| `E2E_API_URL` | `http://localhost:8080/api/v1` | Backend API base (login). |
| `E2E_EMAIL` / `E2E_PASSWORD` | `deepak@bcits.com` / `E2ePass123!` | The loginable member provisioned above. |

## CI

`.github/workflows/e2e.yml` runs the whole thing on demand (`workflow_dispatch`): Postgres
service → packaged backend jar (Flyway + `ddl-auto=validate`) → provision the member → Vite
preview → `playwright test`. It's not on the PR merge gate (it needs the full stack); trigger
it from the Actions tab.

## What it covers

- The role-adaptive cockpit loads with the **persistent context bar** (RAG verdict).
- Analysis tabs (e.g. **Variance**) **auto-load the active sprint** — no select+Analyze step.
- The global **+ Raise** action opens the role-filtered raise form.

Authentication goes through the API (`helpers.js`) rather than the login form, keeping the
cockpit specs focused; the login form has its own unit/RTL coverage.
