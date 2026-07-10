import fs from "node:fs";
import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
   import { type Plugin } from "vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor-esm";

 // Serve `editor.html` for every URL under /editor (e.g. /editor, /editor/42).
 function htmlFallback(prefix: string, htmlFile: string): Plugin {
   const file = htmlFile.startsWith("/") ? htmlFile : `/${htmlFile}`;
   return {
     name: "html-fallback",
     configureServer(server) {
       // Registered as a pre-middleware: runs before Vite's static/transform stack.
       server.middlewares.use((req, res, next) => {
         const url = (req.url ?? "").split("?")[0];
         // Exact path or anything nested under it.
         if (url === prefix || url.startsWith(prefix + "/") && !url.endsWith(".otf") && !url.endsWith(".xml")) {
           req.url = file; // rewrite so Vite serves editor.html w/ HMR transform
         }
         next();
       });
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
    throw new Error(
      `Could not find ARG LILYPOND_VERSION in ${dockerfilePath}`,
    );
  }
  return match[1].trim();
}

export default defineConfig({
  publicDir: "static",
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        status: "status.html",
        musicxml2ly: "musicxml2ly.html",
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
    "process.env.PLAYGROUND_PREFIX": JSON.stringify("/playground")
  },
  plugins: [
    react(),
    monacoEditorPlugin({
      languageWorkers: ["editorWorkerService"],
    }),
    htmlFallback('/playground', '/playground.html')
  ],
});
