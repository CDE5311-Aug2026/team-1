#!/usr/bin/env node
// Nearby Explorer catalogue validation (PRD §10): `npm run validate:explore`.
// Checks ids, Singapore coordinates (outline, not a bounding box), references, fact/source/review fields,
// placeholder text, provenance, duplicates and collection counts. A collection may only claim "published"
// with exactly 100 (an editor's pick: 10) distinct published members that a team editor has signed off.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CATEGORIES = ['landmark', 'food', 'nature', 'culture'];
const PROVENANCE = ['earth-online', 'researched', 'earth-online+researched'];
const STATUSES = ['draft', 'published', 'retired'];
const CONTEXTS = ['Hawker centre', 'MRT · bus', 'Kopitiam', 'School', 'Office', 'Wet market', 'Grab · taxi', 'Void deck', 'Mall'];
const PLACEHOLDER = /\b(todo|tbd|lorem|ipsum|placeholder|xxx+|fixme)\b|\?\?\?/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Real Singapore places the simplified 1:10m outline leaves out (reviewed one by one).
const OFFSHORE = new Map([['curated:sg-raffles-lighthouse', 'Pulau Satumu, Singapore’s southernmost island']]);
const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

function inRing([lng, lat], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToRingM([lng, lat], ring) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180);
  const ky = 110574;
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = (ring[j][0] - lng) * kx;
    const ay = (ring[j][1] - lat) * ky;
    const bx = (ring[i][0] - lng) * kx;
    const by = (ring[i][1] - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1e-9)));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

const metres = (a, b) => Math.hypot((a.lat - b.lat) * 110574, (a.lng - b.lng) * 111290);

function checkSource(src, where, errors) {
  if (!src || typeof src !== 'object') return errors.push(`${where}: missing source`);
  if (!src.title || !src.publisher) errors.push(`${where}: source needs a title and publisher`);
  if (!ISO_DATE.test(src.checkedAt ?? '')) errors.push(`${where}: source checkedAt must be YYYY-MM-DD`);
  if (src.url !== undefined && src.url !== '') {
    let u;
    try {
      u = new URL(src.url);
    } catch {
      return errors.push(`${where}: source url is not a URL`);
    }
    if (!/^https?:$/.test(u.protocol)) errors.push(`${where}: source url must be http(s)`);
  }
}

