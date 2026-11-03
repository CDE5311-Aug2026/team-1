import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import './archive-stack.css';

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const materialNames = new Set(['letter', 'newspaper', 'film', 'brass']);
const visibleOrder = (selected, count) => Array.from({length: Math.min(4, count)}, (_, rank) => (selected + rank) % count);
const safeSelection = (value, count) => count ? clamp(Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0, 0, count - 1) : 0;

function dimensions(width, count, fillHeight = 0) {
  const available = Math.max(230, width || 540), visible = Math.min(4, Math.max(1, count));
  const narrow = available < 430, dx = narrow ? 12 : 26, dy = narrow ? 30 : 40, pad = narrow ? 12 : 22;
  const cardWidth = Math.min(440, Math.max(200, available - pad * 2 - dx * (visible - 1)));
  const left = Math.max(pad, (available - cardWidth - dx * (visible - 1)) / 2), top = 20 + dy * (visible - 1);
  // fill: the cards grow to the height the page gives the stack (the clue bag), within a card's proportions
  const cardHeight = fillHeight > 0 ? clamp(Math.round(fillHeight - top - 24), 200, Math.round(cardWidth * 1.45))
    : narrow ? 305 : Math.max(300, Math.round(cardWidth * .72 + 56));
  return {width: available, cardWidth, cardHeight, dx, dy, left, top, height: fillHeight > 0 ? Math.max(fillHeight, top + cardHeight + 24) : top + cardHeight + 45, visible};
}
function pose(rank, layout, overrides = {}) {
  return {x: layout.left + rank * layout.dx, y: layout.top - rank * layout.dy, z: -rank * 44, rotation: -1.7 + rank * .72, ...overrides};
}
const transformOf = p => `translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,${p.z.toFixed(2)}px) rotateZ(${p.rotation.toFixed(2)}deg)`;

function ArchivePreview({item, index, front, hasOpen, failed, onImageError}) {
  return <>
    <span className="archive-stack__tab"><b>{String(index + 1).padStart(2, '0')}</b><span>{item.eyebrow || item.tag || 'City file'}</span><i aria-hidden="true"/></span>
    <span className="archive-stack__paper">
      <span className="archive-stack__header"><span className="archive-stack__folio" aria-hidden="true">F<span>.</span></span><span className="archive-stack__heading"><strong>{item.title || 'City file'}</strong><small>{item.subtitle || 'FINDSG / FIELD ARCHIVE'}</small></span><span className="archive-stack__file-number">{String(index + 1).padStart(2, '0')}</span></span>
      <span className={'archive-stack__photo' + (item.imageCrop === 'triptych-left' ? ' is-triptych' : '')}>
        {item.image && !failed ? <img src={item.image} alt={item.imageAlt || (item.title || 'City file') + ' · story concept art'} draggable="false" loading="lazy" decoding="async" onError={onImageError}/> : <span className="archive-stack__photo-fallback" aria-hidden="true"><i/><b>F<span>.</span></b><small>A CITY FULL OF STORIES</small></span>}
        <span className="archive-stack__photo-shade" aria-hidden="true"/>
        <span className="archive-stack__photo-caption">{item.image ? 'Story concept art' : 'FINDSG / city memory'}</span>
        <i className="archive-stack__corner archive-stack__corner--a" aria-hidden="true"/><i className="archive-stack__corner archive-stack__corner--b" aria-hidden="true"/>
      </span>
      <span className="archive-stack__excerpt">{item.excerpt || 'Open this page and connect what you see to the city’s story.'}</span>
      <span className="archive-stack__footer"><span className="archive-stack__stamp">{item.tag || 'FIELD NOTES'}</span><span className="archive-stack__open-label">{front ? hasOpen ? 'Open file' : 'Current file' : 'Bring forward'}<b aria-hidden="true">↗︎</b></span></span>
      <span className="archive-stack__edge-foil" aria-hidden="true"/>
    </span>
    <span className="archive-stack__page-edge" aria-hidden="true"/>
  </>;
}

/** A controlled archive selector. Only four previews are mounted at once;
 * full reading belongs to the parent's dossier, not to scaled stack cards. */
