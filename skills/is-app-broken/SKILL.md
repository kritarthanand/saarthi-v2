---
name: is-app-broken
description: Run Saarthi's end-to-end health check and return a yes/no verdict.
---

# Is App Broken

Use for a fast yes/no app-health check.

> **V2 readiness:** not runnable yet — V2 is missing
> `scripts/bootstrap-worktree.sh` and the `.maestro/` flow suite. The
> server-start half (`./server.sh`) works today; the simulator + Maestro
> half does not. Add the bootstrap script and at least one Maestro flow
> before invoking this skill.

## Run

1. `git rev-parse --show-toplevel`
2. `bash scripts/bootstrap-worktree.sh`
3. Verify tools and app support.
4. Kill listeners on `3001` and `8081`.
5. Start `./server.sh`.
6. Boot iOS simulator if needed.
7. Start Expo locally.
8. Run Maestro flows from `.maestro/`.
9. Clean up server, Expo, and simulator state.

Bootstrap must run first in fresh worktrees to avoid false negatives from missing env files or dependencies.

## Output

- `✅ App is NOT broken` only if the full flow passes.
- `❌ App IS broken` with the failing step or test otherwise.
- Keep the answer short.
