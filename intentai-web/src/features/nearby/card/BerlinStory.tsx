// Berlin Wall Fragments' full story on its v2 place page (boards 08, 12): 9 Nov 2026, "very detailed: video,
// history and an extended explanation", "all in one page", in the current style, The Spread (the nearby lunch) last.
// The content is the 28 Oct canvas's four cards (berlin.ts: titles, numbers, lead and the rest of each text, the
// timeline) with real videos and the longer, sourced explanation (berlinGuide.ts). Parts in the order a visit runs:
// the panels in front of you, why the Wall was there, the night it opened, then lunch.
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { STORY_IMAGES } from '../../../assets/stories';
import { YouTubeClip } from '../../../components/story';
import { FALL_OF_THE_WALL, SPREAD, WALL_HISTORY, WALL_PANELS } from '../../../data/stories/berlin';
import { BERLIN_GUIDE, BERLIN_SOURCES, singaporeWeekday, yearsSinceFall, type BerlinSourceKey, type GuideNote } from '../../../data/stories/berlinGuide';
import { paths } from '../../../routes';
import { curatedPlace } from '../catalogue';
import { directionsUrl } from '../links';
import v2 from './PlaceV2.module.css';
import styles from './BerlinStory.module.css';

export const BERLIN_PLACE_ID = 'curated:sg-berlin-wall-fragments-utown';
const SPREAD_ID = 'curated:sg-the-spread-nus';

/** The place page's key-fact tiles (Berlin has no dataset quick facts): from the Monument card. */
export const BERLIN_TILES = [
  { value: '3.6 m', label: 'tall, each panel' },
  { value: '~4 t', label: 'each' },
  { value: '2016', label: 'unveiled at NUS' },
];

