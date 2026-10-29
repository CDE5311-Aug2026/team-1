import { useRef, type KeyboardEvent } from 'react';
import type { IconKey } from '../options';
import { ICON_PATHS } from '../options';
import motion from '../Onboarding.module.css';
import styles from './Choice.module.css';

/** The orange tick on a selected tile. Position it with a class on `className`. */
export function CheckBadge({ className }: { className: string }) {
  return (
    <svg className={`${styles.badge} ${motion.aPop} ${className}`} aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#E4671F" />
      <path d="M7.5 12.5l3 3L16.5 9" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TileIcon({ icon, size, stroke }: { icon: IconKey; size: number; stroke: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[icon]} />
    </svg>
  );
}

/**
 * Radio-group keyboard behaviour for the tile groups: roving tabindex (the selected option, or the
 * first, is the only tab stop) and arrow keys that move focus and select, wrapping at the ends.
 * Options are the `[role="radio"]` descendants of the group, in DOM order; Space/Enter click natively.
 */
export function useRadioGroup(selected: number, select: (index: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const radios = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
    const current = radios.indexOf(document.activeElement as HTMLElement);
    if (current < 0) return;
    const last = radios.length - 1;
    let next: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = current === last ? 0 : current + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = current === 0 ? last : current - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    select(next);
    radios[next].focus();
  };
  const tabIndexFor = (index: number) => (index === (selected >= 0 ? selected : 0) ? 0 : -1);
  return { groupProps: { ref, onKeyDown }, tabIndexFor };
}

export { styles as choice };
