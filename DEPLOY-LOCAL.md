# Local deployment (Docker Compose)

The fastest way to run the **whole product** — Postgres, backend, frontend, and a
dev mail inbox — on one machine with one command. This is the `local` target
referenced in `CLAUDE.md` §13. The cloud target (AWS/ECS + RDS + Terraform,
RB-40 §5) is a separate, gated step and is intentionally **not** wired here.

## Prerequisites

- Docker Desktop running (Linux containers).
- Ports free on the host: **8088** (app), **8090** (backend), **55433** (Postgres), **8025** (mail UI).

## Run it

```bash
docker compose --env-file deploy/env/local.example -f docker-compose.deploy.yml up -d --build
```

First build compiles the Spring Boot JAR and the Vite bundle inside Docker, so it
takes a few minutes. Subsequent builds reuse the cached Maven/npm layers.

| What | URL |
|------|-----|
| **App (SPA)** | http://localhost:8088 |
| Backend health | http://localhost:8090/actuator/health → `{"status":"UP"}` |
| Email inbox (MailHog) | http://localhost:8025 |

The frontend is served by nginx, which also reverse-proxies `/api/*` to the
backend — so the browser only ever talks to `:8088` (same-origin, no CORS).

## Verify it's healthy

```bash
docker compose --env-file deploy/env/local.example -f docker-compose.deploy.yml ps
curl -fsS http://localhost:8090/actuator/health     # expect {"status":"UP"}
curl -fsS http://localhost:8090/actuator/health/readiness
curl -fsS http://localhost:8090/actuator/health/liveness
```

The backend container has a built-in `HEALTHCHECK` that polls Actuator; `ps`
shows `healthy` once Flyway has migrated and the app is serving.

## Stop / reset

```bash
docker compose --env-file deploy/env/local.example -f docker-compose.deploy.yml down      # stop, keep the database
docker compose --env-file deploy/env/local.example -f docker-compose.deploy.yml down -v   # stop and wipe the database volume
```

## How the container env maps to config

`application.properties` reads everything through env-overridable keys, so the
compose file points the app at the sibling containers:

| Env var | Overrides | Value in this stack |
|---------|-----------|---------------------|
| `BSMART_DB_URL` | `spring.datasource.url` | `jdbc:postgresql://postgres:5432/works_db` |
| `SPRING_MAIL_HOST` | `spring.mail.host` | `mailhog` |
| `BSMART_JWT_SECRET` | `app.jwt.secret` | local-only strong-enough secret |
| `BSMART_EXPOSE_DEV_VERIFICATION_TOKEN` | `app.auth.expose-dev-verification-token` | `false` |
| `APP_ATTACHMENTS_VIRUS_SCAN_ENABLED` | `app.attachments.virus-scan-enabled` | `false` (no ClamAV in this stack) |
| `BSMART_CORS_ALLOWED_ORIGINS` | `app.cors.allowed-origins` | `http://localhost:8088` |
| `VITE_API_BASE_URL` (build arg) | frontend API base | `/api/v1` (proxied by nginx) |

## Environment templates

The deployment path is driven by environment files:

| Template | Purpose |
|----------|---------|
| `deploy/env/local.example` | Local Docker Compose with local-only defaults |
| `deploy/env/staging.example` | Staging template; copy to a private `.env` and fill real secrets |
| `deploy/env/production.example` | Production template; copy to a private `.env` and fill real secrets |

Production and staging run with `SPRING_PROFILES_ACTIVE=prod` or `staging`. In those profiles the
backend refuses to start if `BSMART_JWT_SECRET` is missing, too short, still uses the dev value, or
if `BSMART_EXPOSE_DEV_VERIFICATION_TOKEN=true`.

## Notes

- **Database schema** is built by Flyway on first boot (currently V1…V109). `ddl-auto=validate`
  means the JPA entities are checked against the migrated schema at startup — a
  mismatch fails the boot loudly, which is what you want.
- **ClamAV virus scanning** is disabled here because the app's default points at a
  WSL2 IP. Re-enable by adding a `clamav` service and setting
  `APP_ATTACHMENTS_VIRUS_SCAN_ENABLED=true` + the clamav host env.
- **Backup/restore:** follow `docs/operations/BACKUP-RESTORE.md` before every production deployment
  and test restores quarterly.

## GitHub Actions Deployment

`.github/workflows/deploy.yml` is the remote deployment gate for staging and
production. It builds the same backend JAR and frontend bundle, then deploys them
over SSH. Configure these as environment-level GitHub secrets/variables for each
target environment before running the workflow:

| Name | Type | Required for | Purpose |
|------|------|--------------|---------|
| `DEPLOY_SSH_HOST` | secret | backend/frontend | Target host |
| `DEPLOY_SSH_USER` | secret | backend/frontend | SSH user |
| `DEPLOY_SSH_KEY` | secret | backend/frontend | Private key for the SSH user |
| `DEPLOY_BACKEND_DIR` | variable | backend | Directory that receives `app.jar` |
| `DEPLOY_BACKEND_SERVICE` | variable | backend | systemd service restarted after JAR deploy |
| `DEPLOY_FRONTEND_DIR` | variable | frontend | Directory served by nginx/CDN origin |
| `DEPLOY_FRONTEND_RELOAD` | variable | frontend | Optional reload command, such as `sudo systemctl reload nginx` |
| `BACKEND_HEALTH_URL` | variable | backend | Optional health URL polled after backend deploy |
| `FRONTEND_HEALTH_URL` | variable | frontend | Optional URL checked after frontend deploy |
| `VITE_API_BASE_URL` | variable | frontend build | Optional API base, defaults to `/api/v1` |

Production runs require the workflow input `confirm_production=DEPLOY`.
