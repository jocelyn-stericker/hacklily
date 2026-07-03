# Deploying the renderer server with systemd

This directory packages the Hacklily renderer server for production as
a **systemd user service**. The same `renderer_server` binary runs as
the frontend-facing coordinator (`serve` mode) and, optionally, keeps a
local pool of warm renderer containers. Other machines can join as
remote `ws-worker` peers to add capacity.

Files:

| file | purpose |
| --- | --- |
| `hacklily-renderer.service` | systemd *user* unit (coordinator + local pool) |
| `env.example`              | configuration + GitHub OAuth secrets, copied to `~/.config/hacklily-renderer/env` |
| `install.sh`               | one-time install: cargo registry, crate, images, unit, lingering |
| `update.sh`                | pull latest crate + images, then restart (installed as `hacklily-renderer-update`) |

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
`~/.cargo/credentials.toml`. The only secrets that *must* live on the
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
- A **TLS-terminating reverse proxy** in front of the coordinator: the
  unit binds plain `ws://` on `WS_PORT` (default 2000) and does **not**
  do TLS. The proxy presents the public `wss://` certificate and
  forwards plain `ws://` to `WS_PORT`. The frontend connects to
  `wss://<your-host>/rpc`; remote `ws-worker` peers connect to the same
  URL.

## One-time install

From a checkout of this repo on the deploy host:

```sh
cd server/renderer-server/deploy
./install.sh
```

That installs the latest published `renderer_server` crate to
`~/.local/bin`, pulls and retags both renderer images, drops the unit
into `~/.config/systemd/user/`, enables lingering (so the service runs
at boot without anyone logged in), and **enables** (but does not start)
the service.

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
`systemctl --user stop` is *not* a failure, so stopping does not loop.
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
JSON-RPC message on connect; there is no shared secret.) A worker host
needs the two renderer images pulled/retagged the same way —
`update.sh` does that, or run the `docker pull`/`docker tag` lines it
contains by hand. You can wrap a worker in its own user unit the same
way, just with a different `ExecStart`.