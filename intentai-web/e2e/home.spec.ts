import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test';
import type { Page } from './test';

// Home: greeting, hero and the Nearby map + place carousel, against the real Leaflet map.
// Tiles come from the shared fixture's stub (e2e/test.ts); no test reaches the real tile servers.

const PINNED = ['berlin-wall-fragments', 'curated:sg-haw-par-villa', 'curated:sg-holland-village', 'curated:sg-national-university-of-singapore'];
const BRAND_ORANGES = ['#e4671f', '#e8622c']; // accepted contrast exception, as in a11y.spec.ts

type Rect = { x: number; y: number; width: number; height: number };

const carousel = (page: Page) => page.getByTestId('nearby-carousel');
const cards = (page: Page) => carousel(page).getByRole('group');
const card = (page: Page, name: string) => carousel(page).getByRole('group', { name, exact: true });
const current = (page: Page) => carousel(page).locator('[aria-current="true"]');
const track = (page: Page) => carousel(page).locator('[aria-roledescription="carousel"] > div').first();
const pins = (page: Page) => page.getByTestId('nearby-map').locator('button[data-place-id]');
const pin = (page: Page, id: string) => page.getByTestId('nearby-map').locator(`button[data-place-id="${id}"]`);
const selectedPin = (page: Page) => page.getByTestId('nearby-map').locator('button[data-place-id][data-selected="true"]');

async function box(page: Page, locator: ReturnType<Page['locator']>): Promise<Rect> {
  const b = await locator.boundingBox();
  expect(b, 'element not rendered').not.toBeNull();
  return b!;
}

/** Opens Home and waits for the lazily loaded map to draw its pins. */
async function openHome(page: Page) {
  await page.goto('/');
  await expect(pins(page)).toHaveCount(4);
}

/** Bottom of the selected pin minus the carousel's top edge (negative: the pin is above the cards). */
async function pinOverCarousel(page: Page): Promise<number> {
  const p = await selectedPin(page).boundingBox();
  const c = await carousel(page).boundingBox();
  if (!p || !c) return Number.POSITIVE_INFINITY;
  return p.y + p.height - c.y;
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

test('load: 5 cards, 4 pins, Berlin current, "4 places to explore"', async ({ page }) => {
  await openHome(page);
  await expect(cards(page)).toHaveCount(5);
  await expect(current(page)).toHaveCount(1);
  await expect(current(page)).toHaveAttribute('aria-label', 'Berlin Wall Fragments');
  await expect(page.getByTestId('nearby-map')).toContainText('4 places to explore');
  await expect(page.getByRole('heading', { level: 1, name: /^Good morning/ })).toBeVisible();
});

test('every tile request is answered by the stub', async ({ page, tileStub }) => {
  let requested = 0;
  page.on('request', (r) => {
    if (new URL(r.url()).hostname === 'tile.openstreetmap.org') requested += 1;
  });
  await openHome(page);
  await expect.poll(() => requested).toBeGreaterThan(0);
  await page.waitForLoadState('networkidle');
  expect(tileStub.fulfilled).toBe(requested);
});

test('swiping to card 2 selects Chinatown; Locate goes back to the home base', async ({ page }) => {
  await openHome(page);
  await track(page).evaluate((t) => {
    const c = t.children[1] as HTMLElement;
    t.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - t.clientWidth / 2, behavior: 'smooth' });
  });
  await expect(card(page, 'Chinatown')).toHaveAttribute('aria-current', 'true');
  await expect(pin(page, 'chinatown')).toBeVisible();
  await expect(selectedPin(page)).toHaveAttribute('data-place-id', 'chinatown');
  await expect.poll(() => pinOverCarousel(page)).toBeLessThan(0);

  await page.getByRole('button', { name: 'Show my location' }).click();
  await expect(card(page, 'Berlin Wall Fragments')).toHaveAttribute('aria-current', 'true');
  await expect(pin(page, 'chinatown')).toHaveCount(0);
  // The home-base dot is the only hidden marker; it must end up in the map area the cards leave visible.
  const dot = page.getByTestId('nearby-map').locator('.leaflet-marker-pane > [aria-hidden="true"]');
  await expect(dot).toHaveCount(1);
  await expect
    .poll(async () => {
      const d = await dot.boundingBox();
      const m = await page.getByTestId('nearby-map').boundingBox();
      const c = await carousel(page).boundingBox();
      if (!d || !m || !c) return false;
      return d.x >= m.x && d.x + d.width <= m.x + m.width && d.y >= m.y && d.y + d.height <= c.y;
    })
    .toBe(true);
});

