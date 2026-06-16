# Saarthi V2 — Server

FastAPI backend for Saarthi V2. Runs on port 3001.

## Running on Mac Mini

### Prerequisites

These are already set up if you have V1 running:

- `uv` — Python package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- `cloudflared` — Cloudflare tunnel client (`brew install cloudflare/cloudflare/cloudflared`)
- Cloudflare tunnel credentials in `~/.cloudflared/` (copied over with V1)

### First-time setup

1. **Copy the env file from V1 and add V2-specific keys:**

   ```bash
   cp ../V1/server/.env server/.env
   ```

   Then open `server/.env` and add:

   ```env
   SAARTHI_DEV_USER_ID=cc3835ac-433b-40d3-9a46-72ec37c2f78f
   CRON_SECRET=f81b745b7e9de1e9348beb6c7d20284f28ad7ae7ec7e10eb18e56e5b8380ebe3
   ```

   Everything else (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, etc.) is shared with V1 and already in the file.

2. **That's it.** Dependencies install automatically on first run.

### Running

From the repo root:

```bash
# Local only (same Wi-Fi)
bash server.sh

# With Cloudflare tunnel (accessible via https://api.kritarthanand.com)
bash server.sh --cloudflare
```

### Deploying a code change

```bash
git pull
bash server.sh --cloudflare
```

Ctrl+C stops both the server and the tunnel.

### Verify it's working

```bash
curl http://localhost:3001/health
# {"status":"ok","service":"saarthi-v2"}
```

Or remotely: `curl https://api.kritarthanand.com/health`
