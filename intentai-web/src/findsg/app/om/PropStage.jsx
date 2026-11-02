/* Hunt (2 Nov 2026): Only One Missing's puzzles as objects you handle (owner: "skeuomorphic 3D, minimal; touch and
 * hands, not buttons and text"). Each prop keeps its own hand state; only quest-logic decides: a prop offers one of its
 * items (`offer`) and the rules answer. A prop that comes back already solved shows its solved state. */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {playFilm} from './films.js';
import './prop-stage.css';

const BASE = (import.meta.env?.BASE_URL || '/') + 'hunt/om/';
const img = path => BASE + path;

/** A piece you slide by its body and turn by its pin; `check` runs on each let-go with where it lies. */
function useMoveTurn(pos, setPos, check) {
  const now = useRef(pos), from = useRef(pos); now.current = pos;
  const put = p => {now.current = p; setPos(p);};
  const move = useDrag({start: () => {from.current = now.current;}, move: (dx, dy) => put({...from.current, x: from.current.x + dx, y: from.current.y + dy}), end: () => check(now.current)});
  const turn = useDrag({start: () => {from.current = now.current;}, move: (dx, dy) => put({...from.current, r: from.current.r + (dx - dy) * .35}), end: () => check(now.current)});
  return {move, turn};
}

/** Drag with one pointer: start, move(dx, dy, e), end(dx, dy, e). */
function useDrag(handlers) {
  const ref = useRef(handlers); ref.current = handlers;
  return useCallback(e => {
    if (e.button > 0) return;
    e.preventDefault(); e.stopPropagation();
    const el = e.currentTarget, sx = e.clientX, sy = e.clientY;
    try {el.setPointerCapture?.(e.pointerId);} catch { /* a pointer the browser no longer tracks */ }
    ref.current.start?.(e);
    const move = ev => ref.current.move?.(ev.clientX - sx, ev.clientY - sy, ev);
    const up = ev => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      ref.current.end?.(ev.clientX - sx, ev.clientY - sy, ev);
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }, []);
}
/** The drop target under a point: the nearest element with data-drop that is not the thing being carried. */
function dropAt(x, y, carried) {
  for (const el of document.elementsFromPoint(x, y)) if (el.dataset?.drop && !carried?.contains(el)) return el.dataset.drop;
  return null;
}

