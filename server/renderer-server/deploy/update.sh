#!/usr/bin/env bash
# hacklily-renderer-update
#
# Pull the latest published renderer_server crate and renderer Docker
# images, then restart the hacklily-renderer user service so it picks
# them up. Safe to re-run. No credentials required: the Forgejo Cargo
# and container registries are publicly readable (the owning account
# must remain public).
#
# Restarting the service itself never pulls anything; this script is
# the only thing that does. So a plain `systemctl --user restart
# hacklily-renderer` reuses whatever images and binary are installed.
#
# Install via deploy/install.sh (which copies this script to
# ~/.local/bin/hacklily-renderer-update). Or run it directly from the
# repo: server/renderer-server/deploy/update.sh
set -euo pipefail

CARGO_REGISTRY=forgejo
IMAGE_PREFIX=slop.nettek.ca/jocelyn-stericker
SERVICE=hacklily-renderer.service

STABLE_REMOTE="${IMAGE_PREFIX}/hacklily-renderer:latest"
UNSTABLE_REMOTE="${IMAGE_PREFIX}/hacklily-renderer-unstable:latest"
STABLE_LOCAL="hacklily-renderer:latest"
UNSTABLE_LOCAL="hacklily-renderer-unstable:latest"

echo "==> Installing latest renderer_server from Forgejo Cargo registry"
# No --version: cargo resolves the highest version in the registry
# index. --force overwrites an existing install. --root controls the
# install location so the unit's ExecStart path stays stable.
cargo install --force --registry "$CARGO_REGISTRY" --root "${HOME}/.local" renderer_server

echo "==> Pulling latest renderer Docker images and retagging locally"
docker pull "$STABLE_REMOTE"
docker tag  "$STABLE_REMOTE" "$STABLE_LOCAL"
docker pull "$UNSTABLE_REMOTE"
docker tag  "$UNSTABLE_REMOTE" "$UNSTABLE_LOCAL"

echo "==> Restarting ${SERVICE}"
systemctl --user restart "$SERVICE"

echo "==> Done. Status:"
systemctl --user status --no-pager "$SERVICE" || true
