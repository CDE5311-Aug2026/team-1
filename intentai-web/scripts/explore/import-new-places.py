#!/usr/bin/env python3
"""Add researched places to the Nearby catalogue (owner decision 31 Oct 2026: the places of worship, civic buildings
and Buona Vista buildings that the EARTH ONLINE branches named; their models are not used).

    python3 scripts/explore/import-new-places.py ~/Documents/GitHub/intentai-work/new-places

Reads <dir>/batch-*.json ({"places": [...], "skipped": [...]}, written by researchers per <dir>/BRIEF.md) and appends
each entry as a published `researched` place. Country, region, the legacy Nearby area and the review stamp are filled
here; everything else (facts, sources, address, hours, coordinates and their sources) comes from the research.
Re-runnable: earlier imports by this script are replaced. Afterwards run scripts/ura/build-ura.py and
`npm run validate:explore`.
"""
import glob, json, math, os, sys

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
P = lambda *a: os.path.join(ROOT, *a)
IMPORTED_BY = 'FindSG team source check (new places, 31 Oct 2026)'
# Left out on purpose: the Istana's own gallery page is gone (404) and no 2026 source says the gallery is open.
EXCLUDE = {'curated:sg-istana-heritage-gallery'}
REVIEWED = '2026-10-31'

src_dir = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Documents/GitHub/intentai-work/new-places')
places = json.load(open(P('src/data/explore/places.sg.json')))
places = [p for p in places if p.get('reviewedBy') != IMPORTED_BY]
areas = [a for a in json.load(open(P('src/data/explore/areas.json')))['areas'] if not a.get('overview')]
ids = {p['id'] for p in places}


def nearest_area(lat, lng):
    return min(areas, key=lambda a: math.hypot((a['center']['lat'] - lat) * 110574, (a['center']['lng'] - lng) * 111290))


def near_existing(lat, lng, metres=40):
    return [p['name'] for p in places if math.hypot((p['coordinates']['lat'] - lat) * 110574, (p['coordinates']['lng'] - lng) * 111290) < metres]


added, skipped, dupes = 0, [], []
for f in sorted(glob.glob(os.path.join(src_dir, 'batch-*.json'))):
    if f.endswith('.input.json'):
        continue
    data = json.load(open(f))
    skipped += [(os.path.basename(f), s.get('name'), s.get('reason')) for s in data.get('skipped', [])]
    for e in data.get('places', []):
        if e['id'] in EXCLUDE:
            skipped.append((os.path.basename(f), e['name'], 'left out: not confirmed open'))
            continue
        c = e.get('coordinates') or {}
        if e['id'] in ids:
            dupes.append((e['name'], 'id already in the catalogue'))
            continue
        close = near_existing(c['lat'], c['lng'])
        if close:
            print(f"  note: {e['name']} is within 40 m of {', '.join(close)} (kept; check it is not the same place)")
        area = nearest_area(c['lat'], c['lng'])
        entry = {
            'id': e['id'], 'name': e['name'], **({'nameZh': e['nameZh']} if e.get('nameZh') else {}),
            'country': 'SG', 'regionId': area['regionId'], 'areaId': area['id'],
            'coordinates': c, 'category': e['category'], 'kind': e['kind'], 'summary': e['summary'],
            'facts': e.get('facts', []),
            'provenance': 'researched', 'editorialStatus': 'published', 'reviewedAt': REVIEWED, 'reviewedBy': IMPORTED_BY,
        }
        if e.get('accessNotes'):
            entry['accessNotes'] = e['accessNotes']
        if e.get('details'):
            entry['details'] = {k: v for k, v in e['details'].items() if v}
        places.append(entry)
        ids.add(e['id'])
        added += 1

json.dump(places, open(P('src/data/explore/places.sg.json'), 'w'), ensure_ascii=False, indent=2)
open(P('src/data/explore/places.sg.json'), 'a').write('\n')
published = sum(1 for p in places if p['editorialStatus'] == 'published')
stats = json.load(open(P('src/data/explore/stats.json')))
stats['publishedPlaces'] = published
json.dump(stats, open(P('src/data/explore/stats.json'), 'w'), indent=2)
open(P('src/data/explore/stats.json'), 'a').write('\n')
print(f'added {added} · duplicates {len(dupes)} · skipped by research {len(skipped)} · published now {published}')
for d in dupes:
    print('  duplicate:', *d)
for s in skipped:
    print('  skipped:', *s)
