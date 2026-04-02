import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

const sourceDirectory = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(sourceDirectory),
    },
  },
  server: {
    host: true,
    port: 4173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**/*'],
  },
  lint: {
    ignorePatterns: ['dist/**', 'playwright-report/**', 'test-results/**'],
  },
  fmt: {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
  },
});
