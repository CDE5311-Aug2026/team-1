// The display case: a French-polished walnut cabinet on a sideboard, against dark damask, lit by a brass picture lamp
// (dust turning in its beam). Two glazed doors on brass hinges; tap the glass and they swing open, slowly.
// Top shelf: each story's route chart. Finished: rolled on its rod, tied with red cord and sealed. Under way: rolled
// loosely, untied. Not started: an empty brass cradle. Tap one and it comes forward, the cord slips off and it unrolls:
// the route inked from the real stop positions (stops not yet found are pencilled with a "?").
// Bottom shelf: finished stories hang a struck gold medal on silk in the story's colour. A story under way has a bronze
// blank in its velvet recess, a notch cut in the rim for each stop found. Tap a medal and it lifts out; drag to turn it,
// tap it to turn it over: the reverse is engraved with the day you finished and how long it took.
// Everything comes from real progress (record.ts); nothing here is sample data.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOOKS, type BookId } from '../Bookshelf';
import { chapters, SHORT_PINS, shortProgress } from '../chapters';
import { dayOf, took, type StoryRecord } from '../record';
import { paintBaize, paintWood, svgImage } from './coverTexture';
import { medalObverse, medalReverse, paperBack, patina, planchet, reeding, ribbon, routeChart, scrollSheet, wallpaper, type MapPin } from './caseParts';
import { brass, canvas, contactShadow, createStage, easeInOut, easeOut, heavy, lampBeam, normalFromHeight, tweens, velvet } from './look';
import styles from './shelf3d.module.css';

const SERIF = "'IM Fell English', Georgia, serif";
const OPEN_KEY = 'hunt-case-open';
type Kind = 'medal' | 'blank' | 'map' | 'empty';
type Focus = { id: BookId; kind: Kind };

const sget = (k: string) => {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const sset = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* fine */
  }
};

function pinsOf(id: BookId): MapPin[] {
  if (id === 'short') {
    const sp = shortProgress();
    const pins: MapPin[] = [{ lat: SHORT_PINS.press.lat, lng: SHORT_PINS.press.lng, done: !!sp.deduce, name: '101 Jalan Sultan' }];
    // the second building is a secret until its clue is worked out
    if (sp.deduce) pins.push({ lat: SHORT_PINS.mosque.lat, lng: SHORT_PINS.mosque.lng, done: !!sp.bottle, name: 'Sultan Mosque' });
    return pins;
  }
  const ch = chapters().find((c) => c.routeId === id);
  return (ch?.stops ?? []).filter((s) => s.pin).map((s) => ({ lat: s.pin!.lat, lng: s.pin!.lng, done: s.done, name: s.name }));
}

