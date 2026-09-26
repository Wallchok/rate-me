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

# One version per release: the newest changelog entry, package.json and a not yet used tag
version="$(grep -m1 'version: "' src/lib/changelog.ts | sed -E 's/.*version: "([^"]+)".*/\1/')"
[ "$version" = "$(node -p 'require("./package.json").version')" ] || fail "wersja w package.json różni się od changelogu ($version)"
git fetch -q --tags origin
if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  fail "v$version już wydana: dopisz nową wersję na górze src/lib/changelog.ts i w package.json"
fi

npm run lint
npm run build

scripts/migrate-prod.sh
vercel --prod --yes

git tag "v$version"
git push -q origin "refs/tags/v$version"
echo "Wydane: v$version ($(git rev-parse --short HEAD))"
