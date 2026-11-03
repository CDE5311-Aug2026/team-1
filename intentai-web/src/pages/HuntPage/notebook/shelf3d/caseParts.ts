// What goes in the display case, painted: struck medal faces (as height maps, turned into relief by look.ts), the bronze
// blank of a story still under way (a notch cut for each stop found), ribbon silk, wallpaper, and each story's route
// chart, inked from the real stop positions (only the stops you have found are inked).
import * as THREE from 'three';
import { COAST, KALLANG, RIVER } from '../pages';
import { canvas, rand } from './look';

const SERIF = "'IM Fell English', Georgia, serif";

function arcText(x: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, size: number, start = -Math.PI / 2, bottom = false) {
  x.save();
  x.font = `400 ${size}px ${SERIF}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const chars = [...text];
  const widths = chars.map((c) => x.measureText(c).width + size * 0.12);
  const total = widths.reduce((a, b) => a + b, 0);
  let a = start - ((bottom ? -1 : 1) * total) / r / 2;
  chars.forEach((c, i) => {
    const step = widths[i] / r;
    a += ((bottom ? -1 : 1) * step) / 2;
    x.save();
    x.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    x.rotate(a + (bottom ? -Math.PI / 2 : Math.PI / 2));
    x.fillText(c, 0, 0);
    x.restore();
    a += ((bottom ? -1 : 1) * step) / 2;
  });
  x.restore();
}

function laurel(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, shade: string) {
  x.fillStyle = shade;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const a = Math.PI / 2 + side * (0.35 + i * 0.2);
      const px = cx + Math.cos(a) * r,
        py = cy + Math.sin(a) * r;
      x.save();
      x.translate(px, py);
      x.rotate(a + side * 0.9);
      x.beginPath();
      x.ellipse(0, 0, r * 0.12, r * 0.045, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
  }
}

/** The obverse: the story's landmark struck in relief (a laurel and its numeral until the drawing has loaded), the
 *  legend round the rim. Height map: grey field, white = raised. */
export function medalObverse(roman: string, legend: string, art?: HTMLImageElement) {
  const s = 512,
    c = canvas(s),
    x = c.getContext('2d')!;
  x.fillStyle = '#6a6a6a';
  x.fillRect(0, 0, s, s);
  // bead ring
  x.fillStyle = '#c8c8c8';
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    x.beginPath();
    x.arc(s / 2 + Math.cos(a) * s * 0.455, s / 2 + Math.sin(a) * s * 0.455, 4, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = '#d8d8d8';
  arcText(x, legend, s / 2, s / 2, s * 0.385, 30);
  if (art) {
    // the drawing fills the field; its numeral in an exergue under a line
    const aw = s * 0.6,
      ah = (aw * art.height) / art.width;
    x.drawImage(art, s / 2 - aw / 2, s / 2 - ah / 2 - 18, aw, ah);
    x.fillStyle = '#e6e6e6';
    x.fillRect(s * 0.3, s * 0.66, s * 0.4, 4);
    x.font = `400 44px ${SERIF}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(roman, s / 2, s * 0.73);
    return c;
  }
  laurel(x, s / 2, s / 2 + 8, s * 0.28, '#bdbdbd');
  x.fillStyle = '#f2f2f2';
  x.font = `400 150px ${SERIF}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(roman, s / 2, s / 2 + 10);
  // a star above
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      rr = i % 2 ? 7 : 17;
    x.lineTo(s / 2 + Math.cos(a) * rr, s * 0.27 + Math.sin(a) * rr);
  }
  x.fill();
  return c;
}

/** The reverse: what you did, engraved (cut in, so dark = deep). */
export function medalReverse(lines: string[], ring: string) {
  const s = 512,
    c = canvas(s),
    x = c.getContext('2d')!;
  x.fillStyle = '#a0a0a0';
  x.fillRect(0, 0, s, s);
  x.strokeStyle = '#4a4a4a';
  x.lineWidth = 3;
  x.beginPath();
  x.arc(s / 2, s / 2, s * 0.43, 0, Math.PI * 2);
  x.stroke();
  x.fillStyle = '#3a3a3a';
  arcText(x, ring, s / 2, s / 2, s * 0.375, 30, Math.PI / 2, true);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const sizes = [46, 32, 32, 32, 32];
  let y = s / 2 - ((lines.length - 1) * 46) / 2 - 22;
  lines.forEach((l, i) => {
    x.font = `400 ${sizes[i] ?? 24}px ${SERIF}`;
    // wrap the title
    const words = l.split(' ');
    const rows: string[] = [];
    let row = '';
    for (const w of words) {
      if (x.measureText(`${row} ${w}`).width > s * 0.66 && row) {
        rows.push(row);
        row = w;
      } else row = row ? `${row} ${w}` : w;
    }
    rows.push(row);
    for (const r of rows) {
      x.fillText(r, s / 2, y);
      y += (sizes[i] ?? 24) * 1.15;
    }
    if (i === 0) {
      x.fillRect(s / 2 - 50, y - 6, 100, 2);
      y += 16;
    } else y += 6;
  });
  return c;
}

/** A blank not yet struck: matte bronze, with a notch cut round the rim for every stop found, n of N engraved, and the
 *  design it will carry scribed lightly on it (the landmark, once its drawing has loaded). */
export function planchet(found: number, total: number, art?: HTMLImageElement) {
  const s = 512,
    c = canvas(s),
    x = c.getContext('2d')!;
  x.fillStyle = '#8a8a8a';
  x.fillRect(0, 0, s, s);
  if (art) {
    const aw = s * 0.56,
      ah = (aw * art.height) / art.width;
    x.globalAlpha = 0.55;
    x.drawImage(art, s / 2 - aw / 2, s / 2 - ah / 2 - 30, aw, ah);
    x.globalAlpha = 1;
  }
  for (let i = 0; i < total; i++) {
    const a = -Math.PI / 2 + (i / total) * Math.PI * 2;
    x.save();
    x.translate(s / 2 + Math.cos(a) * s * 0.4, s / 2 + Math.sin(a) * s * 0.4);
    x.rotate(a);
    x.fillStyle = i < found ? '#1e1e1e' : '#7a7a7a';
    x.fillRect(-16, -5, 32, 10);
    x.restore();
  }
  x.fillStyle = '#2e2e2e';
  x.font = `400 64px ${SERIF}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(`${found} / ${total}`, s / 2, s * 0.72);
  return c;
}

