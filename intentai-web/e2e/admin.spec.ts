import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Local stand-in password (server/usage/vitePlugin.ts); the preview server stores timings in
// .data/e2e-<port>.jsonl.
const PASSWORD = 'intentai-local';
const FIGMA_BRAND_ORANGES = ['#e4671f', '#e8622c'];

test.beforeEach(async ({ request }) => {
  const res = await request.delete('/api/stats', { headers: { 'x-admin-password': PASSWORD } });
  expect(res.status()).toBe(204);
});

/** Pretends the user switched apps: real hidden state, so the tracker flushes with sendBeacon. */
async function hideTab(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

test('time on pages reaches the dashboard, which passes axe', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page).toHaveURL(/\/ask$/);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Moments', exact: true }).click();
  await expect(page).toHaveURL(/\/moments$/);
  await page.waitForTimeout(600);
  await hideTab(page);

  await page.goto('/admin');
  await page.getByLabel('Admin password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Open dashboard' }).click();
  const summary = page.getByRole('table', { name: 'Time per page' });
  // Beacons land asynchronously; under a full parallel run WebKit can take several seconds.
  await expect
    .poll(async () => {
      await page.getByRole('button', { name: 'Refresh' }).click();
      return summary.getByRole('row').allTextContents();
    }, { timeout: 15_000 })
    // Other specs run in parallel against the same server and add their own visits, so check
    // that each page appears with at least one person rather than an exact count.
    .toEqual(expect.arrayContaining([expect.stringMatching(/^Today[1-9]/), expect.stringMatching(/^Ask[1-9]/), expect.stringMatching(/^Moments[1-9]/)]));
  await expect(page.getByRole('table', { name: 'Landing page' })).toContainText('Today');

  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const problems = violations.flatMap((v) =>
    v.nodes
      .filter((n) => {
        const data = n.any[0]?.data as { fgColor?: string; bgColor?: string } | undefined;
        return !(data && [data.fgColor, data.bgColor].some((c) => FIGMA_BRAND_ORANGES.includes(c ?? '')));
      })
      .map((n) => `${v.id} @ ${n.target.join(' ')}`),
  );
  expect(problems).toEqual([]);
});

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Admin password').fill('nope');
  await page.getByRole('button', { name: 'Open dashboard' }).click();
  await expect(page.getByRole('alert')).toHaveText('Wrong password');
});
