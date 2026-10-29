#!/usr/bin/env python3
"""Add the Singapore Culture Atlas places to the Nearby catalogue.

    python3 scripts/explore/import-atlas.py

Reads src/data/atlas/atlas.zh.json (the team's research snapshot), atlas.en.json (its English translation) and
placeKeys.json (atlas id -> Nearby key). Atlas places that are already in the catalogue keep their entry; only
missing practical details (hours, access notes) are filled in from the atlas. New places are appended as
`provenance: "researched"` entries whose fact, hours, address and notes all carry the atlas's own source links.
The atlas's photos are NOT used (170 of 171 are "reference only", no reuse licence); the app's own picture chain
applies (culture-card photo -> Wikimedia Commons -> 3D view). Re-run after the atlas or its translation changes:
it replaces earlier atlas imports rather than duplicating them.
"""
import json, math, os, re
from urllib.parse import urlparse

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
P = lambda *a: os.path.join(ROOT, *a)
atlas = json.load(open(P('src/data/atlas/atlas.zh.json')))
en = json.load(open(P('src/data/atlas/atlas.en.json')))
keys = json.load(open(P('src/data/atlas/placeKeys.json')))
places = json.load(open(P('src/data/explore/places.sg.json')))
areas = [a for a in json.load(open(P('src/data/explore/areas.json')))['areas'] if not a.get('overview')]

IMPORTED_BY = 'IntentAI team · Singapore Culture Atlas'
SNAPSHOT = atlas.get('research_date', '2026-10-29')
REGION = {'central': 'central', 'east': 'east', 'north': 'north', 'northeast': 'north-east', 'west': 'west'}
CATEGORY = {'food': 'food', 'nature': 'nature', 'culture': 'culture', 'history': 'landmark', 'urban': 'landmark'}

# Earlier atlas imports are replaced, not duplicated.
places = [p for p in places if p.get('reviewedBy') != IMPORTED_BY]
by_id = {p['id']: p for p in places}

def words(s): return len(re.findall(r"\S+", s or ''))

def clip_words(s, n):
    w = (s or '').split()
    if len(w) <= n: return s
    cut = ' '.join(w[:n])
    end = max(cut.rfind('. '), cut.rfind('; '))
    return (cut[:end + 1] if end > len(cut) * 0.5 else cut.rstrip(',;:') + '…')

def publisher(url):
    host = urlparse(url).hostname or ''
    return re.sub(r'^www\.', '', host) or 'Source'

def source(url, title=None):
    return {'title': title or publisher(url), 'url': url, 'publisher': publisher(url), 'checkedAt': SNAPSHOT}

def deep(url):
    try:
        u = urlparse(url)
        return u.scheme in ('http', 'https') and u.path.strip('/') != ''
    except Exception:
        return False

def nearest_area(lat, lng):
    d = lambda a: math.hypot((a['center']['lat'] - lat) * 110574, (a['center']['lng'] - lng) * 111290)
    return min(areas, key=d)['id']

KIND_RULES = [
    (r'mosque|masjid|dargah', 'Mosque'), (r'church|cathedral|chapel', 'Church'),
    (r'temple|monastery|kong\b|tua pek|si\b|see\b|gaya', 'Temple'), (r'museum|gallery|heritage centre|memorial hall', 'Museum'),
    (r'market|food centre|hawker', 'Hawker centre'), (r'library', 'Library'), (r'reserve|marsh|wetland', 'Nature reserve'),
    (r'park connector|connector', 'Park connector'), (r'beach', 'Beach'), (r'park|garden|woods', 'Park'),
    (r'bridge', 'Bridge'), (r'road|street|houses', 'Heritage street'),
]

def kind_of(p):
    name = p['name_en'].lower()
    for pat, k in KIND_RULES:
        if re.search(pat, name): return k
    return {'food': 'Restaurant', 'nature': 'Nature', 'culture': 'Culture', 'history': 'Historic site', 'urban': 'Landmark'}[p['category']]

def text(p, field):
    return ((en.get('places') or {}).get(p['id']) or {}).get(field) or ''

def first_source_url(p, field):
    for s in p.get('sources') or []:
        if field in (s.get('supports') or []) and deep(s.get('url', '')): return s['url'], s.get('title')
    for s in p.get('sources') or []:
        if deep(s.get('url', '')): return s['url'], s.get('title')
    return None, None

