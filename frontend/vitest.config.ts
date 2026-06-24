import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Rolldown-native JSX transform (replaces the removed @vitejs/plugin-react).
  // This `oxc.jsx` surface is vitest 4 / rolldown-specific — revisit when upgrading vitest past 4.x.
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts' },
})
