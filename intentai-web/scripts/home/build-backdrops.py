#!/usr/bin/env python3
"""Home's backgrounds, one for each deck (owner, 31 Oct 2026: "more backgrounds; each small area of Singapore its own;
the deck decides the background"). Old printed maps on old paper, never photos:

  sg.webp               the region deck: an antique sea chart of the island, its five regions lettered, a compass rose
  region-<id>.webp      a region's areas deck: the region's planning areas outlined and named, its roads
  area-<code>.webp      an area's places deck: the planning area close up with its streets, its boundary hatched

Each region has its own paper and ink (kraft, sea chart, survey linen, parchment, rust), and its areas share it, so a
deck's background tells you where you are even before you read it. Land is the union of URA's planning areas (no sea),
so the coast matches the map card. The focus sits low on the sheet, where it shows round the deck of cards.

usage: python3 scripts/home/build-backdrops.py [only-key …]
  reads  src/data/ura/areas.json (URA Master Plan 2019, Singapore Open Data Licence),
         src/data/explore/roads-major.json and roads-minor.json (OpenStreetMap © OpenStreetMap contributors, ODbL)
  writes public/home/bg/*.webp (780 × 1690, about 40–90 KB each)
"""
import json
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 780, 1690


def grow(mask, steps):
    """a boolean mask grown outward by `steps` pixels (repeated 3 × 3 max), every step kept"""
    im = Image.fromarray(mask.astype(np.uint8) * 255)
    out = [mask]
    for _ in range(steps):
        im = im.filter(ImageFilter.MaxFilter(3))
        out.append(np.asarray(im) > 0)
    return out


def shrink(mask, steps):
    im = Image.fromarray(mask.astype(np.uint8) * 255)
    for _ in range(steps):
        im = im.filter(ImageFilter.MinFilter(3))
    return np.asarray(im) > 0
OUT = 'public/home/bg'
FOCUS_Y = 0.66  # where the focus sits on the sheet (behind the deck)
FONTS = '/System/Library/Fonts/Supplemental/'
CAPS = FONTS + 'Copperplate.ttc'
ITALIC = FONTS + 'Georgia Italic.ttf'

ura = json.load(open('src/data/ura/areas.json'))
AREAS = ura['areas']
REGIONS = {r['id']: r['name'] for r in ura['regions']}
MAJOR = json.load(open('src/data/explore/roads-major.json'))['lines']
MINOR = json.load(open('src/data/explore/roads-minor.json'))['lines']

# paper, ink, sea wash and accent for each region; the island chart has its own
PALETTES = {
    'chart': dict(paper=(226, 208, 164), ink=(78, 46, 22), sea=(204, 194, 160), accent=(150, 62, 30)),
    'central': dict(paper=(200, 168, 122), ink=(74, 46, 22), sea=(182, 154, 112), accent=(140, 58, 26)),
    'east': dict(paper=(226, 220, 198), ink=(36, 62, 88), sea=(196, 210, 208), accent=(150, 64, 40)),
    'north': dict(paper=(212, 210, 184), ink=(46, 66, 44), sea=(192, 204, 190), accent=(130, 70, 30)),
    'north-east': dict(paper=(234, 216, 172), ink=(98, 54, 28), sea=(214, 204, 172), accent=(160, 60, 34)),
    'west': dict(paper=(216, 184, 136), ink=(112, 42, 24), sea=(204, 182, 146), accent=(70, 48, 30)),
}


def rings_of(a):
    return a['rings']


def bbox(areas):
    xs = [x for a in areas for r in a['rings'] for x, _ in r]
    ys = [y for a in areas for r in a['rings'] for _, y in r]
    return min(xs), min(ys), max(xs), max(ys)


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


