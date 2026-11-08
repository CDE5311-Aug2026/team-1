import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test';
import type { Page } from './test';

// Home (Discovery redesign, 31 Oct 2026): a map card (regions and planning areas on a light Three.js map over EARTH
// ONLINE's ground picture; places in the EARTH ONLINE 3D city) and a Three.js Cover Flow deck: region → area → place.
// Invisible DOM cards sit over the drawn ones, so tests use roles as on any page.

const BRAND_ORANGES = ['#e4671f', '#e8622c']; // accepted contrast exception, as in a11y.spec.ts

type Rect = { x: number; y: number; width: number; height: number };

const deck = (page: Page, label: string) => page.getByRole('region', { name: label, exact: true });
const card = (page: Page, name: string) => page.getByRole('group', { name, exact: true });
const tabs = (page: Page) => page.getByRole('navigation', { name: 'Primary' });
// v2 (plan C6): the nav landmark has no height of its own; the floating pill and the round Search button hang up from
// it. The Search button spans the bar's full height, so its box is the bar's top edge.
const tabBarSearch = (page: Page) => tabs(page).getByRole('button', { name: 'Search', exact: true });

// The deck's "Explore West" / "See 11 places" buttons are the keyboard and screen-reader way in (1 px, clipped); a
// finger taps the middle card itself, which does the same (CoverFlow3D: a tap on the selected card enters it).
const enter = (page: Page, name: string) => card(page, name).click();

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

test('dragging the Cover Flow deck settles on another region', async ({ page }) => {
  await openHome(page);
  await expect(card(page, 'Central')).toHaveAttribute('aria-current', 'true');
  await deck(page, 'Regions').locator('canvas').waitFor();
  const box = (await deck(page, 'Regions').boundingBox())!;
  const y = box.y + box.height * 0.4;
  await page.mouse.move(box.x + box.width * 0.75, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width * (0.75 - i * 0.04), y);
  await page.mouse.up();
  // a fling can carry the deck far enough that Central's card leaves the page (WebKit), so ask which card is current
  await expect(deck(page, 'Regions').locator('[aria-current="true"]')).toHaveCount(1);
  await expect(deck(page, 'Regions').locator('[aria-current="true"]')).not.toHaveAttribute('aria-label', 'Central');
  await expect(page).not.toHaveURL(/r=central/);
});

test('a numbered region on the map selects its card', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: /^Region 5: West/ }).click();
  await expect(card(page, 'West')).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(/r=west/);
});

test('region → areas → places → the place pops up over Home; Back closes it on the same card', async ({ page }) => {
  // the place level loads the EARTH ONLINE 3D city (up to 19 MB) and leaving it tears the scene down; under a full
  // parallel run that can hold the page for many seconds (WebKit draws it with software WebGL, slower still)
  test.slow();
  // Settled cards: a click mid-animation can land on the neighbouring card.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await page.getByRole('button', { name: /^Region 5: West/ }).click();
  await expect(card(page, 'West').getByRole('button', { name: 'Explore West' })).toBeAttached();
  await enter(page, 'West');
  await expect(page.getByLabel('Where you are')).toHaveText('Singapore › West');
  await expect(card(page, 'Clementi')).toHaveAttribute('aria-current', 'true');
  await expect(card(page, 'Clementi').getByRole('button', { name: 'See 11 places' })).toBeAttached();
  await enter(page, 'Clementi');
  await expect(page.getByLabel('Where you are')).toHaveText('Singapore › West › Clementi');
  // Cover Flow keeps only the cards near the middle in the page; the live line counts them all.
  await expect(page.getByRole('region', { name: 'Nearby places' }).locator('[aria-live]')).toContainText('1 of 11');
  const first = page.getByRole('region', { name: 'Nearby places' }).locator('[aria-current="true"]');
  const name = (await first.getAttribute('aria-label'))!;
  await expect(first.getByRole('button', { name: /in Nearby$/ })).toBeAttached();
  // the keyboard way in: Enter on the focused middle card (the check-in test below taps it)
  await first.press('Enter');
  const sheet = page.getByRole('dialog', { name });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: /Check in/ })).toBeVisible();
  await expect(page).toHaveURL(/open=/);
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(card(page, name)).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Back to West areas' }).click();
  await page.getByRole('button', { name: 'Back to regions' }).click();
  await expect(card(page, 'West')).toHaveAttribute('aria-current', 'true');
});

