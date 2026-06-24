import { defineConfig } from 'vitest/config'

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts' },
})
