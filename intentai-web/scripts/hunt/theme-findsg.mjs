// Hunt wears IntentAI's design, not FindSG's: this turns FindSG's dark frame (the page, panels, bars, buttons) into
// our linen, white cards and ink, and leaves its objects alone (the paper, tickets, dossiers, holo card, 3D models and
// films are things you hold, like Moments' passport and stamps).
//
// It reads the frame stylesheets in src/findsg/app and writes src/findsg/theme.generated.css: for each rule that
// paints a dark background, light text or a heavy shadow, the same rule under `.findsg.hunt` with the colours
// mapped by role. Hand-tuned rules on top of it are in src/findsg/theme.css.
// usage: node scripts/hunt/theme-findsg.mjs   (import-findsg.mjs runs it after an import)
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const APP = path.resolve('src/findsg/app');
// The frame. Everything else in src/findsg/app is an object and keeps its own colours.
const FRAME = [
  'styles.css',
  'archive-experience.css',
  'race.css',
  'game/onsite-game.css',
  'game/story-game.css',
  'game/quest-viewport.css',
  'game/option-wheel.css',
  'game/clue-collection.css',
  'short/short-story.css',
  'short/short-scene.css',
  'short/story-film.css',
  'field/field.css',
  'field/route-map.css',
  'field/field-viewport.css',
  'rooms/rooms.css',
];

// Hunt's field notebook (src/pages/HuntPage/notebook): brown-black ink on old paper, oxblood for the red ink
const INK = '#2c2117';
const INK_2 = '#3a2a1a';
const MUTED = '#5a4632';
const ORANGE_TEXT = '#8f2a1a';
const ORANGE_DEEP = '#9b2c1c';
const SHADOW = [60, 38, 16];
// FindSG's dark surfaces, deepest first, onto paper: sunk, the page, a card, a raised slip, a chip
const SURFACES = [
  [0.07, '#dccaa2'],
  [0.1, '#e9dcbd'],
  [0.13, '#f3e9d0'],
  [0.2, '#eee2c5'],
  [0.32, '#e3d3ae'],
];

const COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\([^)]*\)/g;

function parse(c) {
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length <= 4) h = [...h].map((x) => x + x).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const p = c
    .replace(/rgba?\(|\)/g, '')
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((x, i) => (x.endsWith('%') ? (parseFloat(x) / 100) * (i === 3 ? 1 : 255) : parseFloat(x)));
  return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
}
function hsl({ r, g, b }) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B),
    min = Math.min(R, G, B),
    l = (max + min) / 2,
    d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === R ? 60 * (((G - B) / d) % 6) : max === G ? 60 * ((B - R) / d + 2) : 60 * ((R - G) / d + 4);
  return { h: (h + 360) % 360, s, l };
}
const withAlpha = (hex, a) =>
  a >= 0.999
    ? hex
    : `${hex}${Math.round(a * 255)
        .toString(16)
        .padStart(2, '0')}`;

/** a dark surface → ours; anything else unchanged */
function surface(c) {
  const p = parse(c),
    { l } = hsl(p);
  if (l >= SURFACES.at(-1)[0]) return c;
  // a see-through dark tint (FindSG layers them on its dark page) is a faint warm tint on linen
  if (p.a < 0.55) return `rgba(${SHADOW.join(',')},${Math.min(p.a * 0.25, 0.05).toFixed(3)})`;
  return withAlpha(SURFACES.find(([max]) => l < max)[1], p.a);
}
/** text: FindSG's light inks and its green-greys → our ink and grey; brass and orange → our orange ink */
function text(c) {
  const p = parse(c),
    { h, s, l } = hsl(p);
  // orange stays an accent (kickers, numbers): FindSG's pale golds were its highlight ink on dark, so they are our ink
  if (s > 0.3 && h >= 15 && h <= 52 && l >= 0.64 && l < 0.82) return INK;
  if (s > 0.3 && h >= 15 && h <= 52 && l > 0.42 && l < 0.64) return withAlpha(h < 28 && s > 0.6 ? ORANGE_DEEP : ORANGE_TEXT, Math.max(p.a, 0.9));
  if (l > 0.8) return withAlpha(INK, Math.max(p.a, 0.85));
  if (l > 0.4) return MUTED;
  if (h > 70 && h < 180 && s > 0.08) return INK; // FindSG's dark green ink
  return c;
}
/** a palette token by its name: --x-ink, --x-muted, --x-orange, --x-dark … */
function token(name, c) {
  if (/dark|bg|surface/.test(name)) return surface(c);
  if (/ink/.test(name)) return parse(c).a < 0.5 ? c : INK;
  if (/muted|soft/.test(name)) return MUTED;
  if (/orange|accent/.test(name)) return ORANGE_DEEP;
  if (/brass|gold/.test(name)) return ORANGE_TEXT;
  return c;
}
/** shadows on linen are soft and warm */
function shadow(c) {
  const p = parse(c),
    { l } = hsl(p);
  if (l > 0.3) return c;
  return `rgba(${SHADOW.join(',')},${Math.min(p.a * 0.45, 0.16).toFixed(3)})`;
}

