// The "Recommended" deck as Cover Flow (owner sketch, 31 Oct 2026). Three.js draws the cards; an invisible DOM card
// sits exactly over each drawn card, so taps, keyboard and screen readers work as on any list. Swipe or drag to move;
// the deck glides and settles on a card. Tap the middle card (or its action) to go in; tap a side card to bring it in.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { UnlockStatus } from '../../data/ura/ura';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CoverFlowScene } from './three/coverFlow';
import styles from './CoverFlow3D.module.css';

export interface CoverItem {
  id: string;
  title: string;
  kicker: string;
  /** "3 of 11 places checked in", "Clementi & Kent Ridge". */
  line: string;
  /** Full numbers under the bar: "3 of 22 areas unlocked", "Landmark 2/9 · Food 1/12". */
  stats?: string[];
  status: UnlockStatus;
  /** 0–1, or null when the card has no progress bar. */
  progress: number | null;
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
}

export const STATUS_LABEL = { done: 'all checked in', exploring: 'exploring', none: 'not visited yet' } as const;
const STATUS_COLOR = { done: '#1f9d55', exploring: '#e0a800', none: '#d64545' } as const;
/** Where the drawn action button sits on the card (fractions of the card). */
const ACTION = { left: 0.07, top: 0.835, width: 0.62, height: 0.105 };

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

/** A card with a photo (owner, 31 Oct: "like the festival cards"): the photo fills the card, a dark fade at the
 *  bottom, the words in white on it, laid out from the button up. */
