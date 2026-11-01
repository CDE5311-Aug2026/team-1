"""Renders FindSG's logo with depth from the flat brand mark (public/findsg/brand/findsg-merlion-search.webp):
a bevelled, lit relief with a soft cast shadow. Writes the orange logo, a black one for Home, and the app icons.
    python3 scripts/brand/render-logo.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
P = lambda *p: os.path.join(ROOT, *p)

src = Image.open(P('public/findsg/brand/findsg-merlion-search.webp')).convert('RGBA').split()[3]
m = src.point(lambda v: 255 if v > 140 else 0).filter(ImageFilter.MedianFilter(5))
m = m.crop(m.getbbox())
side = max(m.size)
N = 1024
pad = int(N * 0.07)
inner = N - 2 * pad
m = m.resize((round(m.size[0] * inner / side), round(m.size[1] * inner / side)), Image.LANCZOS)
mask = Image.new('L', (N, N), 0)
mask.paste(m, ((N - m.size[0]) // 2, (N - m.size[1]) // 2))
mask = mask.filter(ImageFilter.GaussianBlur(1.5))
A = np.asarray(mask, dtype=np.float32) / 255.0

# a height field: rounded near the edges (the bevel), flat on top
H = np.asarray(mask.filter(ImageFilter.GaussianBlur(9)), dtype=np.float32) / 255.0
H = np.clip(H * 1.25, 0, 1) ** 0.8
gy, gx = np.gradient(H * 14.0)
n = np.dstack([-gx, -gy, np.ones_like(H)])
n /= np.linalg.norm(n, axis=2, keepdims=True)
L = np.array([-0.55, -0.65, 0.52]); L /= np.linalg.norm(L)
diff = np.clip((n * L).sum(2), 0, 1)
Hv = L + np.array([0, 0, 1.0]); Hv /= np.linalg.norm(Hv)
spec = np.clip((n * Hv).sum(2), 0, 1) ** 40

yy, xx = np.mgrid[0:N, 0:N] / N
def render(top, bottom, ambient, spec_k, rim):
    t = np.clip(0.15 + 0.85 * (0.6 * yy + 0.4 * xx), 0, 1)[..., None]
    base = np.array(top) * (1 - t) + np.array(bottom) * t
    shade = (ambient + (1 - ambient) * diff)[..., None]
    col = base * shade + spec[..., None] * spec_k * 255
    # a thin dark rim where the bevel meets the ground
    edge = np.clip(1 - H * 3.2, 0, 1)[..., None] * A[..., None]
    col = col * (1 - edge * rim)
    out = np.dstack([np.clip(col, 0, 255), A[..., None] * 255]).astype(np.uint8)
    return Image.fromarray(out)

def with_shadow(face, strength):
    sh = mask.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * strength))
    canvas = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    canvas.paste(Image.new('RGBA', (N, N), (40, 20, 5, 255)), (10, 16), sh)
    canvas.alpha_composite(face)
    return canvas

orange = with_shadow(render((255, 196, 120), (238, 116, 40), 0.7, 0.5, 0.3), 0.36)
black = with_shadow(render((92, 92, 96), (14, 14, 16), 0.45, 0.42, 0.25), 0.3)
os.makedirs(P('src/assets/brand'), exist_ok=True)
orange.resize((512, 512), Image.LANCZOS).save(P('src/assets/brand/findsg-logo.png'), optimize=True)
black.resize((512, 512), Image.LANCZOS).save(P('src/assets/brand/findsg-logo-black.png'), optimize=True)

def tile(size):
    t = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=(251, 243, 232, 255))
    k = int(size * 0.8)
    t.alpha_composite(orange.resize((k, k), Image.LANCZOS), ((size - k) // 2, (size - k) // 2))
    return t
tile(180).save(P('public/apple-touch-icon.png'), optimize=True)
tile(64).save(P('public/favicon.png'), optimize=True)
tile(512).save(P('public/findsg-icon-512.png'), optimize=True)
print('ok')
