import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { createManifest } from './manifest.ts';
import pkg from './package.json' with { type: 'json' };

const fromRoot = (path: string) => resolve(import.meta.dirname, path);

/** Emits manifest.json from `manifest.ts` */
function manifest(): Plugin {
  return {
    name: 'bim-ecs:manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(createManifest(pkg.version), null, 2),
      });
    },
  };
}

export default defineConfig({
  // Extension pages are served from the extension origin: relative URLs only
  base: './',
  plugins: [react(), manifest()],
  resolve: {
    // Workspace sources: keep in sync with `paths` of tsconfig.json
    alias: {
      '@bim-ecs/devtools-protocol': fromRoot('../ecs-devtools-plugin/src/protocol.ts'),
      '@state-of-geneva/bim-ecs-devtools-plugin': fromRoot('../ecs-devtools-plugin/src/index.ts'),
      '@state-of-geneva/bim-ecs': fromRoot('../ecs/src/index.ts'),
      '@bim-ecs/iterable': fromRoot('../../libs/iterable/src/index.ts'),
      '@bim-ecs/tuple-collections': fromRoot('../../libs/tuple-collections/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Everything is local to the extension, nothing to preload
    modulePreload: false,
    rollupOptions: {
      // `harness.html` is a development tool: it is not part of the extension
      input: { devtools: fromRoot('devtools.html'), panel: fromRoot('panel.html') },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
