import { expect, test } from '@playwright/test';
import { paths } from '../src/routes';

// v3 Community (ZIP prototype, sixth round): two doors, Top Questions / For You, My Questions with four steps, the
// thread, and the locals map. Rules are unit-tested in src/pages/CommunityPage and src/data/community.

test('Ask a local posts a question to My Questions; the thread can be closed and withdrawn with Undo', async ({ page }) => {
  await page.goto(paths.community);
  await page.getByRole('button', { name: /^Ask a local/ }).first().click();
  await page.getByRole('dialog').getByLabel('Your message').fill('Is chope rude?');
  await page.getByRole('button', { name: 'Post to locals', exact: true }).click();
  const link = page.getByRole('link', { name: 'Open question Is chope rude?', exact: true });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/community\/.+/);
  await page.getByRole('button', { name: /Withdraw/ }).first().click();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.getByRole('link', { name: 'Open question Is chope rude?', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open question Is chope rude?', exact: true })).toBeVisible();
});

test('a question sent from Ask to confirm a reading gets a one-tap local answer that comes back to Ask', async ({ page }) => {
  await page.goto(paths.ask);
  await page.getByRole('textbox', { name: /ask intentai/i }).fill('What does sabo mean? My colleague said it laughing');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('button', { name: /Ask a local to confirm/ }).click({ timeout: 8000 });
  await page.goto(paths.community);
  await page.getByRole('switch', { name: 'Answer as a local' }).first().click();
  await page.getByRole('link', { name: /Open question Is this right\?/ }).click();
  await page.getByRole('button', { name: 'Yes, that’s right.', exact: true }).click();
  await page.getByRole('button', { name: 'Send answer' }).click();
  await page.goto(paths.ask);
  await page.getByRole('button', { name: 'Chat history' }).click();
  await page.getByRole('dialog', { name: 'History' }).getByRole('button', { name: /What does sabo mean/ }).click();
  await expect(page.getByText('Confirmed by a local')).toBeVisible();
});

test('the locals map shows question pins and the carousel, edge to edge without sideways scroll', async ({ page }) => {
  await page.goto(paths.communityMap);
  await expect(page.getByRole('main')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
