// The boards' top three in real 3D: three walnut steps (2 · 1 · 3) on the dark floor, a brass plate engraved on the
// front of each with the name and the score, and a struck medal standing on top: gold, silver, bronze, turning slowly in
// the lamplight. Changing the board sinks the steps into the floor and raises them again with the new names, the medals
// spinning as they come up. Tap a medal to spin it; tap a step to open the full boards.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { paintWood } from '../notebook/shelf3d/coverTexture';
import { medalObverse, medalReverse, patina, reeding, wallpaper } from '../notebook/shelf3d/caseParts';
import { contactShadow, createStage, heavy, normalFromHeight, tweens, velvet } from '../notebook/shelf3d/look';
import { fontsReady, patinaRect, plateCanvas } from './paint';
import styles from './public3d.module.css';

export interface PodiumRow {
  name: string;
  value: string;
}

const ROMAN = ['I', 'II', 'III'];
const STEP_W = 0.74;
const HEIGHTS = [0.62, 0.44, 0.32]; // 1st, 2nd, 3rd
const XS = [0, -0.8, 0.8];
const MR = 0.235; // medal radius
const MT = 0.034;
// gold, silver, bronze: worn (raised) and dirty (recessed)
const METAL: [string, string, string][] = [
  ['#f6cf72', '#5a3a0e', '#e2b65c'],
  ['#eef0f3', '#4a4c55', '#c9ccd3'],
  ['#e0a070', '#3a1d0c', '#b8774a'],
];

