import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.tsx'],
    include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'src/components/Didongyi3D/**',
      'node_modules',
      'dist',
      '.git',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/pages/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/types/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/components/Didongyi3D/**',
        'src/test/**',
        'src/**/*.d.ts',
      ],
    },
  },
})
