#!/usr/bin/env python3
"""Merge researched place cards into the app (owner request 2026-10-29: every place's card at the Chinatown story-card level).

usage: python3 scripts/explore/merge-cards.py <work area dir> [--dry-run]
  <work area dir>/cards/*.json          { "<place id>": card }   (CARD_SPEC.md in the work folder)
  <work area dir>/photos/<agent>/       the photos and their index.json (credit, licence, Commons file page)

Writes:
  src/data/explore/placeCards.sg.json   the cards (photo files as nearby/cards/<file>.webp paths)
  public/nearby/cards/*.webp            card photos (clip posters, then / now), max 1280 px
  public/nearby/photos/<slug>.jpg + src/data/explore/photos.json
                                        a place photo for places that had none (the card's poster, else its first photo)
  src/data/explore/places.sg.json       `kindFix` applied to the place's kind
A card that breaks a rule (no deep-link source on a number, a photo without an open licence, a caption too long…) is
not merged; the problems are printed. Gaps the researcher reported are printed too.
"""
import json, os, re, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.normpath(os.path.join(HERE, '..', '..'))
CARDS_JSON = os.path.join(APP, 'src/data/explore/placeCards.sg.json')
PLACES = os.path.join(APP, 'src/data/explore/places.sg.json')
PHOTOS_JSON = os.path.join(APP, 'src/data/explore/photos.json')
CARD_DIR = os.path.join(APP, 'public/nearby/cards')
PHOTO_DIR = os.path.join(APP, 'public/nearby/photos')
OPEN = re.compile(r'public domain|\bPD\b|CC0|CC BY', re.I)
DEEP = re.compile(r'^https?://[^/]+/.+')  # some official sites (e.g. pinnacleduxton.com.sg) serve http only

work = sys.argv[1]
dry = '--dry-run' in sys.argv
places = json.load(open(PLACES))
by_id = {p['id']: p for p in places}
photos_manifest = json.load(open(PHOTOS_JSON))
merged = json.load(open(CARDS_JSON)) if os.path.exists(CARDS_JSON) else {}

# every photo the researchers saved, by file name
index = {}
for agent in sorted(os.listdir(os.path.join(work, 'photos'))):
    d = os.path.join(work, 'photos', agent)
    f = os.path.join(d, 'index.json')
    if os.path.isfile(f):
        for name, meta in json.load(open(f)).items():
            index[name] = {**meta, 'path': os.path.join(d, name)}


def photo(ref, problems, where):
    """A card photo reference {file, alt, credit, url} -> {src, alt, credit, url}; the file is converted to webp."""
    if not ref:
        return None
    meta = index.get(ref.get('file', ''))
    if not meta or not os.path.isfile(meta['path']):
        problems.append(f'{where}: photo file {ref.get("file")} not found in any photos/<agent>/index.json')
        return None
    licence = f"{meta.get('license', '')} {meta.get('credit', '')} {ref.get('credit', '')}"
    if not OPEN.search(licence):
        problems.append(f'{where}: {ref["file"]} has no open licence ({licence.strip()})')
        return None
    for k in ('alt', 'credit'):
        if not ref.get(k):
            problems.append(f'{where}: photo {ref["file"]} has no {k}')
    url = ref.get('url') or meta.get('source', '')
    if not DEEP.match(url):
        problems.append(f'{where}: photo {ref["file"]} has no file page URL')
    out_name = re.sub(r'\.[a-z0-9]+$', '', ref['file'], flags=re.I) + '.webp'
    if not dry:
        im = Image.open(meta['path']).convert('RGB')
        im.thumbnail((1280, 1280), Image.LANCZOS)
        os.makedirs(CARD_DIR, exist_ok=True)
        im.save(os.path.join(CARD_DIR, out_name), 'WEBP', quality=78, method=6)
    return {'src': f'nearby/cards/{out_name}', 'alt': ref.get('alt', ''), 'credit': ref.get('credit', meta.get('credit', '')), 'url': url}


def check_source(s, problems, where):
    if not s or not DEEP.match(s.get('url', '')):
        problems.append(f'{where}: source without a deep-link URL: {s}')
    for k in ('title', 'publisher'):
        if s and not s.get(k):
            problems.append(f'{where}: source {s.get("url")} has no {k}')


