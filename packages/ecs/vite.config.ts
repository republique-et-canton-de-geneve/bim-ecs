import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve, join } from 'path';
import { glob } from 'glob';

export default defineConfig({
  plugins: [dts({ include: ['src'], tsconfigPath: join(__dirname, 'tsconfig-build.json') })],
  build: {
    copyPublicDir: false,
    sourcemap: true,
    // lib: {
    //   // entry: resolve(__dirname, 'src/index.ts'),
    //   // fileName: (format) => `index.${format}.js`,
    //   fileName: `index`,
    //   formats: ['es'],
    // },
    outDir: 'dist',
    rollupOptions: {
      preserveEntrySignatures: 'exports-only',
      input: getEntryPoints(),

      output: [
        {
          // ESM output
          format: 'es',
          entryFileNames: (chunkInfo) => `${chunkInfo.name.replace('src\\', '')}.js`,
          dir: 'dist', // Output directory for ESM
          preserveModules: true, // Keeps the module structure for tree-shaking
          exports: 'named',
        },
        {
          // CJS output
          format: 'cjs',
          entryFileNames: (chunkInfo) => `${chunkInfo.name.replace('src\\', '')}.cjs`,
          dir: 'dist', // Output directory for CJS
          preserveModules: true,
          exports: 'named',
        },
      ],
    },

    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
    },
  },
});

// Dynamically find all `index.ts` files in the `src` folder
function getEntryPoints() {
  const files = glob.sync('src/**/index.ts');
  return files.reduce(
    (entries, file) => {
      entries[file.replace(/^src\//, '').replace(/\.ts$/, '')] = resolve(__dirname, file);
      return entries;
    },
    {} as Record<string, string>,
  );
}
