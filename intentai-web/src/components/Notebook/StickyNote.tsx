// A note you can pick up and move about the page (owner, 31 Oct 2026: "small cards you can slide around and play with,
// like sticky notes; physical and 3D"). Picked up, it lifts off the paper (bigger, a deeper shadow) and leans into the
// way you move it, as paper does in the air; let go, it glides a little, settles back at its own slight angle, and stays
// where you left it. The newest one picked up sits on top. Arrow keys move it too.
import { motion, useMotionValue, useReducedMotionConfig, useSpring, useTransform, useVelocity } from 'motion/react';
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
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
  /** A plain tap (no drag) on the note. */
  onTap?: () => void;
}

export function StickyNote({ children, tone = 'butter', tilt = 0, bounds, tape, label, className, onTap }: Props) {
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
  // the area it can move in, from layout offsets: on-screen boxes are wrong while a book page is turned in 3D
  const me = useRef<HTMLLIElement>(null);
  const [box, setBox] = useState<{ left: number; right: number; top: number; bottom: number }>();
  useLayoutEffect(() => {
    const el = me.current,
      area = bounds.current;
    if (!el || !area) return;
    const measure = () => {
      let left = 0,
        top = 0;
      for (let n: HTMLElement | null = el; n && n !== area; n = n.offsetParent as HTMLElement | null) {
        left += n.offsetLeft;
        top += n.offsetTop;
      }
      setBox({ left: -left, top: -top, right: area.clientWidth - left - el.offsetWidth, bottom: area.clientHeight - top - el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(area);
    return () => ro.disconnect();
  }, [bounds]);

  // a tap is a press that ends close to where it began; anything further is a drag
  const press = useRef<{ x: number; y: number } | null>(null);
  const release = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (p && onTap && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) onTap();
  };

  const nudge = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onTap && e.target === e.currentTarget) {
      e.preventDefault();
      onTap();
      return;
    }
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
      ref={me}
      drag
      dragConstraints={box}
      dragElastic={0.16}
      dragTransition={{ power: 0.22, timeConstant: 240, bounceStiffness: 340, bounceDamping: 20 }}
      onPointerDown={(e) => {
        setZ(++top);
        press.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={release}
      onPointerCancel={() => (press.current = null)}
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
