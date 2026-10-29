// "In Nearby" and "3D" under a place-story card's title (owner request 2026-10-29): every story card opens its
// place on the Nearby map, or in the EARTH ONLINE 3D view. Each link names the Nearby place it opens; Chinatown's
// history card opens the Chinatown area, as its story covers the whole district. "Route" opens the story walk
// that stops at the card's place (Chinatown's food card: the food walk that ends at Lim Chee Guan).
import { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../routes';
import type { Facet } from '../../data/placeStories';
import { teamRoute } from '../../data/routes/teamRoutes';
import styles from './StoryNearby.module.css';

export const StoryPlaceContext = createContext<{ placeId: string; facet: Facet } | null>(null);

type Target = { sel: string; label: string } | { area: string; label: string };

const TARGETS: Record<string, Partial<Record<Facet, Target>> & { default: Target }> = {
  chinatown: {
    default: { area: 'sg-chinatown', label: 'Chinatown' },
    food: { sel: 'curated:sg-lim-chee-guan-new-bridge-road', label: 'Lim Chee Guan' },
    monument: { sel: 'curated:sg-thian-hock-keng-temple', label: 'Thian Hock Keng' },
    festival: { sel: 'curated:sg-pagoda-street-trengganu-street', label: 'Pagoda Street' },
  },
  'berlin-wall-fragments': {
    default: { sel: 'curated:sg-berlin-wall-fragments-utown', label: 'Berlin Wall' },
    food: { sel: 'curated:sg-the-spread-nus', label: 'The Spread' },
  },
};

const ROUTES: Record<string, Partial<Record<Facet, string>> & { default: string }> = {
  chinatown: { default: 'chinatown-story-walk', food: 'chinatown-food-walk' },
  'berlin-wall-fragments': { default: 'kent-ridge-wall-walk' },
};

export function storyRoute(placeId: string, facet: Facet) {
  const r = ROUTES[placeId];
  return r ? teamRoute(r[facet] ?? r.default) : undefined;
}

export function storyNearbyTarget(placeId: string, facet: Facet): Target | undefined {
  const t = TARGETS[placeId];
  return t ? (t[facet] ?? t.default) : undefined;
}

function href(t: Target, view?: '3d'): string {
  const q = new URLSearchParams();
  if ('sel' in t) {
    q.set('sel', t.sel);
    if (!view) q.set('info', '1');
  } else q.set('area', t.area);
  if (view) q.set('view', view);
  return `${paths.nearby}?${q.toString()}`;
}

export function StoryNearby() {
  const ctx = useContext(StoryPlaceContext);
  const target = ctx && storyNearbyTarget(ctx.placeId, ctx.facet);
  if (!target) return null;
  const route = storyRoute(ctx.placeId, ctx.facet);
  return (
    <nav className={`a-up ${styles.row}`} style={{ animationDelay: '.25s' }} aria-label="See this place">
      <Link to={href(target)} className={styles.link}>
        <PinIcon />
        {target.label} in Nearby
      </Link>
      <Link to={href(target, '3d')} className={styles.link} aria-label={`${target.label} in 3D`}>
        <CubeIcon />
        3D
      </Link>
      {route && (
        <Link to={paths.route(route.id)} className={styles.link} aria-label={`Route: ${route.title}`}>
          <RouteIcon />
          Route
        </Link>
      )}
    </nav>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="5" r="2.2" />
      <path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" />
    </svg>
  );
}