/** Pure validation of an in-memory catalogue. Returns { errors, warnings, counts }. */
export function validateCatalogue({ places, areas, regions, collections, outline, stats, thumbs, thumbExists }) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const areaIds = new Set(areas.map((a) => a.id));
  const regionIds = new Set(regions.map((r) => r.id));

  for (const [i, p] of places.entries()) {
    const at = p.id ?? `places[${i}]`;
    if (!/^curated:sg-[a-z0-9-]{2,80}$/.test(p.id ?? '')) errors.push(`${at}: id must look like curated:sg-<slug>`);
    if (ids.has(p.id)) errors.push(`${at}: duplicate id`);
    ids.add(p.id);
    if (!p.name || PLACEHOLDER.test(p.name)) errors.push(`${at}: missing or placeholder name`);
    if (p.country !== 'SG') errors.push(`${at}: country must be SG`);
    if (!CATEGORIES.includes(p.category)) errors.push(`${at}: bad category ${p.category}`);
    if (!STATUSES.includes(p.editorialStatus)) errors.push(`${at}: bad editorialStatus`);
    if (!PROVENANCE.includes(p.provenance)) errors.push(`${at}: bad provenance`);
    if (!areaIds.has(p.areaId)) errors.push(`${at}: unknown areaId ${p.areaId}`);
    if (!regionIds.has(p.regionId)) errors.push(`${at}: unknown regionId ${p.regionId}`);
    const c = p.coordinates ?? {};
    if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) errors.push(`${at}: coordinates must be numbers`);
    else {
      const pt = [c.lng, c.lat];
      const inside = outline.some((ring) => inRing(pt, ring));
      const near = outline.some((ring) => distToRingM(pt, ring) <= 3000);
      if (!inside && !near && !OFFSHORE.has(p.id)) errors.push(`${at}: coordinates (${c.lat}, ${c.lng}) are not in Singapore`);
    }
    checkSource(c.source, `${at} coordinates`, errors);
    if (!p.summary || words(p.summary) < 6 || words(p.summary) > 60) errors.push(`${at}: summary must be 6–60 words`);
    if (PLACEHOLDER.test(p.summary ?? '') || PLACEHOLDER.test(p.description?.en ?? '')) errors.push(`${at}: placeholder text`);
    if (p.description) checkSource(p.description.source, `${at} description`, errors);
    if (!Array.isArray(p.facts) || p.facts.length > 3) errors.push(`${at}: 0–3 facts`);
    for (const f of p.facts ?? []) {
      const n = words(f.text ?? '');
      if (n < 40 || n > 80) errors.push(`${at} ${f.id}: fact must be 40–80 words (has ${n})`);
      if (PLACEHOLDER.test(f.text ?? '')) errors.push(`${at} ${f.id}: placeholder text`);
      if (!Array.isArray(f.sources) || f.sources.length === 0) errors.push(`${at} ${f.id}: a fact needs at least one source`);
      for (const s of f.sources ?? []) {
        checkSource(s, `${at} ${f.id}`, errors);
        try {
          if (new URL(s.url).pathname.replace(/\/+$/, '') === '') errors.push(`${at} ${f.id}: a home page is not a source (${s.url})`);
        } catch {
          errors.push(`${at} ${f.id}: fact source needs a URL`);
        }
      }
    }
    if (p.provenance !== 'earth-online' && (p.facts ?? []).length === 0) errors.push(`${at}: researched entries need a sourced fact`);
    if (p.provenance !== 'researched' && !p.earthKey) errors.push(`${at}: dataset entries need their earthKey`);
    if (p.accessNotes) checkSource(p.accessNotes.source, `${at} accessNotes`, errors);
    if (p.recognition) {
      // a dated award with the page that shows it (e.g. the MICHELIN Guide page of the restaurant)
      const r = p.recognition;
      if (!r.label || !Number.isInteger(r.year) || r.year < 2000 || r.year > 2100) errors.push(`${at}: recognition needs a label and a year`);
      checkSource(r.source, `${at} recognition`, errors);
      if (!r.source?.url) errors.push(`${at}: recognition needs a source page`);
    }
    if (p.languageTip && !CONTEXTS.includes(p.languageTip.context)) errors.push(`${at}: unknown language context`);
    if (p.image && !(p.image.license && p.image.attribution && p.image.sourceUrl)) errors.push(`${at}: an image needs license, attribution and source`);
    if (p.editorialStatus === 'published' && (!ISO_DATE.test(p.reviewedAt ?? '') || !p.reviewedBy)) errors.push(`${at}: published entries need reviewedAt and reviewedBy`);
  }

  // Two entries for one real place (duplicate entrance, renamed copy).
  const published = places.filter((p) => p.editorialStatus === 'published');
  for (let i = 0; i < published.length; i++) {
    for (let j = i + 1; j < published.length; j++) {
      const a = published[i];
      const b = published[j];
      if (a.name.trim().toLowerCase() === b.name.trim().toLowerCase()) errors.push(`${a.id} / ${b.id}: same name`);
      else if (metres(a.coordinates, b.coordinates) < 40) warnings.push(`${a.id} / ${b.id}: only ${Math.round(metres(a.coordinates, b.coordinates))} m apart — same place?`);
    }
  }

  const byId = new Map(places.map((p) => [p.id, p]));
  const counts = {};
  for (const c of collections) {
    const seen = new Set();
    for (const id of c.memberIds) {
      if (seen.has(id)) errors.push(`${c.id}: duplicate member ${id}`);
      seen.add(id);
      const p = byId.get(id);
      if (!p) errors.push(`${c.id}: member ${id} is not in the catalogue`);
      else if (p.editorialStatus !== 'published') warnings.push(`${c.id}: member ${id} is ${p.editorialStatus} and does not count`);
    }
    const publishedMembers = c.memberIds.filter((id) => byId.get(id)?.editorialStatus === 'published');
    counts[c.id] = publishedMembers.length;
    // the big collection has 100 places; an editor's pick (kind "picks") has 10, with a title and a Chinese title
    const target = c.kind === 'picks' ? 10 : 100;
    if (c.kind !== undefined && c.kind !== 'picks') errors.push(`${c.id}: kind must be "picks" or absent`);
    if (c.kind === 'picks' && (!c.title || !c.titleZh || !c.description)) errors.push(`${c.id}: a pick needs title, titleZh and description`);
    if (c.targetCount !== target) errors.push(`${c.id}: targetCount must be ${target}`);
    if (c.memberIds.length > target) errors.push(`${c.id}: more than ${target} members`);
    if (c.status === 'published') {
      if (publishedMembers.length !== target) errors.push(`${c.id}: claims published but has ${publishedMembers.length} published members (needs exactly ${target})`);
      const unsigned = publishedMembers.filter((id) => /pending/i.test(byId.get(id).reviewedBy));
      if (unsigned.length) errors.push(`${c.id}: claims published but ${unsigned.length} members still await team editor sign-off`);
    } else if (c.status !== 'starter') errors.push(`${c.id}: status must be starter or published`);
  }

  // pictures (public/nearby/thumbs): only for published places, and each listed file must exist
  if (thumbs) {
    const pub = new Set(published.map((p) => p.id));
    for (const id of thumbs.ids ?? []) {
      if (!pub.has(id)) errors.push(`thumbs.json: ${id} is not a published place`);
      else if (thumbExists && !thumbExists(id)) errors.push(`thumbs.json: no picture file for ${id}`);
    }
    if (!thumbs.credit) errors.push('thumbs.json: credit line missing');
  }
  if (stats && stats.publishedPlaces !== published.length) errors.push(`stats.json says ${stats.publishedPlaces} published places; the catalogue has ${published.length}`);

  const sourced = published.filter((p) => p.facts.length > 0).length;
  return { errors, warnings, counts: { places: places.length, published: published.length, withSourcedFacts: sourced, collections: counts } };
}

export const CATALOGUE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../src/data/explore');

export function loadCatalogue(dir = CATALOGUE_DIR) {
  const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const areasFile = read('areas.json');
  return {
    places: read('places.sg.json'),
    areas: areasFile.areas,
    regions: areasFile.regions,
    collections: read('collections.json'),
    outline: read('outlines.json').countries.SG,
    stats: read('stats.json'),
    thumbs: read('thumbs.json'),
    thumbExists: (id) => existsSync(join(dir, '..', '..', '..', 'public', 'nearby', 'thumbs', `${id.replace(/^curated:/, '')}.webp`)),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, warnings, counts } = validateCatalogue(loadCatalogue());
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  console.log(
    `${counts.published} published places (${counts.withSourcedFacts} with source-linked facts); collections: ${Object.entries(counts.collections)
      .map(([id, n]) => `${id} ${n}`)
      .join(', ')}. ${errors.length} errors, ${warnings.length} warnings.`,
  );
  process.exit(errors.length ? 1 : 0);
}
