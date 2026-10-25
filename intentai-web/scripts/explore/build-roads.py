#!/usr/bin/env python3
"""Decode the EARTH ONLINE sg_roads.txt (SGR1 format, see sgreal/s7_encode.py) and write the simplified 2D road layers.
usage: python3 scripts/explore/build-roads.py public/earth-online/sg/sgdata/sg_roads.txt src/data/explore
"""
import base64, gzip, collections, math, json, sys
raw = open(sys.argv[1]).read().strip()
b = gzip.decompress(base64.b64decode(raw))
print('bytes', len(b), b[:4])
i = 4
def vu():
    global i
    v = 0; s = 0
    while True:
        c = b[i]; i += 1
        v |= (c & 127) << s; s += 7
        if c < 128: return v
def vs():
    v = vu(); return (v >> 1) ^ -(v & 1)
n = vu(); print('records', n)
px = py = 0; lines = []
for r in range(n):
    c = b[i]; fl = b[i+1]; i += 2
    nm = vu(); rf = vu(); k = vu()
    pts = []
    for _ in range(k):
        px += vs(); py += vs(); pts.append((px / 4.0, py / 4.0))
    if fl & 4: i += k
    lines.append((c, fl, nm, pts))
print('rest bytes', len(b) - i)
cnt = collections.Counter(); length = collections.Counter()
for c, fl, nm, pts in lines:
    cnt[c] += 1
    length[c] += sum(math.hypot(pts[j+1][0]-pts[j][0], pts[j+1][1]-pts[j][1]) for j in range(len(pts)-1))
for c in sorted(cnt): print(c, cnt[c], round(length[c]/1000), 'km')


import json, math, os
OUT = sys.argv[2].rstrip('/') + '/'
def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True; st = [(0, len(pts)-1)]
    while st:
        a, b = st.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx-ax, by-ay; L = math.hypot(dx, dy) or 1e-9; best = -1; bi = -1
        for k in range(a+1, b):
            d = abs(dy*pts[k][0] - dx*pts[k][1] + bx*ay - by*ax)/L
            if d > best: best, bi = d, k
        if best > tol: keep[bi] = True; st += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]
def enc(sel, tol):
    out = []; npts = 0
    for c, fl, nm, pts in lines:
        if not sel(c, fl): continue
        s = dp(pts, tol)
        q = [(round(x), round(y)) for x, y in s]
        flat = [c | (16 if fl & 8 else 0) | (32 if fl & 2 else 0), q[0][0], q[0][1]]
        for j in range(1, len(q)):
            flat += [q[j][0]-q[j-1][0], q[j][1]-q[j-1][1]]
        out.append(flat); npts += len(q)
    return out, npts
major, n1 = enc(lambda c, fl: c <= 9, 4)
minor, n2 = enc(lambda c, fl: c == 10 and not fl & 8, 3)
meta = {'source': 'EARTH ONLINE · City Brush Singapore dataset (sg_roads, from OpenStreetMap © OpenStreetMap contributors, ODbL); '
        'metres in the City Brush frame (x = (lng − 103.845) · 111290.5, y = (lat − 1.315) · 110574); simplified for the 2D map. '
        'Each line: [class | 16 foreign | 32 bridge, x0, y0, dx1, dy1, …]. Classes 0–9: motorway … tertiary links; 10: local streets.'}
for name, data in [('roads-major.json', major), ('roads-minor.json', minor)]:
    s = json.dumps({**meta, 'lines': data}, separators=(',', ':'))
    open(OUT + name, 'w').write(s)
    import gzip
    print(name, len(data), 'lines', round(len(s)/1e3), 'KB', round(len(gzip.compress(s.encode()))/1e3), 'KB gz')
print('points', n1, n2)
