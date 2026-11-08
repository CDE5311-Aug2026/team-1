import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test';

// A whole user test on one device with no server: test name → use the app → the dashboard reads this
// device's log, shows the analysis, and exports a file.
test.describe('user test without a server', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a named session reaches the dashboard from this device, which passes axe and exports', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Test name').fill('P09');
    // the facilitator picks the study version; B is this app (A redirects to the frozen UI1)
    await page.getByRole('radiogroup', { name: 'Version' }).getByRole('radio', { name: 'B', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: /Start the hunt/ }).click(); // v3 onboarding (Figma O1)
    await page.waitForTimeout(1200);
    // a full load ends the Welcome visit (pagehide) and starts a new one (the v1 /nearby explorer is retired: Saved)
    await page.goto('/nearby/saved');
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /^Checked in/ }).click();
    await page.waitForTimeout(600);
    await page.goto('/admin');
    await expect(page.getByRole('button', { name: 'This device', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'User test analysis' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'People in the test' })).toContainText('P09');
    await expect(page.getByRole('table', { name: 'Pages in detail' })).toContainText('Nearby saved');
    await expect(page.getByText(/Checked in/).first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id} @ ${v.nodes[0]?.target}`)).toEqual([]);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export file (JSON)' }).click();
    expect((await download).suggestedFilename()).toMatch(/^findsg-usage-P09-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
