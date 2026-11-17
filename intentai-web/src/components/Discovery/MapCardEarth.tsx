// The map card on our own EARTH ONLINE 3D city (owner, 31 Oct 2026: "地图还是看看能不能直接用我们的3D"). The 3D page
// draws URA's planning areas over the city as tinted zones with numbered labels: regions 1–5 over the whole island,
// then the region's planning areas, then the area's places as pins among the real buildings and landmark models.
// Grey = not unlocked, light blue = exploring, blue = all checked in; the selection is outlined in orange.
// The regions view stays on one point (the island), so swiping regions never reloads the 3D page; entering a region or
// a place far away moves the 3D page's loaded area once (a short reload inside the card).
import { lazy, Suspense, useMemo } from 'react';
import { URA_AREAS, URA_REGIONS, areaProgress, areasOf, regionBox, type RegionId, type UnlockStatus } from '../../data/ura/ura';
import { curatedPlace } from '../../features/nearby/catalogue';
import type { View3DSky, View3DZone } from '../../features/nearby/components/View3D';
import { toLatLng } from '../../features/nearby/map/projection';
import type { TourismFilter } from '../../data/tourism';
import type { MapLevel, MapPlacePin } from './MapCard3D';
import styles from './MapCard3D.module.css';

const View3D = lazy(() => import('../../features/nearby/components/View3D'));

interface Props {
  level: MapLevel;
  region: RegionId;
  areaId: string;
  areaOrder: readonly string[];
  places: readonly MapPlacePin[];
  selectedPlaceId?: string;
  visited: ReadonlySet<string>;
  label: string;
  onPickRegion(id: RegionId): void;
  onPickArea(id: string): void;
  onPickPlace(id: string): void;
  /** A place's own sky (time of day, weather); the planning-area map stays a clear late morning. */
  sky?: View3DSky;
  /** v2 category chips. The 3D page draws its own pins (by the older place kinds), so a picked category shows only its
   *  own pins here (and the selected one): the 3D page has no faded pin to dim the others with. */
  category?: TourismFilter;
}

const MAP_SKY: View3DSky = { time: 10.5, wx: 'clear' };

const TINT: Record<UnlockStatus, string> = { none: '#b8b2a6', exploring: '#8fb5f0', done: '#2f6fe4' };
const DARK = '#1b2330';
const WHITE = '#ffffff';
const ORANGE = '#e4671f';
const WARM = '#f6b98a';

const areaById = new Map(URA_AREAS.map((a) => [a.id, a]));
const mainland = (region: RegionId) => areasOf(region).filter((a) => !/Islands$/.test(a.name));
const ISLAND: [number, number, number, number] = (() => {
  const bs = URA_AREAS.filter((a) => !/Islands$/.test(a.name)).map((a) => a.box);
  return [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];
})();
const middle = (b: [number, number, number, number]) => toLatLng({ x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 });
function regionPoint(region: RegionId): [number, number] {
  const as = mainland(region).length ? mainland(region) : areasOf(region);
  return [as.reduce((s, a) => s + a.centre[0], 0) / as.length, as.reduce((s, a) => s + a.centre[1], 0) / as.length];
}

export function MapCardEarth({
  level,
  region,
  areaId,
  areaOrder,
  places,
  selectedPlaceId,
  visited,
  label,
  onPickRegion,
  onPickArea,
  onPickPlace,
  sky,
  category = 'all',
}: Props) {
  const target = useMemo(() => {
    if (level === 'regions') return { at: middle(ISLAND), span: (ISLAND[2] - ISLAND[0]) * 1.05, pin: false };
    if (level === 'areas') {
      const b = regionBox(region);
      return { at: middle(b), span: Math.max(b[2] - b[0], b[3] - b[1]) * 1.15, pin: false };
    }
    const sel = selectedPlaceId ? curatedPlace(selectedPlaceId) : undefined;
    const p =
      places.find((x) => x.id === selectedPlaceId) ??
      (sel ? { id: sel.id, name: sel.name, point: { lat: sel.coordinates.lat, lng: sel.coordinates.lng } } : places[0]);
    if (!p) return { at: middle(areaById.get(areaId)!.box), span: 3000, pin: false };
    // a place with its own model: the 3D page's camera for that building (its front, per-building angles in LITE_VIEW);
    // otherwise close in on the spot
    const key = curatedPlace(p.id)?.earthKey;
    return key ? { at: p.point, card: key } : { at: p.point, span: 380, pin: false };
  }, [level, region, areaId, selectedPlaceId, places]);

  const zones: View3DZone[] = useMemo(() => {
    const order = new Map(areaOrder.map((id, i) => [id, i + 1]));
    const list: View3DZone[] = URA_AREAS.map((a) => {
      const status = areaProgress(a.id, visited).status;
      const inRegion = a.region === region;
      const sel = level !== 'regions' && a.id === areaId;
      const base = { id: a.id, rings: a.rings, at: a.centre as [number, number] };
      if (level === 'regions')
        return inRegion ? { ...base, fill: TINT[status], fa: 0.42, line: WHITE, la: 0.85 } : { ...base, fill: DARK, fa: 0.5, line: WHITE, la: 0.2 };
      if (level === 'areas')
        return sel
          ? { ...base, fill: WARM, fa: 0.55, line: ORANGE, la: 1, sel: true, num: order.get(a.id), name: a.name, label: a.name }
          : inRegion
            ? { ...base, fill: TINT[status], fa: 0.38, line: WHITE, la: 0.85, num: order.get(a.id), label: a.name }
            : { ...base, fill: DARK, fa: 0.5, line: WHITE, la: 0.15 };
      // places: the area stays outlined; the city shows through
      return sel ? { ...base, fill: WARM, fa: 0.12, line: ORANGE, la: 1, sel: true } : { ...base, fill: DARK, fa: 0.3, line: WHITE, la: 0.2 };
    });
    if (level === 'regions')
      URA_REGIONS.forEach((r, i) =>
        list.push({
          id: `r:${r.id}`,
          rings: [],
          fill: DARK,
          fa: 0,
          line: WHITE,
          la: 0,
          at: regionPoint(r.id),
          num: i + 1,
          name: r.name,
          label: r.name,
          kind: 'Region',
          sel: r.id === region,
        }),
      );
    return list;
  }, [level, region, areaId, areaOrder, visited]);

  const pins = useMemo(
    () =>
      level === 'places'
        ? places
            .filter((p) => category === 'all' || p.tourism === category || p.id === selectedPlaceId)
            .map((p) => ({ key: p.id, location: p.point, category: curatedPlace(p.id)?.category ?? 'landmark', visited: visited.has(p.id) }))
        : [],
    [level, places, visited, category, selectedPlaceId],
  );

  const onZone = (id: string) => {
    if (id.startsWith('r:')) return onPickRegion(id.slice(2) as RegionId);
    const a = areaById.get(id);
    if (!a) return;
    if (level === 'regions' || a.region !== region) onPickRegion(a.region);
    else onPickArea(a.id);
  };

  return (
    <div className={styles.map} role="application" aria-label={label}>
      <Suspense fallback={null}>
        <View3D
          bleed
          hideCards
          overview
          title={label}
          target={target}
          zones={zones}
          onZone={onZone}
          pins={pins}
          selectedKey={level === 'places' ? (selectedPlaceId ?? null) : null}
          onPick={onPickPlace}
          insets={{ top: 48 }}
          sky={sky ?? MAP_SKY}
        />
      </Suspense>
    </div>
  );
}
