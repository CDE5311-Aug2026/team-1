// Cute profile icons (owner request, 8 Nov 2026): eight friendly Singapore animals, drawn here as small inline SVGs
// (no external art). Each player gets one from their name, always the same one; the icon is decorative, so the name
// stays as text beside it and the SVG is aria-hidden.
import type { ReactElement } from 'react';

export const ANIMALS = ['otter', 'hornbill', 'kingfisher', 'cat', 'lizard', 'turtle', 'pangolin', 'owl'] as const;
export type Animal = (typeof ANIMALS)[number];

const INK = '#2a1d14';

const eye = (x: number, y: number, r = 1.7) => <circle cx={x} cy={y} r={r} fill={INK} />;
const shine = (x: number, y: number) => <circle cx={x} cy={y} r={0.6} fill="#fff" />;
const blush = (x: number, y: number) => <ellipse cx={x} cy={y} rx={2.2} ry={1.3} fill="#f08a7a" opacity={0.55} />;

/** Each animal on its own tinted round ground, in a 40 × 40 box. */
const ART: Record<Animal, { ground: string; draw: ReactElement }> = {
  // smooth-coated otter (Bishan, Marina Bay)
  otter: {
    ground: '#cfe3ea',
    draw: (
      <>
        <circle cx={8.6} cy={18.5} r={2.3} fill="#7a4f30" />
        <circle cx={31.4} cy={18.5} r={2.3} fill="#7a4f30" />
        <ellipse cx={20} cy={23.5} rx={13} ry={10} fill="#9a6a43" />
        <ellipse cx={20} cy={27.5} rx={10} ry={6} fill="#ecd6b6" />
        {eye(14.8, 21)}
        {eye(25.2, 21)}
        {shine(15.3, 20.4)}
        {shine(25.7, 20.4)}
        <ellipse cx={20} cy={25.4} rx={2.6} ry={1.8} fill={INK} />
        <path d="M20 27.2v1.6M17.6 29.4q2.4 1.6 4.8 0" stroke={INK} strokeWidth={1} fill="none" strokeLinecap="round" />
        <path d="M11 27.5l-4 -1M11 29.5l-4 .6M29 27.5l4 -1M29 29.5l4 .6" stroke="#6b4a30" strokeWidth={0.8} strokeLinecap="round" />
      </>
    ),
  },
  // oriental pied hornbill (Pulau Ubin, Changi)
  hornbill: {
    ground: '#f3e2c2',
    draw: (
      <>
        <circle cx={17} cy={23} r={11} fill="#2b2724" />
        <ellipse cx={15} cy={28.5} rx={6} ry={4} fill="#f4efe6" />
        <path d="M23 15.5q8-4.5 12.5 3.5q-6-2-11.5 0.5z" fill="#f6d77a" />
        <path d="M24 19q10-1 13.5 6.5q-7 1.8-13.5-0.5z" fill="#f2b632" />
        <path d="M24.5 22.2q6 .6 11.6 2.4" stroke="#c98a1a" strokeWidth={0.8} fill="none" strokeLinecap="round" />
        <circle cx={18.5} cy={20.5} r={3} fill="#f4efe6" />
        {eye(18.8, 20.6, 1.6)}
        {shine(19.3, 20)}
      </>
    ),
  },
  // collared kingfisher (parks and mangroves)
  kingfisher: {
    ground: '#dcefe4',
    draw: (
      <>
        <circle cx={18} cy={21} r={11.5} fill="#2f8fb0" />
        <path d="M7.5 25q10.5 6 21 0q-1 7-10.5 7.5Q8.5 32 7.5 25z" fill="#f7f3ea" />
        <path d="M27 19l11 2.6l-11 2.6z" fill="#2b2724" />
        <path d="M11 13q7-5 14 0" stroke="#5cc0d8" strokeWidth={2} fill="none" strokeLinecap="round" />
        <circle cx={19.5} cy={19.5} r={2.6} fill="#fff" />
        {eye(19.8, 19.6, 1.5)}
        {shine(20.3, 19)}
      </>
    ),
  },
  // a community cat (HDB void decks)
  cat: {
    ground: '#f6dfd2',
    draw: (
      <>
        <path d="M8.5 19L10.5 6.5L18.5 13.5z" fill="#e39a4f" />
        <path d="M31.5 19L29.5 6.5L21.5 13.5z" fill="#e39a4f" />
        <path d="M11 15.5L11.8 10L15.5 13.3z" fill="#f3b8a6" />
        <path d="M29 15.5L28.2 10L24.5 13.3z" fill="#f3b8a6" />
        <ellipse cx={20} cy={23.5} rx={12.5} ry={10.5} fill="#eaa75e" />
        <path d="M17 14.5l1 3M20 14l0 3.4M23 14.5l-1 3" stroke="#c97a35" strokeWidth={1.2} strokeLinecap="round" />
        {eye(15, 22.5)}
        {eye(25, 22.5)}
        {shine(15.5, 21.9)}
        {shine(25.5, 21.9)}
        <path d="M18.6 25.6h2.8L20 27.2z" fill="#e36d6d" />
        <path d="M20 27.2q-1.2 1.8-2.8 .8M20 27.2q1.2 1.8 2.8 .8" stroke={INK} strokeWidth={0.9} fill="none" strokeLinecap="round" />
        {blush(12.5, 26.5)}
        {blush(27.5, 26.5)}
      </>
    ),
  },
  // Malayan water monitor (Sungei Buloh)
  lizard: {
    ground: '#e7ead0',
    draw: (
      <>
        <path d="M4.5 25q2-11.5 15.5-12q14 0 16.5 9.5q-2.5 7-16.5 7.2Q6.5 29.8 4.5 25z" fill="#7d8f5a" />
        <circle cx={14} cy={18} r={1.3} fill="#d9d08a" />
        <circle cx={18} cy={16.5} r={1.1} fill="#d9d08a" />
        <circle cx={11} cy={21.5} r={1.1} fill="#d9d08a" />
        <circle cx={26} cy={19.5} r={3} fill="#f2ecc8" />
        {eye(26.4, 19.6, 1.6)}
        {shine(26.9, 19)}
        <circle cx={34} cy={21.5} r={0.7} fill={INK} />
        <path d="M22 25.5q6 1.4 12.5-1.6" stroke={INK} strokeWidth={1} fill="none" strokeLinecap="round" />
        <path d="M36 23.6l2.6 .6l-1.4 1.1M38.6 24.2l-.2 1.8" stroke="#d6455a" strokeWidth={0.9} fill="none" strokeLinecap="round" />
      </>
    ),
  },
  // green turtle (off the Southern Islands)
  turtle: {
    ground: '#d6ecf0',
    draw: (
      <>
        <circle cx={20} cy={28} r={7.5} fill="#a7cc8f" />
        <path d="M6.5 24.5q0-14 13.5-14t13.5 14z" fill="#4e8b5a" />
        <path d="M20 11v13.5M13.5 13.5l3 5.5l-4.5 5.5M26.5 13.5l-3 5.5l4.5 5.5M16.5 19h7" stroke="#3a6c45" strokeWidth={1} fill="none" strokeLinejoin="round" />
        <path d="M6 24.5h28" stroke="#3a6c45" strokeWidth={1.6} strokeLinecap="round" />
        {eye(16.8, 28.5, 1.4)}
        {eye(23.2, 28.5, 1.4)}
        {shine(17.2, 28)}
        {shine(23.6, 28)}
        <path d="M18.4 31.3q1.6 1.2 3.2 0" stroke={INK} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      </>
    ),
  },
  // Sunda pangolin (Central Catchment)
  pangolin: {
    ground: '#efe3cf',
    draw: (
      <>
        <ellipse cx={20} cy={21} rx={12} ry={10.5} fill="#a9805a" />
        <path d="M10 18q3-4 6 0q3-4 6 0q3-4 6 0q3-4 4 0M12 13q2.5-3.5 5 0q2.5-3.5 5 0q2.5-3.5 5 0" stroke="#7d5a3a" strokeWidth={1.1} fill="none" strokeLinecap="round" />
        <path d="M13 22q7-3 14 0q0 10-7 12q-7-2-7-12z" fill="#e2c7a3" />
        {eye(16.5, 24)}
        {eye(23.5, 24)}
        {shine(17, 23.4)}
        {shine(24, 23.4)}
        <ellipse cx={20} cy={31.8} rx={1.8} ry={1.3} fill="#e07a7a" />
      </>
    ),
  },
  // buffy fish owl (Botanic Gardens)
  owl: {
    ground: '#e9e1f2',
    draw: (
      <>
        <path d="M9 14L11.5 5.5L16.5 11z" fill="#9e6c38" />
        <path d="M31 14L28.5 5.5L23.5 11z" fill="#9e6c38" />
        <ellipse cx={20} cy={22.5} rx={12.5} ry={12} fill="#c08a4e" />
        <circle cx={14.8} cy={20.5} r={5.2} fill="#f3e6cf" />
        <circle cx={25.2} cy={20.5} r={5.2} fill="#f3e6cf" />
        <circle cx={14.8} cy={20.5} r={3.4} fill="#f7c948" />
        <circle cx={25.2} cy={20.5} r={3.4} fill="#f7c948" />
        {eye(14.8, 20.6, 1.8)}
        {eye(25.2, 20.6, 1.8)}
        {shine(15.4, 20)}
        {shine(25.8, 20)}
        <path d="M18.4 24.5h3.2L20 27.6z" fill="#4a4036" />
        <path d="M14 30q2 1.6 3 0q1.5 1.6 3 0q1.5 1.6 3 0q1 1.6 3 0" stroke="#9e6c38" strokeWidth={1} fill="none" strokeLinecap="round" />
      </>
    ),
  },
};

/** FNV-1a over the name's UTF-16 units, then a final mix so close names spread: the same name always gives the
 *  same animal. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x045d9f3b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** The animal for a player's name (trimmed, case-insensitive). The fixed prefix keeps the podium's example players
 *  and "You" on four different animals. */
export function animalFor(name: string): Animal {
  return ANIMALS[hash(`findsg|${name.trim().toLowerCase()}`) % ANIMALS.length];
}

interface AvatarProps {
  /** The player's name; it picks the animal. The name itself is shown by the caller, as text. */
  name: string;
  /** Pick this animal instead of the name's one. */
  animal?: Animal;
  size?: number;
  className?: string;
}

/** A round, decorative profile icon (aria-hidden): the caller keeps the name as text. */
export default function Avatar({ name, animal, size = 40, className }: AvatarProps) {
  const which = animal ?? animalFor(name);
  const art = ART[which];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      data-animal={which}
      style={{ display: 'block', borderRadius: '50%' }}
    >
      <circle cx={20} cy={20} r={20} fill={art.ground} />
      {art.draw}
    </svg>
  );
}
