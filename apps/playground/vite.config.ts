import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@web-react-player/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@web-react-player/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
});
