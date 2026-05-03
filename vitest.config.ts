import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // tsconfig has `jsx: "preserve"` (Next.js owns the JSX transform at runtime).
  // Vitest/esbuild needs an explicit transform — pick the React 17+ automatic
  // runtime so component test files don't have to import React for JSX.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    globals: true,
    environment: 'node',
    // App unit tests + structural migration specs (Epic 16 / US-K1 added
    // tests/migrations/); excludes Playwright e2e and legacy/reference trees.
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'tests/migrations/**/*.spec.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

