import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';
import { playwright } from '@vitest/browser-playwright';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/*'],
      // @ts-ignore
      root: fileURLToPath(new URL('./', import.meta.url)),
      browser: {
        provider: playwright({
          launchOptions: {
            channel: 'chrome',
          },
        }),
        instances: [{ browser: 'chromium' }],
      },
    },
  }),
);
