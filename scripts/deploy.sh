#!/bin/bash
# Production release: only a clean main that matches GitHub, checked by lint and build first.
# Then database migrations, deploy, and a git tag that says what is on production.
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "STOP: $1" >&2; exit 1; }

[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || fail "wydajemy tylko z main"
git diff --quiet && git diff --cached --quiet || fail "są niezacommitowane zmiany"
[ -z "$(git ls-files --others --exclude-standard)" ] || fail "są nowe, niedodane pliki"
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail "main różni się od origin/main (najpierw wypchnij main)"

# One version per release, from package.json; every release needs a new number.
# Changes people notice also go on top of src/lib/changelog.ts ("Co nowego"), technical ones do not.
version="$(node -p 'require("./package.json").version')"
git fetch -q --tags origin
if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  fail "v$version już wydana: podbij wersję w package.json"
fi

npm run lint
npm run build

PROD_URL="https://yummy-rate.vercel.app"
# Remember what is live now, so a broken release can be rolled back to it
# awk reads everything: stopping early breaks the pipe and vercel exits with an error
previous="$(vercel inspect "$PROD_URL" 2>&1 | awk '$1 == "url" && !found { print $2; found = 1 }' || true)"

scripts/migrate-prod.sh
vercel --prod --yes

# A release that cannot reach the database must not go unnoticed
sleep 3
if ! curl -sf -m 15 "$PROD_URL/api/health" >/dev/null; then
  echo "STOP: $PROD_URL/api/health nie odpowiada po wydaniu (np. zła zmienna w env)." >&2
  echo "Przywrócenie poprzedniej wersji: vercel rollback ${previous:-<poprzedni deployment>}" >&2
  exit 1
fi

git tag "v$version"
git push -q origin "refs/tags/v$version"
echo "Wydane: v$version ($(git rev-parse --short HEAD))"
