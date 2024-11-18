import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve, join } from 'path';
import { glob } from 'glob';

export default defineConfig({
  plugins: [dts({ include: ['src'], tsconfigPath: join(__dirname, 'tsconfig-build.json') })],
  build: {
    copyPublicDir: false,
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

      output: {
        // entryFileNames: '[name].js', // Ensures the output files retain their base names
        entryFileNames: (chunkInfo) => {
          console.log('chunkInfo', chunkInfo);
          return `${chunkInfo.name.replace('src\\', '')}.js`;
        }, // Ensures the output files retain their base names
      },
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
