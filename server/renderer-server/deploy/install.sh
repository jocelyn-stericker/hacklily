#!/usr/bin/env bash
# install.sh — one-time setup for a Hacklily coordinator host.
#
# User-level (no root needed for these):
#   1. Registers the Forgejo Cargo registry in ~/.cargo/config.toml
#      (no token: the index is publicly readable).
#   2. `cargo install`s the latest renderer_server into ~/.local/bin.
#   3. Pulls the two renderer Docker images from the Forgejo
#      Container Registry and retags them to the local names the
#      service expects (anonymous pull, no `docker login`).
#   4. Installs ~/.config/hacklily-renderer/env from env.example
#      (without overwriting an existing one) and the systemd user unit.
#   5. Installs the update script to ~/.local/bin/hacklily-renderer-update.
#   6. Enables lingering + enables (but does not start) the service.
#
# System-level (uses sudo; skip with --no-nginx):
#   7. Installs nginx + certbot, issues a Let's Encrypt certificate for
#      the render backend host (webroot), and installs the nginx site
#      that proxies wss://<domain>/rpc -> ws://127.0.0.1:2000 and
#      redirects everything else to https://hacklily.org. Also labels
#      port 2000 for SELinux so nginx (httpd_t) may proxy to it.
#
# No Forgejo credentials are stored on this host. The only secrets are
# the GitHub OAuth values you put in the env file yourself, and the
# Let's Encrypt account key (managed by certbot under /etc/letsencrypt).
#
# Prereqs on the host: rustup/cargo, docker, your user in the `docker`
# group, and sudo for the nginx/certbot steps. See deploy/README.md.
#
# Usage:
#   ./install.sh --email you@example.org
#   ./install.sh --email you@example.org --domain render.hacklily.org
#   ./install.sh --no-nginx            # service only, no reverse proxy
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CONFIG_DIR="${HOME}/.config/hacklily-renderer"
UNIT_DIR="${HOME}/.config/systemd/user"
CARGO_DIR="${HOME}/.cargo"
LOCAL_BIN="${HOME}/.local/bin"

CARGO_REGISTRY=forgejo
CARGO_INDEX="sparse+https://slop.nettek.ca/api/packages/jocelyn-stericker/cargo/"
IMAGE_PREFIX=slop.nettek.ca/jocelyn-stericker

# --- args ---
DOMAIN="render.hacklily.org"
WEBROOT="/var/www/html"
EMAIL=""
INSTALL_NGINX=1
while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2;;
    --webroot) WEBROOT="$2"; shift 2;;
    --email) EMAIL="$2"; shift 2;;
    --no-nginx) INSTALL_NGINX=0; shift;;
    -h|--help)
      sed -n '2,/^set -euo pipefail$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0;;
    *) echo "ERROR: unknown arg: $1" >&2; exit 1;;
  esac
done

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
if [ "$INSTALL_NGINX" -eq 1 ]; then
  command -v sudo >/dev/null || { echo "ERROR: sudo not found (needed for nginx/certbot)." >&2; exit 1; }
  if [ -z "$EMAIL" ] && [ -z "${CERTBOT_EMAIL:-}" ]; then
    echo "ERROR: --email (or \$CERTBOT_EMAIL) is required for Let's Encrypt." >&2
    echo "       Use --no-nginx to skip reverse-proxy setup." >&2
    exit 1
  fi
  EMAIL="${EMAIL:-$CERTBOT_EMAIL}"
fi

echo "==> Registering Forgejo Cargo registry in ${CARGO_DIR}/config.toml"
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

echo "==> Installing renderer_server from Forgejo Cargo registry"
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

