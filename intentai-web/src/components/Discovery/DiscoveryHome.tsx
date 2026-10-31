// Home, Discovery redesign (owner brief 31 Oct 2026): a full-screen map of Singapore with URA's planning areas
// (grey until unlocked, blue once every place in them is checked in), and a swipeable deck above the tab bar that
// goes region → planning area → place. The map follows the deck: it glides to the selected card's region, area or
// place, the selected area is outlined and the rest dim. The level and selection live in the URL (?r=&a=&p=&lvl=),
// so Back from a place page returns to the same card.
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import homeLogo from '../../assets/home/logo.png';
import { todaysHoliday } from '../../data/holiday';
import { ALL_HOME_PLACES, HOME_BASE, type HomePlace } from '../../data/homePlaces';
import {
  URA_AREAS,
  URA_REGIONS,
  URA_SOURCE,
  areaOfPlace,
  areaProgress,
  areasOf,
  placesInArea,
  regionBox,
  regionProgress,
  uraArea,
  uraRegion,
  visitedSet,
  type RegionId,
  type UnlockStatus,
} from '../../data/ura/ura';
import { useExplorePersonal } from '../../features/nearby/actions';
import { curatedPlace } from '../../features/nearby/catalogue';
import CityMap, { MapCredits, type MapArea, type MapFocus, type MapPin, type Rgba } from '../../features/nearby/map/CityMap';
import { toLatLng } from '../../features/nearby/map/projection';
import type { LatLng } from '../../features/nearby/types';
import { paths } from '../../routes';
import HomeHeader from '../HomeHeader/HomeHeader';
import { PlaceCarousel } from '../PlaceCarousel/PlaceCarousel';
import { LevelDeck, type LevelCard } from './LevelDeck';
import styles from './DiscoveryHome.module.css';

type Level = 'regions' | 'areas' | 'places';
const DEPTH: Record<Level, number> = { regions: 0, areas: 1, places: 2 };

/** Home base (NUS University Town) decides the first region and area shown. */
const BASE_AREA = URA_AREAS.find((a) => a.id === areaOfPlace('curated:sg-national-university-of-singapore')?.id);
const DEFAULT_REGION: RegionId = BASE_AREA?.region ?? 'central';

// Area colours: blue when unlocked, a lighter blue while exploring, grey before the first check-in. Dimmed versions
// for the areas outside the selection.
const FILL: Record<UnlockStatus, Rgba> = { done: [37, 99, 235, 0.5], exploring: [59, 130, 246, 0.26], none: [150, 150, 150, 0.3] };
const FILL_DIM: Record<UnlockStatus, Rgba> = { done: [18, 44, 110, 0.66], exploring: [22, 32, 58, 0.66], none: [24, 24, 24, 0.68] };
const EDGE: Rgba = [255, 255, 255, 0.9];
const EDGE_DIM: Rgba = [255, 255, 255, 0.12];
const HIGHLIGHT: Rgba = [228, 103, 31, 1];

/** Areas, most places first; those with none yet go last. */
const sortedAreas = (region: RegionId) =>
  [...areasOf(region)].sort((a, b) => placesInArea(b.id).length - placesInArea(a.id).length || a.name.localeCompare(b.name));

const homePlacesIn = (areaId: string): HomePlace[] => ALL_HOME_PLACES.filter((p) => areaOfPlace(p.id)?.id === areaId);

