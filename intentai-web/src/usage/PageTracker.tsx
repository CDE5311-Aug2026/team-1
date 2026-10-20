import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { tracker as appTracker } from './appTracker';
import { pageNameFor } from './names';
import type { Tracker } from './tracker';

/** Times the current page. Rendered once, beside the routes. */
export default function PageTracker({ t = appTracker }: { t?: Tracker }) {
  const { pathname } = useLocation();
  const name = pageNameFor(pathname);
  // Keyed on the pathname too: question A → question B is a new visit, though only the name is sent.
  useEffect(() => (name === null ? undefined : t.start('page', name)), [name, pathname, t]);
  return null;
}
