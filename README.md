# Hacklily

## What is Hacklily?

Hacklily is an online sheet-music editor. You write [LilyPond](http://lilypond.org/) in a Monaco-powered editor in your browser and get a live rendered preview (SVG/PDF/PNG/MIDI). Scores can be saved to and published directly to GitHub, and MusicXML files can be imported via `musicxml2ly`.

[**Open Hacklily →**](https://www.hacklily.org)

## How it works

Hacklily has three parts:

- **Frontend** (`src/`) — a React 18 SPA bundled with webpack. Monaco provides the editor; the preview talks to the renderer over a JSON-RPC 2.0 WebSocket. Three webpack entry points: `index` (the editor), `status` (a public server-status page), and `musicxml2ly` (the MusicXML importer).
- **Renderer** (`server/renderer/` and `server/renderer-unstable/`) — Docker images that build LilyPond from source (stable 2.26, unstable 2.27). Each container runs a warm LilyPond Scheme server (`lily-server.scm`) and a bash frame (`render-impl.bash`) that reads one JSON request per line on stdin and emits one JSON response per line on stdout.
- **Renderer server** (`server/renderer-server/`, Rust) — a coordinator/worker harness that keeps a pool of renderer containers warm, routes render requests (stable vs. unstable, picked from the score's `\version`), enforces an 8s render timeout, and tears down and replaces containers after each request for isolation.

A separate Qt WebSocket coordinator (`server/ws-server/`) is the legacy frontend-facing server; it does OAuth and fans work out to Rust workers. It builds LilyPond images on startup and is slowly being replaced by the Rust renderer server.

## Running locally

You need Node, Qt 5 (with `qmake`), and Docker.

```bash
# frontend (without GitHub integration)
npm install
npm start          # http://localhost:3000, talks to the remote render backend by default

# or, with the local backend:
npm start          # in one shell — REACT_APP_BACKEND_WS_URL defaults to the prod backend
cd server && mkdir -p build && cd build
qmake ../ws-server && make
./ws-server \
  --renderer-path ../renderer \
  --renderer-unstable-path ../renderer-unstable \
  --renderer-docker-tag hacklily-renderer \
  --renderer-unstable-docker-tag hacklily-renderer-unstable \
  --jobs 4 --ws-port 2000
```

`npm start:remote-backend` runs the dev server pointed at the production render backend (`wss://hacklily-render.nettek.ca/rpc`), so you don't need Docker or Qt for most frontend work.

## Status

Hacklily is stable and live at <https://www.hacklily.org>. The renderer is being migrated off the legacy Qt coordinator onto the Rust renderer server.

## Contributing

Source and issue tracker: <https://codeberg.org/jocelyn-stericker/hacklily>

Contributions are welcome. By the terms of the licenses below, client contributions must be GPLv3-or-later and server contributions must be AGPLv3-or-later.

## License

The client (everything outside `server/`) is licensed under the GNU General Public License version 3 or later, with additional permissions (notably for minimized/compact forms and System Libraries) as described in `LICENSE.txt`. The full GPL text is in `LICENSE.txt`.

The server (everything under `server/`) is licensed under the GNU Affero General Public License version 3 or later. The full AGPL text is in `LICENSE.AGPL.txt`.