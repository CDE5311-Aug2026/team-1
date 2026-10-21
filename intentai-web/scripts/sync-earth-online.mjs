#!/usr/bin/env node
// Builds the phone-friendly EARTH ONLINE (City Brush) Singapore 3D page and copies its data into public/earth-online/sg/,
// so Nearby's 3D view runs on the same origin.
// Usage: node scripts/sync-earth-online.mjs <earth_online checkout>     (needs python3)
//   1. <earth_online>/src: python3 sgreal/patch17.py city-brush-v16.html with LITE_SKIP left out (driving, flying, navigation,
//      traffic, races, multiplayer, admin, ads/signs, port, aircraft, fireworks, kaiju, army, the five-city switch);
//      kept: roads, buildings, landmarks and their cards, time of day / sun and sky, weather, sound, language, sharp ground.
//   2. scripts/earth-online-lite.py turns that build into public/earth-online/sg/lite.html (nearby-only loading, phone limits,
//      only the time bar and the cards on screen, postMessage bridge).
//   3. <earth_online>/site/sgdata/* is copied next to it. vendor/ (three.js r128, MIT) is committed, not synced.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LITE_SKIP = [
  'lm20/air/air.js',
  'lm20/signs/signs.js',
  'lm20/port/port.js',
  'lm20/f1d/f1d.js',
  'lm20/f1track/f1track.js',
  'lm20/traffic/traffic.js',
  'lm20/crown/crown.js',
  'lm24/admin/admin.js',
  'lm24/fly/fly.js',
  'lm27/phys/phys.js',
  'lm25/kaiju/kaiju.js',
  'lm25/cityrace/cityrace.js',
  'lm25/net/net.js',
  'lm27/fireworks/fireworks.js',
  'lm28/army/army.js',
  'lm30/nav/nav.js',
  'sgreal/app/cityswitch.js',
];

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(process.argv[2] ?? '');
const srcDir = join(repo, 'src');
const dataDir = join(repo, 'site', 'sgdata');
const out = resolve(here, '../public/earth-online/sg');
if (!process.argv[2] || !statSync(join(srcDir, 'city-brush-v16.html'), { throwIfNoEntry: false }) || !statSync(dataDir, { throwIfNoEntry: false })) {
  console.error('usage: node scripts/sync-earth-online.mjs <path to an earth_online checkout (with src/ and site/sgdata/)>');
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'earth-online-'));
const built = join(tmp, 'sg.lite0.html');
execFileSync('python3', ['sgreal/patch17.py', 'city-brush-v16.html', built], {
  cwd: srcDir,
  env: { ...process.env, CITY: 'sg', SKIP_MODS: LITE_SKIP.join(',') },
  stdio: ['ignore', 'ignore', 'inherit'],
});
if (!/<meta name="citybrush-map" content="sg">/.test(readFileSync(built, 'utf8').slice(0, 400))) {
  console.error('the build is not the Singapore City Brush page');
  process.exit(1);
}
mkdirSync(join(out, 'sgdata'), { recursive: true });
execFileSync('python3', [join(here, 'earth-online-lite.py'), built, join(out, 'lite.html')], { stdio: ['ignore', 'ignore', 'inherit'] });
rmSync(tmp, { recursive: true, force: true });
// The full page (driving, navigation, …) is not bundled any more.
rmSync(join(out, 'index.html'), { force: true });

let bytes = statSync(join(out, 'lite.html')).size;
for (const f of readdirSync(dataDir)) {
  copyFileSync(join(dataDir, f), join(out, 'sgdata', f));
}
// Singapore only: the neighbouring coasts in the ground picture become sea, for the 3D page and the 2D map alike
execFileSync('python3', [join(here, 'explore', 'sg-only-ground.py'), join(dataDir, 'sg_base.txt'), join(dataDir, 'ground.webp'), join(out, 'sgdata', 'ground.webp')], { stdio: ['ignore', 'ignore', 'inherit'] });
copyFileSync(join(out, 'sgdata', 'ground.webp'), resolve(here, '../src/assets/nearby/sg-ground.webp'));
for (const f of readdirSync(join(out, 'sgdata'))) bytes += statSync(join(out, 'sgdata', f)).size;
console.log(`EARTH ONLINE Singapore lite 3D page built in ${out} (${(bytes / 1e6).toFixed(1)} MB with data)`);
