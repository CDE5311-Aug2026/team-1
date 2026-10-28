import { Link } from 'react-router-dom';
import { InfoCard, NextCard, SourceLine, StoryArticle, StoryHeader, StoryIcon, useCountUp } from '../../components/story';
import { SPREAD } from '../../data/stories/berlin';
import { paths } from '../../routes';
import styles from './FoodSpread.module.css';
import { PhotoCarousel } from './PhotoCarousel';

interface FoodSpreadProps {
  placeId: string;
}

const svgProps = {
  'aria-hidden': true,
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Food card 1 of 4 for Berlin Wall Fragments: The Spread, a café nearby. */
export default function FoodSpread({ placeId }: FoodSpreadProps) {
  const km = SPREAD.route.km * useCountUp(900, 1200);
  const { visit } = SPREAD;

  return (
    <>
      <StoryHeader kicker={SPREAD.kicker} icon="food" title={SPREAD.title} subtitle={SPREAD.subtitle} />

      <PhotoCarousel
        label={SPREAD.carouselLabel}
        groups={SPREAD.groups}
        slides={SPREAD.slides.map((s) => ({
          group: s.group,
          src: s.image.src,
          alt: s.image.alt,
          title: s.title,
          desc: s.desc,
        }))}
      />

      <StoryArticle top={12} leadDelay={0.35} lead={SPREAD.lead} more={SPREAD.more} />

      <InfoCard label="Where it is" kicker="FROM THE WALL" delay={0.4}>
        <div className={styles.route}>
          <span aria-hidden="true" className={`${styles.endpoint} ${styles.from}`}>
            <StoryIcon name="monument" size={16} />
          </span>
          <svg aria-hidden="true" className={styles.line} width="100%" height="10" viewBox="0 0 120 10" preserveAspectRatio="none">
            <path className="a-dash" d="M0 5 H120" stroke="#E4671F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </svg>
          <span aria-hidden="true" className={`a-pin ${styles.endpoint} ${styles.to}`}>
            <StoryIcon name="food" size={16} />
          </span>
        </div>
        <div className={styles.labels}>
          <span>{SPREAD.route.from}</span>
          <span data-testid="route-km" className={styles.km}>{`~${km.toFixed(1)} km`}</span>
          <span>{SPREAD.route.to}</span>
        </div>
      </InfoCard>

      <InfoCard
        label="Visit"
        kicker="VISIT"
        delay={0.5}
        top={12}
        aside={
          <span className={styles.open}>
            <span aria-hidden="true" className={styles.dot}>
              <span className={`pulse ${styles.dotPulse}`} />
              <span className={styles.dotCore} />
            </span>
            {visit.openNow}
          </span>
        }
      >
        <div className={styles.row} style={{ marginTop: 12 }}>
          <span aria-hidden="true" className={styles.tile}>
            <svg {...svgProps}>
              <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span className={styles.address}>
            <b>{visit.addressLine}</b>
            <br />
            {visit.addressRest}
          </span>
        </div>
        <div className={styles.row}>
          <span aria-hidden="true" className={styles.tile}>
            <svg {...svgProps}>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          </span>
          <dl className={styles.hours}>
            {visit.hours.map((h) => (
              <div key={h.days} className={`${styles.hoursRow} ${h.today ? styles.today : ''}`}>
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={styles.row}>
          <span aria-hidden="true" className={styles.tile}>
            <svg {...svgProps}>
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
            </svg>
          </span>
          <span className={styles.phone}>{visit.phone.text}</span>
        </div>
        <div className={styles.buttons}>
          <Link to={paths.today} state={{ focusPlace: placeId }} className={`press ${styles.directions}`}>
            Directions from the Wall
          </Link>
          <a href={visit.phone.href} className={`press ${styles.call}`} aria-label={`Call The Spread, ${visit.phone.text}`}>
            <svg {...svgProps} width={18} height={18} strokeWidth={2}>
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
            </svg>
          </a>
        </div>
      </InfoCard>

      <SourceLine delay={0.6}>{SPREAD.source}</SourceLine>

      <NextCard placeId={placeId} facet="monument" title={SPREAD.next.title} thumb={SPREAD.next.thumb} delay={0.66} top={16} />
    </>
  );
}
