import { expect, test } from '@playwright/test';
import { paths } from '../src/routes';

// Nearby is part of the app, not a separate site: its list pages keep the app's tabs, and a check-in there is the same
// data Home, the Passport (collection and journal), Moments and My Space read.
// v2 (plan C6): the tabs are Home · Hunt · Passport plus a round Search button; Moments left the tab bar and is reached
// from the Passport's journal (its route stays). Full-screen pages (a place page with its sticky "Stamp here" bar,
// board 08) show no tab bar and lead back with their Back button instead.

test('Nearby pages keep the app tabs, so Home and Passport are one tap away', async ({ page, context }) => {
  for (const url of [paths.saved, paths.collections]) {
    await page.goto(url);
    const nav = page.getByRole('navigation', { name: 'Primary' });
    for (const name of ['Home', 'Hunt', 'Passport', 'Search']) await expect(nav.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Passport' }).click();
  await expect(page).toHaveURL(/\/my-space$/);
  // full-screen Nearby pages have no tabs; ✕ leads out: a place opened on its own goes Home, where the tabs are
  // (the v1 Nearby explorer is retired, owner 8 Nov 2026)
  await page.goto(paths.nearbyPlace('curated:sg-marina-bay-sands'));
  await expect(page.getByRole('heading', { level: 1, name: 'Marina Bay Sands' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeAttached();
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Home' })).toBeVisible();
  // old links to the explorer and its location page land on Home too
  for (const old of [paths.nearby, `${paths.nearby}?area=sg-chinatown`, paths.nearbyLocation]) {
    const tab = await context.newPage();
    await tab.goto(old);
    await expect.poll(() => new URL(tab.url()).pathname).toBe('/');
    await expect(tab.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeAttached();
    await expect(tab.getByRole('heading', { level: 1, name: 'Nearby' })).toHaveCount(0);
    await tab.close();
  }
});

test('a check-in in an area without cards gets a stamp in the Passport journal (Moments) and counts in the Passport', async ({ page }) => {
  await page.goto(paths.nearbyPlace('curated:sg-marina-bay-sands'));
  await page.getByRole('button', { name: 'Stamp here' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Checked in at Marina Bay Sands' })).toBeVisible();
  await page.goto(paths.mySpace);
  const holder = page.getByRole('region', { name: 'Passport holder' });
  await expect(holder.getByRole('term').filter({ hasText: 'Stamps' }).locator('xpath=following-sibling::*[1]')).toHaveText('1');
  await expect(page.getByRole('region', { name: 'My collection' }).getByRole('link', { name: /Marina Bay Sands Stamped/ })).toBeVisible();
  // the journal day opens Moments, where the area stamp sits
  await page.getByRole('region', { name: 'Journal' }).getByRole('link', { name: /Open in your journal/ }).click();
  await expect(page).toHaveURL(/\/moments/);
  await expect(page.getByRole('button', { name: /Marina Bay, checked in, no cards here yet/ })).toBeVisible();
  await page.getByRole('button', { name: /Marina Bay, checked in/ }).click();
  await expect(page.getByRole('link', { name: /Marina Bay Sands/ }).first()).toBeVisible();
});
