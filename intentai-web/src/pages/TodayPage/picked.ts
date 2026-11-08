// Home's "Picked for you" (boards 05/11; plan B6: no "daily AI picks"). Real published places, dealt out in turns by your
// category order (tourismOrder: your ranking, then the rest in STB order): your #1 leads every round, so the grid opens
// with a mix rather than one category. Inside a category: nearest first when Locate has found you, else catalogue order.
// A category that runs out drops out of the rounds. Planned places are drafts and never picked.
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
  const sorted = places
    .flatMap((place, i) => {
      const category = tourismOf(place);
      if (!category || place.operatingStatus === 'planned') return [];
      if (filter !== 'all' && category !== filter) return [];
      const m = here ? distanceM(here, place.coordinates) : undefined;
      return [{ place, category, i, ...(m === undefined ? {} : { m }) }];
    })
    .sort((a, b) => (rank.get(a.category) ?? 99) - (rank.get(b.category) ?? 99) || (a.m ?? 0) - (b.m ?? 0) || a.i - b.i)
    .map(({ place, category, m }) => ({ place, category, ...(m === undefined ? {} : { m }) }));
  // deal round-robin in rank order
  const queues = new Map<TourismCategory, Picked[]>();
  for (const p of sorted) queues.set(p.category, [...(queues.get(p.category) ?? []), p]);
  const lanes = [...queues.entries()].sort((a, b) => (rank.get(a[0]) ?? 99) - (rank.get(b[0]) ?? 99)).map(([, q]) => q);
  const out: Picked[] = [];
  for (let i = 0; out.length < sorted.length; i++) for (const lane of lanes) if (lane[i]) out.push(lane[i]);
  return out;
}
