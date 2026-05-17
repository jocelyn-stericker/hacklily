import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { copy } from 'copy-paste'
import { defineConfig } from 'vite'

const config = defineConfig({
  base: '/braat/',
  resolve: { tsconfigPaths: true },
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
  ],
})

export default config
