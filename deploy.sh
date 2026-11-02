#!/bin/bash
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
SERVER="145.223.18.170"
USER="root"
APP="fighfoiy"
DOMAIN="fiqhfoiy.com"
PORT="3000"                 # a dedicated box now: nothing else is listening
MAX_MEM="1G"                # 8 GB box of our own, so the old 180M cap is gone
REMOTE="/root/$APP"
DATA_DIR="/root/$APP/data"   # outside $REMOTE/app, which rsync mirrors
SNAPSHOT="$(mktemp -t fighfoiy-seed)"  # consistent DB copy, made with SQLite's backup API
SSH_OPTS="-o StrictHostKeyChecking=no -o ServerAliveInterval=15"

ssh_do() { ssh $SSH_OPTS "$USER@$SERVER" "$@"; }

echo "==> [1/8] Building locally"
# The server has ~180 MB free RAM and would OOM on a Next build, so the build
# happens here and only the standalone output ships.
npm run build >/dev/null
echo "    ✓ standalone: $(du -sh .next/standalone | cut -f1)"

echo "==> [2/8] Guard: no database inside the build artifact"
if [ -d .next/standalone/data ]; then
  echo "    ✗ .next/standalone/data exists — the live DB would ship and later"
  echo "      overwrite production. Check outputFileTracingExcludes. Aborting."
  exit 1
fi
echo "    ✓ no data/ in build"

echo "==> [3/8] Ensuring remote layout"
ssh_do "mkdir -p $REMOTE/app $REMOTE/data $REMOTE/app/public/uploads"

echo "==> [4/8] Shipping app"
# --delete keeps the remote an exact mirror, but uploads are user content that
# lives only on the server, so it is excluded from both the mirror and deletion.
rsync -az --delete --exclude 'public/uploads/***' \
  -e "ssh $SSH_OPTS" .next/standalone/ "$USER@$SERVER:$REMOTE/app/"
rsync -az --delete -e "ssh $SSH_OPTS" .next/static/ "$USER@$SERVER:$REMOTE/app/.next/static/"

echo "==> [5/8] Seeding data + uploads (first deploy only)"
# Never overwrite a database that already has live content.
if ssh_do "test -f $REMOTE/data/fighfoiy.db"; then
  echo "    · database already present — left untouched"
else
  echo "    · no database yet — seeding from local"
  ssh_do "mkdir -p $REMOTE/data"

  # Copy through SQLite's own backup API rather than sending the file.
  # The database runs in WAL mode, so recent writes live in fighfoiy.db-wal and
  # a plain file copy ships a torn snapshot: seeding this way once lost 2
  # articles, 1 book and 751 book pages that were still sitting in the WAL.
  node -e '
    const Database = require("better-sqlite3");
    const src = new Database("data/fighfoiy.db", { readonly: true });
    src.backup(process.argv[1]).then(() => process.exit(0), (e) => {
      console.error(e.message);
      process.exit(1);
    });
  ' "$SNAPSHOT"
  rsync -az -e "ssh $SSH_OPTS" "$SNAPSHOT" "$USER@$SERVER:$REMOTE/data/fighfoiy.db"
  rm -f "$SNAPSHOT"
  [ -f data/.secret ] && rsync -az -e "ssh $SSH_OPTS" data/.secret "$USER@$SERVER:$REMOTE/data/.secret"
  rsync -az -e "ssh $SSH_OPTS" public/uploads/ "$USER@$SERVER:$REMOTE/app/public/uploads/"
fi

echo "==> [6/8] Installing linux-x64 native modules"
# better-sqlite3 and sharp ship compiled binaries. The local build carries
# darwin-arm64 ones, which cannot load on this linux-x64 host, so they are
# replaced with prebuilds fetched on the server. Prebuilds download rather than
# compile, which matters on a box with no memory to spare.
BS_VER=$(node -p "require('./package.json').dependencies['better-sqlite3'].replace(/[^0-9.]/g,'')")
SH_VER=$(node -p "require('./package.json').dependencies['sharp'].replace(/[^0-9.]/g,'')")
ssh_do "cd $REMOTE/app && rm -rf node_modules/@img node_modules/sharp node_modules/better-sqlite3 && \
  npm install --no-save --omit=dev --no-audit --no-fund better-sqlite3@$BS_VER sharp@$SH_VER 2>&1 | tail -3"

