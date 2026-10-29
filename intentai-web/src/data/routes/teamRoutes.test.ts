import { describe, expect, test } from 'vitest';
import { atlasIdOfPlaceKey, atlasStation } from '../atlas/atlas';
import { curatedPlace } from '../../features/nearby/catalogue';
import { storyPlace } from '../stories/places';
import { teamRoutes, teamRoutesOfStory, teamRoutesWithPlace } from './teamRoutes';

describe('team routes', () => {
  test.each(teamRoutes.map((r) => [r.id, r] as const))('%s: published stops, a real station and story, sourced times', (_id, r) => {
    expect(atlasStation(r.station), r.station).toBeTruthy();
    expect(storyPlace(r.story), r.story).toBeTruthy();
    expect(new Set(r.stops.map((s) => s.key)).size).toBe(r.stops.length);
    for (const s of r.stops) {
      expect(curatedPlace(s.key)?.editorialStatus, s.key).toBe('published');
      // an atlas stop takes the atlas's visit time; any other stop needs the team's (labelled) estimate
      if (atlasIdOfPlaceKey(s.key)) expect(s.estimateMinutes, s.key).toBeUndefined();
      else expect(s.estimateMinutes, s.key).toBeGreaterThan(0);
      // closing days come from the place's own page (The Spread's is its one-page site)
      if (s.closedWeekdays) expect(s.closedSource?.url, s.key).toMatch(/^https:\/\//);
    }
    expect(r.sources.length).toBeGreaterThan(0);
    for (const src of r.sources) expect(src.url, src.title).toMatch(/^https:\/\//);
    expect(r.duration).toMatch(/estimate/);
  });

  test('lookups by place and by story', () => {
    expect(teamRoutesWithPlace('curated:sg-lim-chee-guan-new-bridge-road').map((r) => r.id)).toEqual(['chinatown-story-walk', 'chinatown-food-walk']);
    expect(teamRoutesOfStory('berlin-wall-fragments').map((r) => r.id)).toEqual(['kent-ridge-wall-walk']);
  });
});