added, enriched, skipped = 0, 0, []
for p in atlas['places']:
    key = keys[p['id']]
    if key in by_id:
        # Shared place: fill only what our entry lacks.
        ours = by_id[key]
        url, title = first_source_url(p, 'access_notes')
        if not ours.get('accessNotes') and text(p, 'access_notes') and url:
            ours['accessNotes'] = {'text': clip_words(text(p, 'access_notes'), 60), 'source': source(url, title)}
            enriched += 1
        d = ours.setdefault('details', {})
        hours = text(p, 'hours')
        url, title = first_source_url(p, 'hours')
        if 'hours' not in d and hours and len(hours) <= 160 and url:
            d['hours'] = {'text': hours, 'source': source(url, title)}
        if not d: ours.pop('details')
        continue
    if not (p.get('lat') and p.get('lng')):
        skipped.append((p['id'], 'no coordinates')); continue
    summary = clip_words(text(p, 'summary'), 58)
    fact = text(p, 'fun_fact')
    if words(summary) < 6 or not fact:
        skipped.append((p['id'], 'no English text yet')); continue
    if not deep(p.get('fun_fact_source', '')):
        skipped.append((p['id'], 'fact has no source page')); continue
    entry = {
        'id': key, 'name': p['name_en'], 'nameZh': p['name_zh'], 'country': 'SG',
        'regionId': REGION.get(p['region'], 'central'), 'areaId': nearest_area(p['lat'], p['lng']),
        'coordinates': {'lat': p['lat'], 'lng': p['lng'], 'source': source(p.get('maps_url') or p['fun_fact_source'], 'Singapore Culture Atlas research snapshot')},
        'category': CATEGORY[p['category']], 'kind': kind_of(p), 'summary': summary,
        'facts': [{'id': 'f1', 'text': clip_words(fact, 80), 'sources': [source(p['fun_fact_source'])]}],
        'provenance': 'researched', 'editorialStatus': 'published' if p.get('status') != 'closed' else 'draft',
        'reviewedAt': SNAPSHOT, 'reviewedBy': IMPORTED_BY,
    }
    url, title = first_source_url(p, 'access_notes')
    if text(p, 'access_notes') and url:
        entry['accessNotes'] = {'text': clip_words(text(p, 'access_notes'), 60), 'source': source(url, title)}
    details = {}
    url, title = first_source_url(p, 'address')
    if p.get('address') and url:
        pc = p.get('postcode')
        addr = {'text': p['address'], 'source': source(url, title)}
        if pc and re.fullmatch(r'\d{6}', pc) and pc in p['address']: addr['postcode'] = pc
        details['address'] = addr
    hours = text(p, 'hours')
    url, title = first_source_url(p, 'hours')
    if hours and len(hours) <= 160 and url: details['hours'] = {'text': hours, 'source': source(url, title)}
    if p.get('website') and re.match(r'^https?://', p['website']): details['website'] = {'url': p['website'], 'source': source(p['website'])}
    rv = p.get('review') or {}
    if rv.get('url') and rv['url'].startswith('https') and not re.search(r'google\.[a-z.]+/maps|maps\.google|goo\.gl', rv['url']):
        details['reviews'] = [{'title': rv.get('platform') or publisher(rv['url']), 'url': rv['url'], 'publisher': rv.get('platform') or publisher(rv['url'])}]
    if details: entry['details'] = details
    for a in p.get('awards') or []:
        if a.get('guide') == 'MICHELIN' and isinstance(a.get('year'), int) and deep(a.get('source', '')):
            entry['recognition'] = {'label': f"MICHELIN Guide {a.get('level', '')}".strip(), 'year': a['year'], 'source': source(a['source'])}
            break
    places.append(entry); by_id[key] = entry; added += 1

json.dump(places, open(P('src/data/explore/places.sg.json'), 'w'), ensure_ascii=False, indent=2)
open(P('src/data/explore/places.sg.json'), 'a').write('\n')
published = sum(1 for p in places if p['editorialStatus'] == 'published')
stats_path = P('src/data/explore/stats.json')
stats = json.load(open(stats_path)); stats['publishedPlaces'] = published
json.dump(stats, open(stats_path, 'w'), indent=2); open(stats_path, 'a').write('\n')
print(f'added {added} · enriched {enriched} shared · skipped {len(skipped)} · published now {published}')
for s in skipped: print('  skipped', *s)
