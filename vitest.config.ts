import { defineConfig } from 'vitest/config'

import viteConfig from './vite.config'

export default defineConfig({
  ...viteConfig,
  test: {
    environment: 'node',
    globals: true,
    silent: 'passed-only',
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
    },
    tags: [
      {
        name: 'e2e',
        description: 'Slow, heavy, end-to-end tests',
        timeout: 120_000,
      },
    ],
    experimental: {
      preParse: true,
    },
  },
})