export default function PropStage({layer, enabled, solved, onAction, onDone, onNote, reducedMotion}) {
  const done = useRef(false);
  useEffect(() => {done.current = false;}, [layer?.kind]);
  // solved without a hand on it (the night race, a Boost Card): show it solved, then move on
  useEffect(() => {
    if (!solved || done.current) return undefined;
    done.current = true;
    const t = window.setTimeout(onDone, 700);
    return () => window.clearTimeout(t);
  }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Offer an item to the rules; a right one plays out, then the stop moves on. */
  const offer = useCallback(id => {
    if (!enabled || solved || done.current) return null;
    const r = onAction?.({type: 'answer', id});
    if (r?.message || r?.ok) onNote(r.message || '');
    if (r?.ok) {done.current = true; window.setTimeout(onDone, reducedMotion ? 300 : 1500);}
    return r || null;
  }, [enabled, solved, onAction, onDone, onNote, reducedMotion]);
  const Kind = KINDS[layer?.kind] || Missing;
  return <div className={'om-stage om-k-' + layer?.kind + (enabled ? '' : ' is-idle') + (solved ? ' is-solved' : '')}>
    <Kind layer={layer} offer={offer} solved={solved} enabled={enabled} note={onNote}/>
  </div>;
}
const Missing = () => null;

/* ── 1 · Bussorah Street ─────────────────────────────────────────────── */

/** Look around the promenade, find the glint, lift the brass clasp. */
function Bag({offer, solved, enabled}) {
  const [pan, setPan] = useState(.18), [found, setFound] = useState(solved), [open, setOpen] = useState(solved), [pull, setPull] = useState(0);
  const from = useRef(0);
  const look = useDrag({start: () => {from.current = pan;}, move: dx => setPan(Math.max(0, Math.min(1, from.current - dx / 420)))});
  const glint = .74, off = (glint - pan) * 260;
  const clasp = useDrag({
    move: (_, dy) => setPull(Math.max(0, Math.min(70, dy))),
    end: (_, dy) => {
      if (dy > 45 && offer('open')?.ok) {setOpen(true); window.setTimeout(() => playFilm(['OM-02'], 'Maintenance night'), 900);}
      setPull(0);
    },
  });
  return <>
    <div className={'om-pano' + (found ? ' is-dim' : '')} onPointerDown={found ? undefined : look}
      style={{backgroundImage: `url(${img('refs/R03.webp')})`, backgroundPosition: `${pan * 100}% 50%`}}>
      {!found && Math.abs(off) < 150 && <button className="om-glint" style={{left: `calc(50% + ${off}px)`}} disabled={!enabled}
        onPointerDown={e => e.stopPropagation()} onClick={() => setFound(true)} aria-label="Something glints by the planter"/>}
      {!found && <span className="om-swipe" aria-hidden="true"/>}
    </div>
    {found && <div className={'om-bag' + (open ? ' is-open' : '')}>
      <div className="om-bag-back"/>
      <div className="om-bag-items" aria-hidden={!open}>
        <figure className="om-paper om-letter"><i/><i/><i/><b>— A.</b></figure>
        <figure className="om-paper om-photo" style={{backgroundImage: `url(${img('props/invitation.webp')})`}}/>
        <button className="om-paper om-cctv" onClick={() => playFilm(['OM-02'], 'Maintenance night')} aria-label="Play the CCTV clip"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M1 0.5 L9.5 6 L1 11.5Z" fill="currentColor"/></svg><small>18:55</small></button>
        <figure className="om-paper om-photo" style={{backgroundImage: `url(${img('props/lot_genuine.webp')})`}}/>
      </div>
      <div className="om-bag-body"/>
      <div className="om-bag-flap" style={{transform: open ? undefined : `rotateX(${-pull * .5}deg)`}}>
        <button className="om-clasp" onPointerDown={open ? undefined : clasp} disabled={!enabled} aria-label="Pull the brass clasp down"/>
      </div>
    </div>}
  </>;
}

/** Two plates under glass. Hold to bring the loupe; let go on a difference to stamp it. */
const PLATES = {
  lot: {src: 'props/lot_genuine.webp', x: 140, y: 40, size: 520},
  case: {src: 'props/case_replica.webp', x: 200, y: 140, size: 400},
};
const DIFFS = [
  {id: 'edge', label: 'Hook', at: {lot: [.75, .68, .14], case: [.85, .57, .12]}},
  {id: 'bubbles', label: 'Bubbles', at: {lot: [.52, .44, .12], case: [.47, .4, .12]}},
  {id: 'seam', label: 'Seam', at: {case: [.62, .68, .1]}},
];
const DECOYS = [
  {at: {lot: [.37, .28, .13]}, says: 'The top matches the archive photo. Anyone can copy the top.'},
  {at: {case: [.25, .2, .1]}, says: 'A reflection on the case glass.'},
];
function plateStyle(p) {
  return {backgroundImage: `url(${img(p.src)})`, backgroundSize: `${80000 / p.size}% auto`,
    backgroundPosition: `${p.x / (800 - p.size) * 100}% ${p.y / (600 - p.size) * 100}%`};
}
function Compare({offer, solved, enabled, note}) {
  const [found, setFound] = useState(solved ? DIFFS.map(d => d.id) : []), [loupe, setLoupe] = useState(null);
  const hit = (side, fx, fy, list) => list.find(d => {const a = d.at[side]; return a && Math.hypot(fx - a[0], fy - a[1]) < a[2];});
  function look(side, e) {
    if (!enabled || solved) return;
    const el = e.currentTarget, box = el.getBoundingClientRect();
    try {el.setPointerCapture?.(e.pointerId);} catch { /* a pointer the browser no longer tracks */ }
    const at = ev => ({fx: (ev.clientX - box.left) / box.width, fy: (ev.clientY - box.top) / box.height});
    const show = ev => {const {fx, fy} = at(ev); setLoupe({side, fx: Math.max(0, Math.min(1, fx)), fy: Math.max(0, Math.min(1, fy))});};
    show(e);
    const up = ev => {
      el.removeEventListener('pointermove', show); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      setLoupe(null);
      const {fx, fy} = at(ev), d = hit(side, fx, fy, DIFFS);
      if (d && !found.includes(d.id)) {
        const next = [...found, d.id]; setFound(next);
        if (next.length === DIFFS.length) offer('three');
      } else if (!d) {const decoy = hit(side, fx, fy, DECOYS); if (decoy) note(decoy.says);}
    };
    el.addEventListener('pointermove', show); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  return <div className="om-plates">
    {['lot', 'case'].map(side => <div key={side} className="om-plate-wrap">
      <div className="om-plate" style={plateStyle(PLATES[side])} onPointerDown={e => look(side, e)}>
        {DIFFS.filter(d => found.includes(d.id) && d.at[side]).map(d => <span key={d.id} className="om-stamp-mark" style={{left: `${d.at[side][0] * 100}%`, top: `${d.at[side][1] * 100}%`}}><b>{d.label}</b></span>)}
        {loupe?.side === side && <span className="om-loupe" style={{left: `${loupe.fx * 100}%`, top: `${loupe.fy * 100}%`,
          ...plateStyle(PLATES[side]), backgroundSize: `${80000 / PLATES[side].size * 2.6}% auto`,
          backgroundPosition: `${loupe.fx * 100}% ${loupe.fy * 100}%`}}/>}
      </div>
      <span className="om-plate-tag">{side === 'lot' ? 'Lot' : 'Case'}</span>
    </div>)}
    <div className="om-tally" aria-label={`${found.length} of 3 differences`}>{DIFFS.map((d, i) => <i key={d.id} data-on={i < found.length || undefined}/>)}</div>
  </div>;
}

/** The archive band: a ring of bottle bases with one gap. Turn it; drop an edge into the gap. */
const TILES = 24;
function Band({offer, solved, enabled, note}) {
  const [turn, setTurn] = useState(solved ? 180 : 40), [light, setLight] = useState(.3), [fitted, setFitted] = useState(solved ? 'lot' : null);
  const [carry, setCarry] = useState(null), from = useRef(0), gap = useRef(null);
  const spin = useDrag({start: () => {from.current = turn;}, move: dx => setTurn(from.current + dx * .6)});
  const facing = Math.abs((((turn - 180) % 360) + 540) % 360 - 180) < 28;
  const shadow = Math.round(8 + light * 8);
  const grab = id => ({
    start: () => setCarry({id, dx: 0, dy: 0}),
    move: (dx, dy) => setCarry({id, dx, dy}),
    end: (dx, dy, e) => {
      setCarry(null);
      const g = gap.current?.getBoundingClientRect();
      if (!g || Math.hypot(e.clientX - (g.left + g.width / 2), e.clientY - (g.top + g.height / 2)) > 60) return;
      if (!facing) {note('Turn the band so the gap faces you.'); return;}
      if (offer(id)?.ok) setFitted(id);
    },
  });
  const lotDrag = useDrag(grab('lot')), caseDrag = useDrag(grab('case'));
  return <>
    <div className="om-band-scene" onPointerDown={enabled ? spin : undefined}>
      <div className="om-band" style={{transform: `rotateX(64deg) rotateZ(${turn}deg)`}}>
        {Array.from({length: TILES}, (_, i) => i === 0
          ? <span key={i} ref={gap} className={'om-gap' + (fitted ? ' is-fitted' : '')} style={{transform: `rotateZ(0deg) translateY(-118px) rotateX(-90deg)`}}><i/></span>
          : <span key={i} className={'om-tile' + (i === shadow ? ' is-shade' : '') + (i % 5 === 2 ? ' is-amber' : '')}
            onClick={i === shadow ? () => note('A rib’s shadow. Move the light.') : undefined}
            style={{transform: `rotateZ(${i * 360 / TILES}deg) translateY(-118px) rotateX(-90deg)`}}/>)}
      </div>
      <span className="om-band-light" style={{left: `${10 + light * 80}%`}} aria-hidden="true"/>
    </div>
    <input className="om-brass-slider" type="range" min="0" max="1" step=".01" value={light} onChange={e => setLight(+e.target.value)} aria-label="Move the light"/>
    <div className="om-tray">
      {['lot', 'case'].filter(id => id !== fitted).map(id => <span key={id} className={'om-shard is-' + id + (carry?.id === id ? ' is-carried' : '')}
        style={carry?.id === id ? {transform: `translate(${carry.dx}px, ${carry.dy}px) scale(1.15)`} : undefined}
        onPointerDown={!enabled || fitted ? undefined : id === 'lot' ? lotDrag : caseDrag} aria-label={id === 'lot' ? 'Edge from the lot' : 'Edge from the case'}>
        <i/><small>{id === 'lot' ? 'Lot' : 'Case'}</small></span>)}
    </div>
  </>;
}

/* ── 2 · Baghdad Street ─────────────────────────────────────────────── */

const SHOPS = [
  {id: 'plain', name: 'A', back: <svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="22"/></svg>},
  {id: 'r', name: 'B', back: <svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="22"/><text x="30" y="14">R</text>{Array.from({length: 7}, (_, i) => <line key={i} x1={30 + 22 * Math.sin((i * 14 + 26) * Math.PI / 180)} y1={30 - 22 * Math.cos((i * 14 + 26) * Math.PI / 180)} x2={30 + 17 * Math.sin((i * 14 + 26) * Math.PI / 180)} y2={30 - 17 * Math.cos((i * 14 + 26) * Math.PI / 180)}/>)}</svg>, photo: true},
  {id: 'top', name: 'C', back: <svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="22"/><rect x="22" y="22" width="16" height="16" rx="2"/></svg>},
];
function Catalogue({offer, solved, enabled}) {
  const [flipped, setFlipped] = useState(solved ? ['r'] : []), [carry, setCarry] = useState(null), [filed, setFiled] = useState(solved ? 'r' : null);
  const card = useRef({});
  const drag = id => ({
    start: () => setCarry({id, dx: 0, dy: 0, moved: false}),
    move: (dx, dy) => setCarry({id, dx, dy, moved: Math.hypot(dx, dy) > 8}),
    end: (dx, dy, e) => {
      setCarry(null);
      if (Math.hypot(dx, dy) < 8) {setFlipped(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]); return;}
      if (dropAt(e.clientX, e.clientY, card.current[id]) === 'file' && offer(id)?.ok) setFiled(id);
    },
  });
  const handlers = Object.fromEntries(SHOPS.map(s => [s.id, s]));
  return <div className="om-catalogue">
    <div className="om-cardbox">
      {SHOPS.map((s, i) => <CardDrag key={s.id} s={s} i={i} drag={drag} carry={carry} flipped={flipped} filed={filed} enabled={enabled} cardRef={el => {card.current[s.id] = el;}}/>)}
      <span className="om-cardbox-front"/>
    </div>
    <div className={'om-folder' + (filed ? ' is-filed' : '')} data-drop="file"><span className="om-folder-tab"/>{filed && <span className="om-folder-card">{handlers[filed].back}</span>}</div>
  </div>;
}
function CardDrag({s, i, drag, carry, flipped, filed, enabled, cardRef}) {
  const down = useDrag(drag(s.id));
  if (filed === s.id) return null;
  const c = carry?.id === s.id ? carry : null;
  return <div ref={cardRef} className={'om-index' + (flipped.includes(s.id) ? ' is-flipped' : '') + (c ? ' is-carried' : '')}
    style={{'--i': i, ...(c ? {transform: `translate(${c.dx}px, ${c.dy - 40}px) rotate(${c.dx / 20}deg)`} : {})}}
    onPointerDown={enabled ? down : undefined} role="button" aria-label={`Shop ${s.name}`}>
    <div className="om-index-face om-index-front"><b>{s.name}</b><i/><i/></div>
    <div className="om-index-face om-index-back">{s.back}{s.photo && <span className="om-index-photo" style={{backgroundImage: `url(${img('refs/R06.webp')})`}}/>}</div>
  </div>;
}

/** A street sketch with three brass sockets; pin the catalogue photo to the street it shows. */
function PinMap({offer, solved, enabled}) {
  const [carry, setCarry] = useState(null), [pinned, setPinned] = useState(solved ? 'arab' : null), photo = useRef(null);
  const down = useDrag({
    start: () => setCarry({dx: 0, dy: 0}),
    move: (dx, dy) => setCarry({dx, dy}),
    end: (dx, dy, e) => {setCarry(null); const at = dropAt(e.clientX, e.clientY, photo.current); if (at && offer(at)?.ok) setPinned(at);},
  });
  return <div className="om-map">
    <div className="om-map-sheet">
      <svg className="om-map-lines" viewBox="0 0 300 400" aria-hidden="true">
        <path d="M70 90 H290" className="road"/><path d="M200 20 V390" className="road"/><path d="M10 262 H290" className="road"/>
        <path d="M66 70 a24 24 0 0 1 48 0 z" className="dome"/><path d="M90 46 v-14 M84 36 h12" className="dome-l"/><rect x="62" y="70" width="56" height="20" className="dome-b"/>
        {[150, 170].map(x => <path key={x} d={`M${x} 118 v-16 m-7 5 l7 -5 l7 5`} className="palm"/>)}
        <text x="124" y="76">BUSSORAH</text><text x="128" y="248">ARAB</text>
        <text transform="translate(222 300) rotate(90)">BAGHDAD</text>
      </svg>
      {[['bussorah', 83, 22.5], ['baghdad', 66.7, 45], ['arab', 33, 65.5]].map(([id, x, y]) =>
        <span key={id} className={'om-socket' + (pinned === id ? ' is-pinned' : '')} data-drop={id} style={{left: `${x}%`, top: `${y}%`}}><i/></span>)}
    </div>
    {!pinned && <span ref={photo} className={'om-polaroid' + (carry ? ' is-carried' : '')} onPointerDown={enabled ? down : undefined}
      style={{backgroundImage: `url(${img('refs/R06.webp')})`, ...(carry ? {transform: `translate(${carry.dx}px, ${carry.dy}px) rotate(-2deg) scale(1.05)`} : {})}} aria-label="Catalogue photo"/>}
  </div>;
}

/* ── 3 · Arab Street ─────────────────────────────────────────────── */

/** A green shop door: slide the brass bolt and it swings in on Master Lin. */
function Door({offer, solved, enabled}) {
  const [bolt, setBolt] = useState(solved ? 1 : 0), [open, setOpen] = useState(solved);
  const down = useDrag({
    move: dx => setBolt(Math.max(0, Math.min(1, -dx / 60))),
    end: dx => {if (-dx > 50 && offer('open')?.ok) {setBolt(1); setOpen(true);} else setBolt(0);},
  });
  return <div className="om-doorway">
    <div className="om-shop" style={{backgroundImage: `url(${img('cast/lin.webp')})`}}><span className="om-shelf"/></div>
    <div className={'om-door' + (open ? ' is-open' : '')}>
      {[0, 1, 2].map(i => <span key={i} className="om-door-panel"/>)}
      <span className="om-door-glass"/>
      <span className="om-bolt-keep"/>
      <span className="om-bolt" style={{transform: `translateX(${-bolt * 46}px)`}} onPointerDown={enabled && !open ? down : undefined} aria-label="Slide the bolt"><i/></span>
    </div>
  </div>;
}

/** Hardcore A: three close-ups on a brass ring. Turn each until its notch drops on a tooth, rub the dust off, read. */
const ARCS = [
  {start: 0, marks: [['r', 10], ['long', 30], ['short', 42], ['short', 54], ['dots', 82], ['scratch', 104]]},
  {start: 120, marks: [['short', 136], ['dust', 151], ['short', 166], ['glare', 205]]},
  {start: 240, marks: [['edge', 300]]},
];
const polar = (deg, r) => [100 + r * Math.sin(deg * Math.PI / 180), 100 - r * Math.cos(deg * Math.PI / 180)];
function arcPath(a0, a1, r0, r1) {
  const [x0, y0] = polar(a0, r1), [x1, y1] = polar(a1, r1), [x2, y2] = polar(a1, r0), [x3, y3] = polar(a0, r0);
  return `M${x0} ${y0} A${r1} ${r1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
}
function Ring({offer, solved, enabled}) {
  // scrambled: every close-up one slot round from its own, a little askew
  const [rot, setRot] = useState(solved ? [0, 0, 0] : [116, 125, 121]), [dust, setDust] = useState(solved ? 0 : 1);
  const [digits, setDigits] = useState(solved ? [0, 7, 0, 3] : [0, 0, 0, 0]), svg = useRef(null);
  const locked = rot.map(r => Math.abs(r) < 1);
  const all = locked.every(Boolean);
  const angleAt = e => {const b = svg.current.getBoundingClientRect(); return Math.atan2(e.clientX - (b.left + b.width / 2), -(e.clientY - (b.top + b.height / 2))) * 180 / Math.PI;};
  function grab(i, e) {
    if (!enabled || solved || locked[i]) return;
    e.preventDefault(); const el = e.currentTarget; try {el.setPointerCapture?.(e.pointerId);} catch { /* untracked pointer */ }
    let last = angleAt(e);
    const move = ev => {const a = angleAt(ev); let d = a - last; if (d > 180) d -= 360; if (d < -180) d += 360; last = a;
      setRot(r => r.map((v, k) => k === i ? v + d : v));};
    const up = () => {el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      // a close-up drops into the nearest slot; only its own slot locks it
      setRot(r => r.map((v, k) => {if (k !== i) return v; const n = ((v % 360) + 360) % 360, slot = Math.round(n / 120) * 120; return Math.abs(n - slot) < 10 ? slot % 360 : n;}));};
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  const rub = e => {if (e.buttons || e.pointerType === 'touch') setDust(d => Math.max(0, d - .06));};
  const spin = (k, by) => setDigits(d => d.map((v, n) => n === k ? (v + by + 10) % 10 : v));
  return <div className="om-ringwrap">
    <svg ref={svg} className="om-ring" viewBox="0 0 200 200">
      <defs>
        <radialGradient id="omBrass" cx="40%" cy="35%"><stop offset="0" stopColor="#f3d68a"/><stop offset=".55" stopColor="#b88a35"/><stop offset="1" stopColor="#6b4a16"/></radialGradient>
        <linearGradient id="omGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3f5a3a"/><stop offset="1" stopColor="#1d2c1c"/></linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#omBrass)"/><circle cx="100" cy="100" r="44" fill="#2a2116"/>
      {[0, 120, 240].map(t => {const [x, y] = polar(t + 4, 92); return <circle key={t} cx={x} cy={y} r="3.4" className="om-tooth"/>;})}
      {[0, 1, 2].sort((a, b) => locked[b] - locked[a]).map(i => [ARCS[i], i]).map(([arc, i]) => <g key={i} className={'om-arc' + (locked[i] ? ' is-locked' : '')} transform={`rotate(${rot[i]} 100 100)`} onPointerDown={e => grab(i, e)}>
        <path d={arcPath(arc.start + 1.5, arc.start + 118.5, 50, 88)} fill="url(#omGlass)"/>
        <path d={arcPath(arc.start + 1.5, arc.start + 118.5, 50, 88)} className="om-arc-edge"/>
        {(() => {const [x, y] = polar(arc.start + 4, 88); return <circle cx={x} cy={y} r="4" className="om-notch"/>;})()}
        {arc.marks.map(([kind, a], k) => {
          if (kind === 'r') {const [x, y] = polar(a, 70); return <g key={k}><path d={arcPath(a - 6, a + 6, 74, 86)} className="om-ground"/><text x={x} y={y + 3} className="om-r">R</text></g>;}
          if (kind === 'long' || kind === 'short' || kind === 'dust') {const [x0, y0] = polar(a, 86), [x1, y1] = polar(a, kind === 'long' ? 66 : 76);
            return <g key={k}><line x1={x0} y1={y0} x2={x1} y2={y1} className="om-tick"/>
              {kind === 'dust' && <circle cx={(x0 + x1) / 2} cy={(y0 + y1) / 2} r="9" className="om-dust" style={{opacity: dust}} onPointerMove={rub} onPointerDown={e => {e.stopPropagation(); rub(e);}}/>}</g>;}
          if (kind === 'dots') {const [x0, y0] = polar(a, 80), [x1, y1] = polar(a + 5, 80); return <g key={k}><circle cx={x0} cy={y0} r="1.8" className="om-dot"/><circle cx={x1} cy={y1} r="1.8" className="om-dot"/></g>;}
          if (kind === 'scratch') {const [x0, y0] = polar(a - 4, 84), [x1, y1] = polar(a + 4, 72); return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} className="om-scratch"/>;}
          if (kind === 'glare') {const [x0, y0] = polar(a - 10, 82), [x1, y1] = polar(a + 8, 60); return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} className="om-glare"/>;}
          return null;
        })}
      </g>)}
      <g className="om-legend" aria-hidden="true">
        <line x1="84" y1="86" x2="84" y2="100"/><text x="91" y="97">5</text>
        <line x1="84" y1="106" x2="84" y2="113"/><text x="91" y="113">1</text>
      </g>
    </svg>
    <div className={'om-drums' + (all ? ' is-ready' : '')} aria-hidden={!all}>
      {digits.map((d, k) => <React.Fragment key={k}>{k === 2 && <span className="om-drum-sep">–</span>}<Drum value={d} onUp={() => spin(k, 1)} onDown={() => spin(k, -1)} label={`Digit ${k + 1}`} disabled={!all || solved}/></React.Fragment>)}
      <button className="om-check" disabled={!all || solved} onClick={() => offer(digits.join(''))} aria-label="Check the register"/>
    </div>
  </div>;
}
/** A brass drum: flick it up or down to roll, or tap its top or bottom half for one step. */
function Drum({value, onUp, onDown, label, disabled}) {
  const drag = useRef(null);
  const down = e => {
    if (disabled || e.button > 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    drag.current = {y: e.clientY, n: 0, moved: false, top: e.clientY < box.top + box.height / 2};
    try {e.currentTarget.setPointerCapture?.(e.pointerId);} catch { /* untracked pointer */ }
  };
  const move = e => {
    const d = drag.current; if (!d) return;
    if (Math.abs(e.clientY - d.y) > 6) d.moved = true;
    const steps = Math.trunc((d.y - e.clientY) / 18);
    while (d.n < steps) {d.n++; onUp();}
    while (d.n > steps) {d.n--; onDown();}
  };
  const up = () => {const d = drag.current; drag.current = null; if (d && !d.moved) (d.top ? onUp : onDown)();};
  // a pointer's own click is handled above; the buttons answer the keyboard
  return <span className="om-drum" aria-label={`${label}: ${value}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => {drag.current = null;}}
    onClickCapture={e => {if (e.detail > 0) e.stopPropagation();}}>
    <button onClick={onUp} disabled={disabled} aria-label={`${label} up`}/>
    <b key={value}>{value}</b>
    <button onClick={onDown} disabled={disabled} aria-label={`${label} down`}/>
  </span>;
}

