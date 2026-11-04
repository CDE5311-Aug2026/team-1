// Nearby → Routes: IntentAI's story walks, the Singapore Culture Atlas's editor routes, then "Make a route from an MRT station" (station,
// time, walking / transit, theme, date). Generate opens the route at a shareable address (/nearby/routes/plan?…).
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { ATLAS_CATEGORIES, ATLAS_CATEGORY_LABEL, LINE_ORDER, atlasRoutes, atlasStations, lineName, stationThemeLang, type AtlasStation } from '../../data/atlas/atlas';
import { BackHeader } from '../../features/nearby/components/NearbyChrome';
import nearby from '../../features/nearby/components/Nearby.module.css';
import { localToday } from '../../features/nearby/personal';
import { teamRoutes } from '../../data/routes/teamRoutes';
import { DEFAULT_HOURS, HOURS, editorRoute, parsePlan, planSearch, type PlanOptions } from '../../features/nearby/routes/model';
import { modeLabel, StopPicture, Txt } from '../../features/nearby/routes/parts';
import styles from '../../features/nearby/routes/Routes.module.css';
import { paths } from '../../routes';

const codeNumber = (s: AtlasStation, line: string) => {
  const prefix = line.slice(0, 2);
  const code = s.codes.find((c) => c.startsWith(prefix)) ?? s.codes[0] ?? '';
  return Number(code.replace(/\D/g, '')) || 0;
};

/** Stations with atlas places, grouped by their first line in the network's order. */
function groupByLine(stations: AtlasStation[]): { line: string; stations: AtlasStation[] }[] {
  const groups = new Map<string, AtlasStation[]>();
  for (const s of stations) {
    const line = s.lines[0] ?? 'Other';
    groups.set(line, [...(groups.get(line) ?? []), s]);
  }
  const rank = (l: string) => (LINE_ORDER.indexOf(l) === -1 ? 99 : LINE_ORDER.indexOf(l));
  return [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([line, list]) => ({ line, stations: list.sort((a, b) => codeNumber(a, line) - codeNumber(b, line) || a.name_en.localeCompare(b.name_en)) }));
}

function matches(s: AtlasStation, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return s.name_en.toLowerCase().includes(needle) || s.name_zh.includes(q.trim()) || s.codes.some((c) => c.toLowerCase() === needle.replace(/\s/g, ''));
}

