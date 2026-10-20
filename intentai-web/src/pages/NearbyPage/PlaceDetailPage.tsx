// One place: practical info, the dataset's intro, sourced fun facts, a language tip, collection
// membership, Save / Visited (self-reported), Directions and the 3D view (NBR 18–21, 24).
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import ContextChip from '../../components/ContextChip/ContextChip';
import Icon from '../../components/Icon/Icon';
import PlayAudioButton from '../../components/PlayAudioButton/PlayAudioButton';
import { addLookup } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { dataGeneration, lookupsStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { markVisited, stillReached, toggleSave, useExplorePersonal, type Milestone } from '../../features/nearby/actions';
import { area as areaById, collectionProgress, collectionsContaining, collectionTitle, curatedPlace, placeByEarthKey, regionName } from '../../features/nearby/catalogue';
import { BackHeader, StorageWarning } from '../../features/nearby/components/NearbyChrome';
import View3D from '../../features/nearby/components/View3D';
import { fixInSingapore } from '../../features/nearby/components/LocationFlow';
import styles from '../../features/nearby/components/Nearby.module.css';
import { CATEGORY_INFO, type CuratedPlace, type SourceReference } from '../../features/nearby/domain';
import { distanceM, formatDistance } from '../../features/nearby/geo';
import { parsePlaceKey } from '../../features/nearby/identity';
import { directionsUrl, view3dTarget } from '../../features/nearby/links';
import { isPrecise, useLocationState } from '../../features/nearby/location';
import CityMap from '../../features/nearby/map/CityMap';
import { localToday, stateOf } from '../../features/nearby/personal';
import { paths, type AskHandoff } from '../../routes';
import { askContextForPlace } from '../AskPage/answer';
import { nearbyContent } from './nearbyContent';

function SourceLinks({ sources }: { sources: SourceReference[] }) {
  return (
    <p className={styles.sourceLine}>
      Source{sources.length > 1 ? 's' : ''}:{' '}
      {sources.map((s, i) => (
        <span key={s.url + i}>
          {i > 0 && '; '}
          {s.url ? (
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
            </a>
          ) : (
            s.title
          )}{' '}
          ({s.publisher}, checked {s.checkedAt})
        </span>
      ))}
    </p>
  );
}

export default function PlaceDetailPage() {
  const { placeKey } = useParams();
  const key = parsePlaceKey(placeKey);
  const place = key ? curatedPlace(key) : undefined;
  if (!place) return <NotFound />;
  return <Detail key={place.id} place={place} />;
}

function NotFound() {
  return (
    <AppShell background="var(--bg-screen-b)">
      <div className={styles.screen}>
        <BackHeader title="Place not found" fallback={paths.nearby} />
        <p className={styles.empty}>
          We could not find this place. It may have been renamed or removed from the catalogue. Your saved and visited records are kept.
        </p>
        <div className={styles.row}>
          <Link className={styles.primary} to={paths.nearby}>
            Explore places
          </Link>
          <Link className={styles.secondary} to={paths.saved}>
            Saved places
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Detail({ place }: { place: CuratedPlace }) {
  const navigate = useNavigate();
  const personal = useExplorePersonal();
  const location = useLocationState();
  const [, setLookups] = usePersistentStore(lookupsStore);
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'map' | '3d'>('map');
  const [cardKey, setCardKey] = useState<string | null>(null);
  const otherCard = view === '3d' ? placeByEarthKey(cardKey) : undefined;
  const state = stateOf(personal, place.id);
  const info = CATEGORY_INFO[place.category];
  const area = areaById(place.areaId);
  const selectedArea = areaById(personal.selectedAreaId);
  const memberships = collectionsContaining(place.id);
  const today = localToday();

  const fix = location.status === 'active' && fixInSingapore(location) && isPrecise(location.fix) ? location.fix : undefined;
  const distance = fix
    ? `${formatDistance(distanceM(fix, place.coordinates))} from you`
    : selectedArea && !selectedArea.overview
      ? `${formatDistance(distanceM(selectedArea.center, place.coordinates))} from ${selectedArea.name}`
      : null;

  const visit = (visited: boolean, date?: string) => {
    const result = markVisited(place.id, place.name, visited, date);
    if (result.error) {
      setDateError(result.error);
      return;
    }
    setDateError(null);
    setDateDraft(null);
    if (result.milestones.length) setMilestones(result.milestones);
  };

  const tip = place.languageTip ? nearbyContent(place.languageTip.context) : null;
  const saveTip = () => {
    if (!tip) return;
    const { headsUp } = tip;
    let addedId: string | undefined;
    const generation = dataGeneration();
    setLookups((prev) => {
      const next = addLookup(prev, { word: headsUp.title, meaning: headsUp.meaning, source: 'IntentAI editorial' });
      addedId = next !== prev ? next[0].id : undefined;
      return next;
    });
    if (!addedId) {
      showToast(`${headsUp.title} is already in Moments`);
      return;
    }
    const id = addedId;
    showToast(`${headsUp.title} saved to Moments`, {
      undo: () => {
        if (dataGeneration() === generation) setLookups((prev) => prev.filter((l) => l.id !== id));
      },
    });
  };

  const correction = `Correction for “${place.name}” (${place.id}): `;
  const copyCorrection = async () => {
    try {
      await navigator.clipboard.writeText(correction);
      setCopied(true);
    } catch {
      setCopied(false);
      showToast('Copy is not available here. Select the text instead.');
    }
  };

  return (
    <AppShell background="var(--bg-screen-b)">
      <div className={styles.screen}>
        <BackHeader title={place.name} fallback={paths.nearby} />
        {place.nameZh && (
          <p className={styles.nameZh} lang="zh-Hans" style={{ marginTop: '-0.5rem' }}>
            {place.nameZh}
          </p>
        )}
        <p className={styles.meta}>
          {info.emoji} {info.label} · {place.kind} · {area?.name ?? regionName(place.regionId)}
          {distance && <> · {distance} (straight line)</>}
        </p>
        <StorageWarning />

        {milestones.filter((m) => stillReached(m, personal)).map((m) => (
          <p key={m.collectionId} className={styles.milestone} role="status">
            🎉 You have visited {m.percent}% of the {m.title}.
          </p>
        ))}

        <div className={styles.row}>
          <div className={styles.segmented} role="group" aria-label="View">
            <button type="button" className={styles.segment} aria-pressed={view === 'map'} onClick={() => setView('map')}>
              Map
            </button>
            <button
              type="button"
              className={styles.segment}
              aria-pressed={view === '3d'}
              onClick={() => {
                setCardKey(null);
                setView('3d');
              }}
            >
              3D
            </button>
          </div>
        </div>
        {view === 'map' ? (
          <div className={styles.heroMap} data-allow-bleed>
            <CityMap
              bleed
              label={`Map showing ${place.name}`}
              pins={[{ key: place.id, name: place.name, location: place.coordinates, category: place.category, visited: state?.visited }]}
              selectedKey={place.id}
              onSelect={() => undefined}
              readOnly
              focus={{ id: 1, center: place.coordinates, radiusM: 600 }}
            />
          </div>
        ) : (
          <>
            <View3D target={view3dTarget(place)} title={`3D view around ${place.name}`} height={400} onCard={setCardKey} />
            {otherCard && otherCard.id !== place.id && (
              <p className={styles.note} role="status">
                Card open: {otherCard.name}.{' '}
                <Link className={styles.textLink} to={paths.nearbyPlace(otherCard.id)}>
                  Open place →
                </Link>
              </p>
            )}
          </>
        )}

        <div className={styles.row}>
          <button type="button" className={styles.ghostButton} aria-pressed={!!state?.saved} onClick={() => toggleSave(place.id, place.name)}>
            {state?.saved ? '★ Saved' : '☆ Save'}
          </button>
          <button type="button" className={styles.ghostButton} aria-pressed={!!state?.visited} onClick={() => visit(!state?.visited)}>
            {state?.visited ? '✓ Visited' : 'Mark visited'}
          </button>
          <a className={styles.linkButton} href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
            Directions ↗
          </a>
        </div>
        <p className={styles.note}>
          Directions opens Google Maps without your position. It does not mark a visit.
        </p>

        {state?.visited && (
          <section className={styles.panel} aria-labelledby="visit-title">
            <h2 id="visit-title" className={styles.panelTitle}>
              Your visit
            </h2>
            <p className={styles.body}>
              Visited on {state.visitedOn ?? 'an unknown date'} (self-reported). Visits are not verified and stay on this device.
            </p>
            {dateDraft === null ? (
              <button type="button" className={styles.secondary} onClick={() => setDateDraft(state.visitedOn ?? today)}>
                Change date
              </button>
            ) : (
              <form
                className={styles.row}
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  visit(true, dateDraft);
                }}
              >
                <label className={styles.label}>
                  Visit date{' '}
                  <input
                    className={styles.select}
                    type="date"
                    value={dateDraft}
                    max={today}
                    onChange={(e) => setDateDraft(e.target.value)}
                    aria-describedby={dateError ? 'visit-date-error' : undefined}
                  />
                </label>
                <button type="submit" className={styles.primary}>
                  Save date
                </button>
                <button type="button" className={styles.secondary} onClick={() => setDateDraft(null)}>
                  Cancel
                </button>
              </form>
            )}
            {dateError && (
              <p id="visit-date-error" className={styles.warning} role="alert">
                {dateError}
              </p>
            )}
          </section>
        )}

        <section className={styles.panel} aria-labelledby="about-title">
          <h2 id="about-title" className={styles.panelTitle}>
            About
          </h2>
          {/* Dataset entries derive their summary from the intro; show it once. */}
          {!(place.description && place.description.en.startsWith(place.summary.replace(/…$/, ''))) && <p className={styles.body}>{place.summary}</p>}
          {place.description && <p className={styles.body}>{place.description.en}</p>}
          {place.description?.zh && (
            <p className={styles.zh} lang="zh-Hans">
              {place.description.zh}
            </p>
          )}
          {place.quickFacts && (
            <p className={styles.meta}>
              {[
                place.quickFacts.year && `Built ${place.quickFacts.year}`,
                place.quickFacts.architect && `Architect: ${place.quickFacts.architect}`,
                place.quickFacts.heightM && `About ${place.quickFacts.heightM} m tall`,
                place.quickFacts.floors && `${place.quickFacts.floors} floors`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {place.description && (
            <p className={styles.sourceLine}>
              Intro and quick facts from the EARTH ONLINE Singapore dataset; not yet linked to individual sources.
            </p>
          )}
          {place.viewFromOutside && <p className={styles.note}>Not open to visitors inside: enjoy it from the outside.</p>}
          {place.accessNotes && (
            <>
              <p className={styles.body}>
                <strong>Getting in:</strong> {place.accessNotes.text}
              </p>
              <SourceLinks sources={[place.accessNotes.source]} />
            </>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="facts-title">
          <h2 id="facts-title" className={styles.panelTitle}>
            Fun facts
          </h2>
          {place.facts.length === 0 ? (
            <p className={styles.note}>No sourced fun facts yet. We only show facts we can link to a source.</p>
          ) : (
            place.facts.map((fact) => (
              <div key={fact.id}>
                <p className={styles.body}>{fact.text}</p>
                <SourceLinks sources={fact.sources} />
              </div>
            ))
          )}
          {place.facts.length > 0 && (
            <p className={styles.sourceLine}>
              Last reviewed {place.reviewedAt} · {place.reviewedBy}
            </p>
          )}
        </section>

        {tip && place.languageTip && (
          <section className={styles.panel} aria-labelledby="hear-title">
            <h2 id="hear-title" className={styles.panelTitle}>
              What you might hear here
            </h2>
            <ContextChip icon={tip.chipIcon} label={`${place.languageTip.regionLabel} · ${tip.chipLabel}`} />
            <div className={styles.row}>
              <span className={styles.catTile} aria-hidden="true">
                <Icon name={tip.headsUp.icon} size={24} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className={styles.cardName}>
                  {tip.headsUp.title} {tip.headsUp.phonetic && <span className={styles.meta}>{tip.headsUp.phonetic}</span>}
                </p>
                <p className={styles.meta}>{tip.headsUp.meaning}</p>
              </div>
              <PlayAudioButton text={tip.headsUp.title} />
            </div>
            <p className={styles.body}>{tip.headsUp.tip}</p>
            <div className={styles.row}>
              <button type="button" className={styles.primary} onClick={saveTip}>
                Save to Moments
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  const handoff: AskHandoff = {
                    prompt: `What does ${tip.headsUp.title.toLowerCase()} mean?`,
                    context: askContextForPlace(place.languageTip!.context),
                  };
                  navigate(paths.ask, { state: handoff });
                }}
              >
                Ask about this phrase
              </button>
            </div>
            <p className={styles.sourceLine}>Phrase guidance written by the IntentAI team (Singapore usage).</p>
          </section>
        )}

        {memberships.length > 0 && (
          <section className={styles.panel} aria-labelledby="coll-title">
            <h2 id="coll-title" className={styles.panelTitle}>
              In collections
            </h2>
            {memberships.map((c) => {
              const p = collectionProgress(c, personal);
              return (
                <p key={c.id} className={styles.body}>
                  <Link className={styles.textLink} to={paths.collection(c.id)}>
                    {collectionTitle(c)}
                  </Link>{' '}
                  — {p.visited} of {p.total} visited
                </p>
              );
            })}
          </section>
        )}

        <section className={styles.panel} aria-labelledby="fix-title">
          <h2 id="fix-title" className={styles.panelTitle}>
            Suggest a correction
          </h2>
          <p className={styles.note}>
            Spotted a mistake? Copy this line, add what should change, and send it to the IntentAI team
            {place.facts[0]?.sources[0]?.url ? ' (you can also check the source links above)' : ''}. There is no in-app reporting service yet.
          </p>
          <p className={styles.sourceLine}>{correction}</p>
          <button type="button" className={styles.secondary} onClick={copyCorrection}>
            {copied ? 'Copied' : 'Copy correction text'}
          </button>
        </section>
      </div>
    </AppShell>
  );
}
