import React, {forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState} from 'react';
import './tear-ticket.css';

// Adapted from the supplied TearTicket: retain its perforated geometry,
// stretching fibres and paper hinge, with a local finite animation controller.
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const GRAVITY = 2400, RETRACT = .17;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const rad = value => value * Math.PI / 180;
const wrap = value => Math.atan2(Math.sin(value), Math.cos(value));
const f = value => value.toFixed(2);
function noise(seed) {let s = seed | 0; return () => {s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;};}

function buildGeometry(W, H, S, R, holes, hole, notch, rough, vertical) {
  const main = vertical ? H : W, cross = vertical ? W : H, x = main - S, hr = hole / 2;
  const n = clamp(Math.round(holes), 1, Math.max(1, Math.floor((cross - 2 * notch - 2) / (hole + 2))));
  const span = cross - 2 * notch, bridge = Math.max(2, (span - n * hole) / (n + 1)), random = noise(n * 7919 + Math.round(cross));
  const at = (u, v) => vertical ? {x: v, y: u} : {x: u, y: v};
  const pt = (u, v) => vertical ? `${f(v)},${f(u)}` : `${f(u)},${f(v)}`;
  const arc = (r, sweep, u, v) => `A${f(r)},${f(r)} 0 0 ${vertical ? 1 - sweep : sweep} ${pt(u, v)}`;
  const bridges = [];
  for (let i = 0; i <= n; i++) {
    const y0 = notch + i * (bridge + hole), y1 = y0 + bridge, steps = Math.max(2, Math.round(bridge / 2.2)), pts = [];
    for (let k = 1; k < steps; k++) pts.push([x + (random() - .5) * 2 * rough, y0 + bridge * k / steps]);
    bridges.push({y0, y1, mid: (y0 + y1) / 2, pts, ...at(x, (y0 + y1) / 2)});
  }
  let body = `M${pt(R, 0)}L${pt(x - notch, 0)}${arc(notch, 0, x, notch)}`;
  bridges.forEach((b, i) => {b.pts.forEach(p => {body += `L${pt(p[0], p[1])}`;}); body += `L${pt(x, b.y1)}`; if (i < n) body += arc(hr, 0, x, b.y1 + hole);});
  body += `${arc(notch, 0, x - notch, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}Z`;
  let stub = `M${pt(x + notch, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + notch, cross)}${arc(notch, 0, x, cross - notch)}`;
  for (let i = n; i >= 0; i--) {const b = bridges[i]; for (let k = b.pts.length - 1; k >= 0; k--) stub += `L${pt(b.pts[k][0], b.pts[k][1])}`; stub += `L${pt(x, b.y0)}`; if (i > 0) stub += arc(hr, 0, x, b.y0 - hole);}
  stub += `${arc(notch, 0, x + notch, 0)}Z`;
  const ends = [{...at(x, notch), v: notch}, {...at(x, cross - notch), v: cross - notch}];
  const bodyOutline = `M${pt(x, cross - notch)}${arc(notch, 0, x - notch, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}L${pt(x - notch, 0)}${arc(notch, 0, x, notch)}`;
  const stubOutline = `M${pt(x, notch)}${arc(notch, 0, x + notch, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + notch, cross)}${arc(notch, 0, x, cross - notch)}`;
  return {vertical, cross, body, stub, bridges, ends, bodyOutline, stubOutline};
}

function freshSimulation(finished = false) {
  return {raf: null, last: 0, phase: 'idle', phaseStartedAt: 0, id: null, finished, committed: false, sign: 1, hinge: {x: 0, y: 0}, hingeV: 0, grab: {x: 0, y: 0}, start: {x: 0, y: 0}, point: {x: 0, y: 0}, a0: 0, theta: 0, thetaV: 0, sx: 0, sy: 0, vx: 0, vy: 0, spin: 0, pvx: 0, pvy: 0, pt: 0, fade: finished ? 0 : 1, age: 0, bx: 0, bv: 0, snapped: [], snapAt: [], span: [], tiltX: 0, tiltY: 0, targetX: 0, targetY: 0};
}

