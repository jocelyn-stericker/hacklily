## Project Overview

**Hacklily** is an online LilyPond sheet-music editor. The frontend is a React 18 SPA (webpack, Monaco editor) that talks over a JSON-RPC 2.0 WebSocket to a render backend that runs LilyPond inside Docker containers. Scores can be saved to / published to GitHub, and MusicXML can be imported via `musicxml2ly`.

## Common Commands

```bash
# Frontend development
npm install
npm start                      # dev server on :3000 (uses prod render backend by default)
npm start:remote-backend       # same, explicit (wss://hacklily-render.nettek.ca/rpc)

# Build & verify (the build script also runs the full test gate)
npm run build                  # webpack production build into ./dist, then npm test

# Tests / lint / typecheck (also runs as part of `npm run build`)
npm test                       # jest (jsdom) + eslint + tsc --noEmit
```

There is no standalone lint/typecheck script — `npm test` bundles jest + eslint + tsc. Run that to verify the frontend.

For the Rust renderer server:

```bash
cd server/renderer-server
cargo test --locked
cargo build
```

For the legacy Qt coordinator:

```bash
cd server && mkdir -p build && cd build
qmake ../ws-server && make
```

## Tech Stack

- **Frontend**: React 18, webpack 5, TypeScript 4.7, Monaco editor, Aphrodite (CSS-in-JS), Blueprint.js, react-router-dom 6. Babel transpiles (no native TS in webpack); jest uses the same babel config.
- **Renderer**: Docker images built from `server/renderer/Dockerfile` (LilyPond 2.26 stable) and `server/renderer-unstable/Dockerfile` (LilyPond 2.27 unstable). LilyPond is compiled from source for arm64/amd64 parity. Each container runs `lily-server.scm` (a warm Scheme server) framed by `render-impl.bash`.
- **Renderer server** (`server/renderer-server/`): Rust + tokio. Manages a pool of renderer containers, routes requests (stable vs. unstable based on the score's `\version`), enforces an 8s render timeout, and tears down containers after each request for isolation.
- **Legacy coordinator** (`server/ws-server/`): Qt5 WebSocket server. Does GitHub OAuth, fans work to Rust workers, and can build renderer images on startup. Being replaced by the Rust renderer server.

## Layout

```
src/                       Frontend (React SPA)
  index.tsx                Editor entry point
  status/                  Public server-status page entry point
  musicxml2ly/             MusicXML importer entry point
  App.tsx                  Main app shell (1371 lines — the routing/save/publish core)
  Preview.tsx              Rendered-score preview (sanitized SVG/PDF)
  RPCClient.tsx            JSON-RPC 2.0 over WebSocket
  lilypondVersion.ts       Routes scores to stable/unstable by \version
  gitfs.tsx                GitHub save/load via the GitHub API
server/
  renderer/                Stable LilyPond 2.26 Docker image
  renderer-unstable/       Unstable LilyPond 2.27 Docker image
  renderer-server/         Rust coordinator/worker (the new backend)
  ws-server/               Legacy Qt5 WebSocket coordinator
  build/                   gitignored Qt build output
```

## Key Architectural Decisions

1. **Pooled warm containers**: the Rust renderer server keeps a per-version pool of long-lived Docker containers (`stable_worker_count` / `unstable_worker_count` in `Config`) and reuses them across requests; a container is only torn down when a render crashes it or on shutdown (`ReadyRenderContainer` → `RenderContainer::Busy` → `Ready` with `num_renders + 1` in `src/renderer.rs`). The security boundary is instead the per-request **worker fork** inside the container: `lily-server.scm` double-forks a fresh worker per connection (`hacklily:fork-worker`), so user `eval`/`ly:parse-file` runs in a grandchild that exits at end of request; the warm master only accepts and forks. A malicious score that escapes its worker (or kills the master via `killall lilypond`) only takes down that one container, which the manager rebuilds (`emit_recycled_or_new_ready_container` in `src/renderer_manager.rs`).

2. **Warm Scheme server**: inside each container, `lily-server.scm` keeps a LilyPond process listening on TCP 1225. `render-impl.bash` connects per request, writes the source, and reads until EOF (the framing signal). The outer bash timeout (5s) is shorter than the Rust harness timeout (8s) so the container emits its own error before being killed.

3. **Stable vs. unstable routing**: `src/lilypondVersion.ts` parses the score's `\version "x.y.z"` and routes 2.27+ to the unstable renderer, everything else to stable. The Rust renderer server keeps separate pools for each.

4. **Sanitization**: rendered SVG is sanitized with DOMPurify before being shown in the preview (`src/Preview.tsx`, see `src/*.sanitize.test.ts` for the regression tests).

5. **GitHub as storage**: scores are saved to / published from the user's own GitHub repos via `src/gitfs.tsx`. The legacy Qt coordinator handles the OAuth flow.

## CI/CD

CI runs on Forgejo (Codeberg) via `.forgejo/workflows/ci.yaml`, triggered on every push to `main`. It has two jobs:

1. **build-site** — `npm ci`, `npm run build` (which runs jest + eslint + tsc), then deploys `./dist` to Grebedoc for both `www.hacklily.org` and `hacklily.org` via `actions/git-pages@v2`.
2. **build-and-publish-server** — serialized: builds the stable and unstable renderer Docker images (tagged with the local names the test suite expects, plus the Codeberg Container Registry tags), runs `cargo test --locked` (the integration tests spawn containers from the just-built images), then pushes the images to the Codeberg Container Registry (`:latest` and `:0.0.<run_number>`) and publishes the `renderer_server` crate to the Codeberg Cargo registry at a CI-unique version (`0.1.<run_number>`).

Secrets required (Settings → Actions → Secrets): `GREBEDOC_PASSWORD`, `CODEBERG_PACKAGES_TOKEN`.

Forgejo supports GitHub Actions syntax, but compatibility with third-party marketplace actions is not guaranteed — prefer runner-agnostic shell steps where possible.
