import { describe, expect, test } from 'vitest';
import { curatedPlace } from '../../features/nearby/catalogue';
import { isFacet, storyPlace } from '../stories/places';
import { PLACE_CARDS } from './placeCards';

// The crops on disk (public/nearby/cards), by file name.
const ON_DISK = new Set(Object.keys(import.meta.glob('../../../public/nearby/cards/*.webp')).map((f) => f.split('/').pop()));

describe('place story cards', () => {
  test.each(Object.entries(PLACE_CARDS))('%s: a published place; sourced numbers and text; licensed photos on disk', (id, card) => {
    expect(curatedPlace(id)?.editorialStatus).toBe('published');
    for (const t of card.tiles ?? []) expect(t.source.url, t.label).toMatch(/^https?:\/\/[^/]+\/.+/);
    if (card.lead || card.lookFor || card.clip) expect(card.sources.length + (card.tiles?.length ?? 0)).toBeGreaterThan(0);
    for (const s of card.sources) expect(s.url).toMatch(/^https?:\/\/[^/]+\/.+/);
    for (const c of card.clip?.captions ?? []) expect(c.length, c).toBeLessThanOrEqual(70);
    const photos = [card.clip?.poster, card.thenNow?.then, card.thenNow?.now].filter((p) => !!p);
    for (const p of photos) {
      expect(p!.credit, p!.src).toMatch(/public domain|CC0|CC BY/i);
      // our own crops live in public/nearby/cards; Team 1's are bundled assets
      if (p!.src.includes('nearby/cards/')) expect(ON_DISK.has(p!.src.split('/').pop()), p!.src).toBe(true);
    }
    if (card.story?.path.startsWith('/nearby/place/')) {
      // a longer story on a place's own v2 page (Berlin Wall Fragments)
      const key = decodeURIComponent(card.story.path.split('/')[3].split('#')[0]);
      expect(curatedPlace(key), card.story.path).toBeTruthy();
    } else if (card.story) {
      const [, , placeId, facet] = card.story.path.split('/');
      expect(storyPlace(placeId), card.story.path).toBeTruthy();
      expect(isFacet(facet), card.story.path).toBe(true);
    }
  });

  test('the pilot covers the story walks’ heritage stops with then and now', () => {
    for (const id of ['curated:sg-thian-hock-keng-temple', 'curated:sg-sri-mariamman-temple', 'curated:sg-masjid-jamae-chulia'])
      expect(PLACE_CARDS[id].thenNow, id).toBeTruthy();
  });
});
