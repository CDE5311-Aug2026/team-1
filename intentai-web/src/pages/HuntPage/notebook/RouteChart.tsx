// The map above the story shelf, on OneMap's own tiles. It opens on every story at once: where each one starts, where you
// are, and which story is nearest (ringed, with the distance and the walk). Tap any story to pull its book forward and
// see its route inked on stop by stop, with directions to the next stop; "All stories" goes back to the overview.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { distanceM } from '../../../features/nearby/geo';
import { requestLocation, useLocationState } from '../../../features/nearby/location';
import { OneMapCredit } from '../../../features/nearby/map/CityMap';
import type { BookDef, BookId } from './Bookshelf';
import { SHORT_PINS, type Chapter } from './chapters';
import styles from './routeChart.module.css';

/** The map's window, in its own units (the frame keeps this shape). */
const VW = 340,
  VH = 214;
const TILE = 256;
const tileUrl = (z: number, x: number, y: number) => `https://www.onemap.gov.sg/maps/tiles/Default_HD/${z}/${x}/${y}.png`;

interface Pin {
  lat: number;
  lng: number;
  done: boolean;
}

/** Web Mercator pixels at zoom z. */
function merc(lat: number, lng: number, z: number) {
  const n = TILE * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return { x: (n * (lng + 180)) / 360, y: n * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) };
}

/** The view that fits these pins: a tile zoom, a scale for the rest, and where the window starts. */
function frame(pins: { lat: number; lng: number }[], minZ = 14, maxZ = 16.3, pad = 28) {
  const P = pins.map((p) => merc(p.lat, p.lng, 16));
  const xs = P.map((p) => p.x),
    ys = P.map((p) => p.y);
  // keep every stop at least 28 units inside the window (and clear of the compass)
  const w = Math.max(1, Math.max(...xs) - Math.min(...xs)),
    h = Math.max(1, Math.max(...ys) - Math.min(...ys));
  const zf = Math.max(minZ, Math.min(maxZ, 16 + Math.log2(Math.min((VW - pad * 2) / w, (VH - pad * 2) / h))));
  const z = Math.floor(zf),
    k = 2 ** (zf - z),
    m = 2 ** (z - 16);
  const cx = ((Math.max(...xs) + Math.min(...xs)) / 2) * m,
    cy = ((Math.max(...ys) + Math.min(...ys)) / 2) * m;
  const x0 = cx - VW / 2 / k,
    y0 = cy - VH / 2 / k;
  const at = (lat: number, lng: number) => {
    const q = merc(lat, lng, z);
    return { x: (q.x - x0) * k, y: (q.y - y0) * k };
  };
  // tiles from one zoom deeper, drawn at half size: street names at a reading size, not poster size
  const zt = z + 1,
    kt = k / 2,
    xt = x0 * 2,
    yt = y0 * 2;
  const tiles: { x: number; y: number; left: number; top: number; size: number }[] = [];
  for (let tx = Math.floor(xt / TILE); tx <= Math.floor((xt + VW / kt) / TILE); tx++)
    for (let ty = Math.floor(yt / TILE); ty <= Math.floor((yt + VH / kt) / TILE); ty++)
      tiles.push({ x: tx, y: ty, left: (tx * TILE - xt) * kt, top: (ty * TILE - yt) * kt, size: TILE * kt });
  return { z: zt, at, tiles };
}

/** Walking, honestly: straight line × 1.3 for streets, 80 m a minute. */
const walkMin = (m: number) => Math.max(1, Math.ceil((m * 1.3) / 80));
const dist = (m: number) => (m < 1000 ? `${Math.max(50, Math.round(m / 50) * 50)} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`);
/** Farther than this and you are not in town: no "nearest", just the stories. */
const IN_TOWN_M = 25_000;
const PICKED_KEY = 'hunt-nearest-picked';
/** The prologue's search ring: 300 m, about a 5-minute walk by the rule above. */
const AREA_M = 300;

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