export default function RoutesPage() {
  const location = useLocation();
  const planRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (location.hash === '#plan') planRef.current?.scrollIntoView?.({ block: 'start' });
  }, [location.hash]);

  return (
    <AppShell background="var(--bg-screen-b)">
      <div className={nearby.screen}>
        <BackHeader title="Routes" fallback={paths.nearby} />
        <p className={styles.subtitle}>Walks and half days from FindSG’s place stories and the team’s Singapore Culture Atlas, starting at an MRT station.</p>

        <section aria-labelledby="story-walks" className={styles.section}>
          <h2 id="story-walks" className={styles.sectionTitle}>
            Story walks
          </h2>
          <ul className={styles.routeList}>
            {teamRoutes.map((r) => (
              <li key={r.id}>
                <RouteCard id={r.id} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="editor-routes" className={styles.section}>
          <h2 id="editor-routes" className={styles.sectionTitle}>
            Editor’s routes
          </h2>
          <ul className={styles.routeList}>
            {atlasRoutes.map((r) => (
              <li key={r.id}>
                <RouteCard id={r.id} />
              </li>
            ))}
          </ul>
        </section>

        <section id="plan" ref={planRef} aria-labelledby="plan-title" className={styles.section}>
          <h2 id="plan-title" className={styles.sectionTitle}>
            Make a route from an MRT station
          </h2>
          <PlanForm />
        </section>
        <p className={styles.note}>Routes suggest an order from straight-line distance, opening days and visit times. They are not road directions.</p>
      </div>
    </AppShell>
  );
}

function RouteCard({ id }: { id: string }) {
  const view = editorRoute(id, localToday());
  if (!view) return null;
  const titleId = `route-${id}`;
  return (
    <article className={styles.routeCard} aria-labelledby={titleId}>
      <div className={styles.routeText}>
        <h3 id={titleId} className={styles.routeTitle}>
          <Link className={styles.cardLink} to={paths.route(id)}>
            <Txt t={view.title} />
          </Link>
        </h3>
        <p className={styles.routeSub}>
          <Txt t={view.subtitle} />
        </p>
        <p className={styles.meta}>
          {view.station?.name_en ?? ''} {view.station?.kind ?? 'MRT'} · <Txt t={view.duration} /> · {modeLabel(view.mode)} · {view.stops.length} stops
        </p>
        <span className={styles.pics} aria-hidden="true">
          {view.stops.slice(0, 4).map((s) => (
            <StopPicture key={s.id} stop={s} size="small" />
          ))}
        </span>
      </div>
    </article>
  );
}

function PlanForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = localToday();
  const initial: PlanOptions = parsePlan(params, today) ?? { station: '', hours: DEFAULT_HOURS, mode: 'walking', theme: 'any', date: today, booking: false };
  const [o, setO] = useState<PlanOptions>(initial);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const uid = useId();
  const set = (patch: Partial<PlanOptions>) => setO((prev) => ({ ...prev, ...patch }));

  const shown = useMemo(() => atlasStations.filter((s) => matches(s, query)), [query]);
  const groups = useMemo(() => groupByLine(shown), [shown]);
  const chosen = atlasStations.find((s) => s.id === o.station);

  const onQuery = (q: string) => {
    setQuery(q);
    const next = atlasStations.filter((s) => matches(s, q));
    // the select shows only matches: pick the first one when the chosen station is filtered out
    if (q.trim() && next.length && !next.some((s) => s.id === o.station)) set({ station: next[0].id });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!o.station) {
      setError(true);
      selectRef.current?.focus();
      return;
    }
    navigate(paths.routePlan(planSearch(o)));
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor={`${uid}-q`}>
          Find a station
        </label>
        <input
          id={`${uid}-q`}
          className={nearby.searchInput}
          type="search"
          maxLength={40}
          placeholder="e.g. Bugis or EW12"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-describedby={`${uid}-count`}
        />
        <p id={`${uid}-count`} className={styles.note} aria-live="polite">
          {query.trim() ? (shown.length ? `${shown.length} ${shown.length === 1 ? 'station matches' : 'stations match'}` : 'No station matches') : `${atlasStations.length} stations with places`}
        </p>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor={`${uid}-station`}>
          Station
        </label>
        <select
          id={`${uid}-station`}
          ref={selectRef}
          className={styles.control}
          value={o.station}
          onChange={(e) => {
            set({ station: e.target.value });
            setError(false);
          }}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${uid}-err` : chosen ? `${uid}-theme` : undefined}
        >
          {!query.trim() && <option value="">Choose a station</option>}
          {groups.map((g) => (
            <optgroup key={g.line} label={lineName(g.line)}>
              {g.stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_en} · {s.codes.join(' / ')} · {s.place_ids.length} {s.place_ids.length === 1 ? 'place' : 'places'}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {error && (
          <p id={`${uid}-err`} className={styles.error} role="alert">
            Choose a station first.
          </p>
        )}
        {chosen && (
          <p id={`${uid}-theme`} className={styles.note}>
            {chosen.name_en}: <Txt t={stationThemeLang(chosen.id)} />
          </p>
        )}
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-hours`}>
            Time
          </label>
          <select id={`${uid}-hours`} className={styles.control} value={o.hours} onChange={(e) => set({ hours: Number(e.target.value) })}>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? 'hour' : 'hours'}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-date`}>
            Date
          </label>
          <input id={`${uid}-date`} className={styles.control} type="date" min={today} value={o.date} onChange={(e) => set({ date: e.target.value || today })} />
        </div>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldLabel}>Getting around</legend>
        <div className={nearby.segmented}>
          {(['walking', 'transit'] as const).map((m) => (
            <button key={m} type="button" className={`${nearby.segment} ${styles.tall}`} aria-pressed={o.mode === m} onClick={() => set({ mode: m })}>
              {modeLabel(m)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldLabel}>Theme</legend>
        <ul className={nearby.chips}>
          {(['any', ...ATLAS_CATEGORIES] as const).map((t) => (
            <li key={t}>
              <button type="button" className={`${nearby.filterChip} ${styles.tall}`} aria-pressed={o.theme === t} onClick={() => set({ theme: t })}>
                {t === 'any' ? 'Any' : ATLAS_CATEGORY_LABEL[t]}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <label className={styles.check}>
        <input type="checkbox" checked={o.booking} onChange={(e) => set({ booking: e.target.checked })} />
        <span>I will book ahead (include places that need booking)</span>
      </label>

      <button type="submit" className={`${nearby.primary} ${styles.submit}`}>
        Make my route
      </button>
    </form>
  );
}
