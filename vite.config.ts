import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { copy } from 'copy-paste'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const config = defineConfig({
  base: '/',
  resolve: {
    tsconfigPaths: true,
    conditions: ['onnxruntime-web-use-extern-wasm'],
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
    devtools({
      consolePiping: {
        enabled: false,
      },
      editor: {
        name: 'neovim command',
        open: async (filePath, lineNumber, columnNumber) => {
          copy(`e ${filePath}|call cursor(${lineNumber}, ${columnNumber})`)
        },
      },
    }),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
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
