import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// A whole user test on one device with no server: test name → use the app → the dashboard reads this
// device's log, shows the analysis, and exports a file.
test.describe('user test without a server', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a named session reaches the dashboard from this device, which passes axe and exports', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Test name').fill('P09');
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'Get started' }).click();
    await page.waitForTimeout(1200);
    await page.goto('/nearby'); // a full load ends the Welcome visit (pagehide) and starts a new one
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: "Editor's picks" }).click();
    await page.waitForTimeout(600);
    await page.goto('/admin');
    await expect(page.getByRole('button', { name: 'This device', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'User test analysis' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'People in the test' })).toContainText('P09');
    await expect(page.getByRole('table', { name: 'Pages in detail' })).toContainText('Nearby');
    await expect(page.getByText("Editor's picks").first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id} @ ${v.nodes[0]?.target}`)).toEqual([]);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export file (JSON)' }).click();
    expect((await download).suggestedFilename()).toMatch(/^intentai-usage-P09-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
