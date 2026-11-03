// The story shelf in real 3D: five cloth-bound books standing face-out on a walnut shelf under a warm lamp. Each is
// built like a real one: thick boards overhanging a gilt-topped, speckle-edged page block, a rounded spine with raised
// bands, brass corners on the fore-edge, and a debossed, foil-stamped front (it catches the light as you swipe along;
// the books sway a little with the swipe). Each has a silk ribbon: green when its story is finished, red while it is not. Swipe to look along the shelf; tap a book to
// bring it to the middle; tap it again and it slides off the shelf towards you and opens.
// If WebGL is unavailable, `onFail` is called and the flat shelf is used instead.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { BookDef, BookId, ShelfProgress } from '../Bookshelf';
import { paintBaize, paintCover, paintPages, paintSpine, paintWeave, paintWood, SPINE_BANDS } from './coverTexture';
import { createStage, type Stage } from './look';
import styles from './shelf3d.module.css';

const BW = 1; // book width (world units); height follows the notebook's 1 : 1.46
const BH = 1.46;
const BT = 0.17; // thickness
const GAP = 1.42; // book centre to centre
const LEAN = -0.06; // books lean back against the wall a touch
const BOARD = 0.034; // board thickness
const OVER = 0.03; // how far the boards overhang the pages
const BOW = 0.036; // how far the rounded spine bulges past the boards
const HB = BH + 0.03; // board height
const WB = BW + 0.03; // board width

const reduced = () => document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

interface BookRig {
  id: BookId;
  group: THREE.Group;
  home: THREE.Vector3;
  ribbon: THREE.Mesh;
}