test('rapid ArrowRight x3 selects and focuses card 4 without scrolling the page', async ({ page }) => {
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
});

test('after dragging the map, tapping the selected card brings its pin back above the cards', async ({ page }) => {
  await openHome(page);
  await expect.poll(() => pinOverCarousel(page)).toBeLessThan(0);
  // The pin's offset inside the map frame. Clicking a card low on the page makes Playwright scroll the
  // page (the tab bar covers the strip's bottom edge), which moves every viewport coordinate but not this.
  const inMap = async () => (await box(page, selectedPin(page))).y - (await box(page, page.getByTestId('nearby-map'))).y;
  const before = await inMap();

  // A spot on bare map (a tile, not a pin, control or card) above the cards, dragged down onto them.
  const start = await page.getByTestId('nearby-map').evaluate((frame) => {
    const map = frame.querySelector('.leaflet-container')!.getBoundingClientRect();
    const cards = document.querySelector('[data-testid="nearby-carousel"]')!.getBoundingClientRect();
    for (let y = map.top + 90; y < cards.top - 30; y += 8) {
      for (let x = map.left + 24; x < map.right - 60; x += 8) {
        const el = document.elementFromPoint(x, y);
        if (el?.closest('.leaflet-tile-pane') || el?.classList.contains('leaflet-container')) return { x, y, end: cards.top + 80 };
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

test('tapping a pin selects its card; pins work from the keyboard', async ({ page }) => {
  // Without animation each Zoom out click lands; an eased zoom drops clicks made while it is still running.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  // Zoom out to the widest view so every pinned place is on screen.
  for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Zoom out' }).click();
  const hawPar = pin(page, 'curated:sg-haw-par-villa');
  await expect
    .poll(async () => {
      const p = await hawPar.boundingBox();
      const m = await page.getByTestId('nearby-map').boundingBox();
      const c = await carousel(page).boundingBox();
      return !!p && !!m && !!c && p.y >= m.y + 60 && p.y + p.height <= c.y && p.x >= m.x && p.x + p.width <= m.x + m.width;
    })
    .toBe(true);
  await page.getByRole('button', { name: 'Show Haw Par Villa on the map' }).click();
  await expect(card(page, 'Haw Par Villa')).toHaveAttribute('aria-current', 'true');

  // Tab from the search button to the "places to explore" chip passes each pin exactly once.
  await page.getByRole('button', { name: 'Search', exact: true }).focus();
  const reached: string[] = [];
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.placeId ?? null);
    if (id) reached.push(id);
    if (await page.getByRole('button', { name: /places to explore$/ }).evaluate((el) => el === document.activeElement)) break;
  }
  expect([...reached].sort()).toEqual([...PINNED].sort());

  // Enter and Space each activate a pin exactly once.
  await page.evaluate(() => {
    const w = window as unknown as { pinClicks: string[] };
    w.pinClicks = [];
    document.addEventListener(
      'click',
      (e) => {
        const b = (e.target as Element | null)?.closest<HTMLElement>('button[data-place-id]');
        if (b) w.pinClicks.push(b.dataset.placeId!);
      },
      true,
    );
  });
  const pinClicks = () => page.evaluate(() => (window as unknown as { pinClicks: string[] }).pinClicks);
  const holland = 'curated:sg-holland-village';

  await pin(page, holland).focus();
  await page.keyboard.press('Enter');
  await expect(card(page, 'Holland Village')).toHaveAttribute('aria-current', 'true');
  await expect(pin(page, holland)).toBeFocused();
  expect(await pinClicks()).toEqual([holland]);

  await page.getByRole('button', { name: 'Show Haw Par Villa on the map' }).focus();
  await page.keyboard.press('Enter');
  await expect(card(page, 'Haw Par Villa')).toHaveAttribute('aria-current', 'true');

  await pin(page, holland).focus();
  await page.keyboard.press('Space');
  await expect(card(page, 'Holland Village')).toHaveAttribute('aria-current', 'true');
  expect(await pinClicks()).toEqual([holland, 'curated:sg-haw-par-villa', holland]);
});

/** True when the topmost element at the centre of `locator` is inside it. */
async function onTop(locator: ReturnType<Page['locator']>): Promise<boolean> {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && el.contains(hit);
  });
}

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
  for (const name of ['Home', 'Ask', 'Community', 'Moments', 'My Space']) {
    expect(await onTop(tabs.getByRole('button', { name, exact: true })), `${name} tab on top`).toBe(true);
  }
});

