#!/usr/bin/env python3
"""Build the Singapore Nearby catalogue from the EARTH ONLINE (City Brush) dataset + researched entries.

Inputs:
  earth-online-sg.json            runtime dump of the City Brush Singapore page: placed landmarks/sites (x, y in the
                                 page's local metres) and window.LM_INFO intro cards (zh/en)
  explore-content/check-*.json   independently checked researched entries (wave 1)
  explore-content/sg[3-9].json   researched entries (wave 2; writer source check only)
  explore-content/sg6-drafts-no-coordinates.json   facts merged only onto dataset places that have coordinates
  explore-content/areas.json     sourced area centres
Outputs: intentai-web/src/data/explore/{places.sg.json, areas.json, collections.json}
"""
import glob, json, math, os, re, sys

# usage: python3 scripts/explore/assemble-catalogue.py <earth-online-sg.json> <research dir> <out dir>
DUMP, C, OUT = sys.argv[1], sys.argv[2].rstrip('/') + '/', sys.argv[3]
TODAY = '2026-10-20'

# City Brush Singapore projection (sgreal/common.py): x = (lon - LON0) * MX, y = (lat - LAT0) * MY
LON0, LAT0, MX, MY = 103.845, 1.315, 111290.5, 110574.0
def ll(x, y): return (round(LAT0 + y / MY, 5), round(LON0 + x / MX, 5))

DATASET_SOURCE = {
    'title': 'EARTH ONLINE · City Brush Singapore dataset (landmark placement and intro card)',
    'url': 'https://github.com/Wsamme/earth_online',
    'publisher': 'EARTH ONLINE (Wsamme); map data © OpenStreetMap contributors',
    'checkedAt': TODAY,
}

dump = json.load(open(DUMP))
T, INFO = dump['targets'], dump['info']

# ---------- researched entries ----------
researched = {}
for r in json.load(open(C + 'check-chk-sg-a.json')):
    if r['verdict'] == 'fail':
        continue
    e = dict(r['entry']); e['_review'] = 'Independent agent source check (pending team editor sign-off)'
    researched[e['id']] = e
for f in sorted(glob.glob(C + 'sg[3-9].json')):
    for e in json.load(open(f)):
        e = dict(e); e['_review'] = 'Writer agent source check (independent check and team editor sign-off pending)'
        researched.setdefault(e['id'], e)
drafts = {e['id']: e for e in json.load(open(C + 'sg6-drafts-no-coordinates.json'))}

# dataset key -> researched id (same real place)
MATCH = {
    'merlion': 'curated:sg-merlion-park', 'raffleshotel': 'curated:sg-raffles-hotel', 'cavenagh': 'curated:sg-cavenagh-bridge',
    'fullerton': 'curated:sg-fullerton-building', 'helix': 'curated:sg-helix-bridge', 'site:gardens': 'curated:sg-gardens-by-the-bay',
    'jewel': 'curated:sg-jewel-changi-airport', 'sgjamae': 'curated:sg-masjid-jamae-chulia',
    'hillstreet': 'curated:sg-old-hill-street-police-station', 'barrage': 'curated:sg-marina-barrage',
    'kranji': 'curated:sg-kranji-war-memorial', 'mhfatimah': 'curated:sg-hajjah-fatimah-mosque',
    'peranakan': 'curated:sg-peranakan-museum', 'lauPaSat': 'curated:sg-lau-pa-sat', 'sultanmosque': 'curated:sg-sultan-mosque',
    'mariamman': 'curated:sg-sri-mariamman-temple', 'thianhockkeng': 'curated:sg-thian-hock-keng-temple',
    'natmuseum': 'curated:sg-national-museum-of-singapore', 'acm': 'curated:sg-asian-civilisations-museum',
    'sgbotanic': 'curated:sg-singapore-botanic-gardens', 'sgkwanim': 'curated:sg-kwan-im-thong-hood-cho-temple',
    'sgwarmem': 'curated:sg-civilian-war-memorial',
}

CATEGORY = {}
for k in ['esplanade', 'artscience', 'natgallery', 'victoria', 'natmuseum', 'acm', 'natlibrary', 'peranakan', 'sam', 'malayheritage',
          'capitol', 'artshouse', 'sgmajestic', 'sgconfhall', 'sglasalle', 'sgsciencecentre', 'sghawpar', 'firestation']:
    CATEGORY[k] = 'culture'
for k in ['site:gardens', 'sgbotanic', 'chinesegarden', 'hendersonwaves', 'sgfortcanning', 'barrage']:
    CATEGORY[k] = 'nature'
