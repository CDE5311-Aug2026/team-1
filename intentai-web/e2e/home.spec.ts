import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test';
import type { Page } from './test';

// Home: greeting, hero and the Nearby map + place carousel, on our own Singapore map (CityMap: canvas ground and
// roads, DOM pin buttons with `data-pin`, clusters, its own zoom / recenter buttons). It makes no tile requests.

const BRAND_ORANGES = ['#e4671f', '#e8622c']; // accepted contrast exception, as in a11y.spec.ts

type Rect = { x: number; y: number; width: number; height: number };

const map = (page: Page) => page.getByTestId('nearby-map');
const carousel = (page: Page) => page.getByTestId('nearby-carousel');
const cards = (page: Page) => carousel(page).getByRole('group');
const card = (page: Page, name: string) => carousel(page).getByRole('group', { name, exact: true });
const current = (page: Page) => carousel(page).locator('[aria-current="true"]');
const track = (page: Page) => carousel(page).locator('[aria-roledescription="carousel"] > div').first();
const pins = (page: Page) => map(page).locator('button[data-pin]');
const pin = (page: Page, id: string) => map(page).locator(`button[data-pin="${id}"]`);
const selectedPin = (page: Page) => map(page).locator('button[data-pin][aria-pressed="true"]');
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A pin's accessible name is "<place name>, <Category>". */
const pinNamed = (name: string) => new RegExp(`^${escape(name)}, `);

async function box(page: Page, locator: ReturnType<Page['locator']>): Promise<Rect> {
  const b = await locator.boundingBox();
  expect(b, 'element not rendered').not.toBeNull();
  return b!;
}

/** Opens Home and waits for the lazily loaded map to draw its pins, with Berlin selected. */
async function openHome(page: Page) {
  await page.goto('/');
  await expect(cards(page)).toHaveCount(304);
  await expect(selectedPin(page)).toHaveAttribute('data-pin', 'curated:sg-berlin-wall-fragments-utown');
}

/** Bottom of the selected pin minus the carousel's top edge (negative: the pin is above the cards). */
async function pinOverCarousel(page: Page): Promise<number> {
  const p = await selectedPin(page).boundingBox();
  const c = await carousel(page).boundingBox();
  if (!p || !c) return Number.POSITIVE_INFINITY;
  return p.y + p.height - c.y;
}

/** True when the selected pin is wholly inside the map, below its top bar and above the cards. */
async function selectedPinInView(page: Page): Promise<boolean> {
  const p = await selectedPin(page).boundingBox();
  const m = await map(page).boundingBox();
  const c = await carousel(page).boundingBox();
  if (!p || !m || !c) return false;
  return p.x >= m.x && p.x + p.width <= m.x + m.width && p.y >= m.y + 40 && p.y + p.height <= c.y;
}

/** Selects the card at `index` with the arrow keys and waits until the strip has scrolled it to the centre. */
async function selectCard(page: Page, index: number) {
  await current(page).focus();
  const from = await cards(page).evaluateAll((els) => els.findIndex((el) => el.getAttribute('aria-current') === 'true'));
  for (let i = from; i < index; i += 1) await page.keyboard.press('ArrowRight');
  for (let i = from; i > index; i -= 1) await page.keyboard.press('ArrowLeft');
  await expect(cards(page).nth(index)).toHaveAttribute('aria-current', 'true');
  await expect
    .poll(() =>
      track(page).evaluate((t, i) => {
        const c = t.children[i] as HTMLElement;
        const tr = t.getBoundingClientRect();
        const cr = c.getBoundingClientRect();
        return Math.abs(cr.left + cr.width / 2 - (tr.left + tr.width / 2));
      }, index),
    )
    .toBeLessThan(2);
}

/** Each card's visible width inside the strip, and how it meets the strip's edges. */
async function cardLayout(page: Page) {
  return track(page).evaluate((t) => {
    const tr = t.getBoundingClientRect();
    return Array.from(t.children).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left - tr.left,
        right: r.right - tr.left,
        visible: Math.max(0, Math.min(r.right, tr.right) - Math.max(r.left, tr.left)),
        width: r.width,
        strip: tr.width,
      };
    });
  });
}

