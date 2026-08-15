# EPIC 02 - Production Configuration, Deployment, and Secrets Safety

## Blueprint references

- Implementation blueprint: EPIC 2 - Production Configuration, Deployment, and Secrets Safety
- UI/UX expanded blueprint: EPIC 2 deployment and operational safety requirements
- Final execution decision: Phase 1 hardening before breadth expansion

## Objective

Make staging and production deployments fail safe when required secrets or production-safe settings
are missing, while keeping local Docker Compose startup predictable.

## Scope in this PR

- Fail backend startup in `prod`, `production`, `stage`, and `staging` profiles when JWT secret is
  missing, too short, still dev-like, or dev verification-token exposure is enabled.
- Disable development verification-token exposure by default.
- Publish liveness/readiness health probes without requiring authentication.
- Add deployment health indicators for Flyway migrations, attachment storage, AI provider, and
  realtime transport, alongside the existing DB health.
- Make Docker Compose env-driven and readiness-gated.
- Add local, staging, and production environment templates.
- Add CI deployment smoke validation for the Compose templates.
- Add backup/restore runbook for PostgreSQL and uploads.
- Update deployment/security documentation.

## Acceptance criteria checklist

- [x] Production/staging profile refuses missing or dev JWT secret.
- [x] Dev verification token exposure is disabled by default outside local dev.
- [x] Docker Compose deploy path works from documented env values.
- [x] Health endpoint reports DB, migration, storage, AI, and realtime status.
- [x] Deployment docs identify local-only vs production-required secrets.
- [x] CI includes deployment smoke validation.
- [x] Backup/restore runbook exists for Postgres and uploads.

## Test plan

- `cd works-backend && .\mvnw.cmd -Dgroups=unit "-Dtest=ProductionConfigurationGuardTest,SecurityConfigJwtFilterTest" test`
- `docker compose --env-file deploy/env/local.example -f docker-compose.deploy.yml config --quiet`
- `docker compose --env-file deploy/env/staging.example -f docker-compose.deploy.yml config --quiet`
- `docker compose --env-file deploy/env/production.example -f docker-compose.deploy.yml config --quiet`
- `npm run guardrails`
- Broader `cd works-backend && .\mvnw.cmd -Dgroups=unit verify` before merge if practical.

## Out of scope

- Terraform/IaC for a cloud target.
- KMS-backed key rotation implementation.
- Managed object storage migration for attachments.
- Full disaster-recovery automation beyond the documented runbook.

---

# EPIC 02 Completion Note - Production Configuration and Secrets Safety

## Completed scope

- Added `ProductionConfigurationGuard` and unit tests for prod/staging fail-fast behavior.
- Disabled development verification-token exposure by default.
- Opened Actuator health/info probe paths and added deployment health indicators for migrations,
  storage, AI provider, and realtime status.
- Updated backend Docker healthcheck to use liveness.
- Made Docker Compose deployment env-driven and readiness-gated.
- Added local/staging/production env templates.
- Added CI Compose deployment smoke validation.
- Added PostgreSQL/uploads backup and restore runbook.
- Updated `DEPLOY-LOCAL.md`, `SECURITY.md`, and roadmap state.

## Validation

- `cd works-backend && .\mvnw.cmd -Dgroups=unit "-Dtest=ProductionConfigurationGuardTest,SecurityConfigJwtFilterTest" test`
- `cd works-backend && .\mvnw.cmd -Dgroups=unit verify`
- `docker compose --env-file deploy/env/local.example -f docker-compose.deploy.yml config --quiet`
- `docker compose --env-file deploy/env/staging.example -f docker-compose.deploy.yml config --quiet`
- `docker compose --env-file deploy/env/production.example -f docker-compose.deploy.yml config --quiet`
- `npm run guardrails`

Backend verification passed 1,341 unit tests with 0 Checkstyle violations. Compose configuration
validation passed for local, staging, and production templates. Guardrails passed all blocking rules;
the existing non-blocking frontend raw-hex baseline warning remains.

## Codebase re-verification - 2026-07-19

The production configuration guard, health contributors, environment templates, CI Compose smoke
job, and backup/restore readiness check were re-audited directly in code and automation. They are now
covered by `scripts/epics-01-05-completion.mjs`; the current full backend suite passes 1,454 tests with
JaCoCo and Checkstyle. Local/staging/production Compose rendering is part of the closeout gate.
