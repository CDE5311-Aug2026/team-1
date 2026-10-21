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
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12.5l2.7 2.7L16 9.8',
};

export type IconName = keyof typeof PATHS;

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
