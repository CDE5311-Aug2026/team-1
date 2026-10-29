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
