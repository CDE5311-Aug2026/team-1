"""One place photo from Wikimedia Commons, high resolution, openly licensed only.

    python -I scripts/explore/commons-photo.py preview "File:Some photo.jpg" OUT.jpg      # a 480 px look (to check it)
    python -I scripts/explore/commons-photo.py save <place-id> "File:Some photo.jpg"       # 1280 px WebP + credit
    python -I scripts/explore/commons-photo.py merge                                       # staged credits -> photos.json

`save` checks the file's licence (CC0, public domain, CC BY, CC BY-SA only; never fair use), downloads Commons' own
1280 px rendering (or the original when it is smaller, at least 960 px wide), writes
public/nearby/photos/<slug>.webp (quality 82) and its credit to scripts/explore/photo-staging/<slug>.json. Parallel
runs never share a file. `merge` moves the staged credits into src/data/explore/photos.json (replacing an older entry
and its .jpg) and takes the place off the `missing` list.
"""
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/nearby/photos'
STAGE = ROOT / 'scripts/explore/photo-staging'
MANIFEST = ROOT / 'src/data/explore/photos.json'
UA = 'IntentAI-student-prototype/1.0 (https://github.com/sy-hong/FindSG; NUS CDE5311 place photos)'
WIDTH = 1280
MIN_WIDTH = 960
FREE = re.compile(r'^(CC0( 1\.0)?|Public domain|PD.*|CC BY(-SA)?( [0-9.]+)?( [A-Za-z-]+)?)$', re.I)


def get(url: str, tries: int = 4) -> bytes:
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception:  # noqa: BLE001 (retry any network error, then give up)
            if i == tries - 1:
                raise
            time.sleep(3 * (i + 1))
    raise RuntimeError('unreachable')


def strip(html: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()


def info(title: str, width: int) -> dict:
    if not title.startswith('File:'):
        title = 'File:' + title
    q = urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'formatversion': '2', 'prop': 'imageinfo', 'titles': title,
        'iiprop': 'url|extmetadata|mime|size', 'iiurlwidth': str(width),
    })
    page = json.loads(get(f'https://commons.wikimedia.org/w/api.php?{q}'))['query']['pages'][0]
    if page.get('missing') or 'imageinfo' not in page:
        sys.exit(f'not on Commons: {title}')
    ii = page['imageinfo'][0]
    meta = ii.get('extmetadata', {})
    lic = strip(meta.get('LicenseShortName', {}).get('value', ''))
    return {
        'title': page['title'], 'mime': ii['mime'], 'width': ii['width'], 'height': ii['height'],
        'thumb': ii.get('thumburl') or ii['url'], 'original': ii['url'], 'page': ii['descriptionurl'],
        'license': lic, 'licenseUrl': meta.get('LicenseUrl', {}).get('value', ''),
        'author': strip(meta.get('Artist', {}).get('value', '')) or 'Wikimedia Commons contributor',
        'restrictions': strip(meta.get('Restrictions', {}).get('value', '')),
    }


def check(i: dict) -> None:
    if not re.match(r'^image/(jpeg|png|webp|tiff)$', i['mime']):
        sys.exit(f"not a photo ({i['mime']})")
    if not FREE.match(i['license']):
        sys.exit(f"licence not allowed: {i['license']!r}")
    if i['width'] < MIN_WIDTH:
        sys.exit(f"too small: {i['width']} px wide (need {MIN_WIDTH})")


def preview(title: str, out: str) -> None:
    i = info(title, 480)
    Image.open(io.BytesIO(get(i['thumb']))).convert('RGB').save(out, 'JPEG', quality=80)
    print(json.dumps({k: i[k] for k in ('title', 'width', 'height', 'license', 'author', 'page')}, ensure_ascii=False))


def save(place_id: str, title: str) -> None:
    i = info(title, WIDTH)
    check(i)
    slug = place_id.removeprefix('curated:')
    img = Image.open(io.BytesIO(get(i['thumb'] if i['width'] > WIDTH else i['original'])))
    img = img.convert('RGB')
    if img.width > WIDTH:
        img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f'{slug}.webp', 'WEBP', quality=82, method=6)
    STAGE.mkdir(parents=True, exist_ok=True)
    entry = {
        'file': f'{slug}.webp',
        'credit': f"{i['author']} · {i['license']}",
        'source': i['page'],
        'license': i['license'],
        'licenseUrl': i['licenseUrl'],
        'width': img.width,
        'height': img.height,
    }
    (STAGE / f'{slug}.json').write_text(json.dumps({'id': place_id, **entry}, ensure_ascii=False, indent=1), encoding='utf-8')
    kb = (OUT / f'{slug}.webp').stat().st_size // 1024
    print(f"saved {slug}.webp {img.width}x{img.height} {kb} KB · {entry['credit']}")


def merge() -> None:
    m = json.loads(MANIFEST.read_text(encoding='utf-8'))
    n = 0
    for f in sorted(STAGE.glob('*.json')):
        e = json.loads(f.read_text(encoding='utf-8'))
        pid = e.pop('id')
        old = m['photos'].get(pid)
        if old and old.get('article'):
            e['article'] = old['article']
        if old and old['file'] != e['file']:
            (OUT / old['file']).unlink(missing_ok=True)
        m['photos'][pid] = e
        if pid in m.get('missing', []):
            m['missing'].remove(pid)
        f.unlink()
        n += 1
    m['photos'] = dict(sorted(m['photos'].items()))
    m['checkedAt'] = time.strftime('%Y-%m-%d')
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'merged {n} · {len(m["photos"])} places with photos')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'preview' and len(sys.argv) == 4:
        preview(sys.argv[2], sys.argv[3])
    elif cmd == 'save' and len(sys.argv) == 4:
        save(sys.argv[2], sys.argv[3])
    elif cmd == 'merge':
        merge()
    else:
        sys.exit(__doc__)
