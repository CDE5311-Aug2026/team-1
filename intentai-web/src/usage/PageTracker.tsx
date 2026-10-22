import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { tracker as appTracker } from './appTracker';
import { GESTURE_EVENT } from './gesture';
import { pageNameFor } from './names';
import type { Tracker } from './tracker';

const PRESSABLE = 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="link"], summary';
// Labels keep to the characters event names allow (and never start with a symbol).
const LABEL_CHARS = /[^\p{L}\p{N} ›'?&,.-]/gu;

/**
 * What a press is called in the log: the button's accessible name, or for a link the page it opens
 * (never a link's text, which can be something a person wrote). Null when nothing safe is left.
 */
export function tapLabel(el: Element): string | null {
  if (el instanceof HTMLAnchorElement && !el.getAttribute('aria-label')) {
    try {
      const target = pageNameFor(new URL(el.href, window.location.href).pathname);
      return target ? `to ${target}` : null;
    } catch {
      return null;
    }
  }
  const raw = el.getAttribute('aria-label') || el.textContent || '';
  const label = raw.replace(/\s+/g, ' ').replace(LABEL_CHARS, '').replace(/^[^\p{L}\p{N}]+/u, '').trim().slice(0, 36).trim();
  return label || null;
}

/** Times the current page, and counts presses on its buttons and links. Rendered once, beside the routes. */
export default function PageTracker({ t = appTracker }: { t?: Tracker }) {
  const { pathname } = useLocation();
  const name = pageNameFor(pathname);
  // Keyed on the pathname too: question A → question B is a new visit, though only the name is sent.
  useEffect(() => (name === null ? undefined : t.start('page', name)), [name, pathname, t]);

  const page = useRef(name);
  page.current = name;
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(PRESSABLE);
      if (!el || !page.current || el.closest('[data-no-track]')) return;
      const label = tapLabel(el);
      if (label) t.tap(`${page.current} › ${label}`);
    };
    const onGesture = (e: Event) => {
      const raw = (e as CustomEvent<unknown>).detail;
      const label = typeof raw === 'string' ? raw.replace(LABEL_CHARS, '').trim().slice(0, 36) : '';
      if (label && page.current) t.tap(`${page.current} › ${label}`);
    };
    // capture: the press counts on the page it happened on, before a link moves away
    document.addEventListener('click', onClick, true);
    document.addEventListener(GESTURE_EVENT, onGesture);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener(GESTURE_EVENT, onGesture);
    };
  }, [t]);
  return null;
}
