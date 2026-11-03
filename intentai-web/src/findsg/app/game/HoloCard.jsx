import React, {useEffect, useId, useRef, useState} from 'react';
import BrandMark from '../components/BrandMark.jsx';
import './holo-card.css';

const MATERIALS = new Set(['letter', 'newspaper', 'film', 'brass']);
const PRESETS = new Set(['bursts']);
const MATERIAL_LABELS = {letter: 'A letter from the city', newspaper: 'A street story clipping', film: 'A frame of city memory', brass: 'A city keepsake'};
const textureCache = new WeakMap();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Deterministic, local foil masks. The image, lettering and story remain real
 * DOM content; these masks contain only abstract rays, grain and tiny glints. */
function foilTextures(document) {
  if (textureCache.has(document)) return textureCache.get(document);
  let seed = 48127;
  const random = () => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296;};
  const create = (width, height) => {const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return {canvas, context: canvas.getContext('2d')};};
  const W = 1024, H = 1440;
  const rays = create(W, H), glints = create(W, H), grain = create(192, 192);
  if (!rays.context || !glints.context || !grain.context) return null;

  const centers = [[.10, .08, .31], [.78, .18, .36], [.30, .39, .34], [.99, .49, .32], [.04, .71, .34], [.67, .74, .38], [.36, 1.02, .33]];
  const ctx = rays.context;
  ctx.lineCap = 'butt';
  for (const [x, y, radius] of centers) {
    const cx = x * W, cy = y * H, end = radius * W;
    const phase = random() * Math.PI * 2;
    for (let ray = 0; ray < 112; ray++) {
      const angle = phase + ray / 112 * Math.PI * 2;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      for (let r = 18 + random() * 8; r < end; r += 23) {
        const length = 7 + r / end * 8, fade = Math.sin(r / end * Math.PI) * .57 + .2;
        ctx.strokeStyle = `rgba(255,255,255,${fade * (.6 + random() * .4)})`;
        ctx.lineWidth = 1.1 + random() * 1.3;
        ctx.beginPath(); ctx.moveTo(cx + cos * r, cy + sin * r); ctx.lineTo(cx + cos * (r + length), cy + sin * (r + length)); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 1.2;
    for (let axis = 0; axis < 4; axis++) {
      const angle = axis * Math.PI / 4, length = axis % 2 ? 8 : 13;
      ctx.beginPath(); ctx.moveTo(cx - Math.cos(angle) * length, cy - Math.sin(angle) * length); ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length); ctx.stroke();
    }
  }

  const speck = glints.context;
  for (let n = 0; n < 1600; n++) {
    let x = random() * W, y = random() * H;
    // A denser scattering at the edge catches light like a pressed foil rim.
    if (n > 900) {if (n % 2) x = random() < .5 ? random() * 27 : W - random() * 27; else y = random() < .5 ? random() * 27 : H - random() * 27;}
    const r = .45 + random() * 1.55, alpha = .15 + random() * .75;
    speck.fillStyle = `rgba(255,255,255,${alpha})`; speck.beginPath(); speck.arc(x, y, r, 0, Math.PI * 2); speck.fill();
    if (n % 29 === 0) {
      const length = 3 + random() * 5; speck.strokeStyle = `rgba(255,255,255,${alpha})`; speck.lineWidth = .8;
      speck.beginPath(); speck.moveTo(x - length, y); speck.lineTo(x + length, y); speck.moveTo(x, y - length); speck.lineTo(x, y + length); speck.stroke();
    }
  }
  const paper = grain.context;
  for (let n = 0; n < 6800; n++) {
    paper.fillStyle = n % 2 ? `rgba(62,43,18,${.04 + random() * .12})` : `rgba(255,255,255,${.09 + random() * .2})`;
    paper.fillRect(random() * 192, random() * 192, random() > .9 ? 2 : 1, 1);
  }
  const textures = {bursts: rays.canvas.toDataURL('image/png'), glints: glints.canvas.toDataURL('image/png'), grain: grain.canvas.toDataURL('image/png')};
  textureCache.set(document, textures);
  return textures;
}

