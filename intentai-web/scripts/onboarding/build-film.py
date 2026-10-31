#!/usr/bin/env python3
"""Onboarding's film wall (owner, 31 Oct 2026: "buildings, old photos, like a roll of film"): small frames of the old
public-domain photos on the place cards, then present-day photos of heritage buildings, for the drifting wall on O1.

usage: python3 scripts/onboarding/build-film.py
  reads  src/data/explore/placeCards.sg.json (the 'then' photos), src/data/explore/photos.json and places.sg.json
  writes public/onboarding/film/*.webp (320 px wide) and src/pages/OnboardingPage/v3/film.json (name, year, credit)
"""
import json
import os
import re

from PIL import Image, ImageOps

OUT = 'public/onboarding/film'
W, H = 320, 240
os.makedirs(OUT, exist_ok=True)
places = {p['id']: p for p in json.load(open('src/data/explore/places.sg.json'))}
cards = json.load(open('src/data/explore/placeCards.sg.json'))
photos = json.load(open('src/data/explore/photos.json'))['photos']

# then photos written in placeCards.ts (not in the JSON)
EXTRA_THEN = [('curated:sg-masjid-jamae-chulia', 'nearby/cards/jamae-c1900.webp', 'c.1900', 'G.R. Lambert & Co., c.1900 · public domain')]
YEARS = {  # the year read from the credit, where the credit's number is an archive number
    'curated:sg-fullerton-building': '1930s', 'curated:sg-national-museum-of-singapore': 'c.1900', 'curated:sg-the-cenotaph': '1920s',
    'curated:sg-wesley-methodist-church': '1910s',
}
HERITAGE = '''sri-mariamman-temple thian-hock-keng-temple sultan-mosque armenian-church-of-saint-gregory-the-illuminator
st-andrew-s-cathedral victoria-theatre-and-concert-hall raffles-hotel fullerton-building cavenagh-bridge anderson-bridge
tanjong-pagar-railway-station former-kallang-airport-terminal jinrikisha-station chijmes national-museum-of-singapore
the-arts-house-old-parliament-house old-hill-street-police-station central-fire-station capitol-singapore peranakan-museum
malay-heritage-centre-istana-kampong-gelam house-of-tan-teng-niah kwan-im-thong-hood-cho-temple masjid-abdul-gafoor
goodwood-park-hotel clifford-pier-customs-house the-majestic boat-quay sri-veeramakaliamman-temple hajjah-fatimah-mosque
macdonald-house cathedral-of-the-good-shepherd nagore-dargah lian-shan-shuang-lin-monastery'''.split()


def save(src, name):
    im = Image.open(src).convert('RGB')
    im = ImageOps.fit(im, (W, H), Image.LANCZOS, centering=(0.5, 0.45))
    im.save(f'{OUT}/{name}.webp', 'WEBP', quality=62, method=6)


items = []
for pid, card in cards.items():
    then = (card.get('thenNow') or {}).get('then')
    if not then:
        continue
    y = re.search(r'c\.\s?1[89]\d\d|\b1[89]\d\d\b', then['credit'])
    items.append((pid, 'public/' + then['src'], YEARS.get(pid) or (y.group(0) if y else 'Old photo'), then['credit'], True))
for pid, src, year, credit in EXTRA_THEN:
    items.append((pid, 'public/' + src, year, credit, True))
for slug in HERITAGE:
    pid = f'curated:sg-{slug}'
    ph = photos.get(pid)
    if not ph:
        print('no photo', slug)
        continue
    items.append((pid, f"public/nearby/photos/{ph['file']}", 'Today', ph['credit'], False))

out = []
for i, (pid, src, year, credit, old) in enumerate(items):
    name = ('then-' if old else 'now-') + pid.split(':sg-')[1]
    save(src, name)
    out.append({'file': f'{name}.webp', 'placeId': pid, 'name': places[pid]['name'], 'year': year, 'old': old, 'credit': credit})
json.dump(out, open('src/pages/OnboardingPage/v3/film.json', 'w'), ensure_ascii=False, indent=1)
size = sum(os.path.getsize(f'{OUT}/{o["file"]}') for o in out)
print(len(out), 'frames', size // 1024, 'KB')
