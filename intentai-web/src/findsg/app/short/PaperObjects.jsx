import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import TearTicket from '../game/TearTicket.jsx';
import BrandMark from '../components/BrandMark.jsx';
import './paper-objects.css';

const clamp = value => Math.max(0, Math.min(1, value));

function useReducedMotion(value) {
  const [system, setSystem] = useState(false);
  useEffect(() => {
    const query = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
    const update = () => setSystem(Boolean(query?.matches));
    update(); query?.addEventListener?.('change', update);
    return () => query?.removeEventListener?.('change', update);
  }, []);
  return Boolean(value || system);
}

// A finite animation, rather than a permanent ticker. Pointer movement paints
// CSS geometry directly; React only owns meaningful opening/page checkpoints.
function usePaperMotion(root, initial, reduced) {
  const values = useRef({ ...initial }), animation = useRef(null), mounted = useRef(false), settings = useRef({ reduced });
  const [busy, setBusy] = useState(false);
  settings.current.reduced = reduced;
  const paint = useCallback(patch => {
    Object.assign(values.current, patch);
    const node = root.current;
    if (node) for (const [key, value] of Object.entries(values.current)) node.style.setProperty(`--po-${key}`, String(value));
  }, [root]);
  const stop = useCallback((update = true) => {
    const active = animation.current; animation.current = null;
    if (active?.frame != null) active.view.cancelAnimationFrame(active.frame);
    if (update && mounted.current) setBusy(false);
  }, []);
  const animate = useCallback((to, done, duration = 620) => {
    stop(false);
    const view = root.current?.ownerDocument?.defaultView;
    if (!mounted.current) return false;
    if (settings.current.reduced || !view?.requestAnimationFrame) {
      paint(to); setBusy(false); done?.(); return true;
    }
    const from = Object.fromEntries(Object.keys(to).map(key => [key, values.current[key] || 0]));
    const active = { to, done, from, view, frame: null, start: null, duration };
    animation.current = active; setBusy(true);
    const frame = time => {
      if (!mounted.current || animation.current !== active) return;
      if (active.start === null) active.start = time;
      const t = clamp((time - active.start) / active.duration), eased = 1 - (1 - t) ** 3;
      paint(Object.fromEntries(Object.keys(to).map(key => [key, from[key] + (to[key] - from[key]) * eased])));
      if (t < 1) active.frame = view.requestAnimationFrame(frame);
      else { animation.current = null; paint(to); setBusy(false); done?.(); }
    };
    active.frame = view.requestAnimationFrame(frame);
    return true;
  }, [paint, root, stop]);
  useEffect(() => {
    mounted.current = true; paint({});
    return () => { mounted.current = false; stop(false); };
  }, [paint, stop]);
  useEffect(() => {
    const active = animation.current;
    if (reduced && active) { stop(); paint(active.to); active.done?.(); }
  }, [reduced, stop, paint]);
  return { paint, animate, stop, busy, isBusy: () => animation.current !== null };
}

