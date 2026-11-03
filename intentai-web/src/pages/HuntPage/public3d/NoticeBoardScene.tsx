// Public's notice board in real 3D: a cork board in a walnut frame on the dark wall, under the same lamp as the story
// shelf. The weekend challenges hang on it as posters, each held by a brass pin, their lower corners curling off the
// cork and stirring a little in the air. Swipe to look along the board; tap a poster to bring it to the middle; tap it
// again and it comes off its pin towards you and turns over, showing the route chart on its back.
// If WebGL is unavailable, `onFail` is called and the flat list is used instead.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { chapters } from '../notebook/chapters';
import { paintWood } from '../notebook/shelf3d/coverTexture';
import { paperBack, routeChart, wallpaper, type MapPin } from '../notebook/shelf3d/caseParts';
import { createStage, lampBeam, normalFromHeight } from '../notebook/shelf3d/look';
import { corkCanvas, fontsReady, posterCanvas, PH, PW, type PosterDef } from './paint';
import styles from './public3d.module.css';

const W = 1; // poster width (world units)
const H = (W * PH) / PW;
const GAP = 1.24;

const reduced = () => document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

interface Rig {
  id: string;
  group: THREE.Group;
  home: THREE.Vector3;
  tilt: number;
  phase: number;
}

function pinsOf(routeId?: string): MapPin[] {
  if (!routeId) return [];
  const ch = chapters().find((c) => c.routeId === routeId);
  return (ch?.stops ?? []).filter((s) => s.pin).map((s) => ({ lat: s.pin!.lat, lng: s.pin!.lng, done: true, name: s.name })); // a public route: every stop shown
}

/** A sheet of paper hanging from a pin: flat at the top, its lower edge curling away from the cork. */
function curledSheet() {
  const g = new THREE.PlaneGeometry(W, H, 14, 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    const low = Math.max(0, -y / (H / 2)); // 0 at the middle, 1 at the bottom edge
    const side = Math.abs(x) / (W / 2);
    p.setZ(i, 0.06 * low ** 2.4 * (0.55 + 0.45 * side) + 0.012 * Math.sin((x / W) * Math.PI) * low);
  }
  g.computeVertexNormals();
  return g;
}