/** True when the topmost element at the centre of `locator` is inside it. */
async function onTop(locator: ReturnType<Page['locator']>): Promise<boolean> {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && el.contains(hit);
  });
}

/** Ids of the unselected pins whose centre is on top (not under a control, the search bar or a card). */
async function tappablePins(page: Page): Promise<string[]> {
  return map(page)
    .locator('button[data-pin][aria-pressed="false"]')
    .evaluateAll((els) => {
      const cards = document.querySelector('[data-testid="nearby-carousel"]')!.getBoundingClientRect();
      return els
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          const hit = document.elementFromPoint(x, y);
          return !!hit && el.contains(hit) && r.bottom < cards.top - 4;
        })
        .map((el) => (el as HTMLElement).dataset.pin!);
    });
}

test('load: every real place as a card (304), Berlin current, "304 places to explore"', async ({ page }) => {
  const tiles: string[] = [];
  page.on('request', (r) => {
    if (/tile\.openstreetmap\.org/.test(new URL(r.url()).hostname)) tiles.push(r.url());
  });
  await openHome(page);
  await expect(cards(page)).toHaveCount(304);
  await expect(current(page)).toHaveCount(1);
  await expect(current(page)).toHaveAttribute('aria-label', 'Berlin Wall Fragments');
  await expect(map(page)).toContainText('304 places to explore');
  await expect(page.getByRole('heading', { level: 1, name: /^Good morning/ })).toBeVisible();
  // The map draws pins (and clusters) for the places around the selected one, and asks no tile server.
  expect(await pins(page).count()).toBeGreaterThan(1);
  await expect(selectedPin(page)).toHaveAttribute('aria-label', pinNamed('Berlin Wall Fragments'));
  await expect.poll(() => selectedPinInView(page)).toBe(true);
  expect(tiles).toEqual([]);
});

// Removed: "every tile request is answered by the stub" and "when tiles fail: Map unavailable + Retry" — they tested
// Leaflet's OpenStreetMap tiles; our map draws a bundled ground image and makes no tile requests.

test('swiping to card 2 selects NUS; Locate goes back to the home base', async ({ page }) => {
  await openHome(page);
  await track(page).evaluate((t) => {
    const c = t.children[1] as HTMLElement;
    t.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - t.clientWidth / 2, behavior: 'smooth' });
  });
  await expect(card(page, 'National University of Singapore')).toHaveAttribute('aria-current', 'true');
  await expect(selectedPin(page)).toHaveAttribute('data-pin', 'curated:sg-national-university-of-singapore');
  await expect(pin(page, 'curated:sg-national-university-of-singapore')).toBeVisible();
  await expect.poll(() => selectedPinInView(page)).toBe(true);

  await page.getByRole('button', { name: 'Show my location' }).click();
  await expect(card(page, 'Berlin Wall Fragments')).toHaveAttribute('aria-current', 'true');
  await expect(selectedPin(page)).toHaveAttribute('data-pin', 'curated:sg-berlin-wall-fragments-utown');
  // Home base is back in the map area the cards leave visible.
  await expect.poll(() => selectedPinInView(page)).toBe(true);
});

test('rapid ArrowRight x3 selects and focuses card 4 without scrolling the page; the map shows its pin', async ({ page }) => {
  await openHome(page);
  await current(page).focus();
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const fourth = cards(page).nth(3);
  await expect(fourth).toHaveAttribute('aria-current', 'true');
  await expect(fourth).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  const name = (await fourth.getAttribute('aria-label'))!;
  await expect(selectedPin(page)).toHaveAttribute('aria-label', pinNamed(name));
  await expect.poll(() => selectedPinInView(page)).toBe(true);
});

