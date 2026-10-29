import { useState } from 'react';
import { InfoCard, NextCard, SampleVideo, SourceLine, StatTiles, StoryArticle, StoryHeader } from '../../components/story';
import { LUNAR_NEW_YEAR } from '../../data/stories/chinatown';
import { withNextCredit } from '../../data/stories/places';
import styles from './FestivalLunarNewYear.module.css';

interface FestivalLunarNewYearProps {
  placeId: string;
}

/** Festival card 3 of 4 for Chinatown: Lunar New Year. */
export default function FestivalLunarNewYear({ placeId }: FestivalLunarNewYearProps) {
  const { video, nextTime } = LUNAR_NEW_YEAR;
  // Visit-local, as the canvas: the reminder is not stored or scheduled.
  const [reminded, setReminded] = useState(false);

  return (
    <>
      <StoryHeader kicker={LUNAR_NEW_YEAR.kicker} icon="festival" title={LUNAR_NEW_YEAR.title} subtitle={LUNAR_NEW_YEAR.subtitle} />

      <SampleVideo poster={video.poster} title={video.title} duration={video.duration} captions={video.captions} top={16} />

      <StatTiles tiles={LUNAR_NEW_YEAR.tiles} highlightThird duration={1200} />

      <StoryArticle leadDelay={0.4} lead={LUNAR_NEW_YEAR.lead} more={LUNAR_NEW_YEAR.more} />

      <InfoCard label={nextTime.label} kicker={nextTime.kicker} delay={0.62} top={18}>
        <div className={styles.when}>
          <span aria-hidden="true" className={styles.date}>
            <span className={styles.month}>{nextTime.month}</span>
            <span className={styles.day}>{nextTime.day}</span>
          </span>
          <span className={styles.text}>
            <span className={styles.dateLine}>{nextTime.date}</span>
            <span className={styles.note}>{nextTime.note}</span>
          </span>
        </div>
        <button
          type="button"
          className={`press ${styles.remind} ${reminded ? styles.on : ''}`}
          onClick={() => setReminded((r) => !r)}
        >
          {reminded ? (
            <svg className="a-pop" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9.5" fill="#E4671F" />
              <path d="M8 12.5l2.7 2.7L16 9.8" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E4671F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15Z" />
              <path d="M10 20.5a2 2 0 0 0 4 0" />
            </svg>
          )}
          {reminded ? nextTime.reminded : nextTime.remind}
        </button>
      </InfoCard>

      <SourceLine delay={0.68}>{withNextCredit(LUNAR_NEW_YEAR.source, LUNAR_NEW_YEAR.next.credit)}</SourceLine>

      <NextCard placeId={placeId} facet="history" title={LUNAR_NEW_YEAR.next.title} thumb={LUNAR_NEW_YEAR.next.thumb} delay={0.74} top={16} />
    </>
  );
}
