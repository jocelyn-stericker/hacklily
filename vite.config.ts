import fs from "node:fs";
import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor-esm";

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
        status: "status.html",
        musicxml2ly: "musicxml2ly.html",
        playground: "playground.html",
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
    "process.env.PLAYGROUND_PREFIX": JSON.stringify("/playground"),
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
  ],
});
