import { fileURLToPath, URL } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: [
          'src/components/**/*.{ts,vue}',
          'src/composables/**/*.{ts,vue}',
          'src/stores/**/*.{ts,vue}',
          'src/router/**/*.{ts,vue}',
          'src/utils/**/*.{ts,vue}',
        ],
        exclude: [
          'src/main.ts',
          'src/assets/**',
          '**/*.d.ts',
          '**/*.test.ts',
          '**/*.spec.ts',
        ],
      },
    },
  })
);
