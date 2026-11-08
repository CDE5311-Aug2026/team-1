// v2 board 07: Search. One field (focused on arrival) with Clear and Cancel, the category chips with result counts,
// and results grouped under category headers: places, Hunt challenges and story volumes (src/data/search). With no
// query: recent searches (this phone only) and Browse by category. The query sits in ?q= and the category in ?cat=,
// so Back from a result comes back to the same list.
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import CategoryChips, { useCategoryParam } from '../../components/Category/CategoryChips';
import CategoryGlyph from '../../components/Category/CategoryGlyph';
import { usePersistentStore } from '../../data/persistentStore';
import { profileV3Store, tourismOrder } from '../../data/profile/profile';
import { allEntries, countByCategory, groupByCategory, KIND_LABEL, searchAll, type SearchEntry } from '../../data/search';
import { TOURISM_INFO, type TourismCategory } from '../../data/tourism';
import { rememberSearch, searchRecentStore } from '../../data/v2Stores';
import { fixInSingapore } from '../../features/nearby/components/LocationFlow';
import { catStyle, placePhoto } from '../../features/nearby/card/PlaceV2';
import { distanceLabel } from '../../features/nearby/card/PlaceV2Proximity';
import { useLocationState, type LocationState } from '../../features/nearby/location';
import { paths } from '../../routes';
import styles from './SearchPage.module.css';

/** Rows shown per category before "Show all". */
export const GROUP_PREVIEW = 8;

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const SEARCH = 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16.5 16.5 21 21';
const CLEAR = 'M6 6l12 12M18 6 6 18';
const CHEVRON = 'm9 6 6 6-6 6';
const CLOCK = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2';
const UP_RIGHT = 'M7 17 17 7M8 7h9v9';

function Row({ entry, location, inSg, onOpen }: { entry: SearchEntry; location: LocationState; inSg: boolean; onOpen: () => void }) {
  const info = TOURISM_INFO[entry.category];
  const photo = entry.place ? placePhoto(entry.place) : null;
  const distance = entry.place ? distanceLabel(entry.place, location, inSg) : null;
  return (
    <li>
      <Link className={styles.row} to={entry.href} onClick={onOpen} style={catStyle(entry.category)}>
        <span className={styles.thumb}>
          {photo ? <img src={photo.src} alt="" loading="lazy" decoding="async" /> : <CategoryGlyph category={entry.category} size={26} className={styles.thumbGlyph} />}
          <span className={styles.edge} aria-hidden="true" />
        </span>
        <span className={styles.rowText}>
          <span className={styles.kicker}>
            {info.label} · {KIND_LABEL[entry.kind]}
          </span>
          <span className={styles.name}>{entry.title}</span>
          <span className={styles.line}>{entry.line}</span>
        </span>
        {distance && <span className={styles.dist}>{distance.replace(/^Approx\. /, '')}</span>}
        <span className={styles.chev}>
          <Icon d={CHEVRON} size={16} />
        </span>
      </Link>
    </li>
  );
}

function Group({ category, entries, onOpen, location, inSg }: { category: TourismCategory; entries: SearchEntry[]; onOpen: () => void; location: LocationState; inSg: boolean }) {
  const [all, setAll] = useState(false);
  const info = TOURISM_INFO[category];
  const shown = all ? entries : entries.slice(0, GROUP_PREVIEW);
  const id = `search-group-${category}`;
  return (
    <section className={styles.group} aria-labelledby={id} style={catStyle(category)}>
      <h3 id={id} className={styles.groupHead}>
        <span className={styles.groupDot} aria-hidden="true">
          <CategoryGlyph category={category} size={11} />
        </span>
        <span>{info.label}</span>
        <span className={styles.groupCount}>{entries.length}</span>
      </h3>
      <ul className={styles.rows}>
        {shown.map((e) => (
          <Row key={e.key} entry={e} location={location} inSg={inSg} onOpen={onOpen} />
        ))}
      </ul>
      {entries.length > shown.length && (
        <button type="button" className={styles.more} onClick={() => setAll(true)}>
          Show all {entries.length} in {info.label}
        </button>
      )}
    </section>
  );
}

