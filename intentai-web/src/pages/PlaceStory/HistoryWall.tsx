import { CollectCard, SampleVideo, StoryHeader, Timeline } from '../../components/story';
import { WALL_HISTORY } from '../../data/stories/berlin';
import { FACETS } from '../../data/placeStories';
import { paths } from '../../routes';

interface HistoryWallProps {
  placeId: string;
}

/** History card 4 of 4 for Berlin Wall Fragments: 1961 to 2016, with the passport stamp. */
export default function HistoryWall({ placeId }: HistoryWallProps) {
  const { video, collect } = WALL_HISTORY;
  return (
    <>
      <StoryHeader kicker={WALL_HISTORY.kicker} icon="history" title={WALL_HISTORY.title} />

      <SampleVideo poster={video.poster} title={video.title} duration={video.duration} captions={video.captions} />

      <Timeline rows={WALL_HISTORY.timeline} source={WALL_HISTORY.source} />

      <CollectCard
        placeId={placeId}
        title={collect.title}
        note={collect}
        stampIcon="monument"
        secondary={{ label: 'Back to place', to: paths.homePlace(placeId), state: { railIndex: FACETS.indexOf('history') }, replace: true }}
      />
    </>
  );
}
