#!/bin/bash
# Copies the production Turso database to a local file; keeps the newest 12 copies.
# Turso free plan can only restore 1 day back, so this is the real backup.
set -euo pipefail

DIR="$HOME/Backups/rateme"
mkdir -p "$DIR"
file="$DIR/rateme-$(date +%Y-%m-%d).db"

# Same-day rerun replaces that day's copy
if ! out="$(turso db export rateme --output-file "$file" --overwrite 2>&1)"; then
  echo "Backup failed: $(echo "$out" | grep -v -i "brew\|update")" >&2
  exit 1
fi
[ -s "$file" ] || { echo "Backup failed: $file is empty" >&2; exit 1; }

# Newest first; everything after the 12th copy goes (with its -wal file). BSD tools, bash 3.2.
ls -1t "$DIR"/rateme-*.db | tail -n +13 | while read -r old; do rm -f "$old" "$old-wal"; done
echo "Backup: $file ($(du -h "$file" | cut -f1))"
