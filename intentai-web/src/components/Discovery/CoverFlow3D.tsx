// The "Recommended" deck as Cover Flow (owner sketch, 31 Oct 2026). Three.js draws the cards; an invisible DOM card
// sits exactly over each drawn card, so taps, keyboard and screen readers work as on any list. Swipe or drag to move;
// the deck glides and settles on a card. Tap the middle card (or its action) to go in; tap a side card to bring it in.
// Each invisible card is clipped to the drawn card's own outline, so a tap on a card's visible sliver never lands on
// the card in front of it. While the tab guide is unrolled over the deck, the cards gather into a stack behind the
// middle one and take no taps; they fan out again when it rolls up.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { UnlockStatus } from '../../data/ura/ura';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CoverFlowScene } from './three/coverFlow';
import styles from './CoverFlow3D.module.css';

export interface CoverItem {
  id: string;
  title: string;
  kicker: string;
  /** "3 of 11 places checked in", "Monument". */
  line: string;
  /** Full numbers under the bar: "3 of 22 areas unlocked", "Landmark 2/9 · Food 1/12". */
  stats?: string[];
  status: UnlockStatus;
  /** 0–1, or null when the card has no progress bar. */
  progress: number | null;
  /** The small number beside the bar: "3/22" (checked in / all). */
  count?: string;
  image?: string;
  /** Outline drawn on the card's band instead of a photo: areas with their colours (a region's, or one area). */
  shape?: { rings: readonly (readonly (readonly [number, number])[])[]; color: string }[];
  /** The middle card's button: "Explore West", "See 11 places", "Open … in Nearby". */
  action: string;
  actionLabel?: string;
}

interface Props {
  label: string;
  items: readonly CoverItem[];
  selectedId: string;
  onSelect(id: string): void;
  onEnter(id: string): void;
  /** Shown instead when WebGL is not available (and in unit tests). */
  fallback: ReactNode;
  /** The middle card is already open above the deck: no button to open it again. */
  hideAction?: boolean;
}

export const STATUS_LABEL = { done: 'all checked in', exploring: 'exploring', none: 'not visited yet' } as const;
const STATUS_COLOR = { done: '#1f9d55', exploring: '#e0a800', none: '#d64545' } as const;

