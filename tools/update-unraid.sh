#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

if [[ ! -f .env ]]; then
  echo "Missing $project_dir/.env. Copy .env.example, configure a strong password, and try again." >&2
  exit 1
fi

git pull --ff-only origin main

if docker compose version >/dev/null 2>&1; then
  docker compose up -d --build --remove-orphans
  docker compose ps
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d --build --remove-orphans
  docker-compose ps
else
  host_data_dir="$(sed -n 's/^HOST_DATA_DIR=//p' .env | tail -n 1)"
  if [[ -z "$host_data_dir" ]]; then
    host_data_dir="$project_dir/data"
  fi

  mkdir -p "$host_data_dir"
  docker build -t our-wines:local .

  if docker container inspect our-wines >/dev/null 2>&1; then
    docker rm -f our-wines
  fi

  docker run -d \
    --name our-wines \
    --restart unless-stopped \
    -p 3000:3000 \
    -v "$host_data_dir:/app/data" \
    --env-file "$project_dir/.env" \
    -e DATA_DIR=/app/data \
    our-wines:local

  docker ps --filter name=our-wines
fi
