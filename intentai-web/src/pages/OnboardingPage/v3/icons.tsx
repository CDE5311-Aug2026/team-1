// Stroke icons for Onboarding and My Space (24px grid, 1.8 stroke, currentColor), drawn after the Figma's Lucide-style set.
import type { SVGProps } from 'react';

const PATHS = {
  back: <path d="M15 18l-6-6 6-6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeClosed: <path d="M3 10c2.5 3.5 5.5 5 9 5s6.5-1.5 9-5M6.5 13.5L5 16M12 15v3M17.5 13.5L19 16" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>
  ),
  plane: <path d="M3 11l18-8-8 18-2-8-8-2z" />,
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  home: <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-4.5v-6h-5v6H5a1 1 0 01-1-1v-9.5z" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />,
  cap: (
    <>
      <path d="M2 9l10-5 10 5-10 5L2 9z" />
      <path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6" />
    </>
  ),
  badge: (
    <>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M12 11v5M9.5 13.5h5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M3 13h18" />
    </>
  ),
  bag: (
    <>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9.5" r="2.2" />
      <path d="M3.5 19c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5M15 14.3c2.6-.4 4.8 1.2 5.3 4.2" />
    </>
  ),
  book: <path d="M4 5.5A1.5 1.5 0 015.5 4H19v14H5.5A1.5 1.5 0 004 19.5v-14zM4 19.5A1.5 1.5 0 005.5 21H19v-3" />,
  locate: (
    <>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  hand: <path d="M8 13V5.5a1.5 1.5 0 013 0V11m0-1.5a1.5 1.5 0 013 0V11m0-1a1.5 1.5 0 013 0v4.5c0 3.6-2.5 6.5-6 6.5-2.6 0-4.2-1.3-5.5-3.5L4 14.2a1.5 1.5 0 012.5-1.6L8 14.5" />,
  reset: <path d="M4 12a8 8 0 102.3-5.7M4 4v4h4" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" />
      <path d="M9.5 12.5l2 2 3.5-4" />
    </>
  ),
  redo: <path d="M20 12a8 8 0 11-2.3-5.7M20 4v4h-4" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 014.8 1c0 1.7-2.3 2-2.3 3.5M12 17h.01" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4V5z" />,
  cards: (
    <>
      <rect x="7" y="3" width="13" height="15" rx="2" />
      <path d="M4 7v11a3 3 0 003 3h9" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  motion: <path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />,
  captions: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 10.5a2 2 0 100 3M17 10.5a2 2 0 100 3" />
    </>
  ),
  vibrate: (
    <>
      <rect x="8" y="4" width="8" height="16" rx="2" />
      <path d="M4 9v6M20 9v6" />
    </>
  ),
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 21h4" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4V8z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  /** Text size: a large and a small A. */
  text: <path d="M3 19l5-13 5 13M4.8 14.5h6.4M14 19l3.5-8 3.5 8M15.2 16.5h4.6" />,
  /** Nearby radius: a point inside a circle. */
  radius: (
    <>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 12h9" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
