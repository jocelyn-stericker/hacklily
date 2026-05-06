import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { copy } from 'copy-paste'
import { defineConfig } from 'vite'

const config = defineConfig({
  base: '/braat/',
  resolve: { tsconfigPaths: true },
  server: {
    allowedHosts: ['lily.local'],
  },
  plugins: [
    devtools({
      consolePiping: {
        enabled: false,
      },
      editor: {
        name: 'neovim command',
        open: async (path, lineNumber, columnNumber) => {
          copy(`e ${path}|call cursor(${lineNumber}, ${columnNumber})`)
        },
      },
    }),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          enabled: true,
          outputPath: 'index.html',
        },
      },
    }),
    viteReact(),
  ],
})

export default config
