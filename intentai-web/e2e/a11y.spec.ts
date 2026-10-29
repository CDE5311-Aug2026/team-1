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
    // Scan the settled page: reduced motion stops decorative loops (Ken Burns, spinning text) and shows final
    // states, so axe reads real colours and WebKit's software renderer is not kept busy painting.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await seed(page, route);
    await page.goto(route);
    await expect(page.getByRole('main')).toBeVisible();
    // Entrance animations fade text in; axe would read the half-faded colours. Let every running, finite animation
    // and transition finish so the real colours are checked (nothing is skipped or relaxed). Paused ones (a stopped
    // record) never finish and WebKit can keep others pending, so the wait is capped.
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