/** The colour of bronze and gold where it is worn (raised: bright) and where dirt sits (recessed: dark). */
export function patina(height: HTMLCanvasElement, light: string, dark: string) {
  const s = height.width,
    c = canvas(s),
    x = c.getContext('2d')!;
  x.fillStyle = dark;
  x.fillRect(0, 0, s, s);
  const tmp = canvas(s),
    t = tmp.getContext('2d')!;
  t.fillStyle = light;
  t.fillRect(0, 0, s, s);
  t.globalCompositeOperation = 'destination-in';
  // use the height as the mask
  const d = height.getContext('2d')!.getImageData(0, 0, s, s);
  for (let i = 0; i < s * s; i++) d.data[i * 4 + 3] = Math.min(255, 60 + d.data[i * 4] * 1.1);
  const m = canvas(s);
  m.getContext('2d')!.putImageData(d, 0, 0);
  t.drawImage(m, 0, 0);
  x.drawImage(tmp, 0, 0);
  return c;
}

/** Fine reeding round a coin's edge. */
export function reeding() {
  const c = canvas(512, 16),
    x = c.getContext('2d')!;
  for (let i = 0; i < 512; i += 4) {
    x.fillStyle = '#ffffff';
    x.fillRect(i, 0, 2, 16);
    x.fillStyle = '#404040';
    x.fillRect(i + 2, 0, 2, 16);
  }
  return c;
}

