import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import inkDrop from '../../../assets/v3/moments/ink-drop.svg';
import lockIcon from '../../../assets/v3/moments/lock.svg';
import iconAll from '../../../assets/v3/moments/filter-all.svg';
import { imageOf, topicOfCard, type Stamp as StampData } from '../../../data/moments/moments';
import { paths } from '../../../routes';
import Icon from '../../OnboardingPage/v3/icons';
import { TOPIC_ICONS, shapeAt, stampDate } from '../parts';
import Stamp from '../Stamp/Stamp';
import styles from './Passport.module.css';

const PER_PAGE = 4;

interface PassportProps {
  stamps: readonly StampData[];
  /** sg-100 progress: check-ins in the collection. */
  progress: { visited: number; total: number } | null;
  /** YYYY-MM-DD, for the TODAY label. */
  today: string;
  onOpen: (stamp: StampData) => void;
}

/** M1: "My places" passport (a parchment page bound on the left), four stamps a page; swipe or use the arrows for the next page. */
export default function Passport({ stamps, progress, today, onOpen }: PassportProps) {
  const reduce = useReducedMotionConfig();
  const pages = Math.max(1, Math.ceil(stamps.length / PER_PAGE));
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const current = Math.min(page, pages - 1);
  const go = (next: number) => {
    if (next < 0 || next >= pages) return;
    setDirection(next > current ? 1 : -1);
    setPage(next);
  };
  const collected = stamps.filter((s) => s.collected).length;
  const shown = stamps.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  return (
    <section className={styles.section} aria-labelledby="passport-heading">
      <div className={styles.book}>
        <span className={styles.spine} aria-hidden="true" />
        <div className={styles.heading}>
          <h2 id="passport-heading">My places</h2>
          <span className={styles.rule} aria-hidden="true" />
          {progress && (
            <Link to={paths.today} className={styles.count} aria-label={`${progress.visited} of ${progress.total} places checked in. Open Nearby`}>
              {progress.visited} / {progress.total}
            </Link>
          )}
        </div>
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.ul
            key={current}
            className={styles.grid}
            aria-label={`Passport page ${current + 1} of ${pages}`}
            custom={direction}
            initial={reduce ? false : { x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { x: direction * -60, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            drag={pages > 1 && !reduce ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -48) go(current + 1);
              else if (info.offset.x > 48) go(current - 1);
            }}
          >
            {shown.map((stamp, i) => {
              const index = current * PER_PAGE + i;
              return (
                <li key={stamp.subject.id} className={styles.cell}>
                  {stamp.collected ? (
                    <CollectedStamp stamp={stamp} index={index} today={today} onOpen={() => onOpen(stamp)} />
                  ) : (
                    <Outline stamp={stamp} onOpen={() => onOpen(stamp)} />
                  )}
                </li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </div>

      <div className={styles.footer}>
        {collected === 0 ? (
          <p>
            <img src={inkDrop} alt="" width={13} height={14} />
            <span>
              No stamps yet. Check in at a place in{' '}
              <Link to={paths.today} className={styles.link}>
                Nearby
              </Link>{' '}
              to collect one.
            </span>
          </p>
        ) : (
          <span />
        )}
        {pages > 1 && (
          <div className={styles.pager}>
            <button type="button" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Previous passport page">
              <Icon name="back" size={16} />
            </button>
            <span className={styles.dots} aria-hidden="true">
              {Array.from({ length: pages }, (_, i) => (
                <i key={i} className={i === current ? styles.dotOn : undefined} />
              ))}
            </span>
            <button type="button" onClick={() => go(current + 1)} disabled={current === pages - 1} aria-label="Next passport page">
              <Icon name="chevron" size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function CardDots({ stamp, dark }: { stamp: StampData; dark?: boolean }) {
  const opened = new Set(stamp.openedIds);
  return (
    <span className={styles.cardDots} aria-hidden="true">
      {stamp.subject.cards.map((card) => {
        const topic = topicOfCard(card);
        return (
          <span key={card.article.id} className={opened.has(card.article.id) ? `${styles.cardDot} ${dark ? styles.dotDark : styles.dotOpen}` : styles.cardDot}>
            <img src={topic ? TOPIC_ICONS[topic] : iconAll} alt="" />
          </span>
        );
      })}
    </span>
  );
}

function CollectedStamp({ stamp, index, today, onOpen }: { stamp: StampData; index: number; today: string; onOpen: () => void }) {
  const isToday = stamp.lastCheckIn === today;
  const total = stamp.subject.cards.length;
  return (
    <button
      type="button"
      className={styles.place}
      onClick={onOpen}
      aria-label={
        total > 0
          ? `${stamp.subject.short}, ${stamp.openedIds.length} of ${total} cards opened. Open this stamp.`
          : `${stamp.subject.short}, checked in, no cards here yet. Open this stamp.`
      }
    >
      <span className={shapeAt(index) === 'card' ? styles.stampCard : styles.stampRound}>
        <Stamp
          shape={shapeAt(index)}
          name={stamp.subject.short}
          date={stampDate(stamp.checkedInOn)}
          ink={stamp.ink}
          thump={isToday}
          delay={(index % PER_PAGE) * 0.08}
        />
        {isToday && <span className={styles.today}>TODAY</span>}
      </span>
      <CardDots stamp={stamp} dark={index % 2 === 1} />
    </button>
  );
}

function Outline({ stamp, onOpen }: { stamp: StampData; onOpen: () => void }) {
  const photo = stamp.subject.cards.map((c) => imageOf(c.article.id)).find(Boolean);
  return (
    <button type="button" className={`${styles.place} ${styles.outline}`} onClick={onOpen} aria-label={`${stamp.subject.short}: no stamp yet. See its cards.`}>
      <span className={styles.emptyStamp}>
        {photo && <img src={photo.src} alt="" className={styles.emptyPhoto} />}
        <img src={lockIcon} alt="" className={styles.lock} width={18} height={18} />
      </span>
      <span className={styles.outlineName}>{stamp.subject.short}</span>
    </button>
  );
}