const TearTicket = forwardRef(function TearTicket({
  children = null, stub = null, image = '', imageAlt = '', scrim = true, imageRadius = 8,
  orientation = 'horizontal', torn, defaultTorn = false, onTear,
  width = 460, height = 250, stubSize = 150, radius = 16, holes = 12, holeSize = 6, notch = 3, roughness = 0,
  tearAngle = 30, stretch = 30, resistance = .45, rotate = 4, tilt = true, tiltMax = 9, tiltReach = 260, parallax = 6,
  perspective = 1000, background = '#27272a', color = '#f5f5f5', border = true, borderColor = '', borderWidth = 1,
  stubBackground = '', recenter = true, disabled = false, ariaLabel = 'Tear off the stub', className = '',
  reducedMotion = false, imageCrop = 'normal',
}, ref) {
  const controlled = torn !== undefined, vertical = orientation === 'vertical';
  const W = Math.max(160, number(width, 460)), H = Math.max(120, number(height, 250));
  const S = clamp(number(stubSize, 150), 42, (vertical ? H : W) - 60), R = clamp(number(radius, 16), 0, Math.min(W, H) / 3);
  const N = clamp(number(notch, 3), .1, Math.min(W, H) / 10), hole = clamp(number(holeSize, 6), 1, 20);
  const [inner, setInner] = useState(Boolean(defaultTorn)), [complete, setComplete] = useState(Boolean(controlled ? torn : defaultTorn));
  const [grabbing, setGrabbing] = useState(false), [committing, setCommitting] = useState(false), [fit, setFit] = useState(1), [systemReduced, setSystemReduced] = useState(false);
  const used = Boolean(controlled ? torn : inner), effectiveUsed = used || complete, reduce = Boolean(reducedMotion || systemReduced);
  const rootRef = useRef(null), stageRef = useRef(null), planeRef = useRef(null), bodyRef = useRef(null), stubRef = useRef(null), artRef = useRef(null), inkRef = useRef(null), fibres = useRef([]);
  const ownerWindow = useRef(null), mounted = useRef(false), previousUsed = useRef(used), previousReduce = useRef(reduce), fitRef = useRef(1);
  const sim = useRef(freshSimulation(effectiveUsed)), cfg = useRef({});
  const geo = useMemo(() => buildGeometry(W, H, S, R, clamp(number(holes, 12), 1, 60), hole, N, clamp(number(roughness, 0), 0, 5), vertical), [W, H, S, R, holes, hole, N, roughness, vertical]);
  cfg.current = {geo, W, H, S, reduce, controlled, used: effectiveUsed, disabled, onTear, tearAngle: clamp(number(tearAngle, 30), 8, 70), stretch: clamp(number(stretch, 30), 8, 120), resistance: clamp(number(resistance, .45), 0, .95), tilt, tiltMax: clamp(number(tiltMax, 9), 0, 20), tiltReach: Math.max(0, number(tiltReach, 260)), parallax: clamp(number(parallax, 6), 0, 22), rotate: number(rotate, 4), perspective: Math.max(200, number(perspective, 1000))};
  const win = () => ownerWindow.current || rootRef.current?.ownerDocument?.defaultView;
  const now = () => win()?.performance.now() || 0;
  const stopFrame = () => {const s = sim.current; if (s.raf !== null) win()?.cancelAnimationFrame(s.raf); s.raf = null; s.last = 0;};

  function releaseCapture() {
    const s = sim.current, id = s.id; s.id = null;
    try {if (id !== null && stubRef.current?.hasPointerCapture(id)) stubRef.current.releasePointerCapture(id);} catch {}
  }
  function paint(stamp) {
    const s = sim.current, c = cfg.current, up = c.geo.vertical;
    if (stubRef.current) {stubRef.current.style.transform = `translate(${f(s.sx)}px,${f(s.sy)}px) rotate(${f(s.theta * s.sign * 180 / Math.PI)}deg)`; stubRef.current.style.opacity = f(s.fade); stubRef.current.style.visibility = s.finished || c.used ? 'hidden' : '';}
    if (bodyRef.current) bodyRef.current.style.transform = `translate${up ? 'Y' : 'X'}(${f(s.bx)}px)`;
    if (planeRef.current) planeRef.current.style.transform = `perspective(${c.perspective}px) rotate(${c.rotate}deg) rotateX(${f(s.tiltX)}deg) rotateY(${f(s.tiltY)}deg)`;
    const depth = c.tiltMax > 0 ? c.parallax / c.tiltMax : 0;
    if (artRef.current) artRef.current.style.transform = `translate(${f(-s.tiltY * depth)}px,${f(s.tiltX * depth)}px)`;
    if (inkRef.current) inkRef.current.style.transform = `translate(${f(s.tiltY * depth * .22)}px,${f(-s.tiltX * depth * .22)}px)`;
    const cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign), lx = up ? 1.6 : 0, ly = up ? 0 : 1.6;
    let busy = false;
    c.geo.bridges.forEach((b, index) => {
      const near = fibres.current[index * 2], far = fibres.current[index * 2 + 1]; if (!near || !far) return;
      const dx = b.x - s.hinge.x, dy = b.y - s.hinge.y, tx = s.hinge.x + dx * cos - dy * sin + s.sx, ty = s.hinge.y + dx * sin + dy * cos + s.sy;
      const ox = b.x + (up ? 0 : s.bx), oy = b.y + (up ? s.bx : 0), gx = tx - ox, gy = ty - oy, gap = Math.hypot(gx, gy), live = s.phase !== 'idle' && !c.reduce;
      if (!s.snapped[index]) {
        if (!live || gap < .35) {near.style.opacity = far.style.opacity = '0'; return;}
        const k = clamp(gap / c.stretch, 0, 1), sag = gap * .18, sx = (up ? sag : 0) + gx / 2, sy = (up ? 0 : sag) + gy / 2;
        near.setAttribute('d', `M${f(ox - lx)},${f(oy - ly)}Q${f(ox - lx + sx)},${f(oy - ly + sy)} ${f(tx - lx)},${f(ty - ly)}`);
        far.setAttribute('d', `M${f(ox + lx)},${f(oy + ly)}Q${f(ox + lx + gx - sx)},${f(oy + ly + gy - sy)} ${f(tx + lx)},${f(ty + ly)}`);
        near.style.strokeWidth = far.style.strokeWidth = f(1.7 - 1.15 * k); near.style.opacity = far.style.opacity = '1'; s.span[index] = gap; return;
      }
      const t = (stamp - (s.snapAt[index] || 0)) / 1000 / RETRACT;
      if (!live || t >= 1 || !s.snapAt[index]) {near.style.opacity = far.style.opacity = '0'; return;}
      busy = true; const left = (1 - t) ** 2, length = (s.span[index] || c.stretch) * .5 * left, ux = gap > .01 ? gx / gap : 1, uy = gap > .01 ? gy / gap : 0;
      near.setAttribute('d', `M${f(ox)},${f(oy)}L${f(ox + ux * length)},${f(oy + uy * length)}`); far.setAttribute('d', `M${f(tx)},${f(ty)}L${f(tx - ux * length)},${f(ty - uy * length)}`);
      near.style.strokeWidth = far.style.strokeWidth = '.9'; near.style.opacity = far.style.opacity = f(left);
    });
    return busy;
  }
  function reset(rearm = false) {
    stopFrame(); releaseCapture(); const finished = rearm ? false : sim.current.finished || used;
    sim.current = freshSimulation(finished);
    if (stubRef.current) stubRef.current.style.transformOrigin = '0px 0px';
    if (mounted.current) {setGrabbing(false); setCommitting(false); if (rearm) setComplete(false);}
    paint(now());
  }
  function finish() {
    const s = sim.current, c = cfg.current; if (!mounted.current || s.finished) return false;
    s.finished = true; s.committed = false; s.phase = 'idle'; s.fade = 0; stopFrame(); releaseCapture(); s.bx = s.bv = 0;
    if (stubRef.current) stubRef.current.style.visibility = 'hidden'; paint(now());
    setComplete(true); setGrabbing(false); setCommitting(false); if (!c.controlled) setInner(true);
    c.onTear?.(); return true;
  }
  function snapBridges(stamp, all = false) {
    const s = sim.current, c = cfg.current, limit = rad(c.tearAngle), slack = Math.hypot(s.sx, s.sy); let left = 0;
    c.geo.bridges.forEach((bridge, i) => {
      if (s.snapped[i]) return;
      if (all || 2 * Math.abs(bridge.mid - s.hingeV) * Math.sin(s.theta / 2) + slack > c.stretch || s.theta >= limit - .0001) {s.snapped[i] = true; s.snapAt[i] = stamp; s.bv -= 560 / c.geo.bridges.length;} else left++;
    });
    return left;
  }
  function drop(stamp = now()) {
    const s = sim.current; s.committed = true; s.phase = 'drop'; s.phaseStartedAt = stamp; s.age = 0;
    const still = stamp - s.pt > 80; s.vx = still ? 60 * s.sign : clamp(s.pvx, -1200, 1200); s.vy = still ? 40 : clamp(s.pvy, -700, 900); s.spin = clamp(s.vx * .003, -4, 4) + 1.2;
    setCommitting(true); setGrabbing(false); if (cfg.current.reduce) finish(); else run();
  }
  function step(stamp) {
    const s = sim.current, c = cfg.current; s.raf = null; if (!mounted.current || s.finished || rootRef.current?.ownerDocument.hidden) return;
    if (c.reduce) {s.targetX = s.targetY = s.tiltX = s.tiltY = 0; paint(stamp); return;}
    const dt = clamp((stamp - s.last) / 1000, .001, .034); s.last = stamp; const limit = rad(c.tearAngle);
    let unsettled = false;
    if (s.phase === 'auto') {
      // Stage duration follows elapsed time; only the spring/gravity integrator
      // above is capped. Sparse RAF callbacks must not prolong a committed tear.
      s.age = Math.max(0, (stamp - s.phaseStartedAt) / 1000); const t = clamp(s.age / .29, 0, 1); s.theta = limit * (1 - (1 - t) ** 2); s.sx = c.geo.vertical ? 0 : t * 3; s.sy = c.geo.vertical ? t * 3 : 0; snapBridges(stamp, t === 1);
      if (t === 1) {s.pvx = 110 * s.sign; s.pvy = 80; s.pt = stamp; drop(stamp);} unsettled = true;
    } else if (s.phase === 'held') {
      const intact = c.geo.bridges.reduce((sum, _, index) => sum + (!s.snapped[index] ? 1 : 0), 0), hold = intact / c.geo.bridges.length, follow = .92 * (1 - c.resistance * hold);
      const a = Math.atan2(s.point.y - s.hinge.y, s.point.x - s.hinge.x), want = clamp(wrap(a - s.a0) * s.sign * follow, 0, limit + .1);
      s.theta += (want - s.theta) * (1 - Math.exp(-dt / .035));
      const away = clamp((c.geo.vertical ? s.point.y - s.start.y : s.point.x - s.start.x) * .05, -2, 4), side = clamp((c.geo.vertical ? s.point.x - s.start.x : s.point.y - s.start.y) * .05, -3, 3);
      const px = c.geo.vertical ? side : away, py = c.geo.vertical ? away : side;
      s.sx += (px - s.sx) * (1 - Math.exp(-dt / .05)); s.sy += (py - s.sy) * (1 - Math.exp(-dt / .05));
      unsettled = Math.abs(want - s.theta) > .0003 || Math.hypot(px - s.sx, py - s.sy) > .03;
      if (snapBridges(stamp) === 0) {s.phase = 'free'; s.bv -= 150; unsettled = true;}
    } else if (s.phase === 'free') {
      const cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign), gx = s.grab.x - s.hinge.x, gy = s.grab.y - s.hinge.y;
      const wx = s.point.x - s.hinge.x - (gx * cos - gy * sin), wy = s.point.y - s.hinge.y - (gx * sin + gy * cos), hang = limit * .55 + clamp(s.pvx * .0009 * s.sign, -.3, .3);
      s.sx += (wx - s.sx) * (1 - Math.exp(-dt / .045)); s.sy += (wy - s.sy) * (1 - Math.exp(-dt / .045)); s.theta += (hang - s.theta) * (1 - Math.exp(-dt / .12));
      unsettled = Math.hypot(wx - s.sx, wy - s.sy) > .06 || Math.abs(hang - s.theta) > .0004;
    } else if (s.phase === 'drop') {
      s.age = Math.max(0, (stamp - s.phaseStartedAt) / 1000); s.vy += GRAVITY * dt; s.sx += s.vx * dt; s.sy += s.vy * dt; s.theta += s.spin * dt;
      if (s.age > .16) s.fade = clamp(1 - (s.age - .16) / .42, 0, 1);
      if (s.fade <= 0) {finish(); return;} unsettled = true;
    } else if (s.phase === 'return') {
      s.thetaV += (-300 * s.theta - 24 * s.thetaV) * dt; s.theta += s.thetaV * dt; s.sx *= Math.exp(-dt / .07); s.sy *= Math.exp(-dt / .07);
      unsettled = Math.abs(s.theta) > .0008 || Math.abs(s.thetaV) > .01 || Math.hypot(s.sx, s.sy) > .05;
      if (!unsettled) {s.theta = s.thetaV = s.sx = s.sy = 0; s.phase = 'idle'; s.snapped = []; s.snapAt = []; s.span = [];}
    }
    s.bv += (-520 * s.bx - 30 * s.bv) * dt; s.bx += s.bv * dt;
    const ease = 1 - Math.exp(-dt / .085); s.tiltX += (s.targetX - s.tiltX) * ease; s.tiltY += (s.targetY - s.tiltY) * ease;
    const tilting = Math.abs(s.targetX - s.tiltX) + Math.abs(s.targetY - s.tiltY) > .015;
    if (!tilting) {s.tiltX = s.targetX; s.tiltY = s.targetY;}
    const recoil = Math.abs(s.bx) > .02 || Math.abs(s.bv) > .5; if (!recoil) s.bx = s.bv = 0;
    const fibresMoving = paint(stamp);
    if (unsettled || recoil || fibresMoving || tilting) run();
  }
  function run() {const s = sim.current; if (!mounted.current || s.finished || s.raf !== null || rootRef.current?.ownerDocument.hidden) return; if (!s.last) s.last = now(); s.raf = win().requestAnimationFrame(step);}
  function cancelPull(instant = false) {
    const s = sim.current; if (s.finished || s.committed) return;
    releaseCapture(); setGrabbing(false); s.targetX = s.targetY = 0; s.snapped = []; s.snapAt = []; s.span = [];
    if (instant || cfg.current.reduce) reset(false); else {s.phase = 'return'; s.thetaV = 0; run();}
  }
  function beginTear() {
    const s = sim.current, c = cfg.current;
    if (!mounted.current || c.disabled || c.used || s.finished || s.committed || s.id !== null) return false;
    stopFrame(); s.phase = 'auto'; s.phaseStartedAt = now(); s.committed = true; s.age = 0; s.theta = s.thetaV = s.sx = s.sy = 0; s.fade = 1; s.snapped = []; s.snapAt = []; s.span = []; s.targetX = s.targetY = 0;
    const hinge = c.geo.ends[1]; s.hinge = {x: hinge.x, y: hinge.y}; s.hingeV = hinge.v; s.sign = c.geo.vertical ? -1 : 1;
    if (stubRef.current) stubRef.current.style.transformOrigin = `${hinge.x}px ${hinge.y}px`;
    setCommitting(true); if (c.reduce) finish(); else run(); return true;
  }
  useImperativeHandle(ref, () => ({tear: beginTear}), []);

  useClientLayoutEffect(() => {
    const root = rootRef.current; if (!root) return; mounted.current = true; const owner = root.ownerDocument, browser = owner.defaultView; ownerWindow.current = browser;
    const query = browser.matchMedia?.('(prefers-reduced-motion: reduce)'), motion = () => setSystemReduced(Boolean(query?.matches)); motion(); query?.addEventListener?.('change', motion);
    const visibility = () => {
      if (owner.hidden) {stopFrame(); if (!sim.current.committed && sim.current.phase !== 'idle') cancelPull(true); sim.current.targetX = sim.current.targetY = sim.current.tiltX = sim.current.tiltY = 0; paint(now());}
      else if (sim.current.committed) run();
    };
    owner.addEventListener('visibilitychange', visibility); paint(now());
    return () => {mounted.current = false; stopFrame(); releaseCapture(); query?.removeEventListener?.('change', motion); owner.removeEventListener('visibilitychange', visibility);};
  }, []);
  useClientLayoutEffect(() => {
    const root = rootRef.current; if (!root) return;
    const browser = root.ownerDocument.defaultView;
    const measure = () => {
      const measured = root.clientWidth || root.getBoundingClientRect().width; if (!measured) return;
      const next = Math.min(1, measured / W); if (Math.abs(next - fitRef.current) < .001) return;
      if (sim.current.id !== null) cancelPull(true); fitRef.current = next; setFit(next);
    };
    measure(); const observer = browser.ResizeObserver ? new browser.ResizeObserver(measure) : null; observer?.observe(root); if (!observer) browser.addEventListener('resize', measure);
    return () => {observer?.disconnect(); if (!observer) browser.removeEventListener('resize', measure);};
  }, [W]);
  useEffect(() => {
    // Responsive ticket dimensions may change after an explicit opening has
    // committed. Finish that cycle before rebuilding; a held, uncommitted pull
    // still returns intact and never emits onTear.
    if (!used && sim.current.committed && !sim.current.finished) finish();
    reset(false);
  }, [geo]);
  useEffect(() => {
    const wasUsed = previousUsed.current; previousUsed.current = used;
    if (used) {stopFrame(); releaseCapture(); sim.current.finished = true; sim.current.phase = 'idle'; sim.current.committed = false; sim.current.fade = 0; setComplete(true); setGrabbing(false); setCommitting(false); paint(now());}
    else if (wasUsed) reset(true);
  }, [used]);
  useEffect(() => {if (disabled && !sim.current.finished) reset(false);}, [disabled]);
  useEffect(() => {if (!tilt) sim.current.targetX = sim.current.targetY = 0; paint(now()); if (!tilt && !cfg.current.reduce) run();}, [tilt, tiltMax, parallax, perspective, rotate]);
  useEffect(() => {
    if (previousReduce.current === reduce) return; previousReduce.current = reduce;
    if (reduce) {sim.current.targetX = sim.current.targetY = sim.current.tiltX = sim.current.tiltY = 0; if (sim.current.committed) finish(); else cancelPull(true); paint(now());}
  }, [reduce]);

  function local(event) {const rect = stageRef.current.getBoundingClientRect(), scale = rect.width / W || 1; return {x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale};}
  function onStubDown(event) {
    const s = sim.current, c = cfg.current;
    if (c.disabled || c.used || s.finished || s.committed || event.button !== 0 || s.id !== null) return;
    stopFrame(); const p = local(event), end = c.geo.ends[(c.geo.vertical ? p.x : p.y) < c.geo.cross / 2 ? 1 : 0];
    s.id = event.pointerId; s.start = s.point = s.grab = p; s.pt = now(); s.pvx = s.pvy = 0; s.theta = s.thetaV = s.sx = s.sy = 0; s.fade = 1; s.snapped = []; s.snapAt = []; s.span = [];
    s.sign = ((c.geo.vertical ? p.x : p.y) < c.geo.cross / 2 ? 1 : -1) * (c.geo.vertical ? -1 : 1); s.hinge = {x: end.x, y: end.y}; s.hingeV = end.v;
    s.a0 = Math.atan2(p.y - end.y, p.x - end.x); s.phase = 'held'; s.targetX = s.targetY = 0;
    if (stubRef.current) stubRef.current.style.transformOrigin = `${end.x}px ${end.y}px`;
    try {event.currentTarget.setPointerCapture(event.pointerId);} catch {}
    setGrabbing(true); run();
  }
  function onStubMove(event) {
    const s = sim.current; if (s.id !== event.pointerId) return;
    event.preventDefault(); const p = local(event), time = now(), dt = Math.max(.004, (time - s.pt) / 1000);
    s.pvx += ((p.x - s.point.x) / dt - s.pvx) * .35; s.pvy += ((p.y - s.point.y) / dt - s.pvy) * .35; s.pt = time; s.point = p;
    if (!cfg.current.reduce) run();
  }
  function onStubUp(event, cancelled = false) {
    const s = sim.current; if (s.id !== event.pointerId) return;
    releaseCapture(); setGrabbing(false);
    if (cancelled) {cancelPull(); return;}
    // a tap on the stub tears it too (dragging is the fun way, not the only way)
    if (Math.hypot(s.point.x - s.start.x, s.point.y - s.start.y) < 10 && s.phase !== 'free') {s.id = null; s.phase = 'idle'; beginTear(); return;}
    if (cfg.current.reduce) {
      if (Math.hypot(s.point.x - s.start.x, s.point.y - s.start.y) > 28) {s.committed = true; finish();} else cancelPull(true);
    } else if (s.phase === 'free') drop();
    else {s.phase = 'return'; s.thetaV = 0; run();}
  }
  function onTiltMove(event) {
    const c = cfg.current, s = sim.current; if (!c.tilt || c.reduce || c.disabled || c.used || s.id !== null || s.committed || event.pointerType === 'touch') return;
    const rect = rootRef.current.getBoundingClientRect(); s.targetY = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width / 2 + c.tiltReach), -1, 1) * c.tiltMax; s.targetX = -clamp((event.clientY - rect.top - rect.height / 2) / (rect.height / 2 + c.tiltReach), -1, 1) * c.tiltMax; run();
  }
  const resetTilt = () => {sim.current.targetX = sim.current.targetY = 0; if (!sim.current.finished) run();};

  return <div ref={rootRef} className={['tear-ticket', className].filter(Boolean).join(' ')} data-used={effectiveUsed ? '' : undefined} data-orientation={vertical ? 'vertical' : 'horizontal'} data-shift={effectiveUsed && recenter ? vertical ? 'y' : 'x' : undefined} data-instant={reduce ? '' : undefined} data-grabbing={grabbing ? '' : undefined} data-tearing={committing ? '' : undefined} data-disabled={disabled ? '' : undefined} onPointerMove={onTiltMove} onPointerLeave={resetTilt}
    style={{'--tt-w': `${W}px`, '--tt-h': `${H}px`, '--tt-stub': `${S}px`, '--tt-bg': background, '--tt-stub-bg': stubBackground || background, '--tt-ink': color, '--tt-edge': borderColor || `color-mix(in srgb, ${color} 25%, transparent)`, '--tt-edge-w': Math.max(0, number(borderWidth, 1)), '--tt-parallax': `${cfg.current.parallax}px`, '--tt-body-w': `${vertical ? W : W - S}px`, '--tt-body-h': `${vertical ? H - S : H}px`, '--tt-inset': '8px', '--tt-span': .78, '--tt-art-radius': `${Math.max(0, number(imageRadius, 8))}px`, '--tt-fit': fit, height: `${H * fit}px`}}>
    <div ref={stageRef} className="tear-ticket__stage"><div ref={planeRef} className="tear-ticket__plane" style={{transform: `perspective(${cfg.current.perspective}px) rotate(${cfg.current.rotate}deg)`}}>
      <div ref={bodyRef} className="tear-ticket__piece">
        <div className="tear-ticket__paper" style={{clipPath: `path('${geo.body}')`}}>
          {image && <div className={'tear-ticket__art' + (imageCrop === 'triptych-left' ? ' is-triptych' : '')}><img ref={artRef} className="tear-ticket__image" src={image} alt={imageAlt} draggable="false" loading="lazy" decoding="async"/>{scrim && <span className="tear-ticket__scrim"/>}</div>}
          <div ref={inkRef} className="tear-ticket__content">{children}</div>
        </div>
        {border && <svg className="tear-ticket__edge" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><path d={geo.bodyOutline}/></svg>}
      </div>
      <svg className="tear-ticket__fibres" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">{geo.bridges.map((_, index) => <g key={index}><path ref={node => {fibres.current[index * 2] = node;}}/><path ref={node => {fibres.current[index * 2 + 1] = node;}}/></g>)}</svg>
      <div ref={stubRef} className="tear-ticket__piece tear-ticket__piece--stub" role="button" tabIndex={disabled || effectiveUsed ? -1 : 0} aria-label={ariaLabel} aria-hidden={effectiveUsed || undefined} aria-disabled={disabled || effectiveUsed || committing || undefined}
        onPointerDown={onStubDown} onPointerMove={onStubMove} onPointerUp={event => onStubUp(event)} onPointerCancel={event => onStubUp(event, true)} onLostPointerCapture={event => onStubUp(event, true)}
        onKeyDown={event => {if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {event.preventDefault(); beginTear();}}}
        onClick={() => beginTear()} onBlur={resetTilt} onDragStart={event => event.preventDefault()}>
        <div className="tear-ticket__paper tear-ticket__paper--stub" style={{clipPath: `path('${geo.stub}')`}}><div className="tear-ticket__stub">{stub}</div></div>
        {border && <svg className="tear-ticket__edge" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><path d={geo.stubOutline}/></svg>}
      </div>
    </div></div>
    <span className="tear-ticket__sr" role="status" aria-live="polite">{effectiveUsed ? 'Ticket torn' : committing ? 'Tearing the ticket' : ''}</span>
  </div>;
});

export default TearTicket;
