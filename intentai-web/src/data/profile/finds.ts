// Home base and "Your first finds" (Figma O6 / O8): Nearby areas and places, and a place for each of the ranked place
// tags. Only repo data: areas.json, the Nearby catalogue and its photos.
import { homePlaceHref } from '../homeLinks';
import { placePicture } from '../home/nearbyCards';
import { AREAS, PUBLISHED_PLACES, curatedPlace } from '../../features/nearby/catalogue';
import type { Area, CuratedId, CuratedPlace } from '../../features/nearby/domain';
import { HALF, toXY } from '../../features/nearby/map/projection';
import type { LatLng } from '../../features/nearby/types';
import { topicOf, type TopicId } from './profile';

/** Areas a pin can snap to (not the country overview). */
export const BASE_AREAS: Area[] = AREAS.filter((a) => !a.overview && a.country === 'SG');

export function areaById(id: string | null | undefined): Area | undefined {
  return BASE_AREAS.find((a) => a.id === id);
}

/** "Chinatown & Tanjong Pagar" → "Chinatown". */
export function shortArea(area: Area): string {
  return area.name.split(/\s*[&,]\s*/)[0];
}

export const areaName = (id: string) => areaById(id)?.name;
export const areaShortName = (id: string) => {
  const area = areaById(id);
  return area ? shortArea(area) : undefined;
};

/** Metres between two points (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(50, Math.round(m / 50) * 50)} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

/** The area whose centre is closest to a point. */
export function nearestArea(point: LatLng): Area {
  let best = BASE_AREAS[0];
  let bestD = Infinity;
  for (const area of BASE_AREAS) {
    const d = distanceM(point, area.center);
    if (d < bestD) {
      best = area;
      bestD = d;
    }
  }
  return best;
}

export interface NearPlace {
  place: CuratedPlace;
  distance: number;
}

/** Published places closest to an area's centre. */
export function placesNear(areaId: string, count = 3): NearPlace[] {
  const area = areaById(areaId);
  if (!area) return [];
  return PUBLISHED_PLACES.map((place) => ({ place, distance: distanceM(area.center, place.coordinates) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

/* ---------- The map picture (sg-ground.webp covers ±HALF metres around the projection origin) ---------- */

/** The window of the ground picture the base map shows, in metres: the main island. */
export const MAP_WINDOW = { left: -16_500, right: 16_000, top: 14_600, bottom: -8_300 } as const;
const W = MAP_WINDOW.right - MAP_WINDOW.left;
const H = MAP_WINDOW.top - MAP_WINDOW.bottom;
export const MAP_ASPECT = W / H;

/** Where the ground picture sits inside the window, in % of the window. */
export const GROUND_BOX = {
  width: ((2 * HALF) / W) * 100,
  height: ((2 * HALF) / H) * 100,
  left: ((-HALF - MAP_WINDOW.left) / W) * 100,
  top: ((MAP_WINDOW.top - HALF) / H) * 100,
};

/** A point's position in the window, in %. */
export function toWindow(p: LatLng): { x: number; y: number } {
  const xy = toXY(p);
  return { x: ((xy.x - MAP_WINDOW.left) / W) * 100, y: ((MAP_WINDOW.top - xy.y) / H) * 100 };
}

/** A tap in the window (fractions 0–1) back to a point. */
export function fromWindow(fx: number, fy: number): LatLng {
  const x = MAP_WINDOW.left + fx * W;
  const y = MAP_WINDOW.top - fy * H;
  // Inverse of toXY (kept here so the projection module stays read-only).
  const xy0 = toXY({ lat: 0, lng: 0 });
  const xy1 = toXY({ lat: 1, lng: 1 });
  return { lat: (y - xy0.y) / (xy1.y - xy0.y), lng: (x - xy0.x) / (xy1.x - xy0.x) };
}

/* ---------- Place tags ---------- */

/** One place per tag, whose photo the tag tiles show (O1 / O7). */
export const TOPIC_PLACE: Record<TopicId, CuratedId> = {
  landmark: 'curated:sg-marina-bay-sands',
  culture: 'curated:sg-peranakan-museum',
  food: 'curated:sg-maxwell-food-centre',
  nature: 'curated:sg-gardens-by-the-bay',
};

export function topicPhoto(topic: TopicId): { src: string; alt: string } | undefined {
  const place = curatedPlace(TOPIC_PLACE[topic]);
  const picture = place && placePicture(place);
  return place && picture?.src ? { src: picture.src, alt: place.name } : undefined;
}

export interface Find {
  key: string;
  title: string;
  sub: string;
  /** Why it was picked. */
  why: string;
  why_icon: 'pin' | 'rank';
  href: string;
  photo?: { src: string; alt: string };
}

/** O8 "Your first finds": the closest place to the base, then the closest place for each of the top two tags. */
export function firstFinds(baseId: string | null, topics: readonly TopicId[] = []): Find[] {
  const base = areaById(baseId);
  if (!base) return [];
  const near = PUBLISHED_PLACES.map((place) => ({ place, distance: distanceM(base.center, place.coordinates) })).sort(
    (a, b) => a.distance - b.distance,
  );
  const find = ({ place, distance }: NearPlace, why: string, rank: boolean): Find => {
    const picture = placePicture(place);
    return {
      key: place.id,
      title: place.name,
      sub: `${place.kind} · ${formatDistance(distance)}`,
      why,
      why_icon: rank ? 'rank' : 'pin',
      href: homePlaceHref(place.id),
      photo: picture.src ? { src: picture.src, alt: place.name } : undefined,
    };
  };
  const finds: Find[] = near[0] ? [find(near[0], 'Closest to your base', false)] : [];
  topics.slice(0, 2).forEach((topic, i) => {
    const pick = near.find((n) => n.place.category === topic && !finds.some((f) => f.key === n.place.id));
    if (pick) finds.push(find(pick, `Your #${i + 1} · ${topicOf(topic).label}`, true));
  });
  // The #1 tag's place sits in the middle of the fan, as in Figma.
  return finds.length === 3 ? [finds[1], finds[0], finds[2]] : finds;
}
