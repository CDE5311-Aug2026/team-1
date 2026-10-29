// Screenshot a page of the running dev server (http://localhost:5179) at phone size, past the user-test gate.
// Usage (from intentai-web/): node v3-shot.tmp.mjs /community out.png [waitMs] [width]
import { chromium } from '@playwright/test';

const [path = '/', out = 'shot.png', wait = '1500', width = '390'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: Number(width), height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript(() => {
  localStorage.setItem('intentai:v1:tester', JSON.stringify({ name: 'DEV', startedAt: Date.now() }));
  if (!localStorage.getItem('intentai:v1:onboarding')) localStorage.setItem('intentai:v1:onboarding', JSON.stringify({ done: true }));
});
await page.goto(`http://localhost:5179${path}`);
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out, fullPage: process.env.FULL === '1' });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log(overflow ? 'HORIZONTAL OVERFLOW' : 'ok');
await browser.close();
