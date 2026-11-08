// v2 board 10: what sits around a volume while you read it, the same for the book on the desk and a stop's page:
// "‹ Shelf" (back to the field archive) · Hunt · Settings, the volume's kicker and title, and the folio under the book
// ("n / N · Vol. I · The letter" with the page's own instruction, when it has one). The book itself is untouched.
import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../../routes';
import Icon from '../../OnboardingPage/v3/icons';
import styles from './volumeChrome.module.css';

/** The reader's top bar. `game`: it stays over Hunt's full-screen game layers and says where it ends (--game-top). */
export function VolumeBar({ onBack, game = false, className }: { onBack(): void; game?: boolean; className?: string }) {
  const bar = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = bar.current;
    if (!game || !el) return;
    const root = document.documentElement.style;
    const mark = () => root.setProperty('--game-top', `${Math.round(el.getBoundingClientRect().bottom)}px`);
    mark();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(mark) : null;
    ro?.observe(el);
    window.addEventListener('resize', mark);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', mark);
      root.removeProperty('--game-top');
    };
  }, [game]);
  return (
    <header ref={bar} className={`${styles.bar} ${game ? styles.game : ''} ${className ?? ''}`}>
      <button type="button" className={styles.back} onClick={onBack}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Shelf
      </button>
      <h1 className={styles.title}>Hunt</h1>
      <Link to={paths.mySpaceSettings} className={styles.settings} aria-label="Settings" title="Settings">
        <Icon name="gear" size={20} />
      </Link>
    </header>
  );
}

/** "VOLUME I" over the volume's title. */
export function VolumeHead({ roman, title, className }: { roman: string; title: string; className?: string }) {
  return (
    <p className={`${styles.head} ${className ?? ''}`}>
      <small>Volume {roman}</small>
      <span>{title}</span>
    </p>
  );
}

/** Under the book: "n / N · Vol. I · The letter", then the page's own instruction (left out when it has none). */
export function VolumeFolio({ n, total, roman, name, hint, className }: { n: number; total: number; roman?: string; name: string; hint?: string; className?: string }) {
  const named = roman && !/^Vol\. /.test(name) ? `Vol. ${roman} · ${name}` : name;
  return (
    <div className={`${styles.folio} ${className ?? ''}`} aria-live="polite" data-testid="volume-folio">
      <p className={styles.folioLine}>
        {n} / {total} · {named}
      </p>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
