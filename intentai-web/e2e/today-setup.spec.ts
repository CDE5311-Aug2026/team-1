import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Topic picker after onboarding, and the culture tabs on Today. No Figma frames, so no geometry.

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BRAND_ORANGES = ['#e4671f', '#e8622c']; // accepted contrast exception, as in a11y.spec.ts
const YOUTUBE = /youtube(-nocookie)?\.com|ytimg\.com/;

async function axeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).exclude('iframe').analyze();
  return violations.flatMap((v) =>
    v.nodes.flatMap((n) => {
      const data = n.any[0]?.data as { fgColor?: string; bgColor?: string } | undefined;
      if (data && [data.fgColor, data.bgColor].some((c) => BRAND_ORANGES.includes(c ?? ''))) return [];
      return [`${v.id} @ ${n.target.join(' ')}`];
    }),
  );
}

async function pick(page: Page, labels: string[]) {
  // Tile names start with the label, then the survey name.
  for (const label of labels) await page.getByRole('button', { name: new RegExp('^' + label + ' ') }).click();
}

test('picking 3 topics sets Today, and a reload keeps it', async ({ page }) => {
  await page.goto('/today-setup');
  await pick(page, ['History', 'Foods', 'UNESCO']);
  await page.getByRole('button', { name: 'Show my Today' }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page.getByRole('tab')).toHaveText(['Foods', 'UNESCO', 'History']);
  await expect(page.getByRole('button', { name: /^Play video:/ })).toBeVisible();
});

test('Default sets the survey default', async ({ page }) => {
  await page.goto('/today-setup');
  await expect(page.getByText('You can change these anytime in My Space.')).toBeVisible();
  await page.getByRole('button', { name: 'Default', exact: true }).click();
  await expect(page.getByRole('tab')).toHaveText(['Foods', 'Monuments', 'Festivals']);
});

test('My Space retake is pre-filled and Cancel changes nothing', async ({ page }) => {
  await page.goto('/my-space');
  await expect(page.getByText('Foods, Monuments, Festivals', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: "Change Today's Topics" }).click();
  await expect(page.getByRole('button', { name: /^Festivals / })).toHaveAttribute('aria-pressed', 'true');
  await pick(page, ['Festivals', 'History']);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/my-space$/);
  await expect(page.getByText('Foods, Monuments, Festivals', { exact: true })).toBeVisible();
});

test('videos load nothing from YouTube until play is tapped', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (YOUTUBE.test(r.url())) requests.push(r.url());
  });
  await page.route(YOUTUBE, (r) => r.abort());
  await page.goto('/');
  const play = page.getByRole('button', { name: /^Play video:/ });
  await expect(play).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  expect(requests).toEqual([]);

  await play.click();
  await expect(page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/"]')).toHaveCount(1);
  expect(requests.length).toBeGreaterThan(0);
});

test('the picker fits a 320px phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/today-setup');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const width of [390, 1440]) {
  test(`collapsed article cards are all one height at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    for (const tab of await page.getByRole('tab').all()) {
      await tab.click();
      const cards = page.getByRole('tabpanel').getByRole('article');
      await expect(cards).toHaveCount(3);
      const heights = await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
      expect(new Set(heights).size, `${await tab.textContent()}: ${heights}`).toBe(1);
    }
    // Opening one card grows only that card.
    const cards = page.getByRole('tabpanel').getByRole('article');
    const before = await cards.nth(1).evaluate((el) => el.getBoundingClientRect().height);
    await cards.first().getByRole('button', { name: 'Read more' }).click();
    const after = await cards.nth(1).evaluate((el) => el.getBoundingClientRect().height);
    expect(after).toBeLessThanOrEqual(before);
  });
}