CATEGORY['lauPaSat'] = 'food'

# Not in the explore checklist (still on the map): offices, condos, hotels and malls, private clubs, places closed or
# not open to visitors, and working areas. The dataset keeps them as landmarks you can see from outside.
NOT_IN_COLLECTION = set('''marinaone guoco oneraffles uob republic capitaspring parkroyal interlace reflections thesail parkview duo
 sggateway southbeach suntec ionorchard ngeeann tangplaza asiasquare ocbc sgconcourse sgcapitagreen sgoasia sgofc mbfc rafflescity
 site:changicargo changitower dukenus sglasalle sgsrc sgcricket istana parliament goldenmile float ktmstation
 sgkallangairport sgrafflesltd sgjurongtower goodwood sgmacdonald'''.split())
# Visitable only from outside / commercial interiors: flagged in the card, still on the map.
VIEW_FROM_OUTSIDE = set('''marinaone guoco oneraffles uob republic capitaspring interlace reflections thesail parkview duo sggateway
 asiasquare ocbc sgconcourse sgcapitagreen sgofc mbfc changitower istana sgmacdonald sgrafflesltd ktmstation float sgkallangairport
 sgjurongtower'''.split())

def slug(s):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s[:60].strip('-')

def en(v): return v.get('en') if isinstance(v, dict) else v
def zh(v): return v.get('zh') if isinstance(v, dict) else None

def words(s): return len(s.split())

def summary_of(text, limit=40):
    """First sentences of the dataset description, up to `limit` words (never cut mid-sentence if avoidable)."""
    sents = re.split(r'(?<=[.!?])\s+', text.strip())
    out = ''
    for s in sents:
        nxt = (out + ' ' + s).strip()
        if words(nxt) > limit and out:
            break
        out = nxt
    if words(out) > limit:
        out = ' '.join(out.split()[:limit]).rstrip(',;:') + '…'
    return out

areas_all = json.load(open(C + 'areas.json'))
SG_AREAS = [a for a in areas_all if a['country'] == 'SG']
def nearest_area(lat, lng):
    best = None
    for a in SG_AREAS:
        if a['id'].endswith('-overview'):
            continue
        d = math.hypot((a['center']['lat'] - lat) * 110574, (a['center']['lng'] - lng) * 111290)
        if not best or d < best[0]:
            best = (d, a)
    return best[1]

def dist_m(a, b):
    return math.hypot((a[0] - b[0]) * 110574, (a[1] - b[1]) * 111290)

places, flags = [], []
used_research = set()
for key, t in T.items():
    if t['kind'] not in ('lm', 'site'):
        continue
    card = INFO.get(key, {})
    if 'p' in card:  # secondary piece of another landmark
        continue
    lat, lng = ll(t['x'], t['y'])
    name_en = en(t['name']) or en(card.get('n')) or key
    name_zh = zh(t['name'])
    d_en, d_zh = en(card.get('d') or {}), zh(card.get('d') or {})
    rid = MATCH.get(key)
    r = researched.get(rid) if rid else None
    if rid and not r and rid in drafts:
        r = dict(drafts[rid]); r['_review'] = 'Writer agent source check (independent check and team editor sign-off pending)'
    pid = rid or 'curated:sg-' + slug(name_en)
    area = nearest_area(lat, lng)
    quick = {}
    if card.get('y'): quick['year'] = str(card['y'])
    if card.get('a'): quick['architect'] = en(card['a'])
    if card.get('h'): quick['heightM'] = card['h']
    if card.get('fl'): quick['floors'] = card['fl']
    entry = {
        'id': pid,
        'name': (r or {}).get('name') or name_en,
        **({'nameZh': name_zh} if name_zh else {}),
        'country': 'SG',
        'regionId': area['regionId'],
        'areaId': area['id'],
        'coordinates': {'lat': lat, 'lng': lng, 'source': DATASET_SOURCE},
        'category': (r or {}).get('category') or CATEGORY.get(key, 'landmark'),
        'kind': en(card.get('k') or {}) or 'Landmark',
        'summary': (r or {}).get('summary') or summary_of(d_en or name_en),
        **({'description': {'en': d_en, **({'zh': d_zh} if d_zh else {}), 'source': DATASET_SOURCE}} if d_en else {}),
        **({'quickFacts': quick} if quick else {}),
        'facts': (r or {}).get('facts', []),
        **({'accessNotes': r['accessNotes']} if r and r.get('accessNotes') else {}),
        'earthKey': key,
        'provenance': 'earth-online+researched' if r else 'earth-online',
        **({'viewFromOutside': True} if key in VIEW_FROM_OUTSIDE else {}),
        'inCollection': key not in NOT_IN_COLLECTION,
        'editorialStatus': 'published',
        'reviewedAt': TODAY,
        'reviewedBy': r['_review'] if r else 'EARTH ONLINE dataset entry (descriptions not yet source-linked; team editor sign-off pending)',
    }
    if r:
        used_research.add(rid)
        rc = r.get('coordinates') or {}
        if rc.get('lat') is not None:
            dd = dist_m((lat, lng), (rc['lat'], rc['lng']))
            if dd > 300:
                flags.append(f'{pid}: dataset point is {dd:.0f} m from the researched point')
    places.append(entry)

