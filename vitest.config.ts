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
  },
})