const reduced = () => document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function PodiumScene({ rows, board, onOpen, onFail }: { rows: PodiumRow[]; board: string; onOpen(): void; onFail(): void }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ show(rows: PodiumRow[]): void } | null>(null);
  const latest = useRef({ rows, onOpen });
  latest.current = { rows, onOpen };

  useEffect(() => {
    const el = host.current!;
    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(el, styles.canvas, { fov: 24, paint: 0.3, bloom: 0.34 });
    } catch {
      onFail();
      return;
    }
    let disposed = false;
    const { renderer, scene, camera, tex } = stage;
    renderer.toneMappingExposure = 1.0;
    scene.environmentIntensity = 0.4;

    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2a1a10, 0.3));
    const lamp = new THREE.SpotLight(0xffd3a0, 46, 12, 0.7, 0.8, 1.3);
    lamp.position.set(-1.4, 3.2, 2.6);
    lamp.target.position.set(0, 0.3, 0);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.0005;
    lamp.shadow.radius = 5;
    scene.add(lamp, lamp.target);
    const rim = new THREE.DirectionalLight(0xbfd2ff, 0.45);
    rim.position.set(2.5, 1.8, -1.5);
    scene.add(rim);

    // floor and wall
    const floorWood = paintWood(1024, 256, [62, 38, 22], 41);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 4),
      new THREE.MeshStandardMaterial({ map: tex(floorWood, true, [3, 6]), roughness: 0.5, bumpMap: tex(floorWood, false, [3, 6]), bumpScale: 0.4 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ map: tex(wallpaper(), true, [3, 1.5]), roughness: 0.95 }));
    wall.position.set(0, 2, -0.9);
    wall.receiveShadow = true;
    scene.add(wall);

    // the steps
    const wood = paintWood(1024, 256, [58, 36, 22], 7);
    const woodMat = new THREE.MeshStandardMaterial({ map: tex(wood, true, [1, 1]), roughness: 0.42, bumpMap: tex(wood, false, [1, 1]), bumpScale: 0.5 });
    const capMat = velvet('#1f3a2c', '#8fbf9a');
    const reed = tex(normalFromHeight(reeding(), 3, 0), false, [3, 1]);
    interface Step {
      group: THREE.Group;
      plate: THREE.MeshStandardMaterial;
      medal: THREE.Group;
      front: THREE.MeshPhysicalMaterial;
      back: THREE.MeshPhysicalMaterial;
      h: number;
      spin: number;
      sunk: number; // 0 standing, 1 under the floor
    }
    const steps: Step[] = HEIGHTS.map((h, i) => {
      const group = new THREE.Group();
      const block = new THREE.Mesh(new RoundedBoxGeometry(STEP_W, h, 0.56, 3, 0.03), woodMat);
      block.position.y = h / 2;
      block.castShadow = block.receiveShadow = true;
      const cap = new THREE.Mesh(new RoundedBoxGeometry(STEP_W - 0.04, 0.025, 0.52, 2, 0.01), capMat);
      cap.position.y = h + 0.012;
      cap.receiveShadow = true;
      const plateMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.75, roughness: 0.33 });
      const plate = new THREE.Mesh(new RoundedBoxGeometry(STEP_W * 0.8, STEP_W * 0.4, 0.012, 2, 0.004), plateMat);
      plate.position.set(0, Math.min(h * 0.5, h - STEP_W * 0.22), 0.286);
      group.add(block, cap, plate);
      // the medal stands on a small brass cradle
      const cradle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 32), new THREE.MeshStandardMaterial({ color: '#b98d43', metalness: 1, roughness: 0.3 }));
      cradle.position.y = h + 0.04;
      cradle.castShadow = true;
      group.add(cradle);
      const edgeC = METAL[i][2];
      const mk = () => new THREE.MeshPhysicalMaterial({ color: '#fff', metalness: 1, roughness: 0.26, clearcoat: 0.3 });
      const front = mk(),
        back = mk();
      const medal = new THREE.Group();
      const f = new THREE.Mesh(new THREE.CircleGeometry(MR - 0.012, 96), front);
      f.position.z = MT / 2;
      const b = new THREE.Mesh(new THREE.CircleGeometry(MR - 0.012, 96), back);
      b.rotation.y = Math.PI;
      b.position.z = -MT / 2;
      const edge = new THREE.Mesh(new THREE.CylinderGeometry(MR, MR, MT, 96, 1, true), new THREE.MeshStandardMaterial({ color: edgeC, metalness: 1, roughness: 0.28, normalMap: reed }));
      edge.rotation.x = Math.PI / 2;
      const rimMat = new THREE.MeshStandardMaterial({ color: edgeC, metalness: 1, roughness: 0.2 });
      for (const z of [MT / 2, -MT / 2]) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(MR - 0.011, 0.011, 12, 96), rimMat);
        r.position.z = z;
        medal.add(r);
      }
      medal.add(f, b, edge);
      medal.traverse((o) => (o.castShadow = true));
      medal.position.y = h + 0.05 + MR;
      medal.userData.medal = i;
      group.add(medal);
      const shadow = contactShadow(stage, STEP_W * 1.5, 0.9, 0.5);
      shadow.position.y = 0.002;
      group.add(shadow);
      group.position.x = XS[i];
      group.userData.step = i;
      scene.add(group);
      return { group, plate: plateMat, medal, front, back, h, spin: 0, sunk: 0 };
    });

    const paintStep = (i: number, r: PodiumRow) => {
      const s = steps[i];
      const [light, dark] = METAL[i];
      const ph = plateCanvas(ROMAN[i], r.name, r.value);
      s.plate.map?.dispose();
      s.plate.normalMap?.dispose();
      s.plate.map = tex(patinaRect(ph, '#f1d08a', '#5c4018'));
      s.plate.normalMap = tex(normalFromHeight(ph, 2.4, 1), false);
      s.plate.needsUpdate = true;
      const obv = medalObverse(ROMAN[i], `${r.name.toUpperCase()} · ${r.value.toUpperCase()}`);
      const rev = medalReverse([r.name, r.value], 'FINDSG · HUNT · SINGAPORE');
      for (const [mat, h] of [
        [s.front, obv],
        [s.back, rev],
      ] as const) {
        mat.map?.dispose();
        mat.normalMap?.dispose();
        mat.map = tex(patina(h, light, dark));
        mat.normalMap = tex(normalFromHeight(h, 4.5, 1), false);
        mat.needsUpdate = true;
      }
    };

    // ---- view: all three steps, the floor in front, the wall behind ----
    const fit = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      stage.setSize(w, h);
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const halfW = 1.28,
        halfH = 0.72;
      const dist = Math.max(halfW / t / camera.aspect, halfH / t);
      camera.position.set(0, 1.0, dist);
      camera.lookAt(0, 0.6, 0);
      draw(true);
    };

    // ---- the board changes: down into the floor, new names, back up (3rd, 2nd, then 1st) ----
    const tw = tweens(() => draw());
    let shown = '';
    function show(rows: PodiumRow[]) {
      const key = rows.map((r) => `${r.name}|${r.value}`).join(';');
      if (key === shown) return;
      const first = !shown;
      shown = key;
      if (first || reduced()) {
        rows.slice(0, 3).forEach((r, i) => paintStep(i, r));
        if (!first || reduced()) return draw(true);
        // the first time in: rise from the floor
        steps.forEach((s) => (s.sunk = 1));
      }
      [2, 1, 0].forEach((i, order) => {
        const s = steps[i];
        const rise = () =>
          tw.add(
            900,
            (k) => {
              s.sunk = 1 - k;
            },
            heavy,
            () => draw(true),
          );
        if (first) {
          setTimeout(() => {
            s.spin += Math.PI * 4;
            rise();
          }, 120 + order * 160);
          return;
        }
        setTimeout(() => {
          tw.add(
            380,
            (k) => (s.sunk = k),
            (k) => k * k,
            () => {
              if (rows[i]) paintStep(i, rows[i]);
              s.spin += Math.PI * 4;
              rise();
            },
          );
        }, order * 140);
      });
    }

    // ---- pointer: a medal spins; a step opens the boards ----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downAt: { x: number; y: number } | null = null;
    const pdown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
    const pup = (e: PointerEvent) => {
      if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
      downAt = null;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const o = ray.intersectObjects(
        steps.map((s) => s.group),
        true,
      )[0];
      if (!o) return;
      let n: THREE.Object3D | null = o.object;
      while (n && n.userData.medal === undefined && n.userData.step === undefined) n = n.parent;
      if (n?.userData.medal !== undefined) {
        steps[n.userData.medal as number].spin += Math.PI * 2;
        draw(true);
      } else latest.current.onOpen();
    };
    el.addEventListener('pointerdown', pdown);
    el.addEventListener('pointerup', pup);

    // ---- render: the medals turn slowly while on screen (30 fps); full rate while anything rises or spins ----
    let visible = true;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      tw.kick();
    });
    io.observe(el);
    let lastDraw = 0;
    let t0 = performance.now();
    function draw(force = false) {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.max(0, Math.min(0.05, (now - t0) / 1000));
      t0 = now;
      let spinning = false;
      steps.forEach((s, i) => {
        s.group.position.y = -(s.h + 0.5) * s.sunk;
        // spin settles, plus a slow idle turn and a little bob
        if (s.spin > 0.001) {
          const step = s.spin * (1 - Math.exp(-dt * 3.2));
          s.medal.rotation.y += step;
          s.spin -= step;
          spinning = true;
        }
        if (!reduced()) {
          s.medal.rotation.y += dt * 0.35;
          s.medal.position.y = s.h + 0.05 + MR + Math.sin(now / 900 + i) * 0.008;
        }
      });
      if (!force && !tw.busy && !spinning && now - lastDraw < 32) return;
      lastDraw = now;
      stage.render();
    }
    tw.keepWhile(() => visible && !document.hidden && !reduced());

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    api.current = { show };
    fontsReady().then(() => {
      if (!disposed) show(latest.current.rows);
    });

    return () => {
      disposed = true;
      tw.stop();
      ro.disconnect();
      io.disconnect();
      el.removeEventListener('pointerdown', pdown);
      el.removeEventListener('pointerup', pup);
      stage.dispose();
      api.current = null;
    };
    // the scene is built once; later changes go through `api`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => api.current?.show(rows), [rows, board]);

  return <div className={styles.podium} ref={host} aria-hidden="true" />;
}
