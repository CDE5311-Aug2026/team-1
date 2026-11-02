// The Help Center's door, top left of every tab: the FindSG lion with a second, smaller circle joined to it by two
// tangent lines, in another colour, holding an "i". Inside the open panel the same mark shows a × to close.
import type { ReactNode, Ref } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import logo from '../../assets/avatar-logo.png';
import styles from './HelpCenter.module.css';

// Two circles on one line: the lion (r 21 at x 23) and the info bulb (r 13 at x 60). The outer tangents touch both
// at ±acos((r1 − r2) / d) from the line between their centres.
const R1 = 21;
const R2 = 13;
const C1 = 23;
const C2 = 60;
const A = Math.acos((R1 - R2) / (C2 - C1));
const p = (c: number, r: number, s: number) => `${(c + r * Math.cos(A)).toFixed(2)} ${(23 + s * r * Math.sin(A)).toFixed(2)}`;
export const HULL =
  `M${p(C1, R1, -1)} L${p(C2, R2, -1)} A${R2} ${R2} 0 0 1 ${p(C2, R2, 1)} ` + `L${p(C1, R1, 1)} A${R1} ${R1} 0 1 1 ${p(C1, R1, -1)} Z`;

export function HelpMark({ glyph = 'info', ring }: { glyph?: 'info' | 'close'; ring?: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <span className={styles.mark} aria-hidden="true">
      <motion.svg
        className={styles.hull}
        viewBox="0 0 78 46"
        initial={reduce ? false : { scaleX: 0.5, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.15 }}
        style={{ originX: 0.3 }}
      >
        <path d={HULL} className={styles.hullFill} />
        <path d={HULL} className={styles.hullEdge} />
        <motion.g
          key={glyph}
          initial={reduce ? false : { rotate: glyph === 'close' ? -90 : 90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          style={{ originX: `${C2}px`, originY: '23px' }}
          className={styles.glyph}
        >
          {glyph === 'info' ? (
            <>
              <circle cx={C2} cy={17.2} r={1.9} />
              <path d={`M${C2 - 1.6} 21.4h1.6v8.2`} />
            </>
          ) : (
            <path d={`M${C2 - 4.2} 18.8l8.4 8.4M${C2 + 4.2} 18.8l-8.4 8.4`} />
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