/** Lin's half of the batik offcut, laid on the CCTV still of Sam's bundle: move it, turn it by its pin. */
function Batik({offer, solved, enabled}) {
  const [pos, setPos] = useState(solved ? {x: 0, y: 0, r: 0} : {x: -42, y: 64, r: -22}), [snap, setSnap] = useState(solved);
  const {move, turn} = useMoveTurn(pos, setPos, p => {if (Math.abs(p.x) < 14 && Math.abs(p.y) < 14 && Math.abs(p.r) < 8 && offer('match')?.ok) {setPos({x: 0, y: 0, r: 0}); setSnap(true);}});
  return <div className="om-batik">
    <div className="om-cctv-still"><span className="om-swatch is-right" style={{backgroundImage: `url(${img('props/batik_match.webp')})`}}/><small>18:55</small></div>
    <span className={'om-swatch is-left' + (snap ? ' is-snapped' : '')} style={{backgroundImage: `url(${img('props/batik_match.webp')})`, transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.r}deg)`}}
      onPointerDown={enabled && !snap ? move : undefined} aria-label="Lin's half of the cloth">
      {!snap && <i className="om-pin" onPointerDown={enabled ? turn : undefined} aria-label="Turn the cloth"/>}
    </span>
  </div>;
}

/* ── 4 · Muscat Street ─────────────────────────────────────────────── */

const MOTIFS = {
  castle: <path d="M8 40 V20 h5 v5 h5 v-5 h6 v5 h5 v-5 h5 v20 Z"/>,
  dagger: <path d="M21 6 l3 20 h6 v3 h-6 l-2 10 c-1 2 -3 2 -4 0 l-2 -10 h-6 v-3 h6 Z"/>,
  ship: <><path d="M6 32 h30 l-5 7 h-20 Z"/><path d="M20 8 v24 M20 9 l12 10 h-12 M20 9 l-10 13 h10"/><path d="M20 8 l7 -3 v4 Z M14 12 l-6 -2 v4 Z" className="flag"/></>,
  pot: <path d="M15 12 h10 l2 6 c6 2 7 12 2 18 h-16 c-5 -6 -4 -16 2 -18 Z M27 20 c6 -2 10 -8 10 -12 M18 8 h4 v4 h-4 Z"/>,
  palm: <path d="M21 40 c-1 -10 0 -20 0 -24 M21 16 c-6 -6 -12 -4 -14 0 M21 16 c6 -6 12 -4 14 0 M21 16 c-2 -6 -8 -10 -10 -8 M21 16 c2 -6 8 -10 10 -8"/>,
};
const ROW = ['castle', 'dagger', 'ship', 'pot', 'palm'];
function Frame({motif, children, ...rest}) {
  return <span className="om-frame" {...rest}><svg viewBox="0 0 42 44" aria-hidden="true">{MOTIFS[motif]}</svg>{children}</span>;
}
function LampRow({offer, solved, enabled}) {
  const [carry, setCarry] = useState(null), [hung, setHung] = useState(solved ? 'ship' : null), lamp = useRef(null);
  const down = useDrag({
    start: () => setCarry({dx: 0, dy: 0}), move: (dx, dy) => setCarry({dx, dy}),
    end: (dx, dy, e) => {setCarry(null); const at = dropAt(e.clientX, e.clientY, lamp.current); if (at && offer(at)?.ok) setHung(at);},
  });
  return <div className="om-row-scene">
    <div className="om-row">{ROW.map(m => <Frame key={m} motif={m} data-drop={m} className={'om-frame' + (hung === m ? ' is-lit' : '')} aria-label={m}/>)}</div>
    {!hung && <span ref={lamp} className={'om-lamp' + (carry ? ' is-carried' : '')} onPointerDown={enabled ? down : undefined}
      style={carry ? {transform: `translate(${carry.dx}px, ${carry.dy}px)`} : undefined} aria-label="The night lamp"/>}
  </div>;
}

/** Hardcore B: the certificate fragment over the boat frame; when its border lines meet the wall's, it turns over. */
function Overlay({offer, solved, enabled}) {
  const [pos, setPos] = useState(solved ? {x: 0, y: 0, r: 0} : {x: 54, y: 78, r: 16}), [flip, setFlip] = useState(solved);
  const {move, turn} = useMoveTurn(pos, setPos, p => {if (Math.abs(p.x) < 12 && Math.abs(p.y) < 12 && Math.abs(p.r) < 7 && offer('aligned')?.ok) {setPos({x: 0, y: 0, r: 0}); window.setTimeout(() => setFlip(true), 500);}});
  return <div className="om-overlay">
    <div className="om-wall"><Frame motif="ship" className="om-frame is-big"/><Frame motif="pot" className={'om-frame is-big is-next' + (flip ? ' is-shown' : '')}/></div>
    <span className={'om-fragment' + (flip ? ' is-flipped' : '')} style={{transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.r}deg)`}} onPointerDown={enabled && !flip ? move : undefined} aria-label="Certificate fragment">
      <span className="om-fragment-front"><svg viewBox="0 0 42 44" aria-hidden="true">{MOTIFS.ship}</svg><small>1975</small></span>
      <span className="om-fragment-back"><b>→</b></span>
      {!flip && <i className="om-pin" onPointerDown={enabled ? turn : undefined} aria-label="Turn the fragment"/>}
    </span>
  </div>;
}

