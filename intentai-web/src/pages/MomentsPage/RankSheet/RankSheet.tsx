import { motion, useReducedMotionConfig } from 'motion/react';
import bubble from '../../../assets/v3/moments/bubble.svg';
import clock from '../../../assets/v3/moments/clock-white.svg';
import drop from '../../../assets/v3/moments/drop-white.svg';
import grid from '../../../assets/v3/moments/grid.svg';
import pin from '../../../assets/v3/moments/pin.svg';
import sparkle from '../../../assets/v3/moments/sparkle-white.svg';
import star from '../../../assets/v3/moments/star.svg';
import CountUp from '../../../components/reactbits/CountUp';
import { RANKS, type Badge, type Rank } from '../../../data/moments/moments';
import Sheet from '../Sheet/Sheet';
import styles from './RankSheet.module.css';

const BADGE_ICONS: Record<Badge['id'], string> = {
  'first-stamp': drop,
  'local-tip': bubble,
  'two-districts': pin,
  'festival-fan': sparkle,
  'full-set': grid,
  historian: clock,
};

/** A ring that fills to `value` (0–1). */
export function Ring({ value, size, stroke, track = '#f3d5c0', color = '#e3661f', className }: { value: number; size: number; stroke: number; track?: string; color?: string; className?: string }) {
  const reduce = useReducedMotionConfig();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={reduce ? false : { strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))) }}
        transition={reduce ? { duration: 0 } : { duration: 0.9, ease: 'easeOut', delay: 0.15 }}
      />
    </svg>
  );
}

/** M4: rank Visitor → Explorer → Insider → Local, and six badges with progress rings. */
export default function RankSheet({ rank, badges, onClose }: { rank: Rank; badges: readonly Badge[]; onClose: () => void }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <Sheet title={`Your rank: ${rank.step.label}`} hideTitle onClose={onClose}>
      <div className={styles.head}>
        <span className={styles.ring}>
          <Ring value={rank.progress} size={76} stroke={7} />
          <span className={styles.starDisc}>
            <img src={star} alt="" width={26} height={26} />
          </span>
        </span>
        <div>
          <p className={styles.kicker}>YOUR RANK</p>
          <p className={styles.rank}>{rank.step.label}</p>
          <p className={styles.line}>{rank.line}</p>
        </div>
      </div>

      <div className={styles.stepsWrap}>
      <ol className={styles.steps} aria-label="Ranks">
        {RANKS.map((r, i) => (
          <li key={r.id} className={i <= rank.index ? styles.stepOn : undefined} aria-current={i === rank.index ? 'step' : undefined}>
            <span className={styles.stepDot}>{i + 1}</span>
            <span className={styles.stepLabel}>{r.label}</span>
          </li>
        ))}
      </ol>
        <span className={styles.track} aria-hidden="true">
          <span style={{ width: `${((rank.index + (rank.next ? rank.progress : 0)) / (RANKS.length - 1)) * 100}%` }} />
        </span>
      </div>

      <h3 className={styles.badgesHead}>
        BADGES · <CountUp to={earned} duration={0.6} /> of {badges.length}
      </h3>
      <ul className={styles.badges}>
        {badges.map((b) => (
          <li key={b.id} className={b.earned ? `${styles.badge} ${styles.earned}` : styles.badge} aria-label={`${b.label}: ${b.earned ? 'earned' : `${b.have} of ${b.need}. ${b.hint}`}`}>
            <span className={styles.badgeOrb}>
              {!b.earned && <Ring value={b.have / b.need} size={64} stroke={4} track="transparent" className={styles.badgeRing} />}
              <img src={BADGE_ICONS[b.id]} alt="" width={22} height={22} />
            </span>
            <span className={styles.badgeLabel}>{b.label}</span>
            <span className={styles.badgeMeta}>{b.earned ? 'Earned' : `${b.have} of ${b.need}`}</span>
          </li>
        ))}
      </ul>

      <button type="button" className={styles.done} onClick={onClose}>
        Done
      </button>
    </Sheet>
  );
}
