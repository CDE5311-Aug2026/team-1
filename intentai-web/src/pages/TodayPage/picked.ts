// Home's "Picked for you" (boards 05/11; plan B6: no "daily AI picks"). Real published places, your categories first
// (tourismOrder: your ranking, then the rest in STB order), nearest first within a category when Locate has found you,
// otherwise in catalogue order. Planned places are drafts and never picked.
import type { CuratedPlace } from '../../features/nearby/domain';
import { distanceM } from '../../features/nearby/geo';
import type { LatLng } from '../../features/nearby/types';
import { tourismOf, type TourismCategory, type TourismFilter } from '../../data/tourism';

export interface Picked {
  place: CuratedPlace;
  category: TourismCategory;
  /** Metres from you, only when your position is known. */
  m?: number;
}

export function pickedForYou(
  places: readonly CuratedPlace[],
  order: readonly TourismCategory[],
  filter: TourismFilter,
  here: LatLng | null,
): Picked[] {
  const rank = new Map(order.map((c, i) => [c, i]));
  return places
    .flatMap((place, i) => {
      const category = tourismOf(place);
      if (!category || place.operatingStatus === 'planned') return [];
      if (filter !== 'all' && category !== filter) return [];
      const m = here ? distanceM(here, place.coordinates) : undefined;
      return [{ place, category, i, ...(m === undefined ? {} : { m }) }];
    })
    .sort((a, b) => (rank.get(a.category) ?? 99) - (rank.get(b.category) ?? 99) || (a.m ?? 0) - (b.m ?? 0) || a.i - b.i)
    .map(({ place, category, m }) => ({ place, category, ...(m === undefined ? {} : { m }) }));
}