export function ShelfScene({
  books,
  progress,
  selected,
  onSelect,
  onOpen,
  onFail,
}: {
  books: BookDef[];
  progress: Record<BookId, ShelfProgress>;
  selected: BookId;
  onSelect(id: BookId): void;
  onOpen(id: BookId, from: DOMRect): void;
  onFail(): void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ focus(id: BookId): void; pull(id: BookId): void; setDone(p: Record<BookId, ShelfProgress>): void } | null>(null);
  const latest = useRef({ selected, onSelect, onOpen });
  latest.current = { selected, onSelect, onOpen };

  useEffect(() => {
    const el = host.current!;
    let stage: Stage;
    try {
      // the same painted finish as the display case, lighter, so the lettering on the covers stays crisp
      // (the paint pass is kept light here: the tooling and lettering on the covers want to stay sharp)
      stage = createStage(el, styles.canvas, { fov: 26, paint: 0.18, bloom: 0.2 });
    } catch {
      onFail();
      return;
    }
    let disposed = false;
    const { renderer, scene, camera } = stage;
    renderer.toneMappingExposure = 0.98;
    scene.environmentIntensity = 0.22;
    // metal (foil, brass, gilt) gets the room's reflections in full, so it reads as polished rather than painted
    const env = scene.environment;

    const look = new THREE.Vector3(0, BH * 0.52, 0);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const tex = (c: HTMLCanvasElement, srgb = true, repeat?: [number, number]) => {
      const t = new THREE.CanvasTexture(c);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      if (repeat) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(...repeat);
      }
      return t;
    };

    // ---- lamp and room light ----
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2a1a10, 0.24));
    const lamp = new THREE.SpotLight(0xffcf96, 50, 14, 0.62, 0.9, 1.4);
    lamp.position.set(-2.4, 4, 2.2);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.0004;
    lamp.shadow.radius = 6;
    scene.add(lamp, lamp.target);
    // a rim from behind and above picks out the board edges, the gilt top and the bands; a faint cool fill from the right
    const rim = new THREE.DirectionalLight(0xffe4c2, 0.7);
    rim.position.set(2.2, 3.2, -1.6);
    const fill = new THREE.DirectionalLight(0xbfd2ff, 0.18);
    fill.position.set(3, 1, 3);
    scene.add(rim, rim.target, fill, fill.target);

    // ---- the shelf: back panel, plank with a lip, brass plate ----
    const span = (books.length - 1) * GAP + BW * 3.2;
    const wood = paintWood();
    const woodMat = new THREE.MeshStandardMaterial({ map: tex(wood, true, [3, 1]), roughness: 0.62, metalness: 0, bumpMap: tex(wood, false, [3, 1]), bumpScale: 0.6 });
    const plank = new THREE.Mesh(new RoundedBoxGeometry(span, 0.09, 0.95, 2, 0.02), woodMat);
    plank.position.set(((books.length - 1) * GAP) / 2, -0.045, 0.1);
    plank.receiveShadow = plank.castShadow = true;
    scene.add(plank);
    const lip = new THREE.Mesh(new RoundedBoxGeometry(span, 0.13, 0.05, 2, 0.015), woodMat);
    lip.position.set(plank.position.x, -0.02, 0.56);
    lip.castShadow = lip.receiveShadow = true;
    scene.add(lip);
    const baize = paintBaize();
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(span + 4, 5),
      new THREE.MeshStandardMaterial({ map: tex(baize, true, [4, 2]), roughness: 0.97, bumpMap: tex(baize, false, [4, 2]), bumpScale: 0.5 }),
    );
    back.position.set(plank.position.x, 1.4, -0.42);
    back.receiveShadow = true;
    scene.add(back);
    // brass name plate on the lip
    const plateC = document.createElement('canvas');
    plateC.width = 512;
    plateC.height = 64;
    {
      const c = plateC.getContext('2d')!;
      const g = c.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, '#e6c98a');
      g.addColorStop(0.5, '#b38b45');
      g.addColorStop(1, '#8a672c');
      c.fillStyle = g;
      c.fillRect(0, 0, 512, 64);
      c.fillStyle = 'rgba(40,24,8,.85)';
      c.font = "400 28px 'IM Fell English', Georgia, serif";
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.letterSpacing = '4px';
      c.fillText('FIND SG · STORIES OF A CITY', 256, 34);
    }
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.19), new THREE.MeshStandardMaterial({ map: tex(plateC), metalness: 0.85, roughness: 0.32 }));
    plate.position.set(plank.position.x, -0.02, 0.586);
    scene.add(plate);

    // ---- books ----
    const gilt = new THREE.MeshStandardMaterial({ map: tex(paintPages('top')), metalness: 0.85, roughness: 0.34, envMap: env, envMapIntensity: 0.9 });
    const fore = new THREE.MeshStandardMaterial({ map: tex(paintPages('fore')), roughness: 0.9 });
    const weave = tex(paintWeave(), false, [6, 9]);
    const brassMat = new THREE.MeshStandardMaterial({ color: '#c9a05a', metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1.3 });
    const rigs: BookRig[] = [];
    const ribbonGeo = (() => {
      const s = new THREE.Shape();
      s.moveTo(-0.035, 0);
      s.lineTo(0.035, 0);
      s.lineTo(0.035, -0.32);
      s.lineTo(0, -0.27);
      s.lineTo(-0.035, -0.32);
      s.closePath();
      const g = new THREE.ShapeGeometry(s, 1);
      // hang it over the top edge: curve it forward and down
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setZ(i, Math.sin(-y * 5) * 0.03);
      }
      g.computeVertexNormals();
      return g;
    })();
    // shared by every book: boards, page block, rounded spine (a half cylinder squashed to the spine's bow), its bands,
    // and the brass corner (a bevelled triangle over the board's corner)
    const boardGeo = new RoundedBoxGeometry(WB, HB, BOARD, 3, 0.01);
    const blockGeo = new THREE.BoxGeometry(BW - OVER / 2, HB - OVER * 2, BT - BOARD * 2);
    const spineGeo = new THREE.CylinderGeometry(BT / 2, BT / 2, HB, 20, 1, false, Math.PI, Math.PI);
    const bandGeo = new THREE.TorusGeometry(BT / 2, 0.011, 8, 20, Math.PI).rotateX(Math.PI / 2).rotateY(-Math.PI / 2);
    const cornerGeo = (() => {
      const s = 0.078,
        o = 0.004;
      const sh = new THREE.Shape();
      sh.moveTo(o, o);
      sh.lineTo(-s, o);
      sh.quadraticCurveTo(-s * 0.45, -s * 0.18, o, -s);
      sh.closePath();
      const d = BOARD + 0.004;
      return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0025, bevelSegments: 2, curveSegments: 6 }).translate(0, 0, -d / 2);
    })();
    const RED = new THREE.Color('#a3291a'),
      GREEN = new THREE.Color('#3f7a45');

    books.forEach((b, i) => {
      const group = new THREE.Group();
      const cloth = new THREE.MeshStandardMaterial({ color: b.tone, roughness: 0.86, bumpMap: weave, bumpScale: 0.5 });
      const spineMat = new THREE.MeshStandardMaterial({ map: tex(paintSpine(b, i)), roughness: 0.8, bumpMap: weave, bumpScale: 0.5 });
      // the front board gets its painted cover once fonts and drawings are ready
      const frontMat = new THREE.MeshStandardMaterial({ color: b.tone, roughness: 0.85, envMap: env, envMapIntensity: 0.55 });
      const zb = BT / 2 - BOARD / 2;
      const front = new THREE.Mesh(boardGeo, [cloth, cloth, cloth, cloth, frontMat, cloth]);
      front.position.z = zb;
      const backBoard = new THREE.Mesh(boardGeo, cloth);
      backBoard.position.z = -zb;
      // the spine wraps the left edge, bowed out; caps are cloth
      const spine = new THREE.Mesh(spineGeo, [spineMat, cloth, cloth]);
      spine.position.x = -WB / 2;
      spine.scale.x = BOW / (BT / 2);
      group.add(spine);
      for (const f of SPINE_BANDS) {
        const band = new THREE.Mesh(bandGeo, spineMat);
        band.position.set(-WB / 2, (0.5 - f) * HB, 0);
        band.scale.x = (BOW + 0.004) / (BT / 2);
        band.castShadow = true;
        group.add(band);
      }
      // the page block sits back from the boards' edges and against the spine
      const block = new THREE.Mesh(blockGeo, [fore, cloth, gilt, gilt, fore, fore]);
      block.position.x = -WB / 2 + (BW - OVER / 2) / 2 + 0.004;
      for (const m of [front, backBoard, spine, block]) {
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
      }
      // brass corners on the fore-edge of both boards
      for (const z of [zb, -zb])
        for (const sy of [1, -1]) {
          const corner = new THREE.Mesh(cornerGeo, brassMat);
          corner.position.set(WB / 2, (sy * HB) / 2, z);
          corner.scale.y = sy;
          corner.castShadow = true;
          group.add(corner);
        }
      const ribbonMat = new THREE.MeshPhysicalMaterial({ color: RED, roughness: 0.42, sheen: 0.35, sheenColor: new THREE.Color('#ffd9c8'), sheenRoughness: 0.5, side: THREE.DoubleSide });
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      // just a tail over the top edge, clear of the lettering
      ribbon.position.set(0.3, HB / 2 + 0.05, BT / 2 + 0.004);
      ribbon.scale.y = 0.4;
      ribbon.castShadow = true;
      group.add(ribbon);
      // the ribbon comes out of the pages at the top
      const tuck = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.09), ribbonMat);
      tuck.rotation.x = -Math.PI / 2 + 0.3;
      tuck.position.set(0.3, HB / 2 - OVER + 0.02, BT / 2 - BOARD - 0.02);
      group.add(tuck);

      const home = new THREE.Vector3(i * GAP, HB / 2 + 0.002, 0);
      group.position.copy(home);
      group.rotation.x = LEAN;
      group.userData.id = b.id;
      scene.add(group);
      rigs.push({ id: b.id, group, home, ribbon });

      paintCover(b, i + 1)
        .then(({ color, foil, bump }) => {
          if (disposed) return;
          frontMat.color.set('#ffffff');
          frontMat.map = tex(color);
          frontMat.metalnessMap = tex(foil, false);
          frontMat.metalness = 1;
          // cloth is rough, the foil is polished: roughness reads the green channel, so invert the foil mask
          const rough = document.createElement('canvas');
          rough.width = foil.width;
          rough.height = foil.height;
          const rc = rough.getContext('2d')!;
          rc.fillStyle = '#dcdcdc';
          rc.fillRect(0, 0, rough.width, rough.height);
          rc.globalCompositeOperation = 'multiply';
          rc.filter = 'invert(1)';
          rc.drawImage(foil, 0, 0);
          rc.globalCompositeOperation = 'lighter';
          rc.filter = 'none';
          rc.globalAlpha = 0.22;
          rc.drawImage(foil, 0, 0);
          frontMat.roughnessMap = tex(rough, false);
          frontMat.roughness = 1;
          frontMat.bumpMap = tex(bump, false);
          frontMat.bumpScale = 1.6;
          frontMat.needsUpdate = true;
          kick();
        })
        .catch(() => undefined);
    });

    const setDone = (p: Record<BookId, ShelfProgress>) => {
      for (const r of rigs) {
        const pr = p[r.id];
        ((r.ribbon.material as THREE.MeshPhysicalMaterial).color as THREE.Color).copy(pr && pr.total > 0 && pr.done >= pr.total ? GREEN : RED);
      }
      kick();
    };

    // ---- camera along the shelf ----
    const indexOf = (id: BookId) => Math.max(0, books.findIndex((b) => b.id === id));
    let camX = indexOf(latest.current.selected) * GAP;
    let camTo = camX;
    const fit = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      stage.setSize(w, h);
      // keep about two and a half books across the view, whatever the phone
      const across = 2.55 * GAP;
      const dist = across / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.aspect;
      camera.position.set(camX, BH * 0.95, Math.max(4.6, dist));
      camera.updateProjectionMatrix();
      kick();
    };

    // ---- pointer: drag to look along, tap to choose ----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let drag: { x: number; camX: number; moved: boolean; id: number; t: number } | null = null;
    let velocity = 0;
    // the books sway a little against a swipe, then settle (not with reduced motion)
    let sway = 0;
    let swayTo = 0;
    const worldPerPx = () => (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect) / el.clientWidth;
    const hit = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const o = ray.intersectObjects(
        rigs.map((g) => g.group),
        true,
      )[0];
      let n: THREE.Object3D | null = o?.object ?? null;
      while (n && !n.userData.id) n = n.parent;
      return (n?.userData.id as BookId | undefined) ?? null;
    };
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, camX, moved: false, id: e.pointerId, t: performance.now() };
      velocity = 0;
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 6) return;
      if (!drag.moved) el.setPointerCapture(e.pointerId);
      drag.moved = true;
      const nx = THREE.MathUtils.clamp(drag.camX - dx * worldPerPx(), -0.4, (books.length - 1) * GAP + 0.4);
      velocity = nx - camX;
      if (!reduced()) swayTo = THREE.MathUtils.clamp(velocity * 2.2, -0.16, 0.16);
      camX = camTo = nx;
      kick();
    };
    const up = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag;
      drag = null;
      if (!d.moved) {
        const id = hit(e);
        if (!id) return;
        if (id === latest.current.selected) pull(id);
        else focus(id, true);
        return;
      }
      // fling, then settle on the nearest book
      const thrown = camX + velocity * 8;
      const i = THREE.MathUtils.clamp(Math.round(thrown / GAP), 0, books.length - 1);
      focus(books[i].id, true);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    function focus(id: BookId, tell = false) {
      camTo = indexOf(id) * GAP;
      if (tell && id !== latest.current.selected) latest.current.onSelect(id);
      kick();
    }

    // ---- taking a book down: it slides forward off the shelf, lifts and turns to you ----
    let pulling: { rig: BookRig; t0: number } | null = null;
    function pull(id: BookId) {
      const rig = rigs.find((r) => r.id === id);
      if (!rig || pulling) return;
      if (reduced()) return void latest.current.onOpen(id, screenRect(rig));
      pulling = { rig, t0: performance.now() };
      kick();
    }
    const v = new THREE.Vector3();
    function screenRect(rig: BookRig) {
      const r = el.getBoundingClientRect();
      rig.group.updateMatrixWorld(true);
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (const [x, y] of [
        [-BW / 2, -BH / 2],
        [BW / 2, -BH / 2],
        [-BW / 2, BH / 2],
        [BW / 2, BH / 2],
      ]) {
        v.set(x, y, BT / 2).applyMatrix4(rig.group.matrixWorld).project(camera);
        const sx = r.left + ((v.x + 1) / 2) * r.width,
          sy = r.top + ((1 - v.y) / 2) * r.height;
        x0 = Math.min(x0, sx);
        x1 = Math.max(x1, sx);
        y0 = Math.min(y0, sy);
        y1 = Math.max(y1, sy);
      }
      return new DOMRect(x0, y0, x1 - x0, y1 - y0);
    }

    // ---- render only while something moves ----
    let raf = 0;
    let t = performance.now();
    function kick() {
      if (!raf && !disposed) raf = requestAnimationFrame(frame);
    }
    function frame(now: number) {
      raf = 0;
      // a frame's timestamp can come from before the scene was built (a busy phone): never step backwards, or the
      // easing below runs in reverse and throws the chosen book off into the distance
      const dt = Math.max(0, Math.min(0.05, (now - t) / 1000));
      t = now;
      let busy = false;
      if (!drag && Math.abs(camTo - camX) > 0.0005) {
        camX += (camTo - camX) * (1 - Math.exp(-dt * (reduced() ? 60 : 7)));
        busy = true;
      } else if (!drag) camX = camTo;
      camera.position.x = camX;
      look.set(camX, BH * 0.46, 0);
      camera.lookAt(look);
      lamp.position.x = camX - 2.4;
      lamp.target.position.set(camX + 0.3, 0.5, 0);
      // a swipe tilts the books the other way, like a hand brushing along the shelf; they spring back
      swayTo *= Math.exp(-dt * (drag ? 6 : 10));
      sway += (swayTo - sway) * (1 - Math.exp(-dt * 12));
      if (Math.abs(sway) > 0.0005 || Math.abs(swayTo) > 0.0005) busy = true;
      else sway = swayTo = 0;
      // the chosen book stands a little proud of the others
      const sel = latest.current.selected;
      for (const r of rigs) {
        if (pulling?.rig === r) continue;
        const k = 1 + ((r.home.x / GAP) % 2) * 0.25;
        r.group.rotation.y = -sway * k;
        r.group.rotation.z = sway * 0.12 * k;
        const want = r.id === sel ? 0.12 : 0;
        const dz = want - (r.group.position.z - r.home.z);
        if (Math.abs(dz) > 0.0005) {
          r.group.position.z += dz * (1 - Math.exp(-dt * 9));
          busy = true;
        }
      }
      if (pulling) {
        const k = Math.min(1, (now - pulling.t0) / 620);
        const e = ease(k);
        const g = pulling.rig.group;
        g.position.set(pulling.rig.home.x, pulling.rig.home.y + e * 0.28, pulling.rig.home.z + 0.12 + e * 1.5);
        g.rotation.set(LEAN * (1 - e), Math.sin(e * Math.PI) * -0.22, Math.sin(e * Math.PI) * 0.03);
        busy = true;
        if (k >= 1) {
          const rig = pulling.rig;
          pulling = null;
          latest.current.onOpen(rig.id, screenRect(rig));
          // put it back quietly once the reader has it
          setTimeout(() => {
            rig.group.position.copy(rig.home);
            rig.group.rotation.set(LEAN, 0, 0);
            kick();
          }, 900);
        }
      }
      stage.render();
      if (busy || drag) kick();
    }

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    api.current = { focus: (id) => focus(id), pull, setDone };
    setDone(progressRef.current);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      stage.dispose();
      api.current = null;
    };
    // the scene is built once; later changes go through `api`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  useEffect(() => api.current?.focus(selected), [selected]);
  useEffect(() => api.current?.setDone(progress), [progress]);

  return <div className={styles.host} ref={host} aria-hidden="true" />;
}

/** Lets the accessible list ask the scene to take a book down (so keyboard and screen readers get the same motion). */
export type ShelfSceneHandle = { pull(id: BookId): void };
