// Today's Nearby map card: a picture of the Nearby 2D map of Singapore (the app's own EARTH ONLINE map, as Explore
// draws it at the country overview, without area names), with a small dot for every published place in its category colour.
// usage: npm run build && npx vite preview --port 4810 &  then
//        PW_CHROMIUM_PATH=… node scripts/today/map-preview.mjs http://localhost:4810 public/nearby/today-map.png
// Re-run when the catalogue (places) or the map style changes. The card is 350 × 160 CSS px; the picture is 3×.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4810', out = 'public/nearby/today-map.png'] = process.argv.slice(2);
const W = 350, H = 160;
const COLORS = { landmark: '#6b5bd6', food: '#e4671f', nature: '#2f8a4b', culture: '#c2408d' };
const places = JSON.parse(readFileSync('src/data/explore/places.sg.json', 'utf8'))
  .filter((p) => p.editorialStatus === 'published')
  .map((p) => ({ lat: p.coordinates.lat, lng: p.coordinates.lng, color: COLORS[p.category] }));

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
// phone layout; the map's uncovered part (right of nothing, left of the 64 px of map buttons) is exactly W wide
const page = await browser.newPage({ viewport: { width: W + 64, height: 844 }, deviceScaleFactor: 4 });
await page.goto(`${base}/nearby`);
// the user-test start screen (a local preview has no usage server, so nothing is recorded anywhere)
if (!base.startsWith('http://localhost')) throw new Error('run against a local preview build');
const gate = page.getByLabel('Test name');
if (await gate.count()) {
  await gate.fill('MAP-PREVIEW');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.goto(`${base}/nearby`);
}
await page.waitForFunction(() => document.fonts.ready.then(() => true));
await page.waitForTimeout(2500); // ground picture and road layers
const box = await page.evaluate(({ places, W, H }) => {
  const map = document.querySelector('[data-testid="city-map"]');
  const [cx, cy] = map.dataset.center.split(',').map(Number);
  const scale = Number(map.dataset.scale);
  const r = map.getBoundingClientRect();
  const style = document.createElement('style');
  // only the map's ground and roads (the card puts its own words on it): no area names, pins, buttons, sheet, search bar or status bar
  style.textContent = `body * { visibility: hidden !important; }
    [data-testid="city-map"] > canvas, [data-testid="city-map"] > svg, [data-testid="city-map"] > svg *, #dots, #dots * { visibility: visible !important; }
    [data-testid="city-map"] > svg circle, [data-testid="city-map"] > svg text { display: none; }`;
  document.head.append(style);
  const dots = document.createElement('div');
  dots.id = 'dots';
  dots.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99;pointer-events:none`;
  for (const p of places) {
    const x = (p.lng - 103.845) * 111290.5, y = (p.lat - 1.315) * 110574.0;
    const sx = (x - cx) * scale + r.width / 2, sy = (cy - y) * scale + r.height / 2;
    const d = document.createElement('span');
    d.style.cssText = `position:absolute;left:${sx - 2.25}px;top:${sy - 2.25}px;width:4.5px;height:4.5px;border-radius:50%;background:${p.color};box-shadow:0 0 0 1px #fff`;
    dots.append(d);
  }
  document.body.append(dots);
  // the main island, 46 km wide around its middle (Woodlands' shore and the southern islands are just cut)
  const view = { lat: 1.345, lng: 103.822, widthM: 46000 };
  const x = (view.lng - 103.845) * 111290.5, y = (view.lat - 1.315) * 110574.0;
  const w = view.widthM * scale, h = (w * H) / W;
  return { x: r.left + (x - cx) * scale + r.width / 2 - w / 2, y: r.top + (cy - y) * scale + r.height / 2 - h / 2, w, h };
}, { places, W, H });
await page.waitForTimeout(300);
// shot at the map's own size, then scaled to the card (3×) by the caller's image tool
const raw = out.replace(/\.(png|webp)$/, '.raw.png');
await page.screenshot({ path: raw, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
console.log(`map shot ${box.w.toFixed(0)}×${box.h.toFixed(0)} CSS px → resize to ${W * 3}×${H * 3}`);
await browser.close();
console.log(`wrote ${out} (${places.length} places)`);
