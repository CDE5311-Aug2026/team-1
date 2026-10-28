import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Onboarding } from '../../../data/domain';
import { HOME_BASE, HOME_PLACES, type HomePlace } from '../../../data/homePlaces';
import { distanceM } from '../../../features/nearby/geo';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { paths } from '../../../routes';
import { formatDistance } from '../areas';
import motion from '../Onboarding.module.css';
import { ICON_PATHS, PHOTOS, type IconKey, type OnbPhoto } from '../options';
import styles from './Done.module.css';
import type { StepDef, StepProps } from './types';

/** The finds fan turns to the next card this often... */
export const FIND_ROTATE_MS = 3400;
/** ...unless a card was tapped within this long. */
export const FIND_TAP_PAUSE_MS = 5000;

function place(id: string): HomePlace {
  const p = HOME_PLACES.find((h) => h.id === id);
  if (!p) throw new Error(`home place ${id} missing`);
  return p;
}
const WALL = place('berlin-wall-fragments');
const CHINATOWN = place('chinatown');

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Stamp date: `D MMM YYYY`, upper-case, in local time (e.g. `27 OCT 2026`). Unparseable → today. */
export function formatStampDate(iso: string | null): string {
  let d = iso === null ? new Date() : new Date(iso);
  if (Number.isNaN(d.getTime())) d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

interface Find {
  title: string;
  sub: string;
  photo: OnbPhoto;
  reason: string;
  icon: IconKey;
  href: string;
}

function findsFor(data: Onboarding): Find[] {
  const wallM = distanceM(data.base ?? HOME_BASE, WALL.point);
  const foodRank = data.topics.indexOf('food') + 1 || 1;
  return [
    { title: 'Berlin Wall Fragments', sub: 'NUS University Town', photo: PHOTOS.wall, reason: `${formatDistance(wallM)} from your base`, icon: 'pin', href: paths.homePlace(WALL.id) },
    { title: 'Bak kwa', sub: 'Chinatown · food', photo: PHOTOS.food, reason: `You ranked Food #${foodRank}`, icon: 'bowl', href: paths.placeCard(CHINATOWN.id, 'food') },
    { title: 'Lunar New Year', sub: 'Chinatown · festival', photo: PHOTOS.festival, reason: 'Compare with home', icon: 'spark', href: paths.placeCard(CHINATOWN.id, 'festival') },
  ];
}

const BURST_COLORS = ['#E4671F', '#F4B389', '#23211D', '#1E3A8A'];
const BURSTS = Array.from({ length: 14 }, (_, i) => ({
  '--r': `${i * (360 / 14)}deg`,
  background: BURST_COLORS[i % 4],
  animationDelay: `${(0.7 + (i % 3) * 0.05).toFixed(2)}s`,
})) as CSSProperties[];

/** Fan slots by distance from the front card: front, right, left. */
const SLOTS = [
  { x: 0, rot: 0, scale: 1, z: 3 },
  { x: 96, rot: 9, scale: 0.86, z: 1 },
  { x: -96, rot: -9, scale: 0.86, z: 1 },
];

/** Keyboard focus (not a mouse click) pauses the fan. Browsers without :focus-visible count every focus. */
function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

function Fan({ finds }: { finds: Find[] }) {
  const reduced = useReducedMotion();
  const [front, setFront] = useState(0);
  const lastTap = useRef(-Infinity);
  const focusInside = useRef(false);
  const focusFront = useRef(false);
  const frontLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      // A keyboard user inside the fan keeps the card they are on.
      if (focusInside.current || Date.now() - lastTap.current <= FIND_TAP_PAUSE_MS) return;
      setFront((f) => (f + 1) % finds.length);
    }, FIND_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduced, finds.length]);

  useEffect(() => {
    // The tapped back card's button is replaced by the front link: move focus onto it.
    if (!focusFront.current) return;
    focusFront.current = false;
    frontLink.current?.focus();
  }, [front]);

  const bring = (i: number, button: HTMLButtonElement) => {
    lastTap.current = Date.now();
    // Only follow with focus when the button had it (keyboard, or a browser that focuses on click).
    focusFront.current = document.activeElement === button;
    setFront(i);
  };

  return (
    <>
      <div
        role="group"
        aria-label="Your first finds"
        className={`${styles.fan} ${motion.aUp}`}
        style={{ animationDelay: '1.15s' }}
        onFocus={(e) => {
          focusInside.current = isFocusVisible(e.target);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focusInside.current = false;
        }}
      >
        {finds.map((c, i) => {
          const pos = (i - front + finds.length) % finds.length;
          const s = SLOTS[pos];
          return (
            <div
              key={c.title}
              className={styles.card}
              style={{ zIndex: s.z, transform: `translateX(${s.x}px) rotate(${s.rot}deg) scale(${s.scale})` }}
            >
              <div className={styles.cardInner}>
                <img src={c.photo.src} alt="" className={styles.cardPhoto} />
                <span aria-hidden="true" className={styles.cardShade} />
                <span className={styles.chipRow}>
                  <span className={styles.chip}>
                    <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E4671F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d={ICON_PATHS[c.icon]} />
                    </svg>
                    {c.reason}
                  </span>
                </span>
                <span className={styles.cardText}>
                  <span className={styles.cardTitle}>{c.title}</span>
                  <span className={styles.cardSub}>{c.sub}</span>
                </span>
                {pos === 0 ? (
                  <Link ref={frontLink} to={c.href} aria-label={`Open ${c.title}`} className={styles.cover} />
                ) : (
                  <button type="button" aria-label={`Show ${c.title}`} className={`${styles.cover} ${styles.coverButton}`} onClick={(e) => bring(i, e.currentTarget)} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className={`${styles.dots} ${motion.aUp}`} style={{ animationDelay: '1.2s' }}>
        {finds.map((c, i) => (
          <span key={c.title} data-dot="" data-active={i === front} className={`${styles.dot} ${i === front ? styles.dotActive : ''}`} />
        ))}
      </div>
    </>
  );
}

/** One line per distinct credit; covers every photo the flow can show. */
const PHOTO_CREDITS = [...new Set(Object.values(PHOTOS).map((photo) => photo.credit))];

/** O8: confetti, heading, privacy hint and the first finds fan. */
function Body({ data }: StepProps) {
  const reduced = useReducedMotion();
  return (
    <>
      <span aria-hidden="true" className={styles.confetti}>
        {!reduced && BURSTS.map((style, i) => <span key={i} data-burst="" className={motion.burst} style={style} />)}
      </span>
      <h1 className={styles.title}>
        <span className={motion.aBlur} style={{ animationDelay: '0.9s' }}>
          Your passport is ready
        </span>
      </h1>
      <p className={`${styles.helper} ${motion.aUp}`} style={{ animationDelay: '1s' }}>
        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E4671F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10c2.5 3 5.5 4.5 9 4.5s6.5-1.5 9-4.5M6.5 13.5 5 16M12 14.5V17M17.5 13.5 19 16" />
        </svg>
        Closed eyes keep a detail private
      </p>
      <p className={`${styles.kicker} ${motion.aUp}`} style={{ animationDelay: '1.1s' }}>
        YOUR FIRST FINDS
      </p>
      <Fan finds={findsFor(data)} />
      <details className={styles.credits}>
        <summary className={styles.creditsSummary}>Photo credits</summary>
        <ul className={styles.creditsList}>
          {PHOTO_CREDITS.map((credit) => (
            <li key={credit}>{credit}</li>
          ))}
        </ul>
      </details>
    </>
  );
}

/** The WELCOME stamp that thumps onto the passport photo, dated when onboarding finished. */
function Stamp({ data }: StepProps) {
  const reduced = useReducedMotion();
  const filterId = `rough-${useId().replace(/:/g, '')}`;
  return (
    <>
      {!reduced && <span data-splash="" className={`${styles.splash} ${motion.splash}`} style={{ animationDelay: '0.65s' }} />}
      <svg className={`${styles.stampSvg} ${motion.aThump}`} style={{ animationDelay: '0.3s' }} width="74" height="74" viewBox="0 0 80 80">
        <defs>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={2} seed={5} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.8} />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`}>
          <circle cx="40" cy="40" r="37" fill="rgba(251,246,238,.82)" stroke="#E4671F" strokeWidth="3" />
          <circle cx="40" cy="40" r="31" fill="none" stroke="#E4671F" strokeWidth="1.2" strokeDasharray="3 2" />
          <path d="M40 16l1.8 3.8 4.1.5-3 2.9.8 4.1-3.7-2-3.7 2 .8-4.1-3-2.9 4.1-.5Z" fill="#E4671F" />
          <text x="40" y="45" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" letterSpacing="1" fill="#E4671F">
            WELCOME
          </text>
          <text x="40" y="57" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" fontWeight="600" letterSpacing=".5" fill="#E4671F">
            {formatStampDate(data.completedAt)}
          </text>
        </g>
      </svg>
    </>
  );
}

/** The two outbound links that replace the flow CTA. */
function Footer() {
  return (
    <div className={`${styles.links} ${motion.aUp}`} style={{ animationDelay: '1.2s' }}>
      <Link to={paths.moments} className={`${styles.see} ${motion.press}`}>
        See passport
      </Link>
      <Link to={paths.today} className={`${styles.go} ${motion.press}`}>
        Start exploring
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

export const step: StepDef = {
  id: 'done',
  shell: 'done',
  Body,
  Stamp,
  Footer,
  answered: () => true,
  blockedToast: '',
};
