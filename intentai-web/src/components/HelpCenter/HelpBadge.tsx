// The Help Center's door, top left of every tab: a capsule. The right end is the FindSG lion's circle; from its top and
// bottom points two level lines run left a short way and an arc of the same radius closes the end. The "i" sits in
// the narrow band that shows before the lion, in another colour. Inside the open panel the same mark shows a × to close.
import type { ReactNode, Ref } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import logo from '../../assets/avatar-logo.png';
import styles from './HelpCenter.module.css';

const R = 21; // the lion's circle (42px with its rim)
const RUN = 17; // how far the level lines run left of the lion's centre
const L = 23; // centre of the closing arc on the left
const LION = L + RUN; // 40: the lion's centre
const W = LION + R + 2; // 63: the mark's width
/** Middle of the band that shows before the lion: where the "i" goes. */
const G = (L - R + LION - R) / 2;
export const HULL = `M${LION} ${23 - R} H${L} A${R} ${R} 0 0 0 ${L} ${23 + R} H${LION} A${R} ${R} 0 0 0 ${LION} ${23 - R} Z`;

export function HelpMark({ glyph = 'info', ring }: { glyph?: 'info' | 'close'; ring?: ReactNode }) {
  const reduce = useReducedMotion();
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
        <path d={HULL} className={styles.hullFill} />
        <path d={HULL} className={styles.hullEdge} />
        <motion.g
          key={glyph}
          initial={reduce ? false : { rotate: glyph === 'close' ? -90 : 90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          style={{ originX: `${G}px`, originY: '23px' }}
          className={styles.glyph}
        >
          {glyph === 'info' ? (
            <>
              <circle cx={G} cy={16.4} r={1.8} />
              <path d={`M${G} 21v8.6`} />
            </>
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
