// Locally typeset story props. These textures are designed paper, not scans or
// historical photographs; the underlying story wording is never rewritten.
export const PAPER_PRINT_WIDTH = 1536;
export const PAPER_PRINT_HEIGHT = 2048;

export const PAPER_THEMES = {
  letter: { name: 'Folded letter', heading: 'Street letters', english: 'CORRESPONDENCE', paper: '#f0e5ca', ink: '#374538', accent: '#a56b3d', rule: '#a58f66' },
  newspaper: { name: 'Neighbourhood paper', heading: 'Street paper · clues', english: 'NEIGHBOURHOOD EDITION', paper: '#e9e5d1', ink: '#293d31', accent: '#6e8050', rule: '#7e8c6c' },
  projection: { name: 'Screening log', heading: 'Screening log', english: 'STORY SCREENING LOG', paper: '#eaddc2', ink: '#444234', accent: '#997044', rule: '#aa926d' },
  fieldmemo: { name: 'Field memo', heading: 'City field notes', english: 'CIVIC FIELD MEMO', paper: '#f0dfbb', ink: '#3a4537', accent: '#ad6d3b', rule: '#ad9160' }
};

const ROUTE_THEME = {
  'telok-ayer': 'letter',
  'kampong-gelam': 'newspaper',
  balestier: 'projection',
  'civic-f1': 'fieldmemo'
};
const asText = value => typeof value === 'string' ? value : '';

/** sample is deliberately resolved before any reward/transition is accessed. */
export function makePaperDocument({ routeId, stop, index = 0, sample = false, routeMeta = {} } = {}) {
  const themeKey = ROUTE_THEME[routeId] || 'letter';
  const base = { themeKey, theme: PAPER_THEMES[themeKey], sample: !!sample, classification: 'Story prop · not a historical artefact' };
  if (sample) return {
    ...base,
    id: `paper-sample-${themeKey}`,
    folio: 'FS / PAPER STUDY',
    routeLabel: 'Stationery',
    routeEnglish: 'INTERACTIVE SPECIMEN',
    collectionTitle: 'Interactive sample',
    front: {
      eyebrow: 'Interactive sample · front',
      title: 'A city field note',
      text: 'Unfold this field note along its creases. Try turning it over to see the other side, or press and hold the paper to crumple it up again.'
    },
    back: {
      eyebrow: 'Interactive sample · back',
      title: 'Turn it over, keep reading',
      text: 'Turn back to the front and try “Smooth flat” to see the same sheet go from crumpled to smooth. On a real route, the story clue you found is printed on the front and the hint for the next place is on the back.',
      cta: 'Try turning over and smoothing'
    },
    note: 'This is a standalone stationery sample. It holds no place reward and records no progress.'
  };

  if (!stop?.reward || !asText(stop.reward.title)) return null;
  const number = String((Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0) + 1).padStart(2, '0');
  return {
    ...base,
    id: stop.id || `paper-${routeId}-${number}`,
    folio: `FS-${asText(routeMeta.no) || '00'}-${number}`,
    routeLabel: asText(routeMeta.area) || 'City exploration',
    routeEnglish: asText(routeMeta.en) || 'CITY DISCOVERY',
    collectionTitle: asText(routeMeta.title) || 'Story clue',
    front: {
      eyebrow: 'Story clue found · front',
      title: asText(stop.reward.title),
      text: asText(stop.reward.text)
    },
    back: {
      eyebrow: 'Route hint · back',
      title: asText(stop.transition?.cta) || 'Next clue',
      text: asText(stop.transition?.text),
      cta: asText(stop.transition?.cta)
    },
    note: 'This paper is a story prop. Unfolding, turning over and crumpling only change how it looks.'
  };
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let n = Math.imul(value ^ value >>> 15, 1 | value);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

function hashText(value) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return hash >>> 0;
}

const SERIF = '"IM Fell English", Georgia, serif';
const SANS = 'Arial, "Helvetica Neue", sans-serif';
const MONO = '"Courier New", monospace';
const LABEL = '"IM Fell English", Georgia, serif';

