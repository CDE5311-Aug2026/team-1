// Hunt's backdrop: the same chart of the town as the framed map, drawn large and dark like an old sea chart (light ink
// on deep brown), with rhumb lines from two compass roses. One image, used as a CSS background so it sits behind
// everything without changing how the page stacks.
import { COAST, KALLANG, line, RIVER } from './pages';

const W = 400,
  H = 900;
const ink = 'rgba(226,196,140,';

function rays(cx: number, cy: number, n: number, len: number, a: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i * Math.PI * 2) / n;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(t) * len).toFixed(1)}" y2="${(cy + Math.sin(t) * len).toFixed(1)}" stroke="${ink}${a})" stroke-width=".6"/>`;
  }).join('');
}

function rose(cx: number, cy: number, r: number) {
  const pts = (k: number, rr: number) =>
    Array.from({ length: k }, (_, i) => {
      const t = (i * Math.PI * 2) / k - Math.PI / 2;
      const q = t + Math.PI / k;
      return `M${cx},${cy} L${(cx + Math.cos(t) * rr).toFixed(1)},${(cy + Math.sin(t) * rr).toFixed(1)} L${(cx + Math.cos(q) * rr * 0.22).toFixed(1)},${(cy + Math.sin(q) * rr * 0.22).toFixed(1)} Z`;
    }).join(' ');
  return `<g fill="none" stroke="${ink}.32)" stroke-width=".8">
    <circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.86}" stroke-dasharray="1.5 2.5"/>
    <path d="${pts(4, r * 1.25)}" fill="${ink}.1)"/><path d="${pts(8, r * 0.8)}"/>
  </g>`;
}

function build() {
  const sea = `${line(COAST)} L300,430 L0,430 Z`;
  const grid = [
    ...Array.from({ length: 10 }, (_, i) => `<line x1="${i * 46 - 6}" y1="0" x2="${i * 46 - 6}" y2="${H}"/>`),
    ...Array.from({ length: 20 }, (_, i) => `<line x1="0" y1="${i * 46 + 12}" x2="${W}" y2="${i * 46 + 12}"/>`),
  ].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
      <path d="M0,4 q2,-2.4 4,0 t4,0" fill="none" stroke="${ink}.13)" stroke-width=".7"/>
    </pattern>
  </defs>
  <g stroke="${ink}.06)" stroke-width=".7">${grid}</g>
  ${rays(318, 150, 32, 760, 0.07)}
  ${rays(70, 690, 32, 760, 0.06)}
  <g transform="translate(-60,150) scale(1.55)">
    <path d="${sea}" fill="url(#h)"/>
    <path d="${line(COAST)}" fill="none" stroke="${ink}.42)" stroke-width="1"/>
    <path d="${line(COAST)}" fill="none" stroke="${ink}.12)" stroke-width="5" transform="translate(1.5,2.5)"/>
    <path d="${line(RIVER)}" fill="none" stroke="rgba(150,185,190,.3)" stroke-width="2"/>
    <path d="${line(KALLANG)}" fill="none" stroke="rgba(150,185,190,.26)" stroke-width="1.8"/>
  </g>
  ${rose(318, 150, 30)}
  ${rose(70, 690, 22)}
  <g font-family="IM Fell English, Georgia, serif" font-style="italic" fill="${ink}.26)" letter-spacing="4">
    <text x="36" y="300" font-size="15">SINGAPURA</text>
    <text x="150" y="820" font-size="11">FRETUM SINGAPURANUM</text>
    <text x="250" y="560" font-size="9">MARINA</text>
  </g>
  <g transform="translate(300,760)" fill="none" stroke="${ink}.3)" stroke-width=".9" stroke-linejoin="round">
    <path d="M-22,6 Q0,14 24,4 L20,10 Q0,18 -18,11 Z" fill="${ink}.08)"/>
    <path d="M-4,4 L-4,-26 M8,3 L8,-18"/>
    <path d="M-4,-24 Q-16,-12 -14,2 L-4,2 Z M8,-16 Q18,-8 17,1 L8,1 Z"/>
    <path d="M-30,16 q4,-3 8,0 t8,0 M14,18 q4,-3 8,0 t8,0" stroke-width=".6"/>
  </g>
</svg>`;
}

/** The chart as a CSS `url(...)`. */
export const CHART_BACKDROP = `url("data:image/svg+xml,${encodeURIComponent(build().replace(/\s*\n\s*/g, ' '))}")`;
