// "You as a local" (the avatar next to the Local switch on the Locals map): one sheet with two parts.
// 1. On the map — show me on the map + my area (applied at once, as before).
// 2. My tags — culture, native languages, where I grew up, background (private unless shown) and what I'm happy
//    to help with. Prefilled from onboarding until the first save; Save stores them (edited: true). A live
//    "Others see" line previews the public tags. Memory picks the tags up by itself (profileMemories).
import { useReducedMotionConfig } from 'motion/react';
import { useId, useState } from 'react';
import { MAP_AREAS } from '../../data/community/map';
import { memoryStore } from '../../data/memory';
import { usePersistentStore } from '../../data/persistentStore';
import {
  CULTURE_TAGS,
  HELP_TOPICS,
  NATIVE_LANGUAGES,
  localProfileStore,
  publicTags,
  fromProfile,
  toStored,
  toggle,
  withPrefill,
  type LocalProfile,
} from '../../data/profile/localProfile';
import { profileV3Store } from '../../data/profile/profile';
import { Link } from 'react-router-dom';
import { paths } from '../../routes';
import Sheet from './Sheet';
import styles from './LocalProfileSheet.module.css';

export const LOCAL_PROFILE_TITLE = 'You as a local';

interface Props {
  /** Answer as a local is on. */
  local: boolean;
  shown: boolean;
  areaId?: string;
  onChange: (shown: boolean, areaId?: string) => void;
  onLocal: () => void;
  onClose: () => void;
}

export default function LocalProfileSheet({ local, shown, areaId, onChange, onLocal, onClose }: Props) {
  const [stored] = usePersistentStore(localProfileStore);
  const [profile] = usePersistentStore(profileV3Store);
  const [memory] = usePersistentStore(memoryStore);
  const [draft, setDraft] = useState<LocalProfile>(() => withPrefill(stored, profile));
  const [area, setArea] = useState(areaId ?? profile.base ?? '');
  const linked = fromProfile(stored, profile);
  const ids = { map: useId(), tags: useId(), grew: useId(), bg: useId(), bgNote: useId(), preview: useId() };
  const set = (patch: Partial<LocalProfile>) => setDraft((d) => ({ ...d, ...patch }));
  const tags = publicTags(draft);
  const reduce = useReducedMotionConfig();

  const save = () => {
    localProfileStore.set(toStored(draft, profile));
    onClose();
  };

  return (
    <Sheet title={LOCAL_PROFILE_TITLE} onClose={onClose}>
      <div className={reduce ? styles.still : undefined}>
      <section className={styles.section} aria-labelledby={ids.map}>
        <h3 id={ids.map} className={styles.heading}>
          On the map
        </h3>
        <p className={styles.text}>Show yourself to visitors as a local who answers questions. Only your area is shown — never your name or location.</p>
        {!local && (
          <button type="button" className={styles.secondary} onClick={onLocal}>
            Switch on Answer as a local first
          </button>
        )}
        <label className={styles.row}>
          <span>Your area</span>
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              if (shown) onChange(true, e.target.value || undefined);
            }}
          >
            <option value="">Choose an area</option>
            {MAP_AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.row} ${styles.check}`}>
          <input type="checkbox" checked={shown} disabled={!local || !area} onChange={(e) => onChange(e.target.checked, area || undefined)} />
          <span>Show me on the map</span>
        </label>
      </section>

      <section className={styles.section} aria-labelledby={ids.tags}>
        <h3 id={ids.tags} className={styles.heading}>
          What kind of local are you?
        </h3>
        <p className={styles.text}>Every tag is optional. They help visitors pick who to ask.</p>
        {(linked.nativeLanguages || linked.grewUp) && (
          <p className={styles.linked}>
            Native language and where you grew up start from your profile (From, Language) and follow it until you change them here. Edit those in{' '}
            <Link to={paths.mySpace} className={styles.linkedLink} onClick={onClose}>
              My Space
            </Link>
            .
          </p>
        )}

        <Chips label="Culture" options={CULTURE_TAGS} value={draft.culture} onToggle={(v) => set({ culture: toggle(draft.culture, v) })} />
        <Chips
          label="Native language(s)"
          options={NATIVE_LANGUAGES}
          value={draft.nativeLanguages}
          onToggle={(v) => set({ nativeLanguages: toggle(draft.nativeLanguages, v) })}
        />

        <div className={styles.field}>
          <label htmlFor={ids.grew} className={styles.label}>
            Where you grew up{linked.grewUp && draft.grewUp === withPrefill(stored, profile).grewUp && <span className={styles.optional}> · from your profile</span>}
          </label>
          <input
            id={ids.grew}
            className={styles.input}
            value={draft.grewUp}
            maxLength={60}
            placeholder="e.g. Penang or Toa Payoh"
            autoComplete="off"
            onChange={(e) => set({ grewUp: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={ids.bg} className={styles.label}>
            Background / ethnicity <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id={ids.bg}
            className={styles.input}
            value={draft.background}
            maxLength={60}
            autoComplete="off"
            aria-describedby={ids.bgNote}
            onChange={(e) => set({ background: e.target.value })}
          />
          <div className={styles.switchRow}>
            <span id={ids.bgNote} className={styles.note}>
              {draft.showBackground ? 'Shown on your map profile.' : 'Private — only you see this unless you show it.'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={draft.showBackground}
              className={styles.switch}
              onClick={() => set({ showBackground: !draft.showBackground })}
            >
              <span>Show on my profile</span>
              <i aria-hidden="true">
                <b />
              </i>
            </button>
          </div>
        </div>

        <Chips label="Happy to help with" options={HELP_TOPICS} value={draft.helpWith} onToggle={(v) => set({ helpWith: toggle(draft.helpWith, v) })} />

        <div className={styles.preview} aria-labelledby={ids.preview} role="group">
          <p id={ids.preview} className={styles.previewLabel}>
            Others see:
          </p>
          {tags.length ? (
            <ul className={styles.tags}>
              {tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.text}>No tags yet — just your area.</p>
          )}
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={save}>
          Save
        </button>
        {memory.enabled && <p className={styles.memoryNote}>Saved to your memory in My Space</p>}
      </div>
      </div>
    </Sheet>
  );
}

function Chips({ label, options, value, onToggle }: { label: string; options: readonly string[]; value: string[]; onToggle: (v: string) => void }) {
  const id = useId();
  // Values not in the list (e.g. typed elsewhere) stay visible, so they can be removed.
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  return (
    <div className={styles.field} role="group" aria-labelledby={id}>
      <p id={id} className={styles.label}>
        {label}
      </p>
      <div className={styles.chips}>
        {all.map((o) => {
          const on = value.includes(o);
          return (
            <button key={o} type="button" className={on ? styles.chipOn : styles.chip} aria-pressed={on} onClick={() => onToggle(o)}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
