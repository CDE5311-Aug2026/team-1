import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test';
import { ROUTES, seed } from './routes';

// WCAG 2.2 A/AA automated checks (axe) on every route at phone size. Catches contrast, names,
// landmarks and heading order; it does not replace a screen-reader pass.

// Accepted exception (owner decision 2026-10-13: keep the Figma brand orange): it is 3.35:1 against
// white text and backgrounds, below AA's 4.5:1. Every other colour pair must pass.
const FIGMA_BRAND_ORANGES = ['#e4671f', '#e8622c'];

for (const route of ROUTES) {
  test(`no WCAG A/AA violations on ${route}`, async ({ page }) => {
    await page.goto('/');
    await seed(page, route);
    await page.goto(route);
    await expect(page.getByRole('main')).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    // For contrast, report the colour pair and ratio so a failure says what to change.
    const summary = violations.flatMap((v) =>
      v.nodes.flatMap((n) => {
        const data = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
        if (data && [data.fgColor, data.bgColor].some((c) => FIGMA_BRAND_ORANGES.includes(c ?? ''))) return [];
        const colours = data?.fgColor ? ` ${data.fgColor} on ${data.bgColor} = ${data.contrastRatio}:1` : '';
        return [`${v.id}${colours} @ ${n.target.join(' ')}`];
      }),
    );
    expect(summary).toEqual([]);
  });
}