function usePullGesture(config) {
  const latest = useRef(config), pointer = useRef(null);
  latest.current = config;
  const release = useCallback(() => {
    const active = pointer.current; pointer.current = null;
    if (active) try { if (active.node.hasPointerCapture?.(active.id)) active.node.releasePointerCapture(active.id); } catch {}
    return active;
  }, []);
  const cancel = useCallback(() => { if (release()) latest.current.onCancel?.(); }, [release]);
  useEffect(() => () => { release(); }, [release]);
  const handlers = {
    onPointerDown(event) {
      const cfg = latest.current;
      if (cfg.disabled || pointer.current || event.button !== 0 || cfg.canStart?.() === false) return;
      event.preventDefault();
      const node = event.currentTarget;
      pointer.current = { id: event.pointerId, node, x: event.clientX, y: event.clientY, progress: 0 };
      node.focus?.({ preventScroll: true });
      try { node.setPointerCapture?.(event.pointerId); } catch {}
      cfg.onStart?.();
    },
    onPointerMove(event) {
      const active = pointer.current, cfg = latest.current;
      if (!active || active.id !== event.pointerId) return;
      event.preventDefault();
      const distance = typeof cfg.distance === 'function' ? cfg.distance(active.node) : cfg.distance || 110;
      const delta = cfg.axis === 'x' ? event.clientX - active.x : event.clientY - active.y;
      active.progress = clamp(delta * (cfg.direction || 1) / Math.max(35, distance));
      cfg.onProgress?.(active.progress);
    },
    onPointerUp(event) {
      const active = pointer.current;
      if (!active || active.id !== event.pointerId) return;
      const progress = active.progress; release();
      if (progress >= (latest.current.threshold ?? .42)) latest.current.onCommit?.();
      else latest.current.onCancel?.();
    },
    onPointerCancel(event) { if (pointer.current?.id === event.pointerId) cancel(); },
    onLostPointerCapture(event) { if (pointer.current?.id === event.pointerId) cancel(); },
    onPointerLeave(event) { if (pointer.current?.id === event.pointerId && !event.currentTarget.hasPointerCapture?.(event.pointerId)) cancel(); },
    onKeyDown(event) { if (event.key === 'Escape' && pointer.current) { event.preventDefault(); cancel(); } },
    onClick(event) { if (event.detail === 0 && !latest.current.disabled) latest.current.onCommit?.(); },
    onDragStart(event) { event.preventDefault(); }
  };
  return { handlers, release, cancel };
}

function useOpening(initialOpen, onOpen) {
  const [opened, setOpened] = useState(Boolean(initialOpen)), reported = useRef(Boolean(initialOpen)), callback = useRef(onOpen);
  callback.current = onOpen;
  const finish = useCallback(() => {
    setOpened(true);
    if (!reported.current) { reported.current = true; callback.current?.(); }
  }, []);
  return { opened, finish, close: () => setOpened(false) };
}

function usePaperFocus(root, busy, opened, stage = '') {
  const pending = useRef(false);
  useEffect(() => {
    if (!pending.current || busy) return;
    pending.current = false;
    const selector = opened ? '.po-book-reader, .po-open-content, .po-replay' : '.po-direct';
    root.current?.querySelector(selector)?.focus?.({ preventScroll: true });
  }, [root, busy, opened, stage]);
  return () => { pending.current = true; };
}

function PaperFrame({ kind, title, subtitle, folio, root, reduced, opened, children, className = '', style }) {
  const id = useId();
  return <section ref={root} className={`paper-object po-kind-${kind}${opened ? ' is-open' : ''}${className ? ` ${className}` : ''}`} data-reduced-motion={reduced ? 'true' : 'false'} data-open={opened ? 'true' : 'false'} aria-labelledby={`${id}-title`} style={style}>
    <header className="po-heading"><div><span className="po-eyebrow">FINDSG / STORY OBJECT</span><h3 id={`${id}-title`}>{title}</h3>{subtitle && <p>{subtitle}</p>}</div><span className="po-folio">{folio}</span></header>
    {children}
  </section>;
}

function ActionRow({ label, hint, onAction, busy, opened, onReplay }) {
  return <div className="po-actions">
    {!opened ? <><button type="button" className="po-direct" disabled={busy} onClick={onAction}><span>{busy ? 'Unfolding the paper…' : label}</span><span aria-hidden="true">↗︎</span></button><p>{hint}</p></> : <button type="button" className="po-replay" disabled={busy} onClick={onReplay}>Watch it open again <span aria-hidden="true">↶</span></button>}
  </div>;
}

function OpenContent({ children, label = 'Contents' }) {
  return children == null ? null : <section className="po-open-content" aria-label={label} tabIndex={-1}>{children}</section>;
}

