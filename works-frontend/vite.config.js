/// <reference types="vitest/config" />
/* global process */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Dev server: proxy /api → the backend so the app works behind a single forwarded port
  // (a browser previewing :5173 can't reach the container's :8080 directly). Activates only when
  // the app uses a relative API base (VITE_API_BASE_URL=/api/v1); the default absolute base for
  // plain local dev is unaffected.
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080', changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';
          if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-query';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    // Playwright browser specs live in e2e/ and run via `npm run test:e2e`, not Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      // Coverage thresholds for new components. Raise incrementally as the suite grows.
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60
      },
      include: ['src/components/works/**/*.{js,jsx}'],
      exclude: ['src/components/works/**/*.stories.{js,jsx}']
    },
  }
});
