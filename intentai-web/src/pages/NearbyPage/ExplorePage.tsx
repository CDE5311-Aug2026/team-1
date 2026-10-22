// Nearby → Explore (PRD §6–9): Singapore map from the EARTH ONLINE dataset + synchronized list.
// Default is manual exploration ("Exploring Singapore"); location is requested only when the user asks.
// URL keeps view, category, submitted search, area, radius, sort and the selected place (never a position).
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import {
  area as areaById,
  areasIn,
  collection as collectionById,
  collectionProgress,
  collectionTitle,
  collectionsContaining,
  curatedPlace,
  editorialRank,
  isDraft,
  members,
  overviewArea,
  placeByEarthKey,
  placesIn,
} from '../../features/nearby/catalogue';
import { markVisited } from '../../features/nearby/actions';
import CityMap, { type MapFocus } from '../../features/nearby/map/CityMap';
import BottomSheet, { PEEK_PX, detentHeight, useWideLayout, type Detent } from '../../features/nearby/components/BottomSheet';
import { StorageWarning } from '../../features/nearby/components/NearbyChrome';
import PlaceCard from '../../features/nearby/components/PlaceCard';
import ShareButton from '../../features/nearby/components/ShareButton';
import { checklistShare } from '../../features/nearby/share';
import PlaceInfo from '../../features/nearby/components/PlaceInfo';
import PicksPanel from '../../features/nearby/components/PicksPanel';
import View3D from '../../features/nearby/components/View3D';
import { Icon } from '../../features/nearby/components/icons';
import { THUMB_CREDIT } from '../../features/nearby/thumbs';
import { view3dTarget, type View3DTarget } from '../../features/nearby/links';
import { fixInSingapore, locationStatusText, useLocationFlow } from '../../features/nearby/components/LocationFlow';
import styles from '../../features/nearby/components/Nearby.module.css';
import x from './Explore.module.css';
import { staticCopy } from '../../data/expressions';
import { usePersistentStore } from '../../data/persistentStore';
import { placeStore } from '../../data/stores';
import { CATEGORY_INFO } from '../../features/nearby/domain';
import { distanceM, formatDistance } from '../../features/nearby/geo';
import { parsePlaceKey } from '../../features/nearby/identity';
import { isPrecise, useLocationState } from '../../features/nearby/location';
import { setSelectedArea, useExplorePersonal } from '../../features/nearby/actions';
import {
  byDistance,
  filterPlaces,
  originPhrase,
  toItem,
  type ExploreItem,
  type Origin,
} from '../../features/nearby/ranking';
import {
  DEFAULT_RADIUS_M,
  QUERY_MAX,
  QUERY_MIN,
  RADII_M,
  isCategoryFilter,
  isRadius,
  type CategoryFilter,
  type LatLng,
  type RadiusM,
} from '../../features/nearby/types';
import { paths } from '../../routes';
import { statusBarPx } from '../../components/StatusBar/device';

const COUNTRY = 'SG' as const;
/** In map view the list under the map stays short; the List view shows everything. */
const MAP_LIST_LIMIT = 6;
/** How close a tap on a place (list row, its card) goes: about a street block around it. */
const JUMP_RADIUS_M = 350;
/** The 3D view opens over Marina Bay when nothing is selected and no area or location is set. */
const MARINA_BAY: LatLng = { lat: 1.2868, lng: 103.8545 };
/** The whole country fits on screen at first (Tuas to Changi, Woodlands to the Southern Islands). */
/** Bottom of "Show places in this area" under the search bar and chips (phones). */
const SEARCH_AREA_BOTTOM_PX = 236;
const SINGAPORE_CORNERS: LatLng[] = [
  { lat: 1.205, lng: 103.605 },
  { lat: 1.472, lng: 104.045 },
];

/** The middle of a set of points (an editor's pick in 3D opens over its places). */
/** How wide (m) a view must be to show all the points, with a margin. */
function spanOf(points: LatLng[]): number {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const w = (Math.max(...lngs) - Math.min(...lngs)) * 111_290;
  const h = (Math.max(...lats) - Math.min(...lats)) * 110_574;
  return Math.max(w, h) * 1.2 + 400;
}

