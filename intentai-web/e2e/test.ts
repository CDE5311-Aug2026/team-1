import { test as base, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Every spec imports test/expect from here, so no E2E run ever hits the real OpenStreetMap tile servers.
const TILE = fileURLToPath(new URL('./fixtures/tile.png', import.meta.url));

type Fixtures = { tileStub: { fulfilled: number } };

export const test = base.extend<Fixtures>({
  tileStub: async ({}, use) => {
    await use({ fulfilled: 0 });
  },
  page: async ({ page, tileStub }, use) => {
    await page.route('https://tile.openstreetmap.org/**', async (route) => {
      tileStub.fulfilled += 1;
      await route.fulfill({ path: TILE, contentType: 'image/png' });
    });
    await use(page);
  },
});

export { expect };
export type { Page } from '@playwright/test';
