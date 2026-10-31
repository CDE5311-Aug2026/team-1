// Home base and "Your first finds" (Figma O6 / O8): Nearby areas and places, and the culture cards for the ranked
// topics. Only repo data: areas.json, the Nearby catalogue, Today's articles and their photos.
import { homePlaceHref } from '../homeLinks';
import { ARTICLE_IMAGES, type ArticleImage } from '../articleImages';
import { type CategoryId } from '../culture';
import { AREAS, PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import type { Area, CuratedPlace } from '../../features/nearby/domain';
import { HALF, toXY } from '../../features/nearby/map/projection';
import type { LatLng } from '../../features/nearby/types';
import { SUBJECTS, cardById, type Card } from '../cards';
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

/* ---------- Topic cards ---------- */

/** One representative card per photo topic: the photo O1 / O7 show. */
export const TOPIC_CARD: Record<TopicId, string> = {
  food: 'chicken-rice',
  monuments: 'thian-hock-keng',
  festivals: 'lunar-new-year',
  history: 'singapore-treaty-1819',
};

export function topicPhoto(topic: TopicId): ArticleImage | undefined {
  return ARTICLE_IMAGES[TOPIC_CARD[topic]];
}

function cardsOfCategory(category: CategoryId): Card[] {
  const ids = new Set<string>();
  const out: Card[] = [];
  for (const subject of SUBJECTS) for (const card of subject.cards) if (card.category === category && !ids.has(card.article.id)) {
    ids.add(card.article.id);
    out.push(card);
  }
  return out;
}

/** The area (short name) whose cards include this card, if any. */
function cardArea(cardId: string): { id: string; short: string } | undefined {
  const subject = SUBJECTS.find((s) => s.cards.some((c) => c.article.id === cardId));
  return subject ? { id: subject.id, short: subject.short } : undefined;
}

/** A card for a topic, preferring one tied to the base area, then the closest area with one, then the topic's photo card. */
export function cardForTopic(topic: TopicId, baseId: string | null, skip: readonly string[] = []): Card | undefined {
  const category = topicOf(topic).category as CategoryId;
  const base = areaById(baseId);
  const candidates = cardsOfCategory(category).filter((c) => !skip.includes(c.article.id));
  if (base && candidates.length) {
    const scored = candidates
      .map((card) => {
        const area = areaById(cardArea(card.article.id)?.id);
        return { card, d: area ? distanceM(base.center, area.center) : Infinity };
      })
      .sort((a, b) => a.d - b.d);
    if (scored[0].d < Infinity) return scored[0].card;
  }
  const fallback = cardById(TOPIC_CARD[topic]);
  if (fallback && !skip.includes(fallback.article.id)) return fallback;
  return candidates[0];
}

export interface Find {
  key: string;
  title: string;
  sub: string;
  /** Why it was picked. */
  why: string;
  why_icon: 'pin' | 'rank';
  href: string;
  photo?: ArticleImage;
}

/** O8 "Your first finds": the closest place to the base (the old culture cards for the ranked topics were removed in the Discovery redesign). */
export function firstFinds(baseId: string | null, _topics: readonly TopicId[] = []): Find[] {
  const finds: Find[] = [];
  const base = areaById(baseId);
  const [near] = baseId ? placesNear(baseId, 1) : [];
  if (near && base) {
    finds.push({
      key: near.place.id,
      title: near.place.name,
      sub: `${shortArea(base)} · ${near.place.kind.toLowerCase()}`,
      why: `${formatDistance(near.distance)} from your base`,
      why_icon: 'pin',
      href: homePlaceHref(near.place.id),
    });
  }
  // Lead with the #1 topic's card, as in Figma (place on the left, #1 in the middle).
  return finds;
}
