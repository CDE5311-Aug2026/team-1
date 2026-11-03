// Home's background follows the deck (owner, 31 Oct 2026: "the deck decides the background"): the regions deck lies on
// an old chart of the island, a region's areas on a map of that region, an area's places (and an open place) on a close
// map of that planning area. Each region has its own paper and ink. Editor's Picks keep the plain kraft paper.
// The maps are drawn by scripts/home/build-backdrops.py into public/home/bg.
import type { RegionId } from '../../data/ura/ura';

export type BackdropDeck = { level: 'regions' } | { level: 'areas'; region: RegionId } | { level: 'places'; areaId: string } | { level: 'picks' };

export function backdropKey(deck: BackdropDeck): string | null {
  switch (deck.level) {
    case 'regions':
      return 'sg';
    case 'areas':
      return `region-${deck.region}`;
    case 'places':
      return `area-${deck.areaId}`;
    default:
      return null;
  }
}

export function backdropSrc(deck: BackdropDeck): string {
  const key = backdropKey(deck);
  return `${import.meta.env.BASE_URL}home/${key ? `bg/${key}` : 'paper'}.webp`;
}
