import { motion, useReducedMotionConfig } from 'motion/react';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import checkWhite from '../../../assets/v3/moments/check-white.svg';
import inkDrop from '../../../assets/v3/moments/ink-drop.svg';
import lockIcon from '../../../assets/v3/moments/lock.svg';
import iconAll from '../../../assets/v3/moments/filter-all.svg';
import ClickSpark from '../../../components/reactbits/ClickSpark';
import CountUp from '../../../components/reactbits/CountUp';
import { nearbyHref } from '../../../data/cultureLinks';
import { imageOf, longDate, stampVisits, topicOfCard, TOPIC_LABELS, type Stamp as StampData } from '../../../data/moments/moments';
import { usePersistentStore } from '../../../data/persistentStore';
import { explorePersonalStore } from '../../../data/stores';
import { markCardOpened } from '../../../data/openedCards';
import type { Card } from '../../AskPage/cards';
import { paths } from '../../../routes';
import { TOPIC_ICONS, shapeAt, stampDate } from '../parts';
import Sheet from '../Sheet/Sheet';
import Stamp from '../Stamp/Stamp';
import styles from './PlaceSheet.module.css';

interface PlaceSheetProps {
  stamp: StampData;
  /** Position in the passport (stamp shape). */
  index: number;
  onClose: () => void;
}

