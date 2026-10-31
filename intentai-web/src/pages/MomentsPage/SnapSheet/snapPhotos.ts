// M3 Snap: the "Recent photos" tray. Recognition is a demo: every tray photo is one of the app's own photos of a
// known card, so each carries its card, three tags written by hand from what the photo shows, and a fixed match score.
// A live camera photo is never matched (SnapSheet shows "No match yet").
import { homePlaceHref } from '../../../data/homeLinks';
import { snapTray, subjectOfCardId, topicOfCard, TOPIC_LABELS, imageOf, type CardTopic } from '../../../data/moments/moments';
import type { Facet } from '../../../data/placeStories';
import { storyPlace } from '../../../data/stories/places';
import { paths } from '../../../routes';
import { ARTICLE_LINKS, nearbyHref } from '../../../data/cultureLinks';

/** Where a match opens in Nearby (story and culture-card pages were removed in the Discovery redesign). */
const STORY_HREF: Readonly<Record<string, string>> = {
  'berlin-wall-fragments': homePlaceHref('curated:sg-berlin-wall-fragments-utown'),
  chinatown: nearbyHref({ kind: 'area', id: 'sg-chinatown', label: 'Chinatown' }),
};
const cardHref = (id: string) => {
  const link = ARTICLE_LINKS[id]?.[0];
  return link ? nearbyHref(link) : paths.today;
};

export type SnapTarget = { kind: 'card'; cardId: string } | { kind: 'story'; placeId: string; facet: Facet };

export interface SnapPhoto {
  key: string;
  title: string;
  /** "Berlin Wall Fragments · Monument" */
  meta: string;
  topic?: CardTopic;
  image: { src: string; alt: string; credit: string; url?: string };
  tags: readonly [string, string, string];
  /** Demo match score (a fixed value per photo). */
  score: number;
  target: SnapTarget;
  /** Where "Open in Nearby" goes. */
  href: string;
}

/** Stamp names for the story places, as the passport prints them. */
export const STORY_STAMP_NAMES: Readonly<Record<string, string>> = { 'berlin-wall-fragments': 'Berlin Wall', chinatown: 'Chinatown' };

const STORY_SHOTS: readonly { placeId: string; facet: Facet; tags: SnapPhoto['tags']; score: number }[] = [
  { placeId: 'berlin-wall-fragments', facet: 'monument', tags: ['Graffiti panel', 'Concrete slab', 'Berlin, 1989'], score: 94 },
  { placeId: 'chinatown', facet: 'history', tags: ['Hand-drawn map', 'Town plan', 'Singapore, 1822'], score: 91 },
  { placeId: 'chinatown', facet: 'food', tags: ['Grilled pork', 'Paper-lined box', 'Lunar New Year snack'], score: 89 },
];

const CARD_SHOTS: Readonly<Record<string, { tags: SnapPhoto['tags']; score: number }>> = {
  'chicken-rice': { tags: ['Sliced chicken', 'Cucumber', 'Chilli sauce'], score: 92 },
  'sri-mariamman': { tags: ['Gopuram tower', 'Painted figures', 'Hindu temple'], score: 90 },
  'thian-hock-keng': { tags: ['Curved roofs', 'Temple front', 'Hokkien temple'], score: 93 },
  'sultan-mosque': { tags: ['Golden dome', 'Shophouse street', 'Mosque'], score: 95 },
  laksa: { tags: ['Coconut broth', 'Egg', 'Chopsticks'], score: 88 },
  'hari-raya-puasa': { tags: ['Street light-up', 'Night', 'Geylang Serai'], score: 87 },
  'botanic-gardens': { tags: ['Red palms', 'Lake', 'Garden'], score: 90 },
  'chilli-crab': { tags: ['Whole crab', 'Red sauce', 'Seafood'], score: 96 },
  'lunar-new-year': { tags: ['Red lanterns', 'Night', 'Chinese New Year'], score: 89 },
  'hari-raya-haji': { tags: ['Mosque at dusk', 'Lit dome', 'Festival eve'], score: 86 },
  'hawker-culture': { tags: ['Cast-iron roof', 'Hawker tables', 'Lau Pa Sat'], score: 91 },
  kebaya: { tags: ['Embroidered flowers', 'White blouse', 'Peranakan, 1950s'], score: 88 },
  chingay: { tags: ['Clear umbrellas', 'Night parade', 'Performers'], score: 90 },
  getai: { tags: ['Lit stage', 'Red lights', 'Chinese characters'], score: 85 },
  'dikir-barat': { tags: ['Green and gold', 'Performers', 'Chingay parade'], score: 87 },
  'temasek-singapura': { tags: ['Sea chart', 'Ming dynasty', 'Mao Kun map'], score: 89 },
  'singapore-treaty-1819': { tags: ['Raffles statue', 'Landing site', 'Singapore River'], score: 92 },
  'merger-and-separation': { tags: ['Proclamation', 'Display case', '1965'], score: 90 },
};

function storyPhotos(): SnapPhoto[] {
  return STORY_SHOTS.flatMap(({ placeId, facet, tags, score }) => {
    const place = storyPlace(placeId);
    const entry = place?.cards.find((c) => c.facet === facet);
    if (!place || !entry) return [];
    return [
      {
        key: `story:${placeId}:${facet}`,
        title: entry.title,
        meta: `${place.name} · ${TOPIC_LABELS[facet]}`,
        topic: facet,
        image: entry.image,
        tags,
        score,
        target: { kind: 'story', placeId, facet },
        href: STORY_HREF[placeId] ?? paths.today,
      },
    ];
  });
}

function cardPhotos(): SnapPhoto[] {
  return snapTray().flatMap((card) => {
    const id = card.article.id;
    const shot = CARD_SHOTS[id];
    const image = imageOf(id);
    if (!shot || !image) return [];
    const topic = topicOfCard(card);
    const meta = [subjectOfCardId(id)?.short, topic ? TOPIC_LABELS[topic] : undefined].filter(Boolean).join(' · ');
    return [{ key: `card:${id}`, title: card.article.title, meta, topic, image, tags: shot.tags, score: shot.score, target: { kind: 'card', cardId: id }, href: cardHref(id) }];
  });
}

/** Team 1's story photos first (the Berlin Wall panels, the 1822 town plan), then the card photos. */
export function snapPhotos(): SnapPhoto[] {
  return [...storyPhotos(), ...cardPhotos()];
}
