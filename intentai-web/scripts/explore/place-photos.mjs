// Photos for Nearby places, from Wikipedia / Wikimedia Commons, openly licensed only.
//
//   node scripts/explore/place-photos.mjs            # fetch photos for places that have none yet
//   node scripts/explore/place-photos.mjs --force    # look every place up again
//   node scripts/explore/place-photos.mjs --commons  # also try Commons photos taken at the place for those without
//
// For each published place: the Wikipedia article it links to, or else a Wikipedia search for "<name> Singapore"
// whose article has coordinates within 1.2 km of the place. The article's lead image is used only if it is a
// Commons file under CC0, public domain, CC BY or CC BY-SA (no fair-use logos). A 640px copy is saved to
// public/nearby/photos/<slug>.jpg and its credit to src/data/explore/photos.json. Places without a match keep the
// app's fallbacks (3D view, then 2D map). New places in the dataset: run this again.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLACES = join(ROOT, 'src/data/explore/places.sg.json');
const MANIFEST = join(ROOT, 'src/data/explore/photos.json');
const OUT = join(ROOT, 'public/nearby/photos');
const UA = 'IntentAI-student-prototype/1.0 (NUS CDE5311; place photos with credits)';
const force = process.argv.includes('--force');
const commons = process.argv.includes('--commons');

const places = JSON.parse(readFileSync(PLACES, 'utf8')).filter((p) => p.editorialStatus === 'published');
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { photos: {}, missing: [] };
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    await sleep(4000 * (attempt + 1));
  }
  throw new Error(`API failed: ${url}`);
}

const metres = (a, b) => {
  const r = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
};

const FREE = /^(CC0|Public domain|PD|CC BY(-SA)? [0-9.]+( [A-Za-z]+)?|CC BY(-SA)?)$/i;
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** Article title for a place: its own Wikipedia link, or a nearby search hit. */
async function articleFor(place) {
  const link = JSON.stringify(place).match(/https?:\/\/en\.wikipedia\.org\/wiki\/([^"\\#?]+)/);
  if (link) return decodeURIComponent(link[1]).replace(/_/g, ' ');
  const search = await api('en.wikipedia.org', { action: 'query', list: 'search', srsearch: `${place.name} Singapore`, srlimit: '3' });
  const titles = (search.query?.search ?? []).map((s) => s.title);
  if (!titles.length) return undefined;
  const geo = await api('en.wikipedia.org', { action: 'query', prop: 'coordinates', titles: titles.join('|') });
  for (const title of titles) {
    const page = geo.query?.pages?.find((p) => p.title === title);
    const c = page?.coordinates?.[0];
    if (c && metres({ lat: c.lat, lng: c.lon }, place.coordinates) < 1200) return title;
  }
  return undefined;
}

async function photoFor(title) {
  const pi = await api('en.wikipedia.org', { action: 'query', prop: 'pageimages', piprop: 'name', titles: title, redirects: '1' });
  const file = pi.query?.pages?.[0]?.pageimage;
  if (!file) return undefined;
  const info = await api('commons.wikimedia.org', {
    action: 'query', prop: 'imageinfo', titles: `File:${file}`, iiprop: 'url|extmetadata|mime', iiurlwidth: '640',
  });
  const ii = info.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime)) return undefined; // not on Commons (e.g. fair use), or SVG
  const meta = ii.extmetadata ?? {};
  const license = strip(meta.LicenseShortName?.value);
  if (!FREE.test(license)) return undefined;
  return {
    thumb: ii.thumburl,
    page: ii.descriptionurl,
    author: strip(meta.Artist?.value) || 'Wikimedia Commons contributor',
    license,
    licenseUrl: meta.LicenseUrl?.value ?? '',
    file,
    article: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  };
}

/**
 * A photo taken at the place: Commons files geotagged within 200 m, openly licensed, at least 640 px wide, whose file
 * name carries every word of the place's name (the nearest photo alone was often of something else: a person, an
 * insect, an event). No maps, plans, logos or diagrams.
 */
const STOP = new Set(['the', 'and', 'our', 'singapore', 'former', 'old', 'new']);
async function commonsNear(place) {
  const words = place.name.toLowerCase().replace(/\(.*?\)/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  if (!words.length) return undefined;
  const near = await api('commons.wikimedia.org', {
    action: 'query', list: 'geosearch', gsnamespace: '6', gsradius: '200', gslimit: '100',
    gscoord: `${place.coordinates.lat}|${place.coordinates.lng}`,
  });
  const named = (t) => {
    const low = t.toLowerCase();
    return words.every((w) => low.includes(w));
  };
  const hits = (near.query?.geosearch ?? []).filter(
    (h) => /\.(jpe?g|png|webp)$/i.test(h.title) && named(h.title) && !/\b(map|plan|logo|diagram|sign|board|poster|menu|plaque)\b/i.test(h.title),
  );
  if (!hits.length) return undefined;
  const info = await api('commons.wikimedia.org', {
    action: 'query', prop: 'imageinfo', titles: hits.slice(0, 40).map((h) => h.title).join('|'), iiprop: 'url|extmetadata|mime|size', iiurlwidth: '640',
  });
  const dist = new Map(hits.map((h) => [h.title, h.dist]));
  const ok = (info.query?.pages ?? []).flatMap((pg) => {
    const ii = pg.imageinfo?.[0];
    if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime) || ii.width < 640 || ii.height > ii.width * 1.6) return [];
    const meta = ii.extmetadata ?? {};
    const license = strip(meta.LicenseShortName?.value);
    if (!FREE.test(license)) return [];
    return [{
      title: pg.title, thumb: ii.thumburl, page: ii.descriptionurl, license, licenseUrl: meta.LicenseUrl?.value ?? '',
      author: strip(meta.Artist?.value) || 'Wikimedia Commons contributor', file: pg.title.replace(/^File:/, ''),
    }];
  });
  ok.sort((a, b) => dist.get(a.title) - dist.get(b.title));
  return ok[0];
}

const save = () => {
  manifest.missing = [...missing].sort();
  manifest.checkedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
};

let added = 0;
const missing = new Set(force ? [] : manifest.missing);
for (const place of places) {
  const slug = place.id.replace(/^curated:/, '');
  if (!force && (manifest.photos[place.id] || (missing.has(place.id) && !commons))) continue;
  try {
    const title = missing.has(place.id) ? undefined : await articleFor(place);
    const photo = (title && (await photoFor(title))) || (commons ? await commonsNear(place) : undefined);
    if (!photo) {
      missing.add(place.id);
      console.log(`–  ${place.name}`);
      continue;
    }
    const img = await fetch(photo.thumb, { headers: { 'User-Agent': UA } });
    if (!img.ok) throw new Error(`download ${img.status}`);
    writeFileSync(join(OUT, `${slug}.jpg`), Buffer.from(await img.arrayBuffer()));
    manifest.photos[place.id] = {
      file: `${slug}.jpg`,
      credit: `${photo.author} · ${photo.license}`,
      source: photo.page,
      license: photo.license,
      licenseUrl: photo.licenseUrl,
      article: photo.article,
    };
    missing.delete(place.id);
    added++;
    console.log(`✓  ${place.name}  (${photo.license})`);
  } catch (err) {
    console.log(`!  ${place.name}: ${err.message}`);
  }
  save(); // an interrupted run keeps what it found
  await sleep(500);
}
save();
console.log(`\n${added} added · ${Object.keys(manifest.photos).length} with photos · ${manifest.missing.length} without`);
