// Brings the owner's FindSG prototype (handoff of 1 Nov 2026) into Hunt, as it is: its React screens, the 3D building
// puzzles (quest engine, field models, native WebGL / software renderers), the paper objects (ticket, letter, stamp
// book, parcel, crumpled paper), the archive cards, the story content and the films.
//
//   node scripts/hunt/import-findsg.mjs <path to FindSG-complete-handoff-YYYY-MM-DD>
//
// Re-run it when a new handoff arrives (e.g. the final Grok films). It writes:
//   src/findsg/app/         the prototype's src/, unchanged except the small patches below (tests left out)
//   src/findsg/*.json       its story, gameplay and storyboard data
//   src/findsg/app/**.css   its styles, every rule scoped under .findsg so nothing leaks into the rest of the app
//   public/findsg/          concept art and logo as webp, films, posters and subtitles
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const root = process.argv[2] && resolve(process.argv[2]);
if (!root) {
  console.error('usage: node scripts/hunt/import-findsg.mjs <handoff folder>');
  process.exit(1);
}
const project = join(root, 'project');
const out = join(repo, 'src/findsg');
const app = join(out, 'app');
const pub = join(repo, 'public/findsg');

// ---- source
rmSync(app, { recursive: true, force: true });
cpSync(join(project, 'src'), app, { recursive: true, filter: (p) => !/\.test\.m?js$/.test(p) && !p.endsWith('main.jsx') });
for (const f of ['story-data.json', 'gameplay-data.json', 'visual-story-data.json']) cpSync(join(project, f), join(out, f));

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

/** Replace exactly one occurrence, so a changed prototype fails loudly instead of being half-patched. */
function patch(file, from, to) {
  const p = join(app, file);
  const s = readFileSync(p, 'utf8');
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${file}: expected one "${from.slice(0, 60)}", found ${n}`);
  writeFileSync(p, s.replace(from, to));
}

// assets are served from public/findsg/, the concept art as webp
patch(
  'data.js',
  'export function assetFor(path){return window.__FINDSG_ASSETS__?.[path]||path;}',
  `export function assetFor(path){const hit=window.__FINDSG_ASSETS__?.[path];if(hit)return hit;if(typeof path==='string'&&path.startsWith('./assets/'))return import.meta.env.BASE_URL+'findsg/'+path.slice(9).replace(/\\.png$/,'.webp');return path;}`,
);
// keep the router's history state, and tell Hunt which view shows (replaceState fires no event)
patch('App.jsx', "history.replaceState(null,'',hash)", "history.replaceState(history.state,'',hash);window.dispatchEvent(new Event('findsg:view'))");
// Hunt puts its own bar (tabs, rank) between the prototype's header and its content
patch('App.jsx', 'export default function App(){', 'export default function App({top=null}={}){');
patch('App.jsx', '<main id="main-content">', '{top}<main id="main-content">');
// Hunt's header has the how-to button (FindSG's own header is hidden), and the app's Reduce motion setting holds
patch(
  'App.jsx',
  'useEffect(()=>{document.documentElement.dataset.motion=',
  "useEffect(()=>{const how=()=>setModal({type:'how'});window.addEventListener('findsg:how',how);return()=>window.removeEventListener('findsg:how',how);},[]);\n useEffect(()=>{document.documentElement.dataset.motion=",
);
patch(
  'App.jsx',
  "useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)",
  "useState(()=>document.documentElement.classList.contains('reduce-motion')||window.matchMedia('(prefers-reduced-motion: reduce)').matches)",
);
// the short story opens on site, like the routes: a tap check-in counts (remote play stays one tap away)
// a tap tears the ticket too (the same tear animation as a pull); pulling still works
patch('game/TearTicket.jsx', 'onClick={event => {if (event.detail === 0) beginTear();}}', 'onClick={() => beginTear()}');
patch(
  'short/ShortStoryGame.jsx',
  "return localStorage.getItem(MODE_KEY)==='manual'?'manual':'preview';}catch{return 'preview';}",
  "return localStorage.getItem(MODE_KEY)==='preview'?'preview':'manual';}catch{return 'manual';}",
);

// ---- styles: scope every rule under .findsg (its :root tokens, html/body base, element resets)
function splitList(sel) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of sel) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  return [...parts, cur].map((s) => s.trim()).filter(Boolean);
}
function scope(sel) {
  if (sel === ':root' || sel === 'html' || sel === 'body') return '.findsg';
  const lead = sel.match(/^(html(\[[^\]]*\])?|\[data-motion[^\]]*\])/);
  if (lead) {
    const rest = sel.slice(lead[0].length).trim();
    const host = lead[0].startsWith('html') ? lead[0] : `html${lead[0]}`;
    return rest ? `${host} .findsg ${rest}` : `${host} .findsg`;
  }
  if (/^body\b/.test(sel)) return `.findsg${sel.slice(4)}`;
  return `.findsg ${sel}`;
}
const scoper = {
  postcssPlugin: 'findsg-scope',
  Rule(rule) {
    if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    if (rule.selector.includes('.findsg')) return;
    rule.selector = splitList(rule.selector).map(scope).join(',');
  },
};
for (const f of walk(app).filter((p) => p.endsWith('.css'))) {
  const css = readFileSync(f, 'utf8');
  writeFileSync(f, (await postcss([scoper]).process(css, { from: f })).css);
}

// ---- media
rmSync(pub, { recursive: true, force: true });
const webp = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  execFileSync('cwebp', ['-quiet', '-q', '78', '-resize', '1600', '0', from, '-o', to]);
};
for (const f of readdirSync(join(project, 'assets/cinematic')).filter((n) => n.endsWith('.png')))
  webp(join(project, 'assets/cinematic', f), join(pub, 'cinematic', f.replace(/\.png$/, '.webp')));
for (const f of readdirSync(join(project, 'assets')).filter((n) => /-triptych\.png$/.test(n)))
  webp(join(project, 'assets', f), join(pub, f.replace(/\.png$/, '.webp')));
for (const f of readdirSync(join(project, 'assets/brand')).filter((n) => n.endsWith('.png')))
  webp(join(project, 'assets/brand', f), join(pub, 'brand', f.replace(/\.png$/, '.webp')));
cpSync(join(project, 'assets/films'), join(pub, 'films'), {
  recursive: true,
  filter: (p) => statSync(p).isDirectory() || ['.mp4', '.jpg', '.vtt'].includes(extname(p)),
});

const size = (d) => walk(d).reduce((n, f) => n + statSync(f).size, 0);
console.log(`source → ${relative(repo, app)} (${walk(app).length} files), media → ${relative(repo, pub)} (${(size(pub) / 1e6).toFixed(1)} MB)`);

// ---- Hunt's look over the frame (IntentAI linen, cards and ink; the objects keep theirs)
execFileSync('node', [join(repo, 'scripts/hunt/theme-findsg.mjs')], { cwd: repo, stdio: 'inherit' });
