#!/usr/bin/env python3
"""Build the URA planning areas for Home's map (Discovery redesign, 31 Oct 2026).

    python3 scripts/ura/build-ura.py [planning-area.geojson]

Source: "Master Plan 2019 Planning Area Boundary (No Sea)", Urban Redevelopment Authority, data.gov.sg dataset
d_4765db0e87b9c86336792efe8a1f7a66 (Singapore Open Data Licence v1.0). Without an argument the file is fetched from
data.gov.sg's download API. Writes:

- src/data/ura/areas.json: the 5 regions and 55 planning areas, each with its outline in our map frame
  (metres around 103.845 E, 1.315 N, see src/features/nearby/map/projection.ts), simplified for phones.
- src/data/ura/placeAreas.json: published Nearby place id -> planning area id (point in polygon; a point just
  off the coast goes to the nearest area).
"""
import json, math, os, sys, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
P = lambda *a: os.path.join(ROOT, *a)
DATASET = 'd_4765db0e87b9c86336792efe8a1f7a66'
LON0, LAT0, MX, MY = 103.845, 1.315, 111_290.5, 110_574.0
TOLERANCE_M = 30  # Douglas-Peucker tolerance

REGIONS = [
    ('central', 'Central', 'CENTRAL REGION'),
    ('east', 'East', 'EAST REGION'),
    ('north', 'North', 'NORTH REGION'),
    ('north-east', 'North-East', 'NORTH-EAST REGION'),
    ('west', 'West', 'WEST REGION'),
]
REGION_OF = {ura: rid for rid, _, ura in REGIONS}


def load():
    if len(sys.argv) > 1:
        return json.load(open(sys.argv[1]))
    req = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60)
    url = json.load(req(f'https://api-open.data.gov.sg/v1/public/api/datasets/{DATASET}/initiate-download'))['data']['url']
    return json.load(req(url))


def xy(lng, lat):
    return ((lng - LON0) * MX, (lat - LAT0) * MY)


def simplify(pts, tol):
    if len(pts) < 4:
        return pts
    def dist(p, a, b):
        (x, y), (x1, y1), (x2, y2) = p, a, b
        dx, dy = x2 - x1, y2 - y1
        if dx == dy == 0:
            return math.hypot(x - x1, y - y1)
        t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
        return math.hypot(x - x1 - t * dx, y - y1 - t * dy)
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        best, k = 0, -1
        for m in range(i + 1, j):
            d = dist(pts[m], pts[i], pts[j])
            if d > best:
                best, k = d, m
        if best > tol:
            keep[k] = True
            stack += [(i, k), (k, j)]
    return [p for p, f in zip(pts, keep) if f]


def ring_area(r):
    return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2


def inside(pt, ring):
    x, y = pt
    c = False
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def title(name):
    return ' '.join(w.capitalize() if w not in ('OF',) else w.lower() for w in name.split(' ')).replace('-e', '-E')


geo = load()
areas = []
for f in geo['features']:
    p = f['properties']
    g = f['geometry']
    polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    outer_rings = []  # outer rings only: holes inside planning areas are tiny and not drawn
    full = []
    for poly in polys:
        ring = [xy(c[0], c[1]) for c in poly[0]]
        full.append(ring)
        s = simplify(ring, TOLERANCE_M)
        if len(s) >= 4 and ring_area(s) > 20_000:  # drop islets under 2 ha at phone scale
            outer_rings.append([[round(x), round(y)] for x, y in s])
    if not outer_rings:  # keep the largest ring at least
        big = max(full, key=ring_area)
        outer_rings = [[[round(x), round(y)] for x, y in simplify(big, TOLERANCE_M)]]
    xs = [x for r in outer_rings for x, _ in r]
    ys = [y for r in outer_rings for _, y in r]
    # label point: area-weighted centroid of the largest ring
    big = max(outer_rings, key=ring_area)
    a = sum(big[i][0] * big[i + 1][1] - big[i + 1][0] * big[i][1] for i in range(len(big) - 1)) / 2 or 1
    cx = sum((big[i][0] + big[i + 1][0]) * (big[i][0] * big[i + 1][1] - big[i + 1][0] * big[i][1]) for i in range(len(big) - 1)) / (6 * a)
    cy = sum((big[i][1] + big[i + 1][1]) * (big[i][0] * big[i + 1][1] - big[i + 1][0] * big[i][1]) for i in range(len(big) - 1)) / (6 * a)
    areas.append({
        'id': p['PLN_AREA_C'].lower(),
        'name': title(p['PLN_AREA_N']),
        'region': REGION_OF[p['REGION_N']],
        'centre': [round(cx), round(cy)],
        'box': [min(xs), min(ys), max(xs), max(ys)],
        'rings': outer_rings,
        '_full': full,
    })
areas.sort(key=lambda a: (a['region'], a['name']))

# Places -> planning area (full-resolution rings).
places = json.load(open(P('src/data/explore/places.sg.json')))
place_areas = {}
for pl in places:
    if pl.get('editorialStatus') != 'published':
        continue
    pt = xy(pl['coordinates']['lng'], pl['coordinates']['lat'])
    hit = next((a['id'] for a in areas if any(inside(pt, r) for r in a['_full'])), None)
    if hit is None:  # just off the coast: nearest outline vertex
        hit = min(areas, key=lambda a: min(math.hypot(pt[0] - x, pt[1] - y) for r in a['_full'] for x, y in r))['id']
        print('  nearest:', pl['id'], '->', hit)
    place_areas[pl['id']] = hit
for a in areas:
    del a['_full']

out = {
    'source': {
        'title': 'Master Plan 2019 Planning Area Boundary (No Sea)',
        'publisher': 'Urban Redevelopment Authority, via data.gov.sg',
        'url': f'https://data.gov.sg/datasets/{DATASET}/view',
        'licence': 'Singapore Open Data Licence v1.0',
        'licenceUrl': 'https://data.gov.sg/open-data-licence',
        'note': 'Indicative outlines, simplified to about 30 m for phones.',
    },
    'regions': [{'id': rid, 'name': name} for rid, name, _ in REGIONS],
    'areas': areas,
}
json.dump(out, open(P('src/data/ura/areas.json'), 'w'), separators=(',', ':'))
json.dump(dict(sorted(place_areas.items())), open(P('src/data/ura/placeAreas.json'), 'w'), indent=0)
pts = sum(len(r) for a in areas for r in a['rings'])
print(f"{len(areas)} areas, {pts} points, {os.path.getsize(P('src/data/ura/areas.json')) // 1024} KB; {len(place_areas)} places placed")