test('after dragging the map, tapping the selected card brings its pin back above the cards', async ({ page }) => {
  await openHome(page);
  await expect.poll(() => pinOverCarousel(page)).toBeLessThan(0);
  // The pin's offset inside the map frame. Clicking a card low on the page makes Playwright scroll the
  // page (the tab bar covers the strip's bottom edge), which moves every viewport coordinate but not this.
  const inMap = async () => (await box(page, selectedPin(page))).y - (await box(page, map(page))).y;
  const before = await inMap();

  // A spot on bare map (not a pin, control or card) above the cards, dragged down onto them.
  const start = await map(page).evaluate((frame) => {
    const surface = frame.querySelector('[data-testid="city-map"]')!;
    const m = surface.getBoundingClientRect();
    const cards = document.querySelector('[data-testid="nearby-carousel"]')!.getBoundingClientRect();
    for (let y = m.top + 90; y < cards.top - 30; y += 8) {
      for (let x = m.left + 24; x < m.right - 60; x += 8) {
        if (document.elementFromPoint(x, y) === surface) return { x, y, end: cards.top + 80 };
      }
    }
    return null;
  });
  expect(start, 'no bare map spot to drag from').not.toBeNull();
  await page.mouse.move(start!.x, start!.y);
  await page.mouse.down();
  await page.mouse.move(start!.x, start!.end, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => (await inMap()) - before).toBeGreaterThan(100);

  // The card body, away from its buttons.
  const selected = current(page);
  const c = await box(page, selected);
  await selected.click({ position: { x: c.width - 24, y: 16 } });
  await expect.poll(() => pinOverCarousel(page)).toBeLessThan(0);
  await expect.poll(async () => Math.abs((await inMap()) - before)).toBeLessThan(4);
});

test('tapping a pin selects its card; pins work from the keyboard; a cluster zooms in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);

  // Tap a pin: its card becomes current and the pin is the selected one.
  const [first] = await tappablePins(page);
  expect(first, 'no tappable pin on the map').toBeTruthy();
  const firstName = (await pin(page, first).getAttribute('aria-label'))!.split(', ')[0];
  await pin(page, first).click();
  await expect(card(page, firstName)).toHaveAttribute('aria-current', 'true');
  await expect(pin(page, first)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => selectedPinInView(page)).toBe(true);

  // Enter and Space each activate a pin exactly once, and focus stays on the pin.
  await page.evaluate(() => {
    const w = window as unknown as { pinClicks: string[] };
    w.pinClicks = [];
    document.addEventListener(
      'click',
      (e) => {
        const b = (e.target as Element | null)?.closest<HTMLElement>('button[data-pin]');
        if (b) w.pinClicks.push(b.dataset.pin!);
      },
      true,
    );
  });
  const pinClicks = () => page.evaluate(() => (window as unknown as { pinClicks: string[] }).pinClicks);

  const [second] = await tappablePins(page);
  expect(second, 'no second pin on the map').toBeTruthy();
  const secondName = (await pin(page, second).getAttribute('aria-label'))!.split(', ')[0];
  await pin(page, second).focus();
  await page.keyboard.press('Enter');
  await expect(card(page, secondName)).toHaveAttribute('aria-current', 'true');
  await expect(pin(page, second)).toBeFocused();
  expect(await pinClicks()).toEqual([second]);

  // Space on the (now selected) pin activates it exactly once too; with 300 places the others nearby are clustered.
  await pin(page, second).focus();
  await page.keyboard.press('Space');
  await expect(card(page, secondName)).toHaveAttribute('aria-current', 'true');
  await expect(pin(page, second)).toBeFocused();
  expect(await pinClicks()).toEqual([second, second]);

  // Zoom out until places cluster; a cluster zooms the map in.
  const surface = map(page).getByTestId('city-map');
  const clusters = map(page).getByRole('button', { name: /^\d+ places here\. Zoom in$/ });
  for (let i = 0; i < 4 && (await clusters.count()) === 0; i += 1) await map(page).getByRole('button', { name: 'Zoom out' }).click();
  await expect(clusters.first()).toBeVisible();
  const scale = Number(await surface.getAttribute('data-scale'));
  await clusters.first().focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => Number(await surface.getAttribute('data-scale'))).toBeGreaterThan(scale);
});

