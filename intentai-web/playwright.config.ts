import { defineConfig } from '@playwright/test';

// Dedicated port + no reuse: v0 and the Vite dev server both default to 5173, and a
// reused server would silently test the wrong app. E2E runs against the production build.
// Typed locally: the e2e tsconfig does not include @types/node.
declare const process: { env: Record<string, string | undefined>; argv: string[] };
const PORT = Number(process.env.E2E_PORT ?? 4321);

// WebKit has no GPU here: it draws the 3D city in software on the page's main thread, so 6 parallel workers starved
// it and the place sheet missed its 5 s window (8 Nov 2026: failed 1 run in 3 at 6 workers, 3/3 green at 3).
const WEBKIT = process.argv.some((a) => a === '--browser=webkit' || a === 'webkit');

export default defineConfig({
  testDir: './e2e',
  ...(WEBKIT ? { workers: 3 } : {}),
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 390, height: 844 },
    // Optional: point at a preinstalled Chromium when the bundled browser revision is unavailable (CI images).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
    // Tests start as a returning user (onboarding done, test name typed). e2e/onboarding.spec.ts opts out.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://127.0.0.1:${PORT}`,
          localStorage: [
            {
              name: 'intentai:v1:onboarding',
              value: JSON.stringify({ done: true, duration: '3 months – 1 year', topics: ['Work', 'Food', 'Daily life', 'Getting around'] }),
            },
            // past the user test start screen (its own e2e starts from empty storage)
            { name: 'intentai:v1:tester', value: JSON.stringify({ name: 'E2E' }) },
          ],
        },
      ],
    },
  },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    // E2E_REUSE=1: run specs against a preview you started yourself on this port (after `npm run build`). Default off.
    reuseExistingServer: process.env.E2E_REUSE === '1',
    timeout: 120_000,
    // Each port gets its own usage file so Chromium and WebKit runs never share timings.
    env: { USAGE_FILE: `.data/e2e-${PORT}.jsonl` },
  },
});
