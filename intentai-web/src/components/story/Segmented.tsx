import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import styles from './Segmented.module.css';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
}

interface SegmentedProps<V extends string> {
  /** Group name, e.g. "Show" or "Jump to photos of". */
  label: string;
  options: readonly SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}

/** Segmented control with a sliding white thumb: a radiogroup, arrow keys move and select (wrapping). */
export function Segmented<V extends string>({ label, options, value, onChange, className }: SegmentedProps<V>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const select = (i: number) => {
    const n = options.length;
    const next = ((i % n) + n) % n;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step: Record<string, number | undefined> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (step[e.key] !== undefined) select(index + step[e.key]!);
    else if (e.key === 'Home') select(0);
    else if (e.key === 'End') select(options.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${styles.track} ${className ?? ''}`}
      style={{ '--segments': options.length } as CSSProperties}
    >
      <span aria-hidden="true" data-testid="segmented-thumb" className={styles.thumb} style={{ transform: `translateX(${index * 100}%)` }} />
      {options.map((o, i) => {
        const on = i === index;
        return (
          <button
            key={o.value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={`${styles.option} ${on ? styles.on : ''}`}
            onClick={() => onChange(o.value)}
            onKeyDown={onKeyDown}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
