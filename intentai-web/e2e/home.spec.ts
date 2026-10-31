import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test';
import type { Page } from './test';

// Home (Discovery redesign, 31 Oct 2026): a Three.js map card of URA's planning areas and a Three.js Cover Flow deck
// that goes region → planning area → place. Invisible DOM cards, badges and pins sit over the drawn ones, so tests use
// roles as on any page.

const BRAND_ORANGES = ['#e4671f', '#e8622c']; // accepted contrast exception, as in a11y.spec.ts

type Rect = { x: number; y: number; width: number; height: number };

const deck = (page: Page, label: string) => page.getByRole('region', { name: label, exact: true });
const card = (page: Page, name: string) => page.getByRole('group', { name, exact: true });
const tabs = (page: Page) => page.getByRole('navigation', { name: 'Primary' });

async function box(page: Page, locator: ReturnType<Page['locator']>): Promise<Rect> {
  const b = await locator.boundingBox();
  expect(b, 'element not rendered').not.toBeNull();
  return b!;
}

async function openHome(page: Page, search = '') {
  await page.goto(`/${search}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeAttached();
}

test('load: the five URA regions, Central current, no outside requests at region level', async ({ page }) => {
  const outside: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') outside.push(r.url());
  });
  await openHome(page);
  await expect(deck(page, 'Regions').getByRole('group')).toHaveCount(5);
  await expect(card(page, 'Central')).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('application', { name: /planning areas/ })).toBeVisible();
  expect(outside).toEqual([]);
});

test('dragging the Cover Flow deck settles on another region; the map badge follows', async ({ page }) => {
  await openHome(page);
  await expect(card(page, 'Central')).toHaveAttribute('aria-current', 'true');
  await deck(page, 'Regions').locator('canvas').waitFor();
  const box = (await deck(page, 'Regions').boundingBox())!;
  const y = box.y + box.height * 0.4;
  await page.mouse.move(box.x + box.width * 0.75, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width * (0.75 - i * 0.04), y);
  await page.mouse.up();
  await expect(card(page, 'Central')).not.toHaveAttribute('aria-current', 'true');
  await expect(page).not.toHaveURL(/r=central/);
  await expect(page.locator('button[aria-pressed="true"]').first()).not.toHaveAccessibleName('Region 1: Central');
});

test('a numbered region on the map selects its card', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Region 5: West' }).click();
  await expect(card(page, 'West')).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(/r=west/);
});

test('region → areas → places → place page, and Back returns to the same card', async ({ page }) => {
  // Settled cards: a click mid-animation can land on the neighbouring card.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await page.getByRole('button', { name: 'Region 5: West' }).click();
  await page.getByRole('button', { name: 'Explore West' }).click();
  await expect(page.getByLabel('Where you are')).toHaveText('Singapore › West');
  await expect(card(page, 'Clementi')).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'See 11 places' }).click();
  await expect(page.getByLabel('Where you are')).toHaveText('Singapore › West › Clementi');
  // Cover Flow keeps only the cards near the middle in the page; the live line counts them all.
  await expect(page.getByRole('region', { name: 'Nearby places' }).locator('[aria-live]')).toContainText('1 of 11');
  // The selected place has a pin on the map.
  await expect(page.locator('button[data-pin][aria-pressed="true"]')).toBeVisible();
  const first = page.getByRole('region', { name: 'Nearby places' }).locator('[aria-current="true"]');
  const name = (await first.getAttribute('aria-label'))!;
  await first.getByRole('button', { name: /in Nearby$/ }).click();
  await expect(page).toHaveURL(/\/nearby\/place\//);
  await page.goBack();
  await expect(card(page, name)).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Back to West areas' }).click();
  await page.getByRole('button', { name: 'Back to regions' }).click();
  await expect(card(page, 'West')).toHaveAttribute('aria-current', 'true');
});

test('a check-in shows on the deck: the area turns yellow, then green with a tick when all are done', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page, '?lvl=areas&r=north-east&a=am');
  await expect(card(page, 'Ang Mo Kio').getByRole('img', { name: 'not visited yet' })).toBeVisible();
  // Ang Mo Kio has one place: check in there.
  await page.getByRole('button', { name: 'See 1 place' }).click();
  await page.getByRole('region', { name: 'Nearby places' }).getByRole('button', { name: /in Nearby$/ }).click();
  await page.getByRole('button', { name: 'Check in' }).click();
  await page.goBack();
  await page.getByRole('button', { name: 'Back to North-East areas' }).click();
  await expect(card(page, 'Ang Mo Kio').getByRole('img', { name: 'all checked in' })).toBeVisible();
  await expect(card(page, 'Ang Mo Kio').getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: 'Back to regions' }).click();
  await expect(card(page, 'North-East').getByRole('img', { name: 'exploring' })).toBeVisible();
});

for (const width of [320, 390]) {
  test(`at ${width}px the deck sits above the tab bar, nothing scrolls sideways, the tabs stay on top`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await openHome(page);
    const bar = await box(page, tabs(page));
    const middle = await box(page, card(page, 'Central'));
    expect(middle.y + middle.height, 'deck clears the tab bar').toBeLessThanOrEqual(bar.y + 1);
    expect(middle.x, 'middle card inside the screen').toBeGreaterThanOrEqual(0);
    expect(middle.x + middle.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const header = await box(page, page.getByRole('link', { name: /day streak/ }));
    expect(header.y).toBeGreaterThanOrEqual(0);
  });
}

test('Home has no WCAG A/AA violations except the brand orange', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await page.waitForTimeout(600);
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = violations.flatMap((v) =>
    v.nodes.flatMap((n) => {
      const data = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
      if (data && [data.fgColor, data.bgColor].some((c) => BRAND_ORANGES.includes(c ?? ''))) return [];
      const colours = data?.fgColor ? ` ${data.fgColor} on ${data.bgColor} = ${data.contrastRatio}:1` : '';
      return [`${v.id}${colours} @ ${n.target.join(' ')}`];
    }),
  );
  expect(summary).toEqual([]);
});
