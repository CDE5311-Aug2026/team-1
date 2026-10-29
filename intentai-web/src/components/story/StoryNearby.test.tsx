import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { curatedPlace } from '../../features/nearby/catalogue';
import { FACETS } from '../../data/placeStories';
import { StoryNearby, StoryPlaceContext, storyNearbyTarget } from './StoryNearby';

test('every story card links to a published Nearby place or a real area', () => {
  for (const placeId of ['chinatown', 'berlin-wall-fragments'])
    for (const facet of FACETS) {
      const t = storyNearbyTarget(placeId, facet)!;
      expect(t, `${placeId}/${facet}`).toBeTruthy();
      if ('sel' in t) expect(curatedPlace(t.sel), t.sel).toBeTruthy();
    }
});

test('the monument card opens Thian Hock Keng in Nearby and in 3D', () => {
  render(
    <MemoryRouter>
      <StoryPlaceContext.Provider value={{ placeId: 'chinatown', facet: 'monument' }}>
        <StoryNearby />
      </StoryPlaceContext.Provider>
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: /Thian Hock Keng in Nearby/ })).toHaveAttribute('href', '/nearby?sel=curated%3Asg-thian-hock-keng-temple&info=1');
  expect(screen.getByRole('link', { name: 'Thian Hock Keng in 3D' })).toHaveAttribute('href', '/nearby?sel=curated%3Asg-thian-hock-keng-temple&view=3d');
});

test('food cards open their own places: Lim Chee Guan and The Spread; the Wall cards open the Wall', () => {
  expect(storyNearbyTarget('chinatown', 'food')).toEqual({ sel: 'curated:sg-lim-chee-guan-new-bridge-road', label: 'Lim Chee Guan' });
  expect(storyNearbyTarget('berlin-wall-fragments', 'food')).toEqual({ sel: 'curated:sg-the-spread-nus', label: 'The Spread' });
  for (const facet of ['monument', 'history', 'festival'] as const)
    expect(storyNearbyTarget('berlin-wall-fragments', facet)).toEqual({ sel: 'curated:sg-berlin-wall-fragments-utown', label: 'Berlin Wall' });
});
