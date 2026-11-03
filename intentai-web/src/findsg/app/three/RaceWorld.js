import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const UP = new THREE.Vector3(0, 1, 0);
const STARTS = [0.015, 0.35, 0.68];
const ENDS = [0.31, 0.64, 0.93];
const POINTS = [[-62, 64], [-62, 26], [-52, -22], [-15, -48], [30, -44], [60, -12], [55, 30], [24, 56], [-12, 44], [-2, 16], [28, 6], [58, 10], [87, 8]];
const clamp = THREE.MathUtils.clamp;
const ease = (a) => 1 - (1 - clamp(a, 0, 1)) ** 3;
const seed = (i) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

/** Imperative scene only: it never grants rewards or advances a checkpoint. */
export class RaceWorld {
  constructor(container, { onFailure = () => {} } = {}) {
    this.engine = 'three.js';
    this.container = container;
    this.document = container.ownerDocument;
    this.window = this.document.defaultView;
    this.onFailure = onFailure;
    this.geometries = new Set(); this.materials = new Set(); this.textures = new Set();
    this.cleanup = []; this.raf = null; this.disposed = false; this.visible = true;
    this.phase = 'driving'; this.stage = 0; this.speed = 0; this.reducedMotion = false;
    this.view = 'chase'; this.progress = STARTS[0]; this.forcedTarget = this.progress;
    this.previousStamp = 0; this.time = 0; this.wheelTravel = 0; this.kick = 0;
    this.celebrationKey = -1; this.celebrationStarted = 0; this.settleFrames = 2;
    this.celebrationPausedAt = null; this.cameraStamp = this.window.performance.now();
    this.tmpPosition = new THREE.Vector3(); this.tmpTangent = new THREE.Vector3();
    this.tmpNormal = new THREE.Vector3(); this.cameraGoal = new THREE.Vector3(); this.lookGoal = new THREE.Vector3();
    this.lookPosition = new THREE.Vector3(); this.wheels = []; this.reflections = [];
    this.frame = this.frame.bind(this);
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(this.window.devicePixelRatio || 1, 1.6));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.18;
      this.renderer.domElement.className = 'race3d-canvas';
      this.renderer.domElement.setAttribute('aria-hidden', 'true');
      container.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#07181d');
      this.scene.fog = new THREE.FogExp2('#10262a', 0.0045);
      this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 550);
      this.curve = new THREE.CatmullRomCurve3(POINTS.map(([x, z]) => new THREE.Vector3(x, 0.1, z)), false, 'centripetal');
      this.curve.arcLengthDivisions = 1600; this.curve.updateArcLengths(); this.length = this.curve.getLength();
      this.buildLighting(); this.buildGround(); this.buildTrack(); this.buildCity(); this.buildCar(); this.buildPodium(); this.buildFireworks();
      this.resize = this.resize.bind(this);
      if (this.window.ResizeObserver) { this.resizeObserver = new this.window.ResizeObserver(this.resize); this.resizeObserver.observe(container); }
      else { this.window.addEventListener('resize', this.resize); this.cleanup.push(() => this.window.removeEventListener('resize', this.resize)); }
      if (this.window.IntersectionObserver) {
        this.intersectionObserver = new this.window.IntersectionObserver(([entry]) => {
          this.visible = entry.isIntersecting;
          if (this.visible) { this.previousStamp = 0; this.requestFrame(); } else this.stopFrame();
        }, { rootMargin: '100px' });
        this.intersectionObserver.observe(container);
      }
      const visibility = () => { this.previousStamp = 0; if (this.document.hidden) this.stopFrame(); else this.requestFrame(); };
      this.document.addEventListener('visibilitychange', visibility); this.cleanup.push(() => this.document.removeEventListener('visibilitychange', visibility));
      const contextLost = (event) => { event.preventDefault(); this.fail(new Error('WebGL context lost')); };
      this.renderer.domElement.addEventListener('webglcontextlost', contextLost, false);
      this.cleanup.push(() => this.renderer?.domElement.removeEventListener('webglcontextlost', contextLost));
      this.resize(); this.update(0, true); this.renderer.render(this.scene, this.camera);
    } catch (error) { this.dispose(); throw error; }
  }

  geometry(g) { this.geometries.add(g); return g; }
  material(m) { this.materials.add(m); return m; }
  texture(t) { this.textures.add(t); return t; }
  surfaceTexture(kind, text = '') {
    this.surfaceTextures ??= new Map(); const key = kind + ':' + text;
    if (this.surfaceTextures.has(key)) return this.surfaceTextures.get(key);
    const canvas = this.document.createElement('canvas'); canvas.width = kind === 'road' ? 128 : 256; canvas.height = kind === 'road' ? 512 : 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (kind === 'road') {
        ctx.fillStyle = '#303b40'; ctx.fillRect(0, 0, 128, 512);
        for (let i = 0; i < 2200; i++) { ctx.fillStyle = i % 3 ? 'rgba(200,211,209,.07)' : 'rgba(2,9,13,.18)'; ctx.fillRect(seed(i + 5) * 128, seed(i + 800) * 512, 1 + seed(i) * 2, 1 + seed(i + 30) * 3); }
        ctx.fillStyle = 'rgba(8,15,20,.19)'; ctx.fillRect(37, 0, 10, 512); ctx.fillRect(81, 0, 10, 512);
        ctx.fillStyle = 'rgba(177,197,189,.07)'; ctx.fillRect(7, 0, 7, 512); ctx.fillRect(114, 0, 7, 512);
      } else {
        ctx.fillStyle = kind === 'number' ? '#e8dec2' : '#152923'; ctx.fillRect(0, 0, 256, 128);
        ctx.strokeStyle = '#bd985d'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, 240, 112); ctx.fillStyle = kind === 'number' ? '#243d34' : '#e8c581'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = kind === 'team' ? '600 31px sans-serif' : '700 83px Georgia,serif'; ctx.fillText(text, 128, 69, 226);
      }
    }
    const texture = this.texture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
    this.surfaceTextures.set(key, texture); return texture;
  }
  mesh(g, m, parent = this.scene, position = null) {
    const mesh = new THREE.Mesh(this.geometry(g), this.material(m));
    if (position) mesh.position.set(...position);
    parent.add(mesh); return mesh;
  }
  box(w, h, d, material, parent, x = 0, y = 0, z = 0) {
    return this.mesh(new THREE.BoxGeometry(w, h, d), material, parent, [x, y, z]);
  }
  standard(color, options = {}) { return this.material(new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25, ...options })); }
  basic(color, options = {}) { return this.material(new THREE.MeshBasicMaterial({ color, ...options })); }
  sample(t) {
    const p = this.curve.getPointAt(clamp(t, 0, 1));
    const tangent = this.curve.getTangentAt(clamp(t, 0, 1)).normalize();
    return { p, tangent, normal: new THREE.Vector3(tangent.z, 0, -tangent.x) };
  }
  bar(a, b, radius, material, parent = this.scene) {
    const direction = new THREE.Vector3().subVectors(b, a);
    const mesh = this.mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material, parent);
    mesh.position.copy(a).add(b).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(UP, direction.normalize()); return mesh;
  }

  buildLighting() {
    this.scene.add(new THREE.HemisphereLight('#c4d6c0', '#15262d', 2.0));
    const moon = new THREE.DirectionalLight('#b8d8db', 2.4); moon.position.set(-45, 70, 25); this.scene.add(moon);
    const warm = new THREE.DirectionalLight('#ffca85', 3.2); warm.position.set(20, 25, -20); this.scene.add(warm);
    this.carFill = new THREE.PointLight('#ffdca2', 22, 23, 2); this.scene.add(this.carFill);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = pmrem.fromScene(environment, 0.06);
    this.scene.environment = this.environmentTarget.texture;
    environment.dispose(); pmrem.dispose();
  }

  buildGround() {
    const ground = this.mesh(new THREE.PlaneGeometry(500, 500), this.standard('#102523', { roughness: 0.97, metalness: 0 }), this.scene, [0, -0.12, -15]);
    ground.rotation.x = -Math.PI / 2;
    this.waterMaterial = this.material(new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vPosition; void main(){vUv=uv;vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform float time; varying vec2 vUv; varying vec3 vPosition; void main(){float wave=sin(vUv.y*160.0+time*1.1+sin(vUv.x*34.0))*0.5+0.5;float shimmer=pow(max(0.0,sin(vUv.x*125.0+sin(vUv.y*130.0+time)*0.45)),14.0);float streak=shimmer*pow(max(0.0,1.0-abs(vUv.y-.44)*1.6),3.0);vec3 col=mix(vec3(.025,.10,.115),vec3(.10,.21,.20),wave*.28);col+=vec3(.58,.38,.13)*streak*.4;gl_FragColor=vec4(col,1.0);}',
      side: THREE.DoubleSide
    }));
    const water = this.mesh(new THREE.PlaneGeometry(350, 84), this.waterMaterial, this.scene, [5, 0.015, -111]); water.rotation.x = -Math.PI / 2;
    const bank = this.standard('#263f3b', { roughness: 0.8 });
    this.box(350, 0.6, 2, bank, this.scene, 5, 0.15, -68);
  }

  ribbon(fromOffset, toOffset, height, material, vertexColors = false, steps = 380) {
    const positions = [], colors = [], indices = [], uvs = [];
    const amber = new THREE.Color('#c8764d'), pale = new THREE.Color('#c7c8b5');
    for (let i = 0; i <= steps; i++) {
      const { p, normal } = this.sample(i / steps);
      for (const offset of [fromOffset, toOffset]) {
        positions.push(p.x + normal.x * offset, height, p.z + normal.z * offset);
        uvs.push(offset === fromOffset ? 0 : 1, i / steps);
        if (vertexColors) { const c = Math.floor(i / 3) % 2 ? amber : pale; colors.push(c.r, c.g, c.b); }
      }
      if (i < steps) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (vertexColors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); return this.mesh(geometry, material);
  }

  buildTrack() {
    const road = this.standard('#ced5d0', { map: this.surfaceTexture('road'), roughness: 0.57, metalness: 0.3, side: THREE.DoubleSide });
    this.ribbon(-5.25, 5.25, 0.12, road);
    const kerb = this.standard('#ffffff', { vertexColors: true, side: THREE.DoubleSide, roughness: 0.6 });
    this.ribbon(-5.9, -5.25, 0.16, kerb, true); this.ribbon(5.25, 5.9, 0.16, kerb, true);
    const line = this.basic('#cdc9ac', { side: THREE.DoubleSide });
    this.ribbon(-5.0, -4.87, 0.14, line); this.ribbon(4.87, 5.0, 0.14, line);
    const rail = this.standard('#71867f', { roughness: 0.35, metalness: 0.8 });
    for (const side of [-1, 1]) {
      const points = Array.from({ length: 190 }, (_, i) => { const { p, normal } = this.sample(i / 189); return p.addScaledVector(normal, side * 6.25).setY(1.0); });
      this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 250, 0.12, 5, false), rail);
    }
    const postGeo = this.geometry(new THREE.BoxGeometry(0.16, 1.15, 0.18));
    const posts = new THREE.InstancedMesh(postGeo, rail, 160), dummy = new THREE.Object3D();
    for (let i = 0; i < 80; i++) for (let s = 0; s < 2; s++) {
      const { p, normal } = this.sample(i / 79); dummy.position.copy(p).addScaledVector(normal, s ? 6.25 : -6.25).setY(0.55); dummy.updateMatrix(); posts.setMatrixAt(i * 2 + s, dummy.matrix);
    }
    this.scene.add(posts);
    const lampMat = this.standard('#52635c', { roughness: 0.45, metalness: 0.7 });
    const lampGlow = this.basic('#ffe2a3', { toneMapped: false });
    const poleGeometry = this.geometry(new THREE.CylinderGeometry(0.09, 0.16, 8.0, 7));
    const poles = new THREE.InstancedMesh(poleGeometry, lampMat, 38);
    const heads = new THREE.InstancedMesh(this.geometry(new THREE.BoxGeometry(2.0, 0.15, 0.55)), lampGlow, 38);
    for (let i = 0; i < 38; i++) {
      const { p, normal, tangent } = this.sample(i / 37); const side = i % 2 ? 1 : -1;
      dummy.position.copy(p).addScaledVector(normal, side * 8).setY(4); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 8; dummy.position.addScaledVector(normal, -side * 0.8); dummy.rotation.y = Math.atan2(tangent.x, tangent.z); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(poles, heads);
    const dashGeo = this.geometry(new THREE.BoxGeometry(0.12, 0.02, 2.0));
    const dashes = new THREE.InstancedMesh(dashGeo, this.basic('#b5b5a6'), 78);
    for (let i = 0; i < 78; i++) { const { p, tangent } = this.sample(i / 78); dummy.position.copy(p).setY(0.15); dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0); dummy.updateMatrix(); dashes.setMatrixAt(i, dummy.matrix); }
    this.scene.add(dashes);
    this.gates = [];
    for (let i = 0; i < 3; i++) {
      const { p, tangent } = this.sample(ENDS[i]); const group = new THREE.Group(); group.position.copy(p); group.rotation.y = Math.atan2(tangent.x, tangent.z);
      this.scene.add(group); const mat = this.basic('#b6844b'); this.gates.push(mat);
      this.box(0.15, 3.7, 0.2, rail, group, -5.8, 1.85, 0); this.box(0.15, 3.7, 0.2, rail, group, 5.8, 1.85, 0);
      this.box(11.75, 0.24, 0.24, mat, group, 0, 3.7, 0);
    }
    const finish = this.sample(0.96), finishGroup = new THREE.Group(); finishGroup.position.copy(finish.p); finishGroup.rotation.y = Math.atan2(finish.tangent.x, finish.tangent.z); this.scene.add(finishGroup);
    for (let x = 0; x < 10; x++) for (let z = 0; z < 3; z++) this.box(1.0, 0.025, 0.7, this.basic((x + z) % 2 ? '#d5d4bd' : '#17272a'), finishGroup, x - 4.5, 0.15, z * 0.7 - 0.7);
  }

  windowTexture() {
    const w = 64, h = 128, data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cell = Math.floor(x / 8) + Math.floor(y / 12) * 8, lit = x % 8 > 2 && x % 8 < 6 && y % 12 > 3 && y % 12 < 9 && seed(cell + 80) > 0.27;
      const n = (y * w + x) * 4; data[n] = lit ? 220 : 14; data[n + 1] = lit ? 185 : 30; data[n + 2] = lit ? 112 : 33; data[n + 3] = 255;
    }
    const texture = this.texture(new THREE.DataTexture(data, w, h)); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true; return texture;
  }
  buildCity() {
    const windows = this.windowTexture();
    const cityMat = this.standard('#93a39b', { map: windows, emissiveMap: windows, emissive: '#eac180', emissiveIntensity: 0.5, roughness: 0.48, metalness: 0.3 });
    const box = this.geometry(new THREE.BoxGeometry(1, 1, 1));
    for (let i = 0; i < 28; i++) {
      const width = 7 + seed(i + 8) * 10, height = 17 + seed(i + 30) * 49, depth = 8 + seed(i + 50) * 9;
      const mesh = new THREE.Mesh(box, cityMat); mesh.position.set(-146 + i * 10.4, height / 2, -157 - (i % 3) * 12); mesh.scale.set(width, height, depth); this.scene.add(mesh);
      if (i % 3 === 0) this.box(width * 0.9, 0.22, depth * 0.9, this.basic('#d8b775', { toneMapped: false }), this.scene, mesh.position.x, height + 0.2, mesh.position.z);
      const reflection = this.mesh(new THREE.PlaneGeometry(width * 0.6, 18 + height * 0.4), this.basic('#a78546', { transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }), this.scene, [mesh.position.x, 0.04, -120]);
      reflection.rotation.x = -Math.PI / 2; this.reflections.push(reflection);
    }
    const steel = this.standard('#193f3a', { metalness: 0.6 });
    const wheel = new THREE.Group(); wheel.position.set(104, 27, -138); this.scene.add(wheel);
    this.mesh(new THREE.TorusGeometry(23, 0.18, 7, 72), this.basic('#7f9f8e'), wheel);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, edge = new THREE.Vector3(Math.cos(a) * 23, Math.sin(a) * 23, 0);
      this.bar(new THREE.Vector3(), edge, 0.055, steel, wheel);
      this.mesh(new THREE.BoxGeometry(1.1, 1.0, 1.2), this.basic('#d0bb8c'), wheel, [edge.x, edge.y, 0]);
    }
    this.bar(new THREE.Vector3(104, 27, -138), new THREE.Vector3(94, 0, -138), 0.5, steel);
    this.bar(new THREE.Vector3(104, 27, -138), new THREE.Vector3(114, 0, -138), 0.5, steel);
    const seats = this.standard('#26433b');
    for (const [x, z, rotation] of [[-79, 4, Math.PI / 2], [61, 53, -0.65]]) {
      const stand = new THREE.Group(); stand.position.set(x, 0, z); stand.rotation.y = rotation; this.scene.add(stand);
      for (let row = 0; row < 5; row++) this.box(19, 0.55, 1.6, seats, stand, 0, row * 0.65 + 0.3, -row * 1.3);
      this.box(21, 0.2, 8.5, this.standard('#b57a49'), stand, 0, 5, -2.3);
      const audience = new THREE.InstancedMesh(this.geometry(new THREE.SphereGeometry(0.2, 5, 4)), this.basic('#a79c75'), 80), dummy = new THREE.Object3D();
      for (let j = 0; j < 80; j++) { dummy.position.set((j % 16) * 1.05 - 8, Math.floor(j / 16) * 0.65 + 0.9, -Math.floor(j / 16) * 1.3); dummy.updateMatrix(); audience.setMatrixAt(j, dummy.matrix); } stand.add(audience);
    }
  }

  buildCar() {
    this.car = new THREE.Group(); this.carShell = new THREE.Group(); this.car.add(this.carShell); this.scene.add(this.car);
    const body = this.material(new THREE.MeshPhysicalMaterial({ color: '#f47c39', metalness: 0.6, roughness: 0.24, clearcoat: 0.9, clearcoatRoughness: 0.13 }));
    const carbon = this.standard('#101a20', { roughness: 0.48, metalness: 0.45 });
    const chrome = this.standard('#9aaba7', { roughness: 0.22, metalness: 0.92 });
    const ivory = this.standard('#e8d8b5', { roughness: 0.35 });
    this.box(1.38, 0.47, 3.5, body, this.carShell, 0, 0.72, -0.08);
    this.box(2.25, 0.12, 3.5, carbon, this.carShell, 0, 0.38, -0.05);
    for (const side of [-1, 1]) {
      const pod = this.box(0.65, 0.46, 1.9, body, this.carShell, side * 0.91, 0.68, -0.25); pod.rotation.z = -side * 0.07;
      this.box(0.42, 0.23, 0.08, carbon, this.carShell, side * 0.91, 0.73, 0.74);
    }
    const nose = this.mesh(new THREE.CylinderGeometry(0.18, 0.49, 2.05, 4), body, this.carShell, [0, 0.72, 1.5]); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4;
    this.box(0.15, 0.02, 1.8, ivory, this.carShell, 0, 0.97, 1.25);
    const number = this.mesh(new THREE.PlaneGeometry(0.45, 0.62), this.standard('#ffffff', { map: this.surfaceTexture('number', '07'), roughness: 0.45, metalness: 0.15 }), this.carShell, [0, 0.994, 1.45]); number.rotation.x = -Math.PI / 2;
    const engineCover = this.mesh(new THREE.CylinderGeometry(0.19, 0.43, 1.22, 8), body, this.carShell, [0, 1.02, -1.15]); engineCover.rotation.x = Math.PI / 2;
    this.box(0.065, 0.5, 1.08, body, this.carShell, 0, 1.35, -1.25);
    for (const side of [-1, 1]) {
      this.box(0.055, 0.055, 1.53, ivory, this.carShell, side * 1.245, 0.83, -0.21);
      this.box(0.28, 0.16, 0.17, body, this.carShell, side * 0.85, 1.16, 0.36);
      this.bar(new THREE.Vector3(side * 0.52, 1.03, 0.3), new THREE.Vector3(side * 0.85, 1.13, 0.36), 0.026, carbon, this.carShell);
      for (let i = 0; i < 3; i++) this.box(0.38, 0.028, 0.06, carbon, this.carShell, side * 0.91, 0.93, -0.22 - i * 0.23);
    }
    this.box(3.15, 0.13, 0.53, body, this.carShell, 0, 0.37, 2.37);
    this.box(3.02, 0.1, 0.24, carbon, this.carShell, 0, 0.49, 2.5);
    for (const side of [-1, 1]) this.box(0.12, 0.55, 0.7, body, this.carShell, side * 1.53, 0.56, 2.36);
    this.box(2.95, 0.16, 0.64, body, this.carShell, 0, 1.42, -2.03);
    this.box(2.95, 0.1, 0.26, carbon, this.carShell, 0, 1.59, -2.17);
    const team = this.mesh(new THREE.PlaneGeometry(2.42, 0.21), this.standard('#ffffff', { map: this.surfaceTexture('team', 'FIND / SG'), roughness: 0.5, metalness: 0.15 }), this.carShell, [0, 1.43, -2.365]); team.rotation.y = Math.PI;
    for (const side of [-1, 1]) { this.box(0.1, 0.8, 0.18, carbon, this.carShell, side * 0.63, 1, -1.95); this.box(0.1, 0.55, 0.84, body, this.carShell, side * 1.44, 1.42, -2.02); }
    const cockpit = this.mesh(new THREE.SphereGeometry(0.63, 24, 14), carbon, this.carShell, [0, 1.00, -0.3]); cockpit.scale.set(0.8, 0.4, 1.15);
    const helmet = this.mesh(new THREE.SphereGeometry(0.24, 16, 12), this.standard('#e3ac52', { metalness: 0.65 }), this.carShell, [0, 1.23, -0.25]);
    this.box(0.35, 0.09, 0.04, carbon, this.carShell, 0, 1.26, 0.0);
    const halo = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.5, 1.1, -0.85), new THREE.Vector3(-0.48, 1.4, -0.1), new THREE.Vector3(0, 1.42, 0.45), new THREE.Vector3(0.48, 1.4, -0.1), new THREE.Vector3(0.5, 1.1, -0.85)]);
    this.mesh(new THREE.TubeGeometry(halo, 22, 0.045, 6, false), carbon, this.carShell);
    this.bar(new THREE.Vector3(0, 1.42, 0.45), new THREE.Vector3(0, 0.93, 0.72), 0.045, carbon, this.carShell);
    const rubber = this.standard('#0c1012', { roughness: 0.87, metalness: 0.04 });
    for (const side of [-1, 1]) for (const z of [-1.45, 1.48]) {
      const pivot = new THREE.Group(); pivot.position.set(side * 1.29, 0.62, z); this.carShell.add(pivot);
      const spin = new THREE.Group(); pivot.add(spin); this.wheels.push({ spin, pivot, front: z > 0 });
      const tire = this.mesh(new THREE.CylinderGeometry(0.59, 0.59, 0.49, 24), rubber, spin); tire.rotation.z = Math.PI / 2;
      const rim = this.mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.515, 16), chrome, spin); rim.rotation.z = Math.PI / 2;
      for (const offset of [-0.26, 0.26]) { const ring = this.mesh(new THREE.TorusGeometry(0.46, 0.018, 6, 30), ivory, spin, [offset, 0, 0]); ring.rotation.y = Math.PI / 2; }
      this.bar(new THREE.Vector3(side * 0.55, 0.75, z - 0.32), new THREE.Vector3(side * 1.28, 0.6, z), 0.045, carbon, this.carShell);
      this.bar(new THREE.Vector3(side * 0.55, 0.48, z + 0.35), new THREE.Vector3(side * 1.28, 0.6, z), 0.045, carbon, this.carShell);
    }
    this.brakeMaterial = this.basic('#ff653b', { toneMapped: false }); this.box(0.22, 0.17, 0.05, this.brakeMaterial, this.carShell, 0, 0.73, -1.92);
  }

  buildPodium() {
    const finish = this.sample(0.98); this.finishPoint = finish.p.clone();
    this.podium = new THREE.Group(); this.podium.position.copy(finish.p).addScaledVector(finish.normal, -10); this.podium.position.y = 0;
    this.podium.rotation.y = Math.atan2(finish.tangent.x, finish.tangent.z); this.podium.visible = false; this.scene.add(this.podium);
    const dark = this.standard('#152c2c', { roughness: 0.3, metalness: 0.45 });
    const gold = this.material(new THREE.MeshPhysicalMaterial({ color: '#e5b44d', metalness: 0.95, roughness: 0.2, clearcoat: 0.5 }));
    this.box(11.8, 0.35, 5, dark, this.podium, 0, 0.18, 0);
    for (const [x, h, rank] of [[-3.4, 1.15, '2'], [0, 2.1, '1'], [3.4, 0.8, '3']]) {
      this.box(3.2, h, 3.2, dark, this.podium, x, h / 2 + 0.35, 0);
      this.box(3.2, 0.08, 3.2, gold, this.podium, x, h + 0.39, 0);
      this.mesh(new THREE.PlaneGeometry(0.72, Math.min(0.76, h * 0.72)), this.standard('#ffffff', { map: this.surfaceTexture('rank', rank), roughness: 0.45, metalness: 0.25 }), this.podium, [x, h / 2 + 0.35, 1.61]);
    }
    this.trophy = new THREE.Group(); this.trophy.position.set(0, 2.5, 0); this.podium.add(this.trophy);
    this.mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.3, 28), gold, this.trophy, [0, 0.15, 0]);
    this.mesh(new THREE.CylinderGeometry(0.17, 0.25, 1.0, 20), gold, this.trophy, [0, 0.8, 0]);
    const profile = [[0.12, 0], [0.38, 0.12], [0.7, 0.42], [1.02, 0.95], [1.1, 1.35], [1.04, 1.42], [0.94, 1.28], [0.87, 0.98], [0.56, 0.48], [0.27, 0.18]].map(([x, y]) => new THREE.Vector2(x, y));
    this.mesh(new THREE.LatheGeometry(profile, 40), gold, this.trophy, [0, 1.2, 0]);
    for (const side of [-1, 1]) { const handle = this.mesh(new THREE.TorusGeometry(0.55, 0.085, 12, 30, Math.PI * 1.5), gold, this.trophy, [side * 1.05, 2.05, 0]); handle.rotation.z = side < 0 ? Math.PI * 0.75 : -Math.PI * 0.25; }
    const lamp = new THREE.PointLight('#ffcd79', 95, 30, 2); lamp.position.set(0, 9, 5); this.podium.add(lamp);
    this.celebrationFocus = this.podium.position.clone().add(new THREE.Vector3(0, 3.5, 0));
  }

  buildFireworks() {
    const focus = this.finishPoint;
    this.bursts = [
      [-17, 24, -16, 0.8], [13, 30, -24, 1.5], [-3, 36, 10, 2.3], [24, 25, 7, 3.1], [-26, 35, 4, 4.0], [7, 42, -18, 4.8], [-10, 30, 20, 5.55]
    ].map(([x, y, z, start], i) => ({ origin: new THREE.Vector3(focus.x + x, y, focus.z + z), start, color: new THREE.Color(i % 3 === 1 ? '#e7ead3' : i % 3 === 2 ? '#b1cbb1' : '#ffc46b') }));
    this.particles = []; const positions = [], colors = [], opacity = [], sizes = [];
    for (let b = 0; b < this.bursts.length; b++) for (let i = 0; i < 110; i++) {
      const y = 1 - 2 * (i + 0.5) / 110, r = Math.sqrt(1 - y * y), angle = i * 2.399963 + b;
      const vertical = b % 3 === 1 ? y * 0.26 : b % 3 === 2 ? 0.3 + Math.abs(y) * 0.6 : y * 0.86;
      const velocity = new THREE.Vector3(Math.cos(angle) * r, vertical, Math.sin(angle) * r).multiplyScalar(7.5 + seed(i + b * 201) * 9.0);
      this.particles.push({ burst: b, velocity, life: 2.1 + seed(i + 91) * 1.3, seed: seed(i + b * 20) });
      for (let tail = 0; tail < 2; tail++) { positions.push(0, -999, 0); this.bursts[b].color.toArray(colors, colors.length); opacity.push(0); sizes.push(tail ? 0.82 : 1.5); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opacity, 1)); geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    this.particleGeometry = this.geometry(geo);
    this.particleMaterial = this.material(new THREE.ShaderMaterial({
      uniforms: { pixelRatio: { value: this.renderer.getPixelRatio() } }, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: 'attribute float aOpacity; attribute float aSize; uniform float pixelRatio; varying vec3 vColor; varying float vOpacity; void main(){vColor=color;vOpacity=aOpacity;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(aSize*pixelRatio*240.0/max(1.0,-mv.z),1.0,19.0);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec3 vColor; varying float vOpacity; void main(){float r=length(gl_PointCoord-vec2(.5))*2.0;if(r>1.0||vOpacity<.001)discard;float glow=pow(1.0-r,1.7);float core=exp(-r*14.0);gl_FragColor=vec4(vColor*(1.0+core*1.2),vOpacity*(glow+core*.55));}'
    }));
    this.fireworks = new THREE.Points(geo, this.particleMaterial); this.fireworks.frustumCulled = false; this.fireworks.visible = false; this.scene.add(this.fireworks);
  }
  updateFireworks(elapsed, staticFrame = false) {
    const positions = this.particleGeometry.attributes.position.array, alpha = this.particleGeometry.attributes.aOpacity.array;
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i], burst = this.bursts[particle.burst];
      for (let tail = 0; tail < 2; tail++) {
        const n = i * 2 + tail, age = staticFrame ? 0.75 + tail * 0.05 : elapsed - burst.start - tail * 0.07;
        if (age < 0 || age > particle.life || (staticFrame && particle.burst > 3)) { alpha[n] = 0; continue; }
        const travel = (1 - Math.exp(-age * 0.65)) / 0.65;
        positions[n * 3] = burst.origin.x + particle.velocity.x * travel;
        positions[n * 3 + 1] = burst.origin.y + particle.velocity.y * travel - 2.1 * age * age;
        positions[n * 3 + 2] = burst.origin.z + particle.velocity.z * travel;
        alpha[n] = Math.pow(1 - age / particle.life, 1.35) * (tail ? 0.34 : 0.92);
      }
    }
    this.particleGeometry.attributes.position.needsUpdate = true; this.particleGeometry.attributes.aOpacity.needsUpdate = true;
  }

  setGameState({ stage = 0, speed = 0, phase = 'driving', celebrationKey = 0, reducedMotion = false, view = 'chase' }) {
    if (this.disposed) return;
    const priorPhase = this.phase, priorReduced = this.reducedMotion, now = this.window.performance.now();
    if (phase === 'driving' && (priorPhase !== 'driving' || stage < this.stage)) { this.progress = STARTS[stage]; this.forcedTarget = this.progress; }
    if (stage > this.stage && phase === 'driving') this.forcedTarget = STARTS[stage];
    this.kick = speed > this.speed ? -0.065 : speed < this.speed ? 0.055 : this.kick;
    this.stage = stage; this.speed = speed; this.phase = phase; this.reducedMotion = reducedMotion; this.view = view;
    if (phase === 'celebrating' && celebrationKey !== this.celebrationKey) {
      this.celebrationKey = celebrationKey; this.celebrationStarted = now; this.celebrationPausedAt = reducedMotion ? now : null; this.finishFrom = this.progress;
      if (priorPhase === 'complete') this.finishFrom = this.progress = 0.90;
    } else if (phase === 'celebrating' && reducedMotion !== priorReduced) {
      if (reducedMotion) this.celebrationPausedAt = now;
      else if (this.celebrationPausedAt !== null) { this.celebrationStarted += now - this.celebrationPausedAt; this.celebrationPausedAt = null; }
    }
    if (phase !== 'celebrating') this.celebrationPausedAt = null;
    if (phase === 'complete') this.progress = 0.992;
    if (reducedMotion && phase === 'driving') this.progress = STARTS[stage] + speed / 120 * 0.045;
    for (let i = 0; i < this.gates.length; i++) this.gates[i].color.set(i < stage || phase !== 'driving' ? '#86b698' : i === stage ? '#ffd39a' : '#8f7753');
    this.settleFrames = 26; this.update(0, reducedMotion || phase === 'complete'); this.requestFrame();
  }
  update(dt, snapCamera = false) {
    const now = this.window.performance.now(), cameraDt = Math.min(1, Math.max(0, (now - this.cameraStamp) / 1000)); this.cameraStamp = now;
    const previous = this.progress, elapsed = this.phase === 'celebrating' ? clamp(((this.celebrationPausedAt ?? now) - this.celebrationStarted) / 1000, 0, 7.5) : 7.5;
    if (this.phase === 'driving' && !this.reducedMotion) {
      if (this.progress < this.forcedTarget) this.progress = Math.min(this.forcedTarget, this.progress + Math.max(0.12, (this.forcedTarget - this.progress) * 3.0) * dt);
      else this.progress = Math.min(ENDS[this.stage] - 0.015, this.progress + this.speed * 0.18 / this.length * dt);
    } else if (this.phase === 'celebrating') this.progress = this.reducedMotion ? 0.992 : THREE.MathUtils.lerp(this.finishFrom, 0.992, ease(elapsed / 1.6));
    this.curve.getPointAt(clamp(this.progress, 0, 1), this.tmpPosition); this.curve.getTangentAt(clamp(this.progress, 0, 1), this.tmpTangent);
    this.tmpNormal.set(this.tmpTangent.z, 0, -this.tmpTangent.x);
    this.car.position.copy(this.tmpPosition); this.car.rotation.y = Math.atan2(this.tmpTangent.x, this.tmpTangent.z);
    this.wheelTravel += (this.progress - previous) * this.length / 0.59;
    const ahead = this.curve.getTangentAt(clamp(this.progress + 0.008, 0, 1));
    const steer = clamp(this.tmpTangent.x * ahead.z - this.tmpTangent.z * ahead.x, -0.25, 0.25);
    this.kick *= Math.exp(-dt * 6); this.carShell.rotation.x = this.reducedMotion ? 0 : this.kick;
    this.carShell.rotation.z = this.reducedMotion ? 0 : steer * this.speed / 80;
    this.wheels.forEach(({ spin, pivot, front }) => { spin.rotation.x = this.wheelTravel; if (front) pivot.rotation.y = -steer * 1.6; });
    this.carFill.position.copy(this.car.position).add(new THREE.Vector3(-2, 5, 3));
    this.brakeMaterial.color.set(this.kick > 0.01 ? '#ffae78' : '#a83424');
    this.podium.visible = this.phase !== 'driving'; this.fireworks.visible = this.phase !== 'driving';
    if (this.podium.visible) {
      const rise = this.phase === 'complete' || this.reducedMotion ? 1 : ease((elapsed - 1.7) / 1.1);
      this.podium.scale.setScalar(Math.max(0.001, rise));
      this.trophy.rotation.y = this.reducedMotion || this.phase === 'complete' ? 0.5 : Math.min(elapsed, 7.5) * 0.18;
      this.updateFireworks(elapsed, this.reducedMotion || this.phase === 'complete');
      const angle = this.phase === 'complete' || this.reducedMotion ? 0.7 : -0.15 + Math.min(elapsed, 7.5) * 0.113;
      // Keep the tall bursts and the physical trophy in the same camera frustum.
      this.cameraGoal.set(this.celebrationFocus.x + Math.sin(angle) * 60, 24, this.celebrationFocus.z + Math.cos(angle) * 60);
      this.lookGoal.copy(this.celebrationFocus).add(new THREE.Vector3(0, 17, 0));
      if (this.view === 'podium') {
        const reveal = this.phase === 'complete' || this.reducedMotion ? 1 : ease((elapsed - 3.4) / 3.3);
        this.cameraGoal.lerp(new THREE.Vector3(this.celebrationFocus.x + Math.sin(0.7) * 34, 12, this.celebrationFocus.z + Math.cos(0.7) * 34), reveal);
        this.lookGoal.lerp(this.celebrationFocus.clone().add(new THREE.Vector3(0, 8.5, 0)), reveal);
      } else if (this.view === 'chase') {
        this.cameraGoal.copy(this.car.position).addScaledVector(this.tmpTangent, -10.4).addScaledVector(this.tmpNormal, 4.4); this.cameraGoal.y += 4.8;
        this.lookGoal.copy(this.car.position).addScaledVector(this.tmpTangent, 3.2); this.lookGoal.y += 1.0;
      }
    } else {
      const wide = this.view === 'wide';
      this.cameraGoal.copy(this.car.position).addScaledVector(this.tmpTangent, wide ? -23 : -11.3).addScaledVector(this.tmpNormal, wide ? 17 : 3.5);
      this.cameraGoal.y += wide ? 17 : 6.5;
      this.lookGoal.copy(this.car.position).addScaledVector(this.tmpTangent, wide ? 5 : 6.2); this.lookGoal.y += 0.85;
    }
    const smoothing = snapCamera ? 1 : 1 - Math.exp(-(this.phase === 'driving' ? dt : cameraDt) * (this.phase === 'driving' ? 5 : 2.1));
    this.camera.position.lerp(this.cameraGoal, smoothing); this.lookPosition.lerp(this.lookGoal, smoothing); this.camera.lookAt(this.lookPosition);
    this.waterMaterial.uniforms.time.value = this.reducedMotion ? 0 : this.time;
    this.reflections.forEach((reflection, i) => { reflection.material.opacity = 0.10 + (Math.sin((this.reducedMotion ? 0 : this.time) * 0.65 + i) * 0.5 + 0.5) * 0.08; });
  }

  resize() {
    if (this.disposed || !this.renderer) return;
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height; this.camera.fov = width / height < 1.15 ? 63 : 55; this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false); this.settleFrames = 2; this.requestFrame();
  }
  requestFrame() {
    if (this.disposed || this.raf !== null || !this.visible || this.document.hidden) return;
    this.raf = this.window.requestAnimationFrame(this.frame);
  }
  stopFrame() { if (this.raf !== null) this.window.cancelAnimationFrame(this.raf); this.raf = null; }
  frame(stamp) {
    this.raf = null; if (this.disposed) return;
    const dt = this.previousStamp ? Math.min((stamp - this.previousStamp) / 1000, 0.05) : 1 / 60; this.previousStamp = stamp; this.time += dt;
    try { this.update(dt, this.reducedMotion); this.renderer.render(this.scene, this.camera); }
    catch (error) { this.fail(error); return; }
    this.settleFrames = Math.max(0, this.settleFrames - 1);
    const moving = this.phase === 'driving' && (this.progress < this.forcedTarget || (this.speed > 0 && this.progress < ENDS[this.stage] - 0.015));
    const celebrating = this.phase === 'celebrating' && this.window.performance.now() - this.celebrationStarted < 8000;
    if (!this.reducedMotion && (moving || celebrating || this.settleFrames > 0)) this.requestFrame();
  }
  fail(error) { if (this.disposed) return; const callback = this.onFailure; this.dispose(); callback(error); }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.stopFrame();
    this.resizeObserver?.disconnect(); this.intersectionObserver?.disconnect(); this.cleanup.forEach((fn) => fn()); this.cleanup = [];
    this.geometries.forEach((g) => g.dispose()); this.materials.forEach((m) => m.dispose()); this.textures.forEach((t) => t.dispose());
    this.environmentTarget?.dispose();
    if (this.renderer) { this.renderer.renderLists.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
    this.scene?.clear();
  }
}

export default RaceWorld;
