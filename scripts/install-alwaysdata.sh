#!/usr/bin/env bash
set -euo pipefail

# Single install/update script for alwaysdata.
# Run on the alwaysdata server:
#   bash scripts/install-alwaysdata.sh
# Optional:
#   REPO=https://github.com/yourname/yourrepo.git APP_DIR=$HOME/www/my-quiz bash scripts/install-alwaysdata.sh

REPO="${REPO:-https://github.com/fawazming/quiz.git}"
APP_DIR="${APP_DIR:-$HOME/www/ict-quiz-arena}"
BRANCH="${BRANCH:-main}"

echo "== MSSN ICT Quiz Arena · alwaysdata install =="
echo "Repository: $REPO"
echo "App folder: $APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
else
  echo "Updating existing checkout..."
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi

cd "$APP_DIR"

if [ ! -f dist/index.html ]; then
  echo "ERROR: dist/index.html is missing from the repository."
  echo "Build locally with 'npm run build' and commit the dist folder before deploying."
  exit 1
fi

echo "Installing production dependencies only..."
npm ci --omit=dev
npm cache clean --force || true

if [ ! -f .env ]; then
  cp .env.example .env
  echo
  echo "Created .env. Edit it before the first start:"
  echo "  nano $APP_DIR/.env"
  echo "Set JWT_SECRET, ADMIN_PASSWORD, SCOREKEEPER_PASSWORD and DB_PATH."
fi

echo
echo "Disk usage:"
du -sh "$APP_DIR" 2>/dev/null || true
du -sh "$APP_DIR/node_modules" 2>/dev/null || true

cat <<EOF

Install complete.

Next:
  1. Edit .env:
       nano $APP_DIR/.env
  2. In alwaysdata create a Node.js site:
       Working directory: $APP_DIR
       Command: node $APP_DIR/server/index.js
       Node.js version: 24
  3. Open https://YOURACCOUNT.alwaysdata.net
  4. Restart the site from the alwaysdata panel after future updates.

Optional demo candidates:
  cd $APP_DIR && node scripts/seed-demo.js
EOF
