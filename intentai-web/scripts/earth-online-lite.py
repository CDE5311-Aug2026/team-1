#!/usr/bin/env python3
"""IntentAI Nearby: the phone-friendly EARTH ONLINE (City Brush) Singapore 3D page.

usage: earth-online-lite.py <in.html> <out.html>
  <in.html>  a City Brush Singapore build without the modules Nearby does not use. scripts/sync-earth-online.mjs makes it:
             cd <earth_online>/src && SKIP_MODS=<LITE_SKIP in sync-earth-online.mjs> python3 sgreal/patch17.py city-brush-v16.html <in.html>
  <out.html> public/earth-online/sg/lite.html (next to sgdata/)

Every replacement is asserted (exactly one match), so a changed source fails loudly instead of building a broken page.
What the lite page does differently from the full page:
  - only the area around one point (#at=lat,lng and/or #card=<landmark key>; the query string works too): real roads,
    buildings and trees in 2 km tiles within LITE.R of the view, streamed in and freed as the view moves; the view stays
    within LITE.PAN of the point; roads and building tiles out of reach are dropped right after decoding;
  - landmark models, campus sites and map labels only within LITE.LM of the point; landmark normals / colours / uvs are
    dropped from memory once they are on the GPU (positions stay for card picking);
  - phones: 2048 px ground texture (the sharp-ground clipmap still draws the near ground at 1 m/px), pixel ratio <= 1.5,
    1024 px shadow map; desktop: pixel ratio <= 2, as before;
  - on screen only the 3D view, its labels, the time bar (time, weather, sound) and the landmark cards ("Navigate here"
    hidden); the orbit tool is the only tool (no painting);
  - no third-party requests: three.js r128 from vendor/ next to the page, system fonts;
  - postMessage with the embedding page: out {source:'earth-online-lite', type:'ready' | 'card', key}; in (from the parent
    only) {source:'intentai', type:'show', at:[lat, lng], card?, pin?} moves the view (or reloads around a far point, via
    the hash). #pin=0 hides the pin, #still=1 skips camera flights (reduced motion).
"""
import sys

src, dst = sys.argv[1], sys.argv[2]
h = open(src, encoding='utf-8').read()


def rep(old, new, count=1):
    global h
    n = h.count(old)
    assert n == count, f'expected {count} x {old[:80]!r}, found {n}'
    h = h.replace(old, new)


HEAD = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<script>
// IntentAI Nearby lite: decided before the 3D code runs (texture size, pixel ratio, shadow map)
window.__LITE_MOB = (function () { try { return matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 820; } catch (e) { return false; } })();
</script>
<style>
/* lite embed: the 3D view, its labels, the time bar (time / weather / sound) and the landmark card only */
#panel, #stats, #dock, #uiHint, #scalebar, .sgc [data-a="nav"], .cityseg { display: none !important; }
html, body { overscroll-behavior: none; touch-action: none; }
/* Nearby look: the app's font (Inter, bundled) and colours. The time bar is gone: time of day plays on its own,
   weather is Auto and sound stays off, so the only things to do are to look around (and 2D / 3D in the app). */
