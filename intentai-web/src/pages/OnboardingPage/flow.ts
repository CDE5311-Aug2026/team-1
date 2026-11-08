// v2 onboarding (boards 01–04): Welcome at /onboarding, the two questions at ?step=1 and ?step=2, the review at
// /onboarding/result. The answers are a draft kept in component state and carried between the screens in the history
// entry's state; nothing is saved until "Stamp my passport" (finishTourismOnboarding).
import { PUBLISHED_PLACES, curatedPlace } from '../../features/nearby/catalogue';
import type { CuratedPlace } from '../../features/nearby/domain';
import { placePicture } from '../../data/home/nearbyCards';
import { isTourismRanking, tourismRankingOf, type ProfileV3 } from '../../data/profile/profile';
import { TOURISM_INFO, tourismOf, type TourismCategory } from '../../data/tourism';
import { HUNT_REGIONS, type HuntMode, type HuntModeState } from '../../data/v2Stores';
import type { RegionId } from '../../data/ura/ura';
import { CATEGORY_PLACE } from '../../components/ProfileEditors/TourismRanker';

/** Questions in the progress bar: 1 categories, 2 hunt mode + region, 3 review. */
export const STEPS = 3;

export function parseStep(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 2 ? n : 0;
}

export interface Draft {
  ranking: TourismCategory[];
  mode?: HuntMode;
  region?: RegionId;
}

/** A draft read from history state, if it is one. */
export function draftFromState(state: unknown): Draft | null {
  if (!state || typeof state !== 'object' || !('draft' in state)) return null;
  const d = (state as { draft: unknown }).draft as Partial<Draft> | null;
  if (!d || !isTourismRanking(d.ranking)) return null;
  return {
    ranking: d.ranking,
    mode: d.mode === 'together' || d.mode === 'solo' ? d.mode : undefined,
    region: d.region && (HUNT_REGIONS as readonly string[]).includes(d.region) ? d.region : undefined,
  };
}

/** The first draft: someone redoing onboarding starts from their saved answers; a first run starts empty. */
export function initialDraft(profile: ProfileV3, hunt: HuntModeState, returning: boolean): Draft {
  if (!returning) return { ranking: [] };
  return { ranking: [...tourismRankingOf(profile)], mode: hunt.mode, region: hunt.region };
}

export interface FeedPlace {
  id: string;
  name: string;
  category: TourismCategory;
  photo: string;
}

const hasPhoto = (p: CuratedPlace) => {
  const pic = placePicture(p);
  return (pic.kind === 'card' || pic.kind === 'photo') && pic.src ? pic.src : undefined;
};

/** Published places of a category that have a licensed photo, the ranker tile's place first. */
export function photoPlaces(c: TourismCategory): FeedPlace[] {
  const tile = curatedPlace(CATEGORY_PLACE[c].id);
  const list = PUBLISHED_PLACES.filter((p) => tourismOf(p) === c && p.operatingStatus !== 'planned');
  const ordered = tile && list.includes(tile) ? [tile, ...list.filter((p) => p !== tile)] : list;
  return ordered.flatMap((p) => {
    const photo = hasPhoto(p);
    return photo ? [{ id: p.id, name: p.name, category: c, photo }] : [];
  });
}

/** Board 02's live preview: two real places, the #1 and #2 categories' first places (two of #1 when only one). */
export function feedPreview(ranking: readonly TourismCategory[]): FeedPlace[] {
  if (ranking.length === 0) return [];
  if (ranking.length === 1) return photoPlaces(ranking[0]).slice(0, 2);
  return ranking.slice(0, 2).flatMap((c) => photoPlaces(c).slice(0, 1));
}

/** "Home leads with Attractions." + "Then Wellness, Leisure." */
export function leadLines(ranking: readonly TourismCategory[]): [string, string] {
  if (ranking.length === 0) return ['Nothing picked yet.', 'Tap a tile above.'];
  const [first, ...rest] = ranking.map((c) => TOURISM_INFO[c].label);
  return [`Home leads with ${first}.`, rest.length ? `Then ${rest.join(', ')}.` : 'Then the other categories.'];
}
