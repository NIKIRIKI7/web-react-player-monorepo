import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
  },
  resolve: {
    alias: {
      '@web-react-player/core': resolve(projectRoot, '../../../packages/core/src/index.ts'),
      '@web-react-player/ui': resolve(projectRoot, '../../../packages/ui/src/index.ts'),
    },
  },
});
