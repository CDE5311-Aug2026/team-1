// The finish shared by Hunt's 3D pieces: a warm, painted look rather than raw renders. One stage = renderer + composer
// (scene -> soft bloom on brass and lamp glass -> tone map -> a paint pass: a small Kuwahara filter that turns texture
// into brush strokes, a warm grade, vignette and grain). Plus the small kit the pieces are built from: normal maps
// from painted height maps, velvet, brass, gold, silk.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const PaintShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uRadius: { value: 2 },
    uPaint: { value: 0.75 },
    uTime: { value: 0 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uRadius, uPaint, uTime, uVignette, uGrain;
    varying vec2 vUv;
    // four-sector Kuwahara: each pixel takes the mean of its calmest quarter, so flat areas turn to strokes and edges stay
    vec3 sector(vec2 dir, out float v) {
      vec3 m = vec3(0.0), s = vec3(0.0);
      float n = 0.0;
      for (int i = 0; i <= 2; i++) for (int j = 0; j <= 2; j++) {
        vec2 o = vec2(float(i), float(j)) * dir * uRadius / 2.0;
        vec3 c = texture2D(tDiffuse, vUv + o / uRes).rgb;
        m += c; s += c * c; n += 1.0;
      }
      m /= n; s = abs(s / n - m * m);
      v = s.r + s.g + s.b;
      return m;
    }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      float v0, v1, v2, v3;
      vec3 a = sector(vec2(-1.0, -1.0), v0), b = sector(vec2(1.0, -1.0), v1), c = sector(vec2(-1.0, 1.0), v2), d = sector(vec2(1.0, 1.0), v3);
      vec3 k = a; float mv = v0;
      if (v1 < mv) { k = b; mv = v1; }
      if (v2 < mv) { k = c; mv = v2; }
      if (v3 < mv) { k = d; mv = v3; }
      vec3 col = mix(src.rgb, k, uPaint);
      // warm grade: umber shadows, cream highlights, a little more colour
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(l), -0.12);
      col *= mix(vec3(1.06, 0.96, 0.84), vec3(1.0, 0.98, 0.94), smoothstep(0.0, 0.7, l));
      col = col * col * (3.0 - 2.0 * col) * 0.35 + col * 0.65;
      // vignette and grain
      vec2 q = vUv - 0.5;
      col *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(q, q) * 2.2);
      col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col, src.a);
    }`,
};

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  render(): void;
  setSize(w: number, h: number): void;
  tex(c: HTMLCanvasElement, srgb?: boolean, rep?: [number, number]): THREE.CanvasTexture;
  dispose(): void;
}

/** Renderer, scene, camera and the painted post chain. Throws when WebGL is not there. */
export function createStage(el: HTMLElement, className: string, opts: { fov?: number; paint?: number; bloom?: number } = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = className;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 24, 1, 0.1, 60);

  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), opts.bloom ?? 0.32, 0.55, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const paint = new ShaderPass(PaintShader);
  paint.uniforms.uPaint.value = opts.paint ?? 0.75;
  paint.uniforms.uRadius.value = 1.5 * dpr;
  composer.addPass(paint);

  const aniso = renderer.capabilities.getMaxAnisotropy();
  const made: THREE.Texture[] = [];
  return {
    renderer,
    scene,
    camera,
    render() {
      paint.uniforms.uTime.value = performance.now() / 1000;
      composer.render();
    },
    setSize(w, h) {
      renderer.setSize(w, h, false);
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      paint.uniforms.uRes.value.set(w * dpr, h * dpr);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    },
    tex(c, srgb = true, rep) {
      const t = new THREE.CanvasTexture(c);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      if (rep) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(...rep);
      }
      made.push(t);
      return t;
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
          mat.dispose();
        }
      });
      for (const t of made) t.dispose();
      bloom.dispose();
      paint.material.dispose();
      composer.dispose();
      rt.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function canvas(w: number, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** A normal map from a painted height map (white = raised). Softened first, so struck edges read as bevels. */
export function normalFromHeight(src: HTMLCanvasElement, strength = 3, blur = 2) {
  const w = src.width,
    h = src.height;
  const data = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  let hgt: Float32Array<ArrayBuffer> = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) hgt[i] = data[i * 4] / 255;
  // separable box blur, a couple of passes
  for (let pass = 0; pass < 2 && blur > 0; pass++) {
    const tmp = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0,
          n = 0;
        for (let k = -blur; k <= blur; k++) {
          const xx = Math.min(w - 1, Math.max(0, x + k));
          s += hgt[y * w + xx];
          n++;
        }
        tmp[y * w + x] = s / n;
      }
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0,
          n = 0;
        for (let k = -blur; k <= blur; k++) {
          const yy = Math.min(h - 1, Math.max(0, y + k));
          s += tmp[yy * w + x];
          n++;
        }
        out[y * w + x] = s / n;
      }
    hgt = out;
  }
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const at = (x: number, y: number) => hgt[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = -(at(x + 1, y) - at(x - 1, y)) * strength;
      const ny = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(nx, ny, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

export const brass = (rough = 0.32) => new THREE.MeshStandardMaterial({ color: '#c39445', metalness: 1, roughness: rough });
export const velvet = (color: THREE.ColorRepresentation, sheen: THREE.ColorRepresentation) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 1, sheen: 1, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.45 });

/** A soft dark pool, laid under an object so it sits on the surface instead of floating. */
export function contactShadow(stage: Stage, w: number, h: number, alpha = 0.55) {
  const c = canvas(128);
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: stage.tex(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** A beam of lamplight: a cone that glows at the top and fades to nothing, with dust turning slowly in it. */
export function lampBeam(_stage: Stage, top: THREE.Vector3, bottomY: number, spread: number, color = '#ffd9a0') {
  const g = new THREE.Group();
  const h = top.y - bottomY;
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(spread * 0.18, spread, h, 48, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float edge=pow(abs(dot(vN,vV)),1.6); float fall=pow(vUv.y,1.8); gl_FragColor=vec4(uColor*edge*fall*0.11,1.0); }`,
    }),
  );
  cone.position.set(top.x, top.y - h / 2, top.z);
  g.add(cone);
  const N = 90;
  const r = rand(7);
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const y = r();
    const rad = spread * (0.18 + 0.82 * (1 - y)) * Math.sqrt(r()) * 0.9;
    const a = r() * Math.PI * 2;
    pos.set([top.x + Math.cos(a) * rad, bottomY + (1 - y) * h * 0.0 + y * h, top.z + Math.sin(a) * rad], i * 3);
    seed[i] = r() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: Math.min(2, window.devicePixelRatio || 1) }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `attribute float seed; uniform float uTime, uPx; varying float vA;
      void main(){ vec3 p=position; float t=uTime*0.12+seed;
        p.x+=sin(t*1.3)*0.05; p.y+=sin(t*0.7+seed)*0.06; p.z+=cos(t*1.1)*0.04;
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        float s=fract(seed*7.13); gl_PointSize=(1.2+s*2.6)*uPx*(6.0/-mv.z);
        vA=(0.25+0.75*fract(seed*3.7))*(0.6+0.4*sin(t*3.0+seed)); }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d)*vA; gl_FragColor=vec4(uColor*a*0.9,1.0); }`,
  });
  g.add(new THREE.Points(geo, dustMat));
  return { group: g, tick: (t: number) => void (dustMat.uniforms.uTime.value = t) };
}

