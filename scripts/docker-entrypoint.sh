#!/bin/sh
# Entrypoint for the backup sidecar.
# Modes:
#   loop   - run backup once (if BACKUP_RUN_ON_START=true), then every
#            BACKUP_INTERVAL_SECONDS seconds. Blocks forever.
#   once   - run backup once and exit (useful for `docker compose run --rm backup`).
#   status - print last backup info from /backups.
set -eu

BACKUP_BIN=/usr/local/bin/backup-postgres.sh

# If postgres isn't ready yet on first loop, wait for it.
wait_for_postgres() {
  i=0
  while [ "$i" -lt 60 ]; do
    if pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "postgres not reachable at ${POSTGRES_HOST}:${POSTGRES_PORT} after 120s" >&2
  return 1
}

mode="${1:-loop}"

case "$mode" in
  once)
    wait_for_postgres
    "$BACKUP_BIN"
    ;;
  status)
    echo "Backup directory: ${BACKUP_DIR:-/backups}"
    if [ -d "${BACKUP_DIR:-/backups}" ]; then
      ls -lh "${BACKUP_DIR}/" 2>/dev/null || echo "(empty)"
    else
      echo "(directory missing)"
    fi
    ;;
  loop)
    wait_for_postgres
    INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
    if [ "${BACKUP_RUN_ON_START:-true}" = "true" ]; then
      "$BACKUP_BIN" || echo "initial backup failed; will retry next interval" >&2
    fi
    echo "sleeping ${INTERVAL}s between backups..."
    while true; do
      sleep "${INTERVAL}"
      "$BACKUP_BIN" || echo "backup failed at $(date -u +%FT%TZ); will retry next interval" >&2
    done
    ;;
  *)
    echo "unknown mode: $mode" >&2
    echo "usage: $0 {loop|once|status}" >&2
    exit 2
    ;;
esac