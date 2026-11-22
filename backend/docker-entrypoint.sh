#!/bin/sh
set -e
# Valeurs par défaut quand la plateforme (Render) fournit l'adresse publique du service dans RENDER_EXTERNAL_URL.
if [ -n "$RENDER_EXTERNAL_URL" ]; then
  : "${BACKEND_PUBLIC_URL:=$RENDER_EXTERNAL_URL}"
fi
export BACKEND_PUBLIC_URL
if [ -n "$BACKEND_PUBLIC_URL" ]; then
  export STORE_CORS="${STORE_CORS:-${LX_STOREFRONT_URL:-$BACKEND_PUBLIC_URL}}"
  export ADMIN_CORS="${ADMIN_CORS:-$BACKEND_PUBLIC_URL}"
  export AUTH_CORS="${AUTH_CORS:-$BACKEND_PUBLIC_URL${LX_STOREFRONT_URL:+,$LX_STOREFRONT_URL}}"
fi
echo "[lx] Migrations…"
npx medusa db:migrate
# Données initiales, identifiants, zones et compte admin : une seule fois par version (évite de les rejouer à chaque réveil).
SEED_KEY="seed-${LX_SEED_VERSION:-2026-11-22}"
if [ "$LX_FORCE_SEED" != "1" ] && NODE_PATH=/app/node_modules node /usr/local/bin/boot-state.js check "$SEED_KEY"; then
  echo "[lx] Données initiales déjà installées ($SEED_KEY)."
else
  echo "[lx] Données initiales…"
  npx medusa exec ./src/scripts/seed-lx.js
  echo "[lx] Identifiants boutiques…"
  npx medusa exec ./src/scripts/backfill-shop-codes.js
  echo "[lx] Zones de livraison…"
  npx medusa exec ./src/scripts/seed-zones.js
  echo "[lx] Services à domicile…"
  npx medusa exec ./src/scripts/seed-services.js
  echo "[lx] Compte administrateur…"
  npx medusa user -e "${ADMIN_EMAIL:-admin@lx.sn}" -p "${ADMIN_PASSWORD:-ChangeMe!2026}" 2>&1 | tail -1 || true
  NODE_PATH=/app/node_modules node /usr/local/bin/boot-state.js mark "$SEED_KEY" || true
fi
echo "[lx] Démarrage de l'API sur :${PORT:-9000}"
exec npx medusa start
