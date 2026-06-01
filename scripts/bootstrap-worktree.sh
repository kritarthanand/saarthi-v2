#!/usr/bin/env bash
#
# bootstrap-worktree.sh — make a fresh worktree usable.
#
# Env-var strategy: canonical files live OUTSIDE every worktree at
#   ${XDG_CONFIG_HOME:-$HOME/.config}/saarthi-v2/
#     ├── app.env       (Expo client — EXPO_PUBLIC_* vars)
#     └── server.env    (FastAPI server — OpenAI / Supabase service key / etc.)
#
# This script symlinks them into the worktree as `.env` and `server/.env`,
# so rotating a key in one place updates every worktree, and new worktrees
# get a working configuration with a single command.
#
# Safe to re-run. First run also seeds the canonical files from the repo's
# .env.example templates and exits non-zero so you fill them in before
# starting the app.

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/saarthi-v2"

canonical_app="$config_dir/app.env"
canonical_server="$config_dir/server.env"

link_app="$repo_root/.env"
link_server="$repo_root/server/.env"

example_app="$repo_root/.env.example"
example_server="$repo_root/server/.env.example"

needs_setup=0

mkdir -p "$config_dir"

seed_if_missing() {
  local canonical="$1"
  local example="$2"
  local label="$3"

  if [ ! -f "$canonical" ]; then
    if [ ! -f "$example" ]; then
      echo "✗ $label: template $example is missing — cannot seed $canonical." >&2
      exit 1
    fi
    cp "$example" "$canonical"
    chmod 600 "$canonical"
    echo "✓ seeded $canonical from $example"
    needs_setup=1
  fi
}

link_into_worktree() {
  local canonical="$1"
  local link="$2"
  local label="$3"

  mkdir -p "$(dirname "$link")"

  # Already pointing at the canonical file → idempotent no-op.
  if [ -L "$link" ] && [ "$(readlink "$link")" = "$canonical" ]; then
    echo "· $label: already linked"
    return
  fi

  # A real file (not a symlink) is the user's local config — don't clobber.
  if [ -e "$link" ] && [ ! -L "$link" ]; then
    echo "✗ $label: $link exists and is not a symlink." >&2
    echo "  Either delete it or merge its contents into $canonical." >&2
    exit 1
  fi

  ln -sfn "$canonical" "$link"
  echo "✓ $label: linked $link -> $canonical"
}

seed_if_missing "$canonical_app"    "$example_app"    "app env"
seed_if_missing "$canonical_server" "$example_server" "server env"

link_into_worktree "$canonical_app"    "$link_app"    "app env"
link_into_worktree "$canonical_server" "$link_server" "server env"

if [ "$needs_setup" -eq 1 ]; then
  cat >&2 <<EOF

──────────────────────────────────────────────────────────────
Canonical env files were created at $config_dir.
Fill them in before running the app or server:

  \$EDITOR $canonical_app
  \$EDITOR $canonical_server

They are symlinked into every worktree, so you only edit them once.
──────────────────────────────────────────────────────────────
EOF
  exit 2
fi

echo "✓ worktree bootstrap complete"
