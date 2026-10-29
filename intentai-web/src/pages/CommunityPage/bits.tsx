// Small shared pieces: member avatars, a stack of them, and an animated count.
import { useReducedMotionConfig } from 'motion/react';
import { useState } from 'react';
import CountUp from '../../components/reactbits/CountUp';
import { memberByName } from '../../data/community/people';
import styles from './bits.module.css';

/**
 * Demo build (owner decision 2026-10-29): the community content is not tagged item by item; Settings › About says it
 * is illustrative. Kept as a component so the tag can come back in one place.
 */
export function ExampleTag(_props: { className?: string }) {
  return null;
}

/** A member's picture (DiceBear Notionists, CC0), or their initial for "You" and anyone without one. */
export function Avatar({ name, size = 'md', tone = 'warm' }: { name: string; size?: 'sm' | 'md' | 'lg'; tone?: 'warm' | 'accent' | 'dark' }) {
  const member = name === 'You' ? undefined : memberByName(name);
  if (member?.avatar) {
    return (
      <span className={`${styles.avatar} ${styles.photo} ${styles[size]}`} aria-hidden="true">
        <img src={member.avatar} alt="" draggable={false} />
      </span>
    );
  }
  return (
    <span className={`${styles.avatar} ${styles[size]} ${styles[tone]}`} aria-hidden="true">
      {Array.from(name.trim())[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

/** Overlapping avatars of a few people ("Mel, Jo and 3 others replied"). */
export function AvatarStack({ names, size = 'sm' }: { names: readonly string[]; size?: 'sm' | 'md' }) {
  if (names.length === 0) return null;
  return (
    <span className={styles.stack} aria-hidden="true">
      {names.map((name) => (
        <Avatar key={name} name={name} size={size} />
      ))}
    </span>
  );
}

/**
 * A number that counts from its old value to a new one when it changes (React Bits CountUp). The first value
 * shows at once; with reduced motion (app setting or system) it never animates. Screen readers get the plain value.
 */
export function Count({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotionConfig();
  const [first] = useState(value);
  if (reduce || value === first) {
    return <span className={className}>{value}</span>;
  }
  return (
    <span className={className}>
      <span className={styles.srOnly}>{value}</span>
      <span aria-hidden="true">
        <CountUp key={first} from={first} to={value} duration={0.5} trigger="load" />
      </span>
    </span>
  );
}
