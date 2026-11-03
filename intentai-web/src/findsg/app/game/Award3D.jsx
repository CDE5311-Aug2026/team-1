// Award3D — a spinnable brass "case closed" medal rendered with three.js.
// Fills its parent box. Falls back to a flat CSS medal when WebGL is missing.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import './award-3d.css';

const TEX = 1024; // face texture size (px)
const FONT = "Oswald, 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";
const INK = '#4a2c0c'; // dark bronze lettering
const GOLD_HI = '#f0cf7a';
const GOLD_MID = '#d2a446';
const GOLD_LO = '#9c6f24';

const R_FACE = 0.8; // radius of the recessed face disc (world units)
const Z_FACE = 0.075; // face depth from coin centre
const IDLE_SPEED = 0.42; // rad/s turntable
const IDLE_DELAY = 2600; // ms of calm before the idle spin resumes
const FLIP_MS = 760;
const DROP_MS = 900;
const TAP_PX = 8;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Height of the medal during the entrance: a fall, then a small bounce.
function dropOffset(t, h) {
  if (t >= 1) return 0;
  const fall = 0.58;
  if (t < fall) {
    const u = t / fall;
    return h * (1 - u * u);
  }
  const u = (t - fall) / (1 - fall);
  return 0.2 * Math.abs(Math.sin(Math.PI * 2 * u)) * (1 - u) * (1 - u);
}

/* ------------------------------------------------------------------ */
/* 2D face painting. Each face is painted twice: once in colour (gold  */
/* field + bronze ink) and once as a bump map (black field, white ink) */
/* so the lettering reads as raised relief.                            */
/* ------------------------------------------------------------------ */

function setFont(ctx, weight, px) {
  ctx.font = `${weight} ${px}px ${FONT}`;
}

function spacedWidth(ctx, text, spacing) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return Math.max(0, w - spacing);
}

function drawSpaced(ctx, text, cx, y, spacing) {
  let x = cx - spacedWidth(ctx, text, spacing) / 2;
  ctx.textAlign = 'left';
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
}

// Text along a circle. top=true: centred at 12 o'clock, letters point out.
// top=false: centred at 6 o'clock, upright, letters point in.
function drawArc(ctx, text, r, top, spacing) {
  const c = TEX / 2;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (widths.length - 1);
  let acc = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  [...text].forEach((ch, i) => {
    const mid = (acc + widths[i] / 2 - total / 2) / r;
    const a = top ? -Math.PI / 2 + mid : Math.PI / 2 - mid;
    ctx.save();
    ctx.translate(c + r * Math.cos(a), c + r * Math.sin(a));
    ctx.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    acc += widths[i] + spacing;
  });
}

// Fit a font size so the arc text spans at most maxAngle radians.
function fitArcFont(ctx, text, weight, px, minPx, r, spacing, maxAngle) {
  let size = px;
  for (;;) {
    setFont(ctx, weight, size);
    const w = spacedWidth(ctx, text, spacing);
    if (w / r <= maxAngle || size <= minPx) return size;
    size -= 2;
  }
}

function diamond(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s, y);
  ctx.closePath();
  ctx.fill();
}

function rule(ctx, y, half) {
  const c = TEX / 2;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(c - half, y);
  ctx.lineTo(c - 26, y);
  ctx.moveTo(c + 26, y);
  ctx.lineTo(c + half, y);
  ctx.stroke();
  diamond(ctx, c, y, 13);
}

