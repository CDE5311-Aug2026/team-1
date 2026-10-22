// Line icons for Nearby (one stroke weight, currentColor), instead of emoji.
import type { Category } from '../types';

const PATHS: Record<string, string> = {
  landmark: 'M3 9.5 12 4l9 5.5M5.5 10v8M9.5 10v8M14.5 10v8M18.5 10v8M3 20h18',
  food: 'M3.5 11.5h17a8.5 8.5 0 0 1-17 0ZM8.5 8c0-1.2 1-1.8 1-3M12 8c0-1.2 1-1.8 1-3M15.5 8c0-1.2 1-1.8 1-3',
  nature: 'M5 19C5 11 11 5 19 5c0 8-6 14-14 14ZM5 19l7.5-7.5',
  culture: 'M3 10h18L12 4.5ZM6 10v8.5M18 10v8.5M10 18.5V14h4v4.5M3 20h18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  recenter: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  locate: 'M20 4 3.5 10.5l7 3 3 7Z',
  back: 'M15 5l-7 7 7 7',
  chat: 'M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 9.5h8M8 12.5h5',
  star: 'M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8Z',
  chevron: 'M9 5l7 7-7 7',
  filter: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7.5V12l3 2',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11ZM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  phone: 'M6.5 4h2.6l1.4 3.8-1.9 1.4a11 11 0 0 0 6.2 6.2l1.4-1.9 3.8 1.4v2.6a1.8 1.8 0 0 1-1.9 1.8A15.5 15.5 0 0 1 4.7 5.9 1.8 1.8 0 0 1 6.5 4Z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.5 12h17M12 3c2.4 2.6 3.5 5.6 3.5 9s-1.1 6.4-3.5 9M12 3c-2.4 2.6-3.5 5.6-3.5 9s1.1 6.4 3.5 9',
  map: 'M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2ZM9 4.5v13M15 6.5v13',
  quote: 'M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
  share: 'M12 14.5V3.5M8 7.5l4-4 4 4M8.5 10.5H6.5a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7.5a1 1 0 0 0-1-1h-2',
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12.5l2.7 2.7L16 9.8',
};

export type IconName = keyof typeof PATHS;

/** The path data (24 × 24, stroked), for drawing an icon outside React (the 3D view's pins). */
export const ICON_PATHS: Readonly<Record<string, string>> = PATHS;

export function Icon({ name, size = 20, filled = false, className }: { name: IconName | Category; size?: number; filled?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
