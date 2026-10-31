// A note you can pick up and move about the page (owner, 31 Oct 2026: "small cards you can slide around and play with,
// like sticky notes; physical and 3D"). Picked up, it lifts off the paper (bigger, a deeper shadow) and leans into the
// way you move it, as paper does in the air; let go, it glides a little, settles back at its own slight angle, and stays
// where you left it. The newest one picked up sits on top. Arrow keys move it too.
import { motion, useMotionValue, useReducedMotionConfig, useSpring, useTransform, useVelocity } from 'motion/react';
import { useState, type ReactNode, type RefObject } from 'react';
import styles from './StickyNote.module.css';

export type NoteTone = 'butter' | 'rose' | 'sage' | 'sky' | 'print';

let top = 10;

interface Props {
  children: ReactNode;
  tone?: NoteTone;
  /** Its resting angle in degrees. */
  tilt?: number;
  /** The area it can be moved within. */
  bounds: RefObject<HTMLElement>;
  /** A strip of tape across the top instead of the glue strip. */
  tape?: boolean;
  /** What it is, for screen readers (the content is read as well). */
  label?: string;
  className?: string;
}

export function StickyNote({ children, tone = 'butter', tilt = 0, bounds, tape, label, className }: Props) {
  const reduce = useReducedMotionConfig();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const vx = useVelocity(x);
  const vy = useVelocity(y);
  // it leans into the way it moves, then springs back flat
  const spring = { stiffness: 320, damping: 22, mass: 0.6 };
  const rotateY = useSpring(useTransform(vx, [-1600, 1600], [-26, 26], { clamp: true }), spring);
  const rotateX = useSpring(useTransform(vy, [-1600, 1600], [22, -22], { clamp: true }), spring);
  const rotate = useSpring(
    useTransform(vx, (v) => tilt + Math.max(-7, Math.min(7, v / 260))),
    spring,
  );
  const [z, setZ] = useState(1);
  const [lifted, setLifted] = useState(false);

  const nudge = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 12;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    x.set(x.get() + d[0]);
    y.set(y.get() + d[1]);
  };

  return (
    <motion.li
      className={`${styles.note} ${className ?? ''}`}
      data-tone={tone}
      data-tape={tape || undefined}
      data-lifted={lifted || undefined}
      data-no-flip
      tabIndex={0}
      aria-roledescription="movable note"
      aria-label={label}
      drag
      dragConstraints={bounds}
      dragElastic={0.16}
      dragTransition={{ power: 0.22, timeConstant: 240, bounceStiffness: 340, bounceDamping: 20 }}
      onPointerDown={() => setZ(++top)}
      onDragStart={() => setLifted(true)}
      onDragEnd={() => setLifted(false)}
      onKeyDown={nudge}
      whileDrag={{ scale: 1.08 }}
      whileTap={{ scale: 1.04 }}
      style={{ x, y, rotate: reduce ? tilt : rotate, rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY, zIndex: z }}
    >
      {children}
    </motion.li>
  );
}
