#!/usr/bin/env python3
"""Scale the map shot from map-preview.mjs to the Today card (1050 × 480 px, 3× of 350 × 160) as WebP.
usage: resize.py <raw.png> <out.webp>"""
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
Image.open(src).convert('RGB').resize((1050, 480), Image.LANCZOS).save(out, 'WEBP', quality=82, method=6)
print('wrote', out)
