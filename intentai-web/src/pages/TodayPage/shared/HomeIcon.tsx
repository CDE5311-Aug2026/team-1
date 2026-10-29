// Stroke icons for Home, the place page and the card pages (drawn like the Intent v3 Figma's 1.8 px stroke set).
import type { CardKind } from '../../../data/home/places';

const PATHS = {
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.2l2.8 2.8L16.2 9.6',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11ZM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.8-4.8',
  play: 'M8 5.5v13l10.5-6.5L8 5.5Z',
  pause: 'M8 5v14M16 5v14',
  down: 'M6 9l6 6 6-6',
  map: 'M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2ZM9 4.5v13M15 6.5v13',
  calendar: 'M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4',
  stamp: 'M12 3.5a3.5 3.5 0 0 0-2 6.4V13H6.5a2 2 0 0 0-2 2v2h15v-2a2 2 0 0 0-2-2H14V9.9a3.5 3.5 0 0 0-2-6.4ZM5 20.5h14',
  food: 'M5 11h14a7 7 0 0 1-14 0ZM9 4c-.8 1.2.8 2.3 0 3.5M12.5 4c-.8 1.2.8 2.3 0 3.5M16 4c-.8 1.2.8 2.3 0 3.5M8 21h8',
  monument: 'M3.5 9 12 4l8.5 5M5 9.5h14M6.5 10v7M10 10v7M14 10v7M17.5 10v7M4 20h16M4.5 17.5h15',
  festival: 'M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6L12 3.5ZM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2ZM5.5 15.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z',
  history: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5M12 8v4.5l3 2',
  tip: 'M5 5.5h14v10H10l-4 3.5v-3.5H5z',
  video: 'M4 6.5h11v11H4zM15 10.5l5-3v9l-5-3',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
} as const;

export type HomeIconName = keyof typeof PATHS;

export function kindIcon(kind: CardKind): HomeIconName {
  return kind;
}

export default function HomeIcon({ name, size = 20, stroke = 1.8, className }: { name: HomeIconName; size?: number; stroke?: number; className?: string }) {
  const filled = name === 'play';
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