/** The password, on six brass letter drums. */
function Letters({offer, solved, enabled}) {
  const [word, setWord] = useState(solved ? 'DALLAH' : 'KHSQTB');
  const spin = (k, by) => setWord(w => w.split('').map((c, n) => n === k ? String.fromCharCode((c.charCodeAt(0) - 65 + by + 26) % 26 + 65) : c).join(''));
  return <div className="om-letters">
    <div className="om-wall is-small"><Frame motif="ship" className="om-frame"/><Frame motif="pot" className="om-frame is-lit"/></div>
    <div className="om-drums is-ready">{word.split('').map((c, k) => <Drum key={k} value={c} onUp={() => spin(k, 1)} onDown={() => spin(k, -1)} label={`Letter ${k + 1}`} disabled={!enabled || solved}/>)}</div>
    <button className="om-check" disabled={!enabled || solved} onClick={() => offer(word)} aria-label="Speak the password"/>
  </div>;
}

/* ── 5 · Kandahar Street ─────────────────────────────────────────────── */

/** Two shophouse elevations: late style (shutters, medallions, tiled five-foot way) and Art Deco (fins, flat glass). */
function Facade({style, slice}) {
  const ratio = slice ? 'xMidYMid slice' : 'xMidYMid meet';
  return style === 'late'
    ? <svg viewBox="0 0 120 200" preserveAspectRatio={ratio} aria-hidden="true">
      <rect x="4" y="16" width="112" height="182" className="wall"/>
      <path d="M2 16 h116 v7 h-116Z M44 16 l16 -12 l16 12Z" className="cornice"/>
      {[22, 60, 98].map(x => <g key={x}>
        <circle cx={x} cy="36" r="6" className="medal"/>
        <rect x={x - 11} y="48" width="22" height="46" className="shutter"/>
        {[0, 1, 2, 3, 4].map(k => <line key={k} x1={x - 9} x2={x + 9} y1={53 + k * 9} y2={53 + k * 9} className="louvre"/>)}
        <path d={`M${x - 6} 104 q6 -9 12 0`} className="flower"/>
      </g>)}
      {[41, 79].map(x => <rect key={x} x={x - 3} y="23" width="6" height="92" className="pilaster"/>)}
      <rect x="2" y="112" width="116" height="6" className="cornice"/>
      {[[14, 34], [86, 106]].map(([a, b]) => <path key={a} d={`M${a} 196 V146 a${(b - a) / 2} ${(b - a) / 2} 0 0 1 ${b - a} 0 V196`} className="arch"/>)}
      <path d="M48 196 V142 h24 V196" className="door"/>
      <rect x="4" y="182" width="112" height="14" className="tiles"/>
    </svg>
    : <svg viewBox="0 0 120 200" preserveAspectRatio={ratio} aria-hidden="true">
      <path d="M4 198 V22 h30 v-8 h14 v-8 h24 v8 h14 v8 h30 V198Z" className="wall deco"/>
      <path d="M60 6 V40" className="fin"/>
      {[30, 36, 108, 114].map(y => <line key={y} x1="4" x2="116" y1={y} y2={y} className="fin"/>)}
      {[24, 60, 96].map(x => <g key={x}><rect x={x - 12} y="46" width="24" height="54" className="glass"/><line x1={x} x2={x} y1="46" y2="100" className="fin"/></g>)}
      <rect x="2" y="120" width="116" height="5" className="fin-fill"/>
      {[14, 48, 82].map(x => <rect key={x} x={x} y="140" width="24" height="56" className="glass"/>)}
    </svg>;
}
function FacadePick({offer, solved, enabled}) {
  const [carry, setCarry] = useState(null), [laid, setLaid] = useState(solved ? 'late' : null), photo = useRef(null);
  const down = useDrag({
    start: () => setCarry({dx: 0, dy: 0}), move: (dx, dy) => setCarry({dx, dy}),
    end: (dx, dy, e) => {setCarry(null); const at = dropAt(e.clientX, e.clientY, photo.current); if (at && offer(at)?.ok) setLaid(at);},
  });
  return <div className="om-facades">
    {['late', 'deco'].map(s => <span key={s} className={'om-elevation' + (laid === s ? ' is-laid' : '')} data-drop={s}><Facade style={s}/><span className="om-lamp is-small" hidden={laid !== s}/></span>)}
    {!laid && <span ref={photo} className={'om-polaroid is-blur' + (carry ? ' is-carried' : '')} onPointerDown={enabled ? down : undefined}
      style={carry ? {transform: `translate(${carry.dx}px, ${carry.dy}px) rotate(-3deg)`} : undefined} aria-label="Blurred photo"><Facade style="late" slice/><i className="om-arch-corner"/></span>}
  </div>;
}

