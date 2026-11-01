// The field notebook: a leather book lying on the desk. Tap it and the strap slips off and the cover swings open; then
// its pages turn like paper: drag a page by its edge (it follows your finger, curling and casting a shadow), tap the
// dog-ear, or pick a thumb tab to riffle straight to a chapter.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import styles from './notebook.module.css';
import { fibres, grain, leather, marble, scuffs, stains } from './textures';

export interface NotebookPage {
  id: string;
  /** The thumb tab's label (pages with a tab start a chapter). */
  tab?: string;
  /** Spoken name for the page. */
  label: string;
  render(active: boolean): ReactNode;
}

const reduced = () => document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** React 18 has no `inert` prop: spread this. */
export const inert = (on: boolean) => (on ? ({ inert: '' } as Record<string, string>) : {});

export const MATERIALS = {
  '--grain': grain,
  '--stains': stains,
  '--fibres': fibres,
  '--leather': leather,
  '--scuffs': scuffs,
  '--marble': marble,
} as CSSProperties;

export function Notebook({
  pages,
  index,
  onIndex,
  open,
  onOpen,
  cover,
  tone,
  strap = true,
  held = false,
  coverLabel = 'Open the field notebook',
  fit = false,
  insert,
}: {
  pages: NotebookPage[];
  index: number;
  onIndex(next: number): void;
  open: boolean;
  onOpen(): void;
  cover: ReactNode;
  /** The binding's colour (default: brown leather). */
  tone?: string;
  /** The leather strap round a closed field notebook. */
  strap?: boolean;
  /** Held up, just taken off the shelf (not lying tilted on the desk). */
  held?: boolean;
  coverLabel?: string;
  /** Fill the reading screen (the book is all there is; nothing scrolls). */
  fit?: boolean;
  /** Something laid over the open page for a while (a film print tipped in), inside the book. */
  insert?: ReactNode;
}) {
  const book = useRef<HTMLDivElement>(null);
  // a page being dragged: which leaf, and how far it has turned (0 flat .. -180 over)
  const [drag, setDrag] = useState<{ leaf: number; angle: number } | null>(null);
  const start = useRef<{ x: number; y: number; t: number; dir: 0 | 1 | -1; id: number } | null>(null);
  const [riffle, setRiffle] = useState<number | null>(null);

  // riffle to a far page one leaf at a time, so you see the pages go by
  useEffect(() => {
    if (riffle == null || riffle === index) return setRiffle(null);
    if (reduced()) {
      onIndex(riffle);
      return setRiffle(null);
    }
    const t = setTimeout(() => onIndex(index + Math.sign(riffle - index)), 110);
    return () => clearTimeout(t);
  }, [riffle, index, onIndex]);

  const turn = (to: number) => {
    const next = Math.max(0, Math.min(pages.length - 1, to));
    if (Math.abs(next - index) > 1) setRiffle(next);
    else onIndex(next);
  };

  const width = () => book.current?.getBoundingClientRect().width ?? 360;
  function down(e: RPointerEvent) {
    if (!open || (e.target as HTMLElement).closest('button,a,input,[data-nodrag]')) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), dir: 0, id: e.pointerId };
  }
  function move(e: RPointerEvent) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x,
      dy = e.clientY - s.y;
    if (!s.dir) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) return void (start.current = null); // a scroll, not a turn
      s.dir = dx < 0 ? 1 : -1;
      if ((s.dir === 1 && index >= pages.length - 1) || (s.dir === -1 && index <= 0)) return void (start.current = null);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const k = Math.min(1, Math.abs(dx) / (width() * 0.9));
    setDrag(s.dir === 1 ? { leaf: index, angle: -180 * k } : { leaf: index - 1, angle: -180 + 180 * k });
  }
  function up(e: RPointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s || !s.dir || !drag) return setDrag(null);
    const fast = Math.abs(e.clientX - s.x) / Math.max(1, performance.now() - s.t) > 0.5;
    const k = s.dir === 1 ? -drag.angle / 180 : 1 + drag.angle / 180;
    setDrag(null);
    if (k > 0.35 || fast) onIndex(index + s.dir);
  }

  const angleOf = (i: number) => (drag?.leaf === i ? drag.angle : i < index ? -180 : 0);
  const tabs = pages.map((p, i) => ({ ...p, i })).filter((p) => p.tab);

  return (
    <div
      className={`${styles.desk} ${open ? styles.isOpen : ''} ${held ? styles.held : ''} ${fit ? styles.fit : ''}`}
      style={{ ...MATERIALS, ...(tone ? { '--cover': tone } : {}) } as CSSProperties}
    >
      <div className={styles.book} ref={book} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className={styles.stage}>
          {/* the page block's edges (seen while closed and tilted) */}
          <span className={styles.edgeRight} aria-hidden="true" />
          <span className={styles.edgeBottom} aria-hidden="true" />
          <span className={styles.back} aria-hidden="true" />

          {pages.map((p, i) => {
            const angle = angleOf(i);
            const lift = Math.sin((-angle * Math.PI) / 180); // 0 flat, 1 upright
            const near = Math.abs(i - index) <= 1 || drag?.leaf === i;
            const z = drag?.leaf === i ? 500 : i < index ? 100 + i : 300 - i;
            // leaves share a plane: nudge each back a hair so the one on top always paints on top
            const depth = drag?.leaf === i ? 0.6 : i < index ? (i - index) * 0.3 : (index - i) * 0.4;
            return (
              <section
                key={p.id}
                className={`${styles.leaf} ${drag?.leaf === i ? styles.dragging : ''} ${i < index && drag?.leaf !== i ? styles.turned : ''}`}
                style={{ zIndex: z, transform: `translateZ(${depth}px) rotateY(${angle}deg)`, '--lift': lift } as CSSProperties}
                aria-hidden={i !== index}
                {...inert(i !== index || !open)}
                aria-label={p.label}
              >
                <div className={styles.front}>
                  <div className={styles.paper}>{near && p.render(i === index && open)}</div>
                  <span className={styles.curl} aria-hidden="true" />
                  {i < pages.length - 1 && (
                    <button type="button" className={styles.dogEar} aria-label="Next page" onClick={() => turn(index + 1)} data-nodrag>
                      <span />
                    </button>
                  )}
                  {i > 0 && (
                    <button type="button" className={styles.backEar} aria-label="Previous page" onClick={() => turn(index - 1)} data-nodrag>
                      ‹
                    </button>
                  )}
                </div>
                <div className={styles.reverse} aria-hidden="true" />
              </section>
            );
          })}
          {/* the shadow a lifted page throws on the one beneath */}
          {drag && (
            <span
              className={styles.castShadow}
              style={{ opacity: Math.sin((-drag.angle * Math.PI) / 180) * 0.55, transform: `translateZ(${drag.leaf === index ? -0.2 : 0.2}px)` }}
              aria-hidden="true"
            />
          )}

          <div className={styles.cover} aria-hidden={open}>
            <button type="button" className={styles.coverFront} onClick={onOpen} aria-label={coverLabel} {...inert(open)}>
              {cover}
              {strap && <span className={styles.strap} aria-hidden="true" />}
            </button>
            <span className={styles.coverEdge} aria-hidden="true" />
            <span className={styles.coverInside} aria-hidden="true" />
          </div>
          <span className={styles.spine} aria-hidden="true" />
          {open && insert}
        </div>

        {open && (
          <nav className={styles.tabs} aria-label="Chapters">
            {tabs.map((t, n) => (
              <button
                key={t.id}
                type="button"
                className={styles.tab}
                aria-current={index >= t.i && (tabs[n + 1]?.i ?? Infinity) > index ? 'page' : undefined}
                style={{ '--n': n } as CSSProperties}
                onClick={() => turn(t.i)}
                data-nodrag
              >
                <span>{t.tab}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
      {open && (
        <p className={styles.folio} aria-live="polite">
          <span>
            {index + 1} / {pages.length}
          </span>
          {pages[index]?.label}
        </p>
      )}
    </div>
  );
}
