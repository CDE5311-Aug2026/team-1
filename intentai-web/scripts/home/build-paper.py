#!/usr/bin/env python3
"""Home's background (owner, 31 Oct 2026: "kraft paper like a book, with a faint trace of Singapore's roads; exploring,
vintage, not tech"): a sheet of kraft paper with the real road network printed faintly on it, as on an old street map.

usage: python3 scripts/home/build-paper.py
  reads  src/data/explore/roads-major.json (OpenStreetMap © OpenStreetMap contributors, ODbL, via EARTH ONLINE)
  writes public/home/paper.webp (portrait, about a phone screen at 2x)

The paper is made here (noise, fibres, a darker edge), not a photo, so there is nothing to license. The roads are a
portrait window over the city: downtown at the bottom, up through Toa Payoh and Ang Mo Kio to Woodlands.
"""
import json
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 900, 1950
OUT = 'public/home/paper.webp'
rng = np.random.default_rng(7)
random.seed(7)

# --- kraft paper -------------------------------------------------------------------------------------------------------
base = np.array([200, 168, 122], dtype=np.float32)  # warm kraft


def noise(scale):
    small = rng.random((max(2, H // scale), max(2, W // scale))).astype(np.float32)
    return np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255 - 0.5


tone = noise(240) * 22 + noise(60) * 12 + noise(12) * 7 + (rng.random((H, W)).astype(np.float32) - 0.5) * 10
img = np.clip(base[None, None, :] + tone[:, :, None] * np.array([1.0, 0.9, 0.75])[None, None, :], 0, 255)

# the edges of an old book page go a little darker
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
d = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.6)) ** 2)
img *= (1 - 0.2 * np.clip(d - 0.45, 0, 1) ** 1.4)[:, :, None]
paper = Image.fromarray(img.astype(np.uint8), 'RGB')

# fibres: short light and dark hairs
fib = Image.new('RGBA', (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(fib)
for _ in range(2600):
    x, y = random.random() * W, random.random() * H
    a = random.random() * math.pi
    l = random.uniform(4, 16)
    light = random.random() < 0.55
    col = (255, 240, 210, random.randint(18, 45)) if light else (90, 60, 30, random.randint(14, 34))
    fd.line([(x, y), (x + math.cos(a) * l, y + math.sin(a) * l)], fill=col, width=1)
paper = Image.alpha_composite(paper.convert('RGBA'), fib.filter(ImageFilter.GaussianBlur(0.4)))

# --- the roads, printed faintly ------------------------------------------------------------------------------------------
roads = json.load(open('src/data/explore/roads-major.json'))['lines']
# window in map metres (x east, y north): 15 km wide, portrait
X0, X1 = -7600, 7400
Y0 = -9200
Y1 = Y0 + (X1 - X0) * H / W
k = W / (X1 - X0)
ink = Image.new('RGBA', (W, H), (0, 0, 0, 0))
dr = ImageDraw.Draw(ink)
WIDTH = {0: 3.2, 1: 2.6, 2: 2.2, 3: 1.9, 4: 1.6, 5: 1.4, 6: 1.2, 7: 1.0, 8: 1.0, 9: 0.9}
for line in sorted(roads, key=lambda l: -(l[0] & 15)):
    c = line[0] & 15
    x, y = line[1], line[2]
    pts = [(x, y)]
    for i in range(3, len(line), 2):
        x += line[i]
        y += line[i + 1]
        pts.append((x, y))
    px = [((p[0] - X0) * k, (Y1 - p[1]) * k) for p in pts]
    if all(not (-20 < q[0] < W + 20 and -20 < q[1] < H + 20) for q in px):
        continue
    a = 70 if c <= 2 else 52 if c <= 5 else 38
    dr.line(px, fill=(74, 46, 22, a), width=max(1, round(WIDTH.get(c, 0.9) * 1.25)), joint='curve')
# ink soaks a little into the paper
ink = ink.filter(ImageFilter.GaussianBlur(0.6))
paper = Image.alpha_composite(paper, ink).convert('RGB')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
paper.save(OUT, 'WEBP', quality=72, method=6)
print(OUT, os.path.getsize(OUT) // 1024, 'KB')
