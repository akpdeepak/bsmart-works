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