/** M2: tap a stamp → its cards fan out, opened ones in colour, the rest locked, with the next card to add ink. */
export default function PlaceSheet({ stamp, index, onClose }: PlaceSheetProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotionConfig();
  const leaving = useRef(false);
  const { subject } = stamp;
  const total = subject.cards.length;
  const opened = new Set(stamp.openedIds);
  const percent = Math.round(stamp.ink * 100);
  const [personal] = usePersistentStore(explorePersonalStore);
  const visits = stampVisits(stamp, personal);

  const openCard = (card: Card, wait = 0) => {
    if (leaving.current) return;
    leaving.current = true;
    markCardOpened(card.article.id);
    // Let the ink fill and the spark play before the card page opens.
    window.setTimeout(() => navigate(paths.card(card.article.id)), reduce ? 0 : wait);
  };

  return (
    <Sheet title={subject.short} hideTitle onClose={onClose}>
      <div className={styles.top}>
        {stamp.collected ? (
          <span className={shapeAt(index) === 'card' ? styles.bigCard : styles.bigRound}>
            <Stamp shape={shapeAt(index)} name={subject.short} date={stampDate(stamp.checkedInOn)} ink={stamp.ink} />
          </span>
        ) : (
          <span className={styles.bigOutline} aria-hidden="true">
            <img src={lockIcon} alt="" width={22} height={22} />
          </span>
        )}
        <p className={styles.name} aria-hidden="true">
          {subject.short}
        </p>
        <p className={styles.meta}>
          <img src={inkDrop} alt="" width={13} height={14} />
          {stamp.collected && stamp.checkedInOn && total === 0 ? (
            <span>Checked in {longDate(stamp.checkedInOn)} · no culture cards here yet</span>
          ) : stamp.collected && stamp.checkedInOn ? (
            <span>
              Checked in {longDate(stamp.checkedInOn)} · ink <CountUp to={percent} duration={0.8} />%
            </span>
          ) : (
            <span>Not checked in yet · {total === 1 ? '1 card' : `${total} cards`} here</span>
          )}
        </p>
      </div>

      {visits.length > 0 && (
        <ul className={styles.visits} aria-label="Places you checked in at">
          {visits.map((v) => (
            <li key={v.key}>
              <Link to={paths.nearbyPlace(v.key)} className={styles.visit}>
                <span className={styles.visitName}>{v.name}</span>
                {v.on && <span className={styles.visitDate}>{longDate(v.on)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > 0 ? (
        <CardFan cards={subject.cards} opened={opened} onOpen={(card) => openCard(card)} />
      ) : (
        <p className={styles.note}>IntentAI has no culture cards for {subject.name} yet, so this stamp has no ink to add. The check-in is still yours.</p>
      )}

      {!stamp.collected && (
        <p className={styles.note}>Check in at a place in {subject.name} in Nearby to collect this stamp. Cards you open here add ink once it’s yours.</p>
      )}

      <div className={styles.actions}>
        {total > 0 ? (
          <Link to={paths.place(subject.id)} className={styles.secondary}>
            Open place
          </Link>
        ) : (
          <Link to={nearbyHref({ kind: 'area', id: subject.id, label: subject.name })} className={styles.secondary}>
            Open in Nearby
          </Link>
        )}
        {!stamp.collected ? (
          <Link to={nearbyHref({ kind: 'area', id: subject.id, label: subject.name })} className={styles.primary}>
            Check in in Nearby
          </Link>
        ) : stamp.next ? (
          <ClickSpark className={styles.sparkWrap} sparkColor={['#e3661f', '#f4b389', '#a3400a']} sparkCount={10} sparkRadius={26} sparkSize={8}>
            <button type="button" className={styles.primary} onClick={() => openCard(stamp.next!, 900)}>
              <img src={inkDrop} alt="" width={13} height={14} />
              <span className={styles.addInk}>
                Add ink: <strong>{stamp.next.article.title}</strong>
              </span>
            </button>
          </ClickSpark>
        ) : total > 0 ? (
          <p className={styles.full}>All {total} cards opened</p>
        ) : null}
      </div>
    </Sheet>
  );
}

/** A small BounceCards-style fan (motion): the cards spring out from a stack. Reduced motion: they're just there. */
function CardFan({ cards, opened, onOpen }: { cards: readonly Card[]; opened: Set<string>; onOpen: (card: Card) => void }) {
  const reduce = useReducedMotionConfig();
  const n = cards.length;
  const step = n <= 3 ? 92 : n === 4 ? 66 : 52;
  return (
    <ul className={styles.fan} aria-label="Cards of this place">
      {cards.map((card, i) => {
        const mid = i - (n - 1) / 2;
        const isOpen = opened.has(card.article.id);
        const image = imageOf(card.article.id);
        const topic = topicOfCard(card);
        return (
          <motion.li
            key={card.article.id}
            className={styles.fanItem}
            style={{ zIndex: 10 - Math.abs(Math.round(mid)) }}
            initial={reduce ? false : { x: 0, rotate: 0, scale: 0.7, opacity: 0 }}
            animate={{ x: mid * step, rotate: mid * 6, y: Math.abs(mid) * 6, scale: 1, opacity: 1 }}
            whileHover={reduce ? undefined : { y: -8, scale: 1.05, zIndex: 20 }}
            whileFocus={reduce ? undefined : { y: -8, scale: 1.05, zIndex: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: reduce ? 0 : 0.05 + i * 0.06 }}
          >
            <button
              type="button"
              className={isOpen ? styles.fanCard : `${styles.fanCard} ${styles.locked}`}
              onClick={() => onOpen(card)}
              aria-label={`${card.article.title}${topic ? `, ${TOPIC_LABELS[topic]}` : ''}: ${isOpen ? 'opened' : 'not opened yet'}. Open card.`}
            >
              {image ? (
                <img className={styles.fanPhoto} src={image.src} alt="" />
              ) : (
                <span className={styles.fanPaper}>
                  <img src={topic ? TOPIC_ICONS[topic] : iconAll} alt="" width={26} height={26} />
                </span>
              )}
              <span className={styles.fanShade} />
              <span className={styles.fanTitle}>{card.article.title}</span>
              {isOpen ? (
                <span className={styles.fanCheck}>
                  <img src={checkWhite} alt="" width={10} height={10} />
                </span>
              ) : (
                <span className={styles.fanLock}>
                  <img src={lockIcon} alt="" width={14} height={14} />
                </span>
              )}
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
