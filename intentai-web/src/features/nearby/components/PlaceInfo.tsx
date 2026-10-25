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
import { localToday, shortDate, stateOf } from '../personal';
import { placeShare } from '../share';
import { CATEGORIES, articlesFor } from '../../../data/culture';
import { HOLIDAY_LINKS, articlesNaming } from '../../../data/cultureLinks';
import { todaysHoliday } from '../../../data/holiday';
import ShareButton from './ShareButton';
import CardDeck, { type DeckCard } from './CardDeck';
import PlaceDetails from './PlaceDetails';
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

const TODAY_ARTICLES = CATEGORIES.flatMap((c) => articlesFor(c.id));

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
  const introIsSummary = !!place.description && place.description.en.startsWith(place.summary.replace(/…$/, ''));

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
  const saveWord = (word: string, meaning: string) => {
    let addedId: string | undefined;
    const generation = dataGeneration();
    setLookups((prev) => {
      const next = addLookup(prev, { word, meaning, source: 'IntentAI editorial' });
      addedId = next !== prev ? next[0].id : undefined;
      return next;
    });
    if (!addedId) {
      showToast(`${word} is already in Moments`);
      return;
    }
    const id = addedId;
    showToast(`${word} saved to Moments`, {
      undo: () => {
        if (dataGeneration() === generation) setLookups((prev) => prev.filter((l) => l.id !== id));
      },
    });
  };

  // The cards: phrases you may hear here and the place's sourced facts, mixed (a phrase first).
  const language: DeckCard[] = tip
    ? [
        {
          id: `say-${tip.headsUp.id}`,
          tone: 'language',
          kicker: 'Language · you might hear',
          body: (
            <>
              <ContextChip icon={tip.chipIcon} label={`${place.languageTip!.regionLabel} · ${tip.chipLabel}`} />
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
                <button type="button" className={styles.primary} onClick={() => saveWord(tip.headsUp.title, tip.headsUp.meaning)}>
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
            </>
          ),
        },
        ...tip.alsoHeard.map(
          (w): DeckCard => ({
            id: `say-${w.id}`,
            tone: 'language',
            kicker: 'Language · also heard here',
            body: (
              <>
                <div className={styles.row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className={styles.cardName}>
                      {w.title} {w.phonetic && <span className={styles.meta}>{w.phonetic}</span>}
                    </p>
                    <p className={styles.meta}>{w.meaning}</p>
                  </div>
                  <PlayAudioButton text={w.title} />
                </div>
                <div className={styles.row}>
                  <button type="button" className={styles.secondary} onClick={() => saveWord(w.title, w.meaning)} aria-label={`Save ${w.title} to Moments`}>
                    Save to Moments
                  </button>
                </div>
              </>
            ),
          }),
        ),
      ]
    : [];
  const culture: DeckCard[] = place.facts.map((fact, i) => ({
    id: `fact-${fact.id}`,
    tone: 'culture',
    kicker: place.facts.length > 1 ? `Culture · fact ${i + 1} of ${place.facts.length}` : 'Culture · fact',
    body: (
      <>
        <p className={styles.body}>{fact.text}</p>
        <details className={styles.fold}>
          <summary className={styles.foldSummary}>Sources</summary>
          <div className={styles.foldBody}>
            <SourceLinks sources={fact.sources} />
          </div>
        </details>
      </>
    ),
  }));
  // Today's articles (and holiday) that name this place: the same reading, from the place's side
  const fromToday: DeckCard[] = [
    ...articlesNaming(place.id).flatMap((id) => {
      const a = TODAY_ARTICLES.find((x) => x.id === id);
      return a
        ? [
            {
              id: `today-${a.id}`,
              tone: 'culture' as const,
              kicker: 'Culture · from Today',
              body: (
                <>
                  <p className={styles.cardName}>{a.title}</p>
                  <p className={styles.body}>{a.summary}</p>
                  <details className={styles.fold}>
                    <summary className={styles.foldSummary}>Read more</summary>
                    <div className={styles.foldBody}>
                      <p className={styles.body}>{a.deeper}</p>
                      <p className={styles.sourceLine}>Source: {a.sources.map((x) => x.label).join('; ')}</p>
                    </div>
                  </details>
                </>
              ),
            },
          ]
        : [];
    }),
    ...(HOLIDAY_LINKS[todaysHoliday.name]?.some((l) => l.kind === 'place' && l.id === place.id)
      ? [
          {
            id: `today-holiday-${todaysHoliday.name}`,
            tone: 'culture' as const,
            kicker: `Festival · ${todaysHoliday.today}`,
            body: (
              <>
                <p className={styles.cardName}>{todaysHoliday.name}</p>
                <p className={styles.body}>{todaysHoliday.cardBody}</p>
                <Link className={styles.textLink} to={paths.holiday}>
                  Read about {todaysHoliday.name} on Today
                </Link>
              </>
            ),
          },
        ]
      : []),
  ];
  const deck: DeckCard[] = [...fromToday];
  for (let i = 0; i < Math.max(language.length, culture.length); i++) {
    if (language[i]) deck.push(language[i]);
    if (culture[i]) deck.push(culture[i]);
  }

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
        <ShareButton className={styles.iconAction} label={`Share ${place.name}`} content={() => placeShare(place, personal)} />
        <a className={`${styles.linkButton} ${styles.directions}`} href={directionsUrl(place)} target="_blank" rel="noopener noreferrer" aria-label="Directions (opens Google Maps)">
          <span className={styles.directionsText}>Directions</span> ↗
        </a>
      </div>

      {/* one quiet line under the button: the date, and a way to change it */}
      {state?.visited && (
        <div className={styles.checkLine}>
          {dateDraft === null ? (
            <p className={styles.checkDate}>
              {state.visitedOn ? `Checked in on ${shortDate(state.visitedOn)}` : 'Checked in'} ·{' '}
              <button type="button" className={styles.textButtonInline} onClick={() => setDateDraft(state.visitedOn ?? today)}>
                Change date
              </button>
            </p>
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
        </div>
      )}

      <PlaceDetails place={place} panel={panel} idPrefix={idPrefix} />

      <section className={panel} aria-labelledby={`${idPrefix}-about-title`}>
        <h2 id={`${idPrefix}-about-title`} className={styles.panelTitle}>
          About
        </h2>
        {place.recognition && (
          <p className={styles.recognition}>
            {place.recognition.label} · {place.recognition.year}
          </p>
        )}
        {/* One intro paragraph: the dataset's intro when the summary is cut from it, else the summary (the
            dataset's own intro then folds away below). */}
        <p className={styles.body}>{introIsSummary ? place.description!.en : place.summary}</p>
        {place.viewFromOutside && <p className={styles.note}>Not open to visitors inside: enjoy it from the outside.</p>}
        {place.accessNotes && (
          <p className={styles.body}>
            <strong>Getting in:</strong> {place.accessNotes.text}
          </p>
        )}
        {/* the rest folds away: the Chinese intro, quick facts and where it all comes from */}
        {(place.description?.zh || place.quickFacts || place.description || place.recognition || place.accessNotes) && (
          <details className={styles.fold}>
            <summary className={styles.foldSummary}>{[place.description && !introIsSummary && 'More', place.description?.zh && '中文', 'Sources'].filter(Boolean).join(' · ')}</summary>
            <div className={styles.foldBody}>
              {place.description && !introIsSummary && <p className={styles.body}>{place.description.en}</p>}
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
              {place.recognition && <SourceLinks sources={[place.recognition.source]} />}
              {place.accessNotes && <SourceLinks sources={[place.accessNotes.source]} />}
              {place.description && (
                <p className={styles.sourceLine}>Intro and quick facts from the EARTH ONLINE Singapore dataset; not yet linked to individual sources.</p>
              )}
            </div>
          </details>
        )}
        {place.facts.length === 0 && <p className={styles.sourceLine}>No sourced fun facts yet.</p>}
      </section>

      {deck.length > 0 && (
        <section className={panel} aria-labelledby={`${idPrefix}-cards-title`}>
          <h2 id={`${idPrefix}-cards-title`} className={styles.panelTitle}>
            Culture & language
          </h2>
          <CardDeck key={place.id} cards={deck} label={`Culture and language cards for ${place.name}`} />
          <p className={styles.sourceLine}>
            {[place.facts.length > 0 && `Last reviewed ${place.reviewedAt} · ${place.reviewedBy}`, tip && 'Phrases written by the IntentAI team (Singapore usage)']
              .filter(Boolean)
              .join('. ')}
          </p>
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

      {/* corrections: one quiet line, the details only when opened */}
      <details className={styles.fold}>
        <summary className={styles.foldSummary}>Spotted a mistake?</summary>
        <div className={styles.foldBody}>
          <p className={styles.note}>Copy this line, add what should change, and send it to the IntentAI team.</p>
          <p className={styles.sourceLine}>{correction}</p>
          <button type="button" className={styles.secondary} onClick={copyCorrection}>
            {copied ? 'Copied' : 'Copy correction text'}
          </button>
        </div>
      </details>
    </>
  );
}
