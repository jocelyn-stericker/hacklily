# Deploying the renderer server with systemd

This directory packages the Hacklily renderer server for production as
a **systemd user service**. The same `renderer_server` binary runs as
the frontend-facing coordinator (`serve` mode) and, optionally, keeps a
local pool of warm renderer containers. Other machines can join as
remote `ws-worker` peers to add capacity.

Files:

| file                                       | purpose                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `hacklily-renderer.service`                | systemd _user_ unit (coordinator + local pool)                                                                         |
| `env.example`                              | configuration + GitHub OAuth secrets, copied to `~/.config/hacklily-renderer/env`                                      |
| `install.sh`                               | one-time install: cargo registry, crate, images, unit, lingering, **and the nginx reverse proxy + Let's Encrypt cert** |
| `update.sh`                                | pull latest crate + images, then restart (installed as `hacklily-renderer-update`)                                     |
| `nginx/render.hacklily.org.conf`           | nginx site: `wss://…/rpc` -> `ws://127.0.0.1:2000`, everything else -> `https://hacklily.org`                          |
| `nginx/render.hacklily.org.http-only.conf` | temporary HTTP-only site used only for the initial Let's Encrypt challenge                                             |

## No credentials on the host

The Codeberg Cargo registry and the Codeberg Container Registry are
**publicly readable**, so neither `install.sh` nor `update.sh` stores a
Codeberg token or runs `docker login`. Verified by probing the endpoints
anonymously:

- Cargo sparse index + `.crate` download → `HTTP 200` with no auth.
- Container registry → `401` with a `WWW-Authenticate: Bearer` challenge
  whose token endpoint hands out **anonymous** tokens; `docker pull`
  performs that exchange automatically, and the manifest fetch succeeds
  (`HTTP 200`).

The only prerequisite is that the owning Codeberg account
(`jocelyn-stericker`) stays **public**. If it is ever made private,
anonymous pulls will start returning `401` and you will need to
`docker login codeberg.org` and add a `read:package` token to
`~/.cargo/credentials.toml`. The only secrets that _must_ live on the
host are the GitHub OAuth values in the `env` file.

## Prerequisites on the host

- **Rust** (rustup) and **cargo**, for `cargo install`.
- **Docker**, reachable by your user. Simplest: add yourself to the
  `docker` group and re-login:
  ```sh
  sudo usermod -aG docker "$USER"
  # log out and back in, then verify:
  docker info >/dev/null && echo ok
  ```
  (The `docker` group is effectively root; if that bothers you, use
  rootless docker instead and set `DOCKER_HOST` in the `env` file.)
