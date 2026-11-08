import { AnimatePresence, motion, useMotionValue, useReducedMotionConfig, useTransform, type PanInfo } from 'motion/react';
import { useState } from 'react';
import checkDark from '../../../assets/v3/moments/check-dark.svg';
import crossOrange from '../../../assets/v3/moments/cross-orange.svg';
import flipWhite from '../../../assets/v3/moments/flip-white.svg';
import flipIcon from '../../../assets/v3/moments/flip.svg';
import iconPhrase from '../../../assets/v3/moments/phrase.svg';
import mascot from '../../../assets/v3/mascot.png';
import CountUp from '../../../components/reactbits/CountUp';
import { usePersistentStore } from '../../../data/persistentStore';
import { imageOf, recapOrder, type Fact, type RecapResult } from '../../../data/moments/moments';
import { recapStore } from '../../../data/moments/recapStore';
import { TOPIC_ICONS } from '../parts';
import { Ring } from '../RankSheet/RankSheet';
import Icon from '../../OnboardingPage/v3/icons';
import { ChartPaper } from '../../HuntPage/notebook/ChartPaper';
import Sheet from '../Sheet/Sheet';
import styles from './Recap.module.css';

const SWIPE = 90;

/**
 * M5 Recap: a Stack of flip cards (React Bits Stack idea, built on motion). Tap to flip; drag right if you knew it, left
 * to see it again (or use the buttons / arrow keys). Ends on a score ring. Results go to the recap store. On the chart:
 * each card is a parchment page with its photo taped on as a print. v2 (owner, 9 Nov 2026): the app's light chart paper behind
 * (Hunt's archive), the cards as v2 cards, v2 controls.
 */
