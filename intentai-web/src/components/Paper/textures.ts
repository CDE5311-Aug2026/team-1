// Hand-made materials for the field notebook, drawn by SVG filters (no image files): paper grain and foxing, pebbled
// leather, desk wood, marbled endpapers. Each is a small tile the browser rasterises once.
const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`)}")`;

/** Fine paper grain: brown flecks on transparent (lay over a paper colour). */
export const grain = svg(
  220,
  220,
  `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .33  0 0 0 0 .22  0 0 0 0 .1  0 0 0 .9 -.32'/></filter><rect width='100%' height='100%' filter='url(#g)'/>`,
);

/** Foxing and water stains: big soft blotches. */
export const stains = svg(
  520,
  520,
  `<filter id='s'><feTurbulence type='fractalNoise' baseFrequency='.008' numOctaves='4' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .12  0 0 0 -2.4 1.25'/></filter><rect width='100%' height='100%' filter='url(#s)'/>`,
);

/** Paper fibres: thin long strands. */
export const fibres = svg(
  300,
  300,
  `<filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.012 .5' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .4  0 0 0 0 .3  0 0 0 0 .16  0 0 0 2.2 -1.25'/></filter><rect width='100%' height='100%' filter='url(#f)'/>`,
);

/** Pebbled leather: lit relief as dark shading (lay over a leather colour). */
export const leather = svg(
  180,
  180,
  `<filter id='l'><feTurbulence type='fractalNoise' baseFrequency='.95' numOctaves='3' seed='11' stitchTiles='stitch' result='t'/><feDiffuseLighting in='t' surfaceScale='1.4' lighting-color='#fff' result='d'><feDistantLight azimuth='235' elevation='48'/></feDiffuseLighting><feColorMatrix in='d' values='0 0 0 0 .08  0 0 0 0 .04  0 0 0 0 .02  -1.1 0 0 0 .98'/></filter><rect width='100%' height='100%' filter='url(#l)'/>`,
);

/** Creases and scuffs on old leather. */
export const scuffs = svg(
  400,
  400,
  `<filter id='c'><feTurbulence type='turbulence' baseFrequency='.035 .09' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 .9  0 0 0 0 .75  0 0 0 -3 .55'/></filter><rect width='100%' height='100%' filter='url(#c)' opacity='.28'/>`,
);

/** Desk wood: long grain streaks. */
export const wood = svg(
  600,
  300,
  `<filter id='w'><feTurbulence type='fractalNoise' baseFrequency='.003 .11' numOctaves='4' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .1  0 0 0 0 .05  0 0 0 0 .02  0 0 0 2.6 -1.05'/></filter><rect width='100%' height='100%' filter='url(#w)'/>`,
);

/** Marbled endpaper (the inside of the cover). */
export const marble = svg(
  360,
  360,
  `<filter id='m'><feTurbulence type='turbulence' baseFrequency='.012 .03' numOctaves='3' seed='21' stitchTiles='stitch' result='t'/><feDisplacementMap in='SourceGraphic' in2='t' scale='60'/></filter><g filter='url(#m)'><rect width='360' height='360' fill='#2d3b46'/>${Array.from({ length: 14 }, (_, i) => `<rect y='${i * 26}' width='360' height='${8 + (i % 3) * 4}' fill='${['#b8862f', '#8c2f22', '#e6d6b0', '#1f2a33', '#6d7e7a'][i % 5]}'/>`).join('')}</g>`,
);

/** Burnt, torn paper edge as a mask (white = keep). */
export const tornMask = svg(
  400,
  400,
  `<filter id='e'><feTurbulence type='fractalNoise' baseFrequency='.045' numOctaves='3' seed='5' result='n'/><feDisplacementMap in='SourceGraphic' in2='n' scale='16'/></filter><rect x='10' y='10' width='380' height='380' fill='#fff' filter='url(#e)'/>`,
);

/** Ink bleed for rubber stamps (mask with gaps). */
export const inkMask = svg(
  160,
  160,
  `<filter id='i'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='2'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -4 2.6'/></filter><rect width='100%' height='100%' filter='url(#i)'/>`,
);

/** Film grain for the projector (animated by moving it). */
export const filmGrain = svg(
  200,
  200,
  `<filter id='fg'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='1' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .85  0 0 0 1.4 -.55'/></filter><rect width='100%' height='100%' filter='url(#fg)'/>`,
);
