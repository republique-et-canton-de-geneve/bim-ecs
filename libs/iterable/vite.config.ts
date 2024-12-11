import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve, join } from 'path';

export default defineConfig({
  plugins: [dts({ include: ['src'], tsconfigPath: join(__dirname, 'tsconfig-build.json') })],
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      // fileName: (format) => `index.${format}.js`,
      fileName: `index`,
    },
  },
});
