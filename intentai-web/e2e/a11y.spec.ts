import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ROUTES, seed } from './routes';

// WCAG 2.2 A/AA automated checks (axe) on every route at phone size. Catches contrast, names,
// landmarks and heading order; it does not replace a screen-reader pass.

// Accepted exception (owner decision 2026-10-13: keep the Figma brand orange): it is 3.35:1 against
// white text and backgrounds, below AA's 4.5:1. Every other colour pair must pass.
const FIGMA_BRAND_ORANGES = ['#e4671f', '#e8622c'];

for (const route of ROUTES) {
  test(`no WCAG A/AA violations on ${route}`, async ({ page }) => {
    // Check the settled page: with motion, axe can catch text mid-fade (low opacity) and report false contrast.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await seed(page, route);
    await page.goto(route);
    await expect(page.getByRole('main')).toBeVisible();
    // Entrance fades (motion keeps opacity fades even with reduced motion) must finish before contrast is measured.
    await page.waitForFunction(() => Array.from(document.querySelectorAll('main *')).every((el) => Number(getComputedStyle(el).opacity) === 1 || getComputedStyle(el).opacity === '0'), null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    // A control that is only covered by the floating bottom navigation at this scroll position (it scrolls clear)
    // is not a target-size problem; nor is a 64px-tall tab of that navigation that a scrolling row passes under.
    const underNav = async (selector: string) =>
      page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        if (el.closest('nav[aria-label="Primary"]')) return true;
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return Boolean(hit?.closest('nav[aria-label="Primary"]'));
      }, selector);
    const covered = new Set<string>();
    for (const v of violations.filter((x) => x.id === 'target-size')) {
      for (const n of v.nodes) if (await underNav(String(n.target[0]))) covered.add(String(n.target[0]));
    }
    // For contrast, report the colour pair and ratio so a failure says what to change.
    const summary = violations.flatMap((v) =>
      v.nodes.flatMap((n) => {
        if (v.id === 'target-size' && covered.has(String(n.target[0]))) return [];
        const data = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
        if (data && [data.fgColor, data.bgColor].some((c) => FIGMA_BRAND_ORANGES.includes(c ?? ''))) return [];
        const colours = data?.fgColor ? ` ${data.fgColor} on ${data.bgColor} = ${data.contrastRatio}:1` : '';
        return [`${v.id}${colours} @ ${n.target.join(' ')}`];
      }),
    );
    expect(summary).toEqual([]);
  });
}
