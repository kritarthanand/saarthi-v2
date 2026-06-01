#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/server"

if [ ! -f .env ]; then
  echo "server/.env missing — copy .env.example and fill in values." >&2
  exit 1
fi

exec uv run python main.py
