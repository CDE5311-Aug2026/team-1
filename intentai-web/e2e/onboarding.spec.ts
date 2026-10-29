import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test';
import type { Page } from './test';
import { COMPLETED_ONBOARDING } from '../src/test/onboardingFixture';

// Onboarding O1-O8 as a first-time user. The global seed (a finished onboarding) is cleared per
// test; the test name is kept so the tester start screen does not intervene. Map tiles come from
// the shared fixture's stub (e2e/test.ts).

const BRAND_ORANGES = ['#e4671f', '#e8622c']; // accepted contrast exception, as in a11y.spec.ts
const KEY = 'intentai:v1:onboarding';

// The global seed is a finished onboarding: drop it so each test starts as a first-time user.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
});

const step = (page: Page, id: string) => page.locator(`[data-step="${id}"]`);
const cta = (page: Page, name: string) => page.getByRole('button', { name });
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

async function startHunt(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await cta(page, 'Start the hunt').click();
  await expect(step(page, 'from')).toBeVisible();
}

async function answerFrom(page: Page) {
  await page.getByRole('radio', { name: /China/ }).first().click();
  await cta(page, 'Continue').click();
}
async function answerTime(page: Page) {
  await expect(step(page, 'time')).toBeVisible();
  await page.getByRole('radio', { name: /Less than 3 months/ }).click();
  await cta(page, 'Continue').click();
}
async function answerRole(page: Page) {
  await expect(step(page, 'role')).toBeVisible();
  await page.getByRole('radio', { name: /Student intern/ }).click();
  await cta(page, 'Continue').click();
}
async function answerLanguage(page: Page) {
  await expect(step(page, 'language')).toBeVisible();
  await page.getByRole('radio', { name: /English/ }).click();
  await cta(page, 'Continue').click();
}
async function dropPinWithKeyboard(page: Page) {
  await expect(step(page, 'base')).toBeVisible();
  const map = page.getByRole('application');
  await expect(map).toBeVisible();
  await map.focus();
  await page.keyboard.press('Enter');
  await expect(map).toHaveAttribute('aria-label', /Home base set to/);
  await cta(page, 'Continue').click();
}
async function rankTopics(page: Page) {
  await expect(step(page, 'topics')).toBeVisible();
  for (const name of ['Food', 'Monuments', 'Festivals', 'History']) {
    await page.getByRole('button', { name: new RegExp(`^${name}, not ranked`) }).click();
  }
}
async function finishFlow(page: Page) {
  await startHunt(page);
  await answerFrom(page);
  await answerTime(page);
  await answerRole(page);
  await answerLanguage(page);
  await dropPinWithKeyboard(page);
  await rankTopics(page);
  await cta(page, 'Stamp my passport').click();
  await expect(step(page, 'done')).toBeVisible();
}

test('a first-time user completes O1 to O8 with a keyboard-dropped pin and lands on Home', async ({ page }) => {
  await finishFlow(page);
  await expect(page.getByRole('heading', { name: 'Your passport is ready' })).toBeVisible();
  await expect(page.getByText('WELCOME', { exact: true })).toBeVisible();
  const saved = await stored(page);
  expect(saved).toMatchObject({ done: true, from: 'China', time: 'lt3m', role: 'intern', language: 'en' });
  expect(saved.base).not.toBeNull();
  expect(saved.topics).toEqual(['food', 'monument', 'festival', 'history']);

  await page.getByRole('link', { name: 'Start exploring' }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page.getByRole('main')).toBeVisible();
});

test('reloading mid-flow resumes at the first unanswered step with answers kept', async ({ page }) => {
  await startHunt(page);
  await answerFrom(page);
  await answerTime(page);
  await answerRole(page);
  await answerLanguage(page);
  await expect(step(page, 'base')).toBeVisible();
  await expect(page.getByRole('application')).toHaveAttribute('aria-label', /Home base set to Berlin Wall Fragments/);

  // O6 pre-pins the wall, so a reload there counts the base as answered and resumes at O7.
  await page.reload();
  await expect(step(page, 'topics')).toBeVisible();
  const saved = await stored(page);
  expect(saved).toMatchObject({ done: false, from: 'China', time: 'lt3m', role: 'intern', language: 'en', base: { label: 'Berlin Wall Fragments' } });
});

test('a user who has finished onboarding is sent from /onboarding to Home', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(COMPLETED_ONBOARDING)]);
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/:\d+\/$/);
});

