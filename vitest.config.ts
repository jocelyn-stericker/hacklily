import { defineConfig } from 'vitest/config'

import viteConfig from './vite.config'

// https://github.com/vitest-dev/vitest/issues/8757
const execArgv = Object.prototype.hasOwnProperty.call(
  globalThis,
  'localStorage',
)
  ? ['--no-webstorage']
  : []

// Expose gc for memory tests (*.memory.test.ts). Harmless for other tests;
// just adds globalThis.gc which they never call.
execArgv.push('--expose-gc')

export default defineConfig({
  ...viteConfig,
  test: {
    environment: 'node',
    globals: true,
    silent: 'passed-only',
    execArgv,
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
