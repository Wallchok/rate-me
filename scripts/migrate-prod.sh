#!/bin/bash
# Applies Prisma migrations to the production Turso database, each one only once.
# Applied names are kept in the _applied_migrations table, so it is clear what is on production.
# Usage: scripts/migrate-prod.sh [--dry-run]
set -euo pipefail
cd "$(dirname "$0")/.."

# TURSO_DB=rateme-preview scripts/migrate-prod.sh for the preview database
DB="${TURSO_DB:-rateme}"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

query() {
  # turso prints a header line and pads values with spaces; keep the first column only
  turso db shell "$DB" "$1" 2>/dev/null | grep -v -i "brew\|update" | awk 'NR > 1 { print $1 }'
}

if [ $DRY_RUN -eq 0 ]; then
  turso db shell "$DB" "CREATE TABLE IF NOT EXISTS _applied_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);" >/dev/null
fi

# Empty when the table does not exist yet (first run, or --dry-run before it)
applied="$(query "SELECT name FROM _applied_migrations;" || true)"

# Baseline: before this script existed, init and seed_categories were applied by hand
if [ -z "$applied" ] && query "SELECT name FROM sqlite_master WHERE type='table' AND name='Person';" | grep -q Person; then
  for m in prisma/migrations/*_init prisma/migrations/*_seed_categories; do
    name="$(basename "$m")"
    echo "baseline (already on production): $name"
    if [ $DRY_RUN -eq 0 ]; then
      turso db shell "$DB" "INSERT INTO _applied_migrations (name) VALUES ('$name');" >/dev/null
    fi
    applied="$applied
$name"
  done
fi

pending=0
for dir in prisma/migrations/*/; do
  name="$(basename "$dir")"
  if echo "$applied" | grep -qx "$name"; then
    continue
  fi
  pending=$((pending + 1))
  if [ $DRY_RUN -eq 1 ]; then
    echo "would apply: $name"
    continue
  fi
  echo "applying: $name"
  turso db shell "$DB" < "$dir/migration.sql"
  turso db shell "$DB" "INSERT INTO _applied_migrations (name) VALUES ('$name');" >/dev/null
done

[ $pending -eq 0 ] && echo "Production is up to date."
exit 0