const boxPoints = (b: [number, number, number, number]): LatLng[] => [toLatLng({ x: b[0], y: b[1] }), toLatLng({ x: b[2], y: b[3] })];

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
  const lvlParam = params.get('lvl');
  const level: Level = lvlParam === 'areas' || (lvlParam === 'places' && placeList.length > 0) ? lvlParam : 'regions';
  const place = placeList.find((p) => p.id === params.get('p')) ?? placeList[0];

  const go = (next: { lvl?: Level; r?: string; a?: string; p?: string }) => {
    const q = new URLSearchParams();
    const lvl = next.lvl ?? level;
    if (lvl !== 'regions') q.set('lvl', lvl);
    q.set('r', next.r ?? region);
    if (lvl !== 'regions' || next.a) q.set('a', next.a ?? area.id);
    if (lvl === 'places' && (next.p ?? place?.id)) q.set('p', next.p ?? place!.id);
    setParams(q, { replace: true });
  };
  // Direction of the last level change, for the deck's enter/exit motion.
  const lastDepth = useRef(DEPTH[level]);
  const direction = DEPTH[level] >= lastDepth.current ? 1 : -1;
  lastDepth.current = DEPTH[level];

  // ---- deck cards ----
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

  // ---- map ----
  // A new focus id each time the selection changes: the map glides there.
  const focusCount = useRef(0);
  const focusKey = `${level}:${region}:${level === 'regions' ? '' : area.id}:${level === 'places' ? place?.id : ''}`;
  const focus: MapFocus = useMemo(() => {
    const id = ++focusCount.current;
    if (level === 'regions') return { id, points: boxPoints(regionBox(region)) };
    if (level === 'areas' || !place) return { id, points: boxPoints(area.box) };
    return { id, center: place.point, radiusM: 450 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const mapAreas: MapArea[] = useMemo(
    () =>
      URA_AREAS.map((a) => {
        const status = areaProgress(a.id, visited).status;
        const inFocus = level === 'regions' ? a.region === region : a.id === area.id;
        const sameRegion = a.region === region;
        const lit = inFocus || (level !== 'regions' && sameRegion);
        return {
          id: a.id,
          rings: a.rings,
          fill: lit ? FILL[status] : FILL_DIM[status],
          stroke: level !== 'regions' && a.id === area.id ? HIGHLIGHT : lit ? EDGE : EDGE_DIM,
          lineWidth: level !== 'regions' && a.id === area.id ? 3 : lit ? 1.2 : 0.8,
        };
      }),
    [level, region, area.id, visited],
  );

  const pins: MapPin[] = useMemo(() => {
    const toPin = (id: string, name: string, location: LatLng): MapPin => ({ key: id, name, location, category: curatedPlace(id)?.category ?? 'landmark' });
    if (level === 'regions') {
      // Your footprint: the places you have checked in at.
      return [...visited].flatMap((id) => {
        const p = curatedPlace(id);
        return p ? [toPin(p.id, p.name, p.coordinates)] : [];
      });
    }
    return placeList.map((p) => toPin(p.id, p.name, p.point));
  }, [level, visited, placeList]);

  // Measure the floating header and deck so the map frames its focus in the uncovered middle.
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState({ top: 150, bottom: 300 });
  useLayoutEffect(() => {
    const measure = () => {
      const root = rootRef.current?.getBoundingClientRect();
      const top = topRef.current?.getBoundingClientRect();
      const bottom = bottomRef.current?.getBoundingClientRect();
      if (!root || !top || !bottom || root.height === 0) return;
      setInsets({ top: Math.round(top.bottom - root.top + 8), bottom: Math.round(root.bottom - bottom.top + 8) });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    for (const el of [rootRef.current, topRef.current, bottomRef.current]) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const regionName = uraRegion(region)?.name ?? '';
  const crumbs = ['Singapore', ...(level === 'regions' ? [] : [regionName]), ...(level === 'places' ? [area.name] : [])];
  const title = level === 'regions' ? 'Regions' : level === 'areas' ? `${regionName} · planning areas` : area.name;
  const up = () => (level === 'places' ? go({ lvl: 'areas' }) : go({ lvl: 'regions' }));

  const deckMotion = {
    initial: reduce ? false : { opacity: 0, y: direction > 0 ? 36 : -18, scale: direction > 0 ? 0.94 : 1.03 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: direction > 0 ? -18 : 36, scale: direction > 0 ? 1.03 : 0.94 },
    transition: { duration: reduce ? 0 : 0.32, ease: [0.2, 0.8, 0.2, 1] as const },
  };

  return (
    // A full-screen map with floating layers, like Nearby Explore: it bleeds to the screen edges on purpose.
    <div ref={rootRef} className={styles.home} data-allow-bleed>
      <h1 className={styles.srOnly}>Explore Singapore</h1>
      <div className={styles.map} data-map-frame>
        <CityMap
          label={`Map of Singapore's planning areas. ${title}.`}
          pins={pins}
          selectedKey={level === 'places' ? place?.id : undefined}
          onSelect={(key) => (level === 'places' || level === 'areas' ? go({ lvl: 'places', p: key }) : undefined)}
          readOnly={level === 'regions'}
          focus={focus}
          areas={mapAreas}
          you={HOME_BASE}
          bleed
          insets={{ top: insets.top, bottom: insets.bottom }}
          controlsTop={insets.top}
          attribution="hidden"
        />
      </div>

      <div ref={topRef} className={styles.top}>
        <HomeHeader logoSrc={homeLogo} />
        <button type="button" className={styles.event} onClick={() => navigate(paths.holiday)}>
          <span className={styles.eventKicker}>{todaysHoliday.kicker}</span>
          <span className={styles.eventTitle}>{todaysHoliday.cardTitle}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div ref={bottomRef} className={styles.bottom}>
        <div className={styles.crumbRow}>
          {level !== 'regions' && (
            <button type="button" className={styles.back} onClick={up} aria-label={`Back to ${level === 'places' ? `${regionName} areas` : 'regions'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          )}
          <div className={styles.crumbText}>
            <p className={styles.crumbs} aria-label="Where you are">
              {crumbs.join(' › ')}
            </p>
            <h2 className={styles.title}>{title}</h2>
          </div>
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div key={level === 'regions' ? 'regions' : level === 'areas' ? `areas:${region}` : `places:${area.id}`} className={styles.deckLayer} {...deckMotion}>
            {level === 'regions' && (
              <LevelDeck
                label="Regions"
                cards={regionCards}
                selectedId={region}
                actionLabel={(c) => `Explore ${c.name}`}
                onSelect={(id) => go({ r: id, a: undefined })}
                onEnter={(id) => go({ lvl: 'areas', r: id, a: id === region ? area.id : sortedAreas(id as RegionId)[0].id })}
              />
            )}
            {level === 'areas' && (
              <LevelDeck
                label={`${regionName} planning areas`}
                cards={areaCards}
                selectedId={area.id}
                actionLabel={(c) => (c.progress.total ? `See ${c.progress.total} ${c.progress.total === 1 ? 'place' : 'places'}` : 'Nothing to see yet')}
                onSelect={(id) => go({ a: id })}
                onEnter={(id) => (placesInArea(id).length ? go({ lvl: 'places', a: id, p: homePlacesIn(id)[0]?.id }) : go({ a: id }))}
              />
            )}
            {level === 'places' && place && (
              <PlaceCarousel
                places={placeList}
                selectedId={place.id}
                stories={{}}
                onSelect={(id) => go({ p: id })}
                onActivate={(id) => go({ p: id })}
                onOpen={(id) => navigate(paths.nearbyPlace(id))}
              />
            )}
          </motion.div>
        </AnimatePresence>
        <details className={styles.credits}>
          <summary>Map data</summary>
          <p>
            Planning areas: {URA_SOURCE.title}, {URA_SOURCE.publisher} ({URA_SOURCE.licence}). {URA_SOURCE.note}
          </p>
          <MapCredits />
        </details>
      </div>
    </div>
  );
}

