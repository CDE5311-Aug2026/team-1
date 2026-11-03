// Paints a book's front board for the 3D shelf from the same pieces the flat cover uses (BookCover in Bookshelf.tsx):
// the series line, title, small-caps line, gold line drawing, flourish and numeral, laid out in the same proportions.
// Three canvases come out: the colour (cloth with gold foil), a foil mask (where the board is metal, for metalness and
// roughness), and a bump map (cloth weave, the hinge groove by the spine, a blind-tooled rule round the edge, a debossed
// panel inside the gold frame, and the foil pressed into it).
import { renderToStaticMarkup } from 'react-dom/server';
import type { BookDef } from '../Bookshelf';

export interface CoverMaps {
  color: HTMLCanvasElement;
  foil: HTMLCanvasElement;
  bump: HTMLCanvasElement;
}

const W = 768;
const H = Math.round(W * 1.46);
const cq = (n: number) => (n * W) / 100; // the flat cover is laid out in container-width units
const FONT = "'IM Fell English', Georgia, serif";

function canvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Deterministic noise, so a book looks the same every visit. */
function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  // balance two lines like `text-wrap: balance`
  if (lines.length === 2) {
    const all = words;
    let best = lines,
      score = Infinity;
    for (let i = 1; i < all.length; i++) {
      const a = all.slice(0, i).join(' '),
        b = all.slice(i).join(' ');
      const wa = ctx.measureText(a).width,
        wb = ctx.measureText(b).width;
      if (wa > max || wb > max) continue;
      if (Math.abs(wa - wb) < score) ((score = Math.abs(wa - wb)), (best = [a, b]));
    }
    return best;
  }
  return lines;
}

