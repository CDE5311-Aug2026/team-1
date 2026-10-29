// Route engine of the Singapore Culture Atlas, ported from the atlas's route-engine.js with its rules unchanged:
// closures on the planned date (recorded closed, announced closing / temporary closure periods, weekly rest days),
// collection-only places, ferry / car trips, booking, walking-only legs ≤ 3.5 km, category variety, a time budget
// in minutes and a stop cap. The order is a suggestion from straight-line proximity, not road routing.

export interface EnginePlace {
  id: string;
  name_en: string;
  category: string;
  lat: number | null;
  lng: number | null;
  status?: string;
  closes_on?: string | null;
  reopens_on?: string | null;
  closures?: { from: string; to?: string | null; note?: string | null }[] | null;
  closed_weekdays?: number[] | null;
  route_eligible?: boolean;
  transport_required?: string | null;
  requires_booking?: boolean;
  visit_minutes?: number | null;
  coordinates_quality?: string;
  address?: string | null;
  maps_url?: string | null;
}

export interface EngineStation {
  name_en: string;
  kind?: string;
  place_ids: string[];
  lat?: number | null;
  lng?: number | null;
}

export type RouteMode = 'walking' | 'transit';

export interface GenerateOptions {
  /** One atlas category, or undefined for any. */
  theme?: string;
  /** YYYY-MM-DD */
  date: string;
  mode: RouteMode;
  /** Time budget in minutes (visits + moving between stops). */
  budget: number;
  /** Most stops. */
  max: number;
  /** The visitor will book ahead: places that need booking may be included. */
  booking?: boolean;
}

export type ExclusionCode =
  | 'closed'
  | 'closing_period'
  | 'temporary_closure'
  | 'weekly_closure'
  | 'not_route_eligible'
  | 'ferry'
  | 'taxi'
  | 'booking'
  | 'transport'
  | 'no_coordinates';

export interface Exclusion {
  code: ExclusionCode;
  reason: string;
}

/** Longest walking leg between stops (km). */
export const WALKING_LEG_MAX_KM = 3.5;
/** Visit length when the atlas gives none. */
export const DEFAULT_VISIT_MINUTES = 45;