function EnvelopeObject({ title = 'A letter from the archivist', subtitle, children, reducedMotion, onOpen, initialOpen, folio }) {
  const root = useRef(null), reduced = useReducedMotion(reducedMotion), open = useOpening(initialOpen, onOpen);
  const [step, setStep] = useState(initialOpen ? 'open' : 'flap');
  const motion = usePaperMotion(root, { flap: initialOpen ? 1 : 0, sheet: initialOpen ? 1 : 0 }, reduced);
  const focusAfter = usePaperFocus(root, motion.busy, open.opened, step);
  function commit() {
    if (motion.isBusy() || open.opened) return;
    pull.release(); focusAfter();
    if (step === 'flap') motion.animate({ flap: 1 }, () => setStep('sheet'), 650);
    else motion.animate({ sheet: 1 }, () => { setStep('open'); open.finish(); }, 700);
  }
  const pull = usePullGesture({ axis: 'y', direction: -1, distance: step === 'flap' ? 95 : 140, threshold: .42, disabled: motion.busy || open.opened, canStart: () => !motion.isBusy(), onProgress: value => motion.paint(step === 'flap' ? { flap: value } : { sheet: value }), onCommit: commit, onCancel: () => motion.animate(step === 'flap' ? { flap: 0 } : { sheet: 0 }, null, 360) });
  function replay() { pull.release(); focusAfter(); open.close(); setStep('flap'); motion.animate({ flap: 0, sheet: 0 }, null, 500); }
  return <PaperFrame kind="envelope" root={root} title={title} subtitle={subtitle} folio={folio} reduced={reduced} opened={open.opened} style={{ '--po-flap': initialOpen ? 1 : 0, '--po-sheet': initialOpen ? 1 : 0 }}>
    <div className="po-scene po-envelope-scene" data-step={step}>
      <span className="po-scene-corner" aria-hidden="true">CORRESPONDENCE / 01</span>
      <div className="po-envelope">
        <div className="po-envelope-back" aria-hidden="true"/>
        <div className="po-envelope-letter">
          <div className="po-letter-print" aria-hidden="true"><span>FINDSG / FIELD ARCHIVE</span><strong>{title}</strong><i/><i/><i/><small>{folio}</small></div>
          {step === 'sheet' && <button type="button" className="po-drag-handle po-letter-tab" aria-label="Pull the letter up, or press Enter" disabled={motion.busy} {...pull.handlers}><span aria-hidden="true">↑</span>Pull out the letter</button>}
        </div>
        <div className="po-envelope-left" aria-hidden="true"/><div className="po-envelope-right" aria-hidden="true"/><div className="po-envelope-bottom" aria-hidden="true"><span>TO THE CURIOUS</span><strong>For anyone willing to read this city</strong><small>{folio}</small><i className="po-envelope-stamp"><BrandMark className="po-stamp-mark"/><span className="po-stamp-caption">SG</span></i></div>
        <div className="po-envelope-flap">
          <div className="po-flap-front" aria-hidden="true"><span>FIELD LETTER</span><i/></div><div className="po-flap-back" aria-hidden="true"/>
          {step === 'flap' && <button type="button" className="po-drag-handle po-flap-grip" aria-label="Lift the triangular flap, or press Enter" disabled={motion.busy} {...pull.handlers}><span>Lift the flap</span><b aria-hidden="true">↑</b></button>}
        </div>
      </div>
      <span className="po-scene-note" aria-hidden="true">{step === 'flap' ? '01 / LIFT THE FLAP' : step === 'sheet' ? '02 / PULL THE LETTER' : 'THE LETTER IS OPEN'}</span>
    </div>
    <p className="po-status" role="status">{step === 'flap' ? 'Lift the triangular flap first.' : step === 'sheet' ? 'The flap is open. Pinch the paper edge and pull it up.' : 'The letter is open.'}</p>
    {open.opened && <OpenContent label="Letter">{children}</OpenContent>}
    <ActionRow label={step === 'flap' ? 'Lift the envelope flap' : 'Pull the letter up'} hint="Hold the paper edge and pull up. A short pull springs back; you can also use the button." onAction={commit} busy={motion.busy} opened={open.opened} onReplay={replay}/>
  </PaperFrame>;
}

