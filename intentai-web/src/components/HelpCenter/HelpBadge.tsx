// The Help Center's door, top left of every tab: a capsule. The right end is the FindSG lion's circle; from its top and
// bottom points two level lines run left a short way and an arc of the same radius closes the end. The assistant's
// sparkle sits in the band that shows before the lion, in deep blue against the gold, so it reads as its own thing
// beside the orange lion. Inside the open panel the same mark shows a × to close.
import { useId, type ReactNode, type Ref } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import logo from '../../assets/avatar-logo.png';
import styles from './HelpCenter.module.css';

const R = 21; // the lion's circle (42px with its rim)
const RUN = 28; // how far the level lines run left of the lion's centre
const L = 23; // centre of the closing arc on the left
const LION = L + RUN; // 51: the lion's centre
const W = LION + R + 2; // 74: the mark's width
/** Middle of the band that shows before the lion: where the sparkle goes. */
const G = (L - R + LION - R) / 2;
export const HULL = `M${LION} ${23 - R} H${L} A${R} ${R} 0 0 0 ${L} ${23 + R} H${LION} A${R} ${R} 0 0 0 ${LION} ${23 - R} Z`;

/** A four-pointed star with sharp points. */
const star = (x: number, y: number, r: number) => {
  const k = r * 0.16;
  return `M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`;
};

export function HelpMark({ glyph = 'spark', ring }: { glyph?: 'spark' | 'close'; ring?: ReactNode }) {
  const reduce = useReducedMotion();
  const gold = `hull${useId().replace(/\W/g, '')}`;
  return (
    <span className={styles.mark} aria-hidden="true">
      <motion.svg
        className={styles.hull}
        viewBox={`0 0 ${W} 46`}
        initial={reduce ? false : { scaleX: 0.5, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.15 }}
        style={{ originX: 0.7 }}
      >
        <defs>
          <linearGradient id={gold} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--hull-a)" />
            <stop offset="1" stopColor="var(--hull-b)" />
          </linearGradient>
        </defs>
        <path d={HULL} fill={`url(#${gold})`} />
        <path d={HULL} className={styles.hullEdge} />
        <motion.g
          key={glyph}
          initial={reduce ? false : { rotate: glyph === 'close' ? -90 : 90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          style={{ originX: `${G}px`, originY: '23px' }}
          className={styles.glyph}
        >
          {glyph === 'spark' ? (
            <path className={styles.spark} d={`${star(G - 2, 24.5, 8.5)}${star(G + 6, 14.5, 3.8)}`} />
          ) : (
            <path d={`M${G - 3.4} 19.6l6.8 6.8M${G + 3.4} 19.6l-6.8 6.8`} />
          )}
        </motion.g>
      </motion.svg>
      {ring && <span className={styles.ring}>{ring}</span>}
      <span className={styles.lion}>
        <img src={logo} alt="" draggable={false} />
      </span>
    </span>
  );
}

/** The badge in the top bars. */
export default function HelpBadge({
  onOpen,
  ring,
  buttonRef,
}: {
  onOpen: (el: HTMLElement) => void;
  ring?: ReactNode;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <motion.button
      ref={buttonRef}
      type="button"
      className={styles.badge}
      aria-label="Help Center"
      aria-haspopup="dialog"
      onClick={(e) => onOpen(e.currentTarget)}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      <HelpMark ring={ring} />
    </motion.button>
  );
}
