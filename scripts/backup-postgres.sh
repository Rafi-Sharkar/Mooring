#!/bin/sh
# Daily PostgreSQL backup for Dockhand.
# - Runs as a sidecar container alongside the `postgres` service.
# - Writes a compressed SQL dump to /backups.
# - Retains the most recent N dumps (default 30, override with BACKUP_KEEP).
# - Also creates a "latest.dump" symlink for convenience.
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP="${BACKUP_KEEP:-30}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${BACKUP_DIR}/dockhand-${TIMESTAMP}.dump"
LATEST_LINK="${BACKUP_DIR}/latest.dump"

# Connection info — must match POSTGRES_* in docker-compose.yml.
PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-dockhand}"
PGPASSWORD="${POSTGRES_PASSWORD:-dockhand_dev}"
PGDATABASE="${POSTGRES_DB:-dockhand}"
export PGPASSWORD

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +%FT%TZ)] Starting pg_dump of '${PGDATABASE}' on ${PGHOST}:${PGPORT}"

# -Fc = custom format (compressed, supports selective restore with pg_restore).
# --no-owner / --no-privileges keep the dump portable across roles.
pg_dump \
  -h "${PGHOST}" \
  -p "${PGPORT}" \
  -U "${PGUSER}" \
  -d "${PGDATABASE}" \
  -Fc \
  --no-owner \
  --no-privileges \
  -f "${DUMP_FILE}"

# Verify the dump isn't empty/corrupt.
if [ ! -s "${DUMP_FILE}" ]; then
  echo "[$(date -u +%FT%TZ)] ERROR: dump file is empty: ${DUMP_FILE}" >&2
  rm -f "${DUMP_FILE}"
  exit 1
fi

# Refresh the latest symlink (atomic).
ln -sfn "$(basename "${DUMP_FILE}")" "${LATEST_LINK}"

SIZE=$(stat -c %s "${DUMP_FILE}" 2>/dev/null || stat -f %z "${DUMP_FILE}")
echo "[$(date -u +%FT%TZ)] Wrote ${DUMP_FILE} (${SIZE} bytes)"

# Retention: keep the newest ${KEEP} dumps, prune the rest.
PRUNED=$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'dockhand-*.dump' \
  | sort -r \
  | awk -v keep="${KEEP}" 'NR>keep')
if [ -n "${PRUNED}" ]; then
  echo "[$(date -u +%FT%TZ)] Pruning old dumps (keep=${KEEP}):"
  echo "${PRUNED}" | while IFS= read -r OLD; do
    [ -n "${OLD}" ] && rm -f "${OLD}" && echo "  - $(basename "${OLD}")"
  done
fi

echo "[$(date -u +%FT%TZ)] Backup complete. Disk usage of ${BACKUP_DIR}:"
du -sh "${BACKUP_DIR}" 2>/dev/null || true