#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

if [[ ! -f .env ]]; then
  echo "Missing $project_dir/.env. Copy .env.example, configure a strong password, and try again." >&2
  exit 1
fi

git pull --ff-only origin main
docker compose up -d --build --remove-orphans
docker compose ps
