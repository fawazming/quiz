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
REFRESH_DB=0
for arg in "$@"; do
  case "$arg" in
    --refresh-db) REFRESH_DB=1 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

echo "== MSSN ICT Quiz Arena · alwaysdata install =="
if [ "$REFRESH_DB" = "1" ]; then
  echo "WARNING: --refresh-db will back up and DELETE the current database."
  echo "Stop the alwaysdata Node.js site before continuing."
fi
echo "Repository: $REPO"
echo "App folder: $APP_DIR"

# Preserve .env across git resets. It is intentionally untracked.
ENV_KEEP=""
if [ -f "$APP_DIR/.env" ]; then
  ENV_KEEP="$APP_DIR/.env.deploy-keep"
  cp "$APP_DIR/.env" "$ENV_KEEP"
  echo "Keeping existing .env"
fi

if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
else
  echo "Updating existing checkout..."
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi

cd "$APP_DIR"

if [ -n "$ENV_KEEP" ] && [ ! -f .env ]; then
  mv "$ENV_KEEP" .env
fi
[ -n "$ENV_KEEP" ] && rm -f "$ENV_KEEP" || true

if [ ! -f dist/index.html ]; then
  echo "ERROR: dist/index.html is missing from the repository."
  echo "Build locally with 'npm run build' and commit the dist folder before deploying."
  exit 1
fi

echo "Installing production dependencies only..."
npm ci --omit=dev
npm cache clean --force || true

if [ -f data/quiz.db ] && [ "$REFRESH_DB" != "1" ]; then
  echo "Backing up the current database..."
  node scripts/db-backup.js || echo "WARNING: automatic backup failed. Check data/ permissions."
fi

if [ "$REFRESH_DB" = "1" ]; then
  echo "Refreshing database (a backup is taken first)..."
  node scripts/db-refresh.js --yes
fi

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

Database refresh (optional, stops the current data):
  bash $APP_DIR/scripts/install-alwaysdata.sh --refresh-db

  Backups are written to data/backups. Stop the alwaysdata site before refreshing.

Optional demo candidates:
  cd $APP_DIR && node scripts/seed-demo.js
EOF