export function FieldBook({ pages = [], title = 'Neighbourhood notebook', subtitle, folio = 'KG / 01', reducedMotion = false, onOpen, initialOpen = false, onPageChange, onFinish }) {
  const sheets = useMemo(() => Array.isArray(pages) ? pages.filter(page => page && typeof page === 'object') : [], [pages]);
  const root = useRef(null), reduced = useReducedMotion(reducedMotion), open = useOpening(initialOpen, onOpen);
  const motion = usePaperMotion(root, { cover: initialOpen ? 1 : 0, page: 0 }, reduced);
  const [pageIndex, setPageIndex] = useState(0), [turning, setTurning] = useState(false), [turnTarget, setTurnTarget] = useState(0), [direction, setDirection] = useState(1), [cycle, setCycle] = useState(0);
  const callbacks = useRef({ onPageChange, onFinish }), lastPage = useRef(''), finished = useRef(false), pageDrag = useRef(0);
  const focusAfter = usePaperFocus(root, motion.busy, open.opened);
  callbacks.current = { onPageChange, onFinish };
  const index = Math.min(pageIndex, Math.max(0, sheets.length - 1)), page = sheets[index] || { label: 'FIELD NOTES', title: 'This page is kept for a new find', body: '' };
  const nextPage = sheets[turnTarget] || page;
  useEffect(() => {
    if (!open.opened || !sheets.length) return;
    const signature = `${cycle}:${index}`;
    if (lastPage.current === signature) return;
    lastPage.current = signature; callbacks.current.onPageChange?.(index);
    if (index === sheets.length - 1 && !finished.current) { finished.current = true; callbacks.current.onFinish?.(); }
  }, [open.opened, index, cycle, sheets.length]);

  function openCover() { if (motion.isBusy() || open.opened) return; coverPull.release(); focusAfter(); motion.animate({ cover: 1 }, open.finish, 820); }
  const coverPull = usePullGesture({ axis: 'x', direction: -1, distance: node => Math.max(100, node.getBoundingClientRect().width * .9), disabled: motion.busy || open.opened, canStart: () => !motion.isBusy(), onProgress: value => motion.paint({ cover: value }), onCommit: openCover, onCancel: () => motion.animate({ cover: 0 }, null, 430) });
  function startPage(delta) {
    const target = index + delta;
    if (!open.opened || motion.isBusy() || target < 0 || target >= sheets.length) return false;
    pageDrag.current = delta; setDirection(delta); setTurnTarget(target); setTurning(true); motion.paint({ page: 0 }); return true;
  }
  function finishPage(delta) {
    const target = index + delta;
    if (!open.opened || motion.isBusy() || target < 0 || target >= sheets.length) return;
    nextPull.release(); previousPull.release(); pageDrag.current = 0;
    setDirection(delta); setTurnTarget(target); setTurning(true);
    motion.animate({ page: 1 }, () => { setPageIndex(target); setTurning(false); motion.paint({ page: 0 }); }, 700);
  }
  const pageGesture = delta => ({ axis: 'x', direction: -delta, distance: node => Math.max(90, node.closest('.po-book')?.getBoundingClientRect().width || 130), disabled: !open.opened || motion.busy || index + delta < 0 || index + delta >= sheets.length, canStart: () => !motion.isBusy() && pageDrag.current === 0, onStart: () => startPage(delta), onProgress: value => motion.paint({ page: value }), onCommit: () => finishPage(delta), onCancel: () => { pageDrag.current = 0; motion.animate({ page: 0 }, () => setTurning(false), 400); } });
  const nextPull = usePullGesture(pageGesture(1)), previousPull = usePullGesture(pageGesture(-1));
  function replay() { coverPull.release(); nextPull.release(); previousPull.release(); pageDrag.current = 0; focusAfter(); open.close(); setTurning(false); setPageIndex(0); setCycle(value => value + 1); motion.animate({ cover: 0, page: 0 }, null, 640); }

  return <PaperFrame kind="book" root={root} title={title} subtitle={subtitle} folio={folio} reduced={reduced} opened={open.opened} style={{ '--po-cover': initialOpen ? 1 : 0, '--po-page': 0 }}>
    <div className="po-scene po-book-scene" data-turning={turning ? 'true' : 'false'}>
      <span className="po-scene-corner" aria-hidden="true">FIELD EDITION / {String(Math.max(1, sheets.length)).padStart(2, '0')} LEAVES</span>
      <div className="po-book">
        <div className="po-book-board" aria-hidden="true"/><div className="po-book-thickness" aria-hidden="true"/>
        <div className="po-book-page" aria-hidden="true"><span>{(turning && direction > 0 ? nextPage : page).label || 'FIELD NOTE'}</span><strong>{(turning && direction > 0 ? nextPage : page).title}</strong><i/><i/><i/><small>{String((turning && direction > 0 ? turnTarget : index) + 1).padStart(2, '0')}</small></div>
        {turning && <div className={`po-turn-sheet${direction < 0 ? ' is-backward' : ''}`} aria-hidden="true"><div className="po-turn-front"><span>{(direction < 0 ? nextPage : page).label}</span><strong>{(direction < 0 ? nextPage : page).title}</strong><i/><i/><i/></div><div className="po-turn-back"><span>{(direction < 0 ? page : nextPage).label}</span><strong>{(direction < 0 ? page : nextPage).title}</strong><i/><i/></div></div>}
        <div className="po-book-cover"><div className="po-cover-front" aria-hidden="true"><span>FINDSG / FIELD EDITION</span><strong>{title}</strong><i/><small>{folio}</small><BrandMark className="po-cover-emblem"/></div><div className="po-cover-back" aria-hidden="true"><span>There are many ways<br/>to read a city</span><i/><small>FINDSG / STORY PROP</small></div>{!open.opened && <button type="button" className="po-drag-handle po-cover-grip" disabled={motion.busy} aria-label="Lift the cover from right to left, or press Enter" {...coverPull.handlers}><span>Open to the left</span><b aria-hidden="true">←</b></button>}</div>
        {open.opened && index < sheets.length - 1 && <button type="button" className="po-drag-handle po-page-grip po-page-grip-next" disabled={motion.busy} aria-label="Pinch the lower right corner to turn to the next page, or press Enter" {...nextPull.handlers}><span aria-hidden="true">↖︎</span></button>}
        {open.opened && index > 0 && <button type="button" className="po-drag-handle po-page-grip po-page-grip-previous" disabled={motion.busy} aria-label="Pinch the lower left corner to turn back a page, or press Enter" {...previousPull.handlers}><span aria-hidden="true">↗︎</span></button>}
      </div>
      <span className="po-scene-note" aria-hidden="true">{open.opened ? `LEAF ${String(index + 1).padStart(2, '0')} / ${String(Math.max(1, sheets.length)).padStart(2, '0')}` : 'OPEN FROM THE FORE EDGE'}</span>
    </div>
    {open.opened ? <>
      <article className="po-book-reader" tabIndex={-1} aria-live="polite" aria-busy={turning || undefined}><span className="po-reader-folio">{page.label || 'FIELD NOTES'} <b>{index + 1} / {Math.max(1, sheets.length)}</b></span><h4>{page.title}</h4><div className="po-reader-body">{typeof page.body === 'string' ? <p>{page.body}</p> : page.body}</div></article>
      {sheets.length > 1 && <nav className="po-page-controls" aria-label="Turn the pages"><button type="button" disabled={motion.busy || index === 0} onClick={() => finishPage(-1)}>← Previous</button><span>{index + 1} / {sheets.length}</span><button type="button" disabled={motion.busy || index === sheets.length - 1} onClick={() => finishPage(1)}>Next →</button></nav>}
      <p className="po-page-hint">{sheets.length > 1 ? 'Pinch a lower page corner to turn, or use the buttons.' : 'The cover is open. Take your time with this page.'}</p>
    </> : <p className="po-status" role="status">The cloth cover opens from right to left. The pages are inside.</p>}
    <ActionRow label="Open the book from right to left" hint="Hold the right side of the cover and pull left. A short pull springs back." onAction={openCover} busy={motion.busy} opened={open.opened} onReplay={replay}/>
  </PaperFrame>;
}

