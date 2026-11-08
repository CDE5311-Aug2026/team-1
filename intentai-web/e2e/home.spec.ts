import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test';
import type { Page } from './test';

// Home (Discovery redesign, 31 Oct 2026): a map card (regions and planning areas on a light Three.js map over EARTH
// ONLINE's ground picture; places in the EARTH ONLINE 3D city). v2 (owner, 8 Nov 2026): no card deck under it; one
// tap on the map goes down a level (region badge → its planning areas, area badge → its places), places, picks and
// stops lie in a row of pills over the map's lower edge, and the map's tools are a rail over its right edge.

const BRAND_ORANGES = ['#e4671f', '#e8622c']; // accepted contrast exception, as in a11y.spec.ts

type Rect = { x: number; y: number; width: number; height: number };

const regionBadge = (page: Page, n: number, name: string) => page.getByRole('button', { name: new RegExp(`^Region ${n}: ${name},`) });
const areaBadge = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^Area \\d+: ${name},`) });
const row = (page: Page, label: string) => page.getByRole('list', { name: label, exact: true });
const tools = (page: Page) => page.getByRole('toolbar', { name: 'Map tools' });
const tabs = (page: Page) => page.getByRole('navigation', { name: 'Primary' });
// v2 (plan C6): the nav landmark has no height of its own; the floating pill and the round Search button hang up from
// it. The Search button spans the bar's full height, so its box is the bar's top edge.
const tabBarSearch = (page: Page) => tabs(page).getByRole('button', { name: 'Search', exact: true });

async function box(page: Page, locator: ReturnType<Page['locator']>): Promise<Rect> {
  const b = await locator.boundingBox();
  expect(b, 'element not rendered').not.toBeNull();
  return b!;
}

async function openHome(page: Page, search = '') {
  await page.goto(`/${search}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeAttached();
}

