// What Public's 3D pieces are painted with: challenge posters (the route's picture, its name and dates, a rubber stamp),
// the sealed notice for stories not written yet, cork for the board, and the brass plates on the podium (height maps,
// turned into relief by look.ts).
import { canvas, rand } from '../notebook/shelf3d/look';

const DISPLAY = "'Oswald', 'Arial Narrow', sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = "'IM Fell English', Georgia, serif";

export interface PosterDef {
  id: string;
  kind: 'challenge' | 'notice';
  /** Small line over the title, e.g. "WEEKEND CHALLENGE". */
  kicker: string;
  title: string;
  /** "7–8 NOV". */
  dates: string;
  /** "8 PLACES · 214 JOINED · BEST 96 MIN". */
  facts: string;
  /** The rubber stamp: "ON NOW", "IN 5 DAYS", "SOON". */
  stamp: string;
  hot: boolean;
  routeId?: string;
  /** The story the route tells (its chart's title). */
  story?: string;
  image?: string;
}

export const PW = 640;
export const PH = 880;

/** Fonts the posters are lettered in: wait for them so the first paint is not in a fallback face. */
export function fontsReady() {
  const f = document.fonts;
  if (!f?.load) return Promise.resolve();
  return Promise.all([f.load(`600 64px Oswald`), f.load(`400 24px 'IBM Plex Mono'`), f.load(`400 30px 'IM Fell English'`)])
    .then(() => undefined)
    .catch(() => undefined);
}

function paper(x: CanvasRenderingContext2D, w: number, h: number, seed: number, base = '#efe3c4') {
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);
  const r = rand(seed);
  for (let i = 0; i < 30; i++) {
    const px = r() * w,
      py = r() * h,
      rr = 10 + r() * 70;
    const g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, `rgba(150,100,40,${0.03 + r() * 0.07})`);
    g.addColorStop(1, 'rgba(150,100,40,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  }
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = `rgba(90,60,30,${r() * 0.06})`;
    x.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
  }
  const e = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  e.addColorStop(0, 'rgba(120,80,30,0)');
  e.addColorStop(1, 'rgba(120,80,30,.35)');
  x.fillStyle = e;
  x.fillRect(0, 0, w, h);
}

function stamp(x: CanvasRenderingContext2D, text: string, cx: number, cy: number, hot: boolean) {
  x.save();
  x.translate(cx, cy);
  x.rotate(-0.22);
  const ink = hot ? 'rgba(178,40,24,.9)' : 'rgba(40,52,92,.85)';
  x.strokeStyle = ink;
  x.fillStyle = ink;
  x.lineWidth = 6;
  x.beginPath();
  x.arc(0, 0, 78, 0, Math.PI * 2);
  x.stroke();
  x.lineWidth = 2;
  x.beginPath();
  x.arc(0, 0, 66, 0, Math.PI * 2);
  x.stroke();
  x.font = `600 ${text.length > 7 ? 26 : 32}px ${DISPLAY}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.letterSpacing = '2px';
  x.fillText(text, 0, 2);
  x.font = `400 13px ${MONO}`;
  x.letterSpacing = '3px';
  x.fillText('FINDSG', 0, -38);
  x.fillText('★ HUNT ★', 0, 40);
  // rubbed-out patches, so it reads as ink from a worn stamp
  x.globalCompositeOperation = 'destination-out';
  const r = rand(text.length * 13);
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`;
    x.fillRect(-90 + r() * 180, -90 + r() * 180, 2 + r() * 6, 1 + r() * 3);
  }
  x.restore();
}

function wrap(x: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' ');
  const rows: string[] = [];
  let row = '';
  for (const w of words) {
    if (row && x.measureText(`${row} ${w}`).width > maxW) {
      rows.push(row);
      row = w;
    } else row = row ? `${row} ${w}` : w;
  }
  rows.push(row);
  return rows;
}

/** A challenge poster: the route's picture across the top, the name under it, dates and numbers, a stamp. */
export function posterCanvas(p: PosterDef, seed: number, photo?: HTMLImageElement) {
  const c = canvas(PW, PH),
    x = c.getContext('2d')!;
  paper(x, PW, PH, seed);
  const ink = '#2c2117',
    rust = '#a8481f';
  if (p.kind === 'notice') return noticeCanvas(c, x, p);

  // the photo, cover-cropped, with a thin ink rule round it
  const px = 40,
    py = 40,
    pw = PW - 80,
    ph = 470;
  x.fillStyle = '#2b2925';
  x.fillRect(px, py, pw, ph);
  if (photo && photo.width) {
    const s = Math.max(pw / photo.width, ph / photo.height);
    const sw = pw / s,
      sh = ph / s;
    x.save();
    x.beginPath();
    x.rect(px, py, pw, ph);
    x.clip();
    x.filter = p.hot ? 'saturate(1.05) contrast(1.04)' : 'grayscale(.55) sepia(.35) contrast(1.05)';
    x.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, px, py, pw, ph);
    x.filter = 'none';
    x.restore();
  }
  x.strokeStyle = ink;
  x.lineWidth = 3;
  x.strokeRect(px, py, pw, ph);

  let y = py + ph + 50;
  x.fillStyle = rust;
  x.font = `500 26px ${DISPLAY}`;
  x.letterSpacing = '6px';
  x.textBaseline = 'alphabetic';
  x.fillText(p.kicker, px, y);
  x.letterSpacing = '0px';
  y += 70;
  x.fillStyle = ink;
  x.font = `600 68px ${DISPLAY}`;
  for (const row of wrap(x, p.title, pw).slice(0, 2)) {
    x.fillText(row, px, y);
    y += 70;
  }
  y += 2;
  x.fillStyle = rust;
  x.fillRect(px, y - 26, pw, 3);
  x.fillStyle = ink;
  x.font = `500 34px ${DISPLAY}`;
  x.letterSpacing = '2px';
  x.fillText(p.dates, px, y + 22);
  x.font = `400 21px ${MONO}`;
  x.letterSpacing = '1px';
  x.fillStyle = '#4d3b28';
  x.fillText(p.facts, px, y + 66);
  x.letterSpacing = '0px';
  stamp(x, p.stamp, PW - 128, py + ph - 70, p.hot);
  return c;
}

