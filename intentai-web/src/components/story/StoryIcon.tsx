import type { Facet } from '../../data/placeStories';

export type StoryIconName = Facet | 'house';

// 24-unit stroke paths from the story screens: kicker icons per facet, plus the house stamp.
const PATHS: Record<StoryIconName, string[]> = {
  food: ['M3.5 11.5h17a8.5 8.5 0 0 1-17 0ZM8.5 8c0-1.2 1-1.8 1-3M12 8c0-1.2 1-1.8 1-3M15.5 8c0-1.2 1-1.8 1-3'],
  monument: ['M3 9.5 12 4l9 5.5M5.5 10v8M9.5 10v8M14.5 10v8M18.5 10v8M3 20h18'],
  festival: [
    'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8Z',
    'M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z',
  ],
  history: ['M3.5 12a8.5 8.5 0 1 0 2.5-6', 'M3.5 4v4h4', 'M12 7.5V12l3 2'],
  house: ['M3 12 12 5l9 7', 'M6 10v9h12v-9'],
};

interface StoryIconProps {
  name: StoryIconName;
  size: number;
  className?: string;
}

/** Decorative line icon in currentColor; always aria-hidden. */
export function StoryIcon({ name, size, className }: StoryIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
