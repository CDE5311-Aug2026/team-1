#!/usr/bin/env python3
"""Pack 3D-model screenshots (scripts/explore/thumbs.cjs output) into public/nearby/thumbs/<slug>.webp (240 x 180)
and list them in src/data/explore/thumbs.json. usage: thumbs-pack.py <raw png dir>"""
import json, os, sys
from PIL import Image

raw = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '..', '..', 'public', 'nearby', 'thumbs')
manifest = os.path.join(here, '..', '..', 'src', 'data', 'explore', 'thumbs.json')
places = {p['id'].replace('curated:', ''): p['id'] for p in json.load(open(os.path.join(here, '..', '..', 'src', 'data', 'explore', 'places.sg.json')))}
os.makedirs(out, exist_ok=True)
ids = []
for f in sorted(os.listdir(raw)):
    slug, ext = os.path.splitext(f)
    if ext != '.png' or slug not in places:
        continue
    im = Image.open(os.path.join(raw, f)).convert('RGB')
    im = im.resize((240, 180), Image.LANCZOS)
    im.save(os.path.join(out, slug + '.webp'), 'WEBP', quality=74, method=6)
    ids.append(places[slug])
data = json.load(open(manifest))
data['ids'] = sorted(ids)
json.dump(data, open(manifest, 'w'), indent=2, ensure_ascii=False)
open(manifest, 'a').write('\n')
print(len(ids), 'thumbnails,', sum(os.path.getsize(os.path.join(out, s + '.webp')) for s in [i.replace('curated:', '') for i in ids]) // 1024, 'KB')
