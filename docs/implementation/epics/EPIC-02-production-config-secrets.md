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