// a gradient with see-through stops is a scrim over a photo: it stays dark, as on Home's region cards
const isScrim = (v) => /gradient/.test(v) && (/transparent/.test(v) || (v.match(COLOR) ?? []).some((c) => parse(c).a < 0.55));
// text set over a photo or a film (posters, heroes, scenes) stays light, as on Home's region cards
const OVER_PHOTO =
  /film-(overlay|caption|edge|picture|window|loading)|poster|hero-|cinema-hero|art-caption|world-(bottom|top|title)|vignette|now-showing|room-scene-(bottom|poster|column)|race3d-scene|scene-director|scene-shots|sg-stage-scene/;

const BG = /^(background|background-color|background-image|border-color|outline-color)$/;
const out = postcss.root();
let rules = 0;
for (const file of FRAME) {
  const src = path.join(APP, file);
  if (!fs.existsSync(src)) continue;
  const root = postcss.parse(fs.readFileSync(src, 'utf8'), { from: src });
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const onImage = rule.nodes.some((d) => d.type === 'decl' && /^background/.test(d.prop) && /url\(/.test(d.value));
    const decls = [];
    rule.walkDecls((d) => {
      let v = d.value;
      if (d.prop.startsWith('--') && /^\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\s*$/.test(v)) v = token(d.prop, v.trim());
      else if (BG.test(d.prop) && !/url\(/.test(v) && !(OVER_PHOTO.test(rule.selector) && isScrim(v))) v = v.replace(COLOR, surface);
      else if ((d.prop === 'color' || d.prop === '-webkit-text-fill-color' || d.prop === 'caret-color') && !onImage && !OVER_PHOTO.test(rule.selector))
        v = v.replace(COLOR, text);
      else if (d.prop === 'box-shadow' || d.prop === 'filter' || (d.prop === 'text-shadow' && !OVER_PHOTO.test(rule.selector))) v = v.replace(COLOR, shadow);
      else if (/^border(-top|-bottom|-left|-right)?$/.test(d.prop)) v = v.replace(COLOR, surface);
      // our smallest type is 11px (chips, kickers); FindSG's 8–10px labels come up to it (not the decor inside the 3D views)
      if ((d.prop === 'font-size' || d.prop === 'font') && !/viewport/.test(file) && !/ticket|pass|stamp|paper|letter/.test(rule.selector))
        v = v.replace(/(^|\s)(\d+(?:\.\d+)?)px/, (m, sp, n) => (+n < 11 ? `${sp}11px` : m));
      if (v !== d.value) decls.push(d.clone({ value: v }));
    });
    if (!decls.length) return;
    const selectors = rule.selectors.map((s) => s.replace(/\.findsg(?![\w-])/, '.findsg.hunt'));
    let target = out;
    // keep the media query a rule sits in
    for (let p = rule.parent; p && p.type === 'atrule'; p = p.parent) {
      const at = postcss.atRule({ name: p.name, params: p.params });
      at.append(postcss.rule({ selectors, nodes: decls }));
      out.append(at);
      target = null;
      break;
    }
    if (target) out.append(postcss.rule({ selectors, nodes: decls }));
    rules++;
  });
}
const header = `/* GENERATED by scripts/hunt/theme-findsg.mjs from FindSG's frame stylesheets: do not edit; hand-tuned rules go in theme.css. */\n`;
fs.writeFileSync('src/findsg/theme.generated.css', header + out.toString() + '\n');
console.log(`theme: ${rules} rules`);