if [ "$INSTALL_NGINX" -eq 1 ]; then
  echo "==> Installing nginx reverse proxy for ${DOMAIN}"
  NGINX_DIR="/etc/nginx/conf.d"
  CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

  echo "    installing nginx, certbot, and policycoreutils (for SELinux labels)"
  sudo dnf install -y nginx certbot policycoreutils-python-utils

  # SELinux: nginx runs as httpd_t and may only connect to ports
  # labeled http_port_t. Port 2000 (WebSocket) and port 9990 (HTTP
  # status) are not labeled by default, so proxy_pass to them would
  # be silently denied under enforcing mode. Label them. (If SELinux
  # is disabled this is a no-op via the getenforce guard; semanage
  # is idempotent-ish below.)
  if command -v getenforce >/dev/null && [ "$(getenforce 2>/dev/null)" = "Enforcing" ]; then
    for port in 2000 9990; do
      echo "    SELinux enforcing: labeling tcp/${port} as http_port_t"
      sudo semanage port -a -t http_port_t -p tcp "${port}" 2>/dev/null \
        || sudo semanage port -m -t http_port_t -p tcp "${port}" 2>/dev/null \
        || echo "WARN: could not label port ${port} (already labeled? check: sudo semanage port -l | grep ${port})" >&2
    done
  fi

  sudo mkdir -p "$WEBROOT"
  # nginx must be able to read the webroot for the ACME challenge.
  sudo chcon -R -t httpd_sys_content_t "$WEBROOT" 2>/dev/null || true

  render_conf() {  # $1 = template path, $2 = dest
    sed "s|@@DOMAIN@@|${DOMAIN}|g" "$1" | sudo tee "$2" >/dev/null
  }

  if [ -f "$CERT_PATH" ]; then
    echo "    certificate already present at ${CERT_PATH}; skipping issuance"
  else
    echo "    checking that ${DOMAIN} resolves to this box"
    box_ips="$( { hostname -I 2>/dev/null || true; \
                  curl -fsS4 https://ifconfig.co 2>/dev/null || true; \
                  curl -fsS6 https://ifconfig.co 2>/dev/null || true; } \
                | tr ' ' '\n' | sort -u | grep -v '^$' || true)"
    resolved="$(getent ahosts "$DOMAIN" | awk '{print $1}' | sort -u || true)"
    if [ -z "$resolved" ]; then
      echo "ERROR: ${DOMAIN} does not resolve. Create the DNS record first" >&2
      echo "       (see deploy/README.md), then re-run install.sh." >&2
      exit 1
    fi
    hit=0
    for ip in $resolved; do
      if grep -qx "$ip" <<<"$box_ips"; then hit=1; break; fi
    done
    if [ "$hit" -ne 1 ]; then
      echo "ERROR: ${DOMAIN} resolves to: $(echo "$resolved" | tr '\n' ' ')" >&2
      echo "       but this box's IPs are: $(echo "$box_ips" | tr '\n' ' ')" >&2
      echo "       Point ${DOMAIN} at this box, wait for propagation, then re-run." >&2
      exit 1
    fi
    echo "    ${DOMAIN} -> $(echo "$resolved" | tr '\n' ' ') (matches this box)"

    echo "    installing HTTP-only site so certbot can validate"
    render_conf "${SCRIPT_DIR}/nginx/render.hacklily.org.http-only.conf" \
                "${NGINX_DIR}/render.hacklily.org.conf"
    sudo systemctl enable --now nginx
    sudo nginx -t
    sudo systemctl reload nginx

    echo "    issuing Let's Encrypt certificate (webroot)"
    sudo certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
      --non-interactive --agree-tos --no-eff-email -m "$EMAIL" \
      --deploy-hook "systemctl reload nginx"
  fi

  echo "    installing full site config (HTTPS + /rpc proxy + redirect)"
  render_conf "${SCRIPT_DIR}/nginx/render.hacklily.org.conf" \
              "${NGINX_DIR}/render.hacklily.org.conf"
  sudo nginx -t
  sudo systemctl enable --now nginx
  sudo systemctl reload nginx

  echo "    enabling certbot renewal timer"
  # Fedora ships it as certbot-renew.timer; Debian/Ubuntu as certbot.timer.
  # Try both so this works across distros.
  if systemctl cat certbot-renew.timer >/dev/null 2>&1; then
    sudo systemctl enable --now certbot-renew.timer
    echo "    enabled certbot-renew.timer"
  elif systemctl cat certbot.timer >/dev/null 2>&1; then
    sudo systemctl enable --now certbot.timer
    echo "    enabled certbot.timer"
  else
    echo "WARN: no certbot renewal timer found (neither certbot-renew.timer" >&2
    echo "       nor certbot.timer). Create one or schedule 'certbot renew' yourself." >&2
  fi
fi

cat <<EOF

==> All set. Next steps:

  1. Edit the config (fill in GitHub OAuth if you want save/publish):
       \$EDITOR ${CONFIG_DIR}/env

  2. Start the renderer now (auto-starts at boot from now on):
       systemctl --user start hacklily-renderer.service

  3. Watch the logs:
       journalctl --user -u hacklily-renderer.service -f

  4. Later, to upgrade the crate + images and restart in one shot:
       hacklily-renderer-update
EOF
if [ "$INSTALL_NGINX" -eq 1 ]; then
  cat <<EOF

  5. Reverse proxy is up at wss://${DOMAIN}/rpc -> 127.0.0.1:2000.
     Verify (from elsewhere):
       curl -i https://${DOMAIN}/rpc        # expect 400/426 from the WS upgrade check
       curl -i https://${DOMAIN}/           # expect 301 -> https://hacklily.org
     Renewals are automatic via the certbot renewal timer; nginx reloads on renew.

  6. Point the frontend at it: build the SPA with
       REACT_APP_BACKEND_WS_URL=wss://${DOMAIN}/rpc
     (see deploy/README.md).
EOF
fi
