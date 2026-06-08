/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime in its own chunk — tiny, long-cached.
          'vendor-react': ['react', 'react-dom'],
          // TanStack Query (data fetching) — changes independently of app code.
          'vendor-query': ['@tanstack/react-query'],
          // Lucide icon tree — large but stable; isolate so app chunks stay small.
          'vendor-icons': ['lucide-react'],
          // Chart library — only loaded when dashboards/performance panels are rendered.
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
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
