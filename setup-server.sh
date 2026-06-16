#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TUNNEL_ID="7fbd3deb-d588-469f-8851-af3f68bfe463"

echo "========================================"
echo "  Saarthi V2 Server Setup"
echo "========================================"
echo ""

# ── 1. Homebrew ───────────────────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo "→ Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || true
else
  echo "✓ Homebrew already installed"
fi

# ── 2. uv ─────────────────────────────────────────────────────────────────────
export PATH="$HOME/.local/bin:$PATH"
if ! command -v uv &>/dev/null; then
  echo "→ Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
else
  echo "✓ uv $(uv --version) already installed"
fi

# ── 3. cloudflared ────────────────────────────────────────────────────────────
if ! command -v cloudflared &>/dev/null; then
  echo "→ Installing cloudflared..."
  brew install cloudflare/cloudflare/cloudflared
else
  echo "✓ cloudflared already installed"
fi

# ── 4. pm2 ────────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  echo "→ Installing pm2..."
  npm install -g pm2
else
  echo "✓ pm2 already installed"
fi

echo ""

# ── 5. Server Python dependencies ─────────────────────────────────────────────
echo "→ Installing server Python dependencies..."
cd "$SCRIPT_DIR/server"
uv sync --frozen
echo "✓ Server dependencies installed"
echo ""

# ── 6. .env setup ─────────────────────────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/server/.env" ]; then
  cp "$SCRIPT_DIR/server/.env.example" "$SCRIPT_DIR/server/.env"
  echo "⚠  Created server/.env from example — fill in your keys."
  echo ""
  echo "   Open the file:"
  echo "   nano $SCRIPT_DIR/server/.env"
  echo ""
  echo "   Required (copy from V1's server/.env, then add these two):"
  echo "   SAARTHI_DEV_USER_ID=cc3835ac-433b-40d3-9a46-72ec37c2f78f"
  echo "   CRON_SECRET=f81b745b7e9de1e9348beb6c7d20284f28ad7ae7ec7e10eb18e56e5b8380ebe3"
  echo ""
  read -rp "Press Enter once you've saved the .env file..."
  echo ""
else
  echo "✓ server/.env already exists"
fi

# ── 7. Cloudflare tunnel credentials ──────────────────────────────────────────
CRED_FILE="$HOME/.cloudflared/$TUNNEL_ID.json"
mkdir -p "$HOME/.cloudflared"

if [ ! -f "$CRED_FILE" ]; then
  echo ""
  echo "⚠  Cloudflare tunnel credentials not found."
  echo ""
  echo "   Copy them from your dev Mac:"
  echo ""
  echo "   scp ~/.cloudflared/$TUNNEL_ID.json \\"
  echo "     $(whoami)@$(ipconfig getifaddr en0 2>/dev/null || echo '<mac-mini-ip>'):~/.cloudflared/"
  echo ""
  read -rp "Press Enter once the credentials file is in place..."
  echo ""
fi

if [ ! -f "$CRED_FILE" ]; then
  echo "✗ Credentials still missing at $CRED_FILE"
  echo "  Tunnel will not start without them. Skipping tunnel setup."
  SKIP_TUNNEL=true
fi

# ── 8. Start with pm2 ─────────────────────────────────────────────────────────
echo "→ Starting services with pm2..."

pm2 delete saarthi-v2-server 2>/dev/null || true
pm2 start "$SCRIPT_DIR/server/.venv/bin/uvicorn" \
  --name saarthi-v2-server \
  --cwd "$SCRIPT_DIR/server" \
  -- main:app --host 0.0.0.0 --port 3001

if [ -z "${SKIP_TUNNEL:-}" ]; then
  pm2 delete saarthi-v2-tunnel 2>/dev/null || true
  pm2 start "$(command -v cloudflared)" \
    --name saarthi-v2-tunnel \
    -- tunnel --config "$SCRIPT_DIR/server/cloudflared.yml" run
fi

pm2 save
echo ""

# ── 9. Auto-start on reboot ───────────────────────────────────────────────────
echo "→ Configuring auto-start on reboot..."
echo ""
echo "  Run the following command (pm2 will print it for you):"
echo ""
pm2 startup | grep -E "^sudo " || pm2 startup
echo ""
echo "  Copy and run the 'sudo env ...' line above, then run:"
echo "  pm2 save"
echo ""

# ── Done ──────────────────────────────────────────────────────────────────────
echo "========================================"
echo "  Setup complete!"
echo "========================================"
echo ""
pm2 status
echo ""
echo "  Local:  http://localhost:3001/health"
if [ -z "${SKIP_TUNNEL:-}" ]; then
  echo "  Public: https://api.kritarthanand.com/health"
fi
echo ""
echo "  Useful commands:"
echo "  pm2 status                    → check both processes"
echo "  pm2 logs saarthi-v2-server    → server logs"
echo "  pm2 logs saarthi-v2-tunnel    → tunnel logs"
echo "  pm2 restart saarthi-v2-server → restart after git pull"
echo "  pm2 restart all               → restart everything"
echo ""
