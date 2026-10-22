#!/usr/bin/env python3
"""Nearby's 2D ground image with only Singapore on it: Singapore's land (land-cover codes 0 land, 3 forest, 4 beach) and
its reservoirs / rivers (code 2 inside a planning area) keep the baked picture; everything else (Johor, the Riau
islands, their rivers, the shallow-water shading off their coasts) becomes plain sea. usage: sg-only-ground.py <earth_online sgdata/sg_base.txt> <ground.webp> <out.webp>
The land-cover raster is the EARTH ONLINE dataset's own (25 m cells, 2240 x 2240, the same 56 km square as the image)."""
import base64, gzip, json, sys
import numpy as np
from PIL import Image, ImageFilter

base_txt, ground, out = sys.argv[1:4]
raw = base64.b64decode(open(base_txt).read().strip())
try:
    raw = gzip.decompress(raw)
except OSError:
    pass
B = json.loads(raw)
N = B['N']
def rle(key):
    s = base64.b64decode(B[key])
    out = np.zeros(N * N, np.uint8)
    o = 0
    for i in range(0, len(s) - 3, 4):
        v = s[i] | (s[i + 1] << 8)
        c = s[i + 2] | (s[i + 3] << 8)
        if v:
            out[o:min(N * N, o + c)] = v
        o += c
    return out.reshape(N, N)[::-1]          # rows: north at the top, like the image
codes, pa = rle('codes'), rle('pa')
keep = np.isin(codes, (0, 3, 4)) | ((codes == 2) & (pa > 0))
img = Image.open(ground).convert('RGB')
W = img.size[0]
a = np.asarray(img).astype(np.float32)
sea = np.median(a[np.asarray(Image.fromarray((codes == 1).astype(np.uint8) * 255).resize((W, W), Image.NEAREST)) > 0], axis=0)
# a soft 2-3 px coast so the edge is not stair-stepped
k = Image.fromarray(keep.astype(np.uint8) * 255).resize((W, W), Image.NEAREST).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.5))
m = (np.asarray(k).astype(np.float32) / 255.0)[..., None]
a = a * m + sea * (1 - m)
Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(out, 'WEBP', quality=82, method=6)
print('sea colour', sea.round().astype(int).tolist(), 'Singapore cells', int(keep.sum()))
