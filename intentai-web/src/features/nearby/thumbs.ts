// Place pictures: views of the EARTH ONLINE 3D model (landmark models framed by their card's "Fly closer", other
// places as the area around their point), made by scripts/explore/thumbs.cjs into public/nearby/thumbs/.
import thumbs from '../../data/explore/thumbs.json';

const HAVE = new Set<string>((thumbs as { ids: string[] }).ids);

export const THUMB_CREDIT = (thumbs as { credit: string }).credit;

/** URL of the place's picture, or undefined when there is none. */
export function thumbUrl(placeId: string): string | undefined {
  if (!HAVE.has(placeId)) return undefined;
  return `${import.meta.env.BASE_URL}nearby/thumbs/${placeId.replace(/^curated:/, '')}.webp`;
}