const IS_JSDOM = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
function webglOk(): boolean {
  if (IS_JSDOM || typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const images = new Map<string, HTMLImageElement>();

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxW && last.length > 1) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

/** Album art (owner, 31 Oct 2026: "more like album covers; the words are sometimes cut off and too small"): a square
 *  cover with the picture (a photo, or the area's outline on its colour), the name, large, and the progress as a bar
 *  with its small "3/22" on the right (owner, 2 Nov 2026: the numbers live on the card, no words under the deck). */
function drawCard(ctx: CanvasRenderingContext2D, item: CoverItem, w: number, h: number) {
  const pad = 30;
  const r = 26;
  ctx.save();
  roundRect(ctx, 1, 1, w - 2, h - 2, r);
  ctx.clip();
  const img = item.image ? images.get(item.image) : undefined;
  // vintage inks: bottle green when all checked in, sea blue to ochre while exploring, sepia before
  const tone = item.status === 'done' ? ['#2f6b4f', '#1d4634'] : item.status === 'exploring' ? ['#3f5f80', '#b8873a'] : ['#8a7358', '#4d3d2c'];
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, tone[0]);
  bg.addColorStop(1, tone[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (img && img.complete && img.naturalWidth) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  } else if (item.shape?.length) {
    // the outline fills the upper cover, like a print on a record sleeve
    const pts = item.shape.flatMap((sh) => sh.rings.flat());
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const bw = w - 2 * pad;
    const bh = h * 0.6;
    const k = Math.min(bw / Math.max(1, x1 - x0), bh / Math.max(1, y1 - y0));
    const ox = (w - (x1 - x0) * k) / 2;
    const oy = pad + (bh - (y1 - y0) * k) / 2;
    ctx.lineJoin = 'round';
    for (const sh of item.shape) {
      ctx.beginPath();
      for (const ring of sh.rings)
        ring.forEach(([x, y], i) => {
          const px = ox + (x - x0) * k;
          const py = oy + (y1 - y) * k;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
      ctx.fillStyle = sh.color;
      ctx.fill('evenodd');
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  // the name sits on a dark fade at the bottom
  const fade = ctx.createLinearGradient(0, h * 0.42, 0, h);
  fade.addColorStop(0, 'rgba(8,8,12,0)');
  fade.addColorStop(0.55, 'rgba(8,8,12,0.5)');
  fade.addColorStop(1, 'rgba(8,8,12,0.88)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  let size = 76;
  ctx.font = `800 ${size}px Inter, system-ui, sans-serif`;
  let lines = wrap(ctx, item.title, w - pad * 2, 2);
  // long names step down a little rather than lose words
  while (size > 56 && (lines.length > 2 || lines.some((l) => l.endsWith('…')))) {
    size -= 6;
    ctx.font = `800 ${size}px Inter, system-ui, sans-serif`;
    lines = wrap(ctx, item.title, w - pad * 2, 2);
  }
  const bar = item.progress !== null;
  let y = h - pad - (bar ? 22 : 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], pad, y);
    y -= size * 1.06;
  }
  ctx.shadowBlur = 0;
  // progress as a thin bar along the bottom, its numbers small at the right end
  if (bar) {
    let bw = w - pad * 2;
    if (item.count) {
      ctx.font = '700 38px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(item.count, w - pad, h - pad + 1);
      bw -= ctx.measureText(item.count).width + 16;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
    roundRect(ctx, pad, h - pad - 4, bw, 9, 4.5);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
    if (item.progress! > 0) {
      roundRect(ctx, pad, h - pad - 4, Math.max(9, bw * item.progress!), 9, 4.5);
      ctx.fillStyle = item.status === 'done' ? '#3ccf7a' : '#ffffff';
      ctx.fill();
    }
  }
  // status: a dot in the corner, a tick when all checked in
  const cx = w - pad - 14;
  const cy = pad + 14;
  ctx.fillStyle = item.status === 'done' ? '#1f9d55' : STATUS_COLOR[item.status];
  ctx.beginPath();
  ctx.arc(cx, cy, item.status === 'done' ? 22 : 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = item.status === 'done' ? 5 : 4;
  if (item.status === 'done') {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx - 2, cy + 8);
    ctx.lineTo(cx + 11, cy - 8);
    ctx.stroke();
  } else ctx.stroke();
  // a soft gloss across the top, as on a glossy sleeve
  const gloss = ctx.createLinearGradient(0, 0, w * 0.7, h * 0.7);
  gloss.addColorStop(0, 'rgba(255,255,255,0.22)');
  gloss.addColorStop(0.45, 'rgba(255,255,255,0.04)');
  gloss.addColorStop(0.46, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  roundRect(ctx, 1.5, 1.5, w - 3, h - 3, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function CoverFlow3D({ label, items, selectedId, onSelect, onEnter, fallback, hideAction = false }: Props) {
  const reduced = useReducedMotion();
  const [gl] = useState(webglOk);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CoverFlowScene | null>(null);
  const cardRefs = useRef(new Map<number, HTMLDivElement>());
  // the middle card's way in, for keyboards and screen readers
  const actionRef = useRef<HTMLButtonElement>(null);
  const selectedIndex = Math.max(
    0,
    items.findIndex((i) => i.id === selectedId),
  );
  const [centre, setCentre] = useState(selectedIndex);
  // the tab guide unrolled over the deck (TabBar sets html[data-guide-open] and sends a 'guide' event)
  const [gathered, setGathered] = useState(() => typeof document !== 'undefined' && document.documentElement.hasAttribute('data-guide-open'));
  useEffect(() => {
    const on = (e: Event) => setGathered(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener('guide', on);
    return () => window.removeEventListener('guide', on);
  }, []);
  useEffect(() => {
    sceneRef.current?.setSpread(gathered ? 0 : 1);
  }, [gathered, gl]);
  const latest = useRef({ items, selectedId, onSelect });
  latest.current = { items, selectedId, onSelect };

  useLayoutEffect(() => {
    if (!gl || !canvasRef.current || !boxRef.current) return undefined;
    const scene = new CoverFlowScene(canvasRef.current);
    sceneRef.current = scene;
    const box = boxRef.current;
    const size = () => scene.setSize(box.clientWidth, box.clientHeight);
    size();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
    ro?.observe(box);
    scene.onSettle = (i) => {
      const id = latest.current.items[i]?.id;
      if (id && id !== latest.current.selectedId) latest.current.onSelect(id);
    };
    void document.fonts?.ready.then(() => scene.invalidate());
    return () => {
      ro?.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [gl]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.reduced = reduced;
  }, [reduced]);

  // items → card faces; photos load lazily and repaint their card
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.setItems(items.length, (ctx, i, w, h) => {
      const item = latest.current.items[i];
      if (!item) return;
      if (item.image && !images.has(item.image)) {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => sceneRef.current?.invalidate();
        img.src = item.image;
        images.set(item.image, img);
      }
      drawCard(ctx, item, w, h);
    });
    s.goTo(selectedIndex, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    sceneRef.current?.goTo(selectedIndex);
  }, [selectedIndex]);

  // the invisible DOM cards follow the drawn ones
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return undefined;
    const follow = () => {
      const c = Math.round(s.scroll);
      setCentre((prev) => (prev === c ? prev : c));
      for (const [i, el] of cardRefs.current) {
        const r = s.rectOf(i);
        if (!r) {
          el.style.display = 'none';
          continue;
        }
        el.style.display = '';
        el.style.transform = `translate(${r.left}px, ${r.top}px)`;
        el.style.width = `${r.width}px`;
        el.style.height = `${r.height}px`;
        el.style.zIndex = String(100 - Math.abs(i - s.scroll) * 10);
        // only the drawn card takes the tap, not the corners of its box that show the card behind
        el.style.clipPath = `polygon(${r.quad.map((q) => `${(q.x - r.left).toFixed(1)}px ${(q.y - r.top).toFixed(1)}px`).join(', ')})`;
      }
    };
    s.onFrame = follow;
    s.kick();
    return () => {
      if (s.onFrame === follow) s.onFrame = null;
    };
  }, [gl, items]);

  // swipe / drag
  const drag = useRef<{ x: number; t: number; v: number; moved: boolean; id: number } | null>(null);
  const justDragged = useRef(false);
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, t: performance.now(), v: 0, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const s = sceneRef.current;
    if (!d || !s) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    const now = performance.now();
    d.v = (dx / Math.max(1, now - d.t)) * 1000 * 0.6 + d.v * 0.4;
    d.x = e.clientX;
    d.t = now;
    s.dragBy(dx);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    sceneRef.current?.release(d.v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = selectedIndex + (e.key === 'ArrowRight' ? 1 : -1);
    if (next < 0 || next >= items.length) return;
    onSelect(items[next].id);
    requestAnimationFrame(() => cardRefs.current.get(next)?.focus({ preventScroll: true }));
  };

  if (!gl) return <>{fallback}</>;

  const lo = Math.max(0, centre - 4);
  const hi = Math.min(items.length - 1, centre + 4);
  const sel = items[selectedIndex];
  return (
    <section
      className={gathered ? `${styles.deck} ${styles.gathered}` : styles.deck}
      aria-label={label}
      {...(gathered ? { inert: '' } : {})}
    >
      <div
        ref={boxRef}
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (justDragged.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        onKeyDown={onKeyDown}
      >
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        {items.slice(lo, hi + 1).map((item, k) => {
          const i = lo + k;
          const isSel = i === selectedIndex;
          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) cardRefs.current.set(i, el);
                else cardRefs.current.delete(i);
              }}
              role="group"
              aria-roledescription="card"
              aria-label={item.title}
              aria-current={isSel ? 'true' : undefined}
              tabIndex={isSel ? 0 : -1}
              className={styles.hit}
              onClick={() => (isSel ? onEnter(item.id) : onSelect(item.id))}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onEnter(item.id);
                }
              }}
            >
              <span role="img" className={styles.dot} aria-label={STATUS_LABEL[item.status]} />
              <span className={styles.text}>{[item.line, ...(item.stats ?? [])].join('. ')}</span>
              {isSel && item.progress !== null && (
                <span
                  role="progressbar"
                  aria-label={`${item.title} unlocked`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(item.progress * 100)}
                />
              )}
              {isSel && !hideAction && (
                <button
                  ref={actionRef}
                  type="button"
                  className={styles.action}
                  aria-label={item.actionLabel ?? item.action}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnter(item.id);
                  }}
                >
                  {item.action}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className={styles.live} aria-live="polite">
        {sel ? `${sel.title}, ${selectedIndex + 1} of ${items.length}, ${sel.line}` : ''}
      </p>
    </section>
  );
}