test('the 3D link opens the selected place in Nearby 3D', async ({ page }) => {
  await openHome(page);
  const link = map(page).getByRole('link', { name: 'Open this place in 3D' });
  // Berlin is a Nearby place since 31 Oct: the 3D view opens on it.
  await expect(link).toHaveAttribute('href', `/nearby?view=3d&sel=${encodeURIComponent('curated:sg-berlin-wall-fragments-utown')}`);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search a place or area' }).fill('Holland Village');
  await page.getByRole('button', { name: /^Holland Village/ }).first().click();
  await expect(card(page, 'Holland Village')).toHaveAttribute('aria-current', 'true');
  const id = (await selectedPin(page).getAttribute('data-pin'))!;
  expect(id).toMatch(/^curated:/);
  await expect(link).toHaveAttribute('href', `/nearby?view=3d&sel=${encodeURIComponent(id)}`);
});

test('the tab bar stays above the carousel when the cards scroll under it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await openHome(page);
  const tabs = page.getByRole('navigation', { name: 'Primary' });
  // Scroll until the card strip sits behind the tab bar.
  const bar = await box(page, tabs);
  const strip = await box(page, carousel(page));
  await page.evaluate((dy) => window.scrollBy(0, dy), strip.y + strip.height / 2 - (bar.y + bar.height / 2));
  const b = await box(page, tabs);
  const c = await box(page, carousel(page));
  expect(c.y < b.y + b.height && c.y + c.height > b.y, 'cards are under the tab bar').toBe(true);
  for (const name of ['Home', 'Moments', 'Hunt', 'Mine']) {
    expect(await onTop(tabs.getByRole('button', { name, exact: true })), `${name} tab on top`).toBe(true);
  }
});

