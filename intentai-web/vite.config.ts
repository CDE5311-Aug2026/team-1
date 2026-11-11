import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { usageApiPlugin } from './server/usage/vitePlugin';

export default defineConfig(({ mode }) => ({
  // Local stand-in for the Vercel functions in api/ (reads ADMIN_PASSWORD / USAGE_FILE, .env.local included).
  plugins: [react(), usageApiPlugin(loadEnv(mode, process.cwd(), ''))],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
}));
