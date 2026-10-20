import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { paths } from '../src/routes';

// The 3D view for real: the bundled EARTH ONLINE lite page boots in the iframe (WebGL through SwiftShader here), keeps only
// the time bar (time, weather, sound) and the landmark cards, talks to Nearby, and contacts no other host.
// Slow on software WebGL (a few minutes when other tests share the CPU), so it runs once, on the Merlion.
declare const process: { env: Record<string, string | undefined> };
test.use({
  launchOptions: {
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  },
});

test('place detail → 3D: the area loads, the card opens, cards link back, leaving frees it', async ({ page }) => {
  test.setTimeout(600_000);
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname !== 'localhost') external.push(u.hostname);
  });
  await page.goto(paths.nearbyPlace('curated:sg-merlion-park'));
  await page.getByRole('button', { name: '3D' }).click();
  await expect(page.getByText(/Loading 3D/)).toBeVisible();
  // "ready" comes from the 3D page once the area is built
  await expect(page.getByText(/Loading 3D/)).toBeHidden({ timeout: 240_000 });
  await expect(page.getByText(/Still loading/)).toHaveCount(0);

  const f = page.frameLocator('iframe[title="3D view around Merlion Park"]');
  await expect(f.locator('#timebar')).toBeVisible();
  await expect(f.locator('#wxBtn')).toBeVisible();
  await expect(f.locator('#sndBtn')).toBeVisible();
  for (const hidden of ['#panel', '#dock', '#stats']) await expect(f.locator(hidden)).toBeHidden();
  // the place's own card is open (and needs no link back)
  await expect(f.locator('section.sgc h2')).toContainText('鱼尾狮', { timeout: 60_000 });
  await expect(page.getByText(/Card open/)).toHaveCount(0);

  // the 3D page loaded only the area around the point
  const frame = page.frames().find((fr) => fr.url().includes('/earth-online/sg/lite.html'))!;
  const stats = await frame.evaluate(() => (window as unknown as { SGLite: { stats(): Record<string, number> } }).SGLite.stats());
  expect(stats.tilesBuilt).toBeGreaterThan(0);
  expect(stats.tilesBuilt).toBeLessThanOrEqual(25);
  expect(stats.landmarks).toBeLessThan(stats.of);

  // another landmark's card inside 3D → a link to that place in Nearby
  await frame.evaluate(() => (window as unknown as { SGCard: { open(k: string): boolean } }).SGCard.open('fullerton'));
  // software WebGL keeps the 3D page busy: its messages can take a few seconds
  await expect(page.getByText(/Card open: The Fullerton Building/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('link', { name: 'Open place →' })).toHaveAttribute('href', '/nearby/place/curated%3Asg-fullerton-building');

  // Nearby around the 3D view (the 3D page itself is the dataset's own UI); same accepted brand-orange exception as e2e/a11y.spec.ts
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('iframe').analyze();
  const summary = violations.flatMap((v) =>
    v.nodes.flatMap((n) => {
      const data = n.any[0]?.data as { fgColor?: string; bgColor?: string } | undefined;
      if (data && [data.fgColor, data.bgColor].some((c) => ['#e4671f', '#e8622c'].includes(c ?? ''))) return [];
      return [`${v.id} @ ${n.target.join(' ')}`];
    }),
  );
  expect(summary).toEqual([]);

  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(external).toEqual([]);
});
