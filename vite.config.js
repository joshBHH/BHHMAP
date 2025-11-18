import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // For GitHub Pages
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