/** Ribbon silk in the story's colour, gold edges and a cream centre thread, with the weave in it. */
export function ribbon(tone: string) {
  const c = canvas(128, 256),
    x = c.getContext('2d')!;
  x.fillStyle = tone;
  x.fillRect(0, 0, 128, 256);
  x.fillStyle = '#d6b264';
  x.fillRect(8, 0, 12, 256);
  x.fillRect(108, 0, 12, 256);
  x.fillStyle = '#efe2c2';
  x.fillRect(60, 0, 8, 256);
  const r = rand(5);
  for (let y = 0; y < 256; y += 2) {
    x.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.04 + r() * 0.05})`;
    x.fillRect(0, y, 128, 1);
  }
  return c;
}

/** Dark damask wallpaper behind the case, hand-printed and a little uneven. */
export function wallpaper() {
  const s = 512,
    c = canvas(s),
    x = c.getContext('2d')!;
  x.fillStyle = '#3a3824';
  x.fillRect(0, 0, s, s);
  const r = rand(17);
  for (let i = 0; i < 60; i++) {
    const g = x.createRadialGradient(r() * s, r() * s, 0, r() * s, r() * s, 60 + r() * 140);
    g.addColorStop(0, `rgba(${r() > 0.5 ? '70,64,40' : '20,18,10'},.25)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
  }
  // the motif: a stylised lotus in a lozenge, offset rows
  x.strokeStyle = 'rgba(176,150,86,.42)';
  x.fillStyle = 'rgba(176,150,86,.2)';
  x.lineWidth = 2;
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      const cx = col * 128 + (row % 2 ? 64 : 0),
        cy = row * 128 + 64;
      x.beginPath();
      x.moveTo(cx, cy - 52);
      x.quadraticCurveTo(cx + 40, cy, cx, cy + 52);
      x.quadraticCurveTo(cx - 40, cy, cx, cy - 52);
      x.stroke();
      for (const sd of [-1, 1]) {
        x.beginPath();
        x.moveTo(cx, cy + 20);
        x.quadraticCurveTo(cx + sd * 30, cy - 4, cx + sd * 18, cy - 30);
        x.quadraticCurveTo(cx + sd * 6, cy - 6, cx, cy + 20);
        x.fill();
      }
      x.beginPath();
      x.arc(cx + 64, cy + 64, 3, 0, Math.PI * 2);
      x.fill();
    }
  return c;
}

export interface MapPin {
  lat: number;
  lng: number;
  done: boolean;
  name: string;
}

