import React, {forwardRef, useEffect, useId, useImperativeHandle, useRef, useState} from 'react';
import {clamp, createPaperMesh, deformPaper, rotatePaperPoint, projectPaper, hitPaper, createPaperCanvasRenderer, makePaperTexture} from './paper-geometry.js';
import {createPaperThreeRenderer} from './paper-three-runtime.js';
import './paper-crumple.css';

const radians = degrees => degrees * Math.PI / 180;
const spring = value => ({value, target: value, velocity: 0});
function advance(value, dt, duration, instant) {
  if (instant) {value.value = value.target; value.velocity = 0; return false;}
  const rate = 8 / Math.max(.12, duration), delta = value.value - value.target, damping = Math.exp(-rate * dt), carry = (value.velocity + rate * delta) * dt;
  value.value = value.target + (delta + carry) * damping; value.velocity = (value.velocity - rate * carry) * damping;
  if (Math.abs(value.value - value.target) < .0004 && Math.abs(value.velocity) < .003) {value.value = value.target; value.velocity = 0; return false;}
  return true;
}

/** Textured, deforming paper. The bounded mesh path is sampled offline from the
 * user's PaperCrumple reference; both renderers use that same mesh and hit test.
 * This component changes presentation only, never story or reward progress. */
const PaperCrumple = forwardRef(function PaperCrumple({
  src, alt = 'A page you can crumple, smooth out and flip', backSrc = '', width = 320, height = 400,
  sceneHeight = 560, imageFit = 'cover', releaseBehavior = 'restore', crumpleAmount = .85,
  crumpleDuration = .55, releaseDuration = .4, foldCount = 6, foldSharpness = .6,
  wrinkleDepth = .65, creaseStrength = .18, paperColor = '#f4f0e8', roughness = .92,
  paperTexture = .08, lightIntensity = 1.8, lightAngle = -35, shadow = true,
  shadowOpacity = .08, draggable = true, dragRotation = 10, dragRadius = 180,
  returnToOrigin = true, rotation = 0, seed = 7, detail = 64, disabled = false,
  resetKey = 0, initialAmount = .68, reducedMotion = false, onStateChange, onError,
  className = '', style,
}, forwardedRef) {
  const root = useRef(null), canvas = useRef(null), host = useRef(null), hitTarget = useRef(null), control = useRef(null), snapshot = useRef(null);
  const options = useRef(null), helpId = useId(), [failed, setFailed] = useState(false);
  options.current = {src, backSrc, width, height, imageFit, initialAmount, releaseBehavior, crumpleAmount, crumpleDuration, releaseDuration, creaseStrength, draggable, dragRotation, dragRadius, returnToOrigin, rotation, disabled, reducedMotion, onStateChange, onError};
  useImperativeHandle(forwardedRef, () => ({
    crumple: amount => control.current?.crumple(amount) ?? false,
    unfold: (keepCreases = true) => control.current?.unfold(keepCreases) ?? false,
    flip: () => control.current?.flip() ?? false,
    setSide: side => control.current?.setSide(side) ?? false,
    reset: () => control.current?.reset() ?? false,
  }), []);

  useEffect(() => {
    const node = root.current, surface = canvas.current, renderHost = host.current, button = hitTarget.current;
    if (!node || !surface || !renderHost || !button) return;
    const document = node.ownerDocument, view = document.defaultView;
    let disposed = false, frameId = 0, lastTime = 0, projected = null, cpu = null, gpu = null, upgradeExpired = false, upgradeTimer = 0;
    let visible = true, held = false, pointerId = null, keyboardHeld = false, grip = null, pointer = null, pressOrigin = null, signature = '', renderer = 'canvas2d-textured-mesh';
    const images = [], cleanups = [], motion = view.matchMedia?.('(prefers-reduced-motion: reduce)');
    const remembered = snapshot.current, initial = clamp(Number(initialAmount) || 0, 0, 1);
    let peak = remembered?.peak ?? initial;
    const values = {amount: spring(remembered?.amount ?? initial), memory: spring(remembered?.memory ?? 0), x: spring(remembered?.x ?? 0), y: spring(remembered?.y ?? 0), rx: spring(0), ry: spring(0), turn: spring(remembered?.side === 'back' ? Math.PI : 0)};
    let side = remembered?.side || 'front';
    const mesh = createPaperMesh({width: Math.max(1, width), height: Math.max(1, height), foldSharpness, wrinkleDepth, seed});
    const textureOptions = {width, height, imageFit, paperColor, paperTexture, seed};
    let textures;
    const viewport = {width: 1, height: Math.max(1, Number(sceneHeight) || 560), scale: Math.max(1, width)};
    const instant = () => options.current.reducedMotion || motion?.matches;
    const pose = () => ({x: values.x.value, y: values.y.value, rx: values.rx.value, ry: values.turn.value + values.ry.value, rz: radians(options.current.rotation)});

    function publish(force = false) {
      if (disposed) return;
      const amount = values.amount.value, state = held ? 'holding' : amount > .015 ? 'crumpled' : values.memory.value > .001 ? 'creased' : 'flat';
      // Notify React only when the readable state changes, while keeping the
      // per-frame geometry and amount on the canvas/DOM. Do not wait for the
      // slower position spring before announcing that a page is unfolded.
      const key = `${state}:${side}:${renderer}`;
      if (force || key !== signature) {signature = key; options.current.onStateChange?.(state, {shape: amount > .015 ? 'crumpled' : 'flat', side, amount, engine: renderer, renderer, creases: values.memory.value});}
    }
    function stopFrame() {if (frameId) view.cancelAnimationFrame(frameId); frameId = 0; lastTime = 0;}
    function updateGrip() {
      if (!held || !grip || !pointer || !options.current.draggable) return;
      const local = [0, 0, 0]; for (let k = 0; k < 3; k++) for (let axis = 0; axis < 3; axis++) local[axis] += mesh.positions[grip.ids[k] * 3 + axis] * grip.weights[k];
      const point = rotatePaperPoint(local, pose()).map(value => value * viewport.scale), focal = viewport.height / (2 * Math.tan(radians(17.5)));
      const ratio = Math.max(.1, (focal - point[2]) / focal), radius = Math.max(0, options.current.dragRadius);
      values.x.value = values.x.target = clamp((pointer.x - viewport.width / 2) * ratio - point[0], -radius, radius);
      values.y.value = values.y.target = clamp((viewport.height / 2 - pointer.y) * ratio - point[1], -radius, radius);
      values.x.velocity = values.y.velocity = 0;
    }
    function draw() {
      if (disposed || !cpu) return;
      deformPaper(mesh, values.amount.value, values.memory.value); updateGrip();
      const transform = pose(); projected = projectPaper(mesh, transform, viewport);
      if (gpu) {try {gpu.draw(mesh, transform, viewport);} catch {fallback();}}
      if (!gpu) cpu.draw(mesh, projected, textures);
      const bounds = projected.bounds, left = clamp(bounds.minX - 8, 0, viewport.width - 24), top = clamp(bounds.minY - 8, 0, viewport.height - 24);
      button.style.left = `${left}px`; button.style.top = `${top}px`; button.style.width = `${Math.max(24, Math.min(viewport.width - left, bounds.maxX - left + 8))}px`; button.style.height = `${Math.max(24, Math.min(viewport.height - top, bounds.maxY - top + 8))}px`;
      node.dataset.amount = values.amount.value.toFixed(3); node.dataset.side = side; node.dataset.renderer = renderer; node.dataset.held = held ? 'true' : 'false';
      publish();
    }
    function tick(time) {
      frameId = 0; if (disposed || !visible || document.hidden) {lastTime = 0; return;}
      const dt = lastTime ? clamp((time - lastTime) / 1000, .001, .05) : 1 / 60; lastTime = time;
      let moving = false;
      for (const [key, value] of Object.entries(values)) {const duration = key === 'amount' && value.target > value.value ? options.current.crumpleDuration : options.current.releaseDuration; moving = advance(value, dt, key === 'turn' ? .7 : duration, instant()) || moving;}
      draw();
      if (moving) frameId = view.requestAnimationFrame(tick); else {lastTime = 0; publish();}
    }
    function wake() {
      if (disposed) return;
      if (instant()) {stopFrame(); for (const value of Object.values(values)) {value.value = value.target; value.velocity = 0;} draw(); publish(); return;}
      if (!frameId && visible && !document.hidden) frameId = view.requestAnimationFrame(tick);
    }
    function releaseCapture() {if (pointerId !== null && button.hasPointerCapture?.(pointerId)) {try {button.releasePointerCapture(pointerId);} catch {}} pointerId = null;}
    function release(cancelled = false) {
      if (!held) return;
      held = false; keyboardHeld = false; grip = pointer = pressOrigin = null;
      const opts = options.current, behavior = cancelled ? 'creased' : opts.releaseBehavior;
      if (behavior !== 'stay') {values.amount.target = 0; values.memory.target = behavior === 'creased' ? Math.max(values.memory.target, peak * clamp(opts.creaseStrength, 0, 1)) : 0;}
      else values.amount.target = values.amount.value;
      if (opts.returnToOrigin && behavior !== 'stay') values.x.target = values.y.target = 0;
      values.rx.target = values.ry.target = 0; releaseCapture(); publish(); wake();
    }
    function cancelHold() {if (held) {held = false; keyboardHeld = false; grip = pointer = pressOrigin = null; releaseCapture();}}
    function allowed() {return !disposed && !options.current.disabled;}
    function startAmount(amount) {
      if (!allowed()) return false; cancelHold();
      const target = clamp(Number.isFinite(amount) ? amount : options.current.crumpleAmount, 0, 1);
      peak = Math.max(peak, target); values.amount.target = target; values.rx.target = values.ry.target = 0; wake(); publish(); return true;
    }
    function unfold(keepCreases = true) {
      if (!allowed()) return false; cancelHold(); values.amount.target = 0;
      values.memory.target = keepCreases ? Math.max(values.memory.target, peak * clamp(options.current.creaseStrength, 0, 1)) : 0;
      values.x.target = values.y.target = values.rx.target = values.ry.target = 0; if (!keepCreases) peak = 0; wake(); publish(); return true;
    }
    function setSide(next) {if (!allowed() || !['front', 'back'].includes(next)) return false; cancelHold(); side = next; values.turn.target = side === 'back' ? Math.PI : 0; values.rx.target = values.ry.target = 0; publish(true); wake(); return true;}
    function reset() {
      if (!allowed()) return false; cancelHold(); side = 'front'; peak = clamp(Number(options.current.initialAmount) || 0, 0, 1);
      for (const key of ['memory', 'x', 'y', 'rx', 'ry', 'turn']) values[key].target = 0;
      values.amount.target = peak; publish(true); wake(); return true;
    }
    function fallback() {
      if (disposed) return; const previous = gpu; gpu = null; previous?.dispose(); surface.hidden = false; renderer = 'canvas2d-textured-mesh';
      if (projected && textures) cpu?.draw(mesh, projected, textures); publish(true);
    }
    function measure() {
      if (disposed) return; const box = node.getBoundingClientRect(); if (box.width < 1 || box.height < 1) return;
      viewport.width = box.width; viewport.height = box.height;
      viewport.scale = Math.max(16, Math.min(Math.max(1, options.current.width), (box.width - 32) / 1.05, (box.height - 38) / (mesh.aspect * 1.08)));
      cpu?.resize(box.width, box.height); gpu?.resize(box.width, box.height); draw();
    }
    function pointFromEvent(event) {const box = node.getBoundingClientRect(); return {x: event.clientX - box.left, y: event.clientY - box.top};}
    function begin(event) {
      if (!allowed() || held || event.button !== 0 || event.isPrimary === false) return;
      const point = pointFromEvent(event), hit = hitPaper(projected, point.x, point.y); if (!hit) return;
      event.preventDefault(); button.focus({preventScroll: true, focusVisible: false}); pointerId = event.pointerId; pointer = pressOrigin = point; grip = hit; held = true;
      try {button.setPointerCapture(pointerId);} catch {}
      values.amount.target = clamp(options.current.crumpleAmount, 0, 1); peak = Math.max(peak, values.amount.target); publish(true); wake();
    }
    function move(event) {
      if (!held || event.pointerId !== pointerId) return; event.preventDefault(); pointer = pointFromEvent(event);
      if (options.current.draggable && pressOrigin && !instant()) {values.ry.target = radians(options.current.dragRotation) * clamp((pointer.x - pressOrigin.x) / 80, -1, 1); values.rx.target = radians(options.current.dragRotation) * clamp((pointer.y - pressOrigin.y) / 80, -1, 1);}
      wake();
    }
    function end(event) {
      if (event.pointerId !== pointerId) return;
      // Hunt: a sideways swipe across the paper turns it over, as a hand would
      const from = pressOrigin, to = pointFromEvent(event), dx = from ? to.x - from.x : 0, dy = from ? to.y - from.y : 0;
      const turn = event.type === 'pointerup' && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4;
      release(event.type !== 'pointerup');
      if (turn) setSide(side === 'front' ? 'back' : 'front');
    }
    function keyDown(event) {
      if (!allowed()) return;
      if (event.code === 'Space' || event.code === 'Enter') {event.preventDefault(); if (event.repeat || held) return; keyboardHeld = held = true; values.amount.target = clamp(options.current.crumpleAmount, 0, 1); peak = Math.max(peak, values.amount.target); publish(true); wake();}
      else if (event.key.toLowerCase() === 'f') {event.preventDefault(); setSide(side === 'front' ? 'back' : 'front');}
      else if (event.key === 'Escape') {event.preventDefault(); reset();}
      else if (held && options.current.draggable && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {event.preventDefault(); const radius = Math.max(0, options.current.dragRadius); if (event.key === 'ArrowLeft') values.x.target -= 12; if (event.key === 'ArrowRight') values.x.target += 12; if (event.key === 'ArrowUp') values.y.target += 12; if (event.key === 'ArrowDown') values.y.target -= 12; values.x.target = clamp(values.x.target, -radius, radius); values.y.target = clamp(values.y.target, -radius, radius); wake();}
    }
    function keyUp(event) {if (keyboardHeld && ['Space', 'Enter'].includes(event.code)) {event.preventDefault(); release();}}
    function add(target, name, listener, options) {target.addEventListener(name, listener, options); cleanups.push(() => target.removeEventListener(name, listener, options));}

    try {cpu = createPaperCanvasRenderer(surface, {shadow, shadowOpacity, lightAngle}); textures = {front: makePaperTexture(document, null, textureOptions), back: makePaperTexture(document, null, {...textureOptions, seed: seed + 13})}; setFailed(false);} catch (error) {setFailed(true); options.current.onError?.(error); return;}
    control.current = {crumple: startAmount, unfold, flip: () => setSide(side === 'front' ? 'back' : 'front'), setSide, reset, refresh: () => {if (options.current.disabled) release(true); measure(); wake();}};
    add(button, 'pointerdown', begin); add(button, 'pointermove', move); add(button, 'pointerup', end); add(button, 'pointercancel', end); add(button, 'lostpointercapture', end); add(button, 'keydown', keyDown); add(button, 'keyup', keyUp); add(button, 'blur', () => {if (keyboardHeld) release(true);});
    // Screen-reader activation emits a click without pointer/key events.
    add(button, 'click', event => {event.preventDefault(); if (event.detail === 0 && !keyboardHeld) {if (values.amount.target > .015) unfold(true); else startAmount();}});
    add(document, 'visibilitychange', () => {if (document.hidden) {release(true); stopFrame();} else {measure(); wake();}});
    add(view, 'blur', () => release(true));
    if (motion?.addEventListener) add(motion, 'change', () => wake());
    const resize = view.ResizeObserver ? new view.ResizeObserver(measure) : null; if (resize) resize.observe(node); else add(view, 'resize', measure);
    const observer = view.IntersectionObserver ? new view.IntersectionObserver(entries => {visible = entries[0]?.isIntersecting !== false; if (visible) {measure(); wake();} else {release(true); stopFrame();}}, {rootMargin: '60px'}) : null; observer?.observe(node);
    measure(); publish(true);

    function loadTexture(source, face) {
      if (!source) return; const image = new view.Image(); images.push(image); if (!/^(data:|blob:)/i.test(source)) image.crossOrigin = 'anonymous';
      image.onload = () => {if (disposed) return; try {textures = {...textures, [face]: makePaperTexture(document, image, {...textureOptions, seed: face === 'front' ? seed : seed + 13})}; gpu?.setTextures(textures); draw();} catch (error) {options.current.onError?.(error);}};
      image.onerror = () => {if (!disposed) options.current.onError?.(new Error(`The ${face === 'front' ? 'front' : 'back'} of the page did not load.`));}; image.src = source;
    }
    loadTexture(src, 'front'); loadTexture(backSrc, 'back');
    upgradeTimer = view.setTimeout(() => {upgradeExpired = true;}, 1800);
    createPaperThreeRenderer(renderHost, {mesh, textures, roughness, shadow, shadowOpacity, lightIntensity, lightAngle, isCancelled: () => disposed || upgradeExpired, onContextLost: fallback}).then(next => {
      if (!next) return; if (disposed || upgradeExpired) {next.dispose(); return;}
      view.clearTimeout(upgradeTimer); gpu = next;
      try {gpu.setTextures(textures); gpu.resize(viewport.width, viewport.height); renderer = gpu.engine; draw(); surface.hidden = Boolean(gpu); publish(true);} catch {fallback();}
    }).catch(() => {/* A missing optional WebGL runtime does not interrupt paper interaction. */});

    return () => {
      snapshot.current = {amount: values.amount.target, memory: values.memory.target, x: values.x.target, y: values.y.target, side, peak};
      disposed = true; held = false; grip = pointer = pressOrigin = null; releaseCapture(); stopFrame(); view.clearTimeout(upgradeTimer);
      cleanups.forEach(cleanup => cleanup()); resize?.disconnect(); observer?.disconnect(); images.forEach(image => {image.onload = image.onerror = null;}); gpu?.dispose(); cpu?.dispose(); surface.hidden = false; control.current = null;
    };
    // foldCount/detail remain accepted source API options. Browser mesh cost is
    // intentionally bounded by the checked-in path, independent of those hints.
  }, [src, backSrc, width, height, imageFit, foldSharpness, wrinkleDepth, seed, roughness, paperColor, paperTexture, lightIntensity, lightAngle, shadow, shadowOpacity]);

  useEffect(() => {control.current?.refresh();}, [reducedMotion, disabled, rotation, sceneHeight]);
  const lastResetKey = useRef(resetKey);
  useEffect(() => {if (lastResetKey.current !== resetKey) {lastResetKey.current = resetKey; control.current?.reset();}}, [resetKey]);

  return <div ref={root} className={`paper-crumple${className ? ` ${className}` : ''}`} style={{height: sceneHeight, ...style}} data-amount={clamp(Number(initialAmount) || 0, 0, 1).toFixed(3)} data-side="front" data-renderer="canvas2d-textured-mesh" data-reduced-motion={reducedMotion ? 'true' : 'false'} data-fold-budget={`${foldCount}:${detail}`}>
    <canvas ref={canvas} className="paper-crumple-canvas paper-crumple-canvas--software" aria-hidden="true" />
    <div ref={host} className="paper-crumple-render-host" aria-hidden="true" />
    <button ref={hitTarget} type="button" className="paper-crumple-hit" disabled={disabled || failed} aria-label={alt} aria-describedby={helpId}><span className="paper-crumple-sr">Hold to crumple, drag to move the page, release to smooth it out.</span></button>
    <span id={helpId} className="paper-crumple-sr">Hold Space or Enter to crumple and release to smooth out; F flips the page, Escape resets it. You can also use the buttons below the page.</span>
    {failed && <p className="paper-crumple-error" role="status">The page preview is unavailable. You can still read the text below.</p>}
  </div>;
});
export default PaperCrumple;
