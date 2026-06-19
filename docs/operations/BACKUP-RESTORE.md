# Backup and Restore Runbook

This runbook covers the Docker Compose deployment path for bSmart Works: PostgreSQL data plus the
uploads volume used by attachments and generated artifacts.

## Scope

- Database volume: `bsmart_deploy_pg_data`
- Uploads volume: `bsmart_uploads`
- Compose file: `docker-compose.deploy.yml`
- Environment file: a private copy of `deploy/env/local.example`, `deploy/env/staging.example`, or
  `deploy/env/production.example`

## Backup

Create a timestamped backup directory:

```bash
export ENV_FILE=deploy/env/production.env
export BACKUP_DIR=backups/$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
```

Dump PostgreSQL:

```bash
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl \
  > "$BACKUP_DIR/postgres.dump"
```

Archive uploads:

```bash
docker run --rm \
  -v bsmart-deploy_bsmart_uploads:/data/uploads:ro \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine tar -czf /backup/uploads.tgz -C /data uploads
```

Record the deployed commit and image metadata:

```bash
git rev-parse HEAD > "$BACKUP_DIR/git-commit.txt"
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml images > "$BACKUP_DIR/images.txt"
```

## Restore

Stop the stack:

```bash
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml down
```

Start only PostgreSQL and wait until it is healthy:

```bash
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml up -d postgres
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml ps
```

Restore PostgreSQL:

```bash
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl \
  < "$BACKUP_DIR/postgres.dump"
```

Restore uploads:

```bash
docker run --rm \
  -v bsmart-deploy_bsmart_uploads:/data/uploads \
  -v "$(pwd)/$BACKUP_DIR:/backup:ro" \
  alpine sh -c "rm -rf /data/uploads/* && tar -xzf /backup/uploads.tgz -C /data"
```

Restart and verify:

```bash
docker compose --env-file "$ENV_FILE" -f docker-compose.deploy.yml up -d --build
curl -fsS http://localhost:${BACKEND_PORT:-8090}/actuator/health/readiness
```

## Operating Rules

- Store backups encrypted and outside the application host.
- Test restore quarterly in a non-production environment.
- Never restore production data into a shared developer workstation without approval and PII controls.
- Keep at least one backup from before every production deployment.
