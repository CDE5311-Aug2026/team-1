// Hunt's first screen (owner, batch 3): what Hunt is, the public hunts to swipe through, your rank, the public board and
// your medals, then every story hunt as a flat list (the one to carry on with first). No shelf, no books: a hunt opens
// straight onto its step screen (#story/<id>).
import { useMemo, type CSSProperties } from 'react';
import PageBar from '../../../components/PageBar/PageBar';
import CategoryChips, { useCategoryParam } from '../../../components/Category/CategoryChips';
import LevelBadge from '../../../components/Level/LevelBadge';
import { usePersistentStore } from '../../../data/persistentStore';
import { profileV3Store, tourismOrder } from '../../../data/profile/profile';
import { TOURISM_INFO, type TourismCategory } from '../../../data/tourism';
import { formatHomeDistance } from '../../../data/homePlaces';
import { distanceM } from '../../../features/nearby/geo';
import { isPrecise, useLocationState } from '../../../features/nearby/location';
import { BoardTiles, HuntIntro } from '../HuntIntro';
import type { HuntGo } from '../HuntPage';
import { huntImage, type HuntId } from '../hunts';
import { storyRecords } from '../story/record';
import { inProgress, useExplored, volumes, type Volume } from './volumes';
import { PublicCarousel } from './PublicCarousel';
import a from './HuntLanding.module.css';

const SPARKLE = (
  <svg aria-hidden="true" width="13" height="11" viewBox="0 0 24 20" fill="currentColor">
    <path d="M10 6c.6 4.2 1.8 5.4 6 6-4.2.6-5.4 1.8-6 6-.6-4.2-1.8-5.4-6-6 4.2-.6 5.4-1.8 6-6z" />
    <path d="M18 2c.3 2.1.9 2.7 3 3-2.1.3-2.7.9-3 3-.3-2.1-.9-2.7-3-3 2.1-.3 2.7-.9 3-3z" />
  </svg>
);
const CHEVRON = (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const ARROW = (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const catStyle = (c?: TourismCategory) =>
  (c ? { '--cat': TOURISM_INFO[c].fill, '--cat-ink': TOURISM_INFO[c].ink } : {}) as CSSProperties;

export function HuntLanding({ go, openHunt }: { go: HuntGo; openHunt(id: HuntId): void }) {
  const [cat, setCat] = useCategoryParam();
  const all = useMemo(() => volumes(), []);
  const records = useMemo(() => storyRecords(), []);
  const shown = all.filter((v) => cat === 'all' || v.category === cat);
  const [profile] = usePersistentStore(profileV3Store);
  const loc = useLocationState();
  const here = loc.status === 'active' && isPrecise(loc.fix) ? loc.fix : null;
  const away = (v: Volume) => (here && v.next ? `${v.next.approx ? 'about ' : ''}${formatHomeDistance(distanceM(here, v.next))}` : null);
  const explored = useExplored();

  // carry on with the one in progress; otherwise the first unfinished hunt in your top-ranked category
  const order = tourismOrder(profile);
  const rank = (v: Volume) => (v.category ? order.indexOf(v.category) : order.length);
  const pick = inProgress(shown) ?? [...shown].filter((v) => v.found < v.total).sort((x, y) => rank(x) - rank(y))[0] ?? null;
  const found = shown.reduce((n, v) => n + v.found, 0);
  const total = shown.reduce((n, v) => n + v.total, 0);

  return (
    <div className={a.page}>
      <PageBar title="Hunt" className={a.bar} />
      <div className={a.top}>
        <HuntIntro />
      </div>
      <PublicCarousel onOpen={openHunt} />
      <div className={a.top}>
        <BoardTiles go={go} explored={explored} medals={{ won: records.filter((r) => r.finished).length, total: records.length }} />
      </div>
      <CategoryChips value={cat} onChange={setCat} className={a.chips} />
      <div className={a.scroll}>
        {pick && (
          <article className={a.next} aria-label={pick.inProgress ? 'Continue' : 'Picked for you'}>
            <img className={`${a.cover} ${a.coverBig}`} src={huntImage(pick.id)} alt="" />
            <div className={a.nextBody}>
              <span className={a.picked}>
                {SPARKLE}
                {pick.inProgress ? 'Continue' : 'Picked for you'}
                {pick.category ? ` · ${TOURISM_INFO[pick.category].label}` : ''}
              </span>
              <h2 className={a.nextTitle}>{pick.title}</h2>
              <span className={a.nextMeta}>
                <LevelBadge level={pick.level} />
                <span className={a.nextMetaText}>
                  {pick.area} · {pick.total} stops
                </span>
              </span>
              <span
                className={a.segments}
                role="img"
                aria-label={`${pick.found} of ${pick.total} found`}
                style={{ gridTemplateColumns: `repeat(${pick.total}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: pick.total }, (_, i) => (
                  <span key={i} className={i < pick.found ? a.segOn : undefined} />
                ))}
              </span>
              <span className={a.nextFoot}>
                <span className={a.mono}>
                  {pick.inProgress ? `Stop ${pick.stop} of ${pick.total}` : 'Not started'}
                  {away(pick) ? ` · ${away(pick)}` : ''}
                </span>
                <button type="button" className={a.go} onClick={() => openHunt(pick.id)}>
                  <span>
                    {pick.inProgress ? 'Continue' : 'Set out'}
                    {ARROW}
                  </span>
                </button>
              </span>
            </div>
          </article>
        )}

        <section aria-labelledby="hunt-list-h" className={a.archive}>
          <div className={a.head}>
            <h2 id="hunt-list-h">All hunts</h2>
            <span className={a.mono}>
              {shown.length} {shown.length === 1 ? 'hunt' : 'hunts'} · {found}/{total} stops found
            </span>
          </div>
          {shown.length === 0 ? (
            <p className={a.empty}>No hunts in {cat === 'all' ? 'this category' : TOURISM_INFO[cat].label} yet.</p>
          ) : (
            <ul className={a.list} aria-label="Hunts">
              {shown.map((v) => {
                const d = away(v);
                return (
                  <li key={v.id}>
                    <button type="button" className={a.row} style={catStyle(v.category)} onClick={() => openHunt(v.id)}>
                      <img className={a.cover} src={huntImage(v.id)} alt="" />
                      <span className={a.rowBody}>
                        <span className={a.kicker}>
                          {v.category && <span className={a.badge}>{TOURISM_INFO[v.category].label}</span>}
                          {/* the place drops out whole when the line is full (HuntArchive.module.css .kicker) */}
                          <span>{`${v.category ? ' · ' : ''}${v.area}`}</span>
                        </span>
                        <span className={a.rowTitle}>{v.title}</span>
                        <span className={a.tagLine}>
                          <LevelBadge level={v.level} />
                          <span className={a.tag}>{v.tagline}</span>
                        </span>
                        <span className={a.progress}>
                          <span className={a.track} aria-hidden="true">
                            <span style={{ width: `${Math.round((100 * v.found) / v.total)}%` }} />
                          </span>
                          <span className={a.status}>
                            {v.found ? `${v.found} of ${v.total} found` : 'Not started'}
                            {d ? ` · ${d}` : ''}
                          </span>
                        </span>
                      </span>
                      <span className={a.chev}>{CHEVRON}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <p className={a.fine}>Real places and history; the stories and their characters are fiction.</p>
      </div>
    </div>
  );
}
