import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  envDir: resolve(__dirname),
  build: {
    rollupOptions: {
      external: ['fs', 'path', 'electron', 'electron-store']
    },
    copyPublicDir: false
  },
  publicDir: false
});
