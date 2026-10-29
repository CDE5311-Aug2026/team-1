// One /place/:placeId route for both place pages (merge decision 2026-10-29: Team 1's story pages first, ours fill
// the gaps). A story place (chinatown, berlin-wall-fragments) opens Team 1's story page; the area id of a story place
// redirects to it; every other area or Nearby key opens the v3 Album Rail page. Cards with a story facet open it.
import { Navigate, useParams } from 'react-router-dom';
import { storyPlace } from '../../data/stories/places';
import { homePlace as areaPlace } from '../../data/home/places';
import { PLACE_AREAS } from '../AskPage/cards';
import { paths } from '../../routes';
import AreaPlacePage from '../PlacePage/PlacePage';
import CardPage from '../CardPage/CardPage';
import StoryPlacePage from './PlacePage';

/** Nearby area id → story place id. */
export const STORY_FOR_AREA: Readonly<Record<string, string>> = { 'sg-chinatown': 'chinatown' };

/** Culture card id → the story page that tells it (place, facet). */
export const STORY_FOR_CARD: Readonly<Record<string, { place: string; facet: string }>> = {
  'thian-hock-keng': { place: 'chinatown', facet: 'monument' },
  'lunar-new-year': { place: 'chinatown', facet: 'festival' },
};

export function PlaceRoute() {
  const { placeId = '' } = useParams();
  if (storyPlace(placeId)) return <StoryPlacePage />;
  const story = STORY_FOR_AREA[placeId];
  if (story) return <Navigate to={paths.homePlace(story)} replace />;
  // A v3 area (or a Nearby key inside one) opens the Album Rail; anything else gets Team 1's not-found page.
  if (areaPlace(placeId) ?? areaPlace(PLACE_AREAS[placeId])) return <AreaPlacePage />;
  return <StoryPlacePage />;
}

export function CardRoute() {
  const { cardId = '' } = useParams();
  const story = STORY_FOR_CARD[cardId];
  if (story) return <Navigate to={paths.placeCard(story.place, story.facet)} replace />;
  return <CardPage />;
}