export default function ArchiveStack({items = [], selectedIndex = 0, onChange, onOpen, reducedMotion = false, className = '', ariaLabel = 'File cards', fill = false}) {
  const data = Array.isArray(items) ? items : [], count = data.length, selected = safeSelection(selectedIndex, count);
  const itemKey = JSON.stringify(data.map((item, index) => [item?.id ?? index, index]));
  const root = useRef(null), stage = useRef(null), scene = useRef(null), ownerWindow = useRef(null), cards = useRef(new Map());
  const [width, setWidth] = useState(540), [fillHeight, setFillHeight] = useState(0), [systemReduced, setSystemReduced] = useState(false), [failedImages, setFailedImages] = useState({});
  const reduced = Boolean(reducedMotion || systemReduced), layout = dimensions(width, count, fill ? fillHeight : 0);
  const [presentation, setPresentation] = useState(() => ({selected, indices: visibleOrder(selected, count), departure: null, epoch: 0}));
  const current = useRef(null); current.current = {data, count, selected, onChange, onOpen, reduced, layout};
  const displayed = useRef(presentation); displayed.current = presentation;
  const previous = useRef({selected, itemKey}), pending = useRef({kind: 'intro', before: new Map(), direction: 1});
  const animations = useRef(new Set()), settleTimer = useRef(null), restoreTimer = useRef(null), raf = useRef(null), point = useRef(null), drag = useRef(null);
  const suppressClickUntil = useRef(0), requestDirection = useRef(null), busyUntil = useRef(0);
  const view = () => ownerWindow.current || root.current?.ownerDocument?.defaultView;
  const now = () => view()?.performance.now() || 0;

  function cancelFrame() {if (raf.current !== null) view()?.cancelAnimationFrame(raf.current); raf.current = null; point.current = null;}
  function cancelAnimations() {animations.current.forEach(animation => animation.cancel()); animations.current.clear();}
  function clearTimers() {if (settleTimer.current !== null) view()?.clearTimeout(settleTimer.current); if (restoreTimer.current !== null) view()?.clearTimeout(restoreTimer.current); settleTimer.current = restoreTimer.current = null;}
  function snapshot() {
    const result = new Map(), win = view();
    cards.current.forEach((node, index) => {const style = win?.getComputedStyle(node); result.set(index, {transform: style?.transform === 'none' ? node.style.transform : style?.transform || node.style.transform, opacity: style?.opacity || '1'});});
    return result;
  }
  function animate(node, frames, options) {
    if (!node?.animate || current.current.reduced || root.current?.ownerDocument.hidden) return;
    const animation = node.animate(frames, {fill: 'none', ...options}); animations.current.add(animation);
    animation.onfinish = () => animations.current.delete(animation); animation.oncancel = () => animations.current.delete(animation);
  }
  function returnFront() {
    const currentFrame = displayed.current, node = cards.current.get(currentFrame.selected);
    if (!node) return; const from = node.style.transform, to = transformOf(pose(0, current.current.layout)); node.style.transform = to;
    animate(node, [{transform: from}, {transform: to}], {duration: 280, easing: 'cubic-bezier(.2,.75,.25,1)'});
  }
  function resetParallax() {
    cancelFrame(); if (scene.current) {scene.current.style.setProperty('--archive-px', '0deg'); scene.current.style.setProperty('--archive-py', '0deg'); scene.current.dataset.active = 'false';}
  }

  useClientLayoutEffect(() => {
    const node = root.current; if (!node) return;
    const win = node.ownerDocument.defaultView; ownerWindow.current = win;
    // layout sizes, not getBoundingClientRect: a dialog opening in 3D would otherwise be measured mid-turn
    const measure = () => {const next = node.offsetWidth, tall = node.offsetHeight; if (next > 0) setWidth(old => Math.abs(old - next) > 1 ? next : old); if (fill && tall > 0) setFillHeight(old => Math.abs(old - tall) > 1 ? tall : old);};
    measure(); const observer = win.ResizeObserver ? new win.ResizeObserver(measure) : null; observer?.observe(node);
    if (!observer) win.addEventListener('resize', measure);
    const query = win.matchMedia?.('(prefers-reduced-motion: reduce)'), motion = () => setSystemReduced(Boolean(query?.matches)); motion(); query?.addEventListener?.('change', motion);
    const visibility = () => {if (node.ownerDocument.hidden) {cancelFrame(); cancelAnimations(); drag.current = null; resetParallax();}};
    node.ownerDocument.addEventListener('visibilitychange', visibility);
    return () => {cancelFrame(); cancelAnimations(); clearTimers(); drag.current = null; observer?.disconnect(); if (!observer) win.removeEventListener('resize', measure); query?.removeEventListener?.('change', motion); node.ownerDocument.removeEventListener('visibilitychange', visibility);};
  }, []);

  useClientLayoutEffect(() => {
    const old = previous.current; if (old.selected === selected && old.itemKey === itemKey) return;
    previous.current = {selected, itemKey};
    const before = snapshot(); cancelAnimations(); clearTimers(); drag.current = null;
    const full = visibleOrder(selected, count), departure = old.itemKey === itemKey && displayed.current.selected !== selected ? displayed.current.selected : null;
    let indices = full;
    if (!reduced && departure !== null && departure >= 0 && departure < count && !full.includes(departure) && full.length === 4) indices = [...full.slice(0, 3), departure];
    const direction = requestDirection.current?.index === selected ? requestDirection.current.direction : selected >= old.selected ? 1 : -1;
    requestDirection.current = null;
    pending.current = {kind: reduced ? 'static' : 'swap', before, direction, departure};
    const epoch = displayed.current.epoch + 1;
    setPresentation({selected, indices, departure: reduced ? null : departure, epoch});
    if (!reduced && departure !== null) {
      settleTimer.current = view()?.setTimeout(() => {
        settleTimer.current = null; if (current.current.selected !== selected) return;
        pending.current = {kind: 'settle', before: snapshot(), direction}; cancelAnimations();
        setPresentation({selected, indices: visibleOrder(selected, current.current.count), departure: null, epoch: epoch + 1});
      }, 710);
    }
  }, [selected, itemKey, count, reduced]);

  useClientLayoutEffect(() => {
    const plan = pending.current, full = visibleOrder(presentation.selected, count);
    cancelAnimations();
    cards.current.forEach((node, index) => {
      const rank = full.indexOf(index), realRank = rank < 0 ? 4 : rank, destination = pose(realRank, layout), to = transformOf(destination);
      node.style.transform = to; node.style.opacity = rank < 0 ? '0' : '1'; node.style.zIndex = String(30 - realRank);
      if (reduced || !plan || plan.kind === 'static') return;
      const old = plan.before?.get(index), isDeparture = index === presentation.departure && plan.kind === 'swap';
      if (isDeparture) {
        const from = old?.transform || transformOf(pose(0, layout));
        const pulled = transformOf(pose(0, layout, {x: layout.left + plan.direction * layout.cardWidth * .48, y: layout.top + 55, z: 90, rotation: plan.direction * 10}));
        const under = transformOf({...destination, x: destination.x + plan.direction * layout.cardWidth * .45, y: destination.y + 48, z: destination.z - 20, rotation: plan.direction * 6});
        animate(node, [{transform: from, opacity: 1, zIndex: 60, offset: 0}, {transform: pulled, opacity: 1, zIndex: 60, offset: .36}, {transform: under, opacity: rank < 0 ? 0 : .85, zIndex: 5, offset: .68}, {transform: to, opacity: rank < 0 ? 0 : 1, zIndex: 30 - realRank, offset: 1}], {duration: 660, easing: 'cubic-bezier(.22,.68,.3,1)'});
      } else if (plan.kind !== 'settle' || !old) {
        const from = old?.transform || transformOf({...destination, y: destination.y + (rank === 0 ? 45 : 15), z: destination.z + (rank === 0 ? 55 : -12), rotation: destination.rotation - 2});
        animate(node, [{transform: from, opacity: old ? Number(old.opacity) : 0}, {transform: to, opacity: 1}], {duration: plan.kind === 'intro' ? 430 : 510, delay: Math.max(0, rank) * 24, easing: 'cubic-bezier(.18,.77,.24,1)'});
      }
    });
    busyUntil.current = reduced ? 0 : now() + (plan?.kind === 'swap' ? 650 : 430);
    pending.current = null;
  }, [presentation, width, fillHeight, count, reduced]);

  function request(index, direction = 1) {
    const c = current.current; if (!c.count || typeof c.onChange !== 'function') {returnFront(); return;}
    const target = ((index % c.count) + c.count) % c.count;
    if (target === c.selected) {returnFront(); return;}
    requestDirection.current = {index: target, direction}; c.onChange(target);
    // A controlled parent may decline selection. Restore a dragged card rather
    // than keeping it stranded outside the stack while waiting for a prop.
    if (restoreTimer.current !== null) view()?.clearTimeout(restoreTimer.current);
    restoreTimer.current = view()?.setTimeout(() => {restoreTimer.current = null; if (current.current.selected !== target) returnFront();}, 150);
  }
  function open(index, event) {
    if (event?.detail !== 0 && now() < suppressClickUntil.current) {event?.preventDefault(); return;}
    const c = current.current;
    if (index !== c.selected) request(index, 1);
    else if (typeof c.onOpen === 'function') c.onOpen(index);
    else c.onChange?.(index);
  }
  function track(event) {
    if (!stage.current) return;
    const rect = stage.current.getBoundingClientRect();
    point.current = {x: clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1), y: clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1)};
    if (raf.current !== null) return;
    raf.current = view()?.requestAnimationFrame(() => {
      raf.current = null; const p = point.current; point.current = null;
      if (p && scene.current && !current.current.reduced) {
        scene.current.style.setProperty('--archive-px', `${((.5 - p.y) * 4.2).toFixed(2)}deg`); scene.current.style.setProperty('--archive-py', `${((p.x - .5) * 6.5).toFixed(2)}deg`);
        scene.current.style.setProperty('--archive-light-x', `${(p.x * 100).toFixed(1)}%`); scene.current.style.setProperty('--archive-light-y', `${(p.y * 100).toFixed(1)}%`); scene.current.dataset.active = 'true';
      }
      const gesture = drag.current;
      if (gesture?.horizontal && !current.current.reduced) {
        const node = cards.current.get(gesture.index), base = pose(0, current.current.layout);
        if (node) node.style.transform = transformOf({...base, x: base.x + gesture.dx * .76, y: base.y + Math.abs(gesture.dx) * .055, z: 28, rotation: base.rotation + clamp(gesture.dx * .025, -7, 7)});
      }
    });
  }
  function down(event) {
    if (event.button > 0 || current.current.count < 2 || now() < busyUntil.current) return;
    const card = event.target.closest?.('[data-archive-card]'); if (!card || Number(card.dataset.archiveCard) !== current.current.selected) return;
    drag.current = {id: event.pointerId, index: current.current.selected, x: event.clientX, y: event.clientY, dx: 0, dy: 0, horizontal: false, vertical: false, started: now()};
  }
  function move(event) {
    const gesture = drag.current;
    if (gesture?.id === event.pointerId) {
      gesture.dx = event.clientX - gesture.x; gesture.dy = event.clientY - gesture.y;
      if (!gesture.horizontal && !gesture.vertical && Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > 9) {
        gesture.horizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15; gesture.vertical = !gesture.horizontal;
        if (gesture.horizontal) try {stage.current.setPointerCapture(event.pointerId);} catch {}
      }
      if (gesture.horizontal) event.preventDefault();
    }
    if (event.pointerType === 'mouse' || event.pointerType === 'pen' || gesture?.id === event.pointerId) track(event);
  }
  function release(event, cancelled = false) {
    const gesture = drag.current; if (!gesture || gesture.id !== event.pointerId) return;
    drag.current = null;
    try {if (stage.current?.hasPointerCapture(event.pointerId)) stage.current.releasePointerCapture(event.pointerId);} catch {}
    if (cancelled || gesture.horizontal || gesture.vertical || Math.hypot(gesture.dx, gesture.dy) > 9) suppressClickUntil.current = now() + 500;
    if (gesture.horizontal) {
      const threshold = Math.min(72, current.current.layout.cardWidth * .19), speed = Math.abs(gesture.dx) / Math.max(1, now() - gesture.started);
      if (!cancelled && (Math.abs(gesture.dx) >= threshold || Math.abs(gesture.dx) > 26 && speed > .65)) request(current.current.selected + (gesture.dx < 0 ? 1 : -1), gesture.dx < 0 ? 1 : -1);
      else returnFront();
    }
    if (event.pointerType !== 'mouse' || cancelled) resetParallax();
  }
  function key(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {event.preventDefault(); request(selected + 1, 1);}
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {event.preventDefault(); request(selected - 1, -1);}
    else if (event.key === 'Home') {event.preventDefault(); request(0, -1);}
    else if (event.key === 'End') {event.preventDefault(); request(count - 1, 1);}
    else if ((event.key === 'Enter' || event.key === ' ') && event.target === root.current && count) {event.preventDefault(); open(selected, {detail: 0});}
  }

  const currentOrder = visibleOrder(presentation.selected, count), indices = presentation.indices.filter(index => index >= 0 && index < count);
  const canChange = count > 1 && typeof onChange === 'function';
  const style = {'--archive-card-w': `${layout.cardWidth}px`, '--archive-card-h': `${layout.cardHeight}px`, '--archive-stage-h': `${count ? layout.height : 270}px`, '--archive-origin-x': `${layout.left + layout.cardWidth / 2}px`, '--archive-origin-y': `${layout.top + layout.cardHeight / 2}px`, '--archive-folder-x': `${layout.left - 23}px`, '--archive-folder-y': `${layout.top + 5}px`};
  return <section ref={root} className={['archive-stack', fill ? 'archive-stack--fill' : '', className].filter(Boolean).join(' ')} style={style} data-reduced-motion={reduced ? 'true' : 'false'} data-count={count} role="region" aria-roledescription="card carousel" aria-label={ariaLabel} tabIndex={count ? 0 : -1} onKeyDown={key}>
    <div className="archive-stack__masthead"><span>FINDSG / FIELD ARCHIVE</span><span>{count ? String(selected + 1).padStart(2, '0') : '00'} <i>/</i> {String(count).padStart(2, '0')}</span></div>
    <div ref={stage} className="archive-stack__stage" onPointerDown={down} onPointerMove={move} onPointerUp={event => release(event)} onPointerCancel={event => release(event, true)} onLostPointerCapture={event => release(event, true)} onPointerLeave={() => {if (!drag.current?.horizontal) resetParallax();}}>
      <div className="archive-stack__ground" aria-hidden="true"/>
      <div ref={scene} className="archive-stack__scene">
        <div className="archive-stack__folder" aria-hidden="true"><span className="archive-stack__folder-tab">CITY STORIES</span><span className="archive-stack__folder-label"><b>FindSG.</b><span>FIELD NOTES<br/>PLACES · PEOPLE · MEMORY</span></span><span className="archive-stack__folder-stamp">SG<br/><small>ARCHIVE</small></span></div>
        {indices.map(index => {
          const item = data[index] || {}, rank = currentOrder.indexOf(index), front = index === presentation.selected, material = materialNames.has(item.material) ? item.material : 'letter';
          return <button key={`${item.id ?? 'archive'}:${index}`} ref={node => {if (node) cards.current.set(index, node); else cards.current.delete(index);}} type="button" className={'archive-stack__card material-' + material + (front ? ' is-front' : '')} style={{transform: transformOf(pose(rank < 0 ? 4 : rank, layout)), zIndex: 30 - (rank < 0 ? 4 : rank)}} data-archive-card={index} data-front={front ? 'true' : 'false'} aria-label={(front && onOpen ? 'Open file: ' : 'Select file: ') + (item.title || `Card ${index + 1}`)} aria-pressed={index === selected} tabIndex={front ? 0 : -1} onClick={event => open(index, event)}>
            <ArchivePreview item={item} index={index} front={front} hasOpen={typeof onOpen === 'function'} failed={Boolean(failedImages[index]?.failed && failedImages[index]?.src === item.image)} onImageError={() => setFailedImages(value => value[index]?.failed && value[index]?.src === item.image ? value : {...value, [index]: {src: item.image, failed: true}})}/>
          </button>;
        })}
      </div>
      {!count && <div className="archive-stack__empty"><span>FINDSG / nothing filed</span><h3>No file cards here yet</h3><p>Collect a discovery in the city, then come back to read it.</p></div>}
    </div>
    {count > 0 && <>
      <div className="archive-stack__navigation"><button type="button" className="archive-stack__nav-arrow" disabled={!canChange} aria-label="Previous file" onClick={() => request(selected - 1, -1)}><span aria-hidden="true">←</span></button><div className="archive-stack__index" role="group" aria-label="File card index">{data.map((item, index) => <button key={`${item?.id ?? 'index'}:${index}`} type="button" aria-label={`Select file ${index + 1}: ${item?.title || 'City file'}`} aria-pressed={index === selected} onClick={() => request(index, index >= selected ? 1 : -1)}><span>{String(index + 1).padStart(2, '0')}</span></button>)}</div><button type="button" className="archive-stack__nav-arrow" disabled={!canChange} aria-label="Next file" onClick={() => request(selected + 1, 1)}><span aria-hidden="true">→</span></button></div>
      <p className="archive-stack__instruction">{count > 1 ? 'Swipe left or right to turn the page' : 'One filed city memory'}<span>·</span>{onOpen ? 'Tap the front card to open it' : 'Tap a tab to choose a card'}</p>
      <span className="archive-stack__live" role="status" aria-live="polite" aria-atomic="true">Card {selected + 1} of {count}: {data[selected]?.title || 'City file'}</span>
    </>}
  </section>;
}