/** The preview pack: pull the string, the cotton falls open, turn the cards, lay the payee on the register line. */
const PACK = [
  {id: 'match', face: <span className="om-card-img" style={{backgroundImage: `url(${img('props/payment_card.webp')})`}}/>},
  {id: 'notice', face: <span className="om-card-note"><b>20:00</b><i/><i/></span>},
  {id: 'pin', face: <span className="om-card-note"><b>22:20</b><i/></span>},
  {id: 'photo', face: <span className="om-card-dark"><i/><i/></span>},
];
function Pack({offer, solved, enabled, note}) {
  const [pull, setPull] = useState(solved ? 1 : 0), [flipped, setFlipped] = useState(solved ? ['match'] : []), [carry, setCarry] = useState(null), [matched, setMatched] = useState(solved);
  const open = pull >= 1, cards = useRef({});
  const string = useDrag({move: (dx, dy) => setPull(p => p >= 1 ? 1 : Math.min(.95, Math.hypot(dx, dy) / 90)), end: (dx, dy) => setPull(Math.hypot(dx, dy) > 70 ? 1 : 0)});
  const drag = id => ({
    start: () => setCarry({id, dx: 0, dy: 0}), move: (dx, dy) => setCarry({id, dx, dy}),
    end: (dx, dy, e) => {
      setCarry(null);
      if (Math.hypot(dx, dy) < 8) {setFlipped(f => f.includes(id) ? f : [...f, id]); return;}
      if (dropAt(e.clientX, e.clientY, cards.current[id]) !== 'register') return;
      if (!flipped.includes(id)) {note('Turn it over first.'); return;}
      if (offer(id)?.ok) setMatched(true);
    },
  });
  return <div className="om-pack-scene">
    <div className={'om-register' + (matched ? ' is-matched' : '')} data-drop="register"><span>07-03</span><b>Y.</b><span>···4471</span></div>
    <div className={'om-pack' + (open ? ' is-open' : '')}>
      <span className="om-cloth"/>{[0, 1, 2, 3].map(k => <span key={k} className={'om-flap f' + k}/>)}
      {!open && <span className="om-string" style={{'--pull': pull}}><i className="om-knot" onPointerDown={enabled ? string : undefined} aria-label="Pull the string"/></span>}
      {open && <div className="om-pack-cards">{PACK.map((c, i) => <PackCard key={c.id} c={c} i={i} drag={drag} carry={carry} flipped={flipped} matched={matched} enabled={enabled} cardRef={el => {cards.current[c.id] = el;}}/>)}</div>}
    </div>
  </div>;
}
function PackCard({c, i, drag, carry, flipped, matched, enabled, cardRef}) {
  const down = useDrag(drag(c.id));
  const k = carry?.id === c.id ? carry : null;
  if (matched && c.id === 'match') return <span className="om-pcard is-flipped is-gone" style={{'--c': i % 2, '--r': Math.floor(i / 2)}}/>;
  return <span ref={cardRef} className={'om-pcard' + (flipped.includes(c.id) ? ' is-flipped' : '') + (k ? ' is-carried' : '')} style={{'--c': i % 2, '--r': Math.floor(i / 2), ...(k ? {transform: `translate(${k.dx}px, ${k.dy}px) scale(1.06)`} : {})}}
    onPointerDown={enabled && !matched ? down : undefined} role="button" aria-label={`Card ${i + 1}`}>
    <span className="om-pcard-back"/><span className="om-pcard-face">{c.face}</span>
  </span>;
}

