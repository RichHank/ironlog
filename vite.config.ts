import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Replaces __BUILD_ID__ in dist/sw.js with a fresh per-build token so each
// deploy invalidates the previous service worker cache automatically.
function swBuildId(): Plugin {
  return {
    name: 'sw-build-id',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js');
      try {
        const src = readFileSync(swPath, 'utf-8');
        const id = Date.now().toString(36);
        writeFileSync(swPath, src.replace(/__BUILD_ID__/g, id));
      } catch { /* sw.js missing — public/ might not contain it */ }
    },
  };
}

export default defineConfig({
  plugins: [react(), swBuildId()],
  base: '/ironlog-vaporwave/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    cssMinify: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