function centreOf(points: LatLng[]): LatLng {
  const lat = points.map((p) => p.lat), lng = points.map((p) => p.lng);
  return { lat: (Math.min(...lat) + Math.max(...lat)) / 2, lng: (Math.min(...lng) + Math.max(...lng)) / 2 };
}

const historyIdx = () => (window.history.state as { idx?: number } | null)?.idx ?? 0;

export default function ExplorePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const personal = useExplorePersonal();
  const location = useLocationState();
  const routerState = useLocation().state as { manual?: boolean; exploreEntry?: number } | null;
  // The history entry Explore was entered at. Explore's own steps (area, list, 3D, details…) are history entries too,
  // so the browser's Back undoes them one by one; they all carry this index, so the Back button can leave Explore at
  // once, even after visiting a place and coming back.
  const [entryIdx] = useState(() => routerState?.exploreEntry ?? historyIdx());
  const exploreState = { ...(routerState ?? {}), exploreEntry: entryIdx };
  // A fix is used once the user asked for it; choosing an area or "All of Singapore" sets it aside.
  const [ignoreFix, setIgnoreFix] = useState(routerState?.manual === true);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [pendingCenter, setPendingCenter] = useState<LatLng | null>(null);
  const [draft, setDraft] = useState(params.get('q') ?? '');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState(1);
  // "My location": the map (or the 3D view) goes to you; in 3D the selected place steps aside so the view can fly there.
  const flow = useLocationFlow(() => {
    setIgnoreFix(false);
    setMapCenter(null);
    if (params.get('view') === '3d' && params.get('sel')) {
      const next = new URLSearchParams(params);
      next.delete('sel');
      next.delete('info');
      setParams(next, { replace: true, state: exploreState });
    }
    setFocusId((n) => n + 1);
  });

  const rawView = params.get('view');
  const view = rawView === 'list' ? 'list' : rawView === '3d' ? '3d' : 'map';
  // 2D ⇄ 3D keeps what you were looking at: the 2D map's last view opens the 3D view (and the 3D view's, the map).
  // `carry` holds that view for one focus id; any later focus (recenter, search, a list, My location) replaces it.
  const view2d = useRef<{ center: LatLng; radiusM: number } | null>(null);
  const view3d = useRef<{ center: LatLng; radiusM: number } | null>(null);
  // Explore opened on a place (a link from Today, a list, a shared place, Back from its page) opens on that place.
  const [carry, setCarry] = useState<{ id: number; to: '3d' | 'map'; center: LatLng; radiusM: number } | null>(() => {
    const p = curatedPlace(params.get('sel') ?? '');
    return p ? { id: 1, to: params.get('view') === '3d' ? '3d' : 'map', center: p.coordinates, radiusM: JUMP_RADIUS_M } : null;
  });
  const [prevView, setPrevView] = useState(view);
  if (prevView !== view) {
    setPrevView(view);
    const from = view === '3d' ? view2d.current : prevView === '3d' ? view3d.current : null;
    if (from) {
      setCarry({ id: focusId + 1, to: view === '3d' ? '3d' : 'map', ...from });
      setFocusId(focusId + 1);
    }
    if (view === '3d') view3d.current = null;
  }
  const carried = (to: '3d' | 'map') => (carry && carry.to === to && carry.id === focusId ? carry : null);
  // A landmark tapped in 3D that is not one of our places: its name from the 3D card.
  const [cardTitle, setCardTitle] = useState<string | null>(null);
  useEffect(() => setCardTitle(null), [view]);
  const wide = useWideLayout();
  const [place] = usePersistentStore(placeStore);
  // The sheet: the List view is the full sheet; otherwise peek or half (a selected place opens it to half).
  const [mapDetent, setMapDetent] = useState<Exclude<Detent, 'full'>>(params.get('sel') ? 'half' : 'peek');
  const detent: Detent = view === 'list' ? 'full' : mapDetent;
  // The sheet's height while it is being dragged: "Show places in this area" hides once the sheet reaches it.
  const [sheetDragH, setSheetDragH] = useState<number | null>(null);
  const rawCategory = params.get('category');
  const category: CategoryFilter = isCategoryFilter(rawCategory) ? rawCategory : 'all';
  const rawQuery = params.get('q')?.trim() ?? '';
  const query = rawQuery.length >= QUERY_MIN && rawQuery.length <= QUERY_MAX ? rawQuery : '';
  const selectedArea = areaById(params.get('area') ?? undefined);
  const area = selectedArea && !selectedArea.overview && selectedArea.country === COUNTRY ? selectedArea : undefined;
  const radiusParam = Number(params.get('radius'));
  const radius: RadiusM = isRadius(radiusParam) ? radiusParam : DEFAULT_RADIUS_M;
  const sort = params.get('sort') === 'nearest' ? 'nearest' : 'recommended';
  const selectedKey = parsePlaceKey(params.get('sel'));
  // ?list=<id>: one editor's pick (or the big collection) on its own, as a checklist
  const listParam = params.get('list');
  const activeList = listParam ? collectionById(listParam) : undefined;
  const [picksOpen, setPicksOpen] = useState(false);
  useEffect(() => {
    if (area && personal.selectedAreaId !== area.id) setSelectedArea(area.id);
  }, [area, personal.selectedAreaId]);
  // Back / forward through searches keeps the box in step with the URL.
  const qParam = params.get('q') ?? '';
  useEffect(() => setDraft(qParam), [qParam]);

  const patch = (changes: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace, state: exploreState });
  };

  // The device position counts only when the user asked for it, it is in Singapore, and location is on.
  const fixUsable = !ignoreFix && flow.enabled && fixInSingapore(location) && location.fix;
  const origin: Origin | undefined = useMemo(() => {
    if (fixUsable && location.fix) {
      const precise = isPrecise(location.fix);
      return { kind: precise ? 'you' : 'approx', point: { lat: location.fix.lat, lng: location.fix.lng }, label: precise ? 'your location' : 'your approximate location' };
    }
    if (mapCenter) return { kind: 'map', point: mapCenter, label: 'the map centre' };
    if (area) return { kind: 'area', point: area.center, label: area.name };
    return undefined;
  }, [fixUsable, location.fix, mapCenter, area]);

  // New origin → refocus the map on its circle.
  const originKey = origin ? `${origin.kind}:${origin.point.lat.toFixed(5)},${origin.point.lng.toFixed(5)}:${radius}` : 'overview';
  const lastOrigin = useRef(originKey);
  useEffect(() => {
    if (lastOrigin.current !== originKey) {
      lastOrigin.current = originKey;
      setPendingCenter(null);
      setFocusId((n) => n + 1);
    }
  }, [originKey]);

  const all = placesIn(COUNTRY);
  const filtered = filterPlaces(all, {
    country: COUNTRY,
    category,
    query: query || undefined,
    // A submitted name search looks across Singapore; otherwise the committed circle limits results.
    center: !query && origin ? origin.point : undefined,
    radiusM: !query && origin ? radius : undefined,
  });
  const items = (activeList ? members(activeList) : filtered).map((p) => toItem(p, origin));
  const stateByKey = new Map(personal.places.map((s) => [s.placeKey, s]));
  const nearestMode = sort === 'nearest' && !!origin;
  const picks = items.filter((i) => collectionsContaining(i.key).length > 0).sort((a, b) => editorialRank(a.key) - editorialRank(b.key));
  const others = items.filter((i) => collectionsContaining(i.key).length === 0);
  const ordered: { title?: string; note?: string; items: ExploreItem[] }[] = activeList
    ? [{ title: 'Checklist', items: nearestMode ? byDistance(items) : items }]
    : nearestMode
    ? [{ title: 'Nearest first', items: byDistance(items) }]
    : [
        { title: 'Our picks', items: picks },
        { title: 'More on the map', items: origin ? byDistance(others) : others },
      ].filter((g) => g.items.length > 0);

  const selected = items.find((i) => i.key === selectedKey) ?? null;
  // the same pins in 2D and 3D: the list's own places, with what is checked in
  const pins = items.map((i) => ({ key: i.key, name: i.name, location: i.location, category: i.category, visited: stateByKey.get(i.key)?.visited }));
  const select = (key: string) => {
    patch({ sel: key, info: null }, true);
    if (view !== 'list') setMapDetent((d) => (d === 'peek' ? 'half' : d));
  };
  // A list row or the selected card: select the place and go to it on the map, close enough to see the street
  // (in 3D the view flies there). The sheet stays at half, and the map keeps the pin above it.
  const jumpedAt = useRef(carry && carry.id === 1 ? performance.now() : -Infinity);
  const jumpTo = (key: string) => {
    const it = pins.find((p) => p.key === key) ?? (curatedPlace(key) ? { location: curatedPlace(key)!.coordinates } : undefined);
    patch({ sel: key, info: key === selectedKey ? params.get('info') : null, view: view === 'list' ? null : params.get('view') }, true);
    if (view !== '3d') setMapDetent((d) => (d === 'peek' || view === 'list' ? 'half' : d));
    if (!it) return;
    jumpedAt.current = performance.now();
    setPendingCenter(null);
    const id = focusId + 1;
    setFocusId(id);
    // never zooms out: closer than a street block already, the zoom stays
    setCarry({ id, to: view === '3d' ? '3d' : 'map', center: it.location, radiusM: Math.min(JUMP_RADIUS_M, view2d.current?.radiusM ?? JUMP_RADIUS_M) });
  };
  const setDetent = (d: Detent) => {
    if (d === 'full') patch({ view: 'list' });
    else {
      setMapDetent(d);
      if (view === 'list') patch({ view: null });
    }
  };
  // Picked on the phrase settings (Today's "Near you" card names it); its phrases stay one tap away.
  const phrasePlace = place === 'Hawker centre' ? staticCopy.nearYou.place : place;
  // 3D: the selected place (its landmark card when the dataset has a model), else the area / location / map centre.
  // Your position shows as a blue dot in the 3D page (sent by message); an approximate one gets a pin instead.
  const selectedPlace = selected ? curatedPlace(selected.key) : undefined;
  // View details unfolds the place in the sheet (?info=1), under its card, instead of leaving Explore.
  const detailsOpen = !!selectedPlace && params.get('info') === '1';
  // With nothing selected it is as wide as the 2D map was, or (recenter) the list, the area around you, the results.
  const from2d = carried('3d');
  const target3d: View3DTarget = selectedPlace
    ? { ...view3dTarget(selectedPlace), ...(from2d && !selectedPlace.earthKey ? { span: from2d.radiusM * 2 } : {}) }
    : from2d
      ? { at: from2d.center, span: from2d.radiusM * 2, pin: false }
      : activeList && items.length
        ? { at: centreOf(items.map((i) => i.location)), span: spanOf(items.map((i) => i.location)), pin: false }
        : origin
          ? { at: origin.point, span: radius * 2, pin: origin.kind === 'approx' }
          : (query || category !== 'all') && filtered.length
            ? { at: centreOf(filtered.map((p) => p.coordinates)), span: spanOf(filtered.map((p) => p.coordinates)), pin: false }
            : { at: MARINA_BAY, span: 3000, pin: false };
  // Tapping a landmark in 3D selects it here when it is one of our places (the sheet shows it, as on the map).
  const onCard3d = (key: string | null, title: string | null) => {
    const p = placeByEarthKey(key);
    if (p) {
      setCardTitle(null);
      if (p.id !== selectedKey) patch({ sel: p.id, info: null }, true);
    } else setCardTitle(key ? title : null);
  };

  const from3d = carried('map');
  const focus: MapFocus = from3d
    ? { id: focusId, center: from3d.center, radiusM: from3d.radiusM }
    : activeList
    ? { id: focusId, points: items.map((i) => i.location) }
    : origin
    ? { id: focusId, center: origin.point, radiusM: radius }
    : query || category !== 'all'
      ? { id: focusId, points: filtered.map((p) => p.coordinates) }
      : { id: focusId, points: [...all.map((p) => p.coordinates), ...SINGAPORE_CORNERS] };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (q && (q.length < QUERY_MIN || q.length > QUERY_MAX)) {
      setQueryError(`Type ${QUERY_MIN}–${QUERY_MAX} characters.`);
      return;
    }
    setQueryError(null);
    patch({ q: q || null, sel: null, info: null, list: null });
    setFocusId((n) => n + 1);
  };

  const onSettled = (center: LatLng) => {
    // the map went to a place you tapped: not a new area to search
    if (performance.now() - jumpedAt.current < 1500) return;
    const ref = origin?.point;
    setPendingCenter(!ref || distanceM(ref, center) > 250 ? center : null);
  };

  const chipLabel = fixUsable
    ? isPrecise(location.fix) ? 'Near you' : 'Approximate location'
    : location.status === 'requesting'
      ? 'Finding you…'
      : mapCenter
        ? 'Map area'
        : area?.name ?? `All of ${overviewArea(COUNTRY).name}`;
  // your dot on the map and in 3D: only a precise position you asked for, in Singapore
  const you = fixUsable && location.fix && isPrecise(location.fix) ? location.fix : null;
  const statusText = !ignoreFix && flow.enabled ? locationStatusText(location) : null;
  // room for the button between the chips and the sheet's top edge (it never sits on the sheet)
  const searchAreaRoom = wide || window.innerHeight - (sheetDragH ?? detentHeight(detent)) > SEARCH_AREA_BOTTOM_PX;
  const totalLabel = `${items.length} ${items.length === 1 ? 'place' : 'places'}`;

  // the uncovered part of the map: under the search bar, above the sheet, left of the map buttons
  // a real phone has no drawn status bar: everything under it sits higher by the difference
  const [statusShift] = useState(() => 48 - statusBarPx());
  // (on a phone the sheet's resting height is covered too, so a selected pin is never under the sheet)
  const mapInsets = wide
    ? { top: 0, bottom: 0, left: 432, right: 72 }
    : { top: 150 - statusShift, bottom: view === 'list' ? PEEK_PX : detentHeight(mapDetent), right: 64 };
  // Back leaves Explore: to the page before it (all of Explore's own steps at once), or Today if Explore was opened first
  const goBack = () => {
    if (entryIdx > 0) navigate(entryIdx - 1 - historyIdx());
    else navigate(paths.today);
  };
  // 3D on and off: going back to the map undoes the step into 3D (so Back is not filled with 3D ⇄ map toggles)
  const entered3d = useRef<number | null>(null);
  const enter3d = () => {
    entered3d.current = historyIdx() + 1;
    patch({ view: '3d' });
  };
  const leave3dNow = () => {
    if (entered3d.current !== null && entered3d.current === historyIdx()) navigate(-1);
    else patch({ view: null }, true);
    entered3d.current = null;
  };
  const closePicks = useCallback(() => setPicksOpen(false), []);
  // the browser may draw its own bars over the page's edges (Safari's floating toolbar): what shows through them is
  // the sheet's paper, not the app background
  useEffect(() => {
    const root = document.documentElement;
    const before = [root.style.backgroundColor, document.body.style.backgroundColor];
    root.style.backgroundColor = 'var(--surface)';
    document.body.style.backgroundColor = 'var(--surface)';
    return () => {
      root.style.backgroundColor = before[0];
      document.body.style.backgroundColor = before[1];
    };
  }, []);
  // Esc leaves 3D (the iframe keeps its own keys while it has focus)
  const leave3d = useRef<() => void>(() => undefined);
  leave3d.current = () => leave3dNow();
  useEffect(() => {
    if (view !== '3d') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !picksOpen) leave3d.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, picksOpen]);
  const closeList = () => {
    patch({ list: null, sel: null, info: null });
    setFocusId((n) => n + 1);
  };
  const resetAll = () => {
    setIgnoreFix(true);
    setMapCenter(null);
    setDraft('');
    setSelectedArea(undefined);
    patch({ area: null, q: null, sel: null, info: null });
    setFocusId((n) => n + 1);
  };

  const listProgress = activeList ? collectionProgress(activeList, personal) : null;
  const sheetHeader = activeList && listProgress ? (
    <>
      <div className={x.titleRow}>
        <div className={x.titleText}>
          <p className={x.kicker}>{activeList.kind === 'picks' ? 'Editor’s pick' : 'Collection'}</p>
          <h1 className={x.listTitle}>{activeList.kind === 'picks' ? activeList.title : collectionTitle(activeList)}</h1>
        </div>
        <ShareButton className={x.closeList} size={18} label="Share this checklist" content={() => checklistShare(activeList, personal)} />
        <button type="button" className={x.closeList} onClick={closeList} aria-label="Close this list">
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className={x.listProgress}>
        <span className={x.count} aria-live="polite">
          {listProgress.visited} of {listProgress.total} checked in
        </span>
        <span className={x.bar} aria-hidden="true">
          <span style={{ width: `${listProgress.percent}%` }} />
        </span>
      </div>
    </>
  ) : (
    <>
      <div className={x.titleRow}>
        <div className={x.titleText}>
          <h1 className={x.title}>Nearby</h1>
        </div>
        <nav className={x.sections} aria-label="Nearby sections">
          <Link className={x.sectionLink} to={paths.collections}>
            Collections
          </Link>
          <Link className={x.sectionLink} to={paths.saved}>
            Saved
          </Link>
        </nav>
      </div>
      {/* where the list is from: tap to pick an area or use your location */}
      <button type="button" className={x.areaPick} onClick={() => navigate(paths.nearbyLocation)} aria-label={`${chipLabel}. Change area or location`}>
        <span className={x.count} aria-live="polite">
          {query ? `${totalLabel} for “${query}”` : origin ? `${totalLabel} within ${radius / 1000} km` : totalLabel}
        </span>
        <span className={x.areaSep} aria-hidden="true">
          ·
        </span>
        {fixUsable && <Icon name="locate" size={13} className={x.areaIcon} />}
        <span className={x.areaText}>{chipLabel}</span>
        <Icon name="chevron" size={14} className={x.areaChevron} />
      </button>
    </>
  );

  return (
    // No app tab bar here: the map is a full screen of its own; Back (in the search bar) returns to where you came from.
    <AppShell background="var(--bg-screen-b)" layout="fill" chrome="status">
      {/* The map (or the 3D view, the same page around it: search, lists, sheet and map buttons) fills the screen. */}
      <div className={x.stage} data-allow-bleed>
        {view === '3d' ? (
          <View3D
            bleed
            target={target3d}
            title={`3D view of Singapore around ${selected?.name ?? origin?.label ?? 'Marina Bay'}`}
            hideCards
            onCard={onCard3d}
            you={you}
            flyId={focusId}
            pins={pins}
            selectedKey={selectedKey}
            onPick={select}
            onView={(center, spanM) => {
              view3d.current = { center, radiusM: spanM / 2 };
            }}
            controlsTop={(wide ? 218 : 256) - statusShift}
            onRecenter={() => setFocusId((n) => n + 1)}
            insets={mapInsets}
          />
        ) : (
          <CityMap
            bleed
            insets={mapInsets}
            controlsTop={(wide ? 218 : 256) - statusShift}
            label="Map of Singapore places. Every place on it is also in the list."
            pins={pins}
            selectedKey={selectedKey ?? undefined}
            onSelect={jumpTo}
            focus={focus}
            circle={origin && !query ? { center: origin.point, radiusM: radius, label: `${radius / 1000} km around ${origin.label}` } : undefined}
            you={you}
            labels={areasIn(COUNTRY).map((a) => ({ id: a.id, name: a.name.split(' & ')[0], location: a.center }))}
            onSettled={onSettled}
            onRecenter={() => setFocusId((n) => n + 1)}
            onView={(center, radiusM) => {
              view2d.current = { center, radiusM };
            }}
          />
        )}
      </div>

      {/* Floating search and Editor's picks, the same in 2D and 3D. */}
      <div className={x.top} data-allow-bleed>
        <form className={x.search} role="search" onSubmit={submit}>
          <button type="button" className={x.back} onClick={goBack} aria-label="Back">
            <Icon name="back" />
          </button>
          <label htmlFor="nearby-search" className={styles.srOnly}>
            Search places by name or type
          </label>
          <input
            id="nearby-search"
            className={x.searchInput}
            type="search"
            enterKeyHint="search"
            value={draft}
            maxLength={QUERY_MAX}
            placeholder="Search places"
            onChange={(e) => setDraft(e.target.value)}
            aria-describedby={queryError ? 'nearby-search-error' : undefined}
          />
          <button type="submit" className={styles.srOnly}>
            Search
          </button>
          {/* Editor's picks: themed lists of 10 places to check off */}
          <button
            type="button"
            className={picksOpen || activeList ? `${x.picksButton} ${x.picksOn}` : x.picksButton}
            aria-label="Editor's picks"
            aria-expanded={picksOpen}
            aria-controls="picks-panel"
            onClick={() => setPicksOpen((o) => !o)}
          >
            <Icon name="menu" />
          </button>
        </form>
        {picksOpen && (
          <PicksPanel
            id="picks-panel"
            activeId={activeList?.id ?? null}
            onClose={closePicks}
            onChoose={(c) => {
              setPicksOpen(false);
              patch({ list: c.id, sel: null, info: null, q: null, category: null, view: view === 'list' ? null : params.get('view') });
              setDraft('');
              setMapDetent('half');
              setFocusId((n) => n + 1);
            }}
          />
        )}
        {queryError && (
          <p id="nearby-search-error" className={x.floatingNote} role="alert">
            {queryError}
          </p>
        )}
        {pendingCenter && searchAreaRoom && (
          <button
            type="button"
            className={x.searchArea}
            onClick={() => {
              setIgnoreFix(true);
              setSelectedArea(undefined);
              setMapCenter(pendingCenter);
              setPendingCenter(null);
              patch({ q: null, sel: null, info: null });
              setDraft('');
            }}
          >
            Show places in this area
          </button>
        )}
      </div>

      {/* Map buttons: 2D ⇄ 3D and your location (zoom and recenter are on the map itself). */}
      {/* 2D ⇄ 3D, as in a maps app: the button names the view it switches to (Esc also leaves 3D) */}
      <div className={x.side} role="group" aria-label="Map view">
        <button type="button" className={x.sideButton} onClick={() => (view === '3d' ? leave3dNow() : enter3d())}>
          {view === '3d' ? '2D' : '3D'}
        </button>
        <button type="button" className={x.sideButton} onClick={flow.start} aria-label="My location">
          <Icon name="locate" />
        </button>
      </div>

      <BottomSheet detent={detent} onDetent={setDetent} onHeight={setSheetDragH} label="Places" header={sheetHeader} wide={wide}>
        <StorageWarning />
        {statusText && (
          <p className={styles.status} role="status">
            {statusText}
          </p>
        )}
        {view === '3d' && cardTitle && (
          <p className={styles.note} role="status">
            {cardTitle}
          </p>
        )}
        {selected && (
          <section aria-label="Selected place">
            <PlaceCard
              item={selected}
              state={stateByKey.get(selected.key)}
              originKind={origin?.kind}
              selected
              variant="card"
              idPrefix="preview"
              onShow={() => jumpTo(selected.key)}
              detailsOpen={detailsOpen}
              detailsId="sheet-details"
              onDetails={() => {
                if (detailsOpen) patch({ info: null }, true);
                else {
                  // a history entry, so Back folds the details again; the sheet opens far enough to read them
                  patch({ info: '1' });
                  if (view === 'map') setMapDetent('half');
                }
              }}
            >
              {detailsOpen && selectedPlace && (
                <div id="sheet-details" className={x.details}>
                  <PlaceInfo place={selectedPlace} idPrefix="sheet" flat />
                  <Link className={x.fullPage} to={paths.nearbyPlace(selectedPlace.id)}>
                    Open as a page
                    <Icon name="chevron" size={16} />
                  </Link>
                </div>
              )}
            </PlaceCard>
          </section>
        )}
        {!selected && !activeList && (
          <Link className={x.phraseRow} to={paths.phrases}>
            <span className={x.phraseIcon}>
              <Icon name="chat" />
            </span>
            <span className={x.phraseText}>
              <span className={x.phraseTitle}>Local phrases</span>
              <span className={x.phraseSub}>{phrasePlace}</span>
            </span>
            <Icon name="chevron" size={16} />
          </Link>
        )}

        {!activeList && (origin || query || category !== 'all') && (
          <div className={x.filters}>
            {origin && !query && (
              <select
                className={x.pill}
                aria-label="Radius"
                value={radius}
                onChange={(e) => patch({ radius: e.target.value === String(DEFAULT_RADIUS_M) ? null : e.target.value })}
              >
                {RADII_M.map((r) => (
                  <option key={r} value={r}>
                    {r / 1000} km
                  </option>
                ))}
              </select>
            )}
            {origin && (
              <button type="button" className={x.pill} aria-pressed={sort === 'nearest'} onClick={() => patch({ sort: sort === 'nearest' ? null : 'nearest' })}>
                Nearest first
              </button>
            )}
            <button type="button" className={x.pill} onClick={resetAll} aria-label="Show all of Singapore">
              ✕ Clear
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <p className={styles.empty}>
            {query
              ? `No places match “${query}”. Try another word, or clear the search.`
              : origin
                ? `No ${category === 'all' ? '' : CATEGORY_INFO[category].plural.toLowerCase() + ' '}places within ${radius / 1000} km. Try a larger radius or another area.`
                : 'No places in this category yet.'}
          </p>
        ) : (
          ordered.map((group) => (
            <section key={group.title} aria-label={group.title}>
              {activeList ? (
                <>
                  <p className={styles.body}>{activeList.description}</p>
                  {isDraft(activeList) && <p className={styles.note}>Draft: still waiting for the team editor’s check.</p>}
                </>
              ) : (
                <h2 className={styles.groupTitle}>
                  {group.title} <span className={styles.note}>({group.items.length})</span>
                </h2>
              )}
              <ul className={x.rows}>
                {group.items.slice(0, view === 'list' || wide || activeList ? undefined : MAP_LIST_LIMIT).map((item) => (
                  <li key={item.key}>
                    <PlaceCard
                      item={item}
                      state={stateByKey.get(item.key)}
                      originKind={origin?.kind}
                      selected={item.key === selectedKey}
                      onSelect={() => jumpTo(item.key)}
                      onToggleVisited={activeList ? () => markVisited(item.key, item.name, !stateByKey.get(item.key)?.visited) : undefined}
                    />
                  </li>
                ))}
              </ul>
              {view !== 'list' && !wide && !activeList && group.items.length > MAP_LIST_LIMIT && (
                <button type="button" className={styles.textButton} onClick={() => patch({ view: 'list' })}>
                  See all {group.items.length}
                </button>
              )}
            </section>
          ))
        )}
        <p className={x.credit}>{THUMB_CREDIT}</p>
        {selected && origin && (
          <p className={styles.srOnly} aria-live="polite">
            {selected.name} selected, {selected.distanceM !== undefined ? formatDistance(selected.distanceM) : ''} {originPhrase(origin.kind)}
          </p>
        )}
      </BottomSheet>
      {flow.dialog}
    </AppShell>
  );
}
