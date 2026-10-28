import { NextCard, SampleVideo, SourceLine, StatTiles, StoryArticle, StoryHeader } from '../../components/story';
import { FALL_OF_THE_WALL } from '../../data/stories/berlin';

interface FestivalWallProps {
  placeId: string;
}

/** Festival card 3 of 4 for Berlin Wall Fragments: the fall of the Wall. */
export default function FestivalWall({ placeId }: FestivalWallProps) {
  const { video } = FALL_OF_THE_WALL;
  return (
    <>
      <StoryHeader kicker={FALL_OF_THE_WALL.kicker} icon="festival" title={FALL_OF_THE_WALL.title} />

      <SampleVideo poster={video.poster} title={video.title} duration={video.duration} captions={video.captions} />

      <StatTiles tiles={FALL_OF_THE_WALL.tiles} highlightThird />

      <StoryArticle leadDelay={0.4} lead={FALL_OF_THE_WALL.lead} more={FALL_OF_THE_WALL.more}>
        <SourceLine inArticle delay={0.6}>
          {FALL_OF_THE_WALL.source}
        </SourceLine>
      </StoryArticle>

      <NextCard placeId={placeId} facet="history" title={FALL_OF_THE_WALL.next.title} thumb={FALL_OF_THE_WALL.next.thumb} delay={0.66} />
    </>
  );
}
