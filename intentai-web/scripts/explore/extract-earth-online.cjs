// Dumps the EARTH ONLINE Singapore dataset (placed landmarks/sites with their page coordinates, and the
// window.LM_INFO intro cards) from the City Brush page, by running it headless.
// usage: CHROME=/path/to/chrome THREE_DIR=<dir with three@0.128.0> node scripts/explore/extract-earth-online.cjs <earth_online/site> <out.json>
// (three r128 is loaded from THREE_DIR because the page normally takes it from a CDN.)
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox','--use-gl=swiftshader', '--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const fs = require('fs'), path = require('path');
  const SITE = require('path').resolve(process.argv[2]);
  const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp' };
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith('three.min.js')) return route.fulfill({ path: require('path').join(process.env.THREE_DIR || '.', 'node_modules/three/build/three.min.js'), contentType: 'text/javascript' });
    if (u.pathname.endsWith('OrbitControls.js')) return route.fulfill({ path: require('path').join(process.env.THREE_DIR || '.', 'node_modules/three/examples/js/controls/OrbitControls.js'), contentType: 'text/javascript' });
    if (u.hostname === 'site.local') { const f = path.join(SITE, decodeURIComponent(u.pathname)); if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' }); return route.fulfill({ path: f, contentType: T[path.extname(f)] || 'application/octet-stream' }); }
    return route.abort();
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('c:' + m.text().slice(0, 200)); });
  await page.goto('http://site.local/index.html', { timeout: 120000 });
  let st = null;
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(5000); st = await page.evaluate('JSON.stringify(window.SGCard && SGCard.stats())'); if (i % 4 === 0) console.log(i, st); if (st && JSON.parse(st).landmarks > 50) break; }
  await page.waitForTimeout(5000);
  const data = await page.evaluate(() => {
    const T = SGCard._t, info = window.LM_INFO, out = {};
    const keys = new Set(Object.keys(info));
    for (const k of keys) {
      try { const t = T.sgcByKey(k); if (t) out[k] = { kind: t.kind, key: t.key, name: t.name, x: t.x, y: t.y, h: t.h, cat: t.cat, label: t.label }; } catch (e) {}
    }
    const sites = T.sites().map((S) => ({ key: S.key, zh: S.zh, en: S.en, x: S.x, y: S.y, labels: (S.labels || []).map((b) => ({ zh: b.zh, en: b.en, x: b.x, y: b.y })) }));
    return { targets: out, sites, info, coverage: SGCard.coverage(), stats: SGCard.stats() };
  });
  require('fs').writeFileSync(process.argv[3] || 'earth-online-sg.json', JSON.stringify(data));
  console.log('targets', Object.keys(data.targets).length, 'sites', data.sites.length, JSON.stringify(data.coverage).slice(0,600), JSON.stringify(data.stats), errors.slice(0,5));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