- **systemd** with a user manager. On most distros this is default.
- A **TLS-terminating reverse proxy** in front of the coordinator.
  `install.sh --email you@example.org` sets this up for you: it installs
  nginx + certbot, issues a Let's Encrypt certificate for the render
  host, and installs `nginx/render.hacklily.org.conf`, which proxies
  `wss://<domain>/rpc` -> `ws://127.0.0.1:2000` and redirects everything
  else to `https://hacklily.org`. The coordinator's `BIND_ADDRESS`
  default (`127.0.0.1`) means only this local proxy can reach it. See
  [Reverse proxy and DNS](#reverse-proxy-and-dns) below. Pass
  `--no-nginx` to skip this (e.g. if you already run your own reverse
  proxy).

## Firewall (external reach)

Even with `BIND_ADDRESS=127.0.0.1`, lock the box down so only the
ports you intend to expose are reachable from the internet. On Fedora
the right tool is **firewalld** (the default; it drives nftables under
the hood — don't hand-write nftables/iptables rules alongside it).

The intended external surface for a coordinator host is just **ssh
(22/tcp), http (80/tcp), https (443/tcp)** — the coordinator's plain
`ws://` port (`WS_PORT`) is **not** in that list, because the proxy
reaches it on loopback. Add anything else you need day-to-day (e.g.
mosh on `60000–61000/udp`).

```sh
sudo systemctl enable --now firewalld
firewall-cmd --get-default-zone        # confirm your external iface is in it
firewall-cmd --get-active-zones
firewall-cmd --list-all                # see what's currently open

ZONE=$(firewall-cmd --get-default-zone)

# Apply to runtime first (reversible), test a FRESH ssh session, then
# commit. Keep your current session open the whole time.
sudo firewall-cmd --zone=$ZONE --add-service=ssh
sudo firewall-cmd --zone=$ZONE --add-service=http
sudo firewall-cmd --zone=$ZONE --add-service=https
# mosh: prefer the built-in service, fall back to the port range.
sudo firewall-cmd --zone=$ZONE --add-service=mosh 2>/dev/null \
  || sudo firewall-cmd --zone=$ZONE --add-port=60000-61000/udp

# Close anything that shouldn't be public. Run only the lines that
# appeared in --list-all above (e.g. the Fedora Server preset opens
# cockpit on 9090):
sudo firewall-cmd --zone=$ZONE --remove-port=2000/tcp        # the coordinator's plain ws port, if it leaked
sudo firewall-cmd --zone=$ZONE --remove-service=cockpit      # only if you don't use the cockpit web UI

# Verify from ANOTHER machine: 2000 should now refuse, 443/22 open.
# firewalld does not filter loopback, so the proxy on this box still
# reaches 127.0.0.1:WS_PORT.

sudo firewall-cmd --runtime-to-permanent   # snapshot exactly what you tested
sudo firewall-cmd --reload                  # confirm it parses
firewall-cmd --list-all
```

`--runtime-to-permanent` is the clean idiom: it commits the live config
you just verified, so a `--permanent` typo can't diverge from it. It
survives reboot because `enable --now` already started firewalld.

Two caveats:

- **There may be a second firewall in front of you.** If the host is a
  VPS, the provider often has a network-level firewall / security group
  (Hetzner cloud firewall, AWS/GCP security group, …) that is the true
  boundary. Host firewalld is still correct, but check the provider
  panel too so the two agree.
- **`BIND_ADDRESS=127.0.0.1` is the durable fix for the plain-ws
  exposure; the firewall is defense-in-depth.** If firewalld is ever
  disabled (rescue boot, migration), a `0.0.0.0` bind would re-expose
  the unencrypted listener. Keep the default `127.0.0.1` unless you
  have a specific reason to widen it.

## Reverse proxy and DNS

The coordinator speaks plain `ws://` on `127.0.0.1:2000`; browsers and
remote workers reach it over `wss://` on 443 via an nginx reverse proxy
that terminates TLS with a Let's Encrypt certificate. `install.sh`
installs the whole thing; this section is the background and the DNS
you need first.

### DNS

Point the render host at the coordinator box (here `faith.nettek.ca`).
The cleanest is a CNAME (no IP to keep in sync), added wherever the
`hacklily.org` zone is managed:

```dns
; zone: hacklily.org
render.hacklily.org.   3600   IN CNAME   faith.nettek.ca.
```

If you'd rather use flat records (e.g. the `nettek.ca` and `hacklily.org`
zones are on different providers and you don't want a cross-zone CNAME),
find faith's public IPs and add A/AAAA records directly:

```sh
dig +short faith.nettek.ca A      # faith's IPv4
dig +short faith.nettek.ca AAAA    # faith's IPv6, if any
```

```dns
render.hacklily.org.   3600   IN A      FAITH_IPV4
render.hacklily.org.   3600   IN AAAA   FAITH_IPV6   ; only if present
```

DNS must resolve **before** you run `install.sh`'s nginx step: Let's
Encrypt validates by fetching `http://render.hacklily.org/.well-known/
acme-challenge/…`, so the name has to point at this box. `install.sh`
checks this and aborts with a helpful message if it doesn't match.

### What `install.sh --email …` does

1. `dnf install -y nginx certbot policycoreutils-python-utils`.
2. **SELinux**: if enforcing, labels `tcp/2000` as `http_port_t` so
   nginx (`httpd_t`) may `proxy_pass` to `127.0.0.1:2000`. Without this,
   the proxy is silently denied under enforcing mode — a classic Fedora
   gotcha. (Alternative: `sudo setsebool -P httpd_can_network_connect 1`.)
3. Installs the HTTP-only site, starts nginx, and runs
   `certbot certonly --webroot -w /var/www/html -d render.hacklily.org`.
   Webroot (not the nginx plugin) keeps the dependency surface to just
   `certbot`.
4. Replaces the site with `nginx/render.hacklily.org.conf` and reloads.
5. Enables the certbot renewal timer (`certbot-renew.timer` on Fedora,
   `certbot.timer` on Debian/Ubuntu) so renewals are automatic; the `--deploy-hook
"systemctl reload nginx"` saved at issuance reloads nginx after each
   renewal.

### The site, in one breath

`wss://render.hacklily.org/rpc` (exact-match `location = /rpc`) is
proxied to `ws://127.0.0.1:2000` with `Upgrade`/`Connection` headers and
a 75s read/send timeout (comfortably above the 8s render timeout and
the worker ping interval). `https://render.hacklily.org/status` is
proxied to `http://127.0.0.1:9990/status` — a lightweight HTTP endpoint
serving the same JSON as the WebSocket `get_status` RPC, for monitoring
and load-balancer health checks without needing a WebSocket connection.
Every other path on `render.hacklily.org` returns
`301 https://hacklily.org$request_uri` so the render host never serves
the SPA by accident. HTTP on `:80` serves the ACME challenge and
otherwise redirects to HTTPS. The config is self-contained (modern TLS
cipher list inline) so it doesn't depend on certbot-generated include
files.

### Verify

From another machine:

```sh
curl -i https://render.hacklily.org/        # expect 301 -> https://hacklily.org
# a bare GET on /rpc without an Upgrade header: the coordinator's WS
# handshake check typically yields 400/426, which confirms the proxy
# reaches it (a 502/504 would mean it can't):
curl -i https://render.hacklily.org/rpc
curl -i https://render.hacklily.org/status  # expect 200 + JSON
```

### Point the frontend at it

The SPA reads `REACT_APP_BACKEND_WS_URL` at build time. The production
`build` (and `start:remote-backend`) scripts in `package.json` bake
`wss://render.hacklily.org/rpc`, so a normal `npm run build` (as CI
does) produces a bundle that talks to this coordinator. To point a
one-off build elsewhere, override it:

```sh
REACT_APP_BACKEND_WS_URL=wss://render.hacklily.org/rpc npm run build
```

This is a frontend concern, separate from this deploy package.

## One-time install

From a checkout of this repo on the deploy host:

```sh
cd server/renderer-server/deploy
./install.sh --email you@example.org
# --domain render.hacklily.org is the default; --no-nginx skips the
# reverse proxy (e.g. if you run your own).
```

That installs the latest published `renderer_server` crate to
`~/.local/bin`, pulls and retags both renderer images, drops the unit
into `~/.config/systemd/user/`, enables lingering (so the service runs
at boot without anyone logged in), and **enables** (but does not start)
the service. With `--email` it also brings up the nginx reverse proxy
and a Let's Encrypt cert for `render.hacklily.org` (see [Reverse proxy
and DNS](#reverse-proxy-and-dns); have DNS pointing at the box first).

Then edit the config and start it:

```sh
$EDITOR ~/.config/hacklily-renderer/env     # fill in GitHub OAuth
systemctl --user start hacklily-renderer.service
journalctl --user -u hacklily-renderer.service -f
```

The service auto-starts at every boot from now on.

## Day-to-day operations

```sh
# view status / logs
systemctl --user status hacklily-renderer.service
journalctl --user -u hacklily-renderer.service -f

# stop / start / restart (NEVER pulls anything; reuses installed images + binary)
systemctl --user stop    hacklily-renderer.service
systemctl --user start   hacklily-renderer.service
systemctl --user restart hacklily-renderer.service
```

### Updating (low downtime)

`hacklily-renderer-update` (installed by `install.sh` from `update.sh`)
is the one-liner. It:

1. `cargo install`s the latest published crate (overwriting the old
   binary in place — the running process is unaffected until restart),
2. `docker pull`s the latest images from Codeberg and retags them to the
   local names the service uses,
3. `systemctl --user restart`s the service.

```sh
hacklily-renderer-update
```

Restarting the service is the only downtime, and it is bounded by the
render timeout (`RENDER_TIMEOUT_MSEC`, default 8000 ms): on `stop`/
`restart`, systemd sends `SIGTERM`, the coordinator drains in-flight
renders, and exits 0; systemd then starts the new binary, which rebinds
the port and warms a fresh container pool. The unit's `TimeoutStopSec=30`
gives a comfortable margin over the 8s render timeout (see the
`SIGTERM` handling in `server/renderer-server/src/event_loop/mod.rs`).

A plain `systemctl --user restart` (without the update script) reuses
whatever crate version and images are already installed — it never
pulls. That is intentional, so restarts for config changes or after a
crash are fast and offline-safe.

### Crash recovery

`Restart=on-failure` restarts the process on a non-zero exit or a
killing signal (segfault, abort). A clean shutdown after
`systemctl --user stop` is _not_ a failure, so stopping does not loop.
`StartLimitBurst=20` / `StartLimitIntervalSec=60` keep the restart rate
sane if docker is briefly unavailable at boot (`ExecStartPre=docker info`
gates startup on the daemon being reachable).

## Adding a remote worker on another machine

The coordinator dispatches renders to any `renderer_server` that
connects to it in `ws-worker` mode. On a second machine, install Docker
and the crate (the same `cargo install` command, or just run
`install.sh` and ignore the unit), then:

```sh
renderer_server \
  --stable-docker-tag hacklily-renderer:latest \
  --stable-worker-count 2 \
  --unstable-docker-tag hacklily-renderer-unstable:latest \
  --unstable-worker-count 1 \
  --render-timeout-msec 8000 \
  -vv \
  ws-worker wss://<your-coordinator-host>/rpc
```

(Workers identify themselves to the coordinator with an `i_haz_computes`
JSON-RPC message on connect; there is no shared secret.) Note that
workers connect to the **public `wss://` URL on 443**, the same path the
browser uses — they do not talk to `WS_PORT` directly. So the
coordinator's `BIND_ADDRESS=127.0.0.1` and the firewall closing `WS_PORT`
do not interfere with remote workers; the reverse proxy fronts them too.
A worker host needs the two renderer images pulled/retagged the same
way — `update.sh` does that, or run the `docker pull`/`docker tag` lines
it contains by hand. You can wrap a worker in its own user unit the same
way, just with a different `ExecStart`.
