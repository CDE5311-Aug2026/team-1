// One route (a team route, an editor's route or one generated from a station): map with numbered stops joined in
// order, stats, the route note, Google Maps directions, then the stops in order with check-in for those in the Nearby
// catalogue. A team route also lists the pages behind its note and links back to its place story.
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppShell from '../../../components/AppShell/AppShell';
import { ATLAS_CATEGORY_LABEL, type AtlasPlace } from '../../../data/atlas/atlas';
import { storyPlace } from '../../../data/stories/places';
import { paths } from '../../../routes';
import { markVisited, useExplorePersonal } from '../actions';
import { BackHeader, StorageWarning } from '../components/NearbyChrome';
import { Icon } from '../components/icons';
import ShareButton from '../components/ShareButton';
import nearby from '../components/Nearby.module.css';
import CityMap from '../map/CityMap';
import { stateOf } from '../personal';
import { appUrl } from '../share';
import type { LatLng } from '../types';
import { distance } from './engine';
import { firstSentence, planSearch, type RouteStop, type RouteView } from './model';
import { modeLabel, StopPicture, Txt } from './parts';
import StopSheet from './StopSheet';
import styles from './Routes.module.css';

function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 10) * 100} m` : `${km.toFixed(1)} km`;
}

/** Fit the stops (closer than the map's usual fit: stops on one street are a few hundred metres apart). */
function routeFocus(points: LatLng[]) {
  const lat = (Math.min(...points.map((p) => p.lat)) + Math.max(...points.map((p) => p.lat))) / 2;
  const lng = (Math.min(...points.map((p) => p.lng)) + Math.max(...points.map((p) => p.lng))) / 2;
  const center = { lat, lng };
  const far = Math.max(0, ...points.map((p) => distance(center, p) ?? 0));
  return { id: 1, center, radiusM: Math.max(250, far * 1000 + 120) };
}

export default function RouteDetail({ view }: { view: RouteView }) {
  const personal = useExplorePersonal();
  const location = useLocation();
  const [open, setOpen] = useState<number | null>(null);
  const { stops, stats } = view;

  const checkable = stops.filter((s) => s.curated);
  const visited = (s: RouteStop) => !!(s.curated && stateOf(personal, s.key)?.visited);
  const done = checkable.filter(visited).length;
  const complete = checkable.length > 0 && done === checkable.length;
  const percent = checkable.length ? Math.floor((done / checkable.length) * 100) : 0;

  const located = stops.map((s, i) => ({ s, i })).filter((x): x is { s: RouteStop & { location: LatLng }; i: number } => !!x.s.location);
  const station = view.station;

  return (
    <AppShell background="var(--bg-screen-b)">
      <div className={nearby.screen}>
        <BackHeader
          title={view.title.text}
          titleLang={view.title.lang === 'zh-Hans' ? 'zh-Hans' : undefined}
          fallback={paths.routes}
          action={
            <ShareButton
              className={nearby.headerButton}
              label="Share this route"
              content={() => ({
                title: view.title.text,
                text: `${view.title.text}: a route in IntentAI Nearby (${stops.length} ${stops.length === 1 ? 'stop' : 'stops'})`,
                url: appUrl(location.pathname + location.search),
              })}
            />
          }
        />
        <StorageWarning />
        {view.subtitle?.text && (
          <p className={styles.subtitle}>
            <Txt t={view.subtitle} />
          </p>
        )}
        <p className={styles.meta}>
          {station && (
            <>
              From {station.name_en} {station.kind} ({station.codes.join(' / ')}) ·{' '}
            </>
          )}
          {view.duration?.text && (
            <>
              <Txt t={view.duration} /> ·{' '}
            </>
          )}
          {modeLabel(view.mode)}
        </p>

        {stops.length === 0 ? (
          <p className={nearby.empty}>
            No stop fits these options. Try more time, “Walking + transit”, another theme or another date.
          </p>
        ) : (
          <>
            {located.length > 0 && (
              <figure className={styles.mapFigure}>
                <CityMap
                  label={`Map of the route: ${stops.length} stops in order`}
                  height={280}
                  pins={located.map(({ s, i }) => ({
                    key: s.id,
                    name: `Stop ${i + 1}: ${s.name}`,
                    location: s.location,
                    category: s.pinCategory,
                    visited: visited(s),
                    label: String(i + 1),
                  }))}
                  path={located.map(({ s }) => s.location)}
                  clusterPins={false}
                  onSelect={(key) => {
                    const i = stops.findIndex((s) => s.id === key);
                    document.getElementById(`stop-${i + 1}`)?.focus();
                  }}
                  focus={routeFocus(located.map(({ s }) => s.location))}
                />
                <figcaption className={styles.note}>Dashed line: the suggested order, not road routing. Google Maps gives the actual way.</figcaption>
              </figure>
            )}

            <div className={styles.stats}>
              <p className={styles.stat}>
                <strong>{stops.length}</strong> {stops.length === 1 ? 'stop' : 'stops'}
              </p>
              <p className={styles.stat}>
                {stops.some((s) => s.visitEstimate) && '≈ '}
                <strong>{stats.visitMinutes}</strong> min of visits
              </p>
              {stats.knownLegs > 0 && (
                <p className={styles.stat}>
                  ≈ <strong>{formatKm(stats.km)}</strong> between stops
                </p>
              )}
            </div>
            {view.estimatedMinutes !== undefined && view.options && (
              <p className={styles.note}>
                About {view.estimatedMinutes} min with getting between stops, within your {view.options.hours} h.
              </p>
            )}
            {(stats.approximate || stops.some((s) => s.approximate)) && <p className={styles.note}>Some positions are approximate.</p>}

            {checkable.length > 0 ? (
              <div className={styles.progress}>
                <p className={nearby.body}>
                  <strong>
                    {done} of {checkable.length} checked in
                  </strong>
                </p>
                <div className={nearby.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Route progress">
                  <div className={nearby.progressFill} style={{ width: `${percent}%` }} />
                </div>
                {complete && (
                  <p className={nearby.milestone} role="status">
                    Route complete. Every stop checked in!
                  </p>
                )}
                {checkable.length < stops.length && (
                  <p className={styles.note}>
                    {stops.length - checkable.length} of the stops can be checked in once they join Nearby’s places.
                  </p>
                )}
              </div>
            ) : (
              <p className={styles.note}>Check-in opens for these stops once they join Nearby’s places.</p>
            )}

            {view.note?.text && (
              <p className={nearby.status}>
                <Txt t={view.note} />
              </p>
            )}

            {view.links.length > 0 && (
              <ul className={styles.links} aria-label="Directions">
                {view.links.map((l, i) => (
                  <li key={l.url}>
                    <a className={i === 0 ? styles.primaryLink : styles.secondaryLink} href={l.url} target="_blank" rel="noopener noreferrer">
                      <Icon name="map" size={18} />
                      {l.label}
                      <span className={styles.srOnly}> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <h2 className={styles.sectionTitle}>Stops in order</h2>
            <ol className={styles.stops}>
              {stops.map((s, i) => (
                <StopRow key={s.id} stop={s} number={i + 1} visited={visited(s)} onOpen={() => setOpen(i)} />
              ))}
            </ol>
          </>
        )}

        {view.kind === 'generated' && view.excluded.length > 0 && (
          <details className={styles.fold}>
            <summary className={styles.foldSummary}>
              {view.excluded.length} {view.excluded.length === 1 ? 'place' : 'places'} near {station?.name_en} left out
            </summary>
            <ul className={styles.excluded}>
              {view.excluded.map((e) => (
                <li key={e.id}>
                  <strong>{e.name}</strong>: {e.reason}
                </li>
              ))}
            </ul>
          </details>
        )}
        {view.kind === 'generated' && view.options && (
          <Link className={styles.secondaryLink} to={`${paths.routes}?${planSearch(view.options)}#plan`}>
            Change options
          </Link>
        )}
        {view.kind === 'team' ? <TeamFooter view={view} /> : (
          <p className={styles.note}>
            From the Singapore Culture Atlas research snapshot (29 Oct 2026). Opening hours, bookings, works and ferries change: check on the day.
          </p>
        )}
      </div>
      {open !== null && hasAtlas(stops[open]) && <StopSheet stop={stops[open]} number={open + 1} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}

