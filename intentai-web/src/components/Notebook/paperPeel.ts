// A page turned like paper on a phone (owner, 2 Nov 2026: "swipe right to left to turn, with a paper effect"). The
// page peels from its right edge along a crease that leans as it travels (the bottom corner leads), its back folds
// over the page as a shaded flap, and the page underneath comes out of the flap's shadow. Everything stays inside the
// page's own box. Used by Home's field notes (FlipBook), the Hunt books (Notebook) and the case book's card pages.

export interface PeelParts {
  /** The page being turned (clipped to what is still flat). */
  leaf: HTMLElement;
  /** A layer over the turning page for the light near the crease. */
  leafShade?: HTMLElement | null;
  /** A layer over the page underneath for the flap's shadow. */
  underShade?: HTMLElement | null;
  /** The flap: a box the size of the page (transform origin 0 0), mirrored over the crease. */
  flap: HTMLElement | null;
  /** The flap's paper (clipped to the part of the page folded over). */
  flapPaper: HTMLElement | null;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** The crease for a turn `p` (0 flat .. 1 gone) on a page `w` × `h`: where it meets the top and the bottom edge. */
export function crease(p: number, w: number, h: number) {
  const q = clamp(p);
  const slant = 0.16 * Math.sin(Math.PI * q);
  const top = w * (1 - q);
  return { q, top, bottom: top - h * slant };
}

/** Everything needed to draw a turn `p` on a page `w` × `h` (exported for tests). */
export function peelStyles(p: number, w: number, h: number) {
  const { q, top, bottom } = crease(p, w, h);
  // the crease runs from (top, 0) to (bottom, h); u along it, n across it toward the page still to come
  const len = Math.hypot(bottom - top, h) || 1;
  const a = (bottom - top) / len;
  const b = h / len;
  const nx = b;
  const ny = -a;
  // mirror image across the crease: x' = A + R (x − A), A = (top, 0)
  const r11 = 2 * a * a - 1;
  const r12 = 2 * a * b;
  const r22 = 2 * b * b - 1;
  const flapTransform = `matrix(${r11}, ${r12}, ${r12}, ${r22}, ${top - r11 * top}, ${-r12 * top})`;
  // a CSS gradient across the crease: its angle, and how far along it the crease lies
  const angle = (Math.atan2(nx, -ny) * 180) / Math.PI;
  const length = Math.abs(w * nx) + Math.abs(h * ny);
  const s = (top - w / 2) * nx + (0 - h / 2) * ny + length / 2;
  const span = Math.max(1, length - s);
  const k = Math.min(1, q * 8) * (1 - q * 0.35);
  const px = (v: number) => `${v.toFixed(1)}px`;
  return {
    q,
    leafClip: `polygon(0 0, ${px(top)} 0, ${px(bottom)} 100%, 0 100%)`,
    flapClip: `polygon(${px(top)} 0, 100% 0, 100% 100%, ${px(bottom)} 100%)`,
    flapTransform,
    // the folded paper: dark in the crease, light where it bows, a touch darker at the edge
    flapLight: `linear-gradient(${angle}deg, rgba(70, 44, 16, 0.42) ${px(s)}, rgba(70, 44, 16, 0.12) ${px(s + 10)}, rgba(255, 250, 236, 0.5) ${px(s + span * 0.38)}, rgba(70, 44, 16, 0.16) ${px(s + span)})`,
    flapShadow: `drop-shadow(${px(-nx * 5)} ${px(-ny * 5)} 7px rgba(40, 24, 8, ${(0.4 * k).toFixed(3)}))`,
    // the page still flat darkens into the crease
    leafLight: `linear-gradient(${angle}deg, transparent ${px(s - 46)}, rgba(50, 30, 10, ${(0.2 * k).toFixed(3)}) ${px(s)})`,
    // the page underneath, in the flap's shadow
    underLight: `linear-gradient(${angle}deg, rgba(30, 18, 6, ${(0.5 * k).toFixed(3)}) ${px(s)}, rgba(30, 18, 6, ${(0.16 * k).toFixed(3)}) ${px(s + 22)}, transparent ${px(s + 70)})`,
  };
}

/** Draw the turn on the page's parts. */
export function drawPeel(parts: PeelParts, p: number, w: number, h: number) {
  const st = peelStyles(p, w, h);
  const { leaf, leafShade, underShade, flap, flapPaper } = parts;
  leaf.style.transform = 'none';
  leaf.style.visibility = 'visible';
  leaf.style.clipPath = st.leafClip;
  leaf.style.setProperty('-webkit-clip-path', st.leafClip);
  if (leafShade) leafShade.style.background = st.leafLight;
  if (underShade) underShade.style.background = st.underLight;
  if (flap && flapPaper) {
    flap.style.visibility = st.q > 0.001 && st.q < 0.999 ? 'visible' : 'hidden';
    flap.style.width = `${w}px`;
    flap.style.height = `${h}px`;
    flap.style.transform = st.flapTransform;
    flap.style.filter = st.flapShadow;
    flapPaper.style.clipPath = st.flapClip;
    flapPaper.style.setProperty('-webkit-clip-path', st.flapClip);
    flapPaper.style.setProperty('--light', st.flapLight);
  }
}

/** Put a page back as its classes have it. */
export function clearPeel(...els: (HTMLElement | null | undefined)[]) {
  for (const el of els) {
    if (!el) continue;
    for (const prop of ['transform', 'clip-path', '-webkit-clip-path', 'background', 'visibility', 'filter', 'width', 'height', '--light'])
      el.style.removeProperty(prop);
  }
}