export default function Recap({ facts, onClose }: { facts: readonly Fact[]; onClose: () => void }) {
  const [record, setRecord] = usePersistentStore(recapStore);
  const [deck, setDeck] = useState(() => recapOrder(facts, record.results));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [round, setRound] = useState<Record<string, RecapResult>>({});
  const [exitDir, setExitDir] = useState(1);
  const finished = pos >= deck.length;

  const decide = (result: RecapResult) => {
    const fact = deck[pos];
    if (!fact) return;
    setExitDir(result === 'knew' ? 1 : -1);
    const next = { ...round, [fact.id]: result };
    setRound(next);
    setFlipped(false);
    setPos(pos + 1);
    const knew = Object.values(next).filter((r) => r === 'knew').length;
    setRecord((prev) => ({
      results: { ...prev.results, [fact.id]: result },
      last: pos + 1 >= deck.length ? { knew, total: deck.length, at: Date.now() } : prev.last,
    }));
  };

  const again = () => {
    const missed = deck.filter((f) => round[f.id] === 'again');
    setDeck(missed);
    setRound({});
    setPos(0);
  };

  const knewCount = Object.values(round).filter((r) => r === 'knew').length;

  return (
    <Sheet title="Recap" hideTitle variant="full" onClose={onClose} className={styles.sheet}>
      <span className={styles.ground} aria-hidden="true">
        <ChartPaper variant="archive" />
      </span>
      <div
        className={styles.screen}
        onKeyDown={(e) => {
          if (finished) return;
          if (e.key === 'ArrowRight') decide('knew');
          else if (e.key === 'ArrowLeft') decide('again');
        }}
      >
        <div className={styles.top}>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close recap">
            <Icon name="close" size={20} />
          </button>
          <img src={mascot} alt="" width={34} height={34} className={styles.mascot} />
          <span className={styles.counter} aria-label={`${Math.min(pos, deck.length)} of ${deck.length} sorted`}>
            <Ring value={deck.length ? pos / deck.length : 0} size={40} stroke={2.5} track="rgba(35, 33, 29, 0.12)" />
            <span aria-hidden="true">
              {Math.min(pos, deck.length)}/{deck.length}
            </span>
          </span>
        </div>
        <div className={styles.segments} aria-hidden="true">
          {deck.map((f, i) => (
            <i key={f.id} className={i < pos ? (round[f.id] === 'knew' ? styles.segKnew : styles.segAgain) : undefined} />
          ))}
        </div>

        {finished ? (
          <Score knew={knewCount} total={deck.length} onAgain={knewCount < deck.length ? again : undefined} onDone={onClose} />
        ) : (
          <>
            <div className={styles.stack} aria-live="polite">
              <AnimatePresence custom={exitDir} initial={false}>
                {deck
                  .slice(pos, pos + 3)
                  .map((fact, k) => ({ fact, k }))
                  .reverse()
                  .map(({ fact, k }) => (
                    <StackCard key={fact.id} fact={fact} depth={k} flipped={k === 0 && flipped} onFlip={() => setFlipped((f) => !f)} onDecide={decide} />
                  ))}
              </AnimatePresence>
            </div>
            <div className={styles.controls}>
              <button type="button" className={styles.again} onClick={() => decide('again')} aria-label="See it again">
                <img src={crossOrange} alt="" width={22} height={22} />
              </button>
              <button
                type="button"
                className={styles.flip}
                onClick={() => setFlipped((f) => !f)}
                aria-label={flipped ? 'Show the question' : 'Show the answer'}
              >
                <img src={flipWhite} alt="" width={18} height={18} />
              </button>
              <button type="button" className={styles.knew} onClick={() => decide('knew')} aria-label="I knew it">
                <img src={checkDark} alt="" width={22} height={22} />
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

function StackCard({
  fact,
  depth,
  flipped,
  onFlip,
  onDecide,
}: {
  fact: Fact;
  depth: number;
  flipped: boolean;
  onFlip: () => void;
  onDecide: (r: RecapResult) => void;
}) {
  const reduce = useReducedMotionConfig();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const top = depth === 0;
  const image = fact.cardId ? imageOf(fact.cardId) : undefined;
  const icon = fact.kind === 'phrase' ? iconPhrase : fact.topic ? TOPIC_ICONS[fact.topic] : undefined;

  const end = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE || info.velocity.x > 600) onDecide('knew');
    else if (info.offset.x < -SWIPE || info.velocity.x < -600) onDecide('again');
  };

  return (
    <motion.div
      className={styles.card}
      style={{ x, rotate: top ? rotate : depth * (depth % 2 ? -3 : 3), zIndex: 10 - depth }}
      initial={reduce ? false : { scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: 1 }}
      exit="exit"
      variants={{
        exit: (dir: number) =>
          reduce ? { opacity: 0, transition: { duration: 0 } } : { x: dir * 420, opacity: 0, rotate: dir * 18, transition: { duration: 0.3 } },
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      drag={top && !reduce ? 'x' : false}
      dragSnapToOrigin
      onDragEnd={top ? end : undefined}
      aria-hidden={top ? undefined : true}
    >
      <motion.button
        type="button"
        className={styles.flipper}
        onClick={top ? onFlip : undefined}
        tabIndex={top ? 0 : -1}
        aria-label={top ? (flipped ? `Answer: ${fact.back}. Tap to see the question.` : `${fact.front} Tap to flip.`) : undefined}
        animate={{ rotateY: flipped && !reduce ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.45, ease: 'easeInOut' }}
      >
        <span className={`${styles.face} ${styles.front}`} style={reduce && flipped ? { visibility: 'hidden' } : undefined}>
          {image ? <img className={styles.photo} src={image.src} alt="" /> : <span className={styles.photoPaper} />}
          <span className={styles.chip}>
            {icon && <img src={icon} alt="" width={14} height={14} />}
            {fact.label}
          </span>
          <span className={styles.body}>
            <strong className={styles.question}>{fact.front}</strong>
            <span className={styles.hint}>
              <img src={flipIcon} alt="" width={14} height={14} />
              Tap to flip · swipe to sort
            </span>
          </span>
        </span>
        <span className={`${styles.face} ${styles.back}`} style={reduce ? { transform: 'none', visibility: flipped ? 'visible' : 'hidden' } : undefined}>
          <span className={styles.chip}>
            {icon && <img src={icon} alt="" width={14} height={14} />}
            {fact.label}
          </span>
          {fact.answer && <strong className={styles.answer}>{fact.answer}</strong>}
          <span className={styles.backText}>{fact.back}</span>
          <span className={styles.hint}>Right if you knew it · left to see it again</span>
        </span>
      </motion.button>
    </motion.div>
  );
}

function Score({ knew, total, onAgain, onDone }: { knew: number; total: number; onAgain?: () => void; onDone: () => void }) {
  const percent = total ? Math.round((knew / total) * 100) : 0;
  return (
    <div className={styles.score}>
      <span className={styles.scoreRing}>
        <Ring value={total ? knew / total : 0} size={168} stroke={10} track="rgba(35, 33, 29, 0.1)" />
        <span className={styles.scoreValue}>
          <CountUp to={percent} duration={1} />%
        </span>
      </span>
      <h3 className={styles.scoreTitle}>
        You knew {knew} of {total}
      </h3>
      <p className={styles.scoreLine}>
        {knew === total ? 'Every one. Open another card to add new facts.' : `${total - knew} to see again. They come first next time.`}
      </p>
      <div className={styles.scoreActions}>
        {onAgain && (
          <button type="button" className={styles.secondary} onClick={onAgain}>
            Go again
          </button>
        )}
        <button type="button" className={styles.primary} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
