// Redesign v2 building blocks for Settings and its sub-pages (boards 16–22): a kicker with its card, a row (link,
// button or static) with a tinted icon square, a value and a chevron, and the two-way segmented control.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../OnboardingPage/v3/icons';
import styles from './v3/MySpace.module.css';

export type Tint = 'att' | 'wel' | 'lei' | 'cru' | 'purple' | 'accent';

const TINT: Record<Tint, string> = {
  att: styles.tAtt,
  wel: styles.tWel,
  lei: styles.tLei,
  cru: styles.tCru,
  purple: styles.tPurple,
  accent: styles.tAccent,
};

export function RowIcon({ icon, tint }: { icon: IconName; tint: Tint }) {
  return (
    <span className={`${styles.rowIcon} ${TINT[tint]}`} aria-hidden="true">
      <Icon name={icon} size={18} />
    </span>
  );
}

/** A section kicker (accent-ink mono caps) and its card. */
export function Section({ title, aside, children, id }: { title: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  const headingId = id ?? `sec-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 className={styles.kicker} id={headingId}>
        {title}
        {aside}
      </h2>
      {children}
    </section>
  );
}

interface RowProps {
  icon: IconName;
  tint: Tint;
  title: string;
  sub?: ReactNode;
  subId?: string;
  value?: ReactNode;
  /** A link row (chevron), a button row (chevron) or a static row whose `end` holds a switch or tag. */
  to?: string;
  onClick?: () => void;
  end?: ReactNode;
  lang?: string;
}

export function Row({ icon, tint, title, sub, subId, value, to, onClick, end, lang }: RowProps) {
  const body = (
    <>
      <RowIcon icon={icon} tint={tint} />
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {sub && (
          <span className={styles.rowSub} id={subId}>
            {sub}
          </span>
        )}
      </span>
      {value !== undefined && (
        <span className={styles.rowValue} lang={lang}>
          {value}
        </span>
      )}
      {end}
      {(to || onClick) && <Icon name="chevron" size={18} className={styles.rowChevron} />}
    </>
  );
  if (to)
    return (
      <Link to={to} className={styles.row}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" className={styles.row} onClick={onClick}>
        {body}
      </button>
    );
  return <div className={styles.switchRow}>{body}</div>;
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={styles.segment} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A "what changes" list (boards 18–19): icon square, a title and one line. */
export function Changes({ items }: { items: { icon: IconName; tint: Tint; title: string; text: string }[] }) {
  return (
    <ul className={`${styles.card} ${styles.changes}`}>
      {items.map((c) => (
        <li key={c.title}>
          <RowIcon icon={c.icon} tint={c.tint} />
          <span className={styles.rowText}>
            <span className={styles.changeTitle}>{c.title}</span>
            <span className={styles.rowSub}>{c.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