/** The badges follow the 3D map; wait until they stay put (the camera has settled). */
async function badgesSettled(page: Page, name: RegExp) {
  const where = () =>
    page.getByRole('button', { name }).evaluateAll((els) =>
      els
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${Math.round(r.x)},${Math.round(r.y)}`;
        })
        .join(' '),
    );
  let last = await where();
  await expect
    .poll(
      async () => {
        await page.waitForTimeout(300);
        const now = await where();
        const still = now === last && now !== '';
        last = now;
        return still;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
}

test('load: the five URA regions on the map, Central picked, no outside requests at region level', async ({ page }) => {
  const outside: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') outside.push(r.url());
  });
  await openHome(page);
  await expect(page.getByRole('button', { name: /^Region \d: / })).toHaveCount(5);
  await expect(regionBadge(page, 1, 'Central')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('application', { name: /planning areas/ })).toBeVisible();
  // no card deck under the map any more (owner, 8 Nov 2026)
  await expect(page.getByText('Recommended', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Regions' })).toHaveCount(0);
  expect(outside).toEqual([]);
});

test('the region badges stay whole inside the map, off each other and clear of the tool rail', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await badgesSettled(page, /^Region \d/);
  const map = await box(page, page.getByRole('application', { name: /planning areas/ }));
  const rail = await box(page, tools(page));
  const badges: Rect[] = [];
  for (const b of await page.getByRole('button', { name: /^Region \d/ }).all()) badges.push(await box(page, b));
  for (const b of badges) {
    expect(b.x, 'badge inside the map (left)').toBeGreaterThanOrEqual(map.x);
    expect(b.x + b.width, 'badge clear of the tool rail').toBeLessThanOrEqual(rail.x + 1);
    expect(b.y).toBeGreaterThanOrEqual(map.y);
    expect(b.y + b.height).toBeLessThanOrEqual(map.y + map.height);
  }
  for (let i = 0; i < badges.length; i++)
    for (let j = i + 1; j < badges.length; j++) {
      const [a, b] = [badges[i], badges[j]];
      const apart = a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1 || a.y + a.height <= b.y + 1 || b.y + b.height <= a.y + 1;
      expect(apart, `badges ${i + 1} and ${j + 1} overlap`).toBe(true);
    }
  // with All picked, each badge counts every category it has (Attractions · Wellness · Leisure · Cruise)
  await expect(regionBadge(page, 1, 'Central')).toHaveAccessibleName(/, \d+ Attractions, \d+ Wellness, \d+ Leisure, \d+ Cruise$/);
  // the rail: five 44 px keys, one above the other
  const keys = await tools(page).getByRole('button').all();
  expect(keys).toHaveLength(5);
  const rects: Rect[] = [];
  for (const k of keys) rects.push(await box(page, k));
  for (const r of rects) {
    expect(Math.round(r.width)).toBeGreaterThanOrEqual(44);
    expect(Math.round(r.height)).toBeGreaterThanOrEqual(44);
  }
  for (let i = 1; i < rects.length; i++) expect(rects[i].y).toBeGreaterThan(rects[i - 1].y + 40);
  expect(rail.x + rail.width).toBeLessThanOrEqual(map.x + map.width);
});

test('tapping a numbered region on the map opens its planning areas', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: /^Region 5: West/ }).click();
  await expect(page).toHaveURL(/lvl=areas/);
  await expect(page).toHaveURL(/r=west/);
  await expect(page.getByLabel('Where you are')).toHaveText('Singapore › West');
  await expect(page.getByRole('button', { name: /^Area \d+: / })).toHaveCount(12);
});

test('region → areas → places → the place pops up over Home; Back closes it on the same place', async ({ page, browserName }) => {
  // the place level loads the EARTH ONLINE 3D city (up to 19 MB) and leaving it tears the scene down; under a full
  // parallel run that can hold the page for many seconds (WebKit draws it with software WebGL, slower still)
  test.slow();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await page.getByRole('button', { name: /^Region 5: West/ }).click();
  await expect(page.getByLabel('Where you are')).toHaveText('Singapore › West');
  await expect(areaBadge(page, 'Clementi')).toHaveAttribute('aria-pressed', 'true');
  await areaBadge(page, 'Clementi').click();
  await expect(page.getByLabel('Where you are')).toHaveText('Singapore › West › Clementi');
  // the area's places: a row of pills over the map's lower edge, the first one current
  const places = row(page, 'Clementi places').getByRole('button');
  await expect(places).toHaveCount(11);
  const first = row(page, 'Clementi places').locator('[aria-current="true"]');
  const name = (await first.getAttribute('aria-label'))!.split(', ')[0];
  await expect(first).toBeVisible();
  // the keyboard way in: the rail's ↵ key opens the current place (the check-in test below taps a pill). It is
  // focused and pressed with Enter: the EARTH ONLINE 3D city is a frame that can hold the page's focus in WebKit.
  const enterKey = tools(page).getByRole('button', { name: `Open ${name}` });
  await enterKey.focus();
  await enterKey.press('Enter');
  const sheet = page.getByRole('dialog', { name });
  // WebKit here has no GPU and builds the 3D city in software on the main thread, so the sheet can wait behind it
  // (8 Nov 2026: 1 run in 3 missed 5 s even at 3 workers). This one wait only, WebKit only; Chromium keeps 5 s.
  await expect(sheet).toBeVisible(browserName === 'webkit' ? { timeout: 15_000 } : undefined);
  await expect(sheet.getByRole('button', { name: /Check in/ })).toBeVisible();
  await expect(page).toHaveURL(/open=/);
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(row(page, 'Clementi places').getByRole('button', { name: new RegExp(`^${name},`) })).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Back to West areas' }).click();
  await page.getByRole('button', { name: 'Back to regions' }).click();
  await expect(regionBadge(page, 5, 'West')).toHaveAttribute('aria-pressed', 'true');
});

test('a check-in shows on the map badges: exploring, then unlocked with a tick when all are done', async ({ page }) => {
  // the place level loads the EARTH ONLINE 3D city (up to 19 MB) and leaving it tears the scene down; under a full
  // parallel run that can hold the page for many seconds (WebKit draws it with software WebGL, slower still)
  test.slow();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page, '?lvl=areas&r=north-east&a=am');
  await expect(areaBadge(page, 'Ang Mo Kio')).toHaveAccessibleName(/, not visited yet, 0 of 1 place checked in/);
  // Ang Mo Kio has one place: check in there.
  await areaBadge(page, 'Ang Mo Kio').click();
  await row(page, 'Ang Mo Kio places').getByRole('button').first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Check in' }).click();
  await page.goBack();
  await expect(row(page, 'Ang Mo Kio places').getByRole('button').first()).toHaveAccessibleName(/, checked in$/);
  await page.getByRole('button', { name: 'Back to North-East areas' }).click();
  await expect(areaBadge(page, 'Ang Mo Kio')).toHaveAccessibleName(/, unlocked, 1 of 1 place checked in/);
  await expect(areaBadge(page, 'Ang Mo Kio').locator('[data-tick]')).toBeVisible();
  await page.getByRole('button', { name: 'Back to regions' }).click();
  await expect(regionBadge(page, 4, 'North-East')).toHaveAccessibleName(/, exploring, 1 of \d+ places checked in/);
});

test("Editor's Pick: the picks as a row over the map; a walk shows its numbered stops and its 2D route", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await tools(page).getByRole('button', { name: "Editor's Pick" }).click();
  await expect(page).toHaveURL(/lvl=picks/);
  const walk = row(page, "Editor's Pick").getByRole('button', { name: /^Chinatown · The story walk,/ });
  await expect(walk).toBeVisible();
  await walk.click();
  await expect(page).toHaveURL(/lvl=pick&.*k=chinatown-story-walk/);
  await expect(page.getByRole('button', { name: /^Stop 1: Thian Hock Keng Temple/ })).toBeAttached();
  await expect(row(page, 'Chinatown · The story walk: stops').getByRole('button').first()).toHaveAccessibleName(/^Thian Hock Keng Temple, Stop 1,/);
  await page.getByRole('button', { name: '2D route' }).click();
  await expect(page.getByRole('link', { name: /^Go with Google Maps/ })).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&/);
});

test('a category with nothing in this area says so, politely, over the map', async ({ page }) => {
  await openHome(page, '?lvl=places&r=west&a=cl&cat=cru');
  await expect(page.getByTestId('map-notice')).toHaveText('No Cruise places here. Pick All to see every place.');
  await expect(page.getByTestId('map-notice')).toHaveAttribute('role', 'status');
  await expect(page.getByRole('list', { name: 'Clementi places' })).toHaveCount(0);
});

for (const width of [320, 390]) {
  // v2 (boards 05/11): Home scrolls (chips, map, Challenges, Picked for you) under a floating tab bar, so "the map sits
  // above the tab bar" means: scrolled to, the map card and its tools are clear of the bar and not covered by it or the
  // sticky header; the page's foot clears the bar; the bar stays on top; nothing scrolls sideways.
  test(`at ${width}px the map and its tools sit above the tab bar, nothing scrolls sideways, the tabs stay on top`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await openHome(page);
    const map = page.getByRole('application', { name: /planning areas/ });
    // the map itself, not its loading stand-in (same name): its badges are in
    await expect(page.getByRole('button', { name: /^Region \d/ })).toHaveCount(5);
    await expect(map).toBeVisible();
    await map.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const bar = await box(page, tabBarSearch(page));
    const card = await box(page, map);
    expect(card.y + card.height, 'map clears the tab bar').toBeLessThanOrEqual(bar.y + 1);
    expect(card.x, 'map inside the screen').toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(width);
    // nothing (sticky header, tab bar) covers the tool rail's keys
    for (const key of await tools(page).getByRole('button').all()) {
      expect(
        await key.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return !!hit && el.contains(hit);
        }),
        'tool key not covered',
      ).toBe(true);
    }
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
  await badgesSettled(page, /^Region \d/);
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

test('a finger swiping over the map scrolls Home (the map only takes taps)', async ({ page }) => {
  await openHome(page);
  // `none` froze half the phone screen (owner, 8 Nov 2026); vertical panning must stay with the page.
  // The map itself, not its loading stand-in (same name): its badges are in.
  await expect(page.getByRole('button', { name: /^Region \d/ })).toHaveCount(5);
  const ta = await page.getByRole('application', { name: /planning areas/ }).evaluate((el) => getComputedStyle(el).touchAction);
  expect(ta).toContain('pan-y');
});
