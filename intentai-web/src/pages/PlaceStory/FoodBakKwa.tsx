import { Link } from 'react-router-dom';
import { InfoCard, NextCard, SampleVideo, SourceLine, StatTiles, StoryArticle, StoryHeader } from '../../components/story';
import { BAK_KWA } from '../../data/stories/chinatown';
import { paths } from '../../routes';
import styles from './FoodBakKwa.module.css';

interface FoodBakKwaProps {
  placeId: string;
}

const iconProps = {
  'aria-hidden': true,
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function StepIcon({ name }: { name: 'marinate' | 'dry' | 'grill' }) {
  if (name === 'marinate') {
    return (
      <svg {...iconProps}>
        <path d="M4 14h16l-1.5 6h-13Z" />
        <path d="M8 10c0-2 2-2 2-4M12 10c0-2 2-2 2-4M16 10c0-2 2-2 2-4" />
      </svg>
    );
  }
  if (name === 'dry') {
    return (
      <svg {...iconProps}>
        <rect x="5" y="5" width="14" height="14" rx="1.5" />
        <path d="M5 10h14M5 15h14" />
      </svg>
    );
  }
  return (
    <svg {...iconProps}>
      <path d="M3 12h18" />
      <path d="M5 16h14M7 20h10" />
      <path d="M12 3c1.5 2 1.5 3.5 0 5.5" />
    </svg>
  );
}

/** Food card 1 of 4 for Chinatown: bak kwa. */
export default function FoodBakKwa({ placeId }: FoodBakKwaProps) {
  const { video, nearby } = BAK_KWA;
  const tip = nearby.tip;

  return (
    <>
      <StoryHeader kicker={BAK_KWA.kicker} icon="food" title={BAK_KWA.title} subtitle={BAK_KWA.subtitle} />

      <SampleVideo poster={video.poster} title={video.title} duration={video.duration} captions={video.captions} top={16} />

      <StatTiles tiles={BAK_KWA.tiles} highlightThird />

      <section aria-label="How it is made" className={styles.steps}>
        <p className={`a-up ${styles.kicker}`} style={{ animationDelay: '.45s' }}>
          HOW IT’S MADE
        </p>
        <ol className={styles.list}>
          {BAK_KWA.steps.map((step, i) => (
            <li
              key={step.name}
              className={`a-step ${styles.step} ${step.icon === 'grill' ? styles.grill : ''}`}
              style={{ animationDelay: `${[0.55, 0.7, 0.85][i]}s` }}
            >
              {step.icon === 'grill' && (
                <span aria-hidden="true" className={styles.puffs}>
                  <span className={`smoke ${styles.puff}`} />
                  <span className={`smoke ${styles.puff}`} style={{ animationDelay: '.8s' }} />
                </span>
              )}
              <span aria-hidden="true" className={styles.icon}>
                <StepIcon name={step.icon} />
              </span>
              <span className={styles.stepName}>{step.name}</span>
              <span className={styles.stepSub}>{step.sub}</span>
            </li>
          ))}
        </ol>
      </section>

      <StoryArticle top={16} leadDelay={0.5} lead={BAK_KWA.lead} more={BAK_KWA.more} />

      <InfoCard label="Try it nearby" kicker="TRY IT NEARBY" delay={0.72}>
        <div className={styles.shop}>
          <span aria-hidden="true" className={styles.pinTile}>
            <svg className="a-pin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span className={styles.shopText}>
            <span className={styles.shopName}>{nearby.name}</span>
            <span className={styles.shopAddress}>{nearby.address}</span>
          </span>
        </div>
        <p className={styles.blurb}>{nearby.blurb}</p>
        <div className={styles.chips}>
          {nearby.chips.map((c) => (
            <span key={c} className={styles.chip}>
              {c}
            </span>
          ))}
        </div>

        <Link to={paths.community} className={`press ${styles.tip}`} aria-label={tip.label}>
          <span className={styles.tipHead}>
            <span aria-hidden="true" className={styles.avatar}>
              {tip.initial}
            </span>
            <span className={styles.who}>
              <b>{tip.name}</b> <span className={styles.role}>{tip.role}</span>
            </span>
            <span className={styles.badge}>
              <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {tip.badge}
            </span>
          </span>
          <span className={styles.quote}>{tip.quote}</span>
          <span className={styles.tipFoot}>
            <span>{tip.meta}</span>
            <span className={styles.cta}>
              {tip.cta}
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </span>
        </Link>

        <Link to={paths.today} state={{ focusPlace: placeId, showMap: true }} className={`press ${styles.map}`}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4B389" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
            <circle cx="12" cy="10" r="2.3" />
          </svg>
          {nearby.mapButton}
        </Link>
      </InfoCard>

      <SourceLine delay={0.78}>{BAK_KWA.source}</SourceLine>

      <NextCard placeId={placeId} facet="monument" title={BAK_KWA.next.title} thumb={BAK_KWA.next.thumb} delay={0.84} top={16} />
    </>
  );
}