/** Stories you will write from your own streets: not open yet, so a sealed letter pinned up, not a form. */
function noticeCanvas(c: HTMLCanvasElement, x: CanvasRenderingContext2D, p: PosterDef) {
  const ink = '#2c2117';
  // an envelope's flap lines
  x.strokeStyle = 'rgba(90,60,30,.45)';
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(30, 30);
  x.lineTo(PW / 2, PH * 0.42);
  x.lineTo(PW - 30, 30);
  x.stroke();
  x.strokeStyle = ink;
  x.lineWidth = 2;
  x.strokeRect(24, 24, PW - 48, PH - 48);
  x.fillStyle = '#a8481f';
  x.font = `500 26px ${DISPLAY}`;
  x.letterSpacing = '6px';
  x.textAlign = 'center';
  x.fillText(p.kicker, PW / 2, PH * 0.6);
  x.letterSpacing = '0px';
  x.fillStyle = ink;
  x.font = `600 62px ${DISPLAY}`;
  let y = PH * 0.6 + 76;
  for (const row of wrap(x, p.title, PW - 120)) {
    x.fillText(row, PW / 2, y);
    y += 66;
  }
  x.font = `400 30px ${SERIF}`;
  x.fillStyle = '#4d3b28';
  for (const row of wrap(x, p.facts, PW - 140)) {
    x.fillText(row, PW / 2, y + 6);
    y += 38;
  }
  x.textAlign = 'left';
  return c;
}

/** Cork: warm brown, flecked, a little uneven. Returned as colour; its own luminance doubles as a bump map. */
export function corkCanvas() {
  const s = 512,
    c = canvas(s),
    x = c.getContext('2d')!;
  x.fillStyle = '#9a6a3e';
  x.fillRect(0, 0, s, s);
  const r = rand(23);
  for (let i = 0; i < 9000; i++) {
    const v = r();
    x.fillStyle = v > 0.6 ? `rgba(70,40,18,${0.2 + r() * 0.4})` : `rgba(214,170,112,${0.15 + r() * 0.35})`;
    const rr = 0.6 + r() * 2.4;
    x.beginPath();
    x.arc(r() * s, r() * s, rr, 0, Math.PI * 2);
    x.fill();
  }
  return c;
}

/** The brass plate on a podium step: rank numeral, name, value (height map: white = raised). */
export function plateCanvas(roman: string, name: string, value: string) {
  const w = 512,
    h = 256,
    c = canvas(w, h),
    x = c.getContext('2d')!;
  x.fillStyle = '#383838';
  x.fillRect(0, 0, w, h);
  x.strokeStyle = '#e0e0e0';
  x.lineWidth = 6;
  x.strokeRect(14, 14, w - 28, h - 28);
  x.strokeStyle = '#5a5a5a';
  x.lineWidth = 2;
  x.strokeRect(26, 26, w - 52, h - 52);
  x.fillStyle = '#f0f0f0';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = `400 64px ${SERIF}`;
  x.fillText(roman, w / 2, 76);
  x.font = `600 ${name.length > 9 ? 46 : 54}px ${DISPLAY}`;
  x.fillText(name.toUpperCase(), w / 2, 146);
  x.font = `500 34px ${DISPLAY}`;
  x.letterSpacing = '3px';
  x.fillText(value.toUpperCase(), w / 2, 204);
  return c;
}

/** Worn brass for a plate of any shape: bright where raised, dark where dirt sits (white = raised in the height map). */
export function patinaRect(height: HTMLCanvasElement, light: string, dark: string) {
  const w = height.width,
    h = height.height,
    c = canvas(w, h),
    x = c.getContext('2d')!;
  x.fillStyle = dark;
  x.fillRect(0, 0, w, h);
  const d = height.getContext('2d')!.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) d.data[i * 4 + 3] = Math.min(255, 60 + d.data[i * 4] * 1.1);
  const m = canvas(w, h);
  m.getContext('2d')!.putImageData(d, 0, 0);
  const tmp = canvas(w, h),
    t = tmp.getContext('2d')!;
  t.fillStyle = light;
  t.fillRect(0, 0, w, h);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(m, 0, 0);
  x.drawImage(tmp, 0, 0);
  return c;
}