function ParcelObject({ title = 'A parcel waiting to be opened', subtitle, children, reducedMotion, onOpen, initialOpen, folio }) {
  const root = useRef(null), reduced = useReducedMotion(reducedMotion), open = useOpening(initialOpen, onOpen);
  const [step, setStep] = useState(initialOpen ? 'open' : 'band');
  const motion = usePaperMotion(root, { band: initialOpen ? 1 : 0, left: initialOpen ? 1 : 0, right: initialOpen ? 1 : 0 }, reduced);
  const focusAfter = usePaperFocus(root, motion.busy, open.opened, step);
  const labels = { band: 'Pull the band up', left: 'Unfold the left side', right: 'Unfold the right side', open: 'Unwrapped' };
  function commit() {
    if (motion.isBusy() || open.opened) return;
    pull.release(); focusAfter();
    motion.animate({ [step]: 1 }, () => {
      if (step === 'band') setStep('left');
      else if (step === 'left') setStep('right');
      else { setStep('open'); open.finish(); }
    }, step === 'band' ? 700 : 650);
  }
  const pull = usePullGesture({ axis: step === 'band' ? 'y' : 'x', direction: step === 'right' ? 1 : -1, distance: step === 'band' ? 120 : 105, disabled: motion.busy || open.opened, canStart: () => !motion.isBusy(), onProgress: value => motion.paint({ [step]: value }), onCommit: commit, onCancel: () => motion.animate({ [step]: 0 }, null, 370) });
  function replay() { pull.release(); focusAfter(); open.close(); setStep('band'); motion.animate({ band: 0, left: 0, right: 0 }, null, 600); }
  return <PaperFrame kind="parcel" root={root} title={title} subtitle={subtitle} folio={folio} reduced={reduced} opened={open.opened} style={{ '--po-band': initialOpen ? 1 : 0, '--po-left': initialOpen ? 1 : 0, '--po-right': initialOpen ? 1 : 0 }}>
    <div className="po-scene po-parcel-scene" data-step={step}><span className="po-scene-corner" aria-hidden="true">CAREFULLY WRAPPED / FIELD OBJECT</span>
      <div className="po-parcel">
        <div className="po-parcel-base" aria-hidden="true"/>
        <div className="po-parcel-keepsake" aria-hidden="true"><span>{folio}</span><i className="po-bottle"><b/><em><BrandMark/></em></i><small>FIELD FIND</small></div>
        <div className="po-parcel-wing po-parcel-wing-left"><div className="po-wrap-front" aria-hidden="true"><span>FINDSG</span><strong>Street<br/>keepsake</strong><i/></div><div className="po-wrap-back" aria-hidden="true"/>{step === 'left' && <button type="button" className="po-drag-handle po-wrap-grip" aria-label="Unfold the left wrapping, or press Enter" disabled={motion.busy} {...pull.handlers}><span aria-hidden="true">←</span>Unfold left</button>}</div>
        <div className="po-parcel-wing po-parcel-wing-right"><div className="po-wrap-front" aria-hidden="true"><span>HANDLE<br/>WITH CARE</span><strong>{folio}</strong><i/></div><div className="po-wrap-back" aria-hidden="true"/>{step === 'right' && <button type="button" className="po-drag-handle po-wrap-grip" aria-label="Unfold the right wrapping, or press Enter" disabled={motion.busy} {...pull.handlers}><span aria-hidden="true">→</span>Unfold right</button>}</div>
        <div className="po-parcel-band"><div className="po-band-print" aria-hidden="true"><span className="po-band-label">ARCHIVE</span><BrandMark className="po-band-emblem"/><small>OPEN HERE</small></div>{step === 'band' && <button type="button" className="po-drag-handle po-band-grip" aria-label="Pinch the band and pull it up, or press Enter" disabled={motion.busy} {...pull.handlers}><span aria-hidden="true">↑</span><small>Pull</small></button>}</div>
      </div><span className="po-scene-note" aria-hidden="true">{step === 'band' ? '01 / SLIDE OFF THE BAND' : step === 'left' ? '02 / UNFOLD THE LEFT' : step === 'right' ? '03 / UNFOLD THE RIGHT' : 'A SMALL OBJECT, A NEW CLUE'}</span>
    </div>
    <p className="po-status" role="status">{step === 'band' ? 'First pull off the band around the parcel.' : step === 'left' ? 'The band is loose. Unfold the left side of the kraft paper.' : step === 'right' ? 'Now fold back the right side to see what is inside.' : 'The parcel is fully open.'}</p>
    {open.opened && <OpenContent label="Inside the parcel">{children}</OpenContent>}
    <ActionRow label={labels[step]} hint={step === 'band' ? 'Hold the centre band and pull up. A short pull springs back.' : 'Hold the paper edge and unfold it outward, or use the button.'} onAction={commit} busy={motion.busy} opened={open.opened} onReplay={replay}/>
  </PaperFrame>;
}

