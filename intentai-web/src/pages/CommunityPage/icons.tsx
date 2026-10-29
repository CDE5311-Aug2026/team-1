// Stroke icons from the ZIP prototype (community-social.js icon set and its assets/*.svg), redrawn on a 20px grid.
const PATHS = {
  bell: 'M5 13.3V9.2a5 5 0 0 1 10 0v4.1l1.25 1.7H3.75L5 13.3ZM8.3 17.1a1.9 1.9 0 0 0 3.4 0',
  plus: 'M10 4.2v11.6M4.2 10h11.6',
  arrow: 'M4.2 10h11.6M11 15l4.8-5L11 5',
  back: 'M12.5 4.2 6.7 10l5.8 5.8',
  close: 'm5.4 5.4 9.2 9.2m0-9.2-9.2 9.2',
  search: 'M9 14.2a5.2 5.2 0 1 0 0-10.4 5.2 5.2 0 0 0 0 10.4ZM12.9 12.9l3.6 3.6',
  like: 'M16.8 3.9a4.35 4.35 0 0 0-6.15 0L10 4.55l-.65-.65a4.35 4.35 0 0 0-6.15 6.15L10 16.8l6.8-6.75a4.35 4.35 0 0 0 0-6.15Z',
  reply: 'm7.2 5.2-4.6 4.3 4.6 4.3M3.1 9.5h8.1c3.8 0 5.9 1.8 5.9 5.3',
  bookmark: 'M5.2 3.2h9.6v14l-4.8-3.4-4.8 3.4V3.2Z',
  follow: 'M8 9.4a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.7 16.7v-1.3a5.3 5.3 0 0 1 9.7-3M15.2 8.9v6.2m-3.1-3.1h6.2',
  following: 'M7.4 9.4a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.1 16.7v-1.3a5.3 5.3 0 0 1 9.2-3.6M12.1 14l2 2 4-4.6',
  down: 'm5 7.5 5 5 5-5',
  up: 'm5 12.5 5-5 5 5',
  send: 'M10 16.7V3.3M4.8 8.5 10 3.3l5.2 5.2',
  lock: 'M6.2 8.7h7.6a1.8 1.8 0 0 1 1.8 1.8v4.6a1.8 1.8 0 0 1-1.8 1.8H6.2a1.8 1.8 0 0 1-1.8-1.8v-4.6a1.8 1.8 0 0 1 1.8-1.8ZM6.6 8.7V6.3a3.4 3.4 0 0 1 6.8 0v2.4M10 12.1v1.7',
  unlock: 'M6.2 8.7h7.6a1.8 1.8 0 0 1 1.8 1.8v4.6a1.8 1.8 0 0 1-1.8 1.8H6.2a1.8 1.8 0 0 1-1.8-1.8v-4.6a1.8 1.8 0 0 1 1.8-1.8ZM6.6 8.7V6.3a3.4 3.4 0 0 1 6.5-1.4M10 12.1v1.7',
  check: 'm4.2 10.4 3.7 3.7 7.9-7.9',
  hourglass: 'M5.8 2.5h8.4M5.8 17.5h8.4M6.7 2.5c0 2.1 1.7 3.1 3.3 4.1 1.6-1 3.3-2 3.3-4.1M6.7 17.5c0-4.2 6.6-4.2 6.6-7.5 0-1.7-1.7-2.5-3.3-3.4-1.6.9-3.3 1.7-3.3 3.4',
  question: 'M7.6 7.6a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.2.9-1.2 1.7v.7M10 14.8v.2',
  edit: 'M3.3 16.7h3.3l9.2-9.2-3.3-3.3-9.2 9.2v3.3Z',
  withdraw: 'M8.6 5 3.6 10l5 5M3.9 10h8.6a6.1 6.1 0 0 1 6.1 6.1V18',
  chat: 'M4.2 4.2h11.6a.8.8 0 0 1 .8.8v7.5a.8.8 0 0 1-.8.8H9.2l-3.3 2.9v-2.9H4.2a.8.8 0 0 1-.8-.8V5a.8.8 0 0 1 .8-.8Z',
  pin: 'M10 17.5s-5.4-5.2-5.4-9.2a5.4 5.4 0 0 1 10.8 0c0 4-5.4 9.2-5.4 9.2ZM10 10.2a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z',
  person: 'M10 9.6a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6ZM3.8 17.1a6.2 6.2 0 0 1 12.4 0',
  people: 'M7.5 9.6a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8ZM2.1 16.7a5.4 5.4 0 0 1 10.8 0H2.1ZM14.2 9.2a2.1 2.1 0 0 0 0-4.2M13.3 11.8a4.4 4.4 0 0 1 4.6 4.9',
  expand: 'M12.5 3.3h4.2v4.2M7.5 16.7H3.3v-4.2M16.7 3.3l-5 5M3.3 16.7l5-5',
  tip: 'M6.7 3.3h6.6a1.7 1.7 0 0 1 1.7 1.7v11.7l-5-3.3-5 3.3V5a1.7 1.7 0 0 1 1.7-1.7Z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className, strokeWidth = 1.6 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
