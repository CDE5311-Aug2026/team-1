// The "Now" box (UT03-4): pinned over the dock while a hunt is open, one or two lines on what to do right now. It reads
// the hunt and the photo check as they are (now.ts), so it changes with them; the screen reader hears each change
// (role="status", kept in the page even while folded). One tap folds it to a small pill and one tap opens it again: it
// never goes away inside the hunt.
import Icon from '../../OnboardingPage/v3/icons';
import type { NowLine } from './now';
import styles from './NowBox.module.css';

export function NowBox({ line, open, onToggle }: { line: NowLine; open: boolean; onToggle(): void }) {
  return (
    <div className={open ? styles.box : `${styles.box} ${styles.pill}`} data-tour="now">
      <div className={open ? styles.words : styles.sr} id="hunt-now">
        <p className={styles.label}>{line.label}</p>
        <p className={styles.text} role="status" aria-live="polite">
          {line.text}
        </p>
      </div>
      {!open && (
        <span className={styles.label} aria-hidden="true">
          {line.label}
        </span>
      )}
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="hunt-now"
        aria-label={open ? 'Fold the reminder' : 'Show what to do now'}
        title={open ? 'Fold' : 'What to do now'}
        onClick={onToggle}
      >
        <Icon name="chevron" size={18} className={open ? styles.down : styles.up} />
      </button>
    </div>
  );
}
