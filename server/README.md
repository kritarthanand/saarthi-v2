# Saarthi V2 — Server

FastAPI backend for Saarthi V2. Runs on port 3001.

## Running on Mac Mini

### Prerequisites

These are already set up if you have V1 running:

- `uv` — Python package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- `cloudflared` — Cloudflare tunnel client (`brew install cloudflare/cloudflare/cloudflared`)
- Cloudflare tunnel credentials in `~/.cloudflared/` (copied over with V1)

### First-time setup

Run the setup script once — it installs all deps, configures pm2, and sets up auto-start on reboot:

```bash
bash setup-server.sh
```

It will prompt you to:
1. Fill in `server/.env` (copy from V1's `server/.env` and add the two V2 keys shown)
2. Copy the Cloudflare tunnel credentials from your dev Mac if not already present

### Deploying a code change

```bash
git pull && pm2 restart saarthi-v2-server
```

### Useful commands

```bash
pm2 status                    # check server + tunnel are running
pm2 logs saarthi-v2-server    # server logs
pm2 logs saarthi-v2-tunnel    # tunnel logs
pm2 restart saarthi-v2-server # restart server after git pull
pm2 restart all               # restart everything
```

### Verify it's working

```bash
curl http://localhost:3001/health
# {"status":"ok","service":"saarthi-v2"}
```

Or remotely: `curl https://api.kritarthanand.com/health`