function Tiles({ tiles, label }: { tiles: { value: string; label: string }[]; label: string }) {
  return (
    <div className={`${v2.tiles} ${styles.tiles}`} role="list" aria-label={label}>
      {tiles.map((t) => (
        <div key={t.label} className={v2.tile} role="listitem">
          <span className={v2.tileValue}>{t.value}</span>
          <span className={v2.tileLabel}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function Notes({ notes }: { notes: readonly GuideNote[] }) {
  return (
    <>
      {notes.map((n) => (
        <div key={n.heading} className={styles.note}>
          <h3 className={styles.noteHead}>{n.heading}</h3>
          {n.paragraphs.map((p) => (
            <p key={p.slice(0, 32)} className={v2.storyText}>
              {p}
            </p>
          ))}
        </div>
      ))}
    </>
  );
}

function Sources({ keys, photos }: { keys: readonly BerlinSourceKey[]; photos?: string }) {
  return (
    <p className={styles.sources}>
      Sources:{' '}
      {keys.map((k, i) => {
        const s = BERLIN_SOURCES[k];
        return (
          <span key={k}>
            {i > 0 && '; '}
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.publisher === 'Wikipedia' ? `Wikipedia: ${s.title}` : s.publisher}
              <span className={v2.srOnly}> (opens in a new tab)</span>
            </a>
          </span>
        );
      })}
      {photos && ` · ${photos}`}
    </p>
  );
}

function Part({ id, kicker, title, children, at }: { id: string; kicker: string; title: string; children: ReactNode; at: (el: HTMLElement | null) => void }) {
  return (
    <section ref={at} id={`berlin-${id}`} className={styles.part} aria-labelledby={`berlin-${id}-h`} tabIndex={-1}>
      <p className={styles.kicker}>{kicker}</p>
      <h2 id={`berlin-${id}-h`} className={styles.title}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const order = (date: string) => Number(date.slice(0, 4)) * 100 + Math.max(0, MONTHS.findIndex((m) => date.endsWith(m)));

/** WALL_HISTORY's rows with the guide's, in date order. */
export function historyRows() {
  const own = WALL_HISTORY.timeline.map((r) => ({ date: r.date, text: String(r.text), image: r.image, here: r.dot === 'here' }));
  const more = BERLIN_GUIDE.history.rows.map((r) => ({ date: r.date, text: r.text, image: undefined, here: false }));
  return [...own, ...more].sort((a, b) => order(a.date) - order(b.date));
}

/** "MON 9 NOV": the weekday 9 November falls on this year, in Singapore. */
function fallDay(now: Date) {
  const y = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric' }).format(now));
  return `${new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, 10, 9))).toUpperCase()} 9 NOV`;
}

export function BerlinStory({ now = new Date() }: { now?: Date }) {
  const parts = useRef<Record<string, HTMLElement | null>>({});
  const jump = (id: string) => {
    const el = parts.current[id];
    if (!el) return;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
  };
  const at = (id: string) => (el: HTMLElement | null) => void (parts.current[id] = el);
  const today = singaporeWeekday(now);
  const g = BERLIN_GUIDE;
  const spread = curatedPlace(SPREAD_ID);

  return (
    <div className={styles.story}>
      <nav className={styles.toc} aria-label="On this page">
        <ul className={styles.tocList}>
          {g.parts.map((p) => (
            <li key={p.id}>
              <button type="button" className={styles.chip} onClick={() => jump(p.id)}>
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 1. what you are standing in front of */}
      <Part id="panels" kicker="Monument" title={WALL_PANELS.title.join(' ')} at={at('panels')}>
        <YouTubeClip {...g.panels.video} poster={STORY_IMAGES.wallPanels} />
        <p className={v2.storyText}>{WALL_PANELS.lead}</p>
        {WALL_PANELS.more.map((p) => (
          <p key={p.slice(0, 32)} className={v2.storyText}>
            {p}
          </p>
        ))}
        <Notes notes={g.panels.notes} />
        <Sources keys={g.panels.sources} photos={STORY_IMAGES.wallPanels.credit} />
      </Part>

      {/* 2. why the Wall was there at all */}
      <Part id="history" kicker="History · 1961 to 2016" title={WALL_HISTORY.title.join(' ')} at={at('history')}>
        <YouTubeClip {...g.history.video} poster={STORY_IMAGES.wall1989} />
        <Notes notes={g.history.notes} />
        <ol className={styles.timeline} aria-label="Timeline, 1961 to 2016">
          {historyRows().map((r) => (
            <li key={r.date} className={styles.row} data-here={r.here || undefined}>
              <span className={styles.dot} aria-hidden="true" />
              <p className={styles.date}>{r.date}</p>
              <p className={styles.rowText}>{r.text}</p>
              {r.image && (
                <figure className={styles.rowPic}>
                  <img src={r.image.src} alt={r.image.alt} loading="lazy" decoding="async" />
                  <figcaption>{r.image.credit}</figcaption>
                </figure>
              )}
            </li>
          ))}
        </ol>
        <Sources keys={g.history.sources} />
      </Part>

      {/* 3. the night it opened, and how it is remembered */}
      <Part id="nov9" kicker={`Remembrance · ${fallDay(now)}`} title={FALL_OF_THE_WALL.title.join(' ')} at={at('nov9')}>
        <YouTubeClip {...g.nov9.video} poster={STORY_IMAGES.balloons2014} />
        <Tiles
          label="9 November in numbers"
          tiles={[
            { value: '28', label: 'years the Wall stood' },
            { value: '~20k', label: 'crossed in an hour' },
            { value: String(yearsSinceFall(now)), label: 'years ago' },
          ]}
        />
        <p className={v2.storyText}>{FALL_OF_THE_WALL.lead}</p>
        {FALL_OF_THE_WALL.more.map((p) => (
          <p key={p.slice(0, 32)} className={v2.storyText}>
            {p}
          </p>
        ))}
        <Notes notes={g.nov9.notes} />
        <Sources keys={g.nov9.sources} photos={STORY_IMAGES.balloons2014.credit} />
      </Part>

      {/* 4. after the visit: lunch nearby */}
      <Part id="lunch" kicker={`Lunch nearby · ${SPREAD.route.km} km`} title="The Spread" at={at('lunch')}>
        <p className={v2.storyText}>{SPREAD.lead}</p>
        <article className={styles.card} aria-label="The Spread">
          <ul className={styles.photos} aria-label={SPREAD.carouselLabel}>
            {SPREAD.slides.map((s) => (
              <li key={s.title}>
                <img src={s.image.src} alt={s.image.alt} loading="lazy" decoding="async" />
              </li>
            ))}
          </ul>
          <div className={styles.cardBody}>
            <p className={styles.cardKind}>{SPREAD.subtitle}</p>
            {SPREAD.more.map((p) => (
              <p key={p.slice(0, 32)} className={styles.cardText}>
                {p}
              </p>
            ))}
            <p className={styles.address}>
              {SPREAD.visit.addressLine}, {SPREAD.visit.addressRest}
            </p>
            <table className={styles.hours}>
              <caption className={v2.srOnly}>Opening hours of The Spread</caption>
              <tbody>
                {g.lunch.hours.map((h) => {
                  const isToday = (h.weekdays as readonly number[]).includes(today);
                  return (
                    <tr key={h.days} data-today={isToday || undefined} aria-current={isToday ? 'date' : undefined}>
                      <th scope="row">
                        {h.days}
                        {isToday && <span className={styles.today}> · today</span>}
                      </th>
                      <td>{h.time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className={styles.small}>{g.lunch.hoursNote}</p>
            <div className={styles.cardActions}>
              {spread && (
                <a className={v2.directions} href={directionsUrl(spread)} target="_blank" rel="noopener noreferrer" aria-label="Directions to The Spread (opens Google Maps)">
                  Directions
                </a>
              )}
              <a className={styles.pill} href={SPREAD.visit.phone.href}>
                {SPREAD.visit.phone.text}
              </a>
              {spread && (
                <Link className={styles.pill} to={paths.nearbyPlace(spread.id)}>
                  Place page
                </Link>
              )}
            </div>
          </div>
        </article>
        <Sources keys={g.lunch.sources} photos={STORY_IMAGES.spreadWindow.credit} />
      </Part>
    </div>
  );
}
