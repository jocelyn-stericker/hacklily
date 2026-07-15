import fs from "node:fs";
import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor-esm";

/**
 * Serve the lilypond-wasm worker bundle (`lily-worker.js` + `lilypond-web.js` +
 * `lilypond.wasm` + `lilypond.data`) from the installed npm package at
 * `/wasm/*`, without copying the ~47 MB of binaries into `static/` (and thus
 * into git). In dev the files are streamed from node_modules; in build they
 * are copied into `dist/wasm/` so the deployed bundle is self-contained.
 *
 * For local wasm development, set `LILYPOND_WASM_DIR` to a local build's
 * dist (or its work/test/web-lily) — e.g.
 *   LILYPOND_WASM_DIR=$PWD/lilypond-wasm/dist npm run dev
 * — and the plugin serves from there instead of node_modules. Unset, it
 * falls back to the published package, so CI/production are untouched.
 *
 * The worker is a classic worker that does `importScripts('lilypond-web.js')`
 * with a relative URL, and emscripten's `locateFile` resolves `lilypond.wasm`
 * and `lilypond.data` against the worker's own URL — so all four files must
 * live in the same `/wasm/` directory.
 */
function lilypondWasmPlugin(): Plugin {
  const pkgDir = process.env.LILYPOND_WASM_DIR
    ? path.resolve(__dirname, process.env.LILYPOND_WASM_DIR)
    : path.resolve(__dirname, "node_modules/@jocelyn-stericker/lilypond-wasm");
  const files = [
    "lily-worker.js",
    "lilypond-web.js",
    "lilypond.wasm",
    "lilypond.data",
  ];
  const prefix = "/wasm/";

  const contentType = (name: string): string => {
    if (name.endsWith(".wasm")) return "application/wasm";
    if (name.endsWith(".js")) return "application/javascript";
    return "application/octet-stream";
  };

  const serve = (
    req: { url?: string },
    res: {
      statusCode: number;
      setHeader: (k: string, v: string) => void;
      end: (d?: unknown) => void;
    },
    next: () => void,
  ): void => {
    const url = req.url || "";
    if (!url.startsWith(prefix)) {
      next();
      return;
    }
    const name = url.slice(prefix.length).split("?")[0];
    if (!files.includes(name)) {
      next();
      return;
    }
    fs.readFile(path.join(pkgDir, name), (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader("Content-Type", contentType(name));
      res.end(data);
    });
  };

  return {
    name: "lilypond-wasm-assets",
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => serve(req, res, next));
    },
    configurePreviewServer: (server) => {
      server.middlewares.use((req, res, next) => serve(req, res, next));
    },
    closeBundle: () => {
      const outDir = path.resolve(__dirname, "dist/wasm");
      fs.mkdirSync(outDir, { recursive: true });
      for (const f of files) {
        fs.copyFileSync(path.join(pkgDir, f), path.join(outDir, f));
      }
    },
  };
}

function readLilyPondVersion(dockerfilePath: string): string {
  const content = fs.readFileSync(
    path.resolve(__dirname, dockerfilePath),
    "utf8",
  );
  const match = content.match(/^ARG LILYPOND_VERSION=(.+)/m);
  if (!match) {
    throw new Error(`Could not find ARG LILYPOND_VERSION in ${dockerfilePath}`);
  }
  return match[1].trim();
}

export default defineConfig({
  publicDir: "static",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        wasm: "index.html",
        status: "status.html",
        musicxml2ly: "musicxml2ly.html",
        satie: "playground.html",
        makelily: "playground.html",
      },
    },
  },
  define: {
    "process.browser": true,
    "process.env.REACT_APP_GITHUB_CLIENT_ID": JSON.stringify(
      process.env.REACT_APP_GITHUB_CLIENT_ID,
    ),
    "process.env.REACT_APP_BACKEND_WS_URL": JSON.stringify(
      process.env.REACT_APP_BACKEND_WS_URL,
    ),
    "process.env.HOMEPAGE": JSON.stringify("https://hacklily.org"),
    "process.env.REACT_APP_STABLE_LILYPOND_VERSION": JSON.stringify(
      readLilyPondVersion("server/renderer/Dockerfile"),
    ),
    "process.env.REACT_APP_UNSTABLE_LILYPOND_VERSION": JSON.stringify(
      readLilyPondVersion("server/renderer-unstable/Dockerfile"),
    ),
    "process.env.PLAYGROUND_PREFIX": JSON.stringify("/satie"),
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routeFileIgnorePattern: "\\.test\\.",
    }),
    tailwindcss(),
    react(),
    monacoEditorPlugin({
      languageWorkers: ["editorWorkerService"],
    }),
    lilypondWasmPlugin(),
  ],
});