/** Parchment, foxed and darker at the edges. */
function parchment(x: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  x.fillStyle = '#ead9b0';
  x.fillRect(0, 0, w, h);
  const r = rand(seed);
  for (let i = 0; i < 26; i++) {
    const px = r() * w,
      py = r() * h,
      rr = 8 + r() * 50;
    const g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, `rgba(150,100,40,${0.05 + r() * 0.1})`);
    g.addColorStop(1, 'rgba(150,100,40,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  }
  const e = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  e.addColorStop(0, 'rgba(120,80,30,0)');
  e.addColorStop(1, 'rgba(120,80,30,.45)');
  x.fillStyle = e;
  x.fillRect(0, 0, w, h);
}

export function paperBack() {
  const c = canvas(256, 320);
  parchment(c.getContext('2d')!, 256, 320, 99);
  return c;
}

/** A story's route chart: coast and river where they fall, the stops in order with the path between them, a rose. */
export function routeChart(title: string, place: string, pins: MapPin[], finished: boolean, seed = 3, art?: HTMLImageElement) {
  const w = 768,
    h = 992,
    c = canvas(w, h),
    x = c.getContext('2d')!;
  parchment(x, w, h, seed);
  const ink = '#3a2412',
    red = '#9b2c1c';
  // double rule border
  x.strokeStyle = ink;
  x.lineWidth = 3;
  x.strokeRect(34, 34, w - 68, h - 68);
  x.lineWidth = 1;
  x.strokeRect(44, 44, w - 88, h - 88);
  // title cartouche
  x.fillStyle = ink;
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  x.font = `italic 400 26px ${SERIF}`;
  x.fillText(`A chart of ${place}`, w / 2, 98);
  x.font = `400 44px ${SERIF}`;
  x.fillText(title, w / 2, 146, w - 140);
  x.fillRect(w / 2 - 90, 162, 180, 1.5);

  // the map's window
  const box = { x: 70, y: 190, w: w - 140, h: h - 330 };
  const pts = pins.length ? pins : [{ lat: 1.29, lng: 103.85, done: false, name: '' }];
  let la0 = Math.min(...pts.map((p) => p.lat)),
    la1 = Math.max(...pts.map((p) => p.lat)),
    lo0 = Math.min(...pts.map((p) => p.lng)),
    lo1 = Math.max(...pts.map((p) => p.lng));
  const k = Math.cos((((la0 + la1) / 2) * Math.PI) / 180);
  let spanX = (lo1 - lo0) * k,
    spanY = la1 - la0;
  const want = box.w / box.h;
  const minSpan = pins.length > 3 ? 0.0055 : 0.014;
  spanX = Math.max(spanX, minSpan);
  spanY = Math.max(spanY, minSpan);
  if (spanX / spanY > want) spanY = spanX / want;
  else spanX = spanY * want;
  spanX *= 1.35;
  spanY *= 1.35;
  const cLa = (la0 + la1) / 2,
    cLo = (lo0 + lo1) / 2;
  la0 = cLa - spanY / 2;
  la1 = cLa + spanY / 2;
  lo0 = cLo - spanX / k / 2;
  lo1 = cLo + spanX / k / 2;
  const P = (lat: number, lng: number) => [box.x + ((lng - lo0) / (lo1 - lo0)) * box.w, box.y + ((la1 - lat) / (la1 - la0)) * box.h] as const;

  x.save();
  x.beginPath();
  x.rect(box.x, box.y, box.w, box.h);
  x.clip();
  // graticule
  x.strokeStyle = 'rgba(58,36,18,.12)';
  x.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    x.beginPath();
    x.moveTo(box.x + (box.w * i) / 6, box.y);
    x.lineTo(box.x + (box.w * i) / 6, box.y + box.h);
    x.moveTo(box.x, box.y + (box.h * i) / 6);
    x.lineTo(box.x + box.w, box.y + (box.h * i) / 6);
    x.stroke();
  }
  // water: coast (sea to the south), the river, the Kallang
  const path = (line: [number, number][]) => {
    x.beginPath();
    line.forEach(([la, lo], i) => {
      const [px, py] = P(la, lo);
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    });
  };
  path(COAST);
  const [ex] = P(COAST[COAST.length - 1][0], COAST[COAST.length - 1][1]);
  x.lineTo(ex, box.y + box.h + 400);
  x.lineTo(P(COAST[0][0], COAST[0][1])[0], box.y + box.h + 400);
  x.closePath();
  x.fillStyle = 'rgba(70,110,120,.16)';
  x.fill();
  path(COAST);
  x.strokeStyle = 'rgba(40,70,80,.55)';
  x.lineWidth = 2;
  x.stroke();
  // sea hatching along the coast
  x.lineWidth = 1;
  x.strokeStyle = 'rgba(40,70,80,.22)';
  for (let o = 8; o <= 32; o += 8) {
    x.save();
    x.translate(0, o);
    path(COAST);
    x.stroke();
    x.restore();
  }
  for (const river of [RIVER, KALLANG]) {
    path(river);
    x.strokeStyle = 'rgba(60,100,110,.45)';
    x.lineWidth = 7;
    x.stroke();
    x.strokeStyle = 'rgba(200,215,205,.5)';
    x.lineWidth = 3;
    x.stroke();
  }
  // the route: inked between stops you found, pencilled ahead
  const proj = pins.map((p) => ({ ...p, xy: P(p.lat, p.lng) }));
  for (let i = 1; i < proj.length; i++) {
    const a = proj[i - 1].xy,
      b = proj[i].xy;
    const inked = proj[i - 1].done && proj[i].done;
    x.beginPath();
    x.moveTo(a[0], a[1]);
    const mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.12,
      my = (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.12;
    x.quadraticCurveTo(mx, my, b[0], b[1]);
    x.setLineDash(inked ? [10, 7] : [3, 7]);
    x.strokeStyle = inked ? red : 'rgba(58,36,18,.28)';
    x.lineWidth = inked ? 3 : 2;
    x.stroke();
  }
  x.setLineDash([]);
  const R = pins.length > 5 ? 15 : 19;
  proj.forEach((p, i) => {
    const [px, py] = p.xy;
    x.beginPath();
    x.arc(px, py, R, 0, Math.PI * 2);
    if (p.done) {
      x.fillStyle = '#f4e7c6';
      x.fill();
      x.lineWidth = 3;
      x.strokeStyle = red;
      x.stroke();
      x.fillStyle = red;
      x.font = `400 24px ${SERIF}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(String(i + 1), px, py + 1);
    } else {
      x.fillStyle = 'rgba(234,217,176,.9)';
      x.fill();
      x.setLineDash([4, 4]);
      x.lineWidth = 2.2;
      x.strokeStyle = 'rgba(58,36,18,.6)';
      x.stroke();
      x.setLineDash([]);
      x.fillStyle = 'rgba(58,36,18,.65)';
      x.font = `italic 400 22px ${SERIF}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('?', px, py + 1);
    }
  });
  // the names of the stops you found, beside them
  x.font = `italic 400 24px ${SERIF}`;
  x.textBaseline = 'middle';
  proj.forEach((p, i) => {
    if (!p.done || !p.name) return;
    const [px, py] = p.xy;
    const head = p.name.split(' / ')[0];
    const name = head.length > 28 ? `${head.slice(0, 26)}…` : head;
    const right = px < box.x + box.w * 0.62;
    x.textAlign = right ? 'left' : 'right';
    const ty = py + (i % 2 ? 14 : -14);
    x.fillStyle = 'rgba(234,217,176,.85)';
    const tw = x.measureText(name).width;
    x.fillRect(right ? px + R + 3 : px - R - 7 - tw, ty - 14, tw + 6, 28);
    x.fillStyle = ink;
    x.fillText(name, right ? px + R + 5 : px - R - 3, ty);
  });
  // the X where the story ends, once it has
  if (finished && proj.length) {
    const [px, py] = proj[proj.length - 1].xy;
    x.strokeStyle = red;
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(px + 22, py - 30);
    x.lineTo(px + 42, py - 10);
    x.moveTo(px + 42, py - 30);
    x.lineTo(px + 22, py - 10);
    x.stroke();
  }
  x.restore();
  x.strokeStyle = ink;
  x.lineWidth = 1.5;
  x.strokeRect(box.x, box.y, box.w, box.h);

  // the story's landmark, sketched in the corner of the sheet
  if (art) {
    const aw = 150,
      ah = (aw * art.height) / art.width;
    x.globalAlpha = 0.75;
    x.drawImage(art, w / 2 - aw / 2, h - 96 - ah / 2, aw, ah);
    x.globalAlpha = 1;
  }
  // compass rose, bottom left
  const rx = 130,
    ry = h - 92;
  x.save();
  x.translate(rx, ry);
  x.strokeStyle = ink;
  x.lineWidth = 1;
  x.beginPath();
  x.arc(0, 0, 34, 0, Math.PI * 2);
  x.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2,
      len = i % 2 ? 26 : 44;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(Math.cos(a - 0.18) * len * 0.3, Math.sin(a - 0.18) * len * 0.3);
    x.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    x.lineTo(Math.cos(a + 0.18) * len * 0.3, Math.sin(a + 0.18) * len * 0.3);
    x.closePath();
    x.fillStyle = i === 0 ? red : i % 2 ? 'rgba(58,36,18,.45)' : ink;
    x.fill();
  }
  x.fillStyle = ink;
  x.font = `400 18px ${SERIF}`;
  x.textAlign = 'center';
  x.fillText('N', 0, -50);
  x.restore();

  // scale bar, bottom right: a round number of metres
  const mPerPx = (spanX * 111320) / box.w;
  const nice = [100, 200, 250, 500, 1000, 2000].find((m) => m / mPerPx > 110) ?? 2000;
  const bw = nice / mPerPx;
  const bx = w - 100 - bw,
    by = h - 96;
  x.fillStyle = ink;
  for (let i = 0; i < 4; i++) {
    if (i % 2 === 0) x.fillRect(bx + (bw / 4) * i, by, bw / 4, 7);
  }
  x.strokeStyle = ink;
  x.strokeRect(bx, by, bw, 7);
  x.font = `italic 400 18px ${SERIF}`;
  x.textAlign = 'center';
  x.fillText(nice >= 1000 ? `${nice / 1000} km` : `${nice} m`, bx + bw / 2, by + 30);
  return c;
}

/** The rolled sheet: top edge fixed, the rest wound on a spiral below it, printed side in; u = how much hangs flat. */
export function scrollSheet(width: number, length: number, r0: number, segs = 140) {
  const geo = new THREE.PlaneGeometry(width, length, 1, segs);
  // keep the flat layout: vertex v (0 top .. 1 bottom) is arc length along the sheet
  const n = geo.attributes.position.count;
  const along = new Float32Array(n);
  const xs = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = geo.attributes.position.getX(i);
    along[i] = length / 2 - geo.attributes.position.getY(i);
  }
  const thick = 0.0035 / (Math.PI * 2);
  return {
    geo,
    /** Wind to u (0 rolled, 1 flat). Returns the centre of the roll (in sheet space) for the rod. */
    set(u: number) {
      const f = u * length;
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < n; i++) {
        const s = along[i];
        if (s <= f) p.setXYZ(i, xs[i], -s, 0);
        else {
          const th = (s - f) / r0;
          const r = Math.max(0.004, r0 - thick * th);
          p.setXYZ(i, xs[i], -f - r * Math.sin(th), r0 - r * Math.cos(th));
        }
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      return new THREE.Vector3(0, -f, r0);
    },
  };
}
