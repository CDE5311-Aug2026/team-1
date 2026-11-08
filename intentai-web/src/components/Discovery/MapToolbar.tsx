// The map's tools (owner, 31 Oct / 1 Nov 2026: five keys: where you are, search a place or area, Editor's Pick walks
// and lists, back (up a level) and Enter). v2 (owner, 8 Nov 2026): a vertical rail over the map card's right edge, so
// the map gets the height, with tinted icon squares like the Settings rows (MySpace.module.css .rowIcon). With a place
// open the same keys lie in a row under the notebook: back closes it, Enter turns the page.
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { uraRegion } from '../../data/ura/ura';
import { searchMap, type SearchPick } from './mapSearch';
import styles from './MapToolbar.module.css';

interface Props {
  canUndo: boolean;
  /** Back's name for screen readers ("Undo", "Back to the map"). */
  undoLabel?: string;
  /** Enter: open what the deck has selected, or turn the notebook's page. */
  onEnter(): void;
  canEnter: boolean;
  enterLabel: string;
  locating: boolean;
  onLocate(): void;
  onUndo(): void;
  onPickArea(areaId: string): void;
  onPickPlace(placeId: string): void;
  /** The deck shows Editor's Pick (the key looks pressed; pressing it again goes back). */
  picksOn: boolean;
  onPicks(): void;
  /** Editor's Pick walks and lists, searchable by name (empty until they have loaded). */
  picks?: readonly SearchPick[];
  onPickPick?(id: string): void;
  /** The search panel opened (Home starts loading the picks). */
  onSearchOpen?(): void;
  /** rail: a column over the map's right edge (default); row: under an open place's notebook. */
  layout?: 'rail' | 'row';
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="20"
      height="20"
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
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  picks: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  enter: 'M20 5v7a3 3 0 0 1-3 3H5M9 11l-4 4 4 4',
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

export function MapToolbar({
  canUndo,
  undoLabel = 'Undo',
  onEnter,
  canEnter,
  enterLabel,
  locating,
  onLocate,
  onUndo,
  onPickArea,
  onPickPlace,
  picksOn,
  onPicks,
  picks = [],
  onPickPick,
  onSearchOpen,
  layout = 'rail',
}: Props) {
  const [open, setOpen] = useState<'search' | null>(null);
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchMap(q, picks), [q, picks]);
  const nothing = hits.areas.length + hits.picks.length + hits.places.length === 0;

  const close = () => {
    setOpen(null);
    setQ('');
  };

  return (
    <div className={layout === 'rail' ? `${styles.wrap} ${styles.rail}` : `${styles.wrap} ${styles.row}`}>
      <div
        className={styles.bar}
        role="toolbar"
        aria-label="Map tools"
        aria-orientation={layout === 'rail' ? 'vertical' : 'horizontal'}
      >
        <button type="button" className={`${styles.key} ${styles.tLocate}`} onClick={onLocate} aria-busy={locating} aria-label="My location">
          <Icon d={ICONS.locate} />
        </button>
        <button
          type="button"
          className={`${styles.key} ${styles.tSearch}`}
          onClick={() => {
            if (open !== 'search') onSearchOpen?.();
            setOpen(open === 'search' ? null : 'search');
          }}
          aria-expanded={open === 'search'}
          aria-label="Search the map"
        >
          <Icon d={ICONS.search} />
        </button>
        <button
          type="button"
          className={`${styles.key} ${styles.tPicks}`}
          onClick={() => {
            close();
            onPicks();
          }}
          aria-pressed={picksOn}
          aria-label="Editor's Pick"
        >
          <Icon d={ICONS.picks} />
        </button>
        <button type="button" className={`${styles.key} ${styles.tBack}`} onClick={onUndo} disabled={!canUndo} aria-label={undoLabel}>
          <Icon d={ICONS.undo} />
        </button>
        <button
          type="button"
          className={`${styles.key} ${styles.tEnter}`}
          onClick={() => {
            close();
            onEnter();
          }}
          disabled={!canEnter}
          aria-label={enterLabel}
          aria-keyshortcuts="Enter"
        >
          <Icon d={ICONS.enter} />
        </button>
      </div>
      <AnimatePresence>
        {open === 'search' && (
          <Panel title="Search a place or area" onClose={close}>
            <input
              className={styles.search}
              type="search"
              autoFocus
              placeholder="Place, area, type (hawker, temple) or walk"
              aria-label="Search a place or planning area"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q.trim().length >= 2 && nothing && <p className={styles.empty}>Nothing matches “{q.trim()}”.</p>}
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
              {hits.picks.map((k) => (
                <li key={k.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPickPick?.(k.id);
                      close();
                    }}
                  >
                    <strong>{k.title}</strong>
                    <span>{`Editor's Pick · ${k.kind === 'walk' ? 'walk' : 'list'}`}</span>
                  </button>
                </li>
              ))}
              {hits.places.map(({ place: p, line }) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPickPlace(p.id);
                      close();
                    }}
                  >
                    <strong>{p.name}</strong>
                    <span>{line}</span>
                  </button>
                </li>
              ))}
            </ul>
            {hits.placeCount > hits.places.length && (
              <p className={styles.empty}>{`${hits.places.length} of ${hits.placeCount} places. Type more to narrow it down.`}</p>
            )}
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
}
