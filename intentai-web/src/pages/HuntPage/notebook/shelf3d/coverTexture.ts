// Paints a book's front board for the 3D shelf from the same pieces the flat cover uses (BookCover in Bookshelf.tsx):
// the series line, title, small-caps line, gold line drawing, flourish and numeral, laid out in the same proportions.
// Three canvases come out: the colour (cloth with gold foil), a foil mask (where the board is metal, for metalness and
// roughness), and a bump map (cloth weave, with the foil pressed into it).
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
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let y = cq(13);
  // series line
  ctx.font = `400 ${cq(5.4)}px ${FONT}`;
  ctx.letterSpacing = `${cq(5.4) * 0.16}px`;
  ctx.fillText('FIND SG · FIELD ARCHIVE', W / 2, y);
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

export async function paintCover(book: BookDef, seed: number): Promise<CoverMaps> {
  await Promise.all([document.fonts?.load(`40px 'IM Fell English'`), document.fonts?.ready]).catch(() => undefined);
  const [goldArt, whiteArt] = await Promise.all([svgImage(book, '#e9c97c'), svgImage(book, '#ffffff')]);
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
  // the foil sits a little below the cloth
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
    const g = c.createRadialGradient(r() * W, r() * H, 0, r() * W, r() * H, 60 + r() * 220);
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
  const gold = c.createLinearGradient(0, 0, 0, H);
  gold.addColorStop(0, '#f3dda0');
  gold.addColorStop(0.5, '#d9b76c');
  gold.addColorStop(1, '#b08a44');
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

/** The spine: same cloth, raised bands across it, the numeral in gold. */
export function paintSpine(book: BookDef, seed: number) {
  const w = 128,
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
  const round = c.createLinearGradient(0, 0, w, 0);
  round.addColorStop(0, 'rgba(0,0,0,.45)');
  round.addColorStop(0.45, 'rgba(255,240,210,.08)');
  round.addColorStop(1, 'rgba(0,0,0,.4)');
  c.fillStyle = round;
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#d9b76c';
  for (const y of [70, 92, h - 92, h - 70]) c.fillRect(8, y, w - 16, 5);
  c.font = `400 44px ${FONT}`;
  c.textAlign = 'center';
  c.fillText(book.roman, w / 2, h / 2 + 14);
  return sp;
}

/** Page edges: hundreds of sheets seen side-on, a little uneven and yellowed. */
export function paintPages(vertical: boolean) {
  const w = 512,
    h = 64;
  const pg = canvas(w, h);
  const c = pg.getContext('2d')!;
  const r = rand(vertical ? 3 : 5);
  c.fillStyle = '#e9dcbc';
  c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 1) {
    c.fillStyle = r() > 0.5 ? `rgba(120,90,50,${0.08 + r() * 0.12})` : `rgba(255,250,235,${0.2 * r()})`;
    c.fillRect(0, y, w, 1);
  }
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(150,110,60,.18)');
  g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(150,110,60,.22)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
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
