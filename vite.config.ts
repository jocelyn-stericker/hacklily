import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import type { Logger } from 'babel-plugin-react-compiler'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Dev-only plugin: send `Cache-Control: no-store` for all script module
 * responses so WebKit doesn't cache them.
 *
 * https://predr.ag/blog/debugging-safari-if-at-first-you-succeed/
 *
 * Under COEP `require-corp`, WebKit requires `Cross-Origin-Resource-Policy`
 * on every script load. Vite's dev server sends it on `200 OK` responses
 * but omits it on `304 Not Modified` (per RFC 9110 §15.4.5). WebKit fails
 * to reuse the cached CORP header from the prior `200`, so it blocks the
 * load with "Worker load was blocked by Cross-Origin-Embedder-Policy" (for
 * worker scripts) or silently fails the import (for nested module imports
 * inside workers). This is a known WebKit bug:
 * https://bugs.webkit.org/show_bug.cgi?id=245346
 *
 * `no-store` prevents the 304 entirely — every request gets a fresh `200`
 * with all headers. The cost is re-sending modules on each load, which is
 * negligible in dev. Production is unaffected (Vite bundles everything,
 * so there are no per-module requests).
 *
 * Applied to all JS/TS/MJS responses (not just `?worker_file`) because the
 * bug affects both worker entrypoints and their nested module imports.
 *
 * Not needed in prod, because we have a web worker, and the caching seems
 * to work okay there.
 */
function noStoreScriptDevPlugin(): Plugin {
  return {
    name: 'braat:no-store-script-dev',
    apply: 'serve',
    configureServer(server) {
      // Vite sets Cache-Control: no-cache and an ETag on every response,
      // then sends the body. To override for scripts, hook res.writeHead
      // (called right before the body is sent) to swap the header. We
      // detect script responses by Content-Type rather than URL path, so
      // we catch Vite's special URLs like /@vite/client too.
      server.middlewares.use((_req, res, next) => {
        const origWriteHead = res.writeHead.bind(res)
        res.writeHead = function (
          this: typeof res,
          ...args: unknown[]
        ): typeof res {
          const ct = res.getHeader('Content-Type')
          if (
            typeof ct === 'string' &&
            (ct.includes('javascript') || ct.includes('text/jsx'))
          ) {
            res.setHeader('Cache-Control', 'no-store')
            res.removeHeader('Etag')
          }
          return origWriteHead(
            ...(args as unknown as Parameters<typeof origWriteHead>),
          )
        }
        next()
      })
    },
  }
}

/**
 * Dev-only plugin: serve `/references/*` from the local (gitignored) media
 * copy at `./media/references`. The production app loads these clips from
 * media.braat.app (see `mediaConfig.ts`); flipping `USE_LOCAL_MEDIA` there
 * makes it request them same-origin instead, which this middleware answers.
 *
 * Harmless when `USE_LOCAL_MEDIA` is false: the app never requests these
 * paths (it hits media.braat.app directly), so the middleware is a no-op.
 * Supports range requests so `<audio>` seeking works.
 */
function localMediaDevPlugin(): Plugin {
  const mediaRoot = fileURLToPath(
    new URL('./media/references', import.meta.url),
  )
  const contentType = (p: string) =>
    p.endsWith('.json')
      ? 'application/json'
      : p.endsWith('.mp3')
        ? 'audio/mpeg'
        : 'application/octet-stream'
  return {
    name: 'braat:local-media-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split('?')[0]
        if (!rawUrl?.startsWith('/references/')) return next()
        const rel = decodeURIComponent(rawUrl.slice('/references/'.length))
        const filePath = path.join(mediaRoot, rel)
        // Refuse anything that escapes the media root.
        if (
          filePath !== mediaRoot &&
          !filePath.startsWith(mediaRoot + path.sep)
        )
          return next()
        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) return next()
          res.setHeader('Content-Type', contentType(rawUrl))
          res.setHeader('Accept-Ranges', 'bytes')
          const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '')
          if (range) {
            const start = range[1] ? Number(range[1]) : 0
            const end = range[2] ? Number(range[2]) : stat.size - 1
            if (start > end || end >= stat.size) {
              res.statusCode = 416
              res.setHeader('Content-Range', `bytes */${stat.size}`)
              return res.end()
            }
            res.statusCode = 206
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
            res.setHeader('Content-Length', end - start + 1)
            return fs.createReadStream(filePath, { start, end }).pipe(res)
          }
          res.setHeader('Content-Length', stat.size)
          fs.createReadStream(filePath).pipe(res)
        })
      })
    },
  }
}

/**
 * React Compiler bails out of optimizing a whole component/hook when it hits
 * something it can't handle (e.g. `try/finally`, which it lists as a "Todo").
 * These bailouts are silent -- the code still runs, just unmemoized -- and the
 * `react-hooks` lint rules don't flag this class. That silence hides real bugs:
 * a component that relied on the compiler recomputing derived state can break
 * (or, conversely, code that mutates state in place can break *because* it gets
 * compiled). Surface every skip/error as a build warning so they're visible.
 */
const seenCompilerBailouts = new Set<string>()
const reactCompilerLogger: Logger = {
  logEvent(filename, event) {
    let reason: string
    if (event.kind === 'CompileSkip') {
      reason = event.reason
    } else if (event.kind === 'CompileError') {
      reason = String(event.detail.reason)
    } else {
      return
    }
    const line = event.fnLoc?.start.line
    const where = `${filename ?? '<unknown>'}${line ? `:${line}` : ''}`
    const key = `${where} ${reason}`
    if (seenCompilerBailouts.has(key)) return
    seenCompilerBailouts.add(key)
    console.warn(
      `\n⚠️  [react-compiler] not optimized: ${where}\n    ${reason}\n`,
    )
  },
}

const config = defineConfig({
  base: '/',
  resolve: {
    tsconfigPaths: true,
    conditions: ['onnxruntime-web-use-extern-wasm'],
  },
  build: {
    rollupOptions: {
      // Multi-page build: each HTML entry boots the same SPA, but ships its own
      // <head> so the page's metadata is visible before JS runs (we don't SSR).
      // The host serves /ipa from ipa.html and /practice from practice.html.
      input: {
        main: 'index.html',
        ipa: 'ipa.html',
        practice: 'practice.html',
      },
    },
  },
  server: {
    allowedHosts: ['lily.local'],
    // SharedArrayBuffer requires cross-origin isolation. Production headers set in public/_headers
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  plugins: [
    noStoreScriptDevPlugin(),
    localMediaDevPlugin(),
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePattern: '\\.test\\.',
    }),
    viteReact(),
    babel({
      presets: [reactCompilerPreset({ logger: reactCompilerLogger })],
    }),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,ico,mjs,wasm,ort}'],
        maximumFileSizeToCacheInBytes: 4000000,
      },
      manifest: {
        name: 'Braat',
        short_name: 'Braat',
        start_url: '.',
        display: 'standalone',
        theme_color: '#8ace00',
        background_color: '#ffffff',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
          { src: 'logo192.png', type: 'image/png', sizes: '192x192' },
          { src: 'logo512.png', type: 'image/png', sizes: '512x512' },
        ],
      },
    }),
  ],
})

export default config