function engravedPlate(text: string) {
  const c = canvas(512, 64),
    x = c.getContext('2d')!;
  x.fillStyle = '#a0a0a0';
  x.fillRect(0, 0, 512, 64);
  x.fillStyle = '#303030';
  x.font = `400 34px ${SERIF}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.letterSpacing = '6px';
  x.fillText(text, 256, 34);
  x.strokeStyle = '#505050';
  x.lineWidth = 2;
  x.strokeRect(8, 8, 496, 48);
  return c;
}

function fluting() {
  const c = canvas(64, 64),
    x = c.getContext('2d')!;
  for (let i = 0; i < 64; i++) {
    const v = Math.round(128 + 110 * Math.cos(((i % 16) / 16) * Math.PI * 2));
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(i, 0, 1, 64);
  }
  return c;
}

export function CaseScene({ records, onPick, onFail }: { records: StoryRecord[]; onPick(id: BookId): void; onFail(): void }) {
  const host = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const [open, setOpen] = useState(() => sget(OPEN_KEY) === '1');
  const openRef = useRef(open);
  const [focus, setFocus] = useState<Focus | null>(null);
  const api = useRef<{ open(): void; putBack(): void } | null>(null);

  useEffect(() => {
    const el = host.current!;
    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(el, styles.canvas, { fov: 24, paint: 0.7, bloom: 0.34 });
    } catch {
      onFail();
      return;
    }
    const { scene, camera, tex } = stage;
    // a rebuild starts with everything in its place
    setFocus(null);
    let disposed = false;
    let visible = true;
    let lastDraw = 0;
    let spinV = 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');

    const W = 3.6,
      H = 2.25,
      D = 0.7;
    const slotX = (i: number) => -W / 2 + 0.38 + i * 0.6;
    const add = <T extends THREE.Object3D>(o: T, cast = true, recv = true, parent: THREE.Object3D = scene) => {
      o.traverse((m) => {
        if ((m as THREE.Mesh).isMesh) {
          m.castShadow = cast;
          m.receiveShadow = recv;
        }
      });
      parent.add(o);
      return o;
    };

    // ---- materials ----
    const woodC = paintWood(1024, 256, [104, 58, 30], 41);
    const woodMat = new THREE.MeshPhysicalMaterial({
      map: tex(woodC, true, [2, 1]),
      bumpMap: tex(woodC, false, [2, 1]),
      bumpScale: 0.6,
      roughness: 0.48,
      clearcoat: 0.45,
      clearcoatRoughness: 0.32,
    });
    const darkWood = new THREE.MeshPhysicalMaterial({ map: tex(paintWood(1024, 256, [62, 36, 20], 7), true, [3, 1]), roughness: 0.55, clearcoat: 0.25 });
    const velvetMat = velvet('#24402f', '#86b08c');
    velvetMat.map = tex(paintBaize(512, 512, [150, 170, 150], 9), true, [3, 2]);
    const velvetDeep = velvet('#0e1c13', '#3f6048');
    const brassMat = brass(0.3);
    const fluteN = tex(normalFromHeight(fluting(), 2.4, 1), false, [1, 6]);

    // ---- room: wallpaper, sideboard ----
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshStandardMaterial({ map: tex(wallpaper(), true, [9, 5]), roughness: 0.92 }));
    wall.position.set(0, H / 2, -D / 2 - 0.1);
    add(wall, false, true);
    const board = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 4), darkWood);
    board.position.set(0, -0.3, 1.6);
    add(board, false, true);
    const pool = contactShadow(stage, W + 1.3, D + 1, 0.7);
    pool.position.set(0, -0.258, 0.05);
    scene.add(pool);

    // ---- carcass ----
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, r = 0.015) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat);
      m.position.set(x, y, z);
      return add(m);
    };
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), velvetMat);
    back.position.set(0, H / 2, -D / 2);
    add(back, false, true);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(D, H), velvetMat);
      side.rotation.y = -sx * (Math.PI / 2);
      side.position.set((sx * W) / 2, H / 2, 0);
      add(side, false, true);
    }
    box(W + 0.04, 0.05, D, woodMat, 0, -0.025, 0, 0.01); // floor
    box(W, 0.06, D, woodMat, 0, H / 2, 0, 0.01); // middle shelf
    box(W + 0.04, 0.05, D, woodMat, 0, H + 0.025, 0, 0.01); // ceiling
    // pilasters, fluted
    const pilMat = woodMat.clone();
    pilMat.normalMap = fluteN;
    pilMat.normalScale.set(0.9, 0.9);
    for (const sx of [-1, 1]) box(0.18, H + 0.12, D + 0.14, pilMat, sx * (W / 2 + 0.09), H / 2, 0.01, 0.02);
    // plinth and its moulding
    box(W + 0.56, 0.2, D + 0.3, woodMat, 0, -0.16, 0.04, 0.03);
    const bead = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, W + 0.5, 20), woodMat);
    bead.rotation.z = Math.PI / 2;
    bead.position.set(0, -0.06, D / 2 + 0.17);
    add(bead);
    // cornice: frieze, a torus moulding, the cap
    box(W + 0.44, 0.2, D + 0.16, woodMat, 0, H + 0.15, 0.02, 0.02);
    const torus = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, W + 0.5, 24), woodMat);
    torus.rotation.z = Math.PI / 2;
    torus.position.set(0, H + 0.27, D / 2 + 0.12);
    add(torus);
    box(W + 0.66, 0.07, D + 0.36, woodMat, 0, H + 0.33, 0.06, 0.02);
    // the brass plate on the frieze
    const plateH = engravedPlate('FINDSG  ·  CABINET OF FINDS');
    const plate = new THREE.Mesh(
      new RoundedBoxGeometry(1.2, 0.13, 0.012, 2, 0.004),
      new THREE.MeshStandardMaterial({ color: '#c79a4c', metalness: 1, roughness: 0.34, normalMap: tex(normalFromHeight(plateH, 2.5, 1), false), map: tex(patina(plateH, '#f1d08a', '#5c4018')) }),
    );
    plate.position.set(0, H + 0.15, D / 2 + 0.105);
    add(plate);

    // ---- doors ----
    const leaves: THREE.Group[] = [];
    const glassStreak = canvas(256);
    {
      const x = glassStreak.getContext('2d')!;
      const g = x.createLinearGradient(0, 0, 256, 256);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.36, 'rgba(255,255,255,0)');
      g.addColorStop(0.44, 'rgba(255,255,255,.22)');
      g.addColorStop(0.47, 'rgba(255,255,255,.05)');
      g.addColorStop(0.53, 'rgba(255,255,255,.12)');
      g.addColorStop(0.58, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 256, 256);
    }
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#fff', map: tex(glassStreak), transparent: true, opacity: 0.32, roughness: 0.04, metalness: 0, envMapIntensity: 0.9, depthWrite: false });
    const zDoor = D / 2 + 0.03;
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set((sx * W) / 2, 0, zDoor);
      const lw = W / 2;
      const cx = -sx * (lw / 2); // the leaf's centre, from the hinge
      const st = 0.075,
        th = 0.045;
      const part = (w: number, h: number, x: number, y: number) => {
        const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, th, 2, 0.012), woodMat);
        m.position.set(x, y, 0);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.door = true;
        pivot.add(m);
      };
      part(st, H, -sx * (st / 2), H / 2); // hinge stile
      part(st, H, -sx * (lw - st / 2), H / 2); // meeting stile
      part(lw, st, cx, st / 2); // bottom rail
      part(lw, st, cx, H - st / 2); // top rail
      part(lw - 2 * st, 0.045, cx, H / 2); // glazing bar at the shelf
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(lw - 2 * st, H - 2 * st), glassMat);
      pane.position.set(cx, H / 2, -0.004);
      pane.userData.door = true;
      pane.renderOrder = 5;
      pivot.add(pane);
      for (const hy of [0.32, H - 0.32]) {
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 16), brassMat);
        hinge.position.set(sx * 0.004, hy, th / 2 + 0.008);
        pivot.add(hinge);
      }
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14), brassMat);
      knob.position.set(-sx * (lw - st / 2), H / 2 + 0.1, th / 2 + 0.03);
      knob.castShadow = true;
      pivot.add(knob);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, 0.03, 12), brassMat);
      neck.rotation.x = Math.PI / 2;
      neck.position.set(knob.position.x, knob.position.y, th / 2 + 0.012);
      pivot.add(neck);
      if (sx > 0) {
        const esc = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.1, 0.006, 2, 0.003), brassMat);
        esc.position.set(-sx * (lw - st / 2), H / 2 - 0.08, th / 2 + 0.003);
        pivot.add(esc);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: '#100a04' }));
        hole.position.set(esc.position.x, esc.position.y + 0.012, th / 2 + 0.007);
        pivot.add(hole);
      }
      pivot.userData.sx = sx;
      scene.add(pivot);
      leaves.push(pivot);
    }
    const OPEN_A = 1.95;
    const setDoors = (a: number) => {
      for (const p of leaves) p.rotation.y = -p.userData.sx * a;
      
    };
    setDoors(openRef.current ? OPEN_A : 0);

    // ---- the lamp: a brass picture light over the cornice ----
    const lampY = H + 0.52,
      lampZ = D / 2 + 0.36;
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 32, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#c39445', metalness: 1, roughness: 0.28, side: THREE.DoubleSide }));
    hood.rotation.z = Math.PI / 2;
    hood.rotation.y = 0;
    hood.position.set(0, lampY, lampZ);
    // turn the open side down
    hood.rotation.x = Math.PI;
    add(hood, true, false);
    for (const sx of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24, 0, Math.PI), brassMat);
      cap.rotation.y = sx * (Math.PI / 2);
      cap.rotation.z = Math.PI;
      cap.position.set(sx * 0.75, lampY, lampZ);
      scene.add(cap);
    }
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.36, 16), new THREE.MeshStandardMaterial({ color: '#ffe6b8', emissive: '#ffcf86', emissiveIntensity: 3.2 }));
    bulb.rotation.z = Math.PI / 2;
    bulb.position.set(0, lampY - 0.03, lampZ);
    scene.add(bulb);
    for (const sx of [-0.45, 0.45]) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(sx, H + 0.37, 0.05), new THREE.Vector3(sx, H + 0.62, 0.12), new THREE.Vector3(sx, lampY + 0.1, lampZ - 0.08)]);
      add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.013, 8, false), brassMat), true, false);
    }
    const beam = lampBeam(stage, new THREE.Vector3(0, 0, 0), -(lampY + 0.2), 1.45);
    beam.group.position.set(0, lampY - 0.05, lampZ);
    beam.group.rotation.x = 0.2;
    beam.group.scale.set(1.25, 1, 0.5);
    scene.add(beam.group);

    // ---- light ----
    scene.add(new THREE.HemisphereLight(0xffeedd, 0x1a110a, 0.22));
    const spot = new THREE.SpotLight(0xffd6a0, 34, 9, 0.85, 0.75, 1.3);
    spot.position.set(0, lampY - 0.06, lampZ);
    spot.target.position.set(0, H * 0.3, -0.25);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.radius = 6;
    spot.shadow.bias = -0.0004;
    spot.shadow.normalBias = 0.01;
    scene.add(spot, spot.target);
    for (const y of [H - 0.1, H / 2 - 0.1]) {
      const strip = new THREE.PointLight(0xffc98a, 0.55, 2.6, 1.6);
      strip.position.set(0, y, D / 2 - 0.12);
      scene.add(strip);
    }
    const fill = new THREE.DirectionalLight(0xc8d4ff, 0.18);
    fill.position.set(-3, 2, 5);
    scene.add(fill);
    // a soft reading light for whatever is brought forward (the lamp is turned down meanwhile)
    const reading = new THREE.DirectionalLight(0xfff0d8, 0);
    reading.position.set(1.2, H + 1.6, 9);
    reading.target.position.set(0, H / 2, D / 2 + 1);
    scene.add(reading, reading.target);
    const SPOT = spot.intensity;
    const lights = (k: number) => {
      spot.intensity = SPOT * (1 - 0.85 * k);
      reading.intensity = 1.05 * k;
    };
    // the lamp spills up onto the wallpaper behind it
    const wash = new THREE.PointLight(0xffc68a, 1.4, 3.2, 1.4);
    wash.position.set(0, H + 0.75, -D / 2 + 0.15);
    scene.add(wash);

    // ---- what is in the case ----
    type Slot = { id: BookId; kind: Kind; target: THREE.Object3D | null; scroll?: ReturnType<typeof makeScroll> };
    const slots: Slot[] = [];
    const picks: THREE.Object3D[] = [];
    const hit = (w: number, h: number, d: number, x: number, y: number, z: number, slot: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
      m.position.set(x, y, z);
      m.userData = { slot };
      scene.add(m);
      picks.push(m);
    };
    const backPaper = tex(paperBack());
    const arts = new Map<string, Promise<HTMLImageElement>>();
    const art = (id: BookId, ink: string) => {
      const key = id + ink;
      if (!arts.has(key)) {
        const b = BOOKS.find((x) => x.id === id)!;
        arts.set(key, svgImage(b, ink));
      }
      return arts.get(key)!.catch(() => new Promise<HTMLImageElement>(() => {}));
    };

    function makeScroll(r: StoryRecord, i: number) {
      const width = 0.44,
        length = 0.62,
        r0 = r.finished ? 0.04 : 0.05;
      const sheet = scrollSheet(width, length, r0);
      const g = new THREE.Group();
      const pins = pinsOf(r.id);
      const chartMap = tex(routeChart(r.title, r.place, pins, r.finished, i + 3));
      const front = new THREE.Mesh(sheet.geo, new THREE.MeshStandardMaterial({ map: chartMap, color: '#d9ccb4', roughness: 0.9, side: THREE.FrontSide }));
      art(r.id, '#3a2412').then((img) => {
        if (disposed) return;
        chartMap.image = routeChart(r.title, r.place, pins, r.finished, i + 3, img);
        chartMap.needsUpdate = true;
        draw(true);
      });
      const backM = new THREE.Mesh(sheet.geo, new THREE.MeshStandardMaterial({ map: backPaper, color: '#c9b48e', roughness: 0.92, side: THREE.BackSide }));
      front.castShadow = backM.castShadow = true;
      front.receiveShadow = backM.receiveShadow = true;
      g.add(front, backM);
      const rod = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, width + 0.07, 12), darkWood);
      stick.rotation.z = Math.PI / 2;
      rod.add(stick);
      for (const sx of [-1, 1]) {
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), woodMat);
        k.scale.set(1, 1, 1);
        k.position.x = sx * (width / 2 + 0.045);
        rod.add(k);
      }
      rod.traverse((m) => ((m as THREE.Mesh).isMesh ? ((m.castShadow = true), (m.receiveShadow = true)) : 0));
      g.add(rod);
      const batten = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.014, 0.008), darkWood);
      batten.position.set(0, 0.004, 0.002);
      g.add(batten);
      const tie = new THREE.Group();
      if (r.finished) {
        const cord = new THREE.Mesh(new THREE.TorusGeometry(r0 + 0.006, 0.0055, 8, 40), new THREE.MeshStandardMaterial({ color: '#a3291a', roughness: 0.65 }));
        cord.rotation.y = Math.PI / 2;
        tie.add(cord);
        const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.012, 20), new THREE.MeshPhysicalMaterial({ color: '#8c1d12', roughness: 0.35, clearcoat: 0.6 }));
        seal.rotation.x = Math.PI / 2;
        seal.position.set(0, 0, r0 + 0.008);
        tie.add(seal);
        tie.position.set(0.09, 0, 0);
        tie.traverse((m) => ((m as THREE.Mesh).isMesh ? (m.castShadow = true) : 0));
      }
      g.add(tie);
      const wind = (u: number) => {
        const c = sheet.set(u);
        rod.position.copy(c);
        tie.position.y = c.y;
        tie.position.z = c.z;
      };
      wind(r.finished ? 0 : 0.06);
      // on the shelf: the roll's centre on the cradle, the loose edge tucked behind
      const shelfY = H / 2 + 0.03 + 0.085;
      g.position.set(slotX(i), shelfY, -r0 - 0.02);
      g.rotation.x = r.finished ? 0 : 0.25;
      g.rotation.z = (i % 2 ? 1 : -1) * 0.02;
      scene.add(g);
      return { group: g, wind, tie, r0, u: r.finished ? 0 : 0.06 };
    }

    records.forEach((r, i) => {
      const x = slotX(i);
      // the cradle: two brass hooks on little blocks
      for (const dx of [-0.19, 0.19]) {
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 8, 24, Math.PI), brassMat);
        hook.rotation.set(0, Math.PI / 2, Math.PI);
        hook.position.set(x + dx, H / 2 + 0.03 + 0.085, 0);
        add(hook, true, false);
        box(0.05, 0.03, 0.12, darkWood, x + dx, H / 2 + 0.045, 0, 0.006);
      }
      const started = r.finished || r.done > 0 || !!r.startedAt;
      let scroll: Slot['scroll'];
      if (started) scroll = makeScroll(r, i);
      slots.push({ id: r.id, kind: started ? 'map' : 'empty', target: scroll?.group ?? null, scroll });
      hit(0.56, 0.4, D * 0.8, x, H / 2 + 0.25, 0, slots.length - 1);

      // ---- bottom shelf ----
      const mz = -D / 2 + 0.1;
      let target: THREE.Object3D | null = null;
      let kind: Kind = 'empty';
      if (r.finished) {
        kind = 'medal';
        const top = H / 2 - 0.1;
        const bar = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.04, 0.02, 2, 0.006), brassMat);
        bar.position.set(x, top, mz);
        add(bar);
        const rg = new THREE.PlaneGeometry(0.15, 0.34, 3, 12);
        const rp = rg.attributes.position;
        for (let k = 0; k < rp.count; k++) rp.setZ(k, 0.012 * Math.cos((rp.getY(k) / 0.34) * Math.PI) + 0.004 * Math.cos((rp.getX(k) / 0.15) * Math.PI));
        rg.computeVertexNormals();
        const rib = new THREE.Mesh(rg, new THREE.MeshPhysicalMaterial({ map: tex(ribbon(r.tone)), roughness: 0.5, sheen: 1, sheenColor: new THREE.Color('#fff4d6'), sheenRoughness: 0.35, side: THREE.DoubleSide }));
        rib.position.set(x, top - 0.19, mz);
        add(rib);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 24), brassMat);
        ring.position.set(x, top - 0.37, mz + 0.004);
        add(ring);
        target = makeMedal(r);
        target.position.set(x, top - 0.39 - 0.165, mz + 0.012);
        target.rotation.y = 0.12 * (i % 2 ? 1 : -1);
        add(target);
      } else if (r.done > 0 || r.startedAt) {
        kind = 'blank';
        recess(x, 0.5, mz);
        target = makeBlank(r);
        target.position.set(x, 0.5, -D / 2 + 0.03);
        add(target);
      } else recess(x, 0.5, mz);
      slots.push({ id: r.id, kind, target });
      hit(0.56, H / 2 - 0.1, D * 0.8, x, H / 4, 0, slots.length - 1);

      // the story's numeral on a little brass label on the shelf lip
      const lab = canvas(128, 64),
        lx = lab.getContext('2d')!;
      lx.fillStyle = '#a0a0a0';
      lx.fillRect(0, 0, 128, 64);
      lx.fillStyle = '#2a2a2a';
      lx.font = `400 40px ${SERIF}`;
      lx.textAlign = 'center';
      lx.textBaseline = 'middle';
      lx.fillText(r.roman, 64, 34);
      const tag = new THREE.Mesh(
        new RoundedBoxGeometry(0.15, 0.075, 0.008, 2, 0.003),
        new THREE.MeshStandardMaterial({ color: '#c79a4c', metalness: 1, roughness: 0.36, normalMap: tex(normalFromHeight(lab, 2.2, 1), false), map: tex(patina(lab, '#f1d08a', '#5c4018')) }),
      );
      tag.position.set(x, -0.03, D / 2 + 0.006);
      scene.add(tag);
    });

    function recess(x: number, y: number, z: number) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.17, 48), velvetDeep);
      hole.position.set(x, y, -D / 2 + 0.002);
      add(hole, false, true);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.012, 10, 64), velvetMat);
      lip.position.set(x, y, -D / 2 + 0.004);
      add(lip, true, true);
      void z;
    }

    function makeMedal(r: StoryRecord) {
      const R = 0.165,
        T = 0.026;
      const g = new THREE.Group();
      const obv = medalObverse(r.roman, 'FINDSG · FIELD MEDAL · SINGAPORE');
      const t = took(r);
      const rev = medalReverse([r.title, r.place, r.finishedAt ? `Finished ${dayOf(r.finishedAt)}` : 'Finished', t ? `In ${t}` : ''].filter(Boolean), `${r.total} STOPS · ${r.stamps.length} STAMPED`);
      const goldOf = (h: HTMLCanvasElement, sign: number) =>
        new THREE.MeshPhysicalMaterial({
          color: '#fff',
          map: tex(patina(h, '#f6cf72', '#5a3a0e')),
          metalness: 1,
          roughness: 0.27,
          normalMap: tex(normalFromHeight(h, 4.5 * sign, 1), false),
        });
      const frontMat = goldOf(obv, 1);
      const front = new THREE.Mesh(new THREE.CircleGeometry(R - 0.012, 96), frontMat);
      art(r.id, '#ffffff').then((img) => {
        if (disposed) return;
        const h = medalObverse(r.roman, 'FINDSG · FIELD MEDAL · SINGAPORE', img);
        frontMat.map!.image = patina(h, '#f6cf72', '#6e4a16');
        frontMat.map!.needsUpdate = true;
        frontMat.normalMap!.image = normalFromHeight(h, 4.5, 1);
        frontMat.normalMap!.needsUpdate = true;
        draw(true);
      });
      front.position.z = T / 2;
      const backF = new THREE.Mesh(new THREE.CircleGeometry(R - 0.012, 96), goldOf(rev, 1));
      backF.rotation.y = Math.PI;
      backF.position.z = -T / 2;
      const ree = tex(normalFromHeight(reeding(), 3, 0), false, [3, 1]);
      const edge = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 96, 1, true), new THREE.MeshStandardMaterial({ color: '#d9ab52', metalness: 1, roughness: 0.3, normalMap: ree }));
      edge.rotation.x = Math.PI / 2;
      const rimMat = new THREE.MeshStandardMaterial({ color: '#e2b65c', metalness: 1, roughness: 0.22 });
      for (const z of [T / 2, -T / 2]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.011, 0.011, 12, 96), rimMat);
        rim.position.z = z;
        g.add(rim);
      }
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.005, 8, 16), rimMat);
      eye.position.y = R + 0.012;
      eye.rotation.y = Math.PI / 2;
      g.add(front, backF, edge, eye);
      return g;
    }

    function makeBlank(r: StoryRecord) {
      const R = 0.15,
        T = 0.022;
      const g = new THREE.Group();
      const h = planchet(r.done, r.total);
      const faceMat = new THREE.MeshPhysicalMaterial({ color: '#cdb497', map: tex(patina(h, '#b08458', '#2a1a0e')), metalness: 0.9, roughness: 0.42, normalMap: tex(normalFromHeight(h, 4, 1), false) });
      const face = new THREE.Mesh(new THREE.CircleGeometry(R, 72), faceMat);
      art(r.id, '#4a4a4a').then((img) => {
        if (disposed) return;
        const h2 = planchet(r.done, r.total, img);
        faceMat.map!.image = patina(h2, '#b08458', '#2a1a0e');
        faceMat.map!.needsUpdate = true;
        faceMat.normalMap!.image = normalFromHeight(h2, 4, 1);
        faceMat.normalMap!.needsUpdate = true;
        draw(true);
      });
      face.position.z = T / 2;
      const edge = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 72, 1, true), new THREE.MeshStandardMaterial({ color: '#8a6440', metalness: 0.9, roughness: 0.45 }));
      edge.rotation.x = Math.PI / 2;
      const backF = new THREE.Mesh(new THREE.CircleGeometry(R, 72), new THREE.MeshStandardMaterial({ color: '#8a5e34', metalness: 0.85, roughness: 0.55 }));
      backF.rotation.y = Math.PI;
      backF.position.z = -T / 2;
      g.add(face, edge, backF);
      return g;
    }

    // ---- view ----
    const t = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const lookY = (H + 0.3) / 2;
    let camY = lookY + 0.3;
    const fit = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      stage.setSize(w, h);
      const halfW = W / 2 + 0.38,
        halfH = (H + 1.0) / 2;
      const dist = Math.max(halfW / t() / camera.aspect, halfH / t()) + D / 2 + 0.25;
      camera.position.set(0.1, camY, dist);
      camera.lookAt(0, lookY, 0);
      draw(true);
    };
    function draw(force = false) {
      if (disposed) return;
      const now = performance.now();
      // dust alone runs at 30 fps; anything moving runs at full rate
      if (!force && !tw.busy && Math.abs(spinV) < 0.0005 && now - lastDraw < 32) return;
      lastDraw = now;
      if (!reduce) beam.tick(now / 1000);
      if (Math.abs(spinV) > 0.0005 && held) {
        held.obj.rotation.y += spinV;
        spinV *= 0.94;
      }
      stage.render();
    }
    const tw = tweens(() => draw());
    tw.keepWhile(() => visible && !reduce && !document.hidden);

    // ---- doors ----
    let state: 'closed' | 'open' | 'busy' | 'focus' = openRef.current ? 'open' : 'closed';
    const openDoors = () => {
      if (state !== 'closed') return;
      state = 'busy';
      openRef.current = true;
      sset(OPEN_KEY, '1');
      setOpen(true);
      // a heavy pair of doors: they give a little, then swing
      tw.add(1500, (k) => setDoors(k * OPEN_A), heavy, () => (state = 'open'));
    };

    // ---- focus: bring a thing forward ----
    const dim = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshBasicMaterial({ color: '#0b0704', transparent: true, opacity: 0, depthWrite: false }));
    dim.position.set(0, lookY, D / 2 + 0.45);
    dim.renderOrder = 10;
    dim.visible = false;
    scene.add(dim);
    let held: { obj: THREE.Object3D; parent: THREE.Object3D; pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3; slot: Slot } | null = null;
    const frontZ = D / 2 + 0.95;

    const bring = (slot: Slot) => {
      state = 'busy';
      setFocus({ id: slot.id, kind: slot.kind });
      dim.visible = true;
      tw.add(500, (k) => {
        (dim.material as THREE.MeshBasicMaterial).opacity = k * 0.62;
        lights(k);
      }, easeOut);
      const obj = slot.target;
      if (!obj) {
        state = 'focus';
        return;
      }
      const parent = obj.parent!;
      held = { obj, parent, pos: obj.position.clone(), quat: obj.quaternion.clone(), scale: obj.scale.clone(), slot };
      obj.traverse((m) => (m.renderOrder = 11));
      const from = { p: obj.position.clone(), q: obj.quaternion.clone(), s: obj.scale.x };
      // face the camera, a touch tilted back
      const toQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(slot.kind === 'map' ? -0.05 : -0.12, 0, 0));
      // what the camera sees at the front: size the thing to fill most of it
      const dist = camera.position.z - frontZ;
      const halfH = dist * t(),
        halfW = halfH * camera.aspect;
      if (slot.kind === 'map' && slot.scroll) {
        const sc = slot.scroll;
        const S = Math.min((2 * halfH * 0.84) / 0.62, (2 * halfW * 0.9) / 0.44);
        const to = new THREE.Vector3(0, lookY + (0.62 * S) / 2 - 0.02, frontZ - sc.r0 * S);
        tw.add(
          700,
          (k) => {
            obj.position.lerpVectors(from.p, to, k);
            obj.quaternion.slerpQuaternions(from.q, toQ, k);
            obj.scale.setScalar(THREE.MathUtils.lerp(from.s, S, k));
          },
          easeInOut,
          () => {
            // the cord slips off, then it unrolls under its own weight
            tw.add(350, (k) => {
              sc.tie.scale.setScalar(1 - k);
              sc.tie.position.x = 0.09 + k * 0.25;
            });
            const u0 = sc.u;
            tw.add(1300, (k) => sc.wind(u0 + (1 - u0) * k), heavy, () => (state = 'focus'));
          },
        );
      } else {
        const S = (halfH * (slot.kind === 'medal' ? 0.72 : 0.5)) / (slot.kind === 'medal' ? 0.177 : 0.15);
        const to = new THREE.Vector3(0, lookY + 0.02, frontZ);
        tw.add(
          750,
          (k) => {
            obj.position.lerpVectors(from.p, to, k);
            // lift it clear of the velvet first
            obj.position.z += Math.sin(k * Math.PI) * 0.25;
            obj.quaternion.slerpQuaternions(from.q, toQ, k);
            obj.scale.setScalar(THREE.MathUtils.lerp(from.s, S, k));
          },
          easeInOut,
          () => {
            state = 'focus';
            // a slow turn so the light runs across the relief
            if (!reduce) spinV = slot.kind === 'medal' ? 0.035 : 0.02;
          },
        );
      }
    };

    const putBack = () => {
      if (state !== 'focus') return;
      state = 'busy';
      setFocus(null);
      tw.add(
        450,
        (k) => {
          (dim.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.62;
          lights(1 - k);
        },
        easeOut,
        () => (dim.visible = false),
      );
      const h = held;
      if (!h) {
        state = 'open';
        return;
      }
      spinV = 0;
      const back = () => {
        const from = { p: h.obj.position.clone(), q: h.obj.quaternion.clone(), s: h.obj.scale.x };
        tw.add(
          650,
          (k) => {
            h.obj.position.lerpVectors(from.p, h.pos, k);
            h.obj.quaternion.slerpQuaternions(from.q, h.quat, k);
            h.obj.scale.setScalar(THREE.MathUtils.lerp(from.s, h.scale.x, k));
          },
          easeInOut,
          () => {
            h.obj.traverse((m) => (m.renderOrder = 0));
            held = null;
            state = 'open';
          },
        );
      };
      const sc = h.slot.scroll;
      if (h.slot.kind === 'map' && sc) {
        const u1 = sc.u;
        tw.add(900, (k) => sc.wind(1 - (1 - u1) * k), easeInOut, () => {
          if (sc.u === 0)
            tw.add(300, (k) => {
              sc.tie.scale.setScalar(k);
              sc.tie.position.x = 0.34 - k * 0.25;
            });
          back();
        });
      } else back();
    };
    api.current = { open: openDoors, putBack };

    // ---- pointer ----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number; t: number; lx: number } | null = null;
    let dragged = false;
    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX };
      dragged = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) dragged = true;
      if (state === 'focus' && held && held.slot.kind !== 'map' && dragged) {
        const dx = e.clientX - down.lx;
        down.lx = e.clientX;
        held.obj.rotation.y += dx * 0.012;
        spinV = dx * 0.012 * 0.6;
        tw.kick();
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const wasDrag = dragged;
      down = null;
      if (wasDrag) {
        tw.kick();
        return;
      }
      at(e);
      if (state === 'closed') return openDoors();
      if (state === 'open') {
        const h = ray.intersectObjects(picks, false)[0]?.object;
        if (!h) return;
        if (h) bring(slots[h.userData.slot as number]);
        return;
      }
      if (state === 'focus') {
        const onIt = held && ray.intersectObject(held.obj, true).length > 0;
        if (onIt && held && held.slot.kind !== 'map') {
          // tap the medal: turn it over
          const from = held.obj.rotation.y;
          const to = Math.round(from / Math.PI) * Math.PI + Math.PI;
          spinV = 0;
          const o = held.obj;
          tw.add(700, (k) => (o.rotation.y = from + (to - from) * k), heavy);
        } else putBack();
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && putBack();
    window.addEventListener('keydown', onKey);

    // the case leans a hair with the scroll, so gold and glass catch the light
    let sraf = 0;
    const onScroll = () => {
      if (sraf) return;
      sraf = requestAnimationFrame(() => {
        sraf = 0;
        const r = el.getBoundingClientRect();
        const k = THREE.MathUtils.clamp((r.top + r.height / 2) / window.innerHeight - 0.5, -0.6, 0.6);
        camY = lookY + 0.3 + k * 0.5;
        camera.position.y = camY;
        camera.lookAt(0, lookY, 0);
        draw(true);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) tw.kick();
    });
    io.observe(el);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    document.fonts?.ready.then(() => !disposed && draw(true));

    return () => {
      disposed = true;
      api.current = null;
      tw.stop();
      cancelAnimationFrame(sraf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      stage.dispose();
    };
    // rebuilt when the record changes (rare: after playing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(records.map((r) => [r.id, r.finished, r.done, r.stamps.length]))]);

  const rec = focus ? records.find((r) => r.id === focus.id) : null;
  const line = (() => {
    if (!focus || !rec) return '';
    if (focus.kind === 'medal') {
      const t = took(rec);
      return `${rec.finishedAt ? `Finished ${dayOf(rec.finishedAt)}` : 'Finished'}${t ? `, in ${t}` : ''}. Drag to turn it; tap it for the back.`;
    }
    if (focus.kind === 'blank') return `${rec.done} of ${rec.total} found: a notch for each. It is struck when every stop is found.`;
    if (focus.kind === 'map') return rec.finished ? `Every stop found, the route inked in full.` : `${rec.done} of ${rec.total} stops inked so far.`;
    return 'Not started. Its chart and its medal wait here.';
  })();

  return (
    <div className={styles.caseWrap}>
      <div className={`${styles.host} ${styles.caseHost}`} ref={host} aria-hidden="true" />
      {!open && (
        <button type="button" className={styles.caseHint} onClick={() => api.current?.open()}>
          Tap the glass to open the case
        </button>
      )}
      {focus && rec && (
        <div className={styles.caseBar} role="group" aria-label={rec.title}>
          <p>
            <b>{rec.title}</b>
            <span>{line}</span>
          </p>
          <div>
            <button type="button" onClick={() => api.current?.putBack()}>
              Put it back
            </button>
            <button type="button" className={styles.caseGo} onClick={() => onPick(rec.id)}>
              Open the book ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