test('an O8 find card opens its place page', async ({ page }) => {
  await finishFlow(page);
  const find = page.getByRole('link', { name: /^Open / });
  const href = await find.getAttribute('href');
  expect(href).toMatch(/^\/place\//);
  await find.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(href);
});

test('See passport on O8 goes to Moments', async ({ page }) => {
  await finishFlow(page);
  await page.getByRole('link', { name: 'See passport' }).click();
  await expect(page).toHaveURL(/\/moments$/);
});

test('no WCAG A/AA violations on any onboarding step', async ({ page }) => {
  test.setTimeout(120_000); // one test walks the whole flow, with animation settling between steps
  const check = async (label: string) => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const summary = violations.flatMap((v) =>
      v.nodes.flatMap((n) => {
        const data = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
        if (data && [data.fgColor, data.bgColor].some((c) => BRAND_ORANGES.includes(c ?? ''))) return [];
        const colours = data?.fgColor ? ` ${data.fgColor} on ${data.bgColor} = ${data.contrastRatio}:1` : '';
        return [`${label}: ${v.id}${colours} @ ${n.target.join(' ')}`];
      }),
    );
    expect(summary).toEqual([]);
  };
  // Entrance animations settle first so contrast is measured on final colours.
  const settle = (ms: number) => page.waitForTimeout(ms);

  await page.goto('/');
  await expect(cta(page, 'Start the hunt')).toBeVisible();
  await settle(1500);
  await check('welcome');
  await cta(page, 'Start the hunt').click();
  await expect(step(page, 'from')).toBeVisible();
  await settle(1200);
  await check('from');
  await answerFrom(page);
  await expect(step(page, 'time')).toBeVisible();
  await settle(1200);
  await check('time');
  await answerTime(page);
  await expect(step(page, 'role')).toBeVisible();
  await settle(1200);
  await check('role');
  await answerRole(page);
  await expect(step(page, 'language')).toBeVisible();
  await settle(1200);
  await check('language');
  await answerLanguage(page);
  await expect(step(page, 'base')).toBeVisible();
  await settle(1200);
  await check('base');
  await dropPinWithKeyboard(page);
  await expect(step(page, 'topics')).toBeVisible();
  await settle(1200);
  await check('topics');
  await rankTopics(page);
  await cta(page, 'Stamp my passport').click();
  await expect(step(page, 'done')).toBeVisible();
  await settle(2200);
  await check('done');
});

// /onboarding is filtered out of e2e/routes.ts (a finished user is redirected), so the page-level
// checks smoke.spec.ts runs on every route run here, on every step of a first-time user's walk.
async function walkSteps(page: Page, onStep: (id: string) => Promise<void>) {
  const at = async (id: string) => {
    await expect(step(page, id)).toBeVisible();
    await onStep(id);
  };
  await page.goto('/');
  await expect(cta(page, 'Start the hunt')).toBeVisible();
  await onStep('welcome');
  await cta(page, 'Start the hunt').click();
  await at('from');
  await answerFrom(page);
  await at('time');
  await answerTime(page);
  await at('role');
  await answerRole(page);
  await at('language');
  await answerLanguage(page);
  await at('base');
  await dropPinWithKeyboard(page);
  await at('topics');
  await rankTopics(page);
  await cta(page, 'Stamp my passport').click();
  await at('done');
}

test('no runtime errors or broken images on any onboarding step', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await walkSteps(page, async (id) => {
    await expect(page.getByRole('main')).toBeVisible();
    await page.locator('img[loading="lazy"]').evaluateAll((imgs) => imgs.forEach((img) => ((img as HTMLImageElement).loading = 'eager')));
    await expect
      .poll(() => page.locator('img').evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).complete)))
      .toBe(true);
    const broken = await page.locator('img').evaluateAll((imgs) =>
      imgs.filter((img) => (img as HTMLImageElement).naturalWidth === 0).map((img) => (img as HTMLImageElement).src),
    );
    expect(broken, `broken image on ${id}`).toEqual([]);
  });
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 1440]) {
  test(`no horizontal overflow on any onboarding step at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await walkSteps(page, async (id) => {
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflows, `${id} overflows at ${width}px`).toBe(false);
    });
  });
}

test('every onboarding step uses the shared centred content column at 1440', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const widths = new Set<number>();
  await page.goto('/');
  const contentMax = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--content-max')));
  await walkSteps(page, async (id) => {
    if (id === 'welcome') return; // the cover draws no step column
    const box = (await page.locator('main > * > *').first().boundingBox())!; // the flow's column
    expect(Math.abs(box.x + box.width / 2 - 720), `${id} is off-centre`).toBeLessThanOrEqual(3);
    widths.add(Math.round(box.width));
  });
  expect([...widths], "one column width, the shared --content-max").toEqual([contentMax]);
});
