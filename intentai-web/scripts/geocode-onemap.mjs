// Geocode the Tourism 2040 research rows through OneMap Search (SLA), Redesign v2 R0.
//
//   node scripts/geocode-onemap.mjs            # query rows with an onemapQuery (cached), write the hit back
//   node scripts/geocode-onemap.mjs --offline  # use the cache only
//
// Reads and rewrites src/data/explore/research/tourism2040.csv (columns lat, lng, pinQuality, onemapHit,
// onemapUrl). Responses are cached in research/onemap-cache.json so reruns make no requests. No token is needed
// for the search endpoint. Throttled to about 4 requests per second.
//
// Pin quality (B7): `building` when the hit's BUILDING carries the query's words; `street` when only the road
// matches; rows the research doc marks as an area point keep `area`; a row with no trustworthy hit has no
// coordinates (pin stays `approx`), and nothing is filled in.
// With research/crosswalk.csv present, hits more than 150 m from the matched record's coordinates are listed
// for review (A3/B7). Existing coordinates are never changed by this script.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { metres, normName, readCsv, writeCsv } from './tourism-map.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '../src/data/explore');
const CSV = join(DIR, 'research/tourism2040.csv');
const CACHE = join(DIR, 'research/onemap-cache.json');
const offline = process.argv.includes('--offline');

export const onemapUrl = (q) =>
  `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

async function search(q) {
  const url = onemapUrl(q);
  if (cache[url]) return cache[url];
  if (offline) return null;
  let res;
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(260 * 2 ** attempt); // ~4 req/s, backing off when OneMap answers 429
    res = await fetch(url, { headers: { 'User-Agent': 'FindSG research import (tourism2040)' } });
    if (res.status !== 429) break;
  }
  if (!res.ok) throw new Error(`OneMap ${res.status} for ${q}`);
  const body = await res.json();
  // keep only what we use; the endpoint also sends a token notice we do not need
  cache[url] = { found: body.found ?? 0, results: (body.results ?? []).slice(0, 10) };
  return cache[url];
}

const words = (s) => normName(s).split(' ').filter((w) => w.length > 1 && !['the', 'of', 'at', 'and', 'singapore'].includes(w));
const covers = (text, q) => {
  const t = new Set(words(text));
  const need = words(q);
  return need.length > 0 && need.every((w) => t.has(w));
};

/** The best result for a query, with the pin quality it supports. */
export function pick(q, results) {
  for (const r of results) if (r.BUILDING && r.BUILDING !== 'NIL' && covers(r.BUILDING, q)) return { r, quality: 'building' };
  for (const r of results) if (covers(r.SEARCHVAL, q) && r.BUILDING && r.BUILDING !== 'NIL') return { r, quality: 'building' };
  for (const r of results) if (r.ROAD_NAME && r.ROAD_NAME !== 'NIL' && covers(`${r.BLK_NO} ${r.ROAD_NAME}`, q)) return { r, quality: r.BLK_NO ? 'building' : 'street' };
  return null;
}

const rows = readCsv(readFileSync(CSV, 'utf8'));
let hits = 0;
for (const row of rows) {
  const q = row.onemapQuery;
  row.lat = row.lng = row.onemapHit = row.onemapUrl = '';
  row.pinQuality = /area/i.test(row.docPin) ? 'area' : 'approx';
  if (!q) continue;
  const res = await search(q);
  const got = res && pick(q, res.results);
  if (!got) {
    console.warn(`no trustworthy hit: ${row.docRow} ${row.name} (query "${q}")`);
    continue;
  }
  hits++;
  row.lat = Number(got.r.LATITUDE).toFixed(6);
  row.lng = Number(got.r.LONGITUDE).toFixed(6);
  row.onemapHit = `${got.r.SEARCHVAL} | ${got.r.ADDRESS}`;
  row.onemapUrl = onemapUrl(q);
  // the research doc's area points stay area points, even when OneMap names a building on the site
  row.pinQuality = /area/i.test(row.docPin) ? 'area' : got.quality;
}
writeFileSync(CACHE, JSON.stringify(cache, null, 1) + '\n');
writeFileSync(CSV, writeCsv(rows));
console.log(`${hits}/${rows.filter((r) => r.onemapQuery).length} queries geocoded; ${rows.length} rows.`);

// 150 m review list against matched records (B7 / A3).
const XW = join(DIR, 'research/crosswalk.csv');
if (existsSync(XW)) {
  const places = new Map(JSON.parse(readFileSync(join(DIR, 'places.sg.json'), 'utf8')).map((p) => [p.id, p]));
  const byRow = new Map(rows.map((r) => [r.docRow, r]));
  for (const x of readCsv(readFileSync(XW, 'utf8'))) {
    const m = /^match:(.+)$/.exec(x.outcome);
    const r = byRow.get(x.docRow);
    if (!m || !r?.lat) continue;
    const p = places.get(m[1]);
    const d = metres({ lat: +r.lat, lng: +r.lng }, p.coordinates);
    if (d > 150) console.log(`>150 m: ${x.docRow} ${r.name} -> ${p.id}: ${Math.round(d)} m (existing coordinates kept)`);
  }
}
