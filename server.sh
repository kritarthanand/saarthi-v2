#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# uv installs to ~/.local/bin — add it to PATH if not already there
export PATH="$HOME/.local/bin:$PATH"

# ── Parse flags ───────────────────────────────────────────────────────────────
USE_CLOUDFLARE=false
for arg in "$@"; do
  case $arg in
    --cloudflare) USE_CLOUDFLARE=true ;;
  esac
done

# ── Check deps ────────────────────────────────────────────────────────────────
if ! command -v uv &>/dev/null; then
  echo "ERROR: uv is not installed. Run: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

if [ "$USE_CLOUDFLARE" = true ] && ! command -v cloudflared &>/dev/null; then
  echo "ERROR: cloudflared is not installed. Run: brew install cloudflare/cloudflare/cloudflared"
  exit 1
fi

# ── Check env file ────────────────────────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/server/.env" ]; then
  echo "ERROR: server/.env missing — copy server/.env.example and fill in values."
  exit 1
fi

# ── Install Python deps if needed ─────────────────────────────────────────────
if [ ! -d "$SCRIPT_DIR/server/.venv" ]; then
  echo "Installing server dependencies..."
  (cd "$SCRIPT_DIR/server" && uv sync --frozen)
fi

# ── Start Cloudflare tunnel (optional) ───────────────────────────────────────
CLOUDFLARED_YML="$SCRIPT_DIR/server/cloudflared.yml"

if [ "$USE_CLOUDFLARE" = true ]; then
  if [ ! -f "$CLOUDFLARED_YML" ]; then
    echo "ERROR: server/cloudflared.yml not found"
    exit 1
  fi

  TUNNEL_URL="https://api.kritarthanand.com"
  echo "Starting Cloudflare tunnel → $TUNNEL_URL"
  cloudflared tunnel --config "$CLOUDFLARED_YML" run >/tmp/saarthi-v2-tunnel.log 2>&1 &
  TUNNEL_PID=$!

  trap "echo ''; echo 'Stopping...'; kill $TUNNEL_PID 2>/dev/null; exit 0" EXIT INT TERM

  echo -n "Waiting for tunnel"
  for i in $(seq 1 15); do
    if grep -q "Registered tunnel connection" /tmp/saarthi-v2-tunnel.log 2>/dev/null; then break; fi
    if ! kill -0 $TUNNEL_PID 2>/dev/null; then
      echo ""
      echo "ERROR: cloudflared failed. Check /tmp/saarthi-v2-tunnel.log"
      cat /tmp/saarthi-v2-tunnel.log
      exit 1
    fi
    echo -n "."
    sleep 1
  done
  echo ""
  echo "Tunnel live — $TUNNEL_URL"
  echo ""
else
  echo "Starting server on http://localhost:3001"
  echo "→ For remote access run: bash server.sh --cloudflare"
  echo ""
fi

# ── Start FastAPI server ──────────────────────────────────────────────────────
cd "$SCRIPT_DIR/server"
exec uv run uvicorn main:app --host 0.0.0.0 --port 3001 --reload
