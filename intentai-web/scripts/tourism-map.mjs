// Tourism 2040 categories for the catalogue (Redesign v2, contract C1/C3, task R0).
//
//   node scripts/tourism-map.mjs              # print the rule result + the records the rules cannot decide
//   node scripts/tourism-map.mjs --apply      # write `tourism` onto every record in places.sg.json
//   node scripts/tourism-map.mjs --crosswalk  # (re)write match proposals into research/crosswalk.csv
//   node scripts/tourism-map.mjs --import     # apply the reviewed crosswalk: enrich matches, add new records,
//                                             # write research/quarantine.csv and stats.json
//
// Every existing record gets `tourism: {category, subtype}` from a rule table over its legacy `kind` and `category`.
// Records the rules cannot decide are listed; each was then decided by reading the record, and that decision is
// in HAND below with its reason. --apply adds `tourism` only: ids, order and every other field stay as they are.
// Full run: --crosswalk (review outcomes by hand) → node scripts/geocode-onemap.mjs → --import → --apply.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const EXPLORE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../src/data/explore');
export const PLACES_FILE = join(EXPLORE_DIR, 'places.sg.json');

/* ---------- shared helpers (also used by geocode-onemap.mjs and tourism-import.mjs) ---------- */

/** RFC 4180 CSV → objects keyed by the header row. */
export function readCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') row.push(cell), (cell = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

