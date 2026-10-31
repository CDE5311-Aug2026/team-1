// The row under the map card (owner, 31 Oct 2026: "like the bottom row of a phone keyboard"): go to where you are,
// pick a place or area yourself, switch the deck to the editor's picks (walks and themed lists), and undo the last move.
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { URA_AREAS, uraRegion } from '../../data/ura/ura';
import { PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import styles from './MapToolbar.module.css';

interface Props {
  canUndo: boolean;
  locating: boolean;
  onLocate(): void;
  onUndo(): void;
  onPickArea(areaId: string): void;
  onPickPlace(placeId: string): void;
  /** The deck shows Editor's Pick (the key looks pressed; pressing it again goes back). */
  picksOn: boolean;
  onPicks(): void;
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  locate: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  custom: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11ZM12 7.5v5M9.5 10h5',
  picks: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
};

function Panel({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  const reduce = useReducedMotionConfig();
  return (
    <motion.div
      className={styles.panel}
      role="dialog"
      aria-label={title}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: reduce ? 0 : 0.22 }}
    >
      <div className={styles.panelHead}>
        <h3>{title}</h3>
        <button type="button" className={styles.x} onClick={onClose} aria-label={`Close ${title}`}>
          ×
        </button>
      </div>
      <div className={styles.panelBody}>{children}</div>
    </motion.div>
  );
}

export function MapToolbar({ canUndo, locating, onLocate, onUndo, onPickArea, onPickPlace, picksOn, onPicks }: Props) {
  const [open, setOpen] = useState<'custom' | null>(null);
  const [q, setQ] = useState('');
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return { areas: [], places: [] };
    return {
      areas: URA_AREAS.filter((a) => a.name.toLowerCase().includes(s)).slice(0, 6),
      places: PUBLISHED_PLACES.filter((p) => p.name.toLowerCase().includes(s) || (p.nameZh ?? '').includes(q.trim())).slice(0, 10),
    };
  }, [q]);

  const close = () => {
    setOpen(null);
    setQ('');
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.bar} role="toolbar" aria-label="Map tools">
        <button type="button" className={styles.key} onClick={onLocate} aria-busy={locating} aria-label="My location">
          <Icon d={ICONS.locate} />
          <span>{locating ? '…' : 'Locate'}</span>
        </button>
        <button type="button" className={styles.key} onClick={() => setOpen(open === 'custom' ? null : 'custom')} aria-expanded={open === 'custom'}>
          <Icon d={ICONS.custom} />
          <span>Custom</span>
        </button>
        <button
          type="button"
          className={styles.key}
          onClick={() => {
            close();
            onPicks();
          }}
          aria-pressed={picksOn}
          aria-label="Editor's Pick"
        >
          <Icon d={ICONS.picks} />
          <span>Picks</span>
        </button>
        <button type="button" className={`${styles.key} ${styles.small}`} onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <Icon d={ICONS.undo} />
        </button>
      </div>
      <AnimatePresence>
        {open === 'custom' && (
          <Panel title="Go to a place or area" onClose={close}>
            <input
              className={styles.search}
              type="search"
              autoFocus
              placeholder="Search a place or planning area"
              aria-label="Search a place or planning area"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q.trim().length >= 2 && hits.areas.length + hits.places.length === 0 && <p className={styles.empty}>Nothing matches “{q.trim()}”.</p>}
            <ul className={styles.list}>
              {hits.areas.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPickArea(a.id);
                      close();
                    }}
                  >
                    <strong>{a.name}</strong>
                    <span>{uraRegion(a.region)?.name} · planning area</span>
                  </button>
                </li>
              ))}
              {hits.places.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPickPlace(p.id);
                      close();
                    }}
                  >
                    <strong>{p.name}</strong>
                    <span>{p.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
}
