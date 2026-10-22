// Today's culture content ↔ Nearby. A Today article, video or holiday that names a real place (a monument, a temple,
// a neighbourhood) links to that place in Nearby, and the place shows the article in its culture cards.
// Only places the text itself names, or a catalogue stall that serves the dish the article is about ("try it").
// Labels are stored here so Today does not load the Nearby catalogue; src/data/cultureLinks.test.ts checks that every
// id exists and every label matches the catalogue.
import { paths } from '../routes';
import type { CategoryId } from './culture';

export type NearbyLink =
  /** why 'try': a stall that serves the dish. named: what the text calls the place, when not its catalogue name. */
  | { kind: 'place'; id: `curated:${string}`; label: string; why?: 'try'; named?: string }
  | { kind: 'area'; id: string; label: string }
  | { kind: 'list'; id: string; label: string };

/** Article id → its places in Nearby. */
export const ARTICLE_LINKS: Readonly<Record<string, readonly NearbyLink[]>> = {
  // "almost every hawker centre has a stall"; Tian Tian (MICHELIN Bib Gourmand) serves it at Maxwell Food Centre
  'chicken-rice': [
    { kind: 'place', id: 'curated:sg-tian-tian-hainanese-chicken-rice', label: 'Tian Tian Hainanese Chicken Rice', why: 'try' },
    { kind: 'list', id: 'sg-hawker-centres', label: 'Hawker centres to know' },
  ],
  // "The Katong neighbourhood in the east … gave its name to the best-known version"
  laksa: [
    { kind: 'area', id: 'sg-katong', label: 'Katong, Joo Chiat & Geylang' },
    { kind: 'place', id: 'curated:sg-king-of-laksa', label: 'King of Laksa', why: 'try' },
  ],
  'sri-mariamman': [{ kind: 'place', id: 'curated:sg-sri-mariamman-temple', label: 'Sri Mariamman Temple' }],
  'thian-hock-keng': [{ kind: 'place', id: 'curated:sg-thian-hock-keng-temple', label: 'Thian Hock Keng Temple' }],
  'sultan-mosque': [
    { kind: 'place', id: 'curated:sg-sultan-mosque', label: 'Sultan Mosque' },
    { kind: 'area', id: 'sg-kampong-glam', label: 'Kampong Glam & Bugis' },
  ],
  'raffles-hotel': [{ kind: 'place', id: 'curated:sg-raffles-hotel', label: 'Raffles Hotel' }],
  // "Geylang Serai is lit up with a bazaar for about a month beforehand"
  'hari-raya-puasa': [{ kind: 'area', id: 'sg-katong', label: 'Katong, Joo Chiat & Geylang' }],
  // "devotees at Kong Meng San Phor Kark See Monastery practise 'three steps, one bow'"
  'vesak-day': [{ kind: 'place', id: 'curated:sg-kong-meng-san-phor-kark-see-monastery', label: 'Kong Meng San Phor Kark See Monastery' }],
  'hawker-culture': [
    { kind: 'list', id: 'sg-hawker-centres', label: 'Hawker centres to know' },
    { kind: 'list', id: 'sg-michelin-hawkers', label: 'Michelin Bib Gourmand hawker stalls' },
  ],
  'botanic-gardens': [{ kind: 'place', id: 'curated:sg-singapore-botanic-gardens', label: 'Singapore Botanic Gardens' }],
  // "Devotees walk from Sri Srinivasa Perumal Temple …"; "from Serangoon Road"
  thaipusam: [
    { kind: 'place', id: 'curated:sg-sri-srinivasa-perumal-temple', label: 'Sri Srinivasa Perumal Temple' },
    { kind: 'place', id: 'curated:sg-little-india', label: 'Little India', named: 'Serangoon Road' },
  ],
  // "Fort Siloso is Singapore's only remaining coastal fort."
  'sentosa-name': [
    { kind: 'place', id: 'curated:sg-fort-siloso', label: 'Fort Siloso' },
    { kind: 'area', id: 'sg-sentosa', label: 'Sentosa & Southern Islands' },
  ],
};

/** A category's video → its places. */
export const VIDEO_LINKS: Partial<Record<CategoryId, readonly NearbyLink[]>> = {
  // "Hawker Culture in Singapore"
  unesco: [{ kind: 'list', id: 'sg-hawker-centres', label: 'Hawker centres to know' }],
};

/** Today's holiday (by name) → its places. */
export const HOLIDAY_LINKS: Readonly<Record<string, readonly NearbyLink[]>> = {
  // "Serangoon Road in Little India is lit with a street light-up"
  Deepavali: [{ kind: 'place', id: 'curated:sg-little-india', label: 'Little India' }],
};

/** The Today articles that name a place: shown in that place's culture cards in Nearby. */
export function articlesNaming(placeId: string): string[] {
  return Object.entries(ARTICLE_LINKS)
    .filter(([, links]) => links.some((l) => l.kind === 'place' && l.id === placeId && l.why !== 'try'))
    .map(([id]) => id);
}

/** Where a link goes in Nearby: the place selected on the map with its details open, an area, or an editor's pick. */
export function nearbyHref(link: NearbyLink): string {
  const q = new URLSearchParams();
  if (link.kind === 'place') {
    q.set('sel', link.id);
    q.set('info', '1');
  } else if (link.kind === 'area') q.set('area', link.id);
  else q.set('list', link.id);
  return `${paths.nearby}?${q.toString()}`;
}