export function RouteChart({
  books,
  chapters,
  short,
  selected,
  onPick,
}: {
  books: BookDef[];
  chapters: Chapter[];
  short: { deduce: boolean; bottle: boolean };
  selected: BookId;
  onPick(id: BookId): void;
}) {
  const routes = useMemo(() => {
    const r = {} as Record<BookId, Pin[]>;
    const one = (p: { lat: number; lng: number } | undefined, done: boolean) => (p ? [{ lat: p.lat, lng: p.lng, done }] : []);
    // the second building stays off the chart until its clue is worked out
    r.short = [...one(SHORT_PINS.press, short.deduce), ...(short.deduce ? one(SHORT_PINS.mosque, short.bottle) : [])];
    for (const c of chapters) r[c.routeId as BookId] = c.stops.filter((s) => s.pin).map((s) => ({ lat: s.pin!.lat, lng: s.pin!.lng, done: s.done }));
    return r;
  }, [chapters, short]);

  const loc = useLocationState();
  const me = loc.status === 'active' ? loc.fix : undefined;
  const [mode, setMode] = useState<'all' | 'route'>('all');

  // where each story starts for you: its first stop not yet found (or its first stop, to walk it again)
  const starts = useMemo(
    () =>
      books
        .filter((b) => routes[b.id]?.length)
        .map((b) => {
          const r = routes[b.id];
          const n = Math.max(
            0,
            r.findIndex((p) => !p.done),
          );
          const m = me ? distanceM(me, r[n]) : undefined;
          return { b, n, lat: r[n].lat, lng: r[n].lng, m, finished: r.every((p) => p.done) };
        }),
    [books, routes, me],
  );
  const nearest = me ? [...starts].filter((s) => (s.m ?? Infinity) < IN_TOWN_M).sort((a, b) => a.m! - b.m!)[0] : undefined;
  const farAway = !!me && !nearest;

  // the first time we know where you are, the nearest story's book comes forward (once a visit)
  useEffect(() => {
    if (!nearest || sessionStorage.getItem(PICKED_KEY)) return;
    sessionStorage.setItem(PICKED_KEY, '1');
    if (nearest.b.id !== selected) onPick(nearest.b.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearest?.b.id]);

  // already allowed on this phone: find you without asking for a tap
  useEffect(() => {
    if (loc.status !== 'manual') return;
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') void requestLocation();
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (id: BookId) => {
    if (id !== selected) onPick(id);
    setMode('route');
  };
  const locate = () => void requestLocation();

  const pins = routes[selected] ?? [];
  // the prologue gives only its start: a ring round it marks how far to look (about a 5-minute walk)
  const searchArea = selected === 'short' && !short.deduce && pins.length ? { ...pins[0], m: AREA_M } : null;
  const overviewPts = useMemo(
    () => [...starts, ...(me && nearest && nearest.m! < 6000 ? [me] : [])],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [starts.map((s) => `${s.lat},${s.lng}`).join('|'), me?.lat, me?.lng, nearest?.b.id],
  );
  const view = useMemo(() => {
    if (mode === 'all') return overviewPts.length ? frame(overviewPts, 11, 15.5, 40) : null;
    if (searchArea) {
      const d = (searchArea.m * 1.15) / 111_320;
      return frame([
        { lat: searchArea.lat + d, lng: searchArea.lng + d },
        { lat: searchArea.lat - d, lng: searchArea.lng - d },
      ]);
    }
    return pins.length ? frame(pins) : null;
  }, [mode, overviewPts, pins, searchArea?.lat, searchArea?.lng]);
  const book = books.find((b) => b.id === selected)!;
  const areaOf = (id: BookId) => books.find((b) => b.id === id)?.place ?? '';
  if (!view) return null;

  const youAt = me ? view.at(me.lat, me.lng) : null;
  const youIn = youAt && youAt.x > -4 && youAt.x < VW + 4 && youAt.y > -4 && youAt.y < VH + 4;
  const you = youAt && youIn && (
    <g transform={`translate(${youAt.x},${youAt.y})`} className={styles.you} aria-hidden="true">
      <circle r="11" className={styles.youHalo} />
      <circle r="4.6" />
    </g>
  );

  if (mode === 'all') {
    // stories that start in the same streets (two books start in Kampong Gelam) stand side by side under one label
    const dots = starts.map((s) => ({ ...s, ...view.at(s.lat, s.lng), label: true, side: 0 as -1 | 0 | 1 }));
    for (let i = 0; i < dots.length; i++)
      for (let j = 0; j < i; j++)
        if (Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y) < 24) {
          const mx = (dots[i].x + dots[j].x) / 2,
            my = (dots[i].y + dots[j].y) / 2;
          const [a, b] = dots[i].x >= dots[j].x ? [dots[j], dots[i]] : [dots[i], dots[j]];
          a.x = mx - 12;
          b.x = mx + 12;
          a.y = b.y = my;
          a.side = -1;
          b.side = 1;
          // one label for the pair, on the side with more room
          const sameArea = a.b.place === b.b.place;
          if (sameArea) (mx > VW / 2 ? b : a).label = false;
        }
    const near = nearest && dots.find((d) => d.b.id === nearest.b.id);
    return (
      <figure className={styles.chart} aria-label={`Map of all ${dots.length} stories${nearest ? `; nearest is ${nearest.b.title}, ${dist(nearest.m!)}` : ''}`}>
        <div className={styles.window}>
          <div className={styles.tiles} key="all" aria-hidden="true">
            {view.tiles.map((t) => (
              <img
                key={`${view.z}/${t.x}/${t.y}`}
                src={tileUrl(view.z, t.x, t.y)}
                alt=""
                draggable={false}
                style={{ left: pct(t.left, VW), top: pct(t.top, VH), width: pct(t.size + 0.5, VW), height: pct(t.size + 0.5, VH) }}
              />
            ))}
          </div>
          <svg viewBox={`0 0 ${VW} ${VH}`} className={styles.svg}>
            {near && youIn && youAt && <path className={styles.toNear} d={`M${youAt.x},${youAt.y} L${near.x},${near.y}`} pathLength={1} />}
            {dots.map((d, i) => {
              const isNear = near?.b.id === d.b.id;
              // a paired pin's label goes on its outer side; a lone pin's on whichever side has room
              const left = d.side ? d.side < 0 : d.x > VW - 90;
              const place = d.finished ? `${d.b.place} ✓` : d.b.place;
              const sub = d.m != null && !farAway ? `${dist(d.m)} · ${walkMin(d.m)} min` : '';
              // a paper label stuck on the chart, so the street map's own names never run into ours
              const w = Math.max(place.length * 4.9, sub.length * 3.9) + 10;
              const h = sub ? 24 : 15;
              return (
                <g key={d.b.id} transform={`translate(${d.x},${d.y})`}>
                  <g
                    className={`${styles.story} ${d.b.id === selected ? styles.sel : ''} ${isNear ? styles.near : ''}`}
                    style={{ '--i': i, '--tone': d.b.tone } as CSSProperties}
                    onClick={() => choose(d.b.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${d.b.title}, ${d.b.place}${d.m != null ? `, ${dist(d.m)}` : ''}${isNear ? ', nearest' : ''}`}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && choose(d.b.id)}
                  >
                    <circle r="16" className={styles.hit} />
                    {isNear && <circle r="15" className={styles.ring} />}
                    {d.label && (
                      <g transform={`translate(${left ? -14 - w : 14},${-h / 2})`} className={styles.tag}>
                        <rect width={w} height={h} rx="1.5" className={styles.tagPaper} />
                        <text x={w / 2} y="10.6" textAnchor="middle" className={styles.tagPlace}>
                          {place}
                        </text>
                        {sub && (
                          <text x={w / 2} y="20" textAnchor="middle" className={styles.tagDist}>
                            {sub}
                          </text>
                        )}
                      </g>
                    )}
                    <circle r="10.5" className={styles.disc} />
                    <text y="3.4" className={styles.num}>
                      {d.b.roman}
                    </text>
                  </g>
                </g>
              );
            })}
            {you}
            <g transform={`translate(${VW - 24},26)`} className={styles.rose} aria-hidden="true">
              <circle r="12" />
              <path d="M0,-16 L3.2,0 L0,16 L-3.2,0 Z" />
              <path d="M0,-16 L3.2,0 L-3.2,0 Z" className={styles.north} />
            </g>
          </svg>
          <OneMapCredit className={styles.credit} />
        </div>
        <figcaption className={styles.caption} key={`all-${nearest?.b.id ?? 'none'}`}>
          {nearest ? (
            <>
              <b>Nearest</b>
              <span>
                {nearest.b.place} · {dist(nearest.m!)}
              </span>
              <button type="button" className={styles.go} onClick={() => choose(nearest.b.id)}>
                Show route
              </button>
            </>
          ) : (
            <>
              <b>All stories</b>
              {(farAway || loc.status === 'denied') && <span>{farAway ? 'You are outside Singapore. Pick any story.' : 'Location is off. Tap a story.'}</span>}
              {me || loc.status === 'denied' ? (
                <button type="button" className={styles.go} onClick={() => choose(selected)}>
                  Vol. {book.roman} route
                </button>
              ) : (
                <button type="button" className={styles.go} onClick={locate} disabled={loc.status === 'requesting'}>
                  {loc.status === 'requesting' ? 'Finding you…' : '◎ Nearest to me'}
                </button>
              )}
            </>
          )}
        </figcaption>
      </figure>
    );
  }

  const stops = pins.map((p) => ({ ...view.at(p.lat, p.lng), done: p.done }));
  const nextN = Math.max(
    0,
    pins.findIndex((p) => !p.done),
  );
  const next = pins[nextN];
  const nextM = me && next ? distanceM(me, next) : undefined;
  const path = stops.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const ring = searchArea && { ...view.at(searchArea.lat, searchArea.lng), r: view.at(searchArea.lat, searchArea.lng).y - view.at(searchArea.lat + searchArea.m / 111_320, searchArea.lng).y };
  const others = books
    .filter((b) => b.id !== selected && routes[b.id]?.length)
    .map((b) => {
      const r = routes[b.id];
      const c = view.at(r.reduce((a, p) => a + p.lat, 0) / r.length, r.reduce((a, p) => a + p.lng, 0) / r.length);
      return { b, ...c };
    })
    .filter((o) => o.x > 8 && o.x < VW - 8 && o.y > 8 && o.y < VH - 8)
    // a cross on top of this route would only clutter it
    .filter((o) => stops.every((p) => Math.hypot(p.x - o.x, p.y - o.y) > 44));

  return (
    <figure className={styles.chart} aria-label={`Map: ${book.title}, ${stops.length} stops`}>
      <div className={styles.window}>
        {/* the streets; a new book's streets come in over the last */}
        <div className={styles.tiles} key={selected} aria-hidden="true">
          {view.tiles.map((t) => (
            <img
              key={`${view.z}/${t.x}/${t.y}`}
              src={tileUrl(view.z, t.x, t.y)}
              alt=""
              draggable={false}
              style={{ left: pct(t.left, VW), top: pct(t.top, VH), width: pct(t.size + 0.5, VW), height: pct(t.size + 0.5, VH) }}
            />
          ))}
        </div>

        <svg viewBox={`0 0 ${VW} ${VH}`} className={styles.svg}>
          {others.map((o) => (
            <g key={o.b.id} className={styles.other} transform={`translate(${o.x},${o.y})`} onClick={() => onPick(o.b.id)} aria-hidden="true">
              <circle r="14" fill="transparent" />
              <path d="M-4,-4 L4,4 M4,-4 L-4,4" />
              <text x="8" y="3">
                {o.b.roman} · {areaOf(o.b.id)}
              </text>
            </g>
          ))}
          {ring && (
            <g className={styles.area} aria-hidden="true">
              <circle cx={ring.x} cy={ring.y} r={ring.r} />
              <text x={ring.x} y={ring.y - ring.r - 6}>
                The rest is in here
              </text>
            </g>
          )}
          <g key={selected} className={styles.route}>
            <path d={path} className={styles.trail} pathLength={1} />
            <path d={path} className={styles.dash} />
            {stops.map((p, i) => (
              <g key={i} transform={`translate(${p.x},${p.y})`}>
                <g className={`${styles.stop} ${p.done ? styles.done : ''} ${i === nextN ? styles.next : ''}`} style={{ '--i': i } as CSSProperties}>
                  <circle r="7" />
                  <text y="3">{i + 1}</text>
                </g>
              </g>
            ))}
          </g>
          {you}
          <g transform={`translate(${VW - 24},26)`} className={styles.rose} aria-hidden="true">
            <circle r="12" />
            <path d="M0,-16 L3.2,0 L0,16 L-3.2,0 Z" />
            <path d="M0,-16 L3.2,0 L-3.2,0 Z" className={styles.north} />
          </g>
        </svg>
        <OneMapCredit className={styles.credit} />
      </div>
      <figcaption className={styles.caption} key={selected}>
        <button type="button" className={styles.back} onClick={() => setMode('all')} aria-label="Back to all stories">
          ‹ All
        </button>
        <b>Vol. {book.roman}</b>
        <span>
          {nextM != null && nextM < IN_TOWN_M ? `${dist(nextM)} · ${walkMin(nextM)} min` : ring ? `${book.place} · start only` : `${book.place} · ${stops.length} stops`}
        </span>
        {next && (
          <a
            className={styles.go}
            href={`https://www.google.com/maps/dir/?api=1&destination=${next.lat},${next.lng}&travelmode=walking`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Stop {nextN + 1} ↗︎
          </a>
        )}
      </figcaption>
    </figure>
  );
}
