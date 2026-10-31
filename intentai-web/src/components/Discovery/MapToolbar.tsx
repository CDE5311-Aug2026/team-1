// The keys at the bottom of the map card (owner, 31 Oct 2026: "like the bottom row of a phone keyboard", then "one
// piece with the map, keys in Three.js you can press, tucked into the phone's big rounded bottom"): go to where you
// are, search a place or area, switch the deck to the editor's picks (walks and themed lists), and undo the last move.
// With WebGL the keys are drawn in 3D (three/keyTray.ts) under the real buttons, which stay for taps and the keyboard.
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { KeyTrayScene } from './three/keyTray';
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
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
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

/** The card's corner radius: the outer keys' bottom corners are concentric with it. */
const OUTER_R = 32;
/** The card's frame around the keys, px (DiscoveryHome.module.css .device). */
const DEVICE_PAD = 5;
const IS_JSDOM = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
function webgl(): boolean {
  if (IS_JSDOM || typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function MapToolbar({ canUndo, locating, onLocate, onUndo, onPickArea, onPickPlace, picksOn, onPicks }: Props) {
  const [open, setOpen] = useState<'search' | null>(null);
  const reduce = useReducedMotionConfig();
  const bar = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<KeyTrayScene | null>(null);
  const [three, setThree] = useState(false);
  const specs = [
    { label: locating ? '…' : 'Locate', icon: ICONS.locate, on: false, disabled: false },
    { label: 'Search', icon: ICONS.search, on: open === 'search', disabled: false },
    { label: 'Picks', icon: ICONS.picks, on: picksOn, disabled: false },
    { label: '', icon: ICONS.undo, on: false, disabled: !canUndo },
  ];
  const specsRef = useRef(specs);
  specsRef.current = specs;
  const layout = () => {
    const s = scene.current;
    const b = bar.current;
    if (!s || !b) return;
    const box = b.getBoundingClientRect();
    const all = [...b.querySelectorAll('button')];
    const keys = all.map((el, i) => {
      const r = el.getBoundingClientRect();
      // the outer keys' bottom corners follow the card's rounded bottom (concentric with it)
      const inset = DEVICE_PAD + (i === 0 ? r.left - box.left : box.right - r.right);
      const outer = Math.max(12, OUTER_R - inset);
      const corners: [number, number, number, number] = [12, 12, i === all.length - 1 ? outer : 12, i === 0 ? outer : 12];
      return { x: r.left - box.left, w: r.width, corners, ...specsRef.current[i] };
    });
    s.setKeys(keys);
  };

  useEffect(() => {
    if (!webgl()) return;
    let gone = false;
    let ro: ResizeObserver | null = null;
    void import('./three/keyTray').then(({ KeyTrayScene }) => {
      if (gone || !canvas.current || !bar.current) return;
      const s = new KeyTrayScene(canvas.current);
      scene.current = s;
      const fit = () => {
        const b = bar.current!;
        s.resize(b.clientWidth, b.clientHeight);
        layout();
      };
      ro = new ResizeObserver(fit);
      ro.observe(bar.current);
      fit();
      void document.fonts?.ready.then(() => {
        if (!gone) layout();
      });
      setThree(true);
    });
    return () => {
      gone = true;
      ro?.disconnect();
      scene.current?.destroy();
      scene.current = null;
    };
    // layout reads the latest keys through specsRef
  }, []);
  const specKey = specs.map((k) => `${k.label}${k.on}${k.disabled}`).join('|');
  useEffect(() => {
    if (scene.current) scene.current.reduced = !!reduce;
    layout();
  }, [specKey, three, reduce]);

  // the 3D key under a button goes down while it is held
  const keyProps = (i: number) => ({
    onPointerDown: () => scene.current?.press(i, true),
    onPointerUp: () => scene.current?.press(i, false),
    onPointerLeave: () => {
      scene.current?.press(i, false);
      scene.current?.hover(i, false);
    },
    onPointerCancel: () => scene.current?.press(i, false),
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && scene.current?.hover(i, true),
    onKeyDown: (e: React.KeyboardEvent) => (e.key === ' ' || e.key === 'Enter') && scene.current?.press(i, true),
    onKeyUp: (e: React.KeyboardEvent) => (e.key === ' ' || e.key === 'Enter') && scene.current?.press(i, false),
  });
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
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
      <div ref={bar} className={three ? `${styles.bar} ${styles.three}` : styles.bar} role="toolbar" aria-label="Map tools">
        <button type="button" className={styles.key} onClick={onLocate} aria-busy={locating} aria-label="My location" {...keyProps(0)}>
          <Icon d={ICONS.locate} />
          <span>{locating ? '…' : 'Locate'}</span>
        </button>
        <button
          type="button"
          className={styles.key}
          onClick={() => setOpen(open === 'search' ? null : 'search')}
          aria-expanded={open === 'search'}
          {...keyProps(1)}
        >
          <Icon d={ICONS.search} />
          <span>Search</span>
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
          {...keyProps(2)}
        >
          <Icon d={ICONS.picks} />
          <span>Picks</span>
        </button>
        <button type="button" className={`${styles.key} ${styles.small}`} onClick={onUndo} disabled={!canUndo} aria-label="Undo" {...keyProps(3)}>
          <Icon d={ICONS.undo} />
        </button>
      </div>
      <AnimatePresence>
        {open === 'search' && (
          <Panel title="Search a place or area" onClose={close}>
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