done, refused = [], {}
for f in sorted(os.listdir(os.path.join(work, 'cards'))):
    if not f.endswith('.json'):
        continue
    for pid, card in json.load(open(os.path.join(work, 'cards', f))).items():
        problems = []
        if pid not in by_id:
            refused[pid] = [f'{f}: not a catalogue place']
            continue
        out = {}
        for k in ('title', 'subtitle', 'lead', 'more', 'lookFor', 'order'):
            if card.get(k):
                out[k] = card[k]
        if out.get('title') and len(''.join(out['title'])) > 64:
            problems.append('title longer than 64 characters')
        for s in card.get('sources', []):
            check_source(s, problems, 'sources')
        out['sources'] = card.get('sources', [])
        clip = card.get('clip')
        if clip:
            caps = clip.get('captions', [])
            if len(caps) != 4 or any(not c or len(c) > 72 for c in caps):
                problems.append(f'clip needs four captions of ≤ 72 characters: {caps}')
            c = {'title': clip.get('title', ''), 'seconds': clip.get('seconds', 90), 'captions': caps}
            if clip.get('poster'):
                p = photo(clip['poster'], problems, 'clip.poster')
                if p:
                    c['poster'] = p
            out['clip'] = c
        tiles = card.get('tiles')
        if tiles:
            if len(tiles) != 3:
                problems.append('tiles: need exactly three')
            for t in tiles:
                check_source(t.get('source'), problems, f'tile {t.get("label")}')
                if not isinstance(t.get('value'), (int, float)):
                    problems.append(f'tile {t.get("label")}: value is not a number')
            out['tiles'] = [{k: v for k, v in t.items() if k in ('value', 'label', 'suffix', 'grouped', 'source') and v not in (None, '', False)} for t in tiles]
        tn = card.get('thenNow')
        if tn:
            then, now = photo(tn.get('then'), problems, 'thenNow.then'), photo(tn.get('now'), problems, 'thenNow.now')
            if then and now:
                out['thenNow'] = {'then': then, 'now': now, 'thenLabel': tn['thenLabel'], 'nowLabel': tn['nowLabel'], 'captions': tn['captions'], **({'tall': True} if tn.get('tall') else {})}
        if card.get('orderProposal'):
            out['orderProposal'] = card['orderProposal']
        out['reviewedAt'] = card.get('reviewedAt', '2026-10-29')
        if problems:
            refused[pid] = problems
            continue
        merged[pid] = out
        done.append(pid)
        place = by_id[pid]
        if card.get('kindFix') and card['kindFix'] != place['kind']:
            print(f'kind  {pid}: {place["kind"]!r} -> {card["kindFix"]!r}')
            place['kind'] = card['kindFix']
        # a place photo for places that have none: the poster, else the first card photo
        if pid not in photos_manifest['photos']:
            ref = (clip or {}).get('poster') or (tn or {}).get('now')
            meta = index.get((ref or {}).get('file', ''))
            if meta and not dry:
                slug = pid.replace('curated:', '')
                im = Image.open(meta['path']).convert('RGB')
                im.thumbnail((640, 640), Image.LANCZOS)
                im.save(os.path.join(PHOTO_DIR, slug + '.jpg'), 'JPEG', quality=82)
                photos_manifest['photos'][pid] = {
                    'file': slug + '.jpg', 'credit': ref.get('credit') or meta.get('credit'), 'source': ref.get('url') or meta.get('source'),
                    'license': meta.get('license', ''), 'licenseUrl': meta.get('licenseUrl', ''),
                }
                print(f'photo {pid}: {ref["file"]}')
        for g in card.get('gaps', []):
            print(f'gap   {pid}: {g}')

for pid, probs in refused.items():
    print(f'REFUSED {pid}:')
    for p in probs:
        print('   -', p)
print(f'{len(done)} cards merged, {len(refused)} refused' + (' (dry run, nothing written)' if dry else ''))
if not dry:
    json.dump(dict(sorted(merged.items())), open(CARDS_JSON, 'w'), ensure_ascii=False, indent=1)
    open(CARDS_JSON, 'a').write('\n')
    photos_manifest['missing'] = sorted(set(photos_manifest.get('missing', [])) - set(photos_manifest['photos']))
    json.dump(photos_manifest, open(PHOTOS_JSON, 'w'), ensure_ascii=False, indent=2)
    open(PHOTOS_JSON, 'a').write('\n')
    json.dump(places, open(PLACES, 'w'), ensure_ascii=False, indent=2)
    open(PLACES, 'a').write('\n')
