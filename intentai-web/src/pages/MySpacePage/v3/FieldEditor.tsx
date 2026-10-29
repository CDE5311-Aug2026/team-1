// "Every field has its own visual editor" (Figma S1/S4): the onboarding tiles, timeline, map and photo ranking in a sheet,
// with Cancel / Save and a Clear button. Saving writes through to the stores the rest of the app reads.
import { useState } from 'react';
import { FIELD_LABELS, FIELD_USES, STAYS, updateProfile, type FieldKey, type ProfileV3 } from '../../../data/profile/profile';
import { showToast } from '../../../hooks/useToast';
import Icon, { type IconName } from '../../OnboardingPage/v3/icons';
import { BaseMap, CountryPicker, LanguagePicker, PreviewCard, RolePicker, StayTimeline, TopicRanker } from '../../OnboardingPage/v3/Pickers';
import { previewFor } from '../../OnboardingPage/v3/previews';
import Sheet from './Sheet';
import styles from './MySpace.module.css';

export const FIELD_ICONS: Record<FieldKey, IconName> = {
  from: 'globe',
  stay: 'clock',
  role: 'badge',
  language: 'chat',
  base: 'pin',
  topics: 'star',
};

const TITLES: Record<FieldKey, string> = { ...FIELD_LABELS, stay: 'Time in Singapore' };

function cleared(field: FieldKey): Partial<ProfileV3> {
  return field === 'topics' ? { topics: [] } : { [field]: null };
}

export default function FieldEditor({ field, profile, onClose }: { field: FieldKey; profile: ProfileV3; onClose: () => void }) {
  // The timeline always shows a stay: an unset one starts at the first stop.
  const [draft, setDraft] = useState<ProfileV3>(() => (field === 'stay' && profile.stay === null ? { ...profile, stay: STAYS[0].id } : profile));
  const set = (patch: Partial<ProfileV3>) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    const patch: Partial<ProfileV3> = { [field]: draft[field] };
    updateProfile(patch);
    showToast(`${TITLES[field]} saved`);
    onClose();
  };

  const clear = () => {
    const before = { [field]: profile[field] } as Partial<ProfileV3>;
    updateProfile(cleared(field));
    showToast(`${TITLES[field]} cleared`, { undo: () => updateProfile(before) });
    onClose();
  };

  const editor = (() => {
    switch (field) {
      case 'from':
        return <CountryPicker value={draft.from} onChange={(from) => set({ from })} />;
      case 'stay':
        return (
          <>
            <StayTimeline value={draft.stay ?? STAYS[0].id} onChange={(stay) => set({ stay })} />
            <p className={styles.sheetHint}>Drag along the timeline. Cards add less background the longer you stay.</p>
          </>
        );
      case 'role':
        return <RolePicker value={draft.role} onChange={(role) => set({ role })} />;
      case 'language':
        return <LanguagePicker value={draft.language} onChange={(language) => set({ language })} />;
      case 'base':
        return <BaseMap value={draft.base} onChange={(base) => set({ base })} />;
      case 'topics':
        return <TopicRanker value={draft.topics} onChange={(topics) => set({ topics })} />;
    }
  })();

  const canSave = field === 'topics' ? draft.topics.length > 0 : draft[field] !== null;

  return (
    <Sheet
      title={TITLES[field]}
      subtitle={FIELD_USES[field]}
      icon={<Icon name={FIELD_ICONS[field]} size={20} />}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.trash} aria-label={`Clear ${TITLES[field]}`} onClick={clear}>
            <Icon name="trash" size={20} />
          </button>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.save} disabled={!canSave} onClick={save}>
            Save
          </button>
        </>
      }
    >
      {editor}
      {field !== 'stay' && <PreviewCard preview={previewFor(field, draft)} />}
    </Sheet>
  );
}
