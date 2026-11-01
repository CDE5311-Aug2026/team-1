// Home, Discovery redesign (owner brief and sketch, 31 Oct 2026). Top to bottom: the header, the Festival / Event
// card, the map card (a Three.js scene of URA's planning areas: regions numbered 1–5, then the region's planning areas,
// then the area's places), and "Recommended": a Cover Flow deck (Three.js) that goes region → planning area → place.
// Map and deck follow each other. Grey = not unlocked, blue = every place checked in. The level and selection live in
// the URL (?lvl=&r=&a=&p=), so Back from a place page returns to the same card. The toolbar's Picks key switches the
// deck to Editor's Pick (?lvl=picks&k=): walks and lists, then a pick's stops (?lvl=pick), the map flying across the
// island with them; a walk also opens as a 2D route (&route=1) with a button that starts Google Maps.
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import homeLogo from '../../assets/home/logo.png';
import { todaysHoliday } from '../../data/holiday';
import { ALL_HOME_PLACES, type HomePlace } from '../../data/homePlaces';
import { formatMinutes } from '../../data/pickFormat';
import type { EditorPick } from '../../data/picks';
import {
  URA_AREAS,
  URA_REGIONS,
  URA_SOURCE,
  areaAt,
  areaOfPlace,
  areaProgress,
  areasOf,
  categoryLine,
  placesInRegion,
  unlockedAreas,
  placesInArea,
  regionProgress,
  uraArea,
  uraRegion,
  visitedSet,
  type RegionId,
  type UnlockProgress,
} from '../../data/ura/ura';
import { useExplorePersonal } from '../../features/nearby/actions';
import { curatedPlace } from '../../features/nearby/catalogue';
import { distanceM } from '../../features/nearby/geo';
import { localToday } from '../../features/nearby/personal';
import { toXY } from '../../features/nearby/map/projection';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import HomeHeader from '../HomeHeader/HomeHeader';
import { PlaceCarousel } from '../PlaceCarousel/PlaceCarousel';
import type { CoverItem } from './CoverFlow3D';
import { LevelDeck, progressLine, type LevelCard } from './LevelDeck';
// Three.js loads with these two, after the rest of Home has drawn.
// The map card (owner, 31 Oct): regions and planning areas on a light Three.js map over EARTH ONLINE's ground picture
// (fast, no 18 MB download, the camera flies to each card); a planning area's places in the full EARTH ONLINE 3D city.
const MapOverview = lazy(() => import('./MapCard3D').then((m) => ({ default: m.MapCard3D })));
const MapDetail = lazy(() => import('./MapCardEarth').then((m) => ({ default: m.MapCardEarth })));
function MapCard3D({ sky, ...props }: Parameters<typeof MapOverview>[0] & { sky?: View3DSky }) {
  return props.level === 'places' ? <MapDetail {...props} sky={sky} /> : <MapOverview {...props} />;
}
// Loaded after Home first paints (phones on slow networks): the Editor's Pick decks need the whole Culture Atlas, and
// a place's notebook needs its story cards. Both start loading once Home is up, so a tap rarely waits.
let picksModule: typeof import('../../data/picks') | undefined;
const loadPicks = () => import('../../data/picks').then((m) => (picksModule = m));
registerPreload(loadPicks);
type IntroProps = Parameters<typeof import('./PlaceIntro').PlaceIntro>[0];
const PlaceIntro = lazyPage<IntroProps>(() => import('./PlaceIntro').then((m) => ({ default: m.PlaceIntro })));
const loadIntro = () => import('./PlaceIntro');
const NO_PICKS: EditorPick[] = [];
/** Run `fn` once the pictures on screen are in (or after 6 s) and the phone is idle; returns a cancel. On a slow phone
 *  network the window's load event comes before Home has even asked for its pictures, so it is not enough to wait for. */
