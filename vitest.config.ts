import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        'vitest.config.ts',
        'tsconfig.json',
        'public/**',
        'temp/**',
        'src/cli.ts', // CLI entry point - hard to test
        'src/index.ts', // Entry point
        'src/api-server.ts', // API server - requires express setup
        'src/converter.ts', // Converter - requires puppeteer setup
        'src/renderer.ts', // PDF renderer - requires puppeteer setup
        'src/config.ts', // Configuration file - no logic to test
        'src/word-renderer.ts', // Word renderer - requires docx setup
        'src/word-converter.ts', // Word converter - requires docx setup
        'web/main.ts', // Frontend code - requires browser environment
      ],
      include: ['src/**/*.ts'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
});