const hasAtlas = (s: RouteStop | undefined): s is RouteStop & { atlas: AtlasPlace } => !!s?.atlas;

/** A team route's sources, the link back to its place story, and the visit-time estimate note. */
function TeamFooter({ view }: { view: RouteView }) {
  const story = view.story ? storyPlace(view.story) : undefined;
  return (
    <>
      {story && (
        <Link className={styles.secondaryLink} to={paths.place(story.id)}>
          Read the {story.name} story
        </Link>
      )}
      {view.sources && view.sources.length > 0 && (
        <details className={styles.fold}>
          <summary className={styles.foldSummary}>Sources for the times and days</summary>
          <ul className={styles.excluded}>
            {view.sources.map((s) => (
              <li key={s.url}>
                <a className={nearby.textLink} href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                  <span className={styles.srOnly}> (opens in a new tab)</span>
                </a>
                , {s.publisher} (checked {s.checkedAt})
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className={styles.note}>
        An IntentAI route. Each stop’s facts and hours come with their sources on its place page. Times marked ≈ are our estimate. Opening hours change: check on the day.
      </p>
    </>
  );
}

function StopRow({ stop, number, visited, onOpen }: { stop: RouteStop; number: number; visited: boolean; onOpen: () => void }) {
  const { summary, hours } = stop;
  const nameId = `stop-${number}`;
  return (
    <li className={styles.stop}>
      <span className={styles.number} aria-hidden="true">
        {number}
      </span>
      <div className={styles.stopMain}>
        <div className={styles.stopHead}>
          <span className={styles.picWrap}>
            <StopPicture stop={stop} />
            {visited && (
              <span className={styles.tick} aria-hidden="true">
                ✓
              </span>
            )}
          </span>
          <div className={styles.stopText}>
            <h3 className={styles.stopName}>
              <span className={styles.srOnly}>Stop {number}: </span>
              {stop.curated ? (
                <Link id={nameId} className={styles.stopLink} to={paths.nearbyPlace(stop.key)}>
                  {stop.name}
                </Link>
              ) : (
                <button id={nameId} type="button" className={styles.stopLink} onClick={onOpen} aria-haspopup="dialog">
                  {stop.name}
                </button>
              )}
            </h3>
            <p className={styles.meta}>
              {ATLAS_CATEGORY_LABEL[stop.category]}
              {stop.area?.text && (
                <>
                  {' · '}
                  <Txt t={stop.area} />
                </>
              )}
              {' · '}
              {stop.visitEstimate ? (
                <>
                  ≈ {stop.visitMinutes} min<span className={styles.srOnly}> (estimate)</span>
                </>
              ) : (
                <>{stop.visitMinutes} min</>
              )}
              {visited && <span className={styles.srOnly}>, checked in</span>}
            </p>
          </div>
        </div>
        {hours && (
          <p className={styles.hours}>
            <Icon name="clock" size={16} />
            <Txt t={hours} />
          </p>
        )}
        {summary && (
          <p className={styles.summary}>
            <Txt t={{ ...summary, text: firstSentence(summary.text) }} />
          </p>
        )}
        {stop.warnings.length > 0 && (
          <ul className={styles.warnings} aria-label={`Before you go to ${stop.name}`}>
            {stop.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        <div className={styles.stopActions}>
          {stop.curated ? (
            <>
              <button
                type="button"
                className={visited ? `${styles.checkIn} ${styles.checkedIn}` : styles.checkIn}
                aria-pressed={visited}
                aria-label={`${visited ? 'Checked in' : 'Check in'}: ${stop.name}`}
                onClick={() => markVisited(stop.key, stop.name, !visited)}
              >
                <Icon name="check" size={18} />
                {visited ? 'Checked in' : 'Check in'}
              </button>
              {stop.atlas && (
                <button type="button" className={styles.textButton} onClick={onOpen} aria-haspopup="dialog">
                  Atlas notes
                </button>
              )}
            </>
          ) : (
            <button type="button" className={styles.textButton} onClick={onOpen} aria-haspopup="dialog">
              Details
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
