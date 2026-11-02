// The pictures a travelogue exports: each photo cover-cropped to the platform's size with a small place label (and
// the photographer's credit for photos that are not yours), plus a designed day card — the date, the areas, the tally
// and the places — on the journal's parchment. JPEG files, ready for the share sheet.
import type {
  DayFacts,
  Frame,
  PlatformSpec,
} from "../../../data/journal/travelogue";

const DISPLAY = "'Oswald', 'Arial Narrow', sans-serif";
const SERIF = "'IM Fell English', Georgia, serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

export function fontsReady() {
  const f = document.fonts;
  if (!f?.load) return Promise.resolve();
  return Promise.all([
    f.load(`500 64px Oswald`),
    f.load(`400 30px 'IM Fell English'`),
    f.load(`400 24px 'IBM Plex Mono'`),
  ])
    .then(() => undefined)
    .catch(() => undefined);
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}

function make(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function cover(
  x: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s,
    sh = h / s;
  x.drawImage(
    img,
    (img.naturalWidth - sw) / 2,
    (img.naturalHeight - sh) / 2,
    sw,
    sh,
    0,
    0,
    w,
    h,
  );
}

/** One photo, full bleed, with its place in the corner. */
export async function renderFrame(
  frame: Frame,
  spec: PlatformSpec,
): Promise<HTMLCanvasElement> {
  const { w, h } = spec;
  const [c, x] = make(w, h);
  x.fillStyle = "#1d1711";
  x.fillRect(0, 0, w, h);
  const img = await loadImage(frame.src);
  if (img) cover(x, img, w, h);
  // a soft shade along the bottom so the label reads on any photo
  const g = x.createLinearGradient(0, h * 0.72, 0, h);
  g.addColorStop(0, "rgba(10,6,2,0)");
  g.addColorStop(1, "rgba(10,6,2,.55)");
  x.fillStyle = g;
  x.fillRect(0, h * 0.72, w, h * 0.28);
  const pad = Math.round(w * 0.05);
  x.textBaseline = "alphabetic";
  x.shadowColor = "rgba(0,0,0,.45)";
  x.shadowBlur = 8;
  x.fillStyle = "#fff8ea";
  x.font = `500 ${Math.round(w * 0.042)}px ${DISPLAY}`;
  const title = fit(x, frame.title, w - pad * 2);
  x.fillText(title, pad, h - pad - (frame.area ? w * 0.034 : 0));
  if (frame.area) {
    x.font = `400 ${Math.round(w * 0.024)}px ${MONO}`;
    x.letterSpacing = "3px";
    x.fillStyle = "rgba(255,248,234,.82)";
    x.fillText(`${frame.area.toUpperCase()} · SINGAPORE`, pad, h - pad + 2);
    x.letterSpacing = "0px";
  }
  if (frame.credit) {
    x.shadowBlur = 4;
    x.font = `400 ${Math.round(w * 0.016)}px ${MONO}`;
    x.fillStyle = "rgba(255,248,234,.7)";
    x.textAlign = "right";
    x.fillText(`Photo: ${frame.credit}`.slice(0, 70), w - pad * 0.6, pad * 0.9);
    x.textAlign = "left";
  }
  x.shadowBlur = 0;
  return c;
}

function fit(x: CanvasRenderingContext2D, text: string, max: number) {
  if (x.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 4 && x.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function paper(x: CanvasRenderingContext2D, w: number, h: number) {
  x.fillStyle = "#eadcbd";
  x.fillRect(0, 0, w, h);
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 26; i++) {
    const px = r() * w,
      py = r() * h,
      rr = 40 + r() * 160;
    const g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, `rgba(150,100,40,${0.03 + r() * 0.06})`);
    g.addColorStop(1, "rgba(150,100,40,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  }
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(90,60,30,${r() * 0.06})`;
    x.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
  }
  const e = x.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.38,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.78,
  );
  e.addColorStop(0, "rgba(120,80,30,0)");
  e.addColorStop(1, "rgba(120,80,30,.32)");
  x.fillStyle = e;
  x.fillRect(0, 0, w, h);
}

/** The day card: the cover of the set (WeChat's middle square, the first slide elsewhere). */
export async function renderDayCard(
  facts: DayFacts,
  spec: PlatformSpec,
  stats: { places: number; stamps: number; photos: number },
) {
  await fontsReady();
  const { w, h } = spec;
  const [c, x] = make(w, h);
  paper(x, w, h);
  const ink = "#2c2117",
    soft = "#5c4a36",
    rust = "#a8481f";
  const u = w / 1080;
  const pad = 84 * u;
  // a double rule round the page
  x.strokeStyle = "rgba(44,33,23,.55)";
  x.lineWidth = 3 * u;
  x.strokeRect(36 * u, 36 * u, w - 72 * u, h - 72 * u);
  x.lineWidth = 1 * u;
  x.strokeRect(48 * u, 48 * u, w - 96 * u, h - 96 * u);

  x.textBaseline = "alphabetic";
  x.fillStyle = rust;
  x.font = `500 ${30 * u}px ${DISPLAY}`;
  x.letterSpacing = `${8 * u}px`;
  x.fillText("FIELD JOURNAL", pad, pad + 40 * u);
  x.letterSpacing = "0px";

  const [num, month] = facts.date.split(" ");
  x.fillStyle = ink;
  x.font = `500 ${300 * u}px ${DISPLAY}`;
  const top = pad + 40 * u + 290 * u;
  x.fillText(num, pad - 8 * u, top);
  const numW = x.measureText(num).width;
  x.font = `500 ${78 * u}px ${DISPLAY}`;
  x.fillStyle = rust;
  x.letterSpacing = `${10 * u}px`;
  x.fillText(month.toUpperCase(), pad + numW + 26 * u, top - 150 * u);
  x.letterSpacing = "0px";
  x.font = `italic 400 ${52 * u}px ${SERIF}`;
  x.fillStyle = soft;
  x.fillText(facts.weekday, pad + numW + 28 * u, top - 70 * u);

  let y = top + 70 * u;
  x.fillStyle = rust;
  x.fillRect(pad, y - 30 * u, w - pad * 2, 3 * u);
  x.fillStyle = ink;
  x.font = `500 ${54 * u}px ${DISPLAY}`;
  x.letterSpacing = `${2 * u}px`;
  const where = facts.areas.length
    ? facts.areas.slice(0, 3).join(" · ")
    : "Singapore";
  x.fillText(fit(x, where.toUpperCase(), w - pad * 2), pad, y + 40 * u);
  x.letterSpacing = "0px";
  y += 110 * u;

  // the tally
  const tally = [
    [stats.places, "place", "places"],
    [stats.stamps, "stamp", "stamps"],
    [stats.photos, "photo", "photos"],
  ].filter(([n]) => (n as number) > 0) as [number, string, string][];
  let tx = pad;
  for (const [n, one, many] of tally) {
    x.font = `500 ${64 * u}px ${DISPLAY}`;
    x.fillStyle = ink;
    x.fillText(String(n), tx, y);
    tx += x.measureText(String(n)).width + 10 * u;
    x.font = `italic 400 ${38 * u}px ${SERIF}`;
    x.fillStyle = soft;
    const word = n === 1 ? one : many;
    x.fillText(word, tx, y);
    tx += x.measureText(word).width + 40 * u;
  }
  y += 70 * u;

  // the places, as a numbered list (as many as fit)
  const rowH = 52 * u;
  const room = Math.max(0, Math.floor((h - y - pad - 60 * u) / rowH));
  const rows = facts.places.slice(0, room);
  x.font = `400 ${36 * u}px ${SERIF}`;
  rows.forEach((p, i) => {
    const ry = y + i * rowH + 30 * u;
    x.fillStyle = rust;
    x.font = `400 ${24 * u}px ${MONO}`;
    x.fillText(String(i + 1).padStart(2, "0"), pad, ry);
    x.fillStyle = ink;
    x.font = `400 ${36 * u}px ${SERIF}`;
    x.fillText(fit(x, p.name, w - pad * 2 - 60 * u), pad + 56 * u, ry);
  });
  if (facts.places.length > rows.length && rows.length) {
    x.fillStyle = soft;
    x.font = `italic 400 ${32 * u}px ${SERIF}`;
    x.fillText(
      `and ${facts.places.length - rows.length} more`,
      pad + 56 * u,
      y + rows.length * rowH + 30 * u,
    );
  }

  // the mark
  x.fillStyle = rust;
  x.font = `500 ${30 * u}px ${DISPLAY}`;
  x.letterSpacing = `${6 * u}px`;
  x.textAlign = "right";
  x.fillText("FINDSG", w - pad, h - pad + 6 * u);
  x.letterSpacing = "0px";
  x.textAlign = "left";
  if (facts.hours) {
    x.fillStyle = soft;
    x.font = `400 ${26 * u}px ${MONO}`;
    x.fillText(facts.hours, pad, h - pad + 6 * u);
  }
  return c;
}

export function toFile(
  c: HTMLCanvasElement,
  name: string,
): Promise<File | null> {
  return new Promise((resolve) =>
    c.toBlob(
      (b) => resolve(b ? new File([b], name, { type: "image/jpeg" }) : null),
      "image/jpeg",
      0.9,
    ),
  );
}
