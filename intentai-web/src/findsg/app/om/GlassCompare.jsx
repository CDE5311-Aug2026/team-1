/* Only One Missing: the lot (the genuine bottle base) beside the case piece (the cast copy). From above they match;
 * tip them over together and three things differ: the hook on the edge, the bubbles in the glass, the mould seam.
 * The scene only reports taps; the quest decides what a find means. */
import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import './glass-compare.css';

const IDS = ['edge', 'bubbles', 'seam'];
const TAP_SLOP = 8;
const SPACING = 4.45; // cm from the middle to each piece
const PLINTH_R = 3.75;
const CAM_PITCH = THREE.MathUtils.degToRad(35);
const HOOK_PHI = Math.PI; // the hook sits on the far side (-z) at the start
const BUBBLE_PHI = 0; // the bubbles near side (+z), low in the heel
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = (i) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

/** The broken upper edge: the same on both pieces, so the top matches. */
const rimLift = (phi) => 0.16 * Math.sin(3 * phi + 0.7) + 0.09 * Math.sin(7 * phi + 2.1) + 0.05 * Math.sin(13 * phi + 0.4) - 0.08;

/* Cross-section of a thick bottle base (cm, radius x height), counter-clockwise: underside from the punt's middle out to
 * the resting ring, up the outer wall, over the broken edge, down the inside, across the floor, up the punt. */
const PROFILE = [
  [0, 1.0], [0.55, 0.975], [1.1, 0.82], [1.6, 0.48], [1.95, 0.16], [2.3, 0.03], [2.6, 0.0], [2.82, 0.07], [2.96, 0.3],
  [3.0, 0.7], [2.98, 1.3], [2.95, 1.78], [2.92, 1.92], [2.84, 2.0], [2.74, 1.99], [2.67, 1.9], [2.64, 1.4], [2.58, 0.9],
  [2.42, 0.68], [2.1, 0.66], [1.7, 0.82], [1.2, 1.15], [0.6, 1.42], [0, 1.5],
];
const UNDER = [[3.0, 0.55], [2.96, 0.3], [2.82, 0.07], [2.6, 0.0], [2.3, 0.03], [1.95, 0.16], [1.6, 0.48], [1.1, 0.82], [0.55, 0.975], [0, 1.0]];
const HOOK_Y = 2.0 + rimLift(HOOK_PHI);
/** Height of the underside at a radius. */
const underY = (r) => {
  for (let i = UNDER.length - 1; i > 0; i--) {
    const [r0, y0] = UNDER[i], [r1, y1] = UNDER[i - 1];
    if (r <= r1) return y0 + (y1 - y0) * ((r - r0) / (r1 - r0));
  }
  return UNDER[0][1];
};

