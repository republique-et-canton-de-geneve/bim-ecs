import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve, join } from 'path';

export default defineConfig({
  plugins: [dts({ include: ['src'], tsconfigPath: join(__dirname, 'tsconfig-build.json') })],
  build: {
    copyPublicDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs'],
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['@state-of-geneva/bim-ecs'],
    },
  },
});
