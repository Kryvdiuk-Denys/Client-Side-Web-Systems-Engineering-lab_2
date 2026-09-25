import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Client-Side-Web-Systems-Engineering/',
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
    outDir: 'dist-vite',
    emptyOutDir: true,
  },
});