test('a check-in shows on the deck: the area turns yellow, then green with a tick when all are done', async ({ page }) => {
  // the place level loads the EARTH ONLINE 3D city (up to 19 MB) and leaving it tears the scene down; under a full
  // parallel run that can hold the page for many seconds (WebKit draws it with software WebGL, slower still)
  test.slow();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page, '?lvl=areas&r=north-east&a=am');
  await expect(card(page, 'Ang Mo Kio').getByRole('img', { name: 'not visited yet' })).toBeVisible();
  // Ang Mo Kio has one place: check in there.
  await expect(card(page, 'Ang Mo Kio').getByRole('button', { name: 'See 1 place' })).toBeAttached();
  await enter(page, 'Ang Mo Kio');
  await page.getByRole('region', { name: 'Nearby places' }).locator('[aria-current="true"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Check in' }).click();
  await page.goBack();
  await page.getByRole('button', { name: 'Back to North-East areas' }).click();
  await expect(card(page, 'Ang Mo Kio').getByRole('img', { name: 'all checked in' })).toBeVisible();
  await expect(card(page, 'Ang Mo Kio').getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: 'Back to regions' }).click();
  await expect(card(page, 'North-East').getByRole('img', { name: 'exploring' })).toBeVisible();
});

for (const width of [320, 390]) {
  // v2 (boards 05/11): Home scrolls (chips, map, deck, Challenges, Picked for you) under a floating tab bar, so "the deck
  // sits above the tab bar" means: scrolled to, the deck is clear of the bar and not covered by it or the sticky header;
  // the page's foot clears the bar; the bar stays on top; nothing scrolls sideways.
  test(`at ${width}px the deck sits above the tab bar, nothing scrolls sideways, the tabs stay on top`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await openHome(page);
    await deck(page, 'Regions').locator('canvas').waitFor();
    const central = card(page, 'Central');
    await expect(central).toHaveAttribute('aria-current', 'true');
    await central.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const bar = await box(page, tabBarSearch(page));
    const middle = await box(page, central);
    expect(middle.y + middle.height, 'deck clears the tab bar').toBeLessThanOrEqual(bar.y + 1);
    expect(middle.x, 'middle card inside the screen').toBeGreaterThanOrEqual(0);
    expect(middle.x + middle.width).toBeLessThanOrEqual(width);
    // nothing (sticky header, tab bar) covers the middle card
    expect(
      await central.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!hit && (el.contains(hit) || el.parentElement!.contains(hit));
      }),
      'middle card not covered',
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    // the tabs stay on top of the page that scrolls under them
    const search = tabBarSearch(page);
    expect(
      await search.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }),
      'tab bar on top',
    ).toBe(true);
    // at the end of the page the last section clears the bar
    const last = page.getByRole('list', { name: 'Places picked for you' }).getByRole('listitem').last();
    await page.getByRole('heading', { level: 1, name: 'Explore Singapore' }).evaluate((h) => {
      let el: HTMLElement | null = h.parentElement;
      while (el && el.scrollHeight <= el.clientHeight) el = el.parentElement;
      el?.scrollTo(0, el.scrollHeight);
    });
    const end = await box(page, last);
    expect(end.y + end.height, 'page foot clears the tab bar').toBeLessThanOrEqual((await box(page, tabBarSearch(page))).y + 1);
    // the header (the lion's Help Center button) stays on screen, also scrolled
    const header = await box(page, page.getByRole('button', { name: 'Help Center' }));
    expect(header.y).toBeGreaterThanOrEqual(0);
  });
}

test('Home has no WCAG A/AA violations except the brand orange', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await page.waitForTimeout(600);
  // the region badges follow the 3D map; under load (WebKit) it can still be laying out, so wait until they stay put
  const badges = () =>
    page.getByRole('button', { name: /^Region \d/ }).evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return `${Math.round(r.x)},${Math.round(r.y)}`;
    }).join(' '));
  let last = await badges();
  await expect
    .poll(async () => {
      await page.waitForTimeout(300);
      const now = await badges();
      const still = now === last;
      last = now;
      return still;
    }, { timeout: 10_000 })
    .toBe(true);
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
