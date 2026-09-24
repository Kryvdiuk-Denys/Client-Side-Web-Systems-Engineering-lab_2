import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: 'localhost',
    port: 9000,
    open: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
  build: {
    outDir: '../dist-vite',
    emptyOutDir: true,
  },
});