function wrapText(context, text, width) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    const tokens = paragraph.match(/[A-Za-z0-9][A-Za-z0-9'’\-./:]*|\s+|[^\s]/gu) || [''];
    for (const token of tokens) {
      if (context.measureText(line + token).width <= width) {
        line += token;
      } else {
        if (line.trim()) lines.push(line.trimEnd());
        line = token.trimStart();
        // A long Latin address must wrap too, without silently losing text.
        if (context.measureText(line).width > width) {
          let part = '';
          for (const character of line) {
            if (part && context.measureText(part + character).width > width) {
              lines.push(part);
              part = character;
            } else part += character;
          }
          line = part;
        }
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

function textBlock(context, text, { x, y, width, height, size = 64, minimum = 36, leading = 1.65, weight = 400, family = SERIF, color }) {
  if (!text) return y;
  let actualSize = size, lines;
  do {
    context.font = `${weight} ${actualSize}px ${family}`;
    lines = wrapText(context, text, width);
    if (lines.length * actualSize * leading <= height || actualSize <= minimum) break;
    actualSize -= 2;
  } while (actualSize >= minimum);
  context.fillStyle = color;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  lines.forEach((line, lineIndex) => context.fillText(line, x, y + lineIndex * actualSize * leading));
  return y + lines.length * actualSize * leading;
}

function rule(context, x, y, width, color, weight = 2) {
  context.fillStyle = color;
  context.fillRect(x, y, width, weight);
}

function paperBase(context, theme, seed, kind) {
  const w = PAPER_PRINT_WIDTH, h = PAPER_PRINT_HEIGHT;
  context.fillStyle = theme.paper;
  context.fillRect(0, 0, w, h);
  const wash = context.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, '#ffffff28');
  wash.addColorStop(.48, '#ffffff00');
  wash.addColorStop(1, '#74582e17');
  context.fillStyle = wash;
  context.fillRect(0, 0, w, h);
  const random = seededRandom(seed);
  context.save();
  for (let i = 0; i < 6500; i++) {
    context.globalAlpha = .025 + random() * .055;
    context.fillStyle = i % 3 ? '#6b5438' : '#fffdf3';
    const size = 1 + random() * 3;
    context.fillRect(random() * w, random() * h, size, size * .6);
  }
  context.globalAlpha = .08;
  context.strokeStyle = '#7e6949';
  context.lineWidth = .7;
  context.beginPath();
  for (let i = 0; i < 250; i++) {
    const x = random() * w, y = random() * h;
    context.moveTo(x, y);
    context.lineTo(x + random() * 13 - 6.5, y + random() * 3);
  }
  context.stroke();
  context.restore();
  context.strokeStyle = `${theme.rule}55`;
  context.lineWidth = 2;
  context.strokeRect(58, 58, w - 116, h - 116);
  context.strokeStyle = `${theme.rule}24`;
  context.strokeRect(70, 70, w - 140, h - 140);

  if (kind === 'projection') {
    context.fillStyle = `${theme.ink}28`;
    for (let y = 120; y < h - 100; y += 87) {
      context.fillRect(33, y, 33, 47);
      context.fillRect(w - 66, y, 33, 47);
    }
  } else if (kind === 'letter') {
    rule(context, 112, 344, 2, `${theme.accent}35`, h - 610);
  } else if (kind === 'fieldmemo') {
    for (let i = 0; i < 16; i++) {
      context.fillStyle = i % 2 ? `${theme.ink}12` : `${theme.ink}55`;
      context.fillRect(123 + i * 25, 286, 22, 11);
    }
  }
}

function printFace(ownerDocument, paper, face) {
  const canvas = ownerDocument.createElement('canvas');
  canvas.width = PAPER_PRINT_WIDTH;
  canvas.height = PAPER_PRINT_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Paper canvas is unavailable');
  const theme = paper.theme, content = paper[face], margin = 128, contentWidth = PAPER_PRINT_WIDTH - margin * 2;
  paperBase(context, theme, hashText(`${paper.id}:${face}`), paper.themeKey);
  context.textBaseline = 'top';
  context.fillStyle = theme.accent;
  context.font = `28px ${LABEL}`;
  context.fillText(paper.sample ? 'Stationery / interactive sample' : 'FINDSG / story prop', margin, 111);
  context.textAlign = 'right';
  context.font = `27px ${MONO}`;
  context.fillText(paper.folio, PAPER_PRINT_WIDTH - margin, 112);
  context.textAlign = 'left';
  textBlock(context, theme.heading, { x: margin, y: 181, width: contentWidth, height: 102, size: 76, minimum: 62, leading: 1.18, weight: 600, color: theme.ink });
  context.fillStyle = theme.accent;
  context.font = `25px ${MONO}`;
  context.fillText(theme.english, margin, 284);
  rule(context, margin, 334, contentWidth, theme.ink, paper.themeKey === 'newspaper' ? 7 : 3);
  if (paper.themeKey === 'newspaper') rule(context, margin, 348, contentWidth, theme.ink, 2);

  context.font = `30px ${LABEL}`;
  context.fillStyle = theme.accent;
  context.fillText(content.eyebrow, margin, 388);
  const titleEnd = textBlock(context, content.title, { x: margin, y: 453, width: contentWidth, height: 277, size: 88, minimum: 58, leading: 1.35, weight: 600, color: theme.ink });
  const bodyY = Math.max(674, titleEnd + 64);
  textBlock(context, content.text, { x: margin, y: bodyY, width: contentWidth, height: 1540 - bodyY, size: 64, minimum: 38, leading: 1.8, color: theme.ink });

  rule(context, margin, 1630, contentWidth, `${theme.rule}99`, 2);
  context.font = `29px ${LABEL}`;
  context.fillStyle = theme.accent;
  context.fillText(face === 'front' ? 'Turn over for the next part' : 'Carry this page on into the story', margin, 1678);
  textBlock(context, `${paper.routeLabel} / ${paper.collectionTitle}`, { x: margin, y: 1740, width: contentWidth, height: 95, size: 36, minimum: 27, leading: 1.5, family: SANS, color: theme.ink });
  context.font = `25px ${MONO}`;
  context.fillStyle = theme.accent;
  context.fillText(`${paper.routeEnglish} · ${face === 'front' ? 'FRONT / 01' : 'REVERSE / 02'}`, margin, 1856);
  context.font = `31px ${LABEL}`;
  context.fillText(paper.sample ? 'Standalone sample · no progress recorded' : 'Game prop · not a historical artefact', margin, 1912);
  const source = canvas.toDataURL('image/png');
  if (!source.startsWith('data:image/png')) throw new Error('Paper texture could not be printed');
  return source;
}

/** High-resolution local textures; no network requests, persistence or photos. */
export function createPaperPrints(ownerDocument, paper) {
  if (!ownerDocument?.createElement || !paper) throw new Error('Paper document is unavailable');
  return {
    src: printFace(ownerDocument, paper, 'front'),
    backSrc: printFace(ownerDocument, paper, 'back'),
    width: PAPER_PRINT_WIDTH,
    height: PAPER_PRINT_HEIGHT
  };
}
