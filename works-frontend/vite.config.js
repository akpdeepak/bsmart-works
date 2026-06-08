/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
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
    projects: [{
      extends: true,
      test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test-setup.js']
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});