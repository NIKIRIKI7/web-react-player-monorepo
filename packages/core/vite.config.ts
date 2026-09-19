import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'WebReactPlayerCore',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    sourcemap: true,
    minify: false,
  },
});
