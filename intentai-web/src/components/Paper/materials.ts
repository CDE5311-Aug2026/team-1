// The hand-made materials as CSS custom properties (paper grain, foxing, fibres, leather, scuffs, marble), for a page
// that dresses its own surfaces in them (Moments' desk).
import type { CSSProperties } from 'react';
import { fibres, grain, leather, marble, scuffs, stains } from './textures';

export const MATERIALS = {
  '--grain': grain,
  '--stains': stains,
  '--fibres': fibres,
  '--leather': leather,
  '--scuffs': scuffs,
  '--marble': marble,
} as CSSProperties;
