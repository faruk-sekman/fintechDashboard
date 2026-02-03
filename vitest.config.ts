import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.spec.ts'],
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
      exclude: [
        '**/*.d.ts',
        'src/main.ts',
        'src/polyfills.ts',
        '**/index.ts',
        '**/shared/models/**/*.ts',
        '**/*.types.ts'
      ]
    }
  },
  poolOptions: {
    threads: {
      minThreads: 1,
      maxThreads: 1
    }
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/app/core'),
      '@shared': path.resolve(__dirname, 'src/app/shared'),
      '@features': path.resolve(__dirname, 'src/app/features')
    }
  }
});
