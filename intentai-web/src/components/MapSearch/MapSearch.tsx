import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { HOME_BASE_LABEL, searchHomePlaces, type HomePlace } from '../../data/homePlaces';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './MapSearch.module.css';

export const SEARCH_HINTS = ['Search a place or area', 'Try “Chinatown”', 'Try “Tembusu College”'] as const;
export const HINT_MS = 2400;
/** One scramble frame; every second frame reveals one more character. */
export const SCRAMBLE_MS = 35;

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** `target` with its first floor(frame / 2) characters revealed and the rest random (spaces kept). */
export function scrambleFrame(target: string, frame: number, rand: () => number = Math.random): string {
  const shown = Math.floor(frame / 2);
  return target
    .split('')
    .map((c, i) => (i < shown || c === ' ' ? c : CHARS[Math.floor(rand() * CHARS.length)]))
    .join('');
}

/** Shows `target`; when it changes, the new text decodes in from random characters (at once under reduced motion). */
function useScramble(target: string, reduced: boolean): string {
  const [text, setText] = useState(target);
  const shownTarget = useRef(target);
  useEffect(() => {
    if (shownTarget.current === target) return;
    shownTarget.current = target;
    if (reduced) {
      setText(target);
      return;
    }
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      setText(scrambleFrame(target, frame));
      if (Math.floor(frame / 2) >= target.length) window.clearInterval(id);
    }, SCRAMBLE_MS);
    return () => {
      window.clearInterval(id);
      setText(target);
    };
  }, [target, reduced]);
  return text;
}

interface Props {
  /** Search point shown in the pill (an area name). */
  label: string;
  onPick(id: string): void;
  onUseLocation(): void;
}

/** Home map's search bar: the "Near you" pill and the search button open one dropdown of places. */
export function MapSearch({ label, onPick, onUseLocation }: Props) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hint, setHint] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const labelId = useId();
  const shown = useScramble(label, reduced);

  const close = () => {
    setOpen(false);
    setQuery('');
    pillRef.current?.focus({ preventScroll: true });
  };

  const toggle = () => {
    setOpen((o) => !o);
    setQuery('');
    setHint(0);
  };

  // A press anywhere outside closes the dropdown; focus goes back to the pill unless the press lands on another control.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && rootRef.current?.contains(e.target)) return;
      setOpen(false);
      setQuery('');
      pillRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  // Placeholder hints take turns while the field is empty (one fixed hint under reduced motion).
  const rotating = open && !query && !reduced;
  useEffect(() => {
    if (!rotating) return;
    const id = window.setInterval(() => setHint((h) => (h + 1) % SEARCH_HINTS.length), HINT_MS);
    return () => window.clearInterval(id);
  }, [rotating]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || !open) return;
    e.stopPropagation();
    close();
  };

  const pick = (id: string) => {
    close();
    onPick(id);
  };

  const locate = () => {
    close();
    onUseLocation();
  };

  const { withCards, others } = searchHomePlaces(query);
  let row = 0;
  const renderRow = (p: HomePlace) => {
    const delay = { animationDelay: `${(0.05 + row * 0.06).toFixed(2)}s` } as CSSProperties;
    row += 1;
    return (
      <li key={p.id}>
        <button type="button" className={`a-row ${styles.row}`} style={delay} onClick={() => pick(p.id)}>
          {p.photo ? <img className={styles.thumb} src={p.photo} alt="" /> : <span className={styles.thumb} aria-hidden="true" />}
          <span className={styles.rowText}>
            <span className={styles.rowName}>{p.name}</span>
            <span className={styles.rowMeta}>
              {p.area} · {p.distance}
            </span>
          </span>
          <ChevronIcon />
        </button>
      </li>
    );
  };

  return (
    <div ref={rootRef} className={styles.root} onKeyDown={onKeyDown}>
      <div className={styles.bar}>
        <button
          ref={pillRef}
          type="button"
          className={styles.pill}
          aria-label="Change search point"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={toggle}
        >
          <span className={styles.dot} aria-hidden="true">
            <span className={`ping ${styles.dotRing}`} />
            <span className={styles.dotCore} />
          </span>
          <span className={styles.near}>Near you</span>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <span className={styles.point} data-testid="search-point">
            {shown}
          </span>
        </button>
        <span className={styles.divider} aria-hidden="true" />
        <button
          type="button"
          className={`press ${styles.searchButton}`}
          aria-label="Search"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={toggle}
        >
          <SearchIcon size={20} />
        </button>
      </div>

      {open && (
        <div id={panelId} className={`a-drop ${styles.panel}`}>
          <label className={styles.field}>
            <SearchIcon size={18} muted />
            <span className={styles.srOnly}>Search a place or area</span>
            <input
              className={styles.input}
              type="text"
              value={query}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
            />
            {!query && (
              <span className={styles.hint} aria-hidden="true">
                <span key={hint} className="a-hint" data-testid="search-hint">
                  {SEARCH_HINTS[hint]}
                </span>
              </span>
            )}
          </label>

          <button type="button" className={`a-row ${styles.row}`} onClick={locate}>
            <span className={styles.locIcon} aria-hidden="true">
              <CrosshairIcon />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowName}>Use my location</span>
              <span className={styles.rowMeta}>{HOME_BASE_LABEL}</span>
            </span>
          </button>

          {withCards.length > 0 && (
            <>
              <p id={labelId} className={styles.group}>
                PLACES WITH CARDS
              </p>
              <ul className={styles.list} aria-labelledby={labelId}>
                {withCards.map(renderRow)}
              </ul>
            </>
          )}
          {others.length > 0 && <ul className={withCards.length > 0 ? `${styles.list} ${styles.others}` : styles.list}>{others.map(renderRow)}</ul>}
          {withCards.length === 0 && others.length === 0 && (
            <p className={styles.empty} role="status">
              No places match “{query.trim()}”. Try an area name.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon({ size, muted = false }: { size: number; muted?: boolean }) {
  return (
    <svg
      className={muted ? styles.fieldIcon : undefined}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={muted ? 2 : 2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </svg>
  );
}

function CrosshairIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
