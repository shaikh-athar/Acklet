import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@acklet/tool-registry': path.resolve(__dirname, 'packages/tool-registry/src/index.ts'),
      '@acklet/tool-shell/helm': path.resolve(__dirname, 'packages/tool-shell/src/helm'),
      '@acklet/tool-shell': path.resolve(__dirname, 'packages/tool-shell/src/index.ts'),
      '@acklet/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