function afterLoad(fn: () => void): () => void {
  let done = false;
  let idle = 0;
  const timers: number[] = [];
  const run = () => {
    if (done) return;
    done = true;
    if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(fn, { timeout: 2000 });
    else fn();
  };
  // let React put the first screen's pictures in the page, then wait for those still loading
  timers.push(
    window.setTimeout(() => {
      const pending = [...document.images].filter((im) => !im.complete && im.loading !== 'lazy');
      let left = pending.length;
      if (!left) return run();
      for (const im of pending) {
        const one = () => --left <= 0 && run();
        im.addEventListener('load', one, { once: true });
        im.addEventListener('error', one, { once: true });
      }
    }, 400),
    window.setTimeout(run, 6000),
  );
  return () => {
    done = true;
    timers.forEach((t) => window.clearTimeout(t));
    if (idle) window.cancelIdleCallback?.(idle);
  };
}
const CoverFlow3DLazy = lazy(() => import('./CoverFlow3D').then((m) => ({ default: m.CoverFlow3D })));
const IS_JSDOM = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
/** WebGL here? Without it (old devices, unit tests) the plain decks show and Three.js is never downloaded. */
const HAS_WEBGL = (() => {
  if (IS_JSDOM || typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
})();
function CoverFlow3D(props: Parameters<typeof CoverFlow3DLazy>[0]) {
  if (!HAS_WEBGL) return <>{props.fallback}</>;
  return (
    <Suspense fallback={props.fallback}>
      <CoverFlow3DLazy {...props} />
    </Suspense>
  );
}

/** Card band colours by unlock status (as on the map). */
const SHAPE_COLOR = {
  none: '#c9c2b4',
  exploring: '#8fb5f0',
  done: '#2f6fe4',
} as const;
import { MapToolbar } from './MapToolbar';
import { PickRoute } from './PickRoute';
import { backdropSrc } from './backdrop';
import { ONEMAP_CREDIT } from './mapCredit';
import { lazyPage, registerPreload } from '../../pages/lazyPage';
import { SkyControls } from './SkyControls';
import type { View3DSky } from '../../features/nearby/components/View3D';
import styles from './DiscoveryHome.module.css';

type Level = 'regions' | 'areas' | 'places' | 'picks' | 'pick';
const DEPTH: Record<Level, number> = { regions: 0, areas: 1, places: 2, picks: 1, pick: 2 };
const isPickLevel = (l: Level) => l === 'picks' || l === 'pick';

/** The last of these pictures to finish loading (the first one at once), so a background never fades in blank. */
function useLoadedImage(src: string) {
  const [shown, setShown] = useState(src);
  useEffect(() => {
    if (src === shown) return;
    let live = true;
    const img = new Image();
    img.onload = () => live && setShown(src);
    img.src = src;
    return () => {
      live = false;
    };
  }, [src, shown]);
  return shown;
}

/** Home base (NUS University Town) decides the first region and area shown. */
const BASE_AREA = URA_AREAS.find((a) => a.id === areaOfPlace('curated:sg-national-university-of-singapore')?.id);
const DEFAULT_REGION: RegionId = BASE_AREA?.region ?? 'central';

/** Areas, most places first; those with none yet go last. */
const sortedAreas = (region: RegionId) =>
  [...areasOf(region)].sort((a, b) => placesInArea(b.id).length - placesInArea(a.id).length || a.name.localeCompare(b.name));

const homePlacesIn = (areaId: string): HomePlace[] => ALL_HOME_PLACES.filter((p) => areaOfPlace(p.id)?.id === areaId);

const ratio = (p: UnlockProgress) => (p.total ? p.visited / p.total : 0);

const HOME_BY_ID = new Map(ALL_HOME_PLACES.map((p) => [p.id, p]));
const homeOf = (id: string): HomePlace | undefined => HOME_BY_ID.get(id);

function pickProgress(pick: EditorPick, visited: Set<string>): UnlockProgress {
  const n = pick.stops.filter((s) => visited.has(s.place.id)).length;
  return { visited: n, total: pick.stops.length, status: n === 0 ? 'none' : n === pick.stops.length ? 'done' : 'exploring' };
}
const pickKicker = (pick: EditorPick) =>
  pick.kind === 'walk' ? `Walk · ${pick.stops.length} stops${pick.minutes ? ` · ${formatMinutes(pick.minutes)}` : ''}` : `List · ${pick.stops.length} places`;

export default function DiscoveryHome() {
  const navigate = useNavigate();
  const reduce = useReducedMotionConfig();
  const [params, setParams] = useSearchParams();
  const personal = useExplorePersonal();
  const visited = useMemo(() => visitedSet(personal), [personal]);

  // ---- level and selection, from the URL ----
  const region = (uraRegion(params.get('r') ?? undefined)?.id ?? DEFAULT_REGION) as RegionId;
  const areaList = useMemo(() => sortedAreas(region), [region]);
  const areaParam = uraArea(params.get('a') ?? undefined);
  const area = areaParam?.region === region ? areaParam : (areaList.find((a) => a.id === BASE_AREA?.id) ?? areaList[0]);
  const placeList = useMemo(() => homePlacesIn(area.id), [area.id]);
  const [loadedPicks, setLoadedPicks] = useState<EditorPick[] | null>(() => picksModule?.editorPicks(localToday()) ?? null);
  useEffect(() => {
    let live = true;
    const fetchPicks = () => void loadPicks().then((m) => live && setLoadedPicks((had) => had ?? m.editorPicks(localToday())));
    // a link straight into the picks needs them now; otherwise they wait until the page's own pictures are in
    if (isPickLevel(params.get('lvl') as Level)) fetchPicks();
    const cancel = afterLoad(() => {
      fetchPicks();
      void loadIntro();
    });
    return () => {
      live = false;
      cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);
  // until they arrive, a ?lvl=picks link shows the regions; the URL is left alone, so the picks open when ready
  const picks = loadedPicks ?? NO_PICKS;
  const pick = picks.find((k) => k.id === params.get('k')) ?? picks[0];
  const lvlParam = params.get('lvl');
  const level: Level =
    lvlParam === 'areas' || (lvlParam === 'places' && placeList.length > 0) || ((lvlParam === 'picks' || lvlParam === 'pick') && pick)
      ? (lvlParam as Level)
      : 'regions';
  const place = placeList.find((p) => p.id === params.get('p')) ?? placeList[0];
  const stop = pick?.stops.find((st) => st.place.id === params.get('p')) ?? pick?.stops[0];
  const routeMode = level === 'pick' && pick?.kind === 'walk' && !!pick.links?.length && params.get('route') === '1';

  // Undo (the map toolbar): the selections this visit went through, newest last.
  const undoStack = useRef<string[]>([]);
  const go = (next: { lvl?: Level; r?: string; a?: string; p?: string; open?: string; k?: string; route?: boolean }) => {
    undoStack.current = [...undoStack.current.slice(-29), params.toString()];
    const q = new URLSearchParams();
    const lvl = next.lvl ?? level;
    if (lvl !== 'regions') q.set('lvl', lvl);
    if (isPickLevel(lvl)) {
      // the region and area stay in the URL, so leaving the picks returns to them
      q.set('r', region);
      q.set('a', area.id);
      const k = next.k ?? pick?.id;
      if (k) q.set('k', k);
      if (lvl === 'pick') {
        const p = next.p ?? (k === pick?.id ? stop?.place.id : picks.find((x) => x.id === k)?.stops[0]?.place.id);
        if (p) q.set('p', p);
        if (next.open) q.set('open', next.open);
        if (next.route ?? (routeMode && k === pick?.id)) q.set('route', '1');
      }
      setParams(q, { replace: true });
      return;
    }
    q.set('r', next.r ?? region);
    if (lvl !== 'regions' || next.a) q.set('a', next.a ?? area.id);
    if (lvl === 'places' && (next.p ?? place?.id)) q.set('p', next.p ?? place!.id);
    if (lvl === 'places' && next.open) q.set('open', next.open);
    setParams(q, { replace: true });
  };
  const undo = () => {
    const prev = undoStack.current.pop();
    if (prev !== undefined) setParams(new URLSearchParams(prev), { replace: true });
  };
  const lastDepth = useRef(DEPTH[level]);
  const direction = DEPTH[level] >= lastDepth.current ? 1 : -1;
  lastDepth.current = DEPTH[level];

  const enterRegion = (id: string) =>
    go({
      lvl: 'areas',
      r: id,
      a: id === region ? area.id : sortedAreas(id as RegionId)[0].id,
    });
  const enterArea = (id: string) => (placesInArea(id).length ? go({ lvl: 'places', a: id, p: homePlacesIn(id)[0]?.id }) : go({ a: id }));
  // A place opens as a sheet over Home; the URL keeps it (?open=), so Back closes it and a reload keeps it open.
  const location = useLocation();
  const openId = level === 'places' || level === 'pick' ? params.get('open') : null;
  const openPlace = (id: string) => {
    const q = new URLSearchParams(params);
    q.set('p', id);
    q.set('open', id);
    setParams(q, { state: { sheet: true } });
  };
  // Toolbar: a place or area picked by hand, or where you are now.
  const pickArea = (id: string) => {
    const a = uraArea(id);
    if (!a) return;
    const ps = homePlacesIn(id);
    go(ps.length ? { lvl: 'places', r: a.region, a: id, p: ps[0].id } : { lvl: 'areas', r: a.region, a: id });
  };
  const pickPlace = (id: string) => {
    const a = areaOfPlace(id);
    if (a) go({ lvl: 'places', r: a.region, a: a.id, p: id, open: id });
  };
  const [locating, setLocating] = useState(false);
  // a place's sky (time of day, weather) stays as chosen while the deck moves to other places
  const [sky, setSky] = useState<View3DSky>({ time: 'now', wx: 'clear' });

  // The map stretches (owner, 31 Oct 2026: "the screen can stretch"): drag the tab at its top up and the picture card
  // above folds away to give the map its room; drag it down (or tap the tab) to bring the card back.
  const eventRef = useRef<HTMLButtonElement>(null);
  // a place is open: its 3D view is the top of the notebook's first page, and turns away with it
  const deviceRef = useRef<HTMLDivElement>(null);
  const [mapAway, setMapAway] = useState(false);
  const onIntroTurn = useCallback((position: number) => {
    deviceRef.current?.style.setProperty('--away', String(Math.max(0, Math.min(1, position))));
    setMapAway(position >= 0.999);
  }, []);
  useEffect(() => {
    if (!openId) setMapAway(false);
  }, [openId]);
  const eventH = useRef(112);
  const [grow, setGrow] = useState(() => {
    try {
      return sessionStorage.getItem('home.mapTall') === '1' ? 1 : 0;
    } catch {
      return 0;
    }
  }); // 0 (card shown) … 1 (card folded)
  const [gripping, setGripping] = useState(false);
  const grip = useRef<{ y: number; g: number; moved: boolean } | null>(null);
  const gripDragged = useRef(false);
  const setTall = (on: boolean) => {
    setGrow(on ? 1 : 0);
    try {
      sessionStorage.setItem('home.mapTall', on ? '1' : '0');
    } catch {
      /* private mode: just not remembered */
    }
  };
  const gripProps = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (grow === 0 && eventRef.current) eventH.current = eventRef.current.offsetHeight || 112;
      grip.current = { y: e.clientY, g: grow, moved: false };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setGripping(true);
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      const g = grip.current;
      if (!g) return;
      const dy = e.clientY - g.y;
      if (Math.abs(dy) > 4) g.moved = true;
      if (g.moved) setGrow(Math.max(0, Math.min(1, g.g - dy / (eventH.current + 10))));
    },
    onPointerUp: () => {
      const g = grip.current;
      grip.current = null;
      setGripping(false);
      if (!g) return;
      if (!g.moved) return; // a tap: the click toggles
      gripDragged.current = true;
      setTimeout(() => (gripDragged.current = false), 0);
      setTall(grow > 0.5);
    },
    onPointerCancel: () => {
      grip.current = null;
      setGripping(false);
      setTall(grow > 0.5);
    },
  };
  const locate = () => {
    const fallback = (why: string) => {
      setLocating(false);
      showToast(`${why} Showing your home base, NUS University Town.`);
      if (BASE_AREA) pickArea(BASE_AREA.id);
    };
    if (!navigator.geolocation) return fallback('Location is not available here.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const q = toXY({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const a = areaAt(q.x, q.y);
        if (!a) return fallback('You seem to be outside Singapore.');
        const ps = homePlacesIn(a.id);
        // the nearest place in your planning area
        const near = [...ps].sort(
          (m, n) =>
            distanceM(m.point, { lat: pos.coords.latitude, lng: pos.coords.longitude }) -
            distanceM(n.point, { lat: pos.coords.latitude, lng: pos.coords.longitude }),
        )[0];
        go(near ? { lvl: 'places', r: a.region, a: a.id, p: near.id } : { lvl: 'areas', r: a.region, a: a.id });
      },
      () => fallback('Location is off.'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  };
  const closePlace = () => {
    if ((location.state as { sheet?: boolean } | null)?.sheet) navigate(-1);
    else {
      const q = new URLSearchParams(params);
      q.delete('open');
      setParams(q, { replace: true });
    }
  };

  // ---- cards ----
  const regionCards: LevelCard[] = URA_REGIONS.map((r) => ({
    id: r.id,
    name: r.name,
    kicker: `Region · ${areasOf(r.id).length} areas`,
    progress: regionProgress(r.id, visited),
  }));
  const areaCards: LevelCard[] = areaList.map((a) => ({
    id: a.id,
    name: a.name,
    kicker: `${uraRegion(a.region)?.name} · Planning area`,
    progress: areaProgress(a.id, visited),
  }));
  const regionItems: CoverItem[] = useMemo(
    () =>
      regionCards.map((c, i) => ({
        id: c.id,
        title: c.name,
        kicker: `${i + 1} · Region · ${areasOf(c.id as RegionId).length} areas`,
        line: progressLine(c.progress),
        stats: [
          (({ done, total }) => `${done} of ${total} areas unlocked`)(unlockedAreas(c.id as RegionId, visited)),
          categoryLine(placesInRegion(c.id as RegionId), visited),
        ],
        status: c.progress.status,
        progress: ratio(c.progress),
        shape: areasOf(c.id as RegionId)
          .filter((a) => !/Islands$/.test(a.name))
          .map((a) => ({
            rings: a.rings,
            color: SHAPE_COLOR[areaProgress(a.id, visited).status],
          })),
        action: `Explore ${c.name}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visited],
  );
  const areaItems: CoverItem[] = useMemo(
    () =>
      areaCards.map((c, i) => ({
        id: c.id,
        title: c.name,
        kicker: `${i + 1} · ${uraRegion(region)?.name} · Planning area`,
        line: progressLine(c.progress),
        stats: [categoryLine(placesInArea(c.id), visited)].filter(Boolean),
        status: c.progress.status,
        progress: ratio(c.progress),
        shape: [
          {
            rings: URA_AREAS.find((a) => a.id === c.id)!.rings,
            color: SHAPE_COLOR[c.progress.status],
          },
        ],
        action: c.progress.total ? `See ${c.progress.total} ${c.progress.total === 1 ? 'place' : 'places'}` : 'Nothing to see yet',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, visited],
  );
  const placeItems: CoverItem[] = useMemo(
    () =>
      placeList.map((p) => ({
        id: p.id,
        title: p.name,
        kicker: visited.has(p.id) ? 'Checked in' : `${p.distance} · ${area.name}`,
        line: p.area,
        status: visited.has(p.id) ? 'done' : 'none',
        progress: null,
        image: p.photo,
        action: 'Open',
        actionLabel: `Open ${p.name} in Nearby`,
      })),
    [placeList, visited, area.name],
  );

  const pickItems: CoverItem[] = useMemo(
    () =>
      picks.map((k) => {
        const prog = pickProgress(k, visited);
        return {
          id: k.id,
          title: k.title,
          kicker: pickKicker(k),
          line: k.subtitle || progressLine(prog),
          stats: [
            `${prog.visited} of ${prog.total} ${k.kind === 'walk' ? 'stops' : 'places'} checked in`,
            ...(k.kind === 'walk' && k.km ? [`≈ ${k.km.toFixed(1)} km ${k.mode === 'transit' ? 'with transit' : 'on foot'}`] : []),
          ],
          status: prog.status,
          progress: ratio(prog),
          image: k.stops.map((st) => homeOf(st.place.id)?.photo).find(Boolean),
          action: k.kind === 'walk' ? `Start the walk` : `See ${k.stops.length} places`,
        };
      }),
    [picks, visited],
  );
  const stopItems: CoverItem[] = useMemo(
    () =>
      (pick?.stops ?? []).map((st, i) => {
        const h = homeOf(st.place.id);
        return {
          id: st.place.id,
          title: st.place.name,
          kicker: visited.has(st.place.id)
            ? 'Checked in'
            : pick.kind === 'walk'
              ? `Stop ${i + 1}${st.minutes ? ` · ${st.estimate ? '≈ ' : ''}${st.minutes} min` : ''}`
              : st.place.kind,
          line: h?.area ?? st.place.kind,
          status: visited.has(st.place.id) ? 'done' : 'none',
          progress: null,
          image: h?.photo,
          action: 'Open',
          actionLabel: `Open ${st.place.name}`,
        };
      }),
    [pick, visited],
  );
  const stopHomes = useMemo(() => (pick?.stops ?? []).flatMap((st) => homeOf(st.place.id) ?? []), [pick]);

  const regionName = uraRegion(region)?.name ?? '';
  const crumbs = isPickLevel(level)
    ? ['Singapore', "Editor's Pick", ...(level === 'pick' && pick ? [pick.title] : [])]
    : ['Singapore', ...(level === 'regions' ? [] : [regionName]), ...(level === 'places' ? [area.name] : [])];
  const title =
    level === 'picks'
      ? "Editor's Pick"
      : level === 'pick'
        ? (pick?.title ?? '')
        : level === 'regions'
          ? 'Regions'
          : level === 'areas'
            ? `${regionName} · planning areas`
            : area.name;
  const up = () => (level === 'pick' ? go({ lvl: 'picks' }) : level === 'places' ? go({ lvl: 'areas' }) : go({ lvl: 'regions' }));
  const upLabel = level === 'pick' ? "Back to Editor's Pick" : level === 'places' ? `Back to ${regionName} areas` : 'Back to regions';
  const inPicks = isPickLevel(level);
  const openArea = openId ? areaOfPlace(openId) : undefined;
  const wantedBackdrop = backdropSrc(
    openId
      ? openArea
        ? { level: 'places', areaId: openArea.id }
        : { level: 'picks' }
      : level === 'regions'
        ? { level: 'regions' }
        : level === 'areas'
          ? { level: 'areas', region }
          : level === 'places'
            ? { level: 'places', areaId: area.id }
            : { level: 'picks' },
  );
  const shownBackdrop = useLoadedImage(wantedBackdrop);
  const mapPlaces = useMemo(
    () =>
      inPicks
        ? (pick?.stops.map((st) => ({ id: st.place.id, name: st.place.name, point: { lat: st.place.coordinates.lat, lng: st.place.coordinates.lng } })) ?? [])
        : placeList.map((p) => ({ id: p.id, name: p.name, point: p.point })),
    [inPicks, pick, placeList],
  );

  const deckMotion = {
    initial: reduce
      ? false
      : {
          opacity: 0,
          y: direction > 0 ? 26 : -14,
          scale: direction > 0 ? 0.96 : 1.02,
        },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce
      ? { opacity: 0 }
      : {
          opacity: 0,
          y: direction > 0 ? -14 : 26,
          scale: direction > 0 ? 1.02 : 0.96,
        },
    transition: {
      duration: reduce ? 0 : 0.3,
      ease: [0.2, 0.8, 0.2, 1] as const,
    },
  };

  return (
    // One screen with a deck that reaches the screen edges: bleeds past the column on purpose.
    <div className={styles.home} data-allow-bleed>
      {/* the deck's own map; the old one fades out once the new one has loaded */}
      <AnimatePresence initial={false}>
        <motion.div
          key={shownBackdrop}
          className={styles.backdrop}
          style={{ backgroundImage: `url(${shownBackdrop})` }}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.9, delay: 0.25 } }}
          transition={{ duration: reduce ? 0 : 0.7, ease: 'easeOut' }}
        />
      </AnimatePresence>
      <h1 className={styles.srOnly}>Explore Singapore</h1>
      {!openId && (
        <div className={styles.head}>
          <HomeHeader logoSrc={homeLogo} />
          <button
            ref={eventRef}
            type="button"
            className={gripping ? styles.event : `${styles.event} ${styles.eventFold}`}
            onClick={() => navigate(paths.holiday)}
            aria-hidden={grow === 1 ? true : undefined}
            tabIndex={grow === 1 ? -1 : undefined}
            style={
              grow > 0
                ? {
                    height: (1 - grow) * eventH.current,
                    marginTop: -10 * grow,
                    opacity: Math.max(0, 1 - grow * 1.6),
                    visibility: grow === 1 ? 'hidden' : undefined,
                  }
                : undefined
            }
          >
            {/* the first picture on Home: ahead of the 3D map's ground in the queue (React 18 spells the attribute in lower case) */}
            <img className={styles.eventImg} src={todaysHoliday.image.src} alt="" {...{ fetchpriority: 'high' }} />
            <span className={styles.eventCredit}>{todaysHoliday.image.credit.replace(/ · cropped$/, '')}</span>
            <span className={styles.eventKicker}>Festival · {todaysHoliday.today}</span>
            <span className={styles.eventTitle}>{todaysHoliday.cardTitle}</span>
            <span className={styles.eventGo} aria-hidden="true">
              →
            </span>
          </button>
        </div>
      )}

      {/* The map card stays mounted when a place opens: it becomes the live 3D view on top of the intro (no reload).
          With the keys it is one piece, like a phone: the map as its screen, the keys in its rounded bottom. */}
      <>
        <div
          ref={deviceRef}
          className={openId ? `${styles.device} ${styles.deviceOpen}${mapAway ? ` ${styles.mapAway}` : ''}` : styles.device}
          aria-hidden={(openId && mapAway) || undefined}
          {...{ inert: openId && mapAway ? '' : undefined }}
        >
          {!openId && (
            <button
              type="button"
              className={styles.grip}
              aria-label={grow === 1 ? 'Smaller map' : 'Bigger map'}
              aria-expanded={grow === 1}
              onClick={() => {
                if (!gripDragged.current) setTall(grow < 0.5);
              }}
              {...gripProps}
            />
          )}
          <div className={openId ? `${styles.mapCard} ${styles.mapHero}` : styles.mapCard}>
            {routeMode && pick && !openId ? (
              <PickRoute pick={pick} visited={visited} onClose={() => go({ route: false })} />
            ) : (
              <Suspense fallback={<div className={styles.mapLoading} role="application" aria-label={`Map of Singapore's planning areas. ${title}.`} />}>
                <MapCard3D
                  level={openId ? 'places' : level}
                  region={openId ? (openArea?.region ?? region) : region}
                  areaId={openId ? (openArea?.id ?? area.id) : area.id}
                  areaOrder={areaList.map((a) => a.id)}
                  places={mapPlaces}
                  selectedPlaceId={openId ?? (level === 'places' ? place?.id : level === 'pick' ? stop?.place.id : undefined)}
                  numbered={isPickLevel(level) && pick?.kind === 'walk'}
                  path={pick?.kind === 'walk'}
                  visited={visited}
                  label={`Map of Singapore's planning areas. ${title}.`}
                  onPickRegion={(id) => (level === 'regions' ? go({ r: id }) : enterRegion(id))}
                  onPickArea={(id) => (level === 'areas' ? go({ a: id }) : enterArea(id))}
                  onPickPlace={(id) => (isPickLevel(level) ? go({ lvl: 'pick', p: id }) : go({ lvl: 'places', p: id }))}
                  sky={openId ? sky : undefined}
                />
              </Suspense>
            )}
            {openId && (
              <div className={styles.mapTop}>
                <button type="button" className={styles.back} onClick={closePlace} aria-label={`Close ${curatedPlace(openId)?.name ?? 'place'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
                <SkyControls sky={sky} onChange={setSky} />
              </div>
            )}
            {!routeMode && !openId && (
              <div className={styles.mapTop}>
                {level !== 'regions' && (
                  <button type="button" className={styles.back} onClick={up} aria-label={upLabel}>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 5l-7 7 7 7" />
                    </svg>
                  </button>
                )}
                <div className={styles.crumbBox}>
                  <span className={styles.dots} aria-hidden="true">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className={d <= DEPTH[level] ? styles.dotOn : styles.dot} />
                    ))}
                  </span>
                  <p className={styles.crumbs} aria-label="Where you are">
                    {crumbs.join(' › ')}
                  </p>
                </div>
                {level === 'pick' && pick?.kind === 'walk' && !!pick.links?.length && (
                  <button type="button" className={styles.routeKey} onClick={() => go({ route: true })}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a4 4 0 0 1 4-4h4M18 9v6a4 4 0 0 1-4 4h-4" />
                    </svg>
                    2D route
                  </button>
                )}
              </div>
            )}
            {!routeMode && !openId && (
              <details className={styles.credits}>
                <summary>Map data · OneMap</summary>
                <p>
                  Street map:{' '}
                  <a href={ONEMAP_CREDIT.url} target="_blank" rel="noopener noreferrer">
                    {ONEMAP_CREDIT.text}
                  </a>
                  . Planning areas: {URA_SOURCE.title}, {URA_SOURCE.publisher} ({URA_SOURCE.licence}). {URA_SOURCE.note}
                </p>
              </details>
            )}
          </div>
          {!openId && (
            <MapToolbar
              canUndo={undoStack.current.length > 0}
              locating={locating}
              onLocate={locate}
              onUndo={undo}
              onPickArea={pickArea}
              onPickPlace={pickPlace}
              picksOn={isPickLevel(level)}
              onPicks={() => (isPickLevel(level) ? go({ lvl: 'regions' }) : go({ lvl: 'picks' }))}
            />
          )}
        </div>
        {openId && (
          <Suspense fallback={null}>
            <AnimatePresence mode="popLayout">
              <PlaceIntro key="intro" placeId={openId} distance={homeOf(openId)?.distance} onClose={closePlace} onTurn={onIntroTurn} />
            </AnimatePresence>
          </Suspense>
        )}
      </>

      <div className={openId ? `${styles.recommend} ${styles.recommendOpen}` : styles.recommend}>
        <h2 className={openId ? `${styles.title} ${styles.srOnly}` : styles.title}>
          <span className={styles.titleKicker}>Recommended</span>
          {title}
        </h2>
        <div className={styles.deckBox}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={
                level === 'regions'
                  ? 'regions'
                  : level === 'areas'
                    ? `areas:${region}`
                    : level === 'picks'
                      ? 'picks'
                      : level === 'pick'
                        ? `pick:${pick?.id}`
                        : `places:${area.id}`
              }
              className={styles.deckLayer}
              {...deckMotion}
            >
              {level === 'regions' && (
                <CoverFlow3D
                  label="Regions"
                  items={regionItems}
                  selectedId={region}
                  onSelect={(id) => go({ r: id, a: undefined })}
                  onEnter={enterRegion}
                  fallback={
                    <LevelDeck
                      label="Regions"
                      cards={regionCards}
                      selectedId={region}
                      actionLabel={(c) => `Explore ${c.name}`}
                      onSelect={(id) => go({ r: id, a: undefined })}
                      onEnter={enterRegion}
                    />
                  }
                />
              )}
              {level === 'areas' && (
                <CoverFlow3D
                  label={`${regionName} planning areas`}
                  items={areaItems}
                  selectedId={area.id}
                  onSelect={(id) => go({ a: id })}
                  onEnter={enterArea}
                  fallback={
                    <LevelDeck
                      label={`${regionName} planning areas`}
                      cards={areaCards}
                      selectedId={area.id}
                      actionLabel={(c) => (c.progress.total ? `See ${c.progress.total} ${c.progress.total === 1 ? 'place' : 'places'}` : 'Nothing to see yet')}
                      onSelect={(id) => go({ a: id })}
                      onEnter={enterArea}
                    />
                  }
                />
              )}
              {level === 'places' && place && (
                <CoverFlow3D
                  label="Nearby places"
                  items={placeItems}
                  hideAction={!!openId}
                  selectedId={place.id}
                  onSelect={(id) => go({ p: id, open: openId ? id : undefined })}
                  onEnter={openPlace}
                  fallback={
                    <PlaceCarousel
                      places={placeList}
                      selectedId={place.id}
                      stories={{}}
                      onSelect={(id) => go({ p: id })}
                      onActivate={(id) => go({ p: id })}
                      onOpen={openPlace}
                    />
                  }
                />
              )}
              {level === 'picks' && pick && (
                <CoverFlow3D
                  label="Editor's Pick"
                  items={pickItems}
                  selectedId={pick.id}
                  onSelect={(id) => go({ k: id })}
                  onEnter={(id) => go({ lvl: 'pick', k: id })}
                  fallback={
                    <LevelDeck
                      label="Editor's Pick"
                      cards={picks.map((k) => ({ id: k.id, name: k.title, kicker: pickKicker(k), progress: pickProgress(k, visited) }))}
                      selectedId={pick.id}
                      actionLabel={(c) => (picks.find((k) => k.id === c.id)?.kind === 'walk' ? `Start ${c.name}` : `See ${c.name}`)}
                      onSelect={(id) => go({ k: id })}
                      onEnter={(id) => go({ lvl: 'pick', k: id })}
                    />
                  }
                />
              )}
              {level === 'pick' && pick && stop && (
                <CoverFlow3D
                  label={`${pick.title}: ${pick.kind === 'walk' ? 'stops' : 'places'}`}
                  items={stopItems}
                  hideAction={!!openId}
                  selectedId={stop.place.id}
                  onSelect={(id) => go({ p: id, open: openId ? id : undefined })}
                  onEnter={openPlace}
                  fallback={
                    <PlaceCarousel
                      places={stopHomes}
                      selectedId={stop.place.id}
                      stories={{}}
                      onSelect={(id) => go({ p: id })}
                      onActivate={(id) => go({ p: id })}
                      onOpen={openPlace}
                    />
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