class Sheet:
    def __init__(self, cx, cy, width_m, palette, seed):
        self.k = W / width_m
        self.cx, self.cy = cx, cy
        self.p = palette
        self.rng = np.random.default_rng(seed)
        random.seed(seed)

    def px(self, x, y):
        return ((x - self.cx) * self.k + W / 2, (self.cy - y) * self.k + H * FOCUS_Y)

    def m(self, X, Y):
        """pixel → map metres"""
        return (X - W / 2) / self.k + self.cx, self.cy - (Y - H * FOCUS_Y) / self.k

    # --- paper --------------------------------------------------------------------------------------------------------
    def noise(self, scale):
        small = self.rng.random((max(2, H // scale), max(2, W // scale))).astype(np.float32)
        return np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255 - 0.5

    def paper(self):
        base = np.array(self.p['paper'], dtype=np.float32)
        tone = self.noise(260) * 20 + self.noise(70) * 11 + self.noise(14) * 6 + (self.rng.random((H, W)).astype(np.float32) - 0.5) * 9
        img = base[None, None, :] + tone[:, :, None] * np.array([1.0, 0.9, 0.75])[None, None, :]
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.6)) ** 2)
        img *= (1 - 0.22 * np.clip(d - 0.42, 0, 1) ** 1.4)[:, :, None]
        return img

    # --- the map ------------------------------------------------------------------------------------------------------
    def land_mask(self):
        m = Image.new('L', (W, H), 0)
        d = ImageDraw.Draw(m)
        for a in AREAS:
            for r in a['rings']:
                d.polygon([self.px(x, y) for x, y in r], fill=255)
        return np.asarray(m) > 0

    def render(self, focus=None, region=None, island=False, title='', subtitle='', grid=0.02, minor=False):
        img = self.paper()
        land = self.land_mask()
        sea = ~land
        # the sea a shade darker, with water-lining round the coast as on old charts
        seac = np.array(self.p['sea'], dtype=np.float32)
        img[sea] = img[sea] * 0.55 + seac * 0.45 + (img[sea] - np.array(self.p['paper'])) * 0.45
        rings = grow(land, 48)
        ink = np.array(self.p['ink'], dtype=np.float32)
        for lo, a in [(3, 0.34), (9, 0.24), (16, 0.17), (25, 0.11), (36, 0.07)]:
            band = rings[lo + 1] & ~rings[lo]
            img[band] = img[band] * (1 - a) + ink * a
        sheet = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert('RGBA')

        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dr = ImageDraw.Draw(lay)
        inkc = tuple(self.p['ink'])
        acc = tuple(self.p['accent'])

        # waves in open water: short strokes in rows
        far = ~rings[46]
        for y in range(8, H, 26):
            for x in range(int((y * 7) % 31), W, 62):
                if far[min(H - 1, y), min(W - 1, x)] and far[min(H - 1, y), min(W - 1, x + 14)]:
                    pts = [(x + t, y + 2.2 * math.sin(t / 3.2)) for t in range(0, 18, 2)]
                    dr.line(pts, fill=inkc + (46,), width=1)

        # the graticule, dotted, with its degrees at the edge
        lab = font(ITALIC, 15)
        lon0, lat0 = 103.845, 1.315
        x0m, y1m = self.m(0, 0)
        x1m, y0m = self.m(W, H)
        g = grid
        lat = math.floor((y0m / 110574 + lat0) / g) * g
        while lat < y1m / 110574 + lat0 + g:
            Y = self.px(0, (lat - lat0) * 110574)[1]
            for X in range(0, W, 7):
                dr.point((X, Y), fill=inkc + (70,))
            dd = int(lat)
            mm = round((lat - dd) * 60)
            dr.text((8, Y - 18), f'{dd}°{mm:02d}′N', font=lab, fill=inkc + (110,))
            lat += g
        lon = math.floor((x0m / 111290.5 + lon0) / g) * g
        while lon < x1m / 111290.5 + lon0 + g:
            X = self.px((lon - lon0) * 111290.5, 0)[0]
            for Y in range(0, H, 7):
                dr.point((X, Y), fill=inkc + (70,))
            dd = int(lon)
            mm = round((lon - dd) * 60)
            if 30 < X < W - 30:
                dr.text((X + 4, H - 30), f'{dd}°{mm:02d}′E', font=lab, fill=inkc + (110,))
            lon += g

        # roads, the big ones darker; streets close up
        def lines(data, alpha_of, width_of):
            for line in sorted(data, key=lambda l: -(l[0] & 15)):
                c = line[0] & 15
                x, y = line[1], line[2]
                pts = [self.px(x, y)]
                for i in range(3, len(line), 2):
                    x += line[i]
                    y += line[i + 1]
                    pts.append(self.px(x, y))
                if all(not (-30 < q[0] < W + 30 and -30 < q[1] < H + 30) for q in pts):
                    continue
                dr.line(pts, fill=inkc + (alpha_of(c),), width=width_of(c), joint='curve')

        zoom = self.k * 1000  # px per km
        if minor:
            lines(MINOR, lambda c: 62, lambda c: 1)
        lines(MAJOR, lambda c: 105 if c <= 2 else 82 if c <= 5 else 64, lambda c: max(1, round((3.2 if c <= 2 else 2.2 if c <= 5 else 1.4) * min(1.0, zoom / 60))))

        # planning areas: dashed boundaries; the focus area solid with a hatched band inside
        def dashed(pts, fill, width, dash=9, gap=6):
            for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
                L = math.hypot(bx - ax, by - ay)
                t = 0.0
                while t < L:
                    e = min(L, t + dash)
                    dr.line([(ax + (bx - ax) * t / L, ay + (by - ay) * t / L), (ax + (bx - ax) * e / L, ay + (by - ay) * e / L)], fill=fill, width=width)
                    t = e + gap

        shown = AREAS if island or region else AREAS
        for a in shown:
            for r in a['rings']:
                pts = [self.px(x, y) for x, y in r]
                strong = (region and a['region'] == region) or (focus and a['id'] == focus['id'])
                if island:
                    dashed(pts, inkc + (70,), 1, 4, 5)
                elif not (focus and a['id'] == focus['id']):
                    dashed(pts, inkc + (130 if strong else 70,), 2 if strong else 1)

        if island:
            # region borders: outline each region's land
            for rid in REGIONS:
                m = Image.new('L', (W, H), 0)
                md = ImageDraw.Draw(m)
                for a in AREAS:
                    if a['region'] == rid:
                        for r in a['rings']:
                            md.polygon([self.px(x, y) for x, y in r], fill=255)
                edge = np.asarray(m.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3))) > 0
                ys, xs = np.nonzero(edge & land)
                for x, y in zip(xs[::2], ys[::2]):
                    dr.point((int(x), int(y)), fill=acc + (150,))

        if focus:
            m = Image.new('L', (W, H), 0)
            md = ImageDraw.Draw(m)
            for r in focus['rings']:
                md.polygon([self.px(x, y) for x, y in r], fill=255)
            inside = np.asarray(m) > 0
            band = inside & ~shrink(inside, 14)
            hatch = Image.new('L', (W, H), 0)
            hd = ImageDraw.Draw(hatch)
            for s in range(-H, W + H, 8):
                hd.line([(s, 0), (s + H, H)], fill=255, width=2)
            hm = (np.asarray(hatch) > 0) & band
            hl = np.zeros((H, W, 4), np.uint8)
            hl[hm] = acc + (95,)
            lay = Image.alpha_composite(lay, Image.fromarray(hl))
            dr = ImageDraw.Draw(lay)
            for r in focus['rings']:
                pts = [self.px(x, y) for x, y in r]
                dr.line(pts + pts[:1], fill=acc + (210,), width=3, joint='curve')

        # lettering: area names spaced out in capitals, as on a survey map
        def spaced(text, cx, cy, size, alpha, color=inkc, track=0.28, path=CAPS):
            f = font(path, size)
            widths = [f.getlength(ch) for ch in text]
            total = sum(widths) + track * size * (len(text) - 1)
            x = cx - total / 2
            for ch, w in zip(text, widths):
                dr.text((x, cy - size * 0.55), ch, font=f, fill=color + (alpha,))
                x += w + track * size

        if island:
            for rid, name in REGIONS.items():
                ra = [a for a in AREAS if a['region'] == rid]
                x0, y0, x1, y1 = bbox(ra)
                cxp, cyp = self.px((x0 + x1) / 2, (y0 + y1) / 2)
                spaced(name.upper(), cxp, cyp, 26, 185, acc)
        elif region:
            for a in AREAS:
                if a['region'] != region:
                    continue
                X, Y = self.px(*a['centre'])
                if 20 < X < W - 20 and 20 < Y < H - 20:
                    spaced(a['name'].upper(), X, Y, 15, 170, inkc, 0.18)
        if focus:
            X, Y = self.px(*focus['centre'])
            spaced(focus['name'].upper(), X, Y, 30 if len(focus['name']) < 14 else 23, 200, acc, 0.3)
            for a in AREAS:
                if a['id'] == focus['id']:
                    continue
                X, Y = self.px(*a['centre'])
                if 30 < X < W - 30 and 30 < Y < H - 30:
                    spaced(a['name'].upper(), X, Y, 14, 110, inkc, 0.18)

        # compass rose
        self.rose(dr, *((W - 112, H * 0.13) if focus else (W - 120, H * 0.86)), 70 if focus else 84, inkc, acc)
        if island:
            # rhumb lines from the rose, as on a portolan chart
            rx, ry = W - 120, H * 0.86
            for i in range(16):
                a = i * math.pi / 8
                dr.line([(rx, ry), (rx + math.cos(a) * 2000, ry + math.sin(a) * 2000)], fill=inkc + (34,), width=1)

        # (no title cartouche: the sheet's top lies under Home's header, and the deck already says where you are;
        # cartouche() stays for a sheet that ever shows its top)

        sheet = Image.alpha_composite(sheet, lay.filter(ImageFilter.GaussianBlur(0.45)))
        sheet = self.age(sheet)
        return sheet.convert('RGB')

    def rose(self, dr, cx, cy, r, inkc, acc):
        for rr, a in ((r, 150), (r * 0.82, 90)):
            dr.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=inkc + (a,), width=1)
        for i in range(32):
            a = i * math.pi / 16
            L = r if i % 4 == 0 else r * 0.9
            dr.line([(cx + math.cos(a) * r * 0.82, cy + math.sin(a) * r * 0.82), (cx + math.cos(a) * L, cy + math.sin(a) * L)], fill=inkc + (120,), width=1)
        for i in range(8):
            a = i * math.pi / 4 - math.pi / 2
            L = r * (0.95 if i % 2 == 0 else 0.55)
            wv = r * (0.13 if i % 2 == 0 else 0.1)
            tip = (cx + math.cos(a) * L, cy + math.sin(a) * L)
            left = (cx + math.cos(a - math.pi / 2) * wv, cy + math.sin(a - math.pi / 2) * wv)
            right = (cx + math.cos(a + math.pi / 2) * wv, cy + math.sin(a + math.pi / 2) * wv)
            dr.polygon([tip, left, (cx, cy)], fill=(acc if i == 0 else inkc) + (190,))
            dr.polygon([tip, right, (cx, cy)], fill=inkc + (70,), outline=inkc + (150,))
        f = font(CAPS, 20)
        dr.text((cx - f.getlength('N') / 2, cy - r - 28), 'N', font=f, fill=acc + (220,))

    def cartouche(self, dr, title, subtitle, inkc, acc):
        x, y, w, h = 30, 54, 300, 108
        dr.rectangle([x, y, x + w, y + h], outline=inkc + (150,), width=2)
        dr.rectangle([x + 5, y + 5, x + w - 5, y + h - 5], outline=inkc + (90,), width=1)
        ft = font(CAPS, 24 if len(title) < 18 else 19)
        dr.text((x + w / 2 - ft.getlength(title) / 2, y + 20), title, font=ft, fill=inkc + (215,))
        fs = font(ITALIC, 15)
        dr.text((x + w / 2 - fs.getlength(subtitle) / 2, y + 52), subtitle, font=fs, fill=inkc + (160,))
        # scale bar: a round number of km that is about 100 px
        km = self.k * 1000
        for step in (0.25, 0.5, 1, 2, 5, 10):
            if step * km >= 70:
                break
        L = step * km
        bx, by = x + w / 2 - L / 2, y + h - 22
        for i in range(4):
            seg = [bx + L * i / 4, by, bx + L * (i + 1) / 4, by + 5]
            dr.rectangle(seg, fill=inkc + (190,) if i % 2 == 0 else None, outline=inkc + (190,))
        fl = font(ITALIC, 12)
        lbl = f'{step:g} km'
        dr.text((bx + L + 6, by - 5), lbl, font=fl, fill=inkc + (170,))

    def age(self, sheet):
        """tea stains, foxing, and the folds of a map that has been in a pocket"""
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dr = ImageDraw.Draw(lay)
        brown = (110, 70, 30)
        for _ in range(2):
            cx, cy, r = random.uniform(80, W - 80), random.uniform(200, H - 200), random.uniform(50, 95)
            for k in range(3):
                rr = r - k * 1.5
                dr.ellipse([cx - rr, cy - rr * 0.94, cx + rr, cy + rr * 0.94], outline=brown + (26 - k * 6,), width=3)
        for _ in range(60):
            cx, cy, r = random.uniform(0, W), random.uniform(0, H), random.uniform(1, 3.5)
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=brown + (random.randint(14, 34),))
        for X in (W / 2,):
            dr.line([(X, 0), (X, H)], fill=(255, 245, 225, 40), width=2)
            dr.line([(X + 2, 0), (X + 2, H)], fill=(60, 35, 10, 30), width=1)
        for Y in (H / 3, 2 * H / 3):
            dr.line([(0, Y), (W, Y)], fill=(255, 245, 225, 36), width=2)
            dr.line([(0, Y + 2), (W, Y + 2)], fill=(60, 35, 10, 26), width=1)
        return Image.alpha_composite(sheet, lay.filter(ImageFilter.GaussianBlur(1.2)))