/** A tiny tween runner: each step is eased 0..1; the stage renders while any are running. */
export function tweens(onFrame: () => void) {
  type T = { t0: number; dur: number; fn(k: number): void; ease(k: number): number; done?(): void };
  const list: T[] = [];
  let raf = 0;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
  let keep: () => boolean = () => false;
  const loop = () => {
    raf = 0;
    const now = performance.now();
    for (const t of [...list]) {
      const k = Math.min(1, (now - t.t0) / t.dur);
      t.fn(t.ease(k));
      if (k >= 1) {
        list.splice(list.indexOf(t), 1);
        t.done?.();
      }
    }
    onFrame();
    if (list.length || keep()) raf = requestAnimationFrame(loop);
  };
  const kick = () => void (raf ||= requestAnimationFrame(loop));
  return {
    add(dur: number, fn: (k: number) => void, ease: (k: number) => number = easeInOut, done?: () => void) {
      list.push({ t0: performance.now(), dur: reduce() ? 1 : dur, fn, ease, done });
      kick();
    },
    /** Keep the loop running while this says so (dust in the beam while the case is on screen). */
    keepWhile(f: () => boolean) {
      keep = f;
      kick();
    },
    kick,
    get busy() {
      return list.length > 0;
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      list.length = 0;
    },
  };
}
export const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
/** Heavy: slow to start, a small overshoot, settles (a door on old hinges, a medal set down). */
export const heavy = (k: number) => {
  const c1 = 1.1,
    c3 = c1 + 1;
  const s = k < 0.18 ? (k / 0.18) * (k / 0.18) * 0.05 : 0.05 + 0.95 * ((k - 0.18) / 0.82);
  return 1 + c3 * Math.pow(s - 1, 3) + c1 * Math.pow(s - 1, 2);
};
