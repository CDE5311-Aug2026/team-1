import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { usageApiPlugin } from './server/usage/vitePlugin';

/**
 * Dev only, as vercel.json does: version A is the frozen UI1 build in public/ui1. Its own files are under /ui1/assets;
 * the public files it asks for under /ui1 (films, photos) are the app's own; every other /ui1 path is its index.html.
 */
const ui1Fallback: Plugin = {
  name: 'ui1-fallback',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? '';
      if (/^\/ui1(\/|$|\?)/.test(url) && !url.startsWith('/ui1/assets/') && !url.startsWith('/ui1/index.html')) {
        const path = url.split(/[?#]/)[0];
        req.url = /\.[A-Za-z0-9]+$/.test(path) ? url.slice(4) : '/ui1/index.html';
      }
      next();
    });
  },
};

export default defineConfig(({ mode }) => ({
  // Local stand-in for the Vercel functions in api/ (reads ADMIN_PASSWORD / USAGE_FILE, .env.local included).
  plugins: [ui1Fallback, react(), usageApiPlugin(loadEnv(mode, process.cwd(), ''))],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
}));