echo "==> [7/8] Environment + pm2"
ssh_do "cat > $REMOTE/app/.env.production <<ENV
NODE_ENV=production
PORT=$PORT
HOSTNAME=127.0.0.1
DATA_DIR=$DATA_DIR
ENV
cd $REMOTE/app && \
pm2 delete $APP >/dev/null 2>&1 || true; \
PORT=$PORT HOSTNAME=127.0.0.1 NODE_ENV=production DATA_DIR=$DATA_DIR \
  pm2 start server.js --name $APP --cwd $REMOTE/app \
    --max-memory-restart $MAX_MEM \
    --node-args='--env-file=$REMOTE/app/.env.production' >/dev/null; \
pm2 save >/dev/null 2>&1 || true"

echo "==> [7b/8] Guard: no database inside the mirrored directory"
# A db here means DATA_DIR was ignored and the app seeded its own empty copy,
# which the next deploy would then delete.
if ssh_do "test -f $REMOTE/app/data/fighfoiy.db"; then
  echo "    ✗ $REMOTE/app/data/fighfoiy.db exists — DATA_DIR is not taking effect."
  exit 1
fi
echo "    ✓ app reads $DATA_DIR"

echo "==> [8/8] Caddy + health check"
# The Caddyfile is written whole rather than appended to.
#
# Appending assumed a `security_headers` snippet that existed only on the old
# shared box. On a fresh install the import failed validation, the reload never
# ran, and the distro's default `:80 file_server` block kept serving static
# files — every path but `/` returned 404 while the app itself was fine.
#
# The guard refuses to touch a Caddyfile that serves some other domain, so this
# can never clobber a shared server's config.
OTHER_SITES=$(ssh_do "grep -cE '^[a-z0-9.-]+\.[a-z]+ \{' /etc/caddy/Caddyfile 2>/dev/null | head -1" || echo 0)
if [ "${OTHER_SITES:-0}" -gt 0 ] && ! ssh_do "grep -q '^$DOMAIN {' /etc/caddy/Caddyfile"; then
  echo "    ! /etc/caddy/Caddyfile serves another domain — leaving it alone."
  echo "      Add this by hand:  $DOMAIN { reverse_proxy localhost:$PORT }"
else
  ssh_do "test -f /etc/caddy/Caddyfile && cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-\$(date +%s) || true"
  ssh_do "cat > /etc/caddy/Caddyfile <<'CADDY'
(security_headers) {
	header {
		Strict-Transport-Security \"max-age=31536000; includeSubDomains\"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options SAMEORIGIN
		-Server
	}
}

$DOMAIN {
	import security_headers
	encode zstd gzip
	reverse_proxy localhost:$PORT
}

# Anything reaching the box by IP or another name — used to verify a deploy
# before DNS points here. Serves plain HTTP only; the domain block above is
# what gets the certificate.
:80 {
	import security_headers
	encode zstd gzip
	reverse_proxy localhost:$PORT
}
CADDY"
  if ssh_do "caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1"; then
    ssh_do "systemctl reload caddy"
    echo "    ✓ Caddy config written and reloaded"
  else
    echo "    ! Caddy config invalid — restoring the backup"
    ssh_do "cp \$(ls -t /etc/caddy/Caddyfile.bak-* | head -1) /etc/caddy/Caddyfile"
    exit 1
  fi
fi
sleep 4
ssh_do "curl -s -o /dev/null -w '    local :$PORT -> HTTP %{http_code}\n' http://127.0.0.1:$PORT/ || true; \
  pm2 describe $APP 2>/dev/null | grep -iE 'status|memory' | head -3"

echo ""
echo "==> Done. https://$DOMAIN"