for (const width of [320, 390]) {
  test(`the selected pin's label is fully visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHome(page);
    for (const id of ['berlin-wall-fragments', 'chinatown']) {
      if (id === 'chinatown') await selectCard(page, 1);
      await page.getByTestId('nearby-map').evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const label = selectedPin(page).locator('[data-label]');
      await expect(selectedPin(page)).toHaveAttribute('data-place-id', id);
      await expect
        .poll(async () => {
          const l = await label.boundingBox();
          const m = await page.getByTestId('nearby-map').boundingBox();
          if (!l || !m) return false;
          const inside = l.x >= m.x && l.x + l.width <= m.x + m.width && l.y >= m.y;
          return inside && (await onTop(label));
        })
        .toBe(true);
    }
  });
}

test('search: the pill and the search button open one dropdown; picking a place selects its card', async ({ page }) => {
  await openHome(page);
  const pill = page.getByRole('button', { name: /Change search point$/ });
  await pill.click();
  const field = page.getByRole('textbox', { name: 'Search a place or area' });
  await expect(field).toBeVisible();
  await expect(page.getByRole('list', { name: 'PLACES WITH CARDS' }).getByRole('listitem')).toHaveCount(2);
  // The dropdown is drawn over the map and the cards.
  for (const name of [/^Berlin Wall Fragments/, /^National University of Singapore/]) {
    const row = page.getByRole('button', { name });
    await row.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    expect(await onTop(row)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(field).toBeHidden();
  await expect(pill).toBeFocused();

  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await field.fill('pagoda');
  await page.getByRole('button', { name: /^Chinatown/ }).click();
  await expect(field).toBeHidden();
  await expect(card(page, 'Chinatown')).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('search-point')).toHaveText('Chinatown & Tanjong Pagar');
  await expect.poll(() => pinOverCarousel(page)).toBeLessThan(0);
});

test('Open goes to the place page; browser Back brings Home back on that card, at the same scroll', async ({ page }) => {
  await openHome(page);
  await selectCard(page, 1);
  await carousel(page).scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(0);
  await card(page, 'Chinatown').getByRole('button', { name: /^Open/ }).click();
  await expect(page).toHaveURL(/\/place\/chinatown$/);
  await page.goBack();
  await expect(card(page, 'Chinatown')).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 40);
});

test('streak chip opens Moments, bell opens Community', async ({ page }) => {
  await openHome(page);
  await page.getByRole('link', { name: /day streak\. See your rank and badges$/ }).click();
  await expect(page).toHaveURL(/\/moments$/);
  await page.goBack();
  await page.getByRole('link', { name: 'Notifications: Mei answered your question' }).click();
  await expect(page).toHaveURL(/\/community$/);
});

test('when tiles fail: "Map unavailable" + Retry, and Open still navigates', async ({ page }) => {
  // Registered after the fixture's stub, so it takes precedence.
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.goto('/');
  const alert = page.getByRole('alert').filter({ hasText: 'Map unavailable' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Retry' })).toBeVisible();
  await card(page, 'Berlin Wall Fragments').getByRole('button', { name: /^Open/ }).click();
  await expect(page).toHaveURL(/\/place\/berlin-wall-fragments$/);
});

test('reduced motion: card photos do not move', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await selectCard(page, 2);
  const transforms = await carousel(page)
    .locator('[data-parallax]')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
  expect(transforms).toHaveLength(5);
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

    // Card 5: card 4 shows on the left, nothing after card 5.
    await selectCard(page, 4);
    l = await cardLayout(page);
    expect(l[3].visible, 'card 4 peeks on the left').toBeGreaterThan(0);
    expect(l[4].right, 'nothing after card 5').toBeLessThan(l[4].strip);
    if (phone) expect(l[3].left, 'card 4 is cut by the left edge').toBeLessThan(0);

    // No card covers the OpenStreetMap attribution.
    const attribution = await box(page, page.getByTestId('nearby-map').getByText('© OpenStreetMap contributors').locator('xpath=..'));
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
  await openHome(page);
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
