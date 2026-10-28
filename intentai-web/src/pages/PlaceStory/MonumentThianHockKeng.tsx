import { InfoCard, NextCard, SampleVideo, SourceLine, StatTiles, StoryArticle, StoryHeader } from '../../components/story';
import { THIAN_HOCK_KENG } from '../../data/stories/chinatown';
import styles from './MonumentThianHockKeng.module.css';
import { ThenNow } from './ThenNow';

interface MonumentThianHockKengProps {
  placeId: string;
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Monument card 2 of 4 for Chinatown: Thian Hock Keng, with the then/now comparison. */
export default function MonumentThianHockKeng({ placeId }: MonumentThianHockKengProps) {
  const { video, thenNow } = THIAN_HOCK_KENG;
  // One credit per photo: poster, then, now.
  const credits = [video.poster.credit, thenNow.then.credit, thenNow.now.credit].join('; ');

  return (
    <>
      <StoryHeader kicker={THIAN_HOCK_KENG.kicker} icon="monument" title={THIAN_HOCK_KENG.title} subtitle={THIAN_HOCK_KENG.subtitle} />

      <SampleVideo poster={video.poster} title={video.title} duration={video.duration} captions={video.captions} top={16} />

      <StatTiles tiles={THIAN_HOCK_KENG.tiles} highlightThird label="Key dates" />

      <ThenNow />

      <StoryArticle top={16} leadDelay={0.5} lead={THIAN_HOCK_KENG.lead} more={THIAN_HOCK_KENG.more} />

      <InfoCard label="Look for" kicker="LOOK FOR" kickerDelay={0.7}>
        <ul className={styles.rows}>
          {THIAN_HOCK_KENG.lookFor.map((row, i) => (
            <li key={row.text} className={`a-row ${styles.row}`} style={{ animationDelay: `${[0.76, 0.84][i]}s` }}>
              <span aria-hidden="true" className={styles.icon}>
                <svg {...iconProps}>
                  {row.icon === 'roof' ? (
                    <>
                      <path d="M3 12 12 5l9 7" />
                      <path d="M6 10v9h12v-9" />
                    </>
                  ) : (
                    <path d="M4 8h16M4 16h16M8 4v16M16 4v16" />
                  )}
                </svg>
              </span>
              {row.text}
            </li>
          ))}
        </ul>
      </InfoCard>

      <SourceLine delay={0.9}>{`Source: National Heritage Board, Roots.gov.sg · Photos: ${credits}`}</SourceLine>

      <NextCard placeId={placeId} facet="festival" title={THIAN_HOCK_KENG.next.title} thumb={THIAN_HOCK_KENG.next.thumb} delay={0.96} top={16} />
    </>
  );
}