function useMotionPreference(reducedMotion) {
  const [systemReduced, setSystemReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(query.matches); update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return Boolean(reducedMotion || systemReduced);
}

function SurfaceEffects() {
  return <span className="holo-card__effects" aria-hidden="true">
    <span className="holo-card__rainbow"/>
    <span className="holo-card__bursts"/>
    <span className="holo-card__glints"/>
    <span className="holo-card__specular"/>
    <span className="holo-card__foil-rim"/>
    <span className="holo-card__entry-shine"/>
  </span>;
}

/** Children are noninteractive front-face content. The single outer button is
 * the complete flip interaction: no nested buttons, links or focus traps. */
export default function HoloCard({
  image, alt = '', preset = 'bursts', variant = 'letter', title = 'One detail, one city story',
  subtitle, serial = 'FINDSG / ARCHIVE', children, backTitle, backText,
  reducedMotion = false, selected = false, className = '', imagePosition = 'center', imageCrop = 'normal',
}) {
  const element = useRef(null), ownerWindow = useRef(null), frame = useRef(null), queued = useRef(null), pointer = useRef(null), suppressClickUntil = useRef(0);
  const [flipped, setFlipped] = useState(false), [imageFailed, setImageFailed] = useState(false), [pulse, setPulse] = useState(0);
  const lastSelected = useRef(false), id = useId(), motionReduced = useMotionPreference(reducedMotion);
  const motionRef = useRef(motionReduced); motionRef.current = motionReduced;
  const material = MATERIALS.has(variant) ? variant : 'letter';
  const frontTextId = id + '-front-copy', backTextId = id + '-back-copy';
  const win = () => element.current?.ownerDocument?.defaultView || ownerWindow.current;

  function cancelFrame() {const view = win(); if (frame.current !== null && view) view.cancelAnimationFrame(frame.current); frame.current = null; queued.current = null;}
  function paintPoint(x, y, active = true) {
    const node = element.current; if (!node) return;
    node.dataset.active = active ? 'true' : 'false';
    if (motionRef.current) return;
    const px = clamp(x, 0, 1), py = clamp(y, 0, 1), dx = px - .5, dy = py - .5;
    node.style.setProperty('--holo-x', `${(px * 100).toFixed(2)}%`);
    node.style.setProperty('--holo-y', `${(py * 100).toFixed(2)}%`);
    node.style.setProperty('--holo-rx', `${(-dy * 15).toFixed(2)}deg`);
    node.style.setProperty('--holo-ry', `${(dx * 19).toFixed(2)}deg`);
    node.style.setProperty('--holo-bg-x', `${(35 + px * 30).toFixed(2)}%`);
    node.style.setProperty('--holo-bg-y', `${(35 + py * 30).toFixed(2)}%`);
    node.style.setProperty('--holo-angle', `${(115 + dx * 32 - dy * 24).toFixed(2)}deg`);
    node.style.setProperty('--holo-shadow-x', `${(-dx * 14).toFixed(2)}px`);
    node.style.setProperty('--holo-shadow-y', `${(12 - dy * 10).toFixed(2)}px`);
  }
  function track(event) {
    const node = element.current; if (!node || motionRef.current) return;
    const rect = node.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    queued.current = {x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height};
    if (frame.current !== null) return;
    frame.current = win().requestAnimationFrame(() => {frame.current = null; const value = queued.current; queued.current = null; if (value) paintPoint(value.x, value.y);});
  }
  function resetTilt() {cancelFrame(); paintPoint(.5, .5, false);}

  useEffect(() => {
    const node = element.current; if (!node) return;
    ownerWindow.current = node.ownerDocument.defaultView;
    try {
      const textures = foilTextures(node.ownerDocument);
      if (textures) for (const [name, value] of Object.entries(textures)) node.style.setProperty('--holo-' + name, `url("${value}")`);
    } catch {
      // CSS keeps the metal edge and a static spectrum if Canvas is restricted.
    }
    return () => {cancelFrame(); pointer.current = null;};
  }, []);

  useEffect(() => {setImageFailed(false);}, [image]);
  useEffect(() => {setFlipped(false); resetTilt();}, [serial, title]);
  useEffect(() => {
    if (selected && !lastSelected.current) setPulse(value => value + 1);
    lastSelected.current = selected;
  }, [selected]);
  useEffect(() => {
    if (!motionReduced) return;
    cancelFrame(); const node = element.current;
    if (node) {
      for (const [name, value] of Object.entries({'--holo-rx': '0deg', '--holo-ry': '0deg', '--holo-x': '50%', '--holo-y': '40%', '--holo-bg-x': '50%', '--holo-bg-y': '50%', '--holo-angle': '115deg', '--holo-shadow-x': '0px', '--holo-shadow-y': '12px'})) node.style.setProperty(name, value);
      node.dataset.active = 'false';
    }
  }, [motionReduced]);

  const down = event => {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    pointer.current = {id: event.pointerId, x: event.clientX, y: event.clientY, moved: false};
    track(event);
  };
  const move = event => {
    if (pointer.current?.id === event.pointerId && Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > 8) pointer.current.moved = true;
    if (event.pointerType === 'mouse' || event.pointerType === 'pen' || pointer.current?.id === event.pointerId) track(event);
  };
  const release = (event, cancelled = false) => {
    if (pointer.current?.id === event.pointerId) {
      if (cancelled || pointer.current.moved) suppressClickUntil.current = (win()?.performance.now() || 0) + 450;
      pointer.current = null;
    }
    if (event.pointerType !== 'mouse' || cancelled) resetTilt();
  };
  const flip = event => {
    // A drag changes only the foil/viewing angle. Keyboard activation remains
    // available immediately, even after a pointer gesture.
    if (event.detail !== 0 && (win()?.performance.now() || 0) < suppressClickUntil.current) {event.preventDefault(); return;}
    setFlipped(value => !value);
  };

  return <button
    ref={element} type="button"
    className={['holo-card', 'holo-card--' + material, selected ? 'is-selected' : '', flipped ? 'is-flipped' : '', className].filter(Boolean).join(' ')}
    data-preset={PRESETS.has(preset) ? preset : 'bursts'} data-reduced-motion={motionReduced ? 'true' : 'false'} data-active="false"
    aria-label={(flipped ? backTitle || title : title) + (flipped ? ', tap to flip back' : ', tap to see the back')}
    aria-pressed={flipped} aria-describedby={flipped ? backTextId : frontTextId}
    onPointerDown={down} onPointerMove={move} onPointerUp={event => release(event)} onPointerCancel={event => release(event, true)}
    onPointerEnter={event => {if (event.pointerType === 'mouse') track(event);}}
    onPointerLeave={() => {if (pointer.current?.moved) suppressClickUntil.current = (win()?.performance.now() || 0) + 450; pointer.current = null; resetTilt();}}
    onFocus={() => {if (!motionRef.current) paintPoint(.48, .37, true);}}
    onBlur={resetTilt} onClick={flip}
    onKeyDown={event => {if (event.key === 'Escape' && flipped) {event.preventDefault(); setFlipped(false);}}}
  >
    <span className="holo-card__shadow" aria-hidden="true"/>
    <span className="holo-card__tilt">
      <span className="holo-card__rotor">
        <span className="holo-card__edge holo-card__edge--one" aria-hidden="true"/>
        <span className="holo-card__edge holo-card__edge--two" aria-hidden="true"/>
        <span className="holo-card__edge holo-card__edge--three" aria-hidden="true"/>

        <span className="holo-card__face holo-card__front" aria-hidden={flipped}>
          <span className="holo-card__paper">
            <span className="holo-card__header"><span className="holo-card__brand">FindSG<span>.</span></span><span className="holo-card__edition">FIELD ARCHIVE</span><span className="holo-card__seal" aria-hidden="true"><BrandMark/></span></span>
            <span className="holo-card__subtitle">{subtitle || MATERIAL_LABELS[material]}</span>
            <span className="holo-card__title">{title}</span>
            <span className={'holo-card__image-window' + (imageCrop === 'triptych-left' ? ' is-triptych' : '')}>
              {image && !imageFailed ? <img src={image} alt={alt || title + ' · story concept art'} style={{objectPosition: imageCrop === 'triptych-left' ? 'left center' : imagePosition}} loading="lazy" decoding="async" draggable="false" onError={() => setImageFailed(true)}/> : <span className="holo-card__image-fallback" aria-hidden="true"><i/><BrandMark className="holo-card__fallback-mark"/><small>CITY / MEMORY / DISCOVERY</small></span>}
              <span className="holo-card__image-vignette" aria-hidden="true"/>
              <span className="holo-card__image-caption" aria-hidden="true"><span>SG / STORY FRAGMENT</span><i>✦</i></span>
            </span>
            <span id={frontTextId} className="holo-card__copy">{children || <span>One detail, linked to a city story.</span>}</span>
            <span className="holo-card__footer"><span className="holo-card__serial">{serial}</span><span className="holo-card__flip-hint">Tap to flip <b aria-hidden="true">↗︎</b></span></span>
          </span>
          <SurfaceEffects/>
        </span>

        <span className="holo-card__face holo-card__back" aria-hidden={!flipped}>
          <span className="holo-card__paper holo-card__paper--back">
            <span className="holo-card__header"><span className="holo-card__brand">FindSG<span>.</span></span><span className="holo-card__edition">THE OTHER SIDE</span></span>
            <span className="holo-card__back-emblem" aria-hidden="true"><i/><i/><BrandMark className="holo-card__back-mark"/><small>WALK · NOTICE · REMEMBER</small></span>
            <span className="holo-card__subtitle">City story · back of the clue</span>
            <span className="holo-card__back-title">{backTitle || title}</span>
            <span id={backTextId} className="holo-card__back-copy">{backText || 'Keep this detail in your city story, and take it with you to the next one.'}</span>
            <span className="holo-card__back-rule" aria-hidden="true"><i/>✦<i/></span>
            <span className="holo-card__footer"><span className="holo-card__serial">{serial}</span><span className="holo-card__flip-hint">Flip back <b aria-hidden="true">↗︎</b></span></span>
          </span>
          <SurfaceEffects/>
        </span>
      </span>
    </span>
    {pulse > 0 && <span key={pulse} className="holo-card__confirmation" aria-hidden="true"/>}
  </button>;
}
