import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { StoryHeader, StoryTopBar } from '../../components/story';
import { FACETS, type Facet } from '../../data/placeStories';
import { markOpened } from '../../data/stores';
import { isFacet, storyPlace, type StoryPlace } from '../../data/stories/places';
import { rememberRailIndex } from '../../data/stories/railMemory';
import FestivalLunarNewYear from './FestivalLunarNewYear';
import FestivalWall from './FestivalWall';
import FoodBakKwa from './FoodBakKwa';
import FoodSpread from './FoodSpread';
import MonumentThianHockKeng from './MonumentThianHockKeng';
import MonumentWall from './MonumentWall';
import PlaceNotFound from './PlaceNotFound';

/** Culture card route: picks the card for place + facet. Unknown place or facet → not found. */
export default function PlaceStoryPage() {
  const { placeId = '', facet = '' } = useParams();
  const place = storyPlace(placeId);
  if (!place || !isFacet(facet)) return <PlaceNotFound />;
  // Keyed so a NEXT link (same route, new facet) mounts a fresh card: focus, scroll and progress run again.
  return <CardRoute key={`${place.id}/${facet}`} place={place} facet={facet} />;
}

function CardRoute({ place, facet }: { place: StoryPlace; facet: Facet }) {
  useEffect(() => {
    markOpened(place.id, facet);
    rememberRailIndex(place.id, FACETS.indexOf(facet));
    window.scrollTo(0, 0);
  }, [place.id, facet]);

  const card = place.cards.find((c) => c.facet === facet)!;
  return (
    <AppShell variant="story">
      <StoryTopBar placeId={place.id} facet={facet} backLabel={place.name} />
      {facet === 'food' ? (
        place.id === 'chinatown' ? <FoodBakKwa placeId={place.id} /> : <FoodSpread placeId={place.id} />
      ) : facet === 'monument' ? (
        place.id === 'chinatown' ? <MonumentThianHockKeng placeId={place.id} /> : <MonumentWall placeId={place.id} />
      ) : facet === 'festival' ? (
        place.id === 'chinatown' ? <FestivalLunarNewYear placeId={place.id} /> : <FestivalWall placeId={place.id} />
      ) : (
        // Interim body until each card layout lands: the card's rail panel copy.
        <StoryHeader kicker={card.kicker} icon={facet} title={[card.title]} subtitle={card.blurb} />
      )}
    </AppShell>
  );
}
