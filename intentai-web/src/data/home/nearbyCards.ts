// Home › Nearby: one small card per real Nearby place (the published catalogue, so new places in the dataset appear
// here with no code change). Picture, best first:
//   1. the photo of a culture card about the place (the designed cards),
//   2. an openly licensed Wikipedia / Commons photo (scripts/explore/place-photos.mjs → src/data/explore/photos.json),
//   3. the EARTH ONLINE 3D view (thumbs),
//   4. the 2D ground map around the point.
import { ARTICLE_IMAGES } from '../articleImages';
import { ARTICLE_LINKS } from '../cultureLinks';
import photosJson from '../explore/photos.json';
import { MAIN_COLLECTION, PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import type { CuratedPlace } from '../../features/nearby/domain';
import { HALF, toXY } from '../../features/nearby/map/projection';
import { THUMB_CREDIT, thumbUrl } from '../../features/nearby/thumbs';
import type { LatLng } from '../../features/nearby/types';

interface PhotoEntry {
  file: string;
  credit: string;
  source: string;
  license: string;
}
const PHOTOS = (photosJson as { photos: Record<string, PhotoEntry> }).photos;

export type PictureKind = 'card' | 'photo' | '3d' | '2d';

export interface PlacePicture {
  kind: PictureKind;
  /** Image URL (2D has none: the card draws the ground map). */
  src?: string;
  credit: string;
  /** Where the credit links (licence / file page). */
  source?: string;
}

/** Card photo of an article that is about this place (not one that only sends you there to eat). */
function cardPhoto(placeId: string) {
  for (const [articleId, links] of Object.entries(ARTICLE_LINKS)) {
    if (!links.some((l) => l.kind === 'place' && l.id === placeId && l.why !== 'try')) continue;
    const image = ARTICLE_IMAGES[articleId];
    if (image) return image;
  }
  return undefined;
}

export function placePicture(place: Pick<CuratedPlace, 'id'>): PlacePicture {
  const card = cardPhoto(place.id);
  if (card) return { kind: 'card', src: card.src, credit: card.credit, source: card.url };
  const photo = PHOTOS[place.id];
  if (photo) return { kind: 'photo', src: `${import.meta.env.BASE_URL}nearby/photos/${photo.file}`, credit: photo.credit, source: photo.source };
  const thumb = thumbUrl(place.id);
  if (thumb) return { kind: '3d', src: thumb, credit: THUMB_CREDIT };
  return { kind: '2d', credit: '© OpenStreetMap contributors' };
}

/** CSS for the 2D fallback: sg-ground.webp (±HALF metres) cropped to `spanM` metres around the point. */
export function groundCrop(point: LatLng, spanM = 2400): { backgroundSize: string; backgroundPosition: string } {
  const xy = toXY(point);
  const scale = (2 * HALF) / spanM; // ground width in card widths
  // The point's position in the ground picture, 0–1 from the left / top.
  const fx = (xy.x + HALF) / (2 * HALF);
  const fy = (HALF - xy.y) / (2 * HALF);
  // background-position in % puts that fraction of the (image − box) gap; solve so the point lands in the centre.
  const px = ((fx * scale - 0.5) / (scale - 1)) * 100;
  const py = ((fy * scale - 0.5) / (scale - 1)) * 100;
  return { backgroundSize: `${scale * 100}% ${scale * 100}%`, backgroundPosition: `${px}% ${py}%` };
}

const KIND_ORDER: Record<PictureKind, number> = { card: 0, photo: 1, '3d': 2, '2d': 3 };
const collectionRank = new Map((MAIN_COLLECTION?.memberIds ?? []).map((id, i) => [id, i]));

/**
 * The places in card order: with a known position, nearest first; otherwise the designed (card-photo) places first,
 * then the Singapore collection's order, then the rest by name.
 */
export function homePlaces(distance?: (p: CuratedPlace) => number): CuratedPlace[] {
  const list = [...PUBLISHED_PLACES];
  if (distance) return list.sort((a, b) => distance(a) - distance(b));
  return list.sort(
    (a, b) =>
      Math.min(KIND_ORDER[placePicture(a).kind], 1) - Math.min(KIND_ORDER[placePicture(b).kind], 1) ||
      (collectionRank.get(a.id) ?? 9999) - (collectionRank.get(b.id) ?? 9999) ||
      a.name.localeCompare(b.name),
  );
}
