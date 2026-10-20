// Nearby → Explore (PRD §6–9): Singapore map from the EARTH ONLINE dataset + synchronized list.
// Default is manual exploration ("Exploring Singapore"); location is requested only when the user asks.
// URL keeps view, category, submitted search, area, radius, sort and the selected place (never a position).
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { area as areaById, areasIn, collectionsContaining, curatedPlace, editorialRank, overviewArea, placeByEarthKey, placesIn } from '../../features/nearby/catalogue';
import CityMap, { type MapFocus } from '../../features/nearby/map/CityMap';
import BottomSheet, { PEEK_PX, useWideLayout, type Detent } from '../../features/nearby/components/BottomSheet';
import { StorageWarning } from '../../features/nearby/components/NearbyChrome';
import PlaceCard from '../../features/nearby/components/PlaceCard';
import View3D from '../../features/nearby/components/View3D';
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
  CATEGORIES,
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

const COUNTRY = 'SG' as const;
/** In map view the list under the map stays short; the List view shows everything. */
const MAP_LIST_LIMIT = 6;
/** The 3D view opens over Marina Bay when nothing is selected and no area or location is set. */
const MARINA_BAY: LatLng = { lat: 1.2868, lng: 103.8545 };

export default function ExplorePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const personal = useExplorePersonal();
  const location = useLocationState();
  const routerState = useLocation().state as { manual?: boolean } | null;
  // A fix is used once the user asked for it; choosing an area or "All of Singapore" sets it aside.
  const [ignoreFix, setIgnoreFix] = useState(routerState?.manual === true);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [pendingCenter, setPendingCenter] = useState<LatLng | null>(null);
  const [draft, setDraft] = useState(params.get('q') ?? '');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState(1);
  const flow = useLocationFlow(() => {
    setIgnoreFix(false);
    setMapCenter(null);
    setFocusId((n) => n + 1);
  });

  const rawView = params.get('view');
  const view = rawView === 'list' ? 'list' : rawView === '3d' ? '3d' : 'map';
  const [cardKey, setCardKey] = useState<string | null>(null);
  useEffect(() => setCardKey(null), [view]);
  const wide = useWideLayout();
  const [place] = usePersistentStore(placeStore);
  // The sheet: the List view is the full sheet; otherwise peek or half (a selected place opens it to half).
  const [mapDetent, setMapDetent] = useState<Exclude<Detent, 'full'>>(params.get('sel') && params.get('view') !== '3d' ? 'half' : 'peek');
  const detent: Detent = view === 'list' ? 'full' : mapDetent;
  // 3D fills the space above the peek; the sheet steps down so the 3D view and its card show.
  useEffect(() => {
    if (view === '3d') setMapDetent('peek');
  }, [view]);
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
    setParams(next, { replace });
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
  const items = filtered.map((p) => toItem(p, origin));
  const stateByKey = new Map(personal.places.map((s) => [s.placeKey, s]));
  const nearestMode = sort === 'nearest' && !!origin;
  const picks = items.filter((i) => collectionsContaining(i.key).length > 0).sort((a, b) => editorialRank(a.key) - editorialRank(b.key));
  const others = items.filter((i) => collectionsContaining(i.key).length === 0);
  const ordered: { title?: string; note?: string; items: ExploreItem[] }[] = nearestMode
    ? [{ title: 'Nearest first', note: `Straight-line distance ${origin ? originPhrase(origin.kind) : ''}. Not a walking time.`, items: byDistance(items) }]
    : [
        { title: 'Our picks', note: 'Places in our Singapore collection, in editorial order.', items: picks },
        { title: 'Also on the map', note: origin ? 'Other landmarks from the EARTH ONLINE dataset, nearest first.' : 'Other landmarks from the EARTH ONLINE dataset.', items: origin ? byDistance(others) : others },
      ].filter((g) => g.items.length > 0);

  const selected = items.find((i) => i.key === selectedKey) ?? null;
  const select = (key: string) => {
    patch({ sel: key }, true);
    if (view === 'map') setMapDetent((d) => (d === 'peek' ? 'half' : d));
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
  // "Near you" pins your position inside the 3D page only (the address keeps it in the hash, never sent to a server).
  const selectedPlace = selected ? curatedPlace(selected.key) : undefined;
  const target3d: View3DTarget = selectedPlace
    ? view3dTarget(selectedPlace)
    : origin
      ? { at: origin.point, pin: origin.kind === 'you' || origin.kind === 'approx' }
      : { at: MARINA_BAY, pin: false };
  const cardPlace0 = view === '3d' ? placeByEarthKey(cardKey) : undefined;
  const cardPlace = cardPlace0 && cardPlace0.id !== selected?.key ? cardPlace0 : undefined;

  const focus: MapFocus = origin
    ? { id: focusId, center: origin.point, radiusM: radius }
    : { id: focusId, points: (query || category !== 'all' ? filtered : all).map((p) => p.coordinates) };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (q && (q.length < QUERY_MIN || q.length > QUERY_MAX)) {
      setQueryError(`Type ${QUERY_MIN}–${QUERY_MAX} characters.`);
      return;
    }
    setQueryError(null);
    patch({ q: q || null, sel: null });
    setFocusId((n) => n + 1);
  };

  const onSettled = (center: LatLng) => {
    const ref = origin?.point;
    setPendingCenter(!ref || distanceM(ref, center) > 250 ? center : null);
  };

  const chipLabel = fixUsable
    ? isPrecise(location.fix) ? 'Near you' : 'Approximate location'
    : location.status === 'requesting'
      ? 'Finding you…'
      : mapCenter
        ? 'Map area'
        : area?.name ?? `Exploring ${overviewArea(COUNTRY).name}`;
  const statusText = !ignoreFix && flow.enabled ? locationStatusText(location) : null;
  const totalLabel = `${items.length} ${items.length === 1 ? 'place' : 'places'}`;

  // the uncovered part of the map: under the search bar, above the sheet, left of the map buttons
  const mapInsets = wide ? { top: 0, bottom: 0, left: 432, right: 72 } : { top: 150, bottom: PEEK_PX, right: 64 };
  const resetAll = () => {
    setIgnoreFix(true);
    setMapCenter(null);
    setDraft('');
    setSelectedArea(undefined);
    patch({ area: null, q: null, sel: null });
    setFocusId((n) => n + 1);
  };

  const sheetHeader = (
    <>
      <div className={x.titleRow}>
        <div className={x.titleText}>
          <h1 className={x.title}>Nearby</h1>
          <p className={x.count} aria-live="polite">
            {query ? `${totalLabel} matching “${query}”` : origin ? `${totalLabel} within ${radius / 1000} km of ${origin.label}` : `${totalLabel} across Singapore`}
          </p>
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
    </>
  );

  return (
    <AppShell background="var(--bg-screen-b)" layout="fill">
      {/* The map (or the 3D view) is the page: edge to edge, under the status bar and the floating controls. */}
      <div className={view === '3d' ? `${x.stage} ${x.stage3d}` : x.stage} data-allow-bleed>
        {view === '3d' ? (
          <View3D
            bleed
            target={target3d}
            title={`3D view of Singapore around ${selected?.name ?? origin?.label ?? 'Marina Bay'}`}
            onCard={setCardKey}
          />
        ) : (
          <CityMap
            bleed
            insets={mapInsets}
            controlsTop={wide ? 216 : 254}
            label="Map of Singapore places. Every place on it is also in the list."
            pins={items.map((i) => ({ key: i.key, name: i.name, location: i.location, category: i.category, visited: stateByKey.get(i.key)?.visited }))}
            selectedKey={selectedKey ?? undefined}
            onSelect={select}
            focus={focus}
            circle={origin && !query ? { center: origin.point, radiusM: radius, label: `${radius / 1000} km around ${origin.label}` } : undefined}
            you={fixUsable && location.fix && isPrecise(location.fix) ? location.fix : null}
            labels={areasIn(COUNTRY).map((a) => ({ id: a.id, name: a.name.split(' & ')[0], location: a.center }))}
            onSettled={onSettled}
            onRecenter={() => setFocusId((n) => n + 1)}
          />
        )}
      </div>

      {/* Floating search and categories (hidden in 3D, where the 3D page's time bar sits at the top). */}
      {view !== '3d' && (
        <div className={x.top} data-allow-bleed>
          <form className={x.search} role="search" onSubmit={submit}>
            <span className={x.searchIcon} aria-hidden="true">
              ⌕
            </span>
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
            <button type="button" className={x.areaChip} onClick={() => navigate(paths.nearbyLocation)} aria-label={`${chipLabel}. Change area or location`}>
              <span className={fixUsable ? `${styles.dot} ${styles.dotOn}` : styles.dot} aria-hidden="true" />
              <span className={x.areaText}>{chipLabel}</span>
            </button>
          </form>
          {queryError && (
            <p id="nearby-search-error" className={x.floatingNote} role="alert">
              {queryError}
            </p>
          )}
          <ul className={x.chips} aria-label="Category">
            {(['all', ...CATEGORIES] as CategoryFilter[]).map((c) => (
              <li key={c}>
                <button type="button" className={x.chip} aria-pressed={category === c} onClick={() => patch({ category: c === 'all' ? null : c, sel: null })}>
                  {c === 'all' ? (
                    'All'
                  ) : (
                    <>
                      <span aria-hidden="true">{CATEGORY_INFO[c].emoji}</span> {CATEGORY_INFO[c].plural}
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {pendingCenter && (
            <button
              type="button"
              className={x.searchArea}
              onClick={() => {
                setIgnoreFix(true);
                setSelectedArea(undefined);
                setMapCenter(pendingCenter);
                setPendingCenter(null);
                patch({ q: null, sel: null });
                setDraft('');
              }}
            >
              Show places in this area
            </button>
          )}
        </div>
      )}

      {/* Map buttons: 3D and your location (zoom and recenter are on the map itself). */}
      <div className={view === '3d' ? `${x.side} ${x.side3d}` : x.side} role="group" aria-label="Map view">
        <button type="button" className={x.sideButton} aria-pressed={view === '3d'} onClick={() => patch({ view: view === '3d' ? null : '3d' })}>
          3D
        </button>
        <button type="button" className={x.sideButton} onClick={flow.start} aria-label="My location">
          <span aria-hidden="true">➤</span>
        </button>
      </div>

      <BottomSheet detent={detent} onDetent={setDetent} label="Places" header={sheetHeader} wide={wide}>
        <StorageWarning />
        {statusText && (
          <p className={styles.status} role="status">
            {statusText}
          </p>
        )}
        {view === '3d' && cardPlace && (
          <p className={styles.note} role="status">
            Card open: {cardPlace.name}.{' '}
            <Link className={styles.textLink} to={paths.nearbyPlace(cardPlace.id)}>
              Open place →
            </Link>
          </p>
        )}
        {selected && (
          <section aria-label="Selected place">
            <PlaceCard item={selected} state={stateByKey.get(selected.key)} originKind={origin?.kind} selected idPrefix="preview" />
          </section>
        )}
        {!selected && (
          <Link className={x.phraseRow} to={paths.phrases}>
            <span className={x.phraseIcon} aria-hidden="true">
              💬
            </span>
            <span className={x.phraseText}>
              <span className={x.phraseTitle}>Phrases you might hear at {phrasePlace}</span>
              <span className={x.phraseSub}>{staticCopy.nearYou.subtitle}</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        )}

        <div className={styles.row}>
          {origin && !query && (
            <label className={styles.label}>
              Radius{' '}
              <select className={styles.select} value={radius} onChange={(e) => patch({ radius: e.target.value === String(DEFAULT_RADIUS_M) ? null : e.target.value })}>
                {RADII_M.map((r) => (
                  <option key={r} value={r}>
                    {r / 1000} km
                  </option>
                ))}
              </select>
            </label>
          )}
          {origin && (
            <label className={styles.label}>
              Sort{' '}
              <select className={styles.select} value={sort} onChange={(e) => patch({ sort: e.target.value === 'nearest' ? 'nearest' : null })}>
                <option value="recommended">Recommended</option>
                <option value="nearest">Nearest</option>
              </select>
            </label>
          )}
          {(origin || query) && (
            <button type="button" className={styles.textButton} onClick={resetAll}>
              ← Show all of Singapore
            </button>
          )}
        </div>
        {origin && <p className={styles.note}>Distances are straight-line and approximate.</p>}

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
              <h2 className={styles.groupTitle}>
                {group.title} <span className={styles.note}>({group.items.length})</span>
              </h2>
              {group.note && <p className={styles.groupNote}>{group.note}</p>}
              <ul className={styles.list} style={{ marginTop: '0.5rem' }}>
                {group.items.slice(0, view === 'list' || wide ? undefined : MAP_LIST_LIMIT).map((item) => (
                  <li key={item.key}>
                    <PlaceCard
                      item={item}
                      state={stateByKey.get(item.key)}
                      originKind={origin?.kind}
                      selected={item.key === selectedKey}
                      onSelect={() => select(item.key)}
                      compact={view !== 'list'}
                    />
                  </li>
                ))}
              </ul>
              {view !== 'list' && !wide && group.items.length > MAP_LIST_LIMIT && (
                <button type="button" className={styles.secondary} style={{ marginTop: '0.5rem' }} onClick={() => patch({ view: 'list' })}>
                  Show all {group.items.length} in the list
                </button>
              )}
            </section>
          ))
        )}
        {selected && origin && (
          <p className={styles.srOnly} aria-live="polite">
            {selected.name} selected, {selected.distanceM !== undefined ? formatDistance(selected.distanceM) : ''} {originPhrase(origin.kind)}
          </p>
        )}
        <p className={styles.note}>
          Learning phrases instead? <Link className={styles.textLink} to={paths.places}>Phrases for a setting →</Link>
        </p>
      </BottomSheet>
      {flow.dialog}
    </AppShell>
  );
}
