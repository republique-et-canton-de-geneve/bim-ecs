import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve, join } from 'path';
import { glob } from 'glob';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    dts({ include: ['src'], tsconfigPath: join(__dirname, 'tsconfig-build.json') }),
    viteStaticCopy({
      targets: [
        {
          src: 'package.json',
          dest: '.', // Destination relative to `outDir`
        },
      ],
    }),
  ],
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: (format) => `index.${format}.js`,
      // fileName: `index`,
      formats: ['es', 'cjs'],
    },
    outDir: 'dist',
    // rollupOptions: {
    //   external: ['bim-ecs'],
    //   preserveEntrySignatures: 'exports-only',
    //
    //   output: [
    //     {
    //       // ESM output
    //       format: 'es',
    //       entryFileNames: (chunkInfo) => `${chunkInfo.name.replace('src\\', '')}.js`,
    //       dir: 'dist', // Output directory for ESM
    //       preserveModules: true, // Keeps the module structure for tree-shaking
    //       exports: 'named',
    //     },
    //     {
    //       // CJS output
    //       format: 'cjs',
    //       entryFileNames: (chunkInfo) => `${chunkInfo.name.replace('src\\', '')}.cjs`,
    //       dir: 'dist', // Output directory for CJS
    //       preserveModules: true,
    //       exports: 'named',
    //     },
    //   ],
    // },

    // lib: {
    //   entry: resolve(__dirname, 'src/index.ts'),
    // },
  },
});
