import { NextCard, SampleVideo, SourceLine, StatTiles, StoryArticle, StoryHeader } from '../../components/story';
import { WALL_PANELS } from '../../data/stories/berlin';
import { withNextCredit } from '../../data/stories/places';

interface MonumentWallProps {
  placeId: string;
}

/** Monument card 2 of 4 for Berlin Wall Fragments: the Wall panels. */
export default function MonumentWall({ placeId }: MonumentWallProps) {
  const { video } = WALL_PANELS;
  return (
    <>
      <StoryHeader kicker={WALL_PANELS.kicker} icon="monument" title={WALL_PANELS.title} />

      <SampleVideo poster={video.poster} title={video.title} duration={video.duration} captions={video.captions} />

      <StatTiles tiles={WALL_PANELS.tiles} />

      <StoryArticle leadDelay={0.4} lead={WALL_PANELS.lead} more={WALL_PANELS.more}>
        <SourceLine inArticle delay={0.6}>
          {withNextCredit(WALL_PANELS.source, WALL_PANELS.next.credit)}
        </SourceLine>
      </StoryArticle>

      <NextCard placeId={placeId} facet="festival" title={WALL_PANELS.next.title} thumb={WALL_PANELS.next.thumb} delay={0.66} />
    </>
  );
}