# researched places that are not in the dataset
for rid, r in researched.items():
    if rid in used_research or not r.get('coordinates') or r['country'] != 'SG':
        continue
    e = {k: v for k, v in r.items() if not k.startswith('_') and k != 'newArea'}
    e['provenance'] = 'researched'
    e['inCollection'] = True
    e['reviewedBy'] = r['_review']
    e['editorialStatus'] = 'published'
    places.append(e)

# Language tips: Singapore food centres map to the "Hawker centre" phrase setting (editorial mapping).
for p in places:
    if p['category'] == 'food' and re.search(r'hawker|food centre|food court|market', (p['kind'] + ' ' + p['name']).lower()):
        p['languageTip'] = {'context': 'Hawker centre', 'regionLabel': 'Singapore'}

ids = [p['id'] for p in places]
dups = {i for i in ids if ids.count(i) > 1}
assert not dups, dups

AREA_ORDER = [a['id'] for a in SG_AREAS]
places.sort(key=lambda p: (AREA_ORDER.index(p['areaId']) if p['areaId'] in AREA_ORDER else 99, p['name']))

# ---------- collection: 100 explorable places, mixed categories ----------
cand = [p for p in places if p['inCollection']]
# Prefer sourced entries, then by category balance (round-robin), keeping area order within a category.
by_cat = {}
for p in sorted(cand, key=lambda p: (0 if 'researched' in p['provenance'] else 1)):
    by_cat.setdefault(p['category'], []).append(p)
members = []
while len(members) < 100 and any(by_cat.values()):
    for cat in ['landmark', 'food', 'nature', 'culture']:
        if by_cat.get(cat):
            members.append(by_cat[cat].pop(0))
            if len(members) == 100:
                break
member_ids = [p['id'] for p in members]
for p in places:
    p.pop('inCollection', None)

regions = [{'id': i, 'name': n, 'country': 'SG'} for i, n in
           [('central', 'Central Region'), ('east', 'East Region'), ('north', 'North Region'), ('north-east', 'North-East Region'), ('west', 'West Region')]]
areas = []
for a in SG_AREAS:
    a = dict(a)
    if a['id'].endswith('-overview'):
        a['overview'] = True
        a['source'] = {'title': 'Editorial map centre (country overview)', 'url': '', 'publisher': 'IntentAI editorial', 'checkedAt': TODAY}
    areas.append(a)

collections = [{
    'id': 'sg-100', 'version': 1, 'country': 'SG',
    'title': '100 Places to Explore in Singapore',
    'starterTitle': 'Singapore collection',
    'description': 'An editorial selection of landmarks, food centres, nature and culture across Singapore, built on the '
                   'EARTH ONLINE Singapore dataset. It is not an official list.',
    'status': 'starter', 'memberIds': member_ids, 'targetCount': 100,
}]

os.makedirs(OUT, exist_ok=True)
for name, data in [('places.sg.json', places), ('areas.json', {'regions': regions, 'areas': areas}), ('collections.json', collections)]:
    with open(os.path.join(OUT, name), 'w') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2); fh.write('\n')
for stale in ['places.my.json']:
    if os.path.exists(os.path.join(OUT, stale)):
        os.remove(os.path.join(OUT, stale))

from collections import Counter
print('places', len(places), Counter(p['provenance'] for p in places), Counter(p['category'] for p in places))
print('collection', len(member_ids), Counter(p['category'] for p in members))
print('with sourced facts', sum(1 for p in places if p['facts']))
for f in flags: print('FLAG', f)
with open(os.path.join(OUT, 'stats.json'), 'w') as fh:
    json.dump({'publishedPlaces': sum(1 for p in places if p['editorialStatus'] == 'published')}, fh)
