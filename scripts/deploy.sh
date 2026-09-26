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

npm run lint
npm run build

scripts/migrate-prod.sh
vercel --prod --yes

tag="deploy-$(date +%Y%m%d-%H%M)"
git tag "$tag"
git push -q origin "refs/tags/$tag"
echo "Wydane: $tag ($(git rev-parse --short HEAD))"
