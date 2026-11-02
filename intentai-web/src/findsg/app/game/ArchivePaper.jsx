import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import PaperCrumple from './PaperCrumple.jsx';
import { ROUTES } from '../data.js';
import { createPaperPrints, makePaperDocument } from './paper-print.js';
import './archive-paper.css';

/** Presentation only: the parent supplies earned clues, or requests a wholly
 * independent stationery sample. No arrival, puzzle, reward or storage writes. */
function PaperPresentation({ paper, reducedMotion, className, bare = false }) {
  const root = useRef(null), controller = useRef(null);
  const id = useId();
  const [prints, setPrints] = useState(null);
  const [printFailed, setPrintFailed] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(340);
  const [presentation, setPresentation] = useState({ state: 'crumpled', side: 'front', shape: 'crumpled', amount: .68, engine: '' });

  useEffect(() => {
    const document = root.current?.ownerDocument;
    if (!document) return;
    let active = true;
    const view = document.defaultView;
    const print = () => {
      if (!active) return;
      try {
        const next = createPaperPrints(document, paper);
        if (active) { setPrints(next); setPrintFailed(false); }
      } catch {
        if (active) { setPrints(null); setPrintFailed(true); }
      }
    };
    const frame = view?.requestAnimationFrame ? view.requestAnimationFrame(print) : null;
    if (frame === null) print();
    return () => { active = false; if (frame !== null) view.cancelAnimationFrame(frame); };
  }, [paper]);

  useEffect(() => {
    const node = root.current, view = node?.ownerDocument?.defaultView;
    if (!node || !view) return;
    const measure = () => {
      const width = node.offsetWidth; // layout width: a dialog opening in 3D must not be measured mid-turn
      if (width > 0) setAvailableWidth(previous => Math.abs(previous - width) > 1 ? width : previous);
    };
    measure();
    const observer = view.ResizeObserver ? new view.ResizeObserver(measure) : null;
    if (observer) observer.observe(node); else view.addEventListener('resize', measure);
    return () => { observer?.disconnect(); if (!observer) view.removeEventListener('resize', measure); };
  }, []);

  const syncPresentation = useCallback((state, detail = {}) => {
    setPresentation(previous => {
      const next = {
        state: typeof state === 'string' ? state : previous.state,
        side: detail.side === 'back' ? 'back' : detail.side === 'front' ? 'front' : previous.side,
        shape: detail.shape || previous.shape,
        amount: Number.isFinite(detail.amount) ? detail.amount : previous.amount,
        engine: detail.renderer || detail.engine || previous.engine
      };
      return Object.keys(next).every(key => next[key] === previous[key]) ? previous : next;
    });
  }, []);

  const paperWidth = Math.round(Math.min(270, Math.max(205, availableWidth - 48)));
  const sceneHeight = Math.round(Math.max(320, Math.min(380, availableWidth * .5 + 190)));
  const back = presentation.side === 'back';
  const flat = presentation.state === 'flat' || presentation.amount < .015;
  const shapeLabel = presentation.state === 'holding' ? 'Crumpling' : presentation.state === 'creased' ? 'Unfolded · creases kept' : flat ? 'Smoothed flat' : presentation.amount < .25 ? 'Unfolded · creases kept' : 'Crumpled';
  const invoke = (method, ...args) => controller.current?.[method]?.(...args);

  return <section ref={root} className={`findsg-archive-paper ap-theme-${paper.themeKey}${paper.sample ? ' ap-is-sample' : ''}${className ? ` ${className}` : ''}`} aria-labelledby={`${id}-title`} data-reduced-motion={reducedMotion ? 'true' : 'false'}>
    <header className="ap-heading">
      <div><span className="ap-eyebrow">{paper.sample ? 'Stationery / interactive sample' : 'Clue found / paper record'}</span><h3 id={`${id}-title`}>{paper.theme.name}</h3></div>
      <span className="ap-folio">{paper.folio}</span>
    </header>

    <div className="ap-stage" style={{ '--ap-scene-height': `${sceneHeight}px` }} data-renderer={presentation.engine || 'pending'}>
      <span className="ap-stage-label" aria-hidden="true">FINDSG · PAPER STUDY</span>
      <span className="ap-stage-measure" aria-hidden="true">01 / 02</span>
      {prints ? <PaperCrumple ref={controller} src={prints.src} backSrc={prints.backSrc} alt={`${paper.front.title}, ${paper.sample ? 'interactive sample' : 'story prop'}`} width={paperWidth} height={paperWidth * 4 / 3} sceneHeight={sceneHeight} imageFit="contain" initialAmount={.68} releaseBehavior="creased" crumpleAmount={.82} crumpleDuration={.55} releaseDuration={.5} foldCount={7} foldSharpness={.65} wrinkleDepth={.7} creaseStrength={.2} paperColor={paper.theme.paper} roughness={.94} paperTexture={.06} lightIntensity={1.8} lightAngle={-35} shadow shadowOpacity={.24} draggable returnToOrigin dragRotation={9} rotation={-3} seed={37 + paper.themeKey.length * 11} reducedMotion={reducedMotion} onStateChange={syncPresentation} className="ap-paper-object" /> : <div className="ap-preparing" role="status"><span aria-hidden="true">¶</span><p>{printFailed ? 'Paper preview unavailable for now. The full text is below.' : 'Printing both sides of the paper…'}</p></div>}
      {bare ? prints && <span key={presentation.amount > .2 ? 'open' : 'turn'} className="ap-touch" aria-hidden="true">{presentation.amount > .2 ? 'Tap to open' : 'Swipe to turn over'}</span>
        : <div className="ap-stage-caption"><span>{back ? 'REVERSE' : 'FRONT'}</span><span>{printFailed ? 'Text available below' : shapeLabel}</span></div>}
    </div>
    {!bare && <>

    <div className="ap-controls">
      <button type="button" className="ap-unfold" disabled={!prints} onClick={() => invoke('unfold', true)} aria-describedby={`${id}-gesture`}><span>Unfold</span><span aria-hidden="true">↗︎</span></button>
      <div className="ap-secondary-controls" role="group" aria-label="Paper controls">
        <button type="button" disabled={!prints} onClick={() => invoke('flip')} aria-label={back ? 'Turn back to the front' : 'Turn over to read the next clue'}><span aria-hidden="true">↔︎</span>{back ? 'Turn to front' : 'Turn over'}</button>
        <button type="button" disabled={!prints} onClick={() => invoke('unfold', false)}><span aria-hidden="true">▱</span>Smooth flat</button>
        <button type="button" disabled={!prints} onClick={() => invoke('reset')}><span aria-hidden="true">↶</span>Crumple again</button>
      </div>
    </div>
    <p id={`${id}-gesture`} className="ap-gesture-note">Press and hold to crumple, drag to nudge, or use the buttons above.</p>
    </>}
    <p className="ap-render-note" role="status" aria-live="polite">{printFailed ? 'The preview could not open. The full text of both sides is below.' : reducedMotion ? 'Reduced motion is on. Unfold and turn over with the buttons.' : `${back ? 'Viewing the back' : 'Viewing the front'} · ${shapeLabel}`}</p>

    <div className="ap-reader" aria-label={paper.sample ? 'Full text of the interactive sample' : 'Full text of the clue found'}>
      <div className="ap-reader-label"><span>Text on the paper</span><span>{paper.sample ? 'Standalone sample' : 'Story clue'}</span></div>
      <article className="ap-reader-face" aria-labelledby={`${id}-front`}>
        <span className="ap-face-label">Front · {paper.sample ? 'interactive sample' : 'this discovery'}</span>
        <h4 id={`${id}-front`}>{paper.front.title}</h4>
        <p>{paper.front.text}</p>
      </article>
      <article className="ap-reader-face ap-reader-reverse" aria-labelledby={`${id}-reverse`}>
        <span className="ap-face-label">Back · {paper.sample ? 'keep exploring' : 'next clue'}</span>
        <h4 id={`${id}-reverse`}>{paper.back.title}</h4>
        {paper.back.text && <p>{paper.back.text}</p>}
        {paper.sample && <span className="ap-sample-action">{paper.back.cta}</span>}
      </article>
      <footer className="ap-reader-footer"><span>{paper.classification}</span><p>{paper.note}</p></footer>
    </div>
  </section>;
}

export default function ArchivePaper({ routeId, stop, index = 0, reducedMotion = false, sample = false, className = '', bare = false }) {
  const paper = useMemo(() => makePaperDocument({ routeId, stop, index, sample, routeMeta: ROUTES[routeId] || {} }), [routeId, stop, index, sample]);
  if (!paper) return null;
  return <PaperPresentation key={`${paper.id}:${sample ? 'sample' : 'earned'}`} paper={paper} reducedMotion={reducedMotion} className={className} bare={bare} />;
}
