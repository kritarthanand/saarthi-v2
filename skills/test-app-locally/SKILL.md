---
name: test-app-locally
description: TODO — port from V1. Boots the Saarthi local backend server and Expo iOS simulator side-by-side for development.
---

# Test App Locally

**TODO: port from V1.**

- V1 version assumed: open two iTerm panes — one running `./server.sh` (FastAPI on :3001), one running `npm run ios` (Expo on :8081), with auth env wired up.
- V2 needs: same shape but pointing at V2's `server.sh` and Expo SDK 56 toolchain. The V2 server today only exposes `/health`, so the "is the backend healthy" check is the only useful smoke test until more routes land.

Until ported, run the two commands manually:

```
bash server.sh        # FastAPI shell
npm run ios           # Expo + simulator
```