def save(img, key):
    os.makedirs(OUT, exist_ok=True)
    path = f'{OUT}/{key}.webp'
    img.save(path, 'WEBP', quality=70, method=6)
    return os.path.getsize(path)


def main(only):
    jobs = []
    x0, y0, x1, y1 = bbox(AREAS)
    jobs.append(('sg', lambda: Sheet((x0 + x1) / 2 - 1200, (y0 + y1) / 2, (x1 - x0) * 1.08, PALETTES['chart'], 1).render(
        island=True, title='SINGAPORE', subtitle='The island and its five regions', grid=0.05)))
    for rid, name in REGIONS.items():
        ra = [a for a in AREAS if a['region'] == rid]
        bx0, by0, bx1, by1 = bbox(ra)
        width = max((bx1 - bx0) * 1.18, (by1 - by0) * 1.18 * W / H, 9000)
        jobs.append((f'region-{rid}', lambda rid=rid, name=name, b=(bx0, by0, bx1, by1), width=width: Sheet(
            (b[0] + b[2]) / 2, (b[1] + b[3]) / 2, width, PALETTES[rid], sum(map(ord, rid))).render(
            region=rid, title=f'{name.upper()} REGION', subtitle=f'{len([a for a in AREAS if a["region"] == rid])} planning areas', grid=0.02)))
    for a in AREAS:
        bx0, by0, bx1, by1 = a['box']
        width = max((bx1 - bx0) * 1.55, (by1 - by0) * 1.55 * W / H * 0.75, 3600)
        jobs.append((f'area-{a["id"]}', lambda a=a, width=width: Sheet(
            a['centre'][0], a['centre'][1], width, PALETTES[a['region']], sum(map(ord, a['id']))).render(
            focus=a, title=a['name'].upper(), subtitle=f'{REGIONS[a["region"]]} region · planning area', grid=0.01, minor=True)))
    total = 0
    for key, job in jobs:
        if only and key not in only:
            continue
        size = save(job(), key)
        total += size
        print(f'{key}: {size // 1024} KB', flush=True)
    print('total', total // 1024, 'KB')


if __name__ == '__main__':
    main(set(sys.argv[1:]))