/** "342 places · 2 challenges · 6 volumes" */
function browseLine(entries: readonly SearchEntry[]): string {
  const n = (kind: SearchEntry['kind']) => entries.filter((e) => e.kind === kind).length;
  const part = (count: number, one: string) => (count ? `${count} ${one}${count === 1 ? '' : 's'}` : null);
  return [part(n('place'), 'place'), part(n('challenge'), 'challenge'), part(n('volume'), 'volume')].filter(Boolean).join(' · ');
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [cat, setCat] = useCategoryParam();
  const [recent, setRecent] = usePersistentStore(searchRecentStore);
  const [profile] = usePersistentStore(profileV3Store);
  const location = useLocationState();
  const inSg = fixInSingapore(location);
  const input = useRef<HTMLInputElement>(null);
  const q = params.get('q') ?? '';
  const order = tourismOrder(profile);

  const setQ = (next: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next) p.set('q', next);
        else p.delete('q');
        return p;
      },
      { replace: true },
    );

  const everything = useMemo(() => allEntries(), []);
  const hits = useMemo(() => searchAll(q), [q]);
  const hasQ = q.trim().length > 0;
  const pool = hasQ ? hits : everything;
  const counts = countByCategory(pool);
  const filtered = cat === 'all' ? pool : pool.filter((e) => e.category === cat);
  const groups = groupByCategory(filtered, order);
  const browsing = !hasQ && cat !== 'all';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    rememberSearch(q);
    input.current?.blur();
  };
  const remember = () => rememberSearch(q);
  const cancel = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(paths.today);
  };

  return (
    <AppShell background="var(--bg-app)">
      <div className={styles.screen}>
        <h1 className={styles.srOnly}>Search</h1>
        <div className={styles.bar}>
          <form className={styles.field} role="search" onSubmit={submit}>
            <Icon d={SEARCH} />
            <label className={styles.srOnly} htmlFor="search-q">
              Search places, challenges and volumes
            </label>
            <input
              ref={input}
              id="search-q"
              className={styles.input}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              // the screen exists to type into: focus on arrival (board 07)
              autoFocus
              placeholder="Places, challenges, volumes"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button
                type="button"
                className={styles.clear}
                aria-label="Clear search"
                onClick={() => {
                  setQ('');
                  input.current?.focus();
                }}
              >
                <Icon d={CLEAR} size={12} />
              </button>
            )}
          </form>
          <button type="button" className={styles.cancel} onClick={cancel}>
            Cancel
          </button>
        </div>

        <CategoryChips value={cat} onChange={setCat} counts={hasQ ? counts : undefined} className={styles.chips} />

        {hasQ && (
          <section aria-labelledby="search-results-title" className={styles.results}>
            <div className={styles.resultsHead}>
              <h2 id="search-results-title" className={styles.label}>
                Results for “{q.trim()}”
              </h2>
              <span className={styles.meta} role="status">
                {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
              </span>
            </div>
            {groups.map((g) => (
              <Group key={`${q}-${g.category}`} category={g.category} entries={g.entries} onOpen={remember} location={location} inSg={inSg} />
            ))}
            {filtered.length === 0 && (
              <div className={styles.none}>
                <p className={styles.noneTitle}>Nothing matches “{q.trim()}”{cat !== 'all' ? ` in ${TOURISM_INFO[cat].label}` : ''}.</p>
                {cat !== 'all' && hits.length > 0 ? (
                  <>
                    <p className={styles.noneText}>
                      {hits.length} {hits.length === 1 ? 'result is' : 'results are'} in other categories.
                    </p>
                    <button type="button" className={styles.noneButton} onClick={() => setCat('all')}>
                      Search all categories
                    </button>
                  </>
                ) : (
                  <p className={styles.noneText}>
                    Try another category, a place name, a neighbourhood such as Chinatown, or a kind of place such as hawker or museum.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {browsing && (
          <section aria-labelledby="search-browse-title" className={styles.results}>
            <div className={styles.resultsHead}>
              <h2 id="search-browse-title" className={styles.label}>
                Browse · {TOURISM_INFO[cat].label}
              </h2>
              <span className={styles.meta}>{browseLine(filtered)}</span>
            </div>
            {groups.map((g) => (
              <Group key={`browse-${g.category}`} category={g.category} entries={g.entries} onOpen={() => undefined} location={location} inSg={inSg} />
            ))}
          </section>
        )}

        {!hasQ && !browsing && (
          <>
            {recent.length > 0 && (
              <section aria-labelledby="search-recent-title" className={styles.recent}>
                <div className={styles.resultsHead}>
                  <h2 id="search-recent-title" className={styles.label}>
                    Recent
                  </h2>
                  <button type="button" className={styles.clearAll} onClick={() => setRecent([])}>
                    Clear all
                  </button>
                </div>
                <ul className={styles.recentList}>
                  {recent.map((r) => (
                    <li key={r}>
                      <button type="button" className={styles.recentRow} onClick={() => setQ(r)}>
                        <Icon d={CLOCK} size={16} />
                        <span className={styles.recentText}>{r}</span>
                        <Icon d={UP_RIGHT} size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className={styles.fine}>Kept on this phone only.</p>
              </section>
            )}
            <section aria-labelledby="search-browse-cats" className={styles.browse}>
              <h2 id="search-browse-cats" className={styles.label}>
                Browse by category
              </h2>
              <ul className={styles.browseGrid}>
                {order.map((c) => {
                  const info = TOURISM_INFO[c];
                  return (
                    <li key={c}>
                      <button type="button" className={styles.browseTile} style={catStyle(c)} onClick={() => setCat(c)}>
                        <span className={styles.browseGlyph} aria-hidden="true">
                          <CategoryGlyph category={c} size={14} />
                        </span>
                        <span className={styles.browseText}>
                          <span className={styles.browseName}>{info.label}</span>
                          <span className={styles.browseCount}>{browseLine(everything.filter((e) => e.category === c))}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
