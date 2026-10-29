import { expect, test } from '@playwright/test';
import { paths } from '../src/routes';

// Nearby is part of the app, not a separate site: its pages keep the app's tabs, and a check-in there is the same
// data Home, Moments (My Places) and My Space read.

test('Nearby pages keep the app tabs, so Home and My Space are one tap away', async ({ page }) => {
  for (const url of [paths.nearby, paths.nearbyPlace('curated:sg-marina-bay-sands'), paths.saved, paths.collections]) {
    await page.goto(url);
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('button', { name: 'Home' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'My Space' })).toBeVisible();
  }
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'My Space' }).click();
  await expect(page).toHaveURL(/\/my-space$/);
});

test('a check-in in an area without cards gets a stamp in Moments and counts in My Space', async ({ page }) => {
  await page.goto(paths.nearbyPlace('curated:sg-marina-bay-sands'));
  await page.getByRole('button', { name: 'Check in' }).click();
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Moments' }).click();
  await expect(page.getByRole('button', { name: /Marina Bay, checked in, no cards here yet/ })).toBeVisible();
  await page.getByRole('button', { name: /Marina Bay, checked in/ }).click();
  await expect(page.getByRole('link', { name: /Marina Bay Sands/ })).toBeVisible();
  await page.goto(paths.mySpace);
  await expect(page.getByText('Stamps').locator('..')).toContainText('1');
});

test('a Nearby culture card opens the same card as Home (Team 1’s story page), and Moments counts it', async ({ page }) => {
  await page.goto(paths.nearbyPlace('curated:sg-thian-hock-keng-temple'));
  await page.getByRole('button', { name: 'Check in' }).click();
  await page.getByRole('link', { name: 'Open card' }).click();
  await expect(page).toHaveURL(/\/place\/chinatown\/monument$/);
  await page.goto(paths.moments);
  await expect(page.getByRole('button', { name: /Chinatown, 1 of 3 cards opened/ })).toBeVisible();
});