function paintField(ctx, bump) {
  const c = TEX / 2;
  ctx.clearRect(0, 0, TEX, TEX);
  if (bump) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, TEX, TEX);
  } else {
    const g = ctx.createRadialGradient(c * 0.82, c * 0.7, 40, c, c, c * 1.05);
    g.addColorStop(0, GOLD_HI);
    g.addColorStop(0.55, GOLD_MID);
    g.addColorStop(1, GOLD_LO);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX, TEX);
    // faint turned-metal rings
    ctx.lineWidth = 1.5;
    for (let r = 24; r < c; r += 9) {
      ctx.strokeStyle = r % 2 ? 'rgba(255,240,200,0.07)' : 'rgba(90,55,10,0.06)';
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function paintBorder(ctx) {
  const c = TEX / 2;
  // beaded ring
  const n = 84;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(c + 482 * Math.cos(a), c + 482 * Math.sin(a), 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, 452, 0, Math.PI * 2);
  ctx.stroke();
}

function paintFront(ctx, p, bump) {
  const c = TEX / 2;
  const ink = bump ? '#fff' : INK;
  paintField(ctx, bump);
  ctx.save();
  if (bump) {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 7;
  }
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  paintBorder(ctx);

  // FINDSG along the top
  setFont(ctx, 600, 68);
  drawArc(ctx, 'FINDSG', 372, true, 22);
  // side diamonds between the arcs
  diamond(ctx, c - 396, c, 12);
  diamond(ctx, c + 396, c, 12);

  // big check mark (stroked path)
  ctx.lineWidth = 62;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(c - 150, c - 52);
  ctx.lineTo(c - 48, c + 50);
  ctx.lineTo(c + 158, c - 160);
  ctx.stroke();

  // CASE {no}
  setFont(ctx, 600, 128);
  ctx.textBaseline = 'alphabetic';
  drawSpaced(ctx, `CASE ${p.no}`, c, c + 222, 8);

  // area along the bottom, small caps
  const area = String(p.area || '').toUpperCase();
  if (area) {
    const size = fitArcFont(ctx, area, 600, 62, 36, 420, 9, 2.5);
    drawArc(ctx, area, 420, false, size > 48 ? 9 : 6);
  }
  ctx.restore();
}

function paintBack(ctx, p, bump) {
  const c = TEX / 2;
  const ink = bump ? '#fff' : INK;
  paintField(ctx, bump);
  ctx.save();
  if (bump) {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 7;
  }
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  paintBorder(ctx);

  ctx.textBaseline = 'alphabetic';
  setFont(ctx, 600, 150);
  drawSpaced(ctx, 'CASE', c, c - 92, 14);
  drawSpaced(ctx, 'CLOSED', c, c + 70, 10);

  rule(ctx, c + 128, 210);

  const n = Number(p.stops) || 0;
  setFont(ctx, 600, 96);
  drawSpaced(ctx, `${n} ${n === 1 ? 'STOP' : 'STOPS'}`, c, c + 252, 8);

  setFont(ctx, 600, 64);
  drawArc(ctx, p.mode === 'manual' ? 'ON SITE' : 'REMOTE', 420, false, 14);
  diamond(ctx, c - 396, c, 12);
  diamond(ctx, c + 396, c, 12);
  ctx.restore();
}

/* ------------------------------------------------------------------ */

function makeFaceTextures(paint) {
  const color = document.createElement('canvas');
  const bump = document.createElement('canvas');
  color.width = color.height = bump.width = bump.height = TEX;
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bump);
  const draw = (props) => {
    const c1 = color.getContext('2d');
    const c2 = bump.getContext('2d');
    if (!c1 || !c2) return;
    paint(c1, props, false);
    paint(c2, props, true);
    map.needsUpdate = true;
    bumpMap.needsUpdate = true;
  };
  return { map, bumpMap, draw };
}

// Cross-section of the raised, bevelled rim, revolved around the coin axis.
function rimGeometry() {
  const pts = [
    [R_FACE, -Z_FACE],
    [0.83, -0.118],
    [0.875, -0.135],
    [0.94, -0.132],
    [0.985, -0.11],
    [1.0, -0.075],
    [1.0, 0.075],
    [0.985, 0.11],
    [0.94, 0.132],
    [0.875, 0.135],
    [0.83, 0.118],
    [R_FACE, Z_FACE],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 128);
  g.rotateX(Math.PI / 2); // lathe axis Y -> Z (towards the camera)
  return g;
}

function shadowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(58,36,12,0.55)');
    g.addColorStop(0.45, 'rgba(58,36,12,0.28)');
    g.addColorStop(1, 'rgba(58,36,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// One cheap WebGL2 probe per page load (three r170 needs WebGL2). Avoids
// three's console errors when WebGL is missing, and caches the answer
// across mounts.
let glProbe = null;
function hasWebGL2() {
  if (glProbe !== null) return glProbe;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    glProbe = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    glProbe = false;
  }
  return glProbe;
}

function FlatMedal({ no, area }) {
  return (
    <div className="aw3-flat" aria-hidden="true">
      <div className="aw3-flat-coin">
        <span className="aw3-flat-brand">FINDSG</span>
        <svg className="aw3-flat-check" viewBox="0 0 100 70">
          <path d="M14 36 L36 57 L86 10" />
        </svg>
        <span className="aw3-flat-case">CASE {no}</span>
        <span className="aw3-flat-area">{area}</span>
      </div>
      <div className="aw3-flat-shadow" />
    </div>
  );
}

