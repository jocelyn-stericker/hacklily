# Hacklily

## What is Hacklily?

Hacklily is an online sheet-music editor. You write [LilyPond](http://lilypond.org/) in a Monaco-powered editor in your browser and get a live rendered preview (SVG/PDF/PNG/MIDI). Scores can be saved to and published directly to GitHub, and MusicXML files can be imported via `musicxml2ly`.

[**Open Hacklily →**](https://www.hacklily.org)

## How it works

Hacklily has three parts:

- **Frontend** (`src/`) — a React 18 SPA bundled with webpack. Monaco provides the editor; the preview talks to the renderer over a JSON-RPC 2.0 WebSocket. Three webpack entry points: `index` (the editor), `status` (a public server-status page), and `musicxml2ly` (the MusicXML importer).
- **Renderer** (`server/renderer/` and `server/renderer-unstable/`) — Docker images that build LilyPond from source (stable 2.26, unstable 2.27). Each container runs a warm LilyPond Scheme server (`lily-server.scm`) and a bash frame (`render-impl.bash`) that reads one JSON request per line on stdin and emits one JSON response per line on stdout.
- **Renderer server** (`server/renderer-server/`, Rust) — a single binary that does three jobs: in `serve` mode it is the frontend-facing coordinator (WebSocket JSON-RPC, GitHub OAuth, a public `get_status` page) **and** the local render pool; in `ws-worker` mode it offers compute to a remote coordinator; in `batch` mode it renders test cases from a file. It keeps a pool of renderer containers warm, routes render requests (stable vs. unstable, picked from the score's `\version`), enforces an 8s render timeout, and tears down and replaces containers after each request for isolation. A coordinator with `--stable-worker-count 0 --unstable-worker-count 0` runs in pure-coordinator mode, dispatching renders to remote `ws-worker` peers (and failing requests if none are attached). The legacy Qt5 coordinator that used to live in `server/ws-server/` has been removed.

## Running locally

You need Node and Docker.

```bash
# frontend (without GitHub integration)
npm install
npm start          # http://localhost:3000, talks to the remote render backend by default

# or, with the local backend:
npm start          # in one shell — REACT_APP_BACKEND_WS_URL defaults to the prod backend
cd server/renderer-server
cargo run -- \
  --stable-docker-tag hacklily-renderer \
  --unstable-docker-tag hacklily-renderer-unstable \
  --stable-worker-count 4 --unstable-worker-count 4 \
  --render-timeout-msec 8000 \
  serve --ws-port 2000 --github-client-id "" --github-secret ""
```

`npm start:remote-backend` runs the dev server pointed at the production render backend (`wss://hacklily-render.nettek.ca/rpc`), so you don't need Docker for most frontend work.

## Deployment

The `serve` coordinator listens on **plain TCP** (`--ws-port`) and does **not** terminate TLS itself. In production it sits behind a TLS-terminating reverse proxy: the proxy presents the public `wss://…` certificate and forwards plain `ws://` to the coordinator's port. The coordinator ignores the HTTP path (it upgrades any WebSocket handshake), so the proxy can route `/rpc` or any other path to it. The same reverse proxy that fronts the SPA can do this — just add a WebSocket-capable location block proxying to the coordinator port and ensure it passes through `Upgrade`/`Connection` headers.

Graceful shutdown: send the process **SIGTERM** (this is what systemd, k8s, and `docker stop` send). The coordinator drains in-flight renders and exits 0; because a single render can take up to the render timeout (~8s), set the supervisor's termination grace period to exceed that so in-flight user renders aren't cut off mid-deploy. (SIGINT / Ctrl-C does the same thing for interactive use.)

A ready-to-use **systemd user service** (unit file, env template, install + update scripts, and docs) lives in [`server/renderer-server/deploy/`](server/renderer-server/deploy/). It runs the `serve` coordinator, restarts on crashes, pulls the published crate and renderer images from the public Codeberg registries (no credentials stored on the host), and updates with a single `hacklily-renderer-update` command that pulls the latest versions and restarts. See [`server/renderer-server/deploy/README.md`](server/renderer-server/deploy/README.md) for install and usage.

## Status

Hacklily is stable and live at <https://www.hacklily.org>. The renderer is fully on the Rust renderer server, which now serves the frontend directly (the legacy Qt5 coordinator has been retired).

## Contributing

Source and issue tracker: <https://codeberg.org/jocelyn-stericker/hacklily>

Contributions are welcome. By the terms of the licenses below, client contributions must be GPLv3-or-later and server contributions must be AGPLv3-or-later.

## License

The client (everything outside `server/`) is licensed under the GNU General Public License version 3 or later, with additional permissions (notably for minimized/compact forms and System Libraries) as described in `LICENSE.txt`. The full GPL text is in `LICENSE.txt`.

The server (everything under `server/`) is licensed under the GNU Affero General Public License version 3 or later. The full AGPL text is in `LICENSE.AGPL.txt`.