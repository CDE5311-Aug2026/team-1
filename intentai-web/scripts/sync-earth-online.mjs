#!/usr/bin/env node
// Copies the EARTH ONLINE (City Brush) Singapore 3D page and its data into public/earth-online/sg/, so
// "View in 3D" works on the same origin. Usage: node scripts/sync-earth-online.mjs <earth_online>/site
// The page is published as a full document: a doctype + UTF-8 charset are added (the source file is a
// body fragment), plus scripts/earth-online-bridge.js for ?card= / ?at= deep links.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(process.argv[2] ?? '');
const out = resolve(here, '../public/earth-online/sg');
const page = join(src, 'index.html');
if (!process.argv[2] || !statSync(page, { throwIfNoEntry: false })) {
  console.error('usage: node scripts/sync-earth-online.mjs <path to earth_online/site>');
  process.exit(1);
}
mkdirSync(join(out, 'sgdata'), { recursive: true });
let html = readFileSync(page, 'utf8');
if (!/<meta name="citybrush-map" content="sg">/.test(html)) {
  console.error('index.html is not the Singapore City Brush page');
  process.exit(1);
}
const head =
  '<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  '<meta name="robots" content="noindex">\n' +
  // Only Singapore is bundled here, so the five-city switch (which links to the authors' own copies) is hidden.
  '<style>.cityseg{display:none!important}</style>\n';
html = head + html.replace(/^<!doctype html>\s*/i, '');
const bridge = readFileSync(join(here, 'earth-online-bridge.js'), 'utf8');
html += `\n<script>\n${bridge}</script>\n`;
writeFileSync(join(out, 'index.html'), html);
let bytes = html.length;
for (const f of readdirSync(join(src, 'sgdata'))) {
  copyFileSync(join(src, 'sgdata', f), join(out, 'sgdata', f));
  bytes += statSync(join(out, 'sgdata', f)).size;
}
console.log(`EARTH ONLINE Singapore page copied to ${out} (${(bytes / 1e6).toFixed(1)} MB)`);