/** The book's landmark drawing (the cover art), as an image in one ink. */
export function svgImage(book: BookDef, stroke: string): Promise<HTMLImageElement> {
  const markup = renderToStaticMarkup(book.art as never)
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000" `)
    .split('currentColor').join(stroke)
    .replace('stroke-width="1.1"', 'stroke-width="1.35"');
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

/** The gold parts of the board, drawn in one colour (used for the foil itself and for the mask). */
async function drawFoil(ctx: CanvasRenderingContext2D, book: BookDef, ink: string | CanvasGradient, art: HTMLImageElement) {
  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  // frame and its corner diamonds
  const L = cq(7),
    T = cq(5),
    R = W - cq(5),
    B = H - cq(5);
  ctx.lineWidth = cq(0.45);
  ctx.strokeRect(L, T, R - L, B - T);
  ctx.lineWidth = cq(0.25);
  ctx.strokeRect(L + cq(2.4), T + cq(2.4), R - L - cq(4.8), B - T - cq(4.8));
  for (const [x, y] of [
    [L, T],
    [R, T],
    [L, B],
    [R, B],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.lineWidth = cq(0.45);
    ctx.strokeRect(-cq(3), -cq(3), cq(6), cq(6));
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath();
    ctx.arc(0, 0, cq(0.9), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // small tooled ornaments in the inner corners: a quarter arc and a dot
  const iL = L + cq(2.4),
    iT = T + cq(2.4),
    iR = R - cq(2.4),
    iB = B - cq(2.4);
  ctx.lineWidth = cq(0.25);
  for (const [x, y, sx, sy] of [
    [iL, iT, 1, 1],
    [iR, iT, -1, 1],
    [iL, iB, 1, -1],
    [iR, iB, -1, -1],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.arc(0, 0, cq(4.2), 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cq(1.9), cq(1.9), cq(0.55), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let y = cq(13);
  // series line, kept inside the inner rule
  let sz = cq(5.4);
  ctx.font = `400 ${sz}px ${FONT}`;
  ctx.letterSpacing = `${sz * 0.16}px`;
  const room0 = iR - iL - cq(9);
  const wide = ctx.measureText('FIND SG · FIELD ARCHIVE').width;
  if (wide > room0) {
    sz *= room0 / wide;
    ctx.font = `400 ${sz}px ${FONT}`;
    ctx.letterSpacing = `${sz * 0.16}px`;
  }
  ctx.fillText('FIND SG · FIELD ARCHIVE', (iL + iR) / 2, y + (cq(5.4) - sz) / 2);
  y += cq(5.4) + cq(7);
  // title
  ctx.font = `400 ${cq(13)}px ${FONT}`;
  ctx.letterSpacing = '0px';
  for (const line of wrap(ctx, book.title, W * 0.82)) {
    ctx.fillText(line, W / 2, y);
    y += cq(13) * 1.04;
  }
  y += cq(4);
  // small caps line
  ctx.font = `400 ${cq(5.6)}px ${FONT}`;
  ctx.letterSpacing = `${cq(5.6) * 0.1}px`;
  for (const line of wrap(ctx, book.en, W * 0.88)) {
    ctx.fillText(line, W / 2, y);
    y += cq(5.6) * 1.3;
  }
  // from the bottom: numeral, flourish, drawing
  let by = H - cq(8) - cq(6.5);
  ctx.font = `400 ${cq(6.5)}px ${FONT}`;
  ctx.letterSpacing = '0px';
  ctx.fillText(book.roman, W / 2, by);
  by -= cq(2) + cq(4.5);
  ctx.font = `400 ${cq(4.5)}px Georgia, serif`;
  ctx.letterSpacing = `${cq(4.5) * 0.2}px`;
  ctx.fillText('~◆~', W / 2, by);
  by -= cq(3);
  // the drawing fills what is left between the words and the flourish, never running into either
  const room = by - (y + cq(3));
  const ah = Math.min((W * 0.9 * 100) / 120, room),
    aw = (ah * 120) / 100;
  ctx.drawImage(art, (W - aw) / 2, by - ah, aw, ah);
  ctx.restore();
}

/** Scuffs gathered along the four edges, thickest at the corners. */
function edgeWear(ctx: CanvasRenderingContext2D, r: () => number, ink: string, n: number) {
  ctx.save();
  ctx.fillStyle = ink;
  for (let i = 0; i < n; i++) {
    const d = r() ** 2.4 * cq(3.2);
    const along = r();
    const side = Math.floor(r() * 4);
    // corners take the most wear
    if (r() < 0.35) {
      const cx = r() < 0.5 ? 0 : W,
        cy = r() < 0.5 ? 0 : H;
      const a = r() * Math.PI * 2,
        rr = r() ** 2 * cq(5);
      ctx.fillRect(Math.abs(cx - Math.abs(Math.cos(a)) * rr), Math.abs(cy - Math.abs(Math.sin(a)) * rr), 1 + r() * 3, 1 + r() * 2);
      continue;
    }
    const x = side === 0 ? d : side === 1 ? W - d : along * W;
    const y = side === 2 ? d : side === 3 ? H - d : along * H;
    ctx.fillRect(x, y, 1 + r() * 4, 1 + r() * 2);
  }
  ctx.restore();
}

export async function paintCover(book: BookDef, seed: number): Promise<CoverMaps> {
  await Promise.all([document.fonts?.load(`40px 'IM Fell English'`), document.fonts?.ready]).catch(() => undefined);
  const [goldArt, whiteArt, darkArt] = await Promise.all([svgImage(book, '#e9c97c'), svgImage(book, '#ffffff'), svgImage(book, '#120b04')]);
  const r = rand(seed);

  // ---- bump: cloth weave, scuffs, foil pressed in ----
  const bump = canvas();
  const b = bump.getContext('2d')!;
  b.fillStyle = '#808080';
  b.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 3) {
    b.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.06})`;
    b.fillRect(x, 0, 1, H);
  }
  for (let y = 0; y < H; y += 3) {
    b.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.06})`;
    b.fillRect(0, y, W, 1);
  }
  for (let i = 0; i < 2600; i++) {
    b.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
    b.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3);
  }
  // the hinge groove by the spine, a blind-tooled rule round the edge, and the panel pressed in inside the frame
  b.save();
  b.filter = 'blur(3px)';
  b.fillStyle = '#3a3a3a';
  b.fillRect(cq(2.6), 0, cq(1.4), H);
  b.filter = 'blur(1px)';
  b.strokeStyle = '#4a4a4a';
  b.lineWidth = cq(0.35);
  b.strokeRect(cq(5.4), cq(2.2), W - cq(7.6), H - cq(4.4));
  b.filter = 'blur(4px)';
  b.fillStyle = '#5c5c5c';
  b.fillRect(cq(8.2), cq(6.2), W - cq(14.4), H - cq(12.4));
  b.restore();
  // worn edges are softer, rounded off
  edgeWear(b, r, 'rgba(0,0,0,.05)', 1800);
  // the foil is struck deeper still, with a soft shoulder
  b.save();
  b.filter = 'blur(2px)';
  b.globalAlpha = 0.5;
  await drawFoil(b, book, '#2a2a2a', whiteArt);
  b.restore();
  b.globalAlpha = 0.85;
  await drawFoil(b, book, '#2a2a2a', whiteArt);
  b.globalAlpha = 1;

  // ---- foil mask ----
  const foil = canvas();
  const f = foil.getContext('2d')!;
  f.fillStyle = '#000';
  f.fillRect(0, 0, W, H);
  await drawFoil(f, book, '#fff', whiteArt);

  // ---- colour: dyed cloth, worn at the edges, with the foil on top ----
  const color = canvas();
  const c = color.getContext('2d')!;
  c.fillStyle = book.tone;
  c.fillRect(0, 0, W, H);
  // uneven dye
  for (let i = 0; i < 70; i++) {
    // one centre for both circles: two different ones make hard-edged cones, not soft blotches
    const x = r() * W,
      y = r() * H;
    const g = c.createRadialGradient(x, y, 0, x, y, 60 + r() * 220);
    const light = r() > 0.5;
    g.addColorStop(0, light ? 'rgba(255,240,210,.05)' : 'rgba(0,0,0,.07)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  // weave
  for (let x = 0; x < W; x += 3) {
    c.fillStyle = `rgba(255,245,220,${0.02 + r() * 0.03})`;
    c.fillRect(x, 0, 1, H);
  }
  for (let y = 0; y < H; y += 3) {
    c.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`;
    c.fillRect(0, y, W, 1);
  }
  // rubbed edges and corners, where hands hold it
  const edge = c.createLinearGradient(0, 0, W, 0);
  edge.addColorStop(0, 'rgba(0,0,0,.35)');
  edge.addColorStop(0.06, 'rgba(0,0,0,0)');
  edge.addColorStop(0.95, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(255,235,200,.12)');
  c.fillStyle = edge;
  c.fillRect(0, 0, W, H);
  for (const [x, y] of [
    [W, 0],
    [W, H],
    [0, H],
  ]) {
    const g = c.createRadialGradient(x, y, 0, x, y, cq(16));
    g.addColorStop(0, 'rgba(255,235,200,.22)');
    g.addColorStop(1, 'rgba(255,235,200,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  // the hinge groove: a shadowed crease with a lit lip on the board side
  c.fillStyle = 'rgba(0,0,0,.32)';
  c.fillRect(cq(2.6), 0, cq(1.1), H);
  c.fillStyle = 'rgba(255,240,215,.07)';
  c.fillRect(cq(3.7), 0, cq(0.6), H);
  // the blind rule: pressed cloth is darker and a little glossy
  c.strokeStyle = 'rgba(0,0,0,.28)';
  c.lineWidth = cq(0.35);
  c.strokeRect(cq(5.4), cq(2.2), W - cq(7.6), H - cq(4.4));
  // the debossed panel: darker where the cloth is pressed, a shadowed wall at the top and left, a lit one opposite
  const pL = cq(8.2),
    pT = cq(6.2),
    pR = W - cq(6.2),
    pB = H - cq(6.2);
  c.fillStyle = 'rgba(0,0,0,.14)';
  c.fillRect(pL, pT, pR - pL, pB - pT);
  const inner = c.createRadialGradient(W * 0.45, H * 0.4, 0, W * 0.45, H * 0.4, H * 0.62);
  inner.addColorStop(0, 'rgba(255,240,210,.05)');
  inner.addColorStop(1, 'rgba(0,0,0,.12)');
  c.fillStyle = inner;
  c.fillRect(pL, pT, pR - pL, pB - pT);
  c.save();
  c.filter = 'blur(2px)';
  c.fillStyle = 'rgba(0,0,0,.5)';
  c.fillRect(pL, pT, pR - pL, cq(0.8));
  c.fillRect(pL, pT, cq(0.8), pB - pT);
  c.fillStyle = 'rgba(255,236,200,.2)';
  c.fillRect(pL, pB - cq(0.6), pR - pL, cq(0.6));
  c.fillRect(pR - cq(0.6), pT, cq(0.6), pB - pT);
  c.restore();
  // rubbed cloth along every edge: lighter fibres showing through
  edgeWear(c, r, 'rgba(255,232,196,.10)', 3200);
  // gold leaf: warm, with a brighter band where it was burnished
  const gold = c.createLinearGradient(0, 0, W * 0.6, H);
  gold.addColorStop(0, '#f6e2a6');
  gold.addColorStop(0.28, '#dcb966');
  gold.addColorStop(0.45, '#f1d690');
  gold.addColorStop(0.7, '#c49b4e');
  gold.addColorStop(1, '#a98240');
  // a fine dark keyline under the foil, so the gold reads as stamped into the cloth
  c.save();
  c.translate(cq(0.25), cq(0.3));
  c.globalAlpha = 0.45;
  await drawFoil(c, book, '#120b04', darkArt);
  c.restore();
  await drawFoil(c, book, gold, goldArt);
  // foil wears off in places
  c.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 900; i++) {
    c.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.25})`;
    c.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 2);
  }
  c.globalCompositeOperation = 'source-over';
  return { color, foil, bump };
}

/** Where the raised bands sit on the spine, as fractions of its height from the top (the scene builds them to match). */
export const SPINE_BANDS = [0.1, 0.25, 0.4, 0.6, 0.75, 0.9];

/** The spine: same cloth, rounded, gold rules either side of each raised band, the numeral in its own panel. */
export function paintSpine(book: BookDef, seed: number) {
  const w = 192,
    h = 1024;
  const sp = canvas(w, h);
  const c = sp.getContext('2d')!;
  const r = rand(seed + 7);
  c.fillStyle = book.tone;
  c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    c.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    c.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 3) {
    c.fillStyle = `rgba(255,245,220,${0.015 + r() * 0.025})`;
    c.fillRect(x, 0, 1, h);
  }
  // rubbed at head and tail, where it is pulled off the shelf
  for (const y0 of [0, h]) {
    const g = c.createLinearGradient(0, y0, 0, y0 === 0 ? 60 : h - 60);
    g.addColorStop(0, 'rgba(255,232,196,.22)');
    g.addColorStop(1, 'rgba(255,232,196,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
  const gold = c.createLinearGradient(0, 0, w, 0);
  gold.addColorStop(0, '#a98240');
  gold.addColorStop(0.5, '#f1d690');
  gold.addColorStop(1, '#a98240');
  c.fillStyle = gold;
  c.strokeStyle = gold;
  const ys = SPINE_BANDS.map((f) => f * h);
  for (const y of ys) {
    c.fillRect(10, y - 18, w - 20, 3);
    c.fillRect(10, y + 15, w - 20, 3);
  }
  // a fleuron in each plain panel; the numeral in the second
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let i = 0; i < ys.length - 1; i++) {
    const mid = (ys[i] + ys[i + 1]) / 2;
    if (i === 0) {
      c.font = `400 58px ${FONT}`;
      c.fillText(book.roman, w / 2, mid + 4);
      continue;
    }
    c.save();
    c.translate(w / 2, mid);
    c.rotate(Math.PI / 4);
    c.lineWidth = 3;
    c.strokeRect(-11, -11, 22, 22);
    c.fillRect(-4, -4, 8, 8);
    c.restore();
    for (const dx of [-34, 34]) {
      c.beginPath();
      c.arc(w / 2 + dx, mid, 3.5, 0, Math.PI * 2);
      c.fill();
    }
  }
  // the rounded back: darker towards the joints
  const round = c.createLinearGradient(0, 0, w, 0);
  round.addColorStop(0, 'rgba(0,0,0,.4)');
  round.addColorStop(0.5, 'rgba(0,0,0,0)');
  round.addColorStop(1, 'rgba(0,0,0,.4)');
  c.fillStyle = round;
  c.fillRect(0, 0, w, h);
  return sp;
}

/** Page edges: hundreds of sheets seen side-on. `top` is gilt (a gold leaf edge, laid on the paper); the fore-edge is
 * cream, sprinkled with fine red-brown speckle, as old field ledgers were. */
export function paintPages(kind: 'top' | 'fore') {
  // the top is wide and shallow; the fore-edge is tall and shallow (sheets across, height down)
  const w = kind === 'top' ? 512 : 128,
    h = kind === 'top' ? 128 : 1024;
  const pg = canvas(w, h);
  const c = pg.getContext('2d')!;
  const r = rand(kind === 'top' ? 3 : 5);
  // sheets run along the long side of the canvas; on the fore-edge they are drawn as columns
  const across = kind === 'top' ? h : w;
  c.fillStyle = kind === 'top' ? '#d9b86e' : '#ece0c2';
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < across; i += 1) {
    c.fillStyle = r() > 0.5 ? `rgba(110,80,40,${0.06 + r() * 0.12})` : `rgba(255,250,235,${0.25 * r()})`;
    if (kind === 'top') c.fillRect(0, i, w, 1);
    else c.fillRect(i, 0, 1, h);
  }
  if (kind === 'top') {
    // burnished leaf: a soft bright band and a little rub-through at the corners
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(90,60,20,.3)');
    g.addColorStop(0.35, 'rgba(255,240,190,.25)');
    g.addColorStop(0.7, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(90,60,20,.35)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  } else {
    for (let i = 0; i < 1600; i++) {
      c.fillStyle = `rgba(${120 + r() * 50},${40 + r() * 20},${25 + r() * 15},${0.25 + r() * 0.45})`;
      const s = 0.6 + r() * 1.8;
      c.fillRect(r() * w, r() * h, s, s);
    }
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(150,110,60,.18)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(150,110,60,.22)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
  return pg;
}

/** Walnut, with grain running along the plank. */
export function paintWood(w = 1024, h = 256, tone = [92, 58, 34] as [number, number, number], seed = 11) {
  const wd = canvas(w, h);
  const c = wd.getContext('2d')!;
  const r = rand(seed);
  const img = c.createImageData(w, h);
  const waves = Array.from({ length: 6 }, () => ({ f: 0.004 + r() * 0.02, p: r() * 6, a: 3 + r() * 9 }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = y;
      for (const wv of waves) v += Math.sin(x * wv.f + wv.p) * wv.a;
      const ring = (Math.sin(v * 0.42) + 1) / 2;
      const fine = (Math.sin(v * 2.7 + x * 0.002) + 1) / 2;
      const k = 0.78 + ring * 0.2 + fine * 0.05 + (r() - 0.5) * 0.05;
      const i = (y * w + x) * 4;
      img.data[i] = tone[0] * k;
      img.data[i + 1] = tone[1] * k;
      img.data[i + 2] = tone[2] * k;
      img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return wd;
}

/** Fine green baize for the back of the case: felted, with soft uneven dye. */
export function paintBaize(w = 512, h = 512, tone = [38, 56, 44] as [number, number, number], seed = 31) {
  const bz = canvas(w, h);
  const c = bz.getContext('2d')!;
  const r = rand(seed);
  const img = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const k = 0.86 + r() * 0.22;
    img.data[i * 4] = tone[0] * k;
    img.data[i * 4 + 1] = tone[1] * k;
    img.data[i * 4 + 2] = tone[2] * k;
    img.data[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  for (let i = 0; i < 40; i++) {
    const x = r() * w,
      y = r() * h;
    const g = c.createRadialGradient(x, y, 0, x, y, 40 + r() * 120);
    g.addColorStop(0, r() > 0.5 ? 'rgba(255,255,240,.04)' : 'rgba(0,0,0,.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
  return bz;
}

/** A small tile of bookcloth weave, as a height map, for the boards' edges, the back board and the spine. */
export function paintWeave(size = 128) {
  const wv = canvas(size, size);
  const c = wv.getContext('2d')!;
  const r = rand(17);
  c.fillStyle = '#808080';
  c.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i += 2) {
    c.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.08})`;
    c.fillRect(i, 0, 1, size);
    c.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.08})`;
    c.fillRect(0, i, size, 1);
  }
  return wv;
}