export function NoticeBoardScene({
  posters,
  selected,
  open,
  onSelect,
  onOpen,
  onFail,
}: {
  posters: PosterDef[];
  selected: string;
  open: string | null;
  onSelect(id: string): void;
  onOpen(id: string | null): void;
  onFail(): void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ focus(id: string): void; setOpen(id: string | null): void } | null>(null);
  const latest = useRef({ selected, open, onSelect, onOpen });
  latest.current = { selected, open, onSelect, onOpen };

  useEffect(() => {
    const el = host.current!;
    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(el, styles.canvas, { fov: 26, paint: 0.3, bloom: 0.2 });
    } catch {
      onFail();
      return;
    }
    let disposed = false;
    const { renderer, scene, camera, tex } = stage;
    renderer.toneMappingExposure = 0.98;
    scene.environmentIntensity = 0.24;
    const n = posters.length;
    const midX = ((n - 1) * GAP) / 2;

    // ---- light: the lamp from the top left, a cool rim, the room ----
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2a1a10, 0.3));
    const lamp = new THREE.SpotLight(0xffd3a0, 40, 14, 0.66, 0.85, 1.4);
    lamp.position.set(-1.6, 2.6, 3.2);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.0005;
    lamp.shadow.radius = 5;
    scene.add(lamp, lamp.target);
    const rim = new THREE.DirectionalLight(0xbfd2ff, 0.3);
    rim.position.set(3, 1.5, 2);
    scene.add(rim);

    // ---- the wall, the frame and the cork ----
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(n * GAP + 8, 6), new THREE.MeshStandardMaterial({ map: tex(wallpaper(), true, [4, 2]), roughness: 0.95 }));
    wall.position.set(midX, 0, -0.12);
    wall.receiveShadow = true;
    scene.add(wall);
    const bw = (n - 1) * GAP + 1.55,
      bh = H + 0.42;
    const wood = paintWood(1024, 256, [86, 52, 30], 19);
    const woodMat = new THREE.MeshStandardMaterial({ map: tex(wood, true, [2, 1]), roughness: 0.55, bumpMap: tex(wood, false, [2, 1]), bumpScale: 0.6 });
    const border = new THREE.Group();
    const R = 0.075;
    for (const [w, h, x, y] of [
      [bw + 2 * R, R, midX, bh / 2 + R / 2],
      [bw + 2 * R, R, midX, -bh / 2 - R / 2],
      [R, bh, midX - bw / 2 - R / 2, 0],
      [R, bh, midX + bw / 2 + R / 2, 0],
    ] as const) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.1, 2, 0.02), woodMat);
      m.position.set(x, y, 0.0);
      m.castShadow = m.receiveShadow = true;
      border.add(m);
    }
    scene.add(border);
    const corkC = corkCanvas();
    const reps: [number, number] = [bw / 1.2, bh / 1.2];
    const cork = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshStandardMaterial({ map: tex(corkC, true, reps), roughness: 0.96, normalMap: tex(normalFromHeight(corkC, 2.2, 1), false, reps) }),
    );
    cork.position.set(midX, 0, -0.03);
    cork.receiveShadow = true;
    scene.add(cork);

    // ---- posters ----
    const sheet = curledSheet();
    const brassMat = new THREE.MeshStandardMaterial({ color: '#d4a24e', metalness: 1, roughness: 0.25 });
    const steel = new THREE.MeshStandardMaterial({ color: '#9a9a9a', metalness: 1, roughness: 0.35 });
    const rigs: Rig[] = [];
    posters.forEach((p, i) => {
      const group = new THREE.Group();
      const frontMat = new THREE.MeshStandardMaterial({ map: tex(posterCanvas(p, i + 3)), roughness: 0.88, side: THREE.FrontSide });
      const front = new THREE.Mesh(sheet, frontMat);
      front.castShadow = true;
      front.receiveShadow = true;
      const backC = p.kind === 'challenge' ? routeChart(p.story ?? p.title, p.title, pinsOf(p.routeId), false, i + 7) : paperBack();
      const back = new THREE.Mesh(sheet, new THREE.MeshStandardMaterial({ map: tex(backC), roughness: 0.9, side: THREE.FrontSide }));
      back.rotation.y = Math.PI;
      back.position.z = -0.002;
      back.castShadow = true;
      group.add(front, back);
      // the paper hangs from its pin: the group's origin is the pin hole, so turning it swings the sheet about the pin
      front.position.y = back.position.y = -H / 2 + 0.07;
      const tilt = (i % 2 ? 1 : -1) * (0.012 + ((i * 37) % 10) / 600);
      const home = new THREE.Vector3(i * GAP, H / 2 - 0.07 + 0.02, 0.005);
      group.position.copy(home);
      group.rotation.z = tilt;
      group.userData.id = p.id;
      scene.add(group);
      rigs.push({ id: p.id, group, home, tilt, phase: i * 1.7 });
      // the pin stays in the cork when the poster comes off it
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.038, 24, 16), p.hot ? new THREE.MeshStandardMaterial({ color: '#b3261a', roughness: 0.35, metalness: 0.1 }) : brassMat);
      head.position.set(home.x, home.y, 0.075);
      head.castShadow = true;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), steel);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(home.x, home.y, 0.035);
      scene.add(head, shaft);
      // the route's picture arrives later
      if (p.image) {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () =>
          fontsReady().then(() => {
            if (disposed) return;
            frontMat.map!.image = posterCanvas(p, i + 3, img);
            frontMat.map!.needsUpdate = true;
            kick();
          });
        img.src = p.image;
      } else
        fontsReady().then(() => {
          if (disposed) return;
          frontMat.map!.image = posterCanvas(p, i + 3);
          frontMat.map!.needsUpdate = true;
          kick();
        });
    });

    const beam = lampBeam(stage, new THREE.Vector3(midX - 0.6, 2.2, 1.4), -1.2, 1.6);
    scene.add(beam.group);

    // ---- camera along the board ----
    const indexOf = (id: string) => Math.max(0, posters.findIndex((p) => p.id === id));
    let camX = indexOf(latest.current.selected) * GAP;
    let camTo = camX;
    let dist = 5;
    const tan = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fit = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      stage.setSize(w, h);
      // the chosen poster large, its neighbours just showing at the sides
      const across = 1.72 * GAP;
      dist = Math.max(across / 2 / tan() / camera.aspect, (H + 0.36) / 2 / tan());
      camera.position.set(camX, 0.06, dist);
      camera.updateProjectionMatrix();
      kick();
    };

    // ---- pointer: drag to look along, tap to choose, tap again to take it down ----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let drag: { x: number; camX: number; moved: boolean; id: number } | null = null;
    let velocity = 0;
    const worldPerPx = () => (2 * tan() * dist * camera.aspect) / el.clientWidth;
    const hit = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const o = ray.intersectObjects(
        rigs.map((g) => g.group),
        true,
      )[0];
      let node: THREE.Object3D | null = o?.object ?? null;
      while (node && !node.userData.id) node = node.parent;
      return (node?.userData.id as string | undefined) ?? null;
    };
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, camX, moved: false, id: e.pointerId };
      velocity = 0;
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId || opened) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 6) return;
      if (!drag.moved) el.setPointerCapture(e.pointerId);
      drag.moved = true;
      const nx = THREE.MathUtils.clamp(drag.camX - dx * worldPerPx(), -0.35, (n - 1) * GAP + 0.35);
      velocity = nx - camX;
      camX = camTo = nx;
      kick();
    };
    const up = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag;
      drag = null;
      if (!d.moved) {
        // a poster in your hands goes back up on any tap
        if (opened) return latest.current.onOpen(null);
        const id = hit(e);
        if (!id) return;
        if (id === latest.current.selected) latest.current.onOpen(id);
        else focus(id, true);
        return;
      }
      const thrown = camX + velocity * 8;
      const i = THREE.MathUtils.clamp(Math.round(thrown / GAP), 0, n - 1);
      focus(posters[i].id, true);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    function focus(id: string, tell = false) {
      camTo = indexOf(id) * GAP;
      if (tell && id !== latest.current.selected) latest.current.onSelect(id);
      kick();
    }

    // ---- taking a poster down: off its pin, towards you, turned over; and back up ----
    let opened: string | null = null;
    let anim: { rig: Rig; from: number; to: number; t0: number } | null = null;
    const amount = new Map<string, number>(); // 0 on the board, 1 in your hands
    function setOpen(id: string | null) {
      const cur = opened;
      if (cur === id) return;
      opened = id;
      const back = cur ? rigs.find((r) => r.id === cur) : null;
      const out = id ? rigs.find((r) => r.id === id) : null;
      if (back) amount.set(back.id, reduced() ? 0 : (amount.get(back.id) ?? 1));
      if (out) {
        camTo = out.home.x;
        amount.set(out.id, reduced() ? 1 : (amount.get(out.id) ?? 0));
      }
      anim = null;
      // one at a time: the one in your hands goes back first
      if (back && !reduced()) anim = { rig: back, from: amount.get(back.id) ?? 1, to: 0, t0: performance.now() };
      if (out && !reduced()) {
        const start = () => (anim = { rig: out, from: amount.get(out.id) ?? 0, to: 1, t0: performance.now() });
        if (anim) setTimeout(() => (start(), kick()), 520);
        else start();
      }
      kick();
    }
    const place = (r: Rig, k: number, now: number) => {
      const e = k;
      const g = r.group;
      const sway = reduced() ? 0 : Math.sin(now / 1400 + r.phase) * 0.012 * (1 - e);
      g.position.set(r.home.x, r.home.y + e * 0.1, r.home.z + e * (dist * 0.09));
      g.rotation.set(sway - e * 0.04, e * Math.PI + Math.sin(e * Math.PI) * 0.35, r.tilt * (1 - e));
    };

    // ---- render: full rate while something moves, 30 fps for the dust and the stirring paper ----
    let raf = 0;
    let t = performance.now();
    let last = 0;
    let visible = true;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      kick();
    });
    io.observe(el);
    function kick() {
      if (!raf && !disposed) raf = requestAnimationFrame(frame);
    }
    function frame(now: number) {
      raf = 0;
      const dt = Math.max(0, Math.min(0.05, (now - t) / 1000));
      t = now;
      let busy = false;
      if (!drag && Math.abs(camTo - camX) > 0.0005) {
        camX += (camTo - camX) * (1 - Math.exp(-dt * (reduced() ? 60 : 7)));
        busy = true;
      } else if (!drag) camX = camTo;
      camera.position.x = camX;
      camera.lookAt(camX, 0.02, 0);
      lamp.position.x = camX - 1.6;
      lamp.target.position.set(camX + 0.3, -0.2, 0);
      if (anim) {
        const k = Math.min(1, (now - anim.t0) / 760);
        const v = anim.from + (anim.to - anim.from) * ease(k);
        amount.set(anim.rig.id, v);
        busy = true;
        if (k >= 1) anim = null;
      }
      for (const r of rigs) {
        let k = amount.get(r.id) ?? 0;
        if (reduced()) k = opened === r.id ? 1 : 0;
        // the chosen poster stands a touch proud of the cork
        const lift = r.id === latest.current.selected && k === 0 ? 0.03 : 0;
        r.home.z += (0.005 + lift - r.home.z) * (1 - Math.exp(-dt * 9));
        place(r, k, now);
      }
      beam.tick(now / 1000);
      const idle = visible && !document.hidden && !reduced();
      if (busy || drag || now - last > 30 || !idle) {
        last = now;
        stage.render();
      }
      if (busy || drag || idle) kick();
    }

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    api.current = { focus: (id) => focus(id), setOpen };
    if (latest.current.open) setOpen(latest.current.open);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      sheet.dispose();
      stage.dispose();
      api.current = null;
    };
    // the scene is built once; later changes go through `api`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => api.current?.focus(selected), [selected]);
  useEffect(() => api.current?.setOpen(open), [open]);

  return <div className={styles.board} ref={host} aria-hidden="true" />;
}