function TearObject({ title = 'A ticket waiting for the road', subtitle, children, reducedMotion, onOpen, initialOpen, folio }) {
  const root = useRef(null), ticket = useRef(null), reduced = useReducedMotion(reducedMotion), open = useOpening(initialOpen, onOpen);
  const [width, setWidth] = useState(340), [busy, setBusy] = useState(false), [cycle, setCycle] = useState(0);
  const focusAfter = usePaperFocus(root, busy, open.opened, cycle);
  useEffect(() => {
    const node = root.current, view = node?.ownerDocument?.defaultView;
    if (!view) return;
    const measure = () => { const measured = node.getBoundingClientRect().width; if (measured > 0) setWidth(Math.max(180, Math.min(426, Math.floor(measured - 34)))); };
    measure(); const observer = view.ResizeObserver ? new view.ResizeObserver(measure) : null;
    if (observer) observer.observe(node); else view.addEventListener('resize', measure);
    return () => { observer?.disconnect(); if (!observer) view.removeEventListener('resize', measure); };
  }, []);
  function finish() { focusAfter(); setBusy(false); open.finish(); }
  function commit() { if (busy || open.opened) return; setBusy(true); if (!ticket.current?.tear()) setBusy(false); }
  function replay() { focusAfter(); open.close(); setBusy(false); setCycle(value => value + 1); }
  return <PaperFrame kind="tear" root={root} title={title} subtitle={subtitle} folio={folio} reduced={reduced} opened={open.opened}>
    <div className="po-scene po-tear-scene"><span className="po-scene-corner" aria-hidden="true">PERFORATED PAPER / PULL TO OPEN</span>
      <TearTicket key={cycle} ref={ticket} width={width} height={202} stubSize={Math.max(68, Math.round(width * .25))} defaultTorn={Boolean(initialOpen && cycle === 0)} radius={7} holes={12} holeSize={4} notch={3.5} roughness={1.5} tearAngle={29} stretch={25} resistance={.44} rotate={-2} tiltMax={4} parallax={1} recenter={false} reducedMotion={reduced} background="#e9dbba" stubBackground="#b98448" color="#344b38" borderColor="#a48b60" ariaLabel={`Tear ${title} along the perforation, or press Enter`} onTear={finish} className="po-perforated-paper" stub={<div className="po-ticket-stub"><span>FINDSG</span><strong>Tear<br/>here</strong><b aria-hidden="true">↗︎</b><small>{folio}</small></div>}><div className="po-ticket-body"><span>FINDSG / INVITATION</span><strong>{title}</strong><i/><small>{subtitle || 'Take the story on paper out into real streets.'}</small><b>{folio}</b></div></TearTicket>
    </div>
    {open.opened && <OpenContent label="What was inside">{children}</OpenContent>}
    <ActionRow label="Tear along the perforation" hint="Pull the right stub outward to tear. The button also plays the full tear." onAction={commit} busy={busy} opened={open.opened} onReplay={replay}/>
  </PaperFrame>;
}

/** Every callback means only “this story object has opened”. The parent owns
 * the narrative, visits and rewards. Replaying never calls onOpen again. */
export default function PaperObject({ kind = 'envelope', title, subtitle, children, reducedMotion = false, onOpen, initialOpen = false, folio = 'KG / 01' }) {
  const props = { title, subtitle, children, reducedMotion, onOpen, initialOpen, folio };
  if (kind === 'book') return <FieldBook {...props} pages={[{ label: folio, title: title || 'Neighbourhood notebook', body: children }]} />;
  if (kind === 'parcel') return <ParcelObject {...props} />;
  if (kind === 'tear') return <TearObject {...props} />;
  return <EnvelopeObject {...props} />;
}
