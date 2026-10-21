// The body of a place: check in, about, sourced fun facts, the phrase tip, collections and the correction line.
// Shown on the place page and expanded in place under the selected place in Explore's sheet.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ContextChip from '../../../components/ContextChip/ContextChip';
import Icon from '../../../components/Icon/Icon';
import PlayAudioButton from '../../../components/PlayAudioButton/PlayAudioButton';
import { addLookup } from '../../../data/domain';
import { usePersistentStore } from '../../../data/persistentStore';
import { dataGeneration, lookupsStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import { paths, type AskHandoff } from '../../../routes';
import { askContextForPlace } from '../../../pages/AskPage/answer';
import { nearbyContent } from '../../../pages/NearbyPage/nearbyContent';
import { markVisited, stillReached, toggleSave, useExplorePersonal, type Milestone } from '../actions';
import { collectionProgress, collectionsContaining, collectionTitle } from '../catalogue';
import type { CuratedPlace, SourceReference } from '../domain';
import { directionsUrl } from '../links';
import { localToday, stateOf } from '../personal';
import { Icon as NearbyIcon } from './icons';
import styles from './Nearby.module.css';

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

/** flat: inside another card (Explore's selected place, which has its own Save star): sections are divided by lines. */
export default function PlaceInfo({ place, idPrefix = 'place', flat = false }: { place: CuratedPlace; idPrefix?: string; flat?: boolean }) {
  const panel = flat ? `${styles.panel} ${styles.flatPanel}` : styles.panel;
  const navigate = useNavigate();
  const personal = useExplorePersonal();
  const [, setLookups] = usePersistentStore(lookupsStore);
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [copied, setCopied] = useState(false);
  const state = stateOf(personal, place.id);
  const memberships = collectionsContaining(place.id);
  const today = localToday();

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
    <>
      {milestones.filter((m) => stillReached(m, personal)).map((m) => (
        <p key={m.collectionId} className={styles.milestone} role="status">
          <NearbyIcon name="check" size={18} /> {m.percent}% of {m.title} checked in.
        </p>
      ))}

      {/* Check in (打卡): one tap, self-reported, dated today; the stamp also shows in Moments. */}
      <div className={styles.checkRow}>
        <button
          type="button"
          className={state?.visited ? `${styles.checkIn} ${styles.checkedIn}` : styles.checkIn}
          aria-pressed={!!state?.visited}
          onClick={() => visit(!state?.visited)}
        >
          <NearbyIcon name="check" size={20} />
          {state?.visited ? 'Checked in' : 'Check in'}
        </button>
        {!flat && (
          <button
            type="button"
            className={styles.iconAction}
            aria-pressed={!!state?.saved}
            onClick={() => toggleSave(place.id, place.name)}
            aria-label={state?.saved ? 'Saved' : 'Save'}
          >
            <NearbyIcon name="star" filled={!!state?.saved} />
          </button>
        )}
        <a className={styles.linkButton} href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
          Directions ↗
        </a>
      </div>

      {state?.visited && (
        <section className={panel} aria-labelledby={`${idPrefix}-visit-title`}>
          <h2 id={`${idPrefix}-visit-title`} className={styles.panelTitle}>
            Your check-in
          </h2>
          <p className={styles.body}>
            {state.visitedOn ? `Checked in on ${state.visitedOn}.` : 'Checked in.'} It is a stamp in Moments. Self-reported, kept on this device, and your
            location is not saved.
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
                Check-in date{' '}
                <input
                  className={styles.select}
                  type="date"
                  value={dateDraft}
                  max={today}
                  onChange={(e) => setDateDraft(e.target.value)}
                  aria-describedby={dateError ? `${idPrefix}-visit-date-error` : undefined}
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
            <p id={`${idPrefix}-visit-date-error`} className={styles.warning} role="alert">
              {dateError}
            </p>
          )}
        </section>
      )}

      <section className={panel} aria-labelledby={`${idPrefix}-about-title`}>
        <h2 id={`${idPrefix}-about-title`} className={styles.panelTitle}>
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

      <section className={panel} aria-labelledby={`${idPrefix}-facts-title`}>
        <h2 id={`${idPrefix}-facts-title`} className={styles.panelTitle}>
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
        <section className={panel} aria-labelledby={`${idPrefix}-hear-title`}>
          <h2 id={`${idPrefix}-hear-title`} className={styles.panelTitle}>
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
        <section className={panel} aria-labelledby={`${idPrefix}-coll-title`}>
          <h2 id={`${idPrefix}-coll-title`} className={styles.panelTitle}>
            In collections
          </h2>
          {memberships.map((c) => {
            const p = collectionProgress(c, personal);
            return (
              <p key={c.id} className={styles.body}>
                <Link className={styles.textLink} to={paths.collection(c.id)}>
                  {collectionTitle(c)}
                </Link>{' '}
                — {p.visited} of {p.total} checked in
              </p>
            );
          })}
        </section>
      )}

      <section className={panel} aria-labelledby={`${idPrefix}-fix-title`}>
        <h2 id={`${idPrefix}-fix-title`} className={styles.panelTitle}>
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
    </>
  );
}
