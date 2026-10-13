import { defineConfig } from '@playwright/test';

// Dedicated port + no reuse: v0 and the Vite dev server both default to 5173, and a
// reused server would silently test the wrong app. E2E runs against the production build.
// Typed locally: the e2e tsconfig does not include @types/node.
declare const process: { env: Record<string, string | undefined> };
const PORT = Number(process.env.E2E_PORT ?? 4321);

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    // Tests start as a returning user (onboarding done). e2e/onboarding.spec.ts opts out.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${PORT}`,
          localStorage: [
            {
              name: 'intentai:v1:onboarding',
              value: JSON.stringify({ done: true, duration: '3 months – 1 year', topics: ['Work', 'Food', 'Daily life', 'Getting around'] }),
            },
          ],
        },
      ],
    },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
