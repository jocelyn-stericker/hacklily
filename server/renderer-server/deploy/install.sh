#!/usr/bin/env bash
# install.sh — one-time setup for the hacklily-renderer systemd user
# service on a coordinator host.
#
# What this does:
#   1. Registers the Codeberg Cargo registry in ~/.cargo/config.toml
#      (no token: the index is publicly readable).
#   2. `cargo install`s the latest renderer_server into ~/.local/bin.
#   3. Pulls the two renderer Docker images from the Codeberg
#      Container Registry and retags them to the local names the
#      service expects (anonymous pull, no `docker login`).
#   4. Installs ~/.config/hacklily-renderer/env from env.example
#      (without overwriting an existing one) and the systemd user unit.
#   5. Installs the update script to ~/.local/bin/hacklily-renderer-update.
#   6. Enables lingering (so the user service runs at boot without an
#      active login) and enables (but does not start) the service.
#
# No Codeberg credentials are stored on this host. The only secrets are
# the GitHub OAuth values you put in the env file yourself.
#
# Prereqs on the host: rustup/cargo, docker, and your user in the
# `docker` group (or rootless docker). See deploy/README.md.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CONFIG_DIR="${HOME}/.config/hacklily-renderer"
UNIT_DIR="${HOME}/.config/systemd/user"
CARGO_DIR="${HOME}/.cargo"
LOCAL_BIN="${HOME}/.local/bin"

CARGO_REGISTRY=codeberg
CARGO_INDEX="sparse+https://codeberg.org/api/packages/jocelyn-stericker/cargo/"
IMAGE_PREFIX=codeberg.org/jocelyn-stericker

echo "==> Sanity-checking prerequisites"
command -v cargo >/dev/null || { echo "ERROR: cargo not found. Install rustup." >&2; exit 1; }
command -v docker >/dev/null || { echo "ERROR: docker not found." >&2; exit 1; }
command -v systemctl >/dev/null || { echo "ERROR: systemctl not found." >&2; exit 1; }
docker info >/dev/null 2>&1 || {
  echo "ERROR: cannot reach the docker daemon." >&2
  echo "       Is the docker service running and is your user in the 'docker' group?" >&2
  echo "       Re-login after: sudo usermod -aG docker \$USER" >&2
  exit 1
}

echo "==> Registering Codeberg Cargo registry in ${CARGO_DIR}/config.toml"
mkdir -p "$CARGO_DIR"
touch "${CARGO_DIR}/config.toml"
if grep -q 'registries.'"${CARGO_REGISTRY}" "${CARGO_DIR}/config.toml"; then
  echo "    already present, leaving as-is"
else
  {
    printf '\n[registries.%s]\n' "$CARGO_REGISTRY"
    printf 'index = "%s"\n' "$CARGO_INDEX"
  } >> "${CARGO_DIR}/config.toml"
  echo "    added"
fi

echo "==> Installing renderer_server from Codeberg Cargo registry"
cargo install --force --registry "$CARGO_REGISTRY" --root "${HOME}/.local" renderer_server

echo "==> Pulling renderer Docker images and retagging locally"
docker pull "${IMAGE_PREFIX}/hacklily-renderer:latest"
docker tag  "${IMAGE_PREFIX}/hacklily-renderer:latest" hacklily-renderer:latest
docker pull "${IMAGE_PREFIX}/hacklily-renderer-unstable:latest"
docker tag  "${IMAGE_PREFIX}/hacklily-renderer-unstable:latest" hacklily-renderer-unstable:latest

echo "==> Installing configuration, unit, and update script"
mkdir -p "$CONFIG_DIR" "$UNIT_DIR" "$LOCAL_BIN"
if [ ! -f "${CONFIG_DIR}/env" ]; then
  install -m 600 "${SCRIPT_DIR}/env.example" "${CONFIG_DIR}/env"
  echo "    wrote ${CONFIG_DIR}/env (from env.example) — EDIT IT BEFORE STARTING"
else
  echo "    ${CONFIG_DIR}/env already exists, not overwriting"
fi
install -m 644 "${SCRIPT_DIR}/hacklily-renderer.service" "${UNIT_DIR}/hacklily-renderer.service"
install -m 755 "${SCRIPT_DIR}/update.sh" "${LOCAL_BIN}/hacklily-renderer-update"

echo "==> Enabling lingering so the user service runs at boot"
loginctl enable-linger "$USER" 2>/dev/null || loginctl enable-linger 2>/dev/null || {
  echo "WARN: could not enable lingering. Run: loginctl enable-linger \$USER" >&2
}

echo "==> Reloading the user manager and enabling the service"
systemctl --user daemon-reload
systemctl --user enable hacklily-renderer.service

cat <<EOF

==> All set. Next steps:

  1. Edit the config (fill in GitHub OAuth if you want save/publish):
       \$EDITOR ${CONFIG_DIR}/env

  2. Start it now (it will auto-start at boot from now on):
       systemctl --user start hacklily-renderer.service

  3. Watch the logs:
       journalctl --user -u hacklily-renderer.service -f

  4. Later, to upgrade the crate + images and restart in one shot:
       hacklily-renderer-update

EOF