for (const width of [320, 390]) {
  test(`the selected pin is fully visible and on top at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHome(page);
    for (const id of ['curated:sg-berlin-wall-fragments-utown', 'curated:sg-national-university-of-singapore']) {
      if (id === 'curated:sg-national-university-of-singapore') await selectCard(page, 1);
      await map(page).evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect(selectedPin(page)).toHaveAttribute('data-pin', id);
      await expect.poll(async () => (await selectedPinInView(page)) && (await onTop(selectedPin(page)))).toBe(true);
    }
  });
}

test('search: the pill and the search button open one dropdown; picking a place selects its card', async ({ page }) => {
  await openHome(page);
  const pill = page.getByRole('button', { name: /Change search point$/ });
  await pill.click();
  const field = page.getByRole('textbox', { name: 'Search a place or area' });
  await expect(field).toBeVisible();
  // The dropdown is drawn over the map and the cards.
  for (const name of [/^Berlin Wall Fragments/, /^National University of Singapore/]) {
    // (map pins share the place names; the rows are the other buttons)
    const row = page.getByRole('button', { name }).and(page.locator(':not([data-pin])'));
    await row.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    expect(await onTop(row)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(field).toBeHidden();
  await expect(pill).toBeFocused();

  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await field.fill('pagoda');
  await page.getByRole('button', { name: /^Pagoda Street/ }).and(page.locator(':not([data-pin])')).first().click();
  await expect(field).toBeHidden();
  await expect(card(page, 'Pagoda Street and Trengganu Street')).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('search-point')).toHaveText('Chinatown & Tanjong Pagar');
  await expect(selectedPin(page)).toHaveAttribute('data-pin', 'curated:sg-pagoda-street-trengganu-street');
  await expect.poll(() => pinOverCarousel(page)).toBeLessThan(0);
});

test('Open goes to the place page; browser Back brings Home back on that card, at the same scroll', async ({ page }) => {
  await openHome(page);
  await selectCard(page, 1);
  await carousel(page).scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(0);
  await card(page, 'National University of Singapore').getByRole('button', { name: /^Open/ }).click();
  await expect(page).toHaveURL(/\/nearby\/place\//);
  await page.goBack();
  await expect(card(page, 'National University of Singapore')).toHaveAttribute('aria-current', 'true');
  await expect(selectedPin(page)).toHaveAttribute('data-pin', 'curated:sg-national-university-of-singapore');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 40);
});

test('streak chip opens Moments, bell opens notices', async ({ page }) => {
  await openHome(page);
  await page.getByRole('link', { name: /day streak\. See your rank and badges$/ }).click();
  await expect(page).toHaveURL(/\/moments$/);
  await page.goBack();
  await page.getByRole('link', { name: 'Notifications' }).click();
  await expect(page).toHaveURL(/\/my-space\/notices$/);
});

test('reduced motion: card photos do not move', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await selectCard(page, 2);
  const transforms = await carousel(page)
    .locator('[data-parallax]')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
  expect(transforms).toHaveLength(304);
  for (const t of transforms) expect(t).toBe('none');
});

for (const [width, height] of [
  [320, 700],
  [1280, 900],
] as const) {
  test(`carousel neighbours and attribution at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openHome(page);

    // Card 1: empty start padding before it, card 2 showing at the right.
    let l = await cardLayout(page);
    expect(l[0].left, 'nothing before card 1').toBeGreaterThan(0);
    expect(l[0].visible).toBeCloseTo(l[0].width, 0);
    expect(l[1].visible, 'card 2 peeks').toBeGreaterThan(0);
    expect(l[1].left).toBeGreaterThan(l[0].right);
    // On a phone the neighbour is cut by the strip's edge; a laptop strip is wide enough to show it whole.
    const phone = width < 480;
    if (phone) expect(l[1].right, 'card 2 is cut by the right edge').toBeGreaterThan(l[1].strip);

    // Card 3: cards 2 and 4 show on both sides.
    await selectCard(page, 2);
    l = await cardLayout(page);
    expect(l[1].visible, 'card 2 peeks on the left').toBeGreaterThan(0);
    expect(l[3].visible, 'card 4 peeks on the right').toBeGreaterThan(0);
    expect(l[1].right).toBeLessThan(l[2].left);
    expect(l[3].left).toBeGreaterThan(l[2].right);
    if (phone) {
      expect(l[1].left, 'card 2 is cut by the left edge').toBeLessThan(0);
      expect(l[3].right, 'card 4 is cut by the right edge').toBeGreaterThan(l[3].strip);
    }

    // Card 5: card 4 shows on the left, card 6 on the right.
    await selectCard(page, 4);
    l = await cardLayout(page);
    expect(l[3].visible, 'card 4 peeks on the left').toBeGreaterThan(0);
    expect(l[5].visible, 'card 6 peeks on the right').toBeGreaterThan(0);
    if (phone) expect(l[3].left, 'card 4 is cut by the left edge').toBeLessThan(0);

    // No card covers the map credit (EARTH ONLINE map · © OpenStreetMap contributors).
    const attribution = await box(page, map(page).getByText(/© OpenStreetMap contributors/));
    const strip = await box(page, track(page));
    const overlaps = await cards(page).evaluateAll(
      (els, [a, s]) =>
        els.some((el) => {
          const r = el.getBoundingClientRect();
          // Only the part of a card the strip shows can cover anything.
          const left = Math.max(r.left, s.x);
          const right = Math.min(r.right, s.x + s.width);
          if (right <= left) return false;
          return left < a.x + a.width && right > a.x && r.top < a.y + a.height && r.bottom > a.y;
        }),
      [attribution, strip] as const,
    );
    expect(overlaps).toBe(false);
  });
}

test('Home has no WCAG A/AA violations except the brand orange', async ({ page }) => {
  // As in a11y.spec.ts: check the settled page, not text caught mid-fade.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime ?? Number.POSITIVE_INFINITY))
          .map((a) => a.finished.catch(() => undefined)),
      ),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]),
  );
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
