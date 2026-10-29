import { expect, test } from '@playwright/test';
import { paths } from '../src/routes';

// v3 Home (Intent v3 Figma 1): greeting, Nearby map with the place carousel, place page (Album Rail) and card pages.
// Data rules are unit-tested in src/data/home and src/pages/TodayPage, PlacePage, CardPage.

test('Home greets, shows the Nearby map and its places; a place opens its Album Rail and a card', async ({ page }) => {
  await page.goto(paths.today);
  await expect(page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), W$/ })).toBeVisible();
  await expect(page.getByText(/places to explore/)).toBeVisible();
  await page.goto(paths.place('sg-chinatown'));
  await expect(page.getByRole('heading', { name: /Chinatown/ }).first()).toBeVisible();
  await page.goto(paths.card('thian-hock-keng'));
  await expect(page.getByRole('heading', { name: /Thian Hock Keng/ }).first()).toBeVisible();
});

test('the tab bar sits at the bottom with five tabs and Home current', async ({ page }) => {
  await page.goto(paths.today);
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('button')).toHaveText(['Home', 'Ask', 'Community', 'Moments', 'My Space']);
  await expect(nav.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
});
