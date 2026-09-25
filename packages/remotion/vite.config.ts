import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      bundleTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'WebReactPlayerRemotion',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@remotion/player',
        '@remotion/web-renderer',
        '@remotion/media',
        '@web-react-player/ui',
        'remotion',
        'lucide-react',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@remotion/player': 'Player',
          '@remotion/web-renderer': 'WebRenderer',
          '@web-react-player/ui': 'WebReactPlayerUI',
          remotion: 'Remotion',
          'lucide-react': 'LucideReact',
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
});