interface Point {
  lat?: number | null;
  lng?: number | null;
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Great-circle distance in km, or null when either point has no coordinates. */
export function distance(a: Point | null | undefined, b: Point | null | undefined): number | null {
  if (!a || !b || !finite(a.lat) || !finite(a.lng) || !finite(b.lat) || !finite(b.lng)) return null;
  const rad = Math.PI / 180;
  const dlat = (b.lat - a.lat) * rad;
  const dlng = (b.lng - a.lng) * rad;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const ex = (code: ExclusionCode, reason: string): Exclusion => ({ code, reason });

/** Why the place is closed on `date` (YYYY-MM-DD), or null. */
export function closure(p: EnginePlace, date: string): Exclusion | null {
  if (p.status === 'closed') return ex('closed', 'Recorded as closed; check separately whether it has reopened');
  if (p.closes_on && date >= p.closes_on && (!p.reopens_on || date < p.reopens_on))
    return ex('closing_period', `Closed for an announced period from ${p.closes_on}${p.reopens_on ? ` until ${p.reopens_on}` : ''}`);
  const c = (p.closures ?? []).find((x) => date >= x.from && (!x.to || date <= x.to));
  if (c) return ex('temporary_closure', `Announced temporary closure${c.to ? ` from ${c.from} to ${c.to}` : ` from ${c.from}`}`);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if ((p.closed_weekdays ?? []).includes(weekday))
    return ex('weekly_closure', 'Regular closing day on this date (check public-holiday exceptions)');
  return null;
}

/** Why the place cannot be in an automatic route with these options, or null. */
export function eligibility(p: EnginePlace, opt: Pick<GenerateOptions, 'date' | 'mode' | 'booking'>): Exclusion | null {
  const closed = closure(p, opt.date);
  if (closed) return closed;
  if (p.route_eligible === false) return ex('not_route_eligible', 'Kept for the collection only; not used in automatic routes');
  if (p.transport_required === 'ferry') return ex('ferry', 'Needs a ferry; better as a separate island trip');
  if (p.transport_required === 'taxi') return ex('taxi', 'Needs a car; not in walking or public-transport routes');
  if (p.requires_booking && !opt.booking) return ex('booking', 'Needs booking ahead');
  if (opt.mode === 'walking' && p.transport_required) return ex('transport', 'Needs a bus or other transport to reach');
  if (!finite(p.lat) || !finite(p.lng)) return ex('no_coordinates', 'No coordinates yet; add it by its address yourself');
  return null;
}

export interface RouteStats {
  visitMinutes: number;
  km: number;
  knownLegs: number;
  totalLegs: number;
  /** Some stop's position is only approximate. */
  approximate: boolean;
}

export const visitMinutes = (p: Pick<EnginePlace, 'visit_minutes'>): number => Number(p.visit_minutes) || DEFAULT_VISIT_MINUTES;

export function stats(places: EnginePlace[]): RouteStats {
  let km = 0;
  let knownLegs = 0;
  for (let i = 1; i < places.length; i++) {
    const d = distance(places[i - 1], places[i]);
    if (d !== null) {
      km += d;
      knownLegs++;
    }
  }
  return {
    visitMinutes: places.reduce((s, p) => s + visitMinutes(p), 0),
    km,
    knownLegs,
    totalLegs: Math.max(places.length - 1, 0),
    approximate: places.some((p) => p.coordinates_quality === 'approximate'),
  };
}

export interface GenerateResult {
  /** Stops in order. */
  ids: string[];
  /** Places of the station (in the theme) that cannot be used, with the reason. */
  excluded: ({ id: string } & Exclusion)[];
  /** Usable places that did not fit the budget, the stop cap or the walking leg limit. */
  notChosen: string[];
  /** Usable places before choosing. */
  initialCount: number;
  estimatedMinutes: number;
  stats: RouteStats;
}

export function generate(places: EnginePlace[], station: EngineStation | null | undefined, opt: GenerateOptions): GenerateResult {
  const associated = new Set(station ? station.place_ids : []);
  const excluded: GenerateResult['excluded'] = [];
  let pool = places.filter((p) => associated.has(p.id) && (!opt.theme || p.category === opt.theme));
  pool = pool.filter((p) => {
    const reason = eligibility(p, opt);
    if (reason) excluded.push({ id: p.id, ...reason });
    return !reason;
  });
  const chosen: EnginePlace[] = [];
  let remaining = Number(opt.budget);
  const initialCount = pool.length;
  let position: Point | null = station && finite(station.lat) ? station : null;
  while (pool.length && chosen.length < Number(opt.max)) {
    const used = new Set(chosen.map((x) => x.category));
    const options = pool
      .map((p) => {
        const km = distance(position, p);
        const transfer = chosen.length
          ? opt.mode === 'walking'
            ? Math.max(7, (km ?? 0) * 20)
            : 20
          : position
            ? Math.max(5, (km ?? 0) * 20)
            : 0;
        const visit = visitMinutes(p);
        let score =
          (km === null ? 0 : km) * 4 +
          (used.has(p.category) ? 5 : 0) +
          (p.category === 'food' && used.has('food') ? 12 : 0) +
          (p.status === 'check_before_visit' ? 1 : 0);
        if (!chosen.length && !opt.theme && p.category === 'culture') score -= 1;
        return { p, km, transfer, visit, score };
      })
      .filter((x) => x.visit + x.transfer <= remaining && (opt.mode !== 'walking' || x.km === null || x.km <= WALKING_LEG_MAX_KM))
      .sort((a, b) => a.score - b.score || a.visit - b.visit || a.p.id.localeCompare(b.p.id));
    if (!options.length) break;
    const pick = options[0];
    chosen.push(pick.p);
    remaining -= pick.visit + pick.transfer;
    position = pick.p;
    pool = pool.filter((p) => p.id !== pick.p.id);
  }
  return {
    ids: chosen.map((p) => p.id),
    excluded,
    notChosen: pool.map((p) => p.id),
    initialCount,
    estimatedMinutes: Math.round(Number(opt.budget) - remaining),
    stats: stats(chosen),
  };
}

export interface MapsLink {
  label: string;
  url: string;
}

/** Google Maps directions (plain links, no API key): walking in parts of up to four stops, transit leg by leg. */
export function mapsLinks(places: EnginePlace[], station: EngineStation | null | undefined, mode: RouteMode): MapsLink[] {
  if (!places.length) return [];
  const dest = (p: EnginePlace) => `${p.name_en}, ${p.address || 'Singapore'}`;
  let origin = station ? `${station.name_en} ${station.kind === 'LRT' ? 'LRT' : 'MRT'} Station, Singapore` : dest(places[0]);
  let remaining = station ? places : places.slice(1);
  if (!remaining.length)
    return [
      {
        label: 'Open the place in Google Maps',
        url: places[0].maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest(places[0]))}`,
      },
    ];
  const links: MapsLink[] = [];
  if (mode === 'transit') {
    remaining.forEach((p, i) => {
      const q = new URLSearchParams({ api: '1', origin, destination: dest(p), travelmode: 'transit' });
      links.push({ label: `Transit directions, leg ${i + 1} → ${p.name_en}`, url: `https://www.google.com/maps/dir/?${q}` });
      origin = dest(p);
    });
  } else {
    const parts = Math.ceil(remaining.length / 4);
    while (remaining.length) {
      const part = remaining.slice(0, 4);
      remaining = remaining.slice(4);
      const q = new URLSearchParams({ api: '1', origin, destination: dest(part[part.length - 1]), travelmode: 'walking' });
      if (part.length > 1) q.set('waypoints', part.slice(0, -1).map(dest).join('|'));
      links.push({
        label: `Open walking directions in Google Maps${parts > 1 ? ` · part ${links.length + 1}` : ''}`,
        url: `https://www.google.com/maps/dir/?${q}`,
      });
      origin = dest(part[part.length - 1]);
    }
  }
  return links;
}