class GlassScene {
  constructor(host, {getProps, labels}) {
    this.host = host; this.getProps = getProps; this.labels = labels;
    this.win = host.ownerDocument.defaultView;
    this.geometries = new Set(); this.materials = new Set(); this.textures = new Set();
    this.cleanup = []; this.raf = 0; this.disposed = false;
    this.yaw = 0; this.pitch = 0; this.quat = new THREE.Quaternion();
    this.markers = new Map(); this.found = new Set();
    this.reduced = !!this.win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.render = this.render.bind(this);
    try {
      const r = this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'});
      r.setPixelRatio(Math.min(this.win.devicePixelRatio || 1, 1.6));
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.12;
      r.domElement.className = 'gc-canvas';
      r.domElement.setAttribute('aria-hidden', 'true');
      host.appendChild(r.domElement);
      this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#142219');
      this.scene.fog = new THREE.Fog('#142219', 46, 90);
      this.camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);
      const pmrem = new THREE.PMREMGenerator(r); const room = new RoomEnvironment();
      this.envTarget = pmrem.fromScene(room, 0.035); this.scene.environment = this.envTarget.texture;
      room.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); pmrem.dispose();
      this.build();
      this.bindPointer();
      this.resize = this.resize.bind(this);
      if (this.win.ResizeObserver) { this.ro = new this.win.ResizeObserver(this.resize); this.ro.observe(host); }
      else { this.win.addEventListener('resize', this.resize); this.cleanup.push(() => this.win.removeEventListener('resize', this.resize)); }
      const lost = (e) => { e.preventDefault(); this.lost = true; };
      r.domElement.addEventListener('webglcontextlost', lost, false);
      this.cleanup.push(() => r.domElement.removeEventListener('webglcontextlost', lost));
      this.resize();
    } catch (error) { this.dispose(); throw error; }
  }

  geo(g) { this.geometries.add(g); return g; }
  mat(m) { this.materials.add(m); return m; }
  tex(t) { this.textures.add(t); return t; }
  canvasTexture(size, draw, color = true) {
    const c = this.host.ownerDocument.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'); if (ctx) draw(ctx, size);
    const t = this.tex(new THREE.CanvasTexture(c)); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  build() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#e8f0d8', '#0e1a12', 0.35));
    const key = new THREE.DirectionalLight('#fff4e0', 1.6); key.position.set(-6, 14, 9); s.add(key);
    const rim = new THREE.DirectionalLight('#cfe8ff', 0.9); rim.position.set(8, 6, -10); s.add(rim);

    const felt = this.canvasTexture(256, (ctx, n) => {
      ctx.fillStyle = '#26402c'; ctx.fillRect(0, 0, n, n);
      for (let i = 0; i < 5200; i++) { ctx.fillStyle = i % 2 ? 'rgba(160,190,140,.07)' : 'rgba(0,10,4,.16)'; ctx.fillRect(rand(i) * n, rand(i + 9e3) * n, 1, 1 + rand(i + 3) * 2); }
    });
    felt.wrapS = felt.wrapT = THREE.RepeatWrapping; felt.repeat.set(2, 2);
    const tableTex = felt.clone(); this.tex(tableTex); tableTex.repeat.set(9, 9);
    const table = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(160, 160)), this.mat(new THREE.MeshStandardMaterial({color: '#4a5f48', map: tableTex, roughness: 1})));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.95; s.add(table);

    this.shadowTex = this.canvasTexture(128, (ctx, n) => {
      const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      g.addColorStop(0, 'rgba(2,12,5,.85)'); g.addColorStop(0.45, 'rgba(3,16,7,.5)'); g.addColorStop(1, 'rgba(3,16,7,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
    });
    const plinthGeo = this.geo(new THREE.CylinderGeometry(PLINTH_R, PLINTH_R + 0.15, 0.9, 72));
    const plinthMat = this.mat(new THREE.MeshStandardMaterial({color: '#9cbc90', map: felt, roughness: 0.97}));
    const trimGeo = this.geo(new THREE.TorusGeometry(PLINTH_R + 0.02, 0.05, 8, 96));
    const brass = this.mat(new THREE.MeshStandardMaterial({color: '#c99a42', metalness: 1, roughness: 0.32}));

    this.glass = this.mat(new THREE.MeshPhysicalMaterial({
      color: '#b4dc8a', transmission: 1, thickness: 0.9, roughness: 0.07, ior: 1.52, metalness: 0,
      attenuationColor: '#7aae45', attenuationDistance: 2.2, specularIntensity: 1, envMapIntensity: 1.1,
    }));
    this.seamMat = this.mat(new THREE.MeshPhysicalMaterial({color: '#a6cf7e', transmission: 0.45, thickness: 0.2, roughness: 0.18, clearcoat: 1, envMapIntensity: 1.6}));
    this.bubbleMat = this.mat(new THREE.MeshPhysicalMaterial({
      color: '#eef8dc', emissive: '#2c4a1c', metalness: 0.65, roughness: 0.04, envMapIntensity: 1.8,
      transparent: true, opacity: 0, depthTest: false, depthWrite: false,
    }));
    this.zoneMat = this.mat(new THREE.MeshBasicMaterial({visible: false}));
    this.stamp = this.canvasTexture(128, (ctx, n) => {
      ctx.translate(n / 2, n / 2); ctx.rotate(-0.25);
      ctx.strokeStyle = 'rgba(206,32,28,.95)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.stroke();
      ctx.globalCompositeOperation = 'destination-out'; // worn rubber
      for (let i = 0; i < 260; i++) { const a = rand(i) * Math.PI * 2, d = 32 + rand(i + 50) * 24; ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1 + rand(i + 7) * 3, 1 + rand(i + 8) * 2); }
    });
    this.stampMat = this.mat(new THREE.SpriteMaterial({map: this.stamp, transparent: true, depthTest: false, depthWrite: false}));

    this.pieces = [];
    this.bodies = []; this.zones = [];
    [['lot', -SPACING, true], ['case', SPACING, false]].forEach(([name, x, genuine]) => {
      const stand = new THREE.Group(); stand.position.x = x; s.add(stand);
      const plinth = new THREE.Mesh(plinthGeo, plinthMat); plinth.position.y = -0.45; stand.add(plinth);
      const trim = new THREE.Mesh(trimGeo, brass); trim.rotation.x = Math.PI / 2; trim.position.y = 0; stand.add(trim);
      const shadow = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(7.6, 7.6)), this.mat(new THREE.MeshBasicMaterial({map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.7})));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; stand.add(shadow);
      const pivot = new THREE.Group(); stand.add(pivot);
      const body = this.buildPiece(genuine, name); body.position.y = -1.0; pivot.add(body);
      this.pieces.push({name, stand, pivot, body, shadow, genuine});
    });
    this.hullPoints = [];
    for (let i = 0; i < 24; i++) {
      const phi = (i / 24) * Math.PI * 2;
      for (const [r, y] of [[3.0, 0.7], [2.6, 0.0], [2.92, 2.0 + rimLift(phi)]]) this.hullPoints.push(new THREE.Vector3(Math.sin(phi) * r, y - 1.0, Math.cos(phi) * r));
    }
    this.hullPoints.push(new THREE.Vector3(0, HOOK_Y - 1.75, -3.55));
    this.place();
  }

  buildPiece(genuine, name) {
    const body = new THREE.Group();
    let g = new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 120);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g, 1e-4);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const rr = Math.hypot(v.x, v.z), phi = Math.atan2(v.x, v.z);
      v.y += rimLift(phi) * smooth(1.2, 1.95, v.y);
      // hand-made: the genuine piece is a little out of round low down, where the top view cannot tell
      if (genuine && rr > 1.4) { const k = 1 + (0.014 * Math.sin(5 * phi + 1) + 0.009 * Math.sin(11 * phi + 3)) * smooth(0.9, 0.3, v.y); v.x *= k; v.z *= k; }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const glass = new THREE.Mesh(this.geo(g), this.glass); glass.userData.piece = name; body.add(glass); this.bodies.push(glass);

    if (genuine) {
      // the hook: a claw curling out and down from just under the broken edge, with a gap behind it
      const shape = new THREE.Shape(); const cx = 0.16, cy = -0.62, a0 = THREE.MathUtils.degToRad(175), a1 = THREE.MathUtils.degToRad(-65);
      shape.absarc(cx, cy, 0.46, a0, a1, true);
      shape.absarc(cx, cy, 0.2, a1, a0, false);
      const hg = this.geo(new THREE.ExtrudeGeometry(shape, {depth: 0.62, curveSegments: 28, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 3}));
      hg.translate(0, 0, -0.31); hg.rotateY(Math.PI / 2); // shape x -> outward (-z), extrusion -> along the wall
      const hp = hg.attributes.position; // twist the part outside the wall so the curl reads face-on and side-on
      for (let i = 0; i < hp.count; i++) {
        const x = hp.getX(i), z = hp.getZ(i), a = -0.6 * smooth(0, 0.3, -z), c = Math.cos(a), sn = Math.sin(a);
        hp.setXYZ(i, x * c + z * sn, hp.getY(i), -x * sn + z * c);
      }
      hg.computeVertexNormals();
      const hook = new THREE.Mesh(hg, this.glass); hook.position.set(0, HOOK_Y - 0.2, -3.03); hook.userData.piece = name;
      body.add(hook); this.bodies.push(hook);
      // air trapped in the heel
      const sphere = this.geo(new THREE.SphereGeometry(1, 14, 10));
      this.bubbles = this.bubbles || [];
      for (let i = 0; i < 11; i++) {
        const phi = BUBBLE_PHI + (rand(i + 20) - 0.5) * 0.75, rr = 2.0 + rand(i + 40) * 0.55, y = 0.2 + rand(i + 60) * 0.3;
        const b = new THREE.Mesh(sphere, this.bubbleMat); const size = 0.035 + rand(i + 80) * 0.07;
        b.scale.set(size, size * (0.8 + rand(i + 90) * 0.5), size * (1 + rand(i + 100) * 0.6));
        b.position.set(Math.sin(phi) * rr, y, Math.cos(phi) * rr); b.rotation.y = phi; b.renderOrder = 5;
        body.add(b); this.bubbles.push(b);
      }
    } else {
      // the mould seam: up one side, across the underside, up the other
      const pts = [];
      UNDER.forEach(([r, y]) => pts.push(new THREE.Vector3(r + 0.008, y - 0.008, 0)));
      UNDER.slice(0, -1).reverse().forEach(([r, y]) => pts.push(new THREE.Vector3(-r - 0.008, y - 0.008, 0)));
      this.seamCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const seam = new THREE.Mesh(this.geo(new THREE.TubeGeometry(this.seamCurve, 120, 0.045, 8, false)), this.seamMat);
      seam.userData.piece = name; body.add(seam); this.bodies.push(seam);
      // the mould maker's mark: R and a few cast-number scratches, frosted into the underside
      const mark = this.canvasTexture(256, (ctx, n) => {
        ctx.clearRect(0, 0, n, n); ctx.strokeStyle = ctx.fillStyle = 'rgba(232,244,220,.82)';
        ctx.font = 'bold 150px Georgia, "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeText('R', n / 2 - 18, n / 2 - 6);
        ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(176 + i * 13, 150); ctx.lineTo(171 + i * 13 + rand(i) * 6, 206); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(168, 222); ctx.lineTo(228, 218); ctx.stroke();
      });
      const dg = new THREE.PlaneGeometry(1.35, 1.35, 12, 12); dg.rotateX(Math.PI / 2); dg.translate(0, 0, 0.85);
      const dp = dg.attributes.position; // laid onto the domed underside
      for (let i = 0; i < dp.count; i++) dp.setY(i, underY(Math.hypot(dp.getX(i), dp.getZ(i))) - 0.012);
      dg.computeVertexNormals();
      const decal = new THREE.Mesh(this.geo(dg), this.mat(new THREE.MeshBasicMaterial({map: mark, transparent: true, depthWrite: false})));
      body.add(decal);
    }

    // generous invisible hit zones, the same on both pieces
    const edgeZone = new THREE.Mesh(this.geo(new THREE.BoxGeometry(2.3, 1.9, 1.15)), this.zoneMat);
    edgeZone.position.set(0, HOOK_Y - 0.75, -3.0 - 0.58);
    const bubbleZone = new THREE.Mesh(this.geo(new THREE.BoxGeometry(2.8, 1.0, 2.0)), this.zoneMat);
    bubbleZone.position.set(0, -0.08, 2.55);
    const seamCurve = this.seamCurve || new THREE.CatmullRomCurve3([
      ...UNDER.map(([r, y]) => new THREE.Vector3(r, y, 0)), ...UNDER.slice(0, -1).reverse().map(([r, y]) => new THREE.Vector3(-r, y, 0))], false, 'centripetal');
    const seamZone = new THREE.Mesh(this.geo(new THREE.TubeGeometry(seamCurve, 64, 0.42, 8, false)), this.zoneMat);
    [['edge', edgeZone, 0.3], ['bubbles', bubbleZone, 0.6], ['seam', seamZone, 0.35]].forEach(([id, z, tol]) => {
      z.userData = {zone: id, tol, piece: name}; body.add(z); this.zones.push(z);
    });
    body.userData.spots = {edge: new THREE.Vector3(0, HOOK_Y - 0.6, -3.35), bubbles: new THREE.Vector3(0, 0.3, 2.35), seam: new THREE.Vector3(2.95, 0.25, 0)};
    return body;
  }

  /** Both pieces turn together; each lifts just enough off its plinth to clear it. */
  place() {
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    this.quat.copy(qPitch).multiply(qYaw);
    let minY = Infinity; const v = new THREE.Vector3();
    for (const p of this.hullPoints) minY = Math.min(minY, v.copy(p).applyQuaternion(this.quat).y);
    const lift = -minY + 0.02;
    for (const piece of this.pieces) {
      piece.pivot.quaternion.copy(this.quat); piece.pivot.position.y = lift;
      const air = Math.max(0, lift - 1.02);
      piece.shadow.material.opacity = 0.7 / (1 + air * 0.55); piece.shadow.scale.setScalar(1 + air * 0.1);
    }
    // bubbles show once you look at the heel from the side or below, never from the top
    const up = v.set(0, 1, 0).applyQuaternion(this.quat);
    this.upDot = up.dot(this.toCamera());
    this.bubbleMat.opacity = smooth(0.5, 0.22, this.upDot) * 0.95;
  }
  toCamera() { return this._toCam || (this._toCam = new THREE.Vector3(0, Math.sin(CAM_PITCH), Math.cos(CAM_PITCH))); }

  resize() {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false);
    const cam = this.camera; cam.aspect = w / h;
    const vHalf = THREE.MathUtils.degToRad(cam.fov / 2), hHalf = Math.atan(Math.tan(vHalf) * cam.aspect);
    const needW = SPACING + PLINTH_R + 0.6, needH = 5.4;
    const dist = Math.max(needW / Math.tan(hHalf), needH / Math.tan(vHalf));
    this.target = new THREE.Vector3(0, 1.1, 0);
    cam.position.set(0, this.target.y + Math.sin(CAM_PITCH) * dist, Math.cos(CAM_PITCH) * dist);
    cam.lookAt(this.target); cam.updateProjectionMatrix();
    this.requestRender();
  }

  requestRender() { if (!this.raf && !this.disposed) this.raf = this.win.requestAnimationFrame(this.render); }
  render(now) {
    this.raf = 0; if (this.disposed || this.lost) return;
    let animating = false;
    for (const sprite of this.markers.values()) {
      const t = this.reduced ? 1 : clamp((now - sprite.userData.born) / 260, 0, 1);
      if (t < 1) animating = true;
      const k = 1.9 * (t < 1 ? 1.35 - 0.35 * (1 - (1 - t) ** 3) : 1); sprite.scale.setScalar(k);
      sprite.material.opacity = t;
    }
    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
    if (animating) this.requestRender();
  }
  placeLabels() {
    const v = new THREE.Vector3();
    this.pieces.forEach((p, i) => {
      const el = this.labels[i]?.current; if (!el) return;
      v.set(p.stand.position.x, -0.9, PLINTH_R + 0.15).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * this.width, y = (-v.y * 0.5 + 0.5) * this.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${(y + 6).toFixed(1)}px) translateX(-50%)`;
    });
  }

  setFound(list) {
    const want = new Set((list || []).filter((id) => IDS.includes(id)));
    for (const [key, sprite] of this.markers) if (!want.has(key.split(':')[0])) { sprite.removeFromParent(); sprite.material.dispose(); this.markers.delete(key); }
    const now = this.win.performance.now();
    for (const id of want) for (const p of this.pieces) {
      const key = id + ':' + p.name; if (this.markers.has(key)) continue;
      const m = this.stampMat.clone(); this.materials.add(m);
      const sprite = new THREE.Sprite(m); sprite.position.copy(p.body.userData.spots[id]); sprite.renderOrder = 10;
      sprite.material.rotation = (rand(IDS.indexOf(id) + (p.genuine ? 0 : 5)) - 0.5) * 0.6;
      sprite.userData.born = this.found.size === 0 && !this.started ? now - 1000 : now; // already found on arrival: no pop
      p.body.add(sprite); this.markers.set(key, sprite);
    }
    this.found = want; this.started = true; this.requestRender();
  }

  bindPointer() {
    const el = this.renderer.domElement; let drag = null;
    const down = (e) => {
      if (drag || (e.button ?? 0) > 0) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      drag = {id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false};
      el.classList.add('is-grabbing');
    };
    const move = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) >= TAP_SLOP) drag.moved = true;
      if (!drag.moved) return;
      const k = 3.4 / Math.max(240, Math.min(this.width, this.height * 1.2)); // about a half turn per container width
      this.yaw += (e.clientX - drag.lx) * k * Math.PI / 1.7;
      this.pitch = clamp(this.pitch + (e.clientY - drag.ly) * k * Math.PI / 1.7, -Math.PI, Math.PI);
      drag.lx = e.clientX; drag.ly = e.clientY;
      this.place(); this.requestRender();
    };
    const up = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const tap = !drag.moved && e.type === 'pointerup'; drag = null; el.classList.remove('is-grabbing');
      try { el.releasePointerCapture(e.pointerId); } catch { /* fine */ }
      if (tap) this.tap(e.clientX, e.clientY);
    };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    this.cleanup.push(() => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); });
  }

  /** Which difference (if any) a tap lands on: the nearest zone that is in view and not behind the glass in front. */
  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    this.scene.updateMatrixWorld();
    const bodyHit = ray.intersectObjects(this.bodies, false)[0];
    const outward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quat);
    const seen = {
      edge: outward.dot(this.toCamera()) > -0.25,
      bubbles: this.upDot < 0.45,
      seam: this.upDot < 0.5,
    };
    for (const hit of ray.intersectObjects(this.zones, false)) {
      const {zone, tol} = hit.object.userData;
      if (!seen[zone]) continue;
      if (bodyHit && hit.distance > bodyHit.distance + tol) continue;
      return {id: zone, piece: hit.object.userData.piece};
    }
    return bodyHit ? {id: null, piece: bodyHit.object.userData.piece} : null;
  }
  tap(x, y) {
    const props = this.getProps(); if (!props.enabled) return;
    const hit = this.pick(x, y); if (!hit) return;
    if (hit.id) { if (!this.found.has(hit.id) && !(props.found || []).includes(hit.id)) props.onFind?.(hit.id); }
    else props.onMiss?.('Same on both.');
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    if (this.raf) this.win.cancelAnimationFrame(this.raf);
    this.ro?.disconnect(); this.cleanup.forEach((f) => f()); this.cleanup = [];
    this.geometries.forEach((g) => g.dispose()); this.materials.forEach((m) => m.dispose()); this.textures.forEach((t) => t.dispose());
    this.envTarget?.dispose();
    if (this.renderer) { this.renderer.renderLists.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
  }
}

export default function GlassCompare({found = [], onFind, onMiss, enabled = true}) {
  const hostRef = useRef(null), sceneRef = useRef(null);
  const lotRef = useRef(null), caseRef = useRef(null);
  const props = useRef(null); props.current = {found, onFind, onMiss, enabled};
  const [failed, setFailed] = useState(false);
  const key = (found || []).filter((id) => IDS.includes(id)).sort().join(',');

  useEffect(() => {
    let world = null;
    try { world = new GlassScene(hostRef.current, {getProps: () => props.current, labels: [lotRef, caseRef]}); }
    catch { setFailed(true); return undefined; }
    sceneRef.current = world; world.setFound(props.current.found);
    return () => { world.dispose(); sceneRef.current = null; };
  }, []);
  useEffect(() => { sceneRef.current?.setFound(key ? key.split(',') : []); }, [key]);

  if (failed) return <div className="gc-root"><div className="gc-fallback">3D view unavailable</div></div>;
  return (
    <div className={'gc-root' + (enabled ? '' : ' is-idle')}>
      <div className="gc-host" ref={hostRef} />
      <span className="gc-label" ref={lotRef}>LOT</span>
      <span className="gc-label" ref={caseRef}>CASE</span>
    </div>
  );
}
