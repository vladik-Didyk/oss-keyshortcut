#!/usr/bin/env bash
# Build the committed HEAD in a clean folder and deploy it to Cloudflare Pages
# production (keyshortcut.com). Uncommitted changes in this checkout are NOT
# shipped, unlike `pnpm run deploy`, which uploads the working tree.
#
# - Public IDs (AdSense, App Store) come from the committed .env.production.
# - Analytics IDs (GA4, Clarity, PostHog) come from .env, copied into the
#   clean folder for the build and deleted afterwards.
# - scripts/verify-build.mjs --strict must pass, or nothing is deployed.
# - Traps this script handles: toolbox/playbooks/2026-09-24-wrangler-pages-deploy-traps.md
#   (arm64 workerd, --branch=main for a folder without .git, functions/ upload).
#   If wrangler fails with "Failed to fetch auth token: 400", run once from ~:
#   arch -arm64 node <this project>/node_modules/wrangler/bin/wrangler.js logout
#
# Usage: scripts/deploy-clean.sh            build, verify, deploy
#        scripts/deploy-clean.sh --dry-run  build and verify only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

[[ -f .env ]] || { echo "No .env in $ROOT (needed for analytics IDs and CLOUDFLARE_API_TOKEN)." >&2; exit 1; }

# wrangler uploads functions/ from THIS folder, not from the clean build.
if [[ -n "$(git status --porcelain -- functions/)" ]]; then
  echo "functions/ has uncommitted changes. Commit or revert them first." >&2
  exit 1
fi

BUILD_DIR="$(mktemp -d -t keyshortcut-deploy)"
trap 'rm -f "$BUILD_DIR/.env"' EXIT

echo "==> Building $(git rev-parse --short HEAD) in $BUILD_DIR"
git archive HEAD | tar -x -C "$BUILD_DIR"
cp .env "$BUILD_DIR/.env"
ln -s "$ROOT/node_modules" "$BUILD_DIR/node_modules"
(cd "$BUILD_DIR" && pnpm build)

echo "==> Verifying build"
node scripts/verify-build.mjs "$BUILD_DIR/build/client" --strict

if [[ $DRY_RUN -eq 1 ]]; then
  echo "==> Dry run: not deploying. Preview with:"
  echo "    python3 -m http.server 8840 -d $BUILD_DIR/build/client"
  exit 0
fi

# Apple Silicon: force arm64, or workerd asks for the x86_64 package.
ARCH=()
# hw.optional.arm64 is 1 on Apple Silicon even inside a Rosetta shell.
[[ "$(sysctl -n hw.optional.arm64 2>/dev/null)" == "1" ]] && ARCH=(arch -arm64)

echo "==> Deploying to Cloudflare Pages (production)"
${ARCH[@]+"${ARCH[@]}"} node node_modules/wrangler/bin/wrangler.js pages deploy "$BUILD_DIR/build/client" \
  --project-name=keyshortcut \
  --branch=main \
  --commit-hash="$(git rev-parse HEAD)" \
  --commit-message="$(git log -1 --format=%s)" \
  --commit-dirty=true
