# Data Persistence & Recovery

This document describes where Dockhand keeps its data, how it's backed up, and how to recover from data loss.

## What Data Exists

| Data | Where stored | Persisted across container restarts? | Persisted across `docker compose down`? | Backed up automatically? |
|---|---|---|---|---|
| **Postgres database** (agents, containers, audit logs, superadmin) | Host bind mount `./data/postgres` | ✅ | ✅ | ✅ (daily) |
| **Postgres backups** (SQL dumps) | Host bind mount `./backups/postgres` | ✅ | ✅ | n/a — this IS the backup |
| **`apps/api/.env`** (JWT secret, DB URL) | Host bind mount into the `api` container | n/a | ✅ | ❌ — back this up yourself |
| **`packages/database/.env`** (superadmin creds) | Host file | n/a | ✅ | ❌ — back this up yourself |
| **Hawser agent data** (containers list, stats) | Sent to API → lives in Postgres only | n/a | n/a | ✅ via Postgres backups |

> The hawser agent itself stores **nothing on disk**. It connects to the Docker socket on the host, reports state upward to the API, and forgets everything on restart. All durable state lives in Postgres.

## Where Data Lives on the Host

```
./data/postgres/           ← Postgres data directory (bind mount)
   ├── PG_VERSION
   ├── base/
   ├── global/
   ├── pg_wal/
   └── ...

./backups/postgres/        ← Daily pg_dump outputs
   ├── dockhand-20260817T030000Z.dump
   ├── dockhand-20260816T030000Z.dump
   ├── ...
   └── latest.dump          ← Symlink to most recent dump
```

## Automatic Backups

A `backup` container runs alongside the stack. It:
- Connects to the `postgres` service
- Runs `pg_dump -Fc` (compressed custom format) every 24 hours
- Writes the dump to `/backups/postgres/dockhand-<timestamp>.dump`
- Updates a `latest.dump` symlink
- Prunes dumps older than 30 days (configurable via `BACKUP_KEEP`)

The `backup` service is in the `backup` profile. To enable scheduled backups:

```bash
# Start the full stack INCLUDING scheduled backups
docker compose --profile backup up -d

# Force an immediate backup right now
docker compose --profile backup run --rm backup once

# See what dumps exist
docker compose --profile backup run --rm backup status
```

### Backup Schedule / Tuning

Override via environment variables in your root `.env`:

```env
# Back up every 12 hours instead of 24
BACKUP_INTERVAL_SECONDS=43200
# Keep last 90 dumps
BACKUP_KEEP=90
```

## Off-Host Backups (Recommended)

The bind-mount backups live on the same disk as the database. If the disk dies, both are lost.

**Recommended off-host backup strategy** (any of these works):

```bash
# Option A: rsync to another server (cron on the host)
rsync -a --delete /opt/dockhand/backups/postgres/ backup-user@backup-host:/backups/dockhand/

# Option B: rclone to S3/B2/Backblaze (cron on the host)
rclone sync /opt/dockhand/backups/postgres/ b2:dockhand-backups/postgres/

# Option C: restic / borgbackup to encrypted remote
borg create backup-host:dockhand::dockhand-{now} /opt/dockhand/backups/postgres/

# Option D: nightly host snapshot (LVM/ZFS) — simplest if your host supports it
```

Run any of these from a daily cron on the host. The dumps compress well (≈10–100×), so even daily backups stay small.

## Recovery Procedures

### Restore the latest dump

```bash
# 1. Make sure the stack is running
docker compose up -d postgres

# 2. Wait for postgres to be healthy, then restore
docker compose --profile restore run --rm restore
```

This:
- Drops the public schema in the running database
- Loads `./backups/postgres/latest.dump` via `pg_restore`
- Preserves the postgres role/user (dump is `--no-owner --no-privileges`)

### Restore a specific dump

```bash
ls -lh backups/postgres/         # find the dump you want
docker compose --profile restore run --rm restore -- /backups/postgres/dockhand-20260815T030000Z.dump
```

### Total loss — fresh server

```bash
# 1. Copy ./data and ./backups to the new host
scp -r old-host:/opt/dockhand/data ./data
scp -r old-host:/opt/dockhand/backups ./backups

# 2. Start the stack — Postgres picks up ./data/postgres exactly where it left off
docker compose up -d

# (Alternative if data dir is gone: start fresh, then restore from backup)
docker compose up -d postgres
docker compose --profile restore run --rm restore
```

### Disaster recovery checklist

1. ✅ **Back up `.env` files** — `apps/api/.env`, `apps/web/.env`, root `.env`, `packages/database/.env`. These contain the JWT secret and DB password.
2. ✅ **Back up `./data/postgres`** — primary durable storage.
3. ✅ **Back up `./backups/postgres`** — daily dumps.
4. ✅ **Off-host copy** — at least one of rsync/rclone/borg/ZFS snapshot.

If you have all four, you can rebuild on any machine with Docker installed.

## Manual Backup / Restore (Outside Docker)

If the stack is down and you need to dump or restore manually:

```bash
# Manual dump (using local Postgres client)
pg_dump -h localhost -p 5438 -U dockhand -d dockhand -Fc \
  --no-owner --no-privileges \
  -f dockhand-manual-$(date +%Y%m%d).dump

# Manual restore
pg_restore -h localhost -p 5438 -U dockhand -d dockhand \
  --no-owner --no-privileges --clean --if-exists \
  dockhand-manual-20260817.dump
```

The local Postgres container exposes port `5438` on the host (mapped from the container's `5432`).

## What is NOT Backed Up

- **Hawser agent containers themselves** (on monitored hosts) — these belong to those hosts. Only their *reported state* lives in Dockhand's DB.
- **Built images** — `docker compose build` re-creates them.
- **`node_modules` and build outputs** — re-created by `pnpm install` / build.

## Security Notes for Backups

- Backup files contain **all database rows**, including the SuperAdmin argon2id hash and every agent's `tokenHash`.
  - Treat `./backups/postgres/` as sensitive.
  - Encrypt at rest when copying off-host.
  - Restrict permissions: `chmod 700 backups/`
- **Rotate `JWT_SECRET`** if backups leak. After rotation, all current sessions are invalidated.
- **Rotate the superadmin password** if backups leak. Re-run `pnpm db:seed` to update the hash.