export function writeCsv(rows, columns) {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

/** Lower case, accents and punctuation removed, "&" → "and", single spaces. */
export const normName = (s) =>
  String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const metres = (a, b) => Math.hypot((a.lat - b.lat) * 110574, (a.lng - b.lng) * 111290);

/* ---------- rule table: legacy kind + category → tourism ---------- */

// First matching rule wins. `null` = the rules cannot decide; the record goes to HAND.
export const RULES = [
  // Cruise: you board or arrive by boat (research doc's definition).
  { kind: /\b(ferry|cruise|marina|jetty)\b/i, to: { category: 'cru', subtype: 'terminal' } },
  { kind: /^island$/i, to: null }, // islands: by ferry (cru) or by bridge (mainland-linked)? decided by hand
  // Leisure Events: venues for ticketed or public events.
  { kind: /stadium|indoor arena|concert hall|theatre|performing arts|arts centre|convention|floating stage/i, to: { category: 'lei', subtype: 'venue' } },
  // Destination hotels and integrated resorts.
  { kind: /\bhotel\b|integrated resort/i, to: { category: 'att', subtype: 'hotel' } },
  // Precincts: districts, neighbourhoods, heritage streets and quays, food centres (a food precinct experience).
  { kind: /neighbourhood|historic district|heritage street|heritage quay/i, to: { category: 'att', subtype: 'precinct' } },
  { kind: /hawker centre|food centre|^market & hawker/i, to: { category: 'att', subtype: 'precinct' } },
  // Food: restaurants, stalls and shops are attractions (the food experience), not Wellness.
  { cat: 'food', kind: /restaurant|hawker stall|street food|caf[eé]|shop|steakhouse|barbecue/i, to: { category: 'att', subtype: 'attraction' } },
  // Nature: parks, reserves, gardens, beaches → Wellness (mindful nature), except named exceptions handled by hand.
  { cat: 'nature', kind: /botanic|museum|historic|footbridge|island/i, to: null },
  { cat: 'nature', kind: /park|reserve|garden|nature|wetland|beach|connector/i, to: { category: 'wel', subtype: 'nature' } },
  // Sights: museums, worship, monuments, heritage, landmarks, theme parks → Attractions.
  { kind: /museum|temple|church|cathedral|mosque|synagogue|shrine|monastery|buddhist|monument|memorial|heritage|historic|fort|lighthouse|statue|fountain|bridge|landmark|theme park|science centre|cultural centre|^culture$|library|palace|parliament|law courts|fire station|observation wheel|lookout|skyscraper|tower|railway station|airport|air traffic|campus|college|school|medical school|mall|shopping|office|residential|residences|public housing|mixed-use|research campus|community hub|dam|walkway|department store|mrt station|air cargo|complex/i, to: { category: 'att', subtype: 'attraction' } },
  { kind: /sports club/i, to: null },
  { kind: /^park$/i, to: null }, // a park filed as landmark or food: decided by hand
];

// Hand decisions for the records the rules leave open (each record was read before deciding).
export const HAND = {
  'curated:sg-pulau-ubin': { to: { category: 'cru', subtype: 'island' }, why: 'Island reached only by bumboat from Changi Point (doc: Cruise, island by ferry).' },
  'curated:sg-singapore-botanic-gardens': { to: { category: 'att', subtype: 'attraction' }, why: 'UNESCO World Heritage Site; the research doc files it under Attractions (tagged Wellness).' },
  'curated:sg-lee-kong-chian-natural-history': { to: { category: 'att', subtype: 'attraction' }, why: 'A natural history museum (filed as nature): a ticketed sight, not a nature area.' },
  'curated:sg-singapore-cricket-club': { to: { category: 'att', subtype: 'attraction' }, why: 'A historic members’ club at the Padang (founded 1852), seen as a heritage landmark; not a public events venue.' },
  'curated:sg-singapore-recreation-club': { to: { category: 'att', subtype: 'attraction' }, why: 'A historic members’ club facing the Padang (founded 1883); heritage landmark, not a public venue.' },
  'curated:sg-fort-canning-park-fort-gate-fort-canning-centre': { to: { category: 'att', subtype: 'attraction' }, why: 'The record is the heritage part of the hill (Fort Gate, Fort Canning Centre), told as history: an attraction. The whole park as an events venue is a separate, ambiguous doc row.' },
  'curated:sg-henderson-waves': { to: { category: 'wel', subtype: 'nature' }, why: 'Footbridge on the Southern Ridges walk; the research doc files Southern Ridges & Henderson Waves under Wellness (mindful nature).' },
  'curated:sg-springleaf-prata-place': { to: { category: 'att', subtype: 'attraction' }, why: 'A prata restaurant (its kind says Park because of the Spring Leaf Garden name); food places are attractions.' },
  'curated:sg-hill-street-tai-hwa-pork-noodle': { to: { category: 'att', subtype: 'attraction' }, why: 'A single noodle stall (kind says Heritage street): an attraction, not a precinct.' },
  'curated:sg-kim-choo-kueh-chang': { to: { category: 'att', subtype: 'attraction' }, why: 'A dumpling shop with a Peranakan visitor centre (kind says Heritage street): an attraction, not a precinct.' },
  'curated:sg-haig-road-putu-piring': { to: { category: 'att', subtype: 'attraction' }, why: 'A single stall inside Haig Road hawker centre (kind says Hawker centre): an attraction, not a precinct.' },
  'curated:sg-seletar-the-oval': { to: { category: 'att', subtype: 'precinct' }, why: 'A heritage estate of black-and-white houses inside Seletar Aerospace Park: an area to walk, so a precinct.' },
};

export function ruleFor(p) {
  for (const r of RULES) {
    if (r.cat && r.cat !== p.category) continue;
    if (r.kind.test(p.kind ?? '')) return r.to;
  }
  return undefined; // no rule at all
}

export function tourismFor(p) {
  if (HAND[p.id]) return { ...HAND[p.id].to, by: 'hand' };
  const to = ruleFor(p);
  return to ? { ...to, by: 'rule' } : { by: to === null ? 'open' : 'none' };
}

/* ---------- crosswalk proposals (A3): the script proposes, a person decides ---------- */

const RESEARCH = join(EXPLORE_DIR, 'research');
export const CROSSWALK_FILE = join(RESEARCH, 'crosswalk.csv');
export const RESEARCH_FILE = join(RESEARCH, 'tourism2040.csv');
const STOP = new Set(['the', 'singapore', 'of', 'at', 'and', 'a', 'by', 'sg', 'under', 'construction', 'study']);
const tokens = (s) => normName(s).split(' ').filter((w) => w && !STOP.has(w));

/** Proposed matches for one research row: name equality, alias, token overlap, OneMap distance. */
export function propose(row, places) {
  const rt = tokens(row.name);
  const aliases = (row.aliases ?? '').split('|').map((a) => a.trim()).filter(Boolean);
  const out = [];
  for (const p of places) {
    const pt = tokens(p.name);
    const shared = rt.filter((w) => pt.includes(w)).length;
    const d = row.lat ? metres({ lat: +row.lat, lng: +row.lng }, p.coordinates) : undefined;
    let score = 0;
    let why = '';
    if (normName(p.name) === normName(row.name)) (score = 100), (why = 'same normalised name');
    else if (aliases.some((a) => normName(a) === normName(p.name))) (score = 95), (why = 'alias');
    else if (shared && shared === Math.min(rt.length, pt.length)) (score = 60 + shared), (why = `name contains (${shared} words)`);
    else if (shared >= 2) (score = 40 + shared), (why = `${shared} shared words`);
    if (d !== undefined && d < 250 && shared) (score += 20), (why += `, ${Math.round(d)} m`);
    else if (d !== undefined && d < 80) (score += 10), (why += `${why ? ', ' : ''}${Math.round(d)} m apart`);
    if (score >= 40) out.push({ id: p.id, name: p.name, score, why, d });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

function writeProposals(places) {
  const rows = readCsv(readFileSync(RESEARCH_FILE, 'utf8'));
  const old = new Map((existsSync(CROSSWALK_FILE) ? readCsv(readFileSync(CROSSWALK_FILE, 'utf8')) : []).map((x) => [x.docRow, x]));
  const out = rows.map((r) => {
    const c = propose({ ...r, aliases: old.get(r.docRow)?.aliases }, places);
    const prev = old.get(r.docRow) ?? {};
    return {
      docRow: r.docRow,
      name: r.name,
      proposed: c.map((x) => `${x.id} (${x.score}: ${x.why})`).join(' ; '),
      aliases: prev.aliases ?? '',
      outcome: prev.outcome ?? '',
      reason: prev.reason ?? '',
    };
  });
  writeFileSync(CROSSWALK_FILE, writeCsv(out, ['docRow', 'name', 'proposed', 'aliases', 'outcome', 'reason']));
  console.log(`crosswalk proposals written for ${out.length} rows (${out.filter((x) => !x.outcome).length} without a reviewed outcome).`);
}

/* ---------- import (A5): only what meets the unchanged validator; the rest is quarantined ---------- */

export const IMPORT_DATE = '2026-11-08';
export const IMPORT_REVIEWER = 'tourism2040-import';
const QUARANTINE_FILE = join(RESEARCH, 'quarantine.csv');
const split = (s) => (s ? s.split(' | ').map((x) => x.trim()) : []);

/** Nearest legacy Nearby area (by area centre), as scripts/explore/import-new-places.py does. */
export function nearestArea(areas, c) {
  return areas.filter((a) => !a.overview).reduce((best, a) => (metres(a.center, c) < metres(best.center, c) ? a : best));
}

export function buildRecord(row, outcome, areas) {
  const c = { lat: Number(row.lat), lng: Number(row.lng) };
  const area = nearestArea(areas, c);
  const titles = split(row.factSourceTitles);
  const pubs = split(row.factPublishers);
  const parent = /^child-of:(.+)$/.exec(outcome)?.[1];
  const rec = {
    id: `curated:sg-${row.slug}`,
    name: row.recordName,
    country: 'SG',
    regionId: area.regionId,
    areaId: area.id,
    coordinates: { ...c, source: { title: `OneMap Search: ${row.onemapQuery}`, url: row.onemapUrl, publisher: 'OneMap (SLA)', checkedAt: IMPORT_DATE } },
    category: row.legacyCategory,
    kind: row.kind,
    summary: row.summary,
    facts: [{ id: 'f1', text: row.factText, sources: split(row.factSourceUrls).map((url, i) => ({ title: titles[i], url, publisher: pubs[i], checkedAt: IMPORT_DATE })) }],
    editorialStatus: row.admit,
    reviewedAt: IMPORT_DATE,
    reviewedBy: IMPORT_REVIEWER,
    provenance: 'researched',
    tourism: { category: row.tourismCategory, subtype: row.subtype },
    ...(row.operatingStatus ? { operatingStatus: row.operatingStatus } : {}),
    pinQuality: row.pinQuality,
    ...(parent ? { parentId: parent } : {}),
  };
  return rec;
}

export function runImport() {
  const places = JSON.parse(readFileSync(PLACES_FILE, 'utf8'));
  const areas = JSON.parse(readFileSync(join(EXPLORE_DIR, 'areas.json'), 'utf8')).areas;
  const rows = readCsv(readFileSync(RESEARCH_FILE, 'utf8'));
  const xw = new Map(readCsv(readFileSync(CROSSWALK_FILE, 'utf8')).map((x) => [x.docRow, x]));
  // idempotent: drop what an earlier run imported, keep every other record untouched
  const kept = places.filter((p) => p.reviewedBy !== IMPORT_REVIEWER);
  const byId = new Map(kept.map((p) => [p.id, p]));
  const quarantine = [];
  const added = [];
  const tally = { match: 0, 'child-of': 0, new: 0, ambiguous: 0, published: 0, draft: 0, quarantined: 0, statusAdded: 0 };
  for (const row of rows) {
    const x = xw.get(row.docRow);
    if (!x?.outcome) throw new Error(`${row.docRow}: crosswalk has no reviewed outcome`);
    const kind = x.outcome.split(':')[0];
    tally[kind]++;
    if (kind === 'ambiguous') continue; // changes nothing until the owner rules (B4)
    if (kind === 'match') {
      const p = byId.get(x.outcome.slice(6));
      if (!p) throw new Error(`${row.docRow}: match target ${x.outcome} does not exist`);
      p.tourism = { category: row.tourismCategory, subtype: row.subtype };
      if (row.applyStatus === 'yes' && row.operatingStatus && row.operatingStatus !== 'open') (p.operatingStatus = row.operatingStatus), tally.statusAdded++;
      continue;
    }
    if (!row.admit) {
      quarantine.push({ docRow: row.docRow, name: row.name, outcome: x.outcome, reason: row.quarantineReason });
      tally.quarantined++;
      continue;
    }
    const rec = buildRecord(row, x.outcome, areas);
    if (byId.has(rec.id) || added.some((a) => a.id === rec.id)) throw new Error(`${row.docRow}: slug collision ${rec.id}`);
    if (!row.lat || !row.onemapUrl) throw new Error(`${row.docRow}: admitted without a OneMap coordinate`);
    if (/^(planned|)$/.test(row.operatingStatus) && row.admit === 'published') throw new Error(`${row.docRow}: planned or unconfirmed rows must stay drafts`);
    added.push(rec);
    tally[row.admit]++;
  }
  for (const r of added) if (r.parentId && !byId.has(r.parentId) && !added.some((a) => a.id === r.parentId)) throw new Error(`${r.id}: parent ${r.parentId} missing`);
  const out = [...kept, ...added];
  writeFileSync(PLACES_FILE, JSON.stringify(out, null, 2) + '\n');
  writeFileSync(QUARANTINE_FILE, writeCsv(quarantine, ['docRow', 'name', 'outcome', 'reason']));
  writeFileSync(join(EXPLORE_DIR, 'stats.json'), JSON.stringify({ publishedPlaces: out.filter((p) => p.editorialStatus === 'published').length }, null, 2) + '\n');
  console.log(JSON.stringify(tally));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain && process.argv.includes('--import')) {
  runImport();
} else if (isMain && process.argv.includes('--crosswalk')) {
  writeProposals(JSON.parse(readFileSync(PLACES_FILE, 'utf8')));
} else if (isMain) {
  const places = JSON.parse(readFileSync(PLACES_FILE, 'utf8'));
  // Records whose tourism comes from the research doc (crosswalk matches) or from the import keep it.
  const fromDoc = new Set(
    (existsSync(CROSSWALK_FILE) ? readCsv(readFileSync(CROSSWALK_FILE, 'utf8')) : [])
      .map((x) => /^match:(.+)$/.exec(x.outcome)?.[1])
      .filter(Boolean),
  );
  const keep = (p) => p.reviewedBy === IMPORT_REVIEWER || (fromDoc.has(p.id) && p.tourism);
  const counts = {};
  const open = [];
  for (const p of places) {
    const t = keep(p) ? { ...p.tourism, by: 'doc' } : tourismFor(p);
    if (!t.category) {
      open.push(`${p.id} | ${p.category} | ${p.kind} | ${p.name} | ${t.by === 'none' ? 'no rule' : 'rule left open'}`);
      continue;
    }
    const k = `${t.category}/${t.subtype} (${t.by})`;
    counts[k] = (counts[k] ?? 0) + 1;
    if (process.argv.includes('--apply') && !keep(p)) p.tourism = { category: t.category, subtype: t.subtype };
  }
  console.log(Object.entries(counts).sort().map(([k, n]) => `${k}: ${n}`).join('\n'));
  console.log(`\nHand-decided (${Object.keys(HAND).length}):`);
  for (const [id, h] of Object.entries(HAND)) console.log(`  ${id} -> ${h.to.category}/${h.to.subtype}: ${h.why}`);
  if (open.length) {
    console.log(`\nThe rules cannot decide ${open.length} records:`);
    for (const o of open) console.log('  ' + o);
  }
  if (process.argv.includes('--apply')) {
    if (open.length) {
      console.error('Not applied: decide the open records first (HAND).');
      process.exit(1);
    }
    writeFileSync(PLACES_FILE, JSON.stringify(places, null, 2) + '\n');
    console.log(`\ntourism written to ${places.length} records.`);
  }
}