function drawPhotoCard(ctx: CanvasRenderingContext2D, item: CoverItem, w: number, h: number) {
  const pad = 34;
  const r = 40;
  ctx.save();
  roundRect(ctx, 2, 2, w - 4, h - 4, r);
  ctx.fillStyle = '#2a2730';
  ctx.fill();
  ctx.clip();
  const img = item.image ? images.get(item.image) : undefined;
  if (img && img.complete && img.naturalWidth) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }
  const fade = ctx.createLinearGradient(0, h * 0.28, 0, h);
  fade.addColorStop(0, 'rgba(10,8,20,0)');
  fade.addColorStop(0.35, 'rgba(10,8,20,0.42)');
  fade.addColorStop(1, 'rgba(10,8,20,0.9)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 6;
  // from the action pill up: numbers, bar, line, title, kicker
  let y = h * ACTION.top - 26;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '600 24px Inter, system-ui, sans-serif';
  for (const st of [...(item.stats ?? [])].reverse().slice(0, 2)) {
    ctx.fillText(wrap(ctx, st, w - pad * 2, 1)[0] ?? '', pad, y);
    y -= 34;
  }
  if (item.progress !== null) {
    y -= 4;
    ctx.shadowBlur = 0;
    roundRect(ctx, pad, y - 10, w - pad * 2, 12, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
    if (item.progress > 0) {
      roundRect(ctx, pad, y - 10, Math.max(12, (w - pad * 2) * item.progress), 12, 6);
      ctx.fillStyle = item.status === 'done' ? '#3ccf7a' : '#7fb0ff';
      ctx.fill();
    }
    ctx.shadowBlur = 6;
    y -= 34;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = '400 30px Inter, system-ui, sans-serif';
  if (item.line) {
    ctx.fillText(wrap(ctx, item.line, w - pad * 2, 1)[0] ?? '', pad, y);
    y -= 50;
  }
  ctx.fillStyle = '#fff';
  ctx.font = '700 54px Inter, system-ui, sans-serif';
  const lines = wrap(ctx, item.title, w - pad * 2, 2);
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], pad, y);
    y -= 58;
  }
  y -= 4;
  ctx.shadowBlur = 0;
  ctx.fillStyle = STATUS_COLOR[item.status];
  ctx.beginPath();
  ctx.arc(pad + 9, y - 9, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 6;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '600 24px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText(item.kicker.toUpperCase().slice(0, 30), pad + 28, y);
  ctx.shadowBlur = 0;
  // action pill: white on the photo
  const ax = w * ACTION.left;
  const ay = h * ACTION.top;
  ctx.font = '600 30px Inter, system-ui, sans-serif';
  const label = `${item.action}  →`;
  const aw = Math.min(w * 0.86, ctx.measureText(label).width + 52);
  roundRect(ctx, ax, ay, aw, h * ACTION.height, (h * ACTION.height) / 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.fillStyle = '#23211d';
  ctx.fillText(label, ax + 26, ay + (h * ACTION.height) / 2 + 10);
  // checked in: a tick in the top corner
  if (item.status === 'done') {
    ctx.fillStyle = '#1f9d55';
    ctx.beginPath();
    ctx.arc(w - pad - 18, pad + 18, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w - pad - 28, pad + 18);
    ctx.lineTo(w - pad - 20, pad + 26);
    ctx.lineTo(w - pad - 7, pad + 10);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCard(ctx: CanvasRenderingContext2D, item: CoverItem, w: number, h: number) {
  if (item.image) return drawPhotoCard(ctx, item, w, h);
  const pad = 34;
  const r = 40;
  ctx.save();
  roundRect(ctx, 2, 2, w - 4, h - 4, r);
  ctx.fillStyle = '#fbfaf7';
  ctx.fill();
  ctx.clip();
  // picture or a coloured band
  const bandH = item.shape?.length ? Math.round(h * 0.34) : Math.round(h * 0.18);
  const img = item.image ? images.get(item.image) : undefined;
  if (img && img.complete && img.naturalWidth) {
    const s = Math.max(w / img.naturalWidth, bandH / img.naturalHeight);
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    ctx.drawImage(img, (w - iw) / 2, (bandH - ih) / 2, iw, ih);
  } else if (item.shape?.length) {
    ctx.fillStyle = '#dfe9f4';
    ctx.fillRect(0, 0, w, bandH);
    const pts = item.shape.flatMap((s) => s.rings.flat());
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const m = 26;
    const k = Math.min((w - 2 * m) / Math.max(1, x1 - x0), (bandH - 2 * m) / Math.max(1, y1 - y0));
    const ox = (w - (x1 - x0) * k) / 2;
    const oy = (bandH - (y1 - y0) * k) / 2;
    ctx.lineJoin = 'round';
    for (const s of item.shape) {
      ctx.beginPath();
      for (const ring of s.rings)
        ring.forEach(([x, y], i) => {
          const px = ox + (x - x0) * k;
          const py = oy + (y1 - y) * k;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
      ctx.fillStyle = s.color;
      ctx.fill('evenodd');
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, w, bandH);
    const tone = item.status === 'done' ? ['#2f6fe4', '#1f9d55'] : item.status === 'exploring' ? ['#8fb5f0', '#f3d27a'] : ['#d9d3c7', '#bdb6a8'];
    g.addColorStop(0, tone[0]);
    g.addColorStop(1, tone[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, bandH);
  }
  let y = bandH + 46;
  // status dot + kicker
  ctx.fillStyle = STATUS_COLOR[item.status];
  ctx.beginPath();
  ctx.arc(pad + 9, y - 9, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5f5b54';
  ctx.font = '600 24px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText(item.kicker.toUpperCase().slice(0, 30), pad + 28, y);
  if (item.status === 'done') {
    ctx.fillStyle = '#1f9d55';
    ctx.beginPath();
    ctx.arc(w - pad - 18, y - 9, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w - pad - 27, y - 9);
    ctx.lineTo(w - pad - 20, y - 2);
    ctx.lineTo(w - pad - 8, y - 17);
    ctx.stroke();
  }
  // title
  y += 18;
  ctx.fillStyle = '#23211d';
  ctx.font = '700 54px Inter, system-ui, sans-serif';
  for (const l of wrap(ctx, item.title, w - pad * 2, item.stats?.length ? 1 : 2)) {
    y += 58;
    ctx.fillText(l, pad, y);
  }
  // line
  y += 40;
  ctx.fillStyle = '#5f5b54';
  ctx.font = '400 30px Inter, system-ui, sans-serif';
  ctx.fillText(wrap(ctx, item.line, w - pad * 2, 1)[0] ?? '', pad, y);
  // progress
  if (item.progress !== null) {
    y += 22;
    roundRect(ctx, pad, y, w - pad * 2, 12, 6);
    ctx.fillStyle = '#e3e8f2';
    ctx.fill();
    if (item.progress > 0) {
      roundRect(ctx, pad, y, Math.max(12, (w - pad * 2) * item.progress), 12, 6);
      ctx.fillStyle = item.status === 'done' ? '#1f9d55' : '#2f6fe4';
      ctx.fill();
    }
    y += 12;
  }
  // full numbers
  ctx.fillStyle = '#3a3731';
  ctx.font = '600 24px Inter, system-ui, sans-serif';
  for (const st of item.stats ?? []) {
    y += 34;
    if (y > h * ACTION.top - 8) break;
    ctx.fillText(wrap(ctx, st, w - pad * 2, 1)[0] ?? '', pad, y);
  }
  // action pill
  const ax = w * ACTION.left;
  const ay = h * ACTION.top;
  ctx.font = '600 30px Inter, system-ui, sans-serif';
  const label = `${item.action}  →`;
  const aw = Math.min(w * 0.86, ctx.measureText(label).width + 52);
  roundRect(ctx, ax, ay, aw, h * ACTION.height, (h * ACTION.height) / 2);
  ctx.fillStyle = '#23211d';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, ax + 26, ay + (h * ACTION.height) / 2 + 10);
  ctx.restore();
  // edge
  roundRect(ctx, 2, 2, w - 4, h - 4, r);
  ctx.strokeStyle = 'rgba(35,33,29,0.12)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function CoverFlow3D({ label, items, selectedId, onSelect, onEnter, fallback }: Props) {
  const reduced = useReducedMotion();
  const [gl] = useState(webglOk);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CoverFlowScene | null>(null);
  const cardRefs = useRef(new Map<number, HTMLDivElement>());
  const selectedIndex = Math.max(0, items.findIndex((i) => i.id === selectedId));
  const [centre, setCentre] = useState(selectedIndex);
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
    <section className={styles.deck} aria-label={label}>
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
                <span role="progressbar" aria-label={`${item.title} unlocked`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)} />
              )}
              {isSel && (
                <button
                  type="button"
                  className={styles.action}
                  style={{ left: `${ACTION.left * 100}%`, top: `${ACTION.top * 100}%`, width: `${ACTION.width * 100}%`, height: `${ACTION.height * 100}%` }}
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