/* ── 6 · Muscat Street back lane ─────────────────────────────────────────────── */

/** Two lamps in the lane: hold one until it lights. One is live; one is an old pin. */
function LaneLamps({offer, solved, enabled}) {
  const [held, setHeld] = useState(null), [lit, setLit] = useState(solved ? 'live' : null), [dead, setDead] = useState(false), timer = useRef(0);
  function hold(id, e) {
    if (!enabled || lit) return; e.preventDefault();
    setHeld(id);
    timer.current = window.setTimeout(() => {setHeld(null); if (offer(id)?.ok) setLit(id); else if (id === 'old') setDead(true);}, 900);
  }
  const let_go = () => {window.clearTimeout(timer.current); setHeld(null);};
  return <div className="om-lane">
    <svg className="om-lane-walls" viewBox="0 0 300 220" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 0 L120 90 L120 150 L0 220Z" className="wall-l"/><path d="M300 0 L180 90 L180 150 L300 220Z" className="wall-r"/>
      <path d="M120 150 L180 150 L300 220 L0 220Z" className="floor"/>
      {[[20, 60, 40, 40], [70, 92, 22, 24]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} className="frame"/>)}
      {[[240, 64, 36, 38], [196, 96, 20, 22]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} className="frame"/>)}
      <g className="bin"><rect x="206" y="160" width="26" height="34" rx="3"/><circle cx="214" cy="174" r="3"/><circle cx="223" cy="182" r="3"/><circle cx="217" cy="186" r="2.4"/></g>
    </svg>
    {[['old', 30, 30], ['live', 62, 22]].map(([id, x, y]) => <button key={id} className={'om-lamp om-lane-lamp is-' + id + (held === id ? ' is-held' : '') + (lit === id ? ' is-lit' : '') + (dead && id === 'old' ? ' is-dead' : '')}
      style={{left: `${x}%`, top: `${y}%`}} onPointerDown={e => hold(id, e)} onPointerUp={let_go} onPointerLeave={let_go} onPointerCancel={let_go} disabled={!enabled}
      aria-label={id === 'live' ? 'Bright lamp' : 'Dim lamp'}><i/></button>)}
    {lit && <span className="om-pincard"><b>20:00</b><span>22:35</span></span>}
  </div>;
}

