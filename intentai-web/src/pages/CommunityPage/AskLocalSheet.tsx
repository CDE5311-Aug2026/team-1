// "Ask a local" (Figma C3, ZIP post sheet): a mini map to pin the place (tap an area pin or pick one of my places;
// the reach circle shows who will see it), the question, a topic picked automatically from the text (changeable),
// and what a local's answer will be added to. Nothing is linked silently.
import { useId, useMemo, useState, type FormEvent } from 'react';
import CityMap, { type MapPin } from '../../features/nearby/map/CityMap';
import type { QuestionLink, QuestionTopic } from '../../data/domain';
import { MAP_AREAS, REACH_M, areaById, myPlaces, shortArea, type PlaceOption } from '../../data/community/map';
import { cardTitle } from '../../data/localAnswer';
import { usePersistentStore } from '../../data/persistentStore';
import { explorePersonalStore, lookupsStore } from '../../data/stores';
import { SUBJECTS, detectTopic } from '../AskPage/cards';
import { Icon } from './icons';
import styles from './AskLocalSheet.module.css';
import Sheet from './Sheet';

export const PRIVACY_LINE = 'Locals see your question and place, never your name or location.';
const MAX = 300;

const TOPICS: { id: QuestionTopic; label: string }[] = [
  { id: 'food', label: 'Food' },
  { id: 'monument', label: 'Monument' },
  { id: 'festival', label: 'Festival' },
  { id: 'other', label: 'Other' },
];

const AREA_PINS: MapPin[] = MAP_AREAS.map((a) => ({ key: a.id, name: shortArea(a.name), location: a.center, category: 'landmark' }));

interface AskLocalSheetProps {
  defaultMessage?: string;
  defaultContext?: string;
  link?: QuestionLink;
  onPost: (message: string, context: string, link: QuestionLink, place?: PlaceOption) => void;
  onClose: () => void;
}

function areaOption(id: string | undefined): PlaceOption | undefined {
  const a = areaById(id);
  return a ? { id: a.id, areaId: a.id, name: shortArea(a.name), location: a.center, why: 'cards' } : undefined;
}

export default function AskLocalSheet({ defaultMessage = '', defaultContext = '', link = {}, onPost, onClose }: AskLocalSheetProps) {
  const [message, setMessage] = useState(defaultMessage.slice(0, MAX));
  const [picked, setPicked] = useState<QuestionTopic | undefined>(link.topic);
  const [lookups] = usePersistentStore(lookupsStore);
  const [personal] = usePersistentStore(explorePersonalStore);
  const places = useMemo(() => myPlaces(SUBJECTS.map((s) => s.id), personal), [personal]);
  const [place, setPlace] = useState<PlaceOption | undefined>(() => areaOption(link.areaId));
  const [focusId, setFocusId] = useState(1);
  const auto: QuestionTopic = detectTopic(message) ?? 'other';
  const topic = picked ?? auto;
  const ids = { msg: useId(), ctx: useId(), places: useId() };

  const card = link.cardId ? cardTitle(link.cardId) : undefined;
  const phrase = link.lookupId ? lookups.find((l) => l.id === link.lookupId) : undefined;
  const target = card
    ? `Linked to your ${card} card. A local’s answer will be added to it as a tip.`
    : phrase
      ? `Linked to “${phrase.word}” in Moments. A local’s answer will be added to it.`
      : 'Not linked to a card. A local’s answer will stay in My questions.';

  const choose = (option: PlaceOption | undefined) => {
    setPlace(option);
    setFocusId((n) => n + 1);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    const context = String(new FormData(event.currentTarget).get('context') ?? '').trim();
    const areaName = place ? shortArea(areaById(place.areaId)?.name ?? place.name) : link.areaName;
    onPost(
      text,
      context || (place ? `near ${place.name}` : link.areaName ? `near ${link.areaName}` : ''),
      {
        ...link,
        areaId: place?.areaId ?? link.areaId,
        areaName,
        topic,
        cardId: card ? link.cardId : undefined,
        lookupId: phrase ? link.lookupId : undefined,
      },
      place,
    );
  };

  const center = place?.location ?? MAP_AREAS.find((a) => a.id === 'sg-chinatown')?.center ?? MAP_AREAS[0].center;

  return (
    <Sheet title="Ask a local" onClose={onClose}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.map}>
          <CityMap
            pins={AREA_PINS}
            selectedKey={place?.areaId}
            onSelect={(key) => {
              const option = places.find((p) => p.areaId === key && !p.placeKey) ?? areaOption(key);
              choose(option);
            }}
            focus={{ id: focusId, center, radiusM: place ? REACH_M * 2.2 : 6000 }}
            circle={place ? { center: place.location, radiusM: REACH_M, label: `Locals who answer near ${place.name}` } : undefined}
            height={168}
            label="Pin the place your question is about: tap an area"
          />
          <p className={styles.mapNote}>{place ? `Locals near ${place.name} will see it.` : 'Tap an area to pin your question.'}</p>
        </div>

        <div className={styles.placeRow} role="group" aria-labelledby={ids.places}>
          <span id={ids.places} className={styles.srOnly}>
            Your places
          </span>
          <button type="button" className={place ? styles.placeChip : styles.placeChipOn} aria-pressed={!place} onClick={() => choose(undefined)}>
            No place
          </button>
          {places.map((option) => {
            const on = place?.id === option.id;
            return (
              <button key={option.id} type="button" className={on ? styles.placeChipOn : styles.placeChip} aria-pressed={on} onClick={() => choose(option)}>
                <Icon name="pin" size={14} />
                {option.name}
                {option.why === 'checked-in' && <span className={styles.chipNote}>checked in</span>}
              </button>
            );
          })}
        </div>

        {link.from === 'ask' && <p className={styles.eyebrow}>From Ask</p>}

        <div className={styles.field}>
          <label htmlFor={ids.msg} className={styles.label}>
            Your message
          </label>
          <textarea
            id={ids.msg}
            name="message"
            className={styles.message}
            value={message}
            maxLength={MAX}
            required
            placeholder="What would you like to ask?"
            onChange={(event) => setMessage(event.target.value)}
          />
          <p className={styles.counter} aria-live="polite">
            {message.length}/{MAX}
          </p>
        </div>

        <fieldset className={styles.topics}>
          <legend className={styles.label}>Topic</legend>
          <div className={styles.topicGrid}>
            {TOPICS.map((t) => (
              <label key={t.id} className={topic === t.id ? styles.topicOn : styles.topic}>
                <input type="radio" name="topic" value={t.id} checked={topic === t.id} onChange={() => setPicked(t.id)} />
                <span>{t.label}</span>
                {picked === undefined && auto === t.id && <span className={styles.auto}>Auto</span>}
              </label>
            ))}
          </div>
        </fieldset>

        {!place && !link.areaName && (
          <div className={styles.field}>
            <label htmlFor={ids.ctx} className={styles.label}>
              Where did you hear it?
            </label>
            <input id={ids.ctx} name="context" className={styles.input} maxLength={80} defaultValue={defaultContext} placeholder="e.g. Hawker centre · lunch" />
          </div>
        )}

        <div className={styles.target}>
          <span className={styles.targetIcon}>
            <Icon name="chat" size={18} />
          </span>
          <p>
            <span className={styles.targetLabel}>Answers arrive in My questions</span>
            {target}
          </p>
        </div>
        <p className={styles.privacy}>
          <Icon name="lock" size={14} />
          {PRIVACY_LINE}
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.primary}>
            <Icon name="send" size={16} />
            Post to locals
          </button>
        </div>
      </form>
    </Sheet>
  );
}
