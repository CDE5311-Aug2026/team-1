// Pictures for Nearby places from the EARTH ONLINE 3D model (the bundled lite page), headless (software WebGL).
// node scripts/explore/thumbs.cjs <raw png dir> [onlyIdsCsv]      then: python3 scripts/explore/thumbs-pack.py <raw png dir>
// Places that already have a png in the dir are skipped, so an interrupted run resumes. Slow: ~45 s a place on 2 CPUs.
// Optional PW_CHROMIUM_PATH points at a Chromium.
// Landmarks with a model: open the model's card and use its "Fly closer" framing. Places without a model: the area
// around the point from ~380 m. UI, labels and the selection ring are hidden for the shot.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const SITE = path.join(__dirname, '..', '..', 'public', 'earth-online', 'sg');
const placesFile = path.join(__dirname, '..', '..', 'src', 'data', 'explore', 'places.sg.json');
const [OUT, only] = process.argv.slice(2);
if (!OUT) { console.error('usage: node scripts/explore/thumbs.cjs <raw png dir> [ids]'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const LON0 = 103.845, LAT0 = 1.315, MX = 111290.5, MY = 110574.0;
const xy = (c) => [(c.lng - LON0) * MX, (c.lat - LAT0) * MY];
let places = JSON.parse(fs.readFileSync(placesFile, 'utf8')).filter((p) => p.editorialStatus === 'published');
if (only) { const set = new Set(only.split(',')); places = places.filter((p) => set.has(p.id)); }
places = places.filter((p) => !fs.existsSync(path.join(OUT, p.id.replace(/^curated:/, '') + '.png')));
// groups: every place within 2 km of its group's first place (the lite view stays within 3 km of the focus)
const groups = [];
for (const p of places) {
  const q = xy(p.coordinates);
  const g = groups.find((g) => Math.hypot(g.f[0] - q[0], g.f[1] - q[1]) < 2000);
  if (g) g.items.push(p); else groups.push({ f: q, c: p.coordinates, items: [p] });
}
console.log(places.length, 'places in', groups.length, 'groups');
const HIDE = '#timebar,#labels,section.sgc,#busy,.lbl{display:none!important}';
(async () => {
  const browser = await chromium.launch({ ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [gi, g] of groups.entries()) {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 240 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (u.hostname !== 'site.local') return route.abort();
      const f = path.join(SITE, decodeURIComponent(u.pathname));
      if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ path: f, contentType: f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.webp') ? 'image/webp' : f.endsWith('.js') ? 'text/javascript' : 'text/plain; charset=utf-8' });
    });
    try {
      await page.goto(`http://site.local/lite.html#at=${g.c.lat.toFixed(5)},${g.c.lng.toFixed(5)}&pin=0&still=1&r=3000`, { timeout: 120000 });
      await page.addStyleTag({ content: HIDE });
      await page.waitForFunction(() => window.SGLite && window.SGLite.stats().tilesBuilt > 0 && window.SGLite.stats().queue === 0, null, { timeout: 300000, polling: 2000 });
    } catch (e) { console.log('group', gi, 'failed to load', e.message.slice(0, 80)); await ctx.close(); continue; }
    for (const p of g.items) {
      const id = p.id.replace(/^curated:/, '');
      const q = xy(p.coordinates);
      try {
        const how = await page.evaluate(async ([key, x, y]) => {
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          if (key && window.SGCard.open(key)) {
            window.SGCard.fly();
            await wait(2200);
            // the card's framing is for a full screen; a thumbnail needs the model bigger
            const d = (window.SGCard.state().flew || {}).dist || 400;
            window.SGLite.zoom(d < 250 ? 0.55 : d > 1200 ? 0.5 : 0.7);
            window.SGCard.close();
            return 'model';
          }
          window.SGLite.look(x, y, 380, 30, 40);
          return 'area';
        }, [p.earthKey || null, q[0], q[1]]);
        await page.waitForFunction(() => window.SGLite.stats().queue === 0, null, { timeout: 120000, polling: 1000 });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(OUT, id + '.png'), timeout: 120000 });
        fs.appendFileSync(path.join(OUT, 'log.txt'), `${id}\t${how}\n`);
        console.log('ok', id, how);
      } catch (e) { console.log('fail', id, e.message.slice(0, 100)); }
    }
    await ctx.close();
  }
  await browser.close();
})();