/** Four of six into the envelope: what, who swapped, who sells, where. */
const EVIDENCE = [['01', 'The gap fits'], ['02', 'Marked R'], ['03', '07-03 · Y.'], ['04', 'Certificate'], ['05', 'Payee Y.'], ['06', 'Tonight 20:00']];
const SEAL = ['01', '03', '05', '06'];
function Envelope({offer, solved, enabled, note}) {
  const [inside, setInside] = useState(solved ? SEAL : []), [carry, setCarry] = useState(null), [sealed, setSealed] = useState(solved), cards = useRef({});
  const drag = id => ({
    start: () => setCarry({id, dx: 0, dy: 0}), move: (dx, dy) => setCarry({id, dx, dy}),
    end: (dx, dy, e) => {
      setCarry(null);
      if (dropAt(e.clientX, e.clientY, cards.current[id]) !== 'envelope') return;
      if (!SEAL.includes(id)) {offer(id); return;}
      const next = [...inside, id]; setInside(next); note('');
      if (next.length === SEAL.length && offer('sealed')?.ok) setSealed(true);
    },
  });
  return <div className="om-envelope-scene">
    <div className={'om-envelope' + (sealed ? ' is-sealed' : '')} data-drop="envelope">
      <span className="om-env-flap"/><span className="om-env-slots">{SEAL.map((_, k) => <i key={k} data-on={k < inside.length || undefined}/>)}</span>
      <span className="om-wax"/>
    </div>
    <div className="om-fan">{EVIDENCE.filter(([id]) => !inside.includes(id)).map(([id, label], i, all) =>
      <EvCard key={id} id={id} label={label} i={i} n={all.length} drag={drag} carry={carry} enabled={enabled && !sealed} cardRef={el => {cards.current[id] = el;}}/>)}</div>
  </div>;
}
function EvCard({id, label, i, n, drag, carry, enabled, cardRef}) {
  const down = useDrag(drag(id));
  const k = carry?.id === id ? carry : null, spread = (i - (n - 1) / 2);
  return <span ref={cardRef} className={'om-ev' + (k ? ' is-carried' : '')} onPointerDown={enabled ? down : undefined}
    style={{transform: k ? `translate(${k.dx}px, ${k.dy}px) scale(1.08)` : `translateX(${spread * 38}px) rotate(${spread * 7}deg) translateY(${spread * spread * 3}px)`}}>
    <b>{id}</b><small>{label}</small>
  </span>;
}

const KINDS = {bag: Bag, compare: Compare, band: Band, catalogue: Catalogue, pinmap: PinMap, door: Door, ring: Ring, batik: Batik,
  lamprow: LampRow, overlay: Overlay, letters: Letters, facade: FacadePick, pack: Pack, lanelamps: LaneLamps, envelope: Envelope};