@font-face { font-family: 'Inter'; font-weight: 400; font-display: swap; src: url(vendor/fonts/inter-latin-400-normal.woff2) format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 600; font-display: swap; src: url(vendor/fonts/inter-latin-600-normal.woff2) format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 700; font-display: swap; src: url(vendor/fonts/inter-latin-700-normal.woff2) format('woff2'); }
:root { --font-mono: 'Inter', system-ui, sans-serif; }
body, #labels, #labels *, .sgc, .sgc *, #busy { font-family: 'Inter', system-ui, -apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif !important; letter-spacing: 0 !important; }
#timebar, #busy, #sndWrap, #wxWrap { display: none !important; }
#labels .lbl { color: #23211d; }
#labels .lbl small { color: #5f5b54; }
.sgc { background: #f6f5f2 !important; color: #23211d !important; border-radius: 20px 20px 0 0 !important; }
.sgc .sgc-btns button { border-radius: 18px !important; }
.sgc .sgc-btns button.go, .sgc .sgc-btns button:first-child { background: #23211d !important; color: #fff !important; border-color: #23211d !important; }
/* the time bar sits at the top (the landmark card is a bottom sheet); its menus open downwards */
#timebar { left: 8px !important; right: 8px !important; transform: none !important; width: auto !important; max-width: 560px; margin: 0 auto;
  top: calc(8px + env(safe-area-inset-top, 0px)) !important; bottom: auto !important; }
#timebar input[type=range] { min-width: 60px !important; }
#timebar .wxmenu, #timebar .sndmenu { top: calc(100% + 8px) !important; bottom: auto !important; max-height: calc(100vh - 96px); overflow-y: auto; }
/* small embedded view: one row (play, clock, slider, weather, sound); presets, speed and local time in full screen */
@media (max-height: 560px) { #timebar .tpre { display: none !important; } #timebar { padding: 5px 8px !important; } }
/* the card's peek shows its kind and name only (a tap opens the rest): the full page's peek is half of a small embed */
.sgc.peek { max-height: calc(96px + env(safe-area-inset-bottom, 0px)) !important; }
.sgc.peek .sgc-btns { display: none !important; }
</style>
</head>
<body>
'''
assert h.lstrip().startswith('<meta name="citybrush-map"'), 'unexpected page start'
h = HEAD + h

# same origin only: three.js r128 from vendor/ (MIT, bundled next to the page) instead of two CDNs; system fonts instead of
# Google Fonts (the page falls back to monospace / the system CJK font). Opening 3D then contacts no third party.
rep('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Noto+Sans+SC:wght@400;500;700&display=swap">\n', '')
rep('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script src="vendor/three-r128.min.js"></script>')
rep('<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>', '<script src="vendor/three-r128-OrbitControls.js"></script>')

# no city switch: it probes bay.html / nyc.html / hk.html / tyo.html next to the page (only Singapore is bundled)
rep("HOOKS.boot.push(() => {\n  const CITIES = [", "HOOKS.boot.push(() => { if (window.__LITE_MOB !== undefined) return;   // lite: Singapore only, no city switch\n  const CITIES = [")

# phones: smaller ground texture (the detail clipmap keeps the near ground sharp)
rep("const SGR_PATH = 'sgdata/', SGR_TEX = 4096;", "const SGR_PATH = 'sgdata/', SGR_TEX = window.__LITE_MOB ? 2048 : 4096;")
# pixel ratio cap: 1.5 on phones (a 3x phone draws 4x fewer pixels), 2 elsewhere
rep('renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));',
    'renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.__LITE_MOB ? 1.5 : 2));', 2)
rep('sun.shadow.mapSize.set(2048, 2048);', 'sun.shadow.mapSize.set(window.__LITE_MOB ? 1024 : 2048, window.__LITE_MOB ? 1024 : 2048);')

LITE = r'''
/* ================= IntentAI Nearby lite (the phone embed; intentai-web scripts/earth-online-lite.py) ================= */
const LITE = (() => {
  // parameters in the hash (#at=…&card=…) are never sent to a server; the query string works too
  const q = new URLSearchParams(location.search), mob = !!window.__LITE_MOB;
  for (const [k, v] of new URLSearchParams(location.hash.slice(1))) q.set(k, v);
  const LON0 = 103.845, LAT0 = 1.315, MX = 111290.5, MY = 110574.0, xy = (lat, lon) => [(lon - LON0)*MX, (lat - LAT0)*MY];
  let focus = null, pin = null, card = q.get('card');
  if (card && !/^[A-Za-z0-9_:\- ]{1,80}$/.test(card)) card = null;
  const at = (q.get('at') || '').split(',').map(Number);
  // ?at is the point (and gets a pin unless a landmark card is asked for: the card's ring marks it); ?card alone uses the model's place
  if (at.length === 2 && at.every(isFinite) && Math.abs(at[0] - LAT0) < 0.3 && Math.abs(at[1] - LON0) < 0.3){ focus = xy(at[0], at[1]); if (!card) pin = focus; }
  if (!focus && card){
    const p = SG_PLACES.find(p => p.type === card), S = SITES[String(card).replace(/^site:/, '').split(':')[0]];
    if (p) focus = xy(p.lat, p.lon); else if (S) focus = xy(S.lat, S.lon);
  }
  if (!focus) focus = xy(1.2868, 103.8545);       // Marina Bay
  const r = +q.get('r');
  const lm = +q.get('lm');
  if (q.get('pin') === '0') pin = null;
  // #cards=0: the embedding page shows the place itself (Explore's sheet); the 3D card sheet stays hidden
  if (q.get('cards') === '0'){ const st = document.createElement('style'); st.textContent = 'section.sgc{display:none!important}'; document.head.appendChild(st); }
  return {q, mob, xy, focus, pin, card, still:q.get('still') === '1', R:mob ? 2200 : 3000, PAN:isFinite(r) && r >= 500 && r <= 5000 ? r : 2500, LM:isFinite(lm) && lm > 0 && lm <= 8000 ? lm : mob ? 2800 : 3600,
    last:null, frames:0, freed:0, placed:0, sites:0};
})();
// landmark models and campus sites near the point only (the rest of Singapore is ground, roads and buildings when you get there)
{
  const F = LITE.focus, keep = SG_PLACES.filter(p => { const [x, y] = LITE.xy(p.lat, p.lon); return Math.hypot(x - F[0], y - F[1]) < LITE.LM; });
  LITE.allPlaces = SG_PLACES.length; SG_PLACES.length = 0; SG_PLACES.push(...keep); LITE.placed = keep.length;
  for (const k of Object.keys(SITES)){ const S = SITES[k], [x, y] = LITE.xy(S.lat, S.lon); if (Math.hypot(x - F[0], y - F[1]) > LITE.LM + 1500) delete SITES[k]; else LITE.sites++; }
}
// landmark models: once on the GPU, drop the CPU copies of normals, colours and uvs (positions and indices stay: card picking
// and the landmark ground plans read them)
placeLandmarkMesh = (orig => function(L){
  const r = orig.apply(this, arguments);
  if (!LITE.q.has('keep')){ const g = lmMeshes.get(L.id); if (g) g.traverse(o => { const G = o.geometry; if (!G || o.isPoints || !G.attributes) return;
    for (const k in G.attributes){ if (k === 'position') continue; const a = G.attributes[k]; if (a.isInterleavedBufferAttribute) continue; a.onUpload(sgrFreeArr); } }); }
  return r;
})(placeLandmarkMesh);
// data: after decoding, keep only the roads and the building tiles the view can reach (the point + LITE.PAN + LITE.R + a margin);
// the rest of the island's roads and buildings are dropped before anything is built from them
sgrLoad = (orig => function(){
  return orig.apply(this, arguments).then(() => {
    if (LITE.pruned || LITE.q.has('full')) return; LITE.pruned = true;
    // Singapore only: Johor and the Riau islands (land-cover code 5) sink under the sea, and their roads and
    // buildings are not built (the ground picture, sgdata/ground.webp, already shows them as sea)
    try {
      const B = SGR.base, n = B.N, codes = sgRLE(B.codes, n), TNb = Math.round(2*B.HALF/B.TS) + 1, ci = v => Math.min(n - 1, Math.max(0, Math.floor((v + B.HALF)/B.CELL)));
      for (let j = 0; j < TNb; j++) for (let i = 0; i < TNb; i++){
        const x = -B.HALF + i*B.TS, y = -B.HALF + j*B.TS;
        if (codes[ci(y)*n + ci(x)] === 5){ const k = j*TNb + i; if (SGR.H[k] > -6) SGR.H[k] = -6; }
      }
    } catch (e){ console.error('[lite] foreign land', e); }
    SGR.lines = SGR.lines.filter(l => !(l.flags & 8));
    const F = LITE.focus, K = LITE.PAN + LITE.R + 1500, x0 = F[0] - K, x1 = F[0] + K, y0 = F[1] - K, y1 = F[1] + K, n0 = SGR.lines.length;
    SGR.lines = SGR.lines.filter(l => { const P = l.P; for (let i = 0; i < P.length; i += 2) if (P[i] > x0 && P[i] < x1 && P[i+1] > y0 && P[i+1] < y1) return true; return false; });
    const T = SGR.bldData.TILE || SGR.base.TILE, TX = SGR.bldData.TX || Math.round(2*HALF/T), H0 = T*TX/2; let nb = 0, kept = 0;
    if (SGR.bldData.tiles instanceof Map) for (const ti of [...SGR.bldData.tiles.keys()]){
      const tx = ti % TX, ty = (ti - tx)/TX, cx = -H0 + (tx + 0.5)*T, cy = -H0 + (ty + 0.5)*T;
      if (Math.abs(cx - F[0]) > K + T/2 || Math.abs(cy - F[1]) > K + T/2){ nb += SGR.bldData.tiles.get(ti).length; SGR.bldData.tiles.delete(ti); } else kept++;
    }
    LITE.prune = {lines:[SGR.lines.length, n0], bldTilesKept:kept, bldDropped:nb};
  });
})(sgrLoad);
sgrSkipB = (orig => function(B){ return B.foreign ? true : orig.apply(this, arguments); })(sgrSkipB);
// tiles: records for the whole map (cheap), but only the ones near the view are built
sgrTilesInit = function(){
  sgrTilesClear();
  const T = SGR.base.TILE, TX = Math.round(2*HALF/T);
  for (let ti = 0; ti < TX*TX; ti++){ const c = sgrTileC(ti); SGR.tiles.set(ti, {ti, cx:c[0], cy:c[1], road:null, bld:null, trees:null, treesDone:false, done:false}); }
  SGR.t0 = performance.now(); LITE.last = null;
  controls.target.set(LITE.focus[0], 4, -LITE.focus[1]);
  liteStream(true);
};
function liteFree(T){
  if (T.trees) T.trees.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
  sgrTileDispose(T, true); T.done = false; LITE.freed++;
}
function liteStream(force){
  if (!SGR.on || !SGR.tiles.size) return;
  const tx = controls.target.x, ty = -controls.target.z, L = LITE.last;
  if (!force && L && Math.hypot(tx - L[0], ty - L[1]) < 250) return;
  LITE.last = [tx, ty];
  const half = SGR.base.TILE/2, add = [];
  for (const T of SGR.tiles.values()){
    const d = Math.hypot(Math.max(0, Math.abs(T.cx - tx) - half), Math.max(0, Math.abs(T.cy - ty) - half));   // to the tile's nearest edge
    if (d < LITE.R){ if (!T.done && !SGR.queue.includes(T)) add.push(T); }
    else if (d > LITE.R + 800){
      if (T.done || T.road || T.trees) liteFree(T);
      const i = SGR.queue.indexOf(T); if (i >= 0) SGR.queue.splice(i, 1);
    }
  }
  if (add.length){ SGR.queue.push(...add); SGR.total = SGR.built + SGR.queue.length; sgrSortQueue(); }
}
// the view stays near the point
function liteClamp(){
  const F = LITE.focus, t = controls.target, dx = t.x - F[0], dy = -t.z - F[1], d = Math.hypot(dx, dy);
  if (d > LITE.PAN){ const k = LITE.PAN/d, nx = F[0] + dx*k, nz = -(F[1] + dy*k); camera.position.x += nx - t.x; camera.position.z += nz - t.z; t.x = nx; t.z = nz; }
  if (controls.maxDistance > 4200) controls.maxDistance = 4200;
}
sgrStep = (orig => function(){ if (SGR.on){ liteClamp(); if ((LITE.frames++ & 15) === 0) liteStream(false); } return orig.apply(this, arguments); })(sgrStep);
// the first view: over the point
sgView = function(){ const F = LITE.focus, y = Math.max(0, hC(F[0], F[1])) + 4, k = LITE.card ? 0.7 : 1; controls.target.set(F[0], y, -F[1]); camera.position.set(F[0] + 420*k, y + 560*k, -F[1] + 760*k); };
// map labels near the point only (the full map has thousands of road / POI labels)
sgLabels = (orig => function(){
  const n0 = labelItems.length; const r = orig.apply(this, arguments); const F = LITE.focus, keep = labelItems.slice(0, n0);
  for (const it of labelItems.slice(n0)){ if (it.x === undefined || Math.hypot(it.x - F[0], it.y - F[1]) < LITE.LM + 800) keep.push(it); else it.el.remove(); }
  labelItems = keep; return r;
})(sgLabels);
// phones: keep the pixel ratio cap when the window resizes (the page's own handler resets it)
addEventListener('resize', () => { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LITE.mob ? 1.5 : 2)); });
// after the city is up: orbit tool only, a pin for ?at, the card for ?card, and tell the embedding page about cards
{
  let tries = 0;
  const ready = setInterval(() => {
    if (!(SGR.on && SGR.tiles.size && window.SGCard) && ++tries < 600) return;
    clearInterval(ready); if (!SGR.on) return;
    try { setTool('view'); } catch (e){ console.error('[lite] tool', e); }
    if (LITE.pin) litePin(LITE.pin[0], LITE.pin[1]);
    // the card opens as a peek (name only; a tap shows the rest) so the small embedded view stays visible
    // the place's model: its ring on, and a camera fitted to that model (not one distance for all)
    if (LITE.card){ try { if (SGCard.open(LITE.card)){ litePeek(); liteFrame(LITE.card, false); } } catch (e){ console.error('[lite] card', e); } }
    liteAuto();
    const built = setInterval(() => { let n = 0; for (const T of SGR.tiles.values()) if (T.done) n++;
      if ((n > 0 && !SGR.queue.length) || ++tries > 900){ clearInterval(built); LITE.ready = true; litePost({type:'ready'}); } }, 300);
    let last = null;
    setInterval(() => { let k = null; try { k = SGCard.isOpen ? SGCard.key : null; } catch (e){ }
      if (k !== last){ last = k; let title = null; try { title = k ? SGCard.state().title : null; } catch (e){ }
        litePost({type:'card', key:k, title:typeof title === 'string' ? title.slice(0, 120) : null}); } }, 400);
  }, 200);
}
function litePeek(){ setTimeout(() => { const el = document.querySelector('section.sgc'); if (el) el.classList.add('peek'); }, 50); }
// time of day plays by itself from Singapore's time now (at the page's usual speed, #rate= to change), weather is
// Auto, sound off, the language follows the app (#lang=en|zh|both). Nothing here can be set by the viewer.
function liteAuto(){
  try { const m = {en:'en', zh:'zh', both:'both'}[LITE.q.get('lang')] || 'en'; if (window.SGLang) SGLang.set(m); } catch (e){ console.error('[lite] lang', e); }
  try { if (window.SGAudio && SGAudio.on) SGAudio.disable(); } catch (e){ console.error('[lite] sound', e); }
  try { if (window.SGWx) SGWx.set('auto', true); } catch (e){ console.error('[lite] weather', e); }
  try {
    const rate = +LITE.q.get('rate');
    if (window.SGClock){ SGClock.setLocal(false); SGClock.setRate(SGClock.RATES.includes(rate) ? rate : 2400); tod = SGClock.localNow()[0]; }
    // #hour=13 (tooling: the place pictures are taken at a fixed midday, whatever the time of the run)
    const hour = LITE.q.get('hour') === null ? NaN : +LITE.q.get('hour');
    if (isFinite(hour) && hour >= 0 && hour < 24) tod = hour;
    todPlay = !LITE.still; applyTime();
  } catch (e){ console.error('[lite] time', e); }
}
// map labels without emoji icons (the app uses none)
{
  const EMO = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]+\s*/gu;
  const clean = el => { for (const n of el.querySelectorAll ? [el, ...el.querySelectorAll('*')] : [el]) for (const t of n.childNodes) if (t.nodeType === 3 && EMO.test(t.nodeValue)){ EMO.lastIndex = 0; t.nodeValue = t.nodeValue.replace(EMO, ''); } };
  try { new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) clean(n); }).observe(document.getElementById('labels'), {childList:true}); } catch (e){ }
}
// A camera fitted to one landmark model: from the side of its long axis (a bridge is seen along its span, not end-on),
// far enough to show all of it in this view's width and height, lower for towers, higher for flat sites.
// Campus / garden sites use their card's own framing, a little closer. Returns false when the key has no model.
const LITE_VIEW = {   // per-landmark adjustments: d distance factor, az extra azimuth (deg), el elevation (deg)
  merlion:{d:0.6, el:20, az:-100}, thianhockkeng:{el:42, az:180}, sgsiloso:{d:0.7, el:34}, sgcenotaph:{d:0.9}, sgtankimseng:{d:0.85, el:30},
};
function liteFrame(key, animate){
  let T = null, D = null; try { T = SGCard._t.sgcByKey(key); D = T && SGCard._t.sgcResolve(T).D; } catch (e){ }
  if (!D) return false;
  const go = (to, tt) => { if (animate && typeof flyTo === 'function') flyTo(to, tt, 1300); else { camera.position.copy(to); controls.target.copy(tt); controls.update(); } };
  if (D.kind !== 'lm' || !D.L){ try { SGCard.fly(); setTimeout(() => SGLite.zoom(0.62), animate ? 1600 : 0); } catch (e){ return false; } return true; }
  const L = D.L, g = lmMeshes.get(L.id); if (!g) return false;
  const rot = g.rotation.y; g.rotation.y = 0; g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g); g.rotation.y = rot; g.updateMatrixWorld(true);
  if (box.isEmpty()) return false;
  const o = LITE_VIEW[key] || {}, base = Math.max(0, L.top || hC(L.x, L.y));
  const sx = box.max.x - box.min.x, sz = box.max.z - box.min.z, h = Math.max(4, box.max.y - base);
  const W = Math.max(sx, sz), Dp = Math.min(sx, sz);
  // the centre of the box, turned back by the model's rotation around its origin
  const cx0 = (box.min.x + box.max.x)/2 - g.position.x, cz0 = (box.min.z + box.max.z)/2 - g.position.z, c = Math.cos(rot), sn = Math.sin(rot);
  const cx = g.position.x + cx0*c + cz0*sn, cz = g.position.z - cx0*sn + cz0*c;
  // look across the long axis; of the two sides, the one nearer the usual south-east view
  // (a model's local Z after its turn is (sin, cos); its local X is (cos, -sin))
  let dir = sx >= sz ? [Math.sin(rot), Math.cos(rot)] : [Math.cos(rot), -Math.sin(rot)];
  if (dir[0]*0.48 + dir[1]*0.87 < 0) dir = [-dir[0], -dir[1]];
  if (o.az){ const a = o.az*Math.PI/180, x = dir[0]*Math.cos(a) - dir[1]*Math.sin(a), z = dir[0]*Math.sin(a) + dir[1]*Math.cos(a); dir = [x, z]; }
  const el = (o.el !== undefined ? o.el : h > W*1.3 ? 24 : h < W*0.25 ? 32 : 26)*Math.PI/180;   // towers from a little above their neighbours
  const vf = camera.fov*Math.PI/360, hf = Math.atan(Math.tan(vf)*camera.aspect);
  const dW = (W/2)/Math.tan(hf) + Dp/2, dH = (h*0.62)/Math.tan(vf) + Dp/2;
  const d = Math.max(45, Math.max(dW, dH)*1.2*(o.d || 1));
  const tt = new THREE.Vector3(cx, base + h*(h > W*1.3 ? 0.45 : 0.3), cz);
  const to = new THREE.Vector3(tt.x + dir[0]*Math.cos(el)*d, tt.y + Math.sin(el)*d, tt.z + dir[1]*Math.cos(el)*d);
  const gy = Math.max(0, hAt(to.x, -to.z)) + 20; if (to.y < gy) to.y = gy;
  go(to, tt); return true;
}
// a pin on a point without a landmark model
function litePin(x, y){
  if (!LITE.pinMesh){
    const pin = new THREE.Group(), mat = new THREE.MeshBasicMaterial({color:0xe4671f});
    const head = new THREE.Mesh(new THREE.ConeGeometry(9, 26, 18), mat); head.rotation.x = Math.PI; head.position.y = 13;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(10, 18, 12), mat); ball.position.y = 30;
    const ring = new THREE.Mesh(new THREE.RingGeometry(14, 22, 40), new THREE.MeshBasicMaterial({color:0xe4671f, transparent:true, opacity:0.55, side:THREE.DoubleSide})); ring.rotation.x = -Math.PI/2; ring.position.y = 0.8;
    pin.add(head, ball, ring); pin.renderOrder = 9; scene.add(pin); LITE.pinMesh = pin;
  }
  LITE.pinMesh.position.set(x, Math.max(0, hC(x, y)) + 2, -y); LITE.pinMesh.visible = true;
}
function liteLook(x, y){
  const g = Math.max(0, hC(x, y)) + 4, to = new THREE.Vector3(x + 420, g + 560, -y + 760), tt = new THREE.Vector3(x, g, -y);
  if (LITE.still || typeof flyTo !== 'function'){ controls.target.copy(tt); camera.position.copy(to); } else flyTo(to, tt, 1200);
}
// talking to the embedding page (only the landmark key and readiness go out; nothing about the viewer)
function litePost(m){ try { if (parent !== window) parent.postMessage(Object.assign({source:'earth-online-lite'}, m), '*'); } catch (e){ } }
// the embedding page can move the view to another place: {source:'intentai', type:'show', at:[lat, lng], card?:key}.
// Within reach of the loaded area the camera moves there; farther away the page reloads around the new point.
addEventListener('message', e => {
  const d = e.data; if (e.source !== parent || !d || d.source !== 'intentai' || d.type !== 'show' || !LITE.ready) return;
  if (!Array.isArray(d.at) || d.at.length !== 2 || !d.at.every(v => typeof v === 'number' && isFinite(v))) return;
  const card = typeof d.card === 'string' && /^[A-Za-z0-9_:\- ]{1,80}$/.test(d.card) ? d.card : null, p = LITE.xy(d.at[0], d.at[1]);
  if (Math.abs(d.at[0] - 1.315) > 0.3 || Math.abs(d.at[1] - 103.845) > 0.3) return;
  if (Math.hypot(p[0] - LITE.focus[0], p[1] - LITE.focus[1]) > LITE.PAN - 300){
    const q = new URLSearchParams(location.hash.slice(1)); q.set('at', d.at.map(v => v.toFixed(5)).join(',')); if (card) q.set('card', card); else q.delete('card');
    if (d.pin === false) q.set('pin', '0'); else q.delete('pin');
    location.replace(location.pathname + location.search + '#' + q.toString()); location.reload(); return;
  }
  let opened = false;
  if (card){ try { opened = SGCard.open(card); } catch (e){ } }
  if (opened){ if (LITE.pinMesh) LITE.pinMesh.visible = false; if (!liteFrame(card, !LITE.still)) liteLook(p[0], p[1]); litePeek(); }
  else { try { SGCard.close(); } catch (e){ } if (d.pin !== false) litePin(p[0], p[1]); liteLook(p[0], p[1]); }
});
window.SGLite = {
  stats(){ let built = 0, live = 0; for (const T of SGR.tiles.values()){ if (T.done) built++; if (T.road || T.bld) live++; }
    const m = renderer.info.memory, r = renderer.info.render;
    return {prune:LITE.prune, focus:LITE.focus.map(Math.round), mob:LITE.mob, tex:SGR_TEX, dpr:renderer.getPixelRatio(), tilesBuilt:built, tilesLive:live, queue:SGR.queue.length, freed:LITE.freed,
      landmarks:landmarks.length, of:LITE.allPlaces, sites:sgSites.length, labels:labelItems.length, geometries:m.geometries, textures:m.textures, calls:r.calls, tris:r.triangles,
      target:[Math.round(controls.target.x), Math.round(-controls.target.z)], cam:Math.round(camera.position.distanceTo(controls.target))}; },
  mem(){
    const seen = new Set(), seenO = new Set(), MB = b => Math.round(b/1048576*10)/10;
    const walk = (o, d) => { if (!o || typeof o !== 'object' || seenO.has(o) || d > 9) return 0; seenO.add(o);
      if (ArrayBuffer.isView(o)){ if (seen.has(o.buffer)) return 0; seen.add(o.buffer); return o.buffer.byteLength; }
      if (o instanceof ArrayBuffer){ if (seen.has(o)) return 0; seen.add(o); return o.byteLength; }
      if (o instanceof HTMLCanvasElement) return o.width*o.height*4;
      if (o instanceof ImageData) return o.data.length;
      if (o instanceof Node) return 0;
      let s = 0; if (o instanceof Map){ for (const [k, v] of o){ s += walk(k, d + 1) + walk(v, d + 1); } return s; }
      if (o instanceof Set){ for (const v of o) s += walk(v, d + 1); return s; }
      for (const k in o){ let v; try { v = o[k]; } catch (e){ continue; } if (v && typeof v === 'object') s += walk(v, d + 1); } return s; };
    const out = {};
    const roots = {sgrData:{lines:SGR.lines, bld:SGR.bldData, water:SGR.water, H:SGR.H, base:SGR.base}, sgrRest:SGR, SG, grids:{zones, dens, arch, nat, resv, slope, siteMask},
      tex:{texCv, imgData}, scene, detail:window.SGDetail, cache, landmarks};
    for (const k in roots){ try { out[k] = MB(walk(roots[k], 0)); } catch (e){ out[k] = 'err ' + e.message; } }
    return out; },
  // camera at distance d (m) from the point (x, y), azimuth az and elevation el in degrees (thumbnails, tests)
  look(x, y, d, az, el){ const g = Math.max(0, hC(x, y)) + 4, a = (az === undefined ? 30 : az)*Math.PI/180, e = (el === undefined ? 38 : el)*Math.PI/180, r = d || 420;
    controls.target.set(x, g, -y); camera.position.set(x + Math.sin(a)*Math.cos(e)*r, g + Math.sin(e)*r, -y + Math.cos(a)*Math.cos(e)*r); controls.update(); },
  // move the camera k times its distance to the target (k < 1: closer)
  frame:(key, animate) => liteFrame(key, !!animate),
  zoom(k){ camera.position.sub(controls.target).multiplyScalar(k).add(controls.target); controls.update(); },
  goTo(x, y){ controls.target.set(x, controls.target.y, -y); camera.position.set(x + 420, controls.target.y + 560, -y + 760); },
};
'''
rep('\nsgrBoot();\nrequestAnimationFrame(loop);\n})();\n</script>', '\n' + LITE + '\nsgrBoot();\nrequestAnimationFrame(loop);\n})();\n</script>')

h += '\n</body>\n</html>\n'
open(dst, 'w', encoding='utf-8').write(h)
print('ok', len(h))