export default function Award3D({ no, area, stops, mode, reducedMotion = false, className = '' }) {
  const wrapRef = useRef(null);
  const [fallback, setFallback] = useState(false);
  const propsRef = useRef({ no, area, stops, mode });
  propsRef.current = { no, area, stops, mode };
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  const repaintRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || fallback) return undefined;

    if (!hasWebGL2()) {
      setFallback(true);
      return undefined;
    }
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setFallback(true);
      return undefined;
    }

    let disposed = false;
    const canvas = renderer.domElement;
    canvas.className = 'aw3-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    wrap.appendChild(canvas);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envRT = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    scene.environment = envRT.texture;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    const CAM_D = 5.2;
    camera.position.set(0, 0.42, CAM_D);
    camera.lookAt(0, -0.1, 0);

    // warm key + fill, low ambient
    const key = new THREE.DirectionalLight(0xffe0b0, 2.4);
    key.position.set(-2.5, 3, 4);
    const fill = new THREE.DirectionalLight(0xffd29a, 0.7);
    fill.position.set(3, 0.5, 2);
    const rimLight = new THREE.DirectionalLight(0xfff1d6, 0.9);
    rimLight.position.set(0.5, 2, -3);
    scene.add(key, fill, rimLight, new THREE.AmbientLight(0xfff0d8, 0.25));

    // medal
    const pivot = new THREE.Group(); // handles drop / hop
    const coin = new THREE.Group(); // handles spin
    pivot.add(coin);
    scene.add(pivot);

    const brass = { color: 0xd2a446, metalness: 0.85, roughness: 0.35, envMapIntensity: 1.0 };
    const rimMat = new THREE.MeshStandardMaterial({ ...brass, roughness: 0.3 });
    coin.add(new THREE.Mesh(rimGeometry(), rimMat));

    const front = makeFaceTextures(paintFront);
    const back = makeFaceTextures(paintBack);
    const faceGeo = new THREE.CircleGeometry(R_FACE, 128);
    const faceMat = (t) =>
      new THREE.MeshStandardMaterial({
        ...brass,
        color: 0xffffff,
        map: t.map,
        bumpMap: t.bumpMap,
        bumpScale: 2.2,
      });
    const frontMat = faceMat(front);
    const backMat = faceMat(back);
    const frontMesh = new THREE.Mesh(faceGeo, frontMat);
    frontMesh.position.z = Z_FACE;
    const backMesh = new THREE.Mesh(faceGeo, backMat);
    backMesh.position.z = -Z_FACE;
    backMesh.rotation.y = Math.PI;
    coin.add(frontMesh, backMesh);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    [front.map, front.bumpMap, back.map, back.bumpMap].forEach((t) => {
      t.anisotropy = Math.min(8, maxAniso);
    });

    const repaint = () => {
      if (disposed) return;
      front.draw(propsRef.current);
      back.draw(propsRef.current);
    };
    repaintRef.current = repaint;
    repaint();
    const fonts = document.fonts;
    if (fonts && typeof fonts.load === 'function') {
      fonts
        .load(`600 40px Oswald`)
        .then(() => repaint())
        .catch(() => {});
    }

    // soft contact shadow
    const shadowTex = shadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.16;
    scene.add(shadow);

    // sizing
    const resize = () => {
      const w = wrap.clientWidth || 1;
      const h = wrap.clientHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      const aspect = w / h;
      const halfH = 1.4;
      const halfW = 1.18;
      const need = Math.max(halfH, halfW / aspect);
      camera.aspect = aspect;
      camera.fov = (2 * Math.atan(need / CAM_D) * 180) / Math.PI;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap);

    // motion state
    const st = {
      angle: reducedRef.current ? 0 : -0.9,
      vel: 0,
      idle: reducedRef.current ? 0 : 1,
      lastInteract: -Infinity,
      flip: null,
      down: null,
      dropStart: reducedRef.current ? -Infinity : null,
    };

    const now = () => performance.now();

    const startFlip = () => {
      const t = now();
      const a = st.angle;
      const showingFront = Math.cos(a) >= 0;
      const base = showingFront ? Math.PI : 0;
      const TWO = Math.PI * 2;
      const diff = (((base - a) % TWO) + TWO) % TWO;
      st.flip = { from: a, to: a + diff, t0: t, dur: reducedRef.current ? 420 : FLIP_MS };
      st.vel = 0;
      st.idle = 0;
      st.lastInteract = t;
    };

    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      st.down = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        x: e.clientX,
        moved: false,
        samples: [{ t: now(), a: st.angle }],
      };
      st.vel = 0;
      st.idle = 0;
      st.lastInteract = now();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e) => {
      const d = st.down;
      if (!d || d.id !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) >= TAP_PX) {
        d.moved = true;
        st.flip = null;
      }
      if (d.moved) {
        const k = 2.6 / Math.max(160, wrap.clientWidth);
        st.angle += (e.clientX - d.x) * k;
        const t = now();
        d.samples.push({ t, a: st.angle });
        while (d.samples.length > 2 && t - d.samples[0].t > 90) d.samples.shift();
      }
      d.x = e.clientX;
      st.lastInteract = now();
    };
    const onUp = (e) => {
      const d = st.down;
      if (!d || d.id !== e.pointerId) return;
      st.down = null;
      st.lastInteract = now();
      if (!d.moved) {
        startFlip();
        return;
      }
      const s0 = d.samples[0];
      const s1 = d.samples[d.samples.length - 1];
      const dt = (s1.t - s0.t) / 1000;
      if (dt > 0 && now() - s1.t < 80) {
        st.vel = Math.max(-12, Math.min(12, (s1.a - s0.a) / dt));
      }
    };
    const onCancel = (e) => {
      if (st.down && st.down.id === e.pointerId) st.down = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);

    // render loop
    let raf = 0;
    let last = 0;
    const DROP_H = 2.4;
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      const reduced = reducedRef.current;
      if (st.dropStart === null) st.dropStart = t;

      let lift = 0;
      if (st.flip) {
        const f = st.flip;
        const u = Math.min(1, (t - f.t0) / f.dur);
        st.angle = f.from + (f.to - f.from) * easeInOutCubic(u);
        lift = reduced ? 0 : 0.1 * Math.sin(Math.PI * u);
        if (u >= 1) st.flip = null;
      } else if (!st.down) {
        st.vel *= Math.exp(-dt * 3.6);
        if (Math.abs(st.vel) < 0.01) st.vel = 0;
        st.angle += st.vel * dt;
        const calm = t - st.lastInteract > IDLE_DELAY;
        const target = !reduced && calm ? 1 : 0;
        st.idle += (target - st.idle) * Math.min(1, dt * (target ? 0.8 : 6));
        st.angle += IDLE_SPEED * st.idle * dt;
      }
      // keep the angle bounded without visual jumps
      if (!st.flip && Math.abs(st.angle) > 1000) st.angle %= Math.PI * 2;

      const dropU = reduced ? 1 : Math.min(1, (t - st.dropStart) / DROP_MS);
      const y = dropOffset(dropU, DROP_H) + lift;
      pivot.position.y = y;
      coin.rotation.y = st.angle;
      coin.rotation.x = -0.04;

      const near = Math.max(0, 1 - y / 1.6);
      const spread = 0.55 + 0.45 * Math.abs(Math.cos(st.angle));
      shadow.scale.set((1.35 + 0.65 * spread) * (0.6 + 0.4 * near), 0.55 * (0.6 + 0.4 * near), 1);
      shadowMat.opacity = 0.25 + 0.75 * near;

      renderer.render(scene, camera);
    };
    const start = () => {
      if (raf || disposed) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    const onLost = (e) => {
      e.preventDefault();
      stop();
    };
    const onRestored = () => {
      repaint();
      if (!document.hidden) start();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    if (!document.hidden) start();

    return () => {
      disposed = true;
      stop();
      repaintRef.current = null;
      document.removeEventListener('visibilitychange', onVis);
      ro?.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      [rimMat, frontMat, backMat, shadowMat].forEach((m) => m.dispose());
      [front.map, front.bumpMap, back.map, back.bumpMap, shadowTex].forEach((tx) => tx.dispose());
      envRT.dispose();
      scene.environment = null;
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [fallback]);

  // repaint faces when the text props change (no remount, no re-entrance)
  useEffect(() => {
    repaintRef.current?.();
  }, [no, area, stops, mode]);

  return (
    <div
      ref={wrapRef}
      className={`aw3-root${fallback ? ' aw3-root--flat' : ''}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`Award for case ${no}, ${area}. Drag to turn it.`}
    >
      {fallback ? <FlatMedal no={no} area={area} /> : null}
    </div>
  );
}
