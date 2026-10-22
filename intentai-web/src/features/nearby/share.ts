// Sharing a place or a checklist with a friend: the phone's share sheet when there is one, else the text and
// link go to the clipboard. Only what the person sees on screen is shared: names, the list's count and which
// places are checked in. Never a position, a check-in date or anything else from this device.
import { paths } from '../../routes';
import { collectionProgress, collectionTitle, members, area as areaById, regionName } from './catalogue';
import type { CuratedPlace, ExploreCollection, ExplorePersonalData } from './domain';
import { stateOf } from './personal';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareContent {
  title: string;
  text: string;
  url: string;
}

/** An address a friend can open: this site plus the app path (hash routing in static previews). */
export function appUrl(path: string, loc: Pick<Location, 'origin' | 'pathname'> = window.location): string {
  if (import.meta.env.VITE_ROUTER === 'hash') return `${loc.origin}${loc.pathname}#${path}`;
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  return `${loc.origin}${base}${path}`;
}

type ShareNav = Pick<Navigator, 'share' | 'clipboard'>;

export async function shareContent(content: ShareContent, nav: ShareNav = navigator): Promise<ShareResult> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share(content);
      return 'shared';
    } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') return 'cancelled';
      // not allowed here (some desktop browsers): copy instead
    }
  }
  try {
    await nav.clipboard.writeText(`${content.text}\n${content.url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** What the toast says after a share (null: nothing to say). */
export function shareToast(result: ShareResult): string | null {
  if (result === 'copied') return 'Link copied. Paste it in a chat.';
  if (result === 'failed') return 'Sharing is not available in this browser.';
  return null;
}

export function placeShare(place: CuratedPlace, personal: ExplorePersonalData): ShareContent {
  const where = areaById(place.areaId)?.name ?? regionName(place.regionId);
  const name = place.nameZh ? `${place.name} (${place.nameZh})` : place.name;
  const visited = stateOf(personal, place.id)?.visited;
  const lines = [`${name}: ${place.kind.toLowerCase()} in ${where}, Singapore.`];
  if (place.recognition) lines.push(`${place.recognition.label} ${place.recognition.year}.`);
  if (visited) lines.push('I checked in here.');
  return { title: place.name, text: lines.join(' '), url: appUrl(paths.nearbyPlace(place.id)) };
}

/** Longest list of names in a shared checklist; the rest is a count. */
export const SHARE_NAMES_MAX = 10;

export function checklistShare(c: ExploreCollection, personal: ExplorePersonalData): ShareContent {
  const progress = collectionProgress(c, personal);
  const title = c.kind === 'picks' && c.titleZh ? `${c.title} (${c.titleZh})` : collectionTitle(c);
  const places = members(c);
  const lines = [`${title}: I have checked in at ${progress.visited} of ${progress.total}.`];
  if (places.length <= SHARE_NAMES_MAX) {
    // a short list: every place, ticked or not, so a friend sees what is left
    for (const p of places) lines.push(`${stateOf(personal, p.id)?.visited ? '✓' : '○'} ${p.name}`);
  } else {
    const done = places.filter((p) => stateOf(personal, p.id)?.visited);
    for (const p of done.slice(0, SHARE_NAMES_MAX)) lines.push(`✓ ${p.name}`);
    if (done.length > SHARE_NAMES_MAX) lines.push(`and ${done.length - SHARE_NAMES_MAX} more`);
  }
  lines.push('Try the list:');
  return { title, text: lines.join('\n'), url: appUrl(`${paths.nearby}?list=${encodeURIComponent(c.id)}`) };
}
