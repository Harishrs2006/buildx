#!/usr/bin/env bash
# Pull the latest main and rebuild only what changed. Safe to run any time (also from GitHub Actions).
set -euo pipefail
cd /opt/sthiva
git fetch --quiet origin main
git reset --hard --quiet origin/main
cd deploy/vultr
[ -f .env ] || { echo "Missing deploy/vultr/.env (copy .env.example)"; exit 1; }
docker compose --env-file .env up -d --build --remove-orphans
docker image prune -f >/dev/null
docker compose --env-file .env ps
