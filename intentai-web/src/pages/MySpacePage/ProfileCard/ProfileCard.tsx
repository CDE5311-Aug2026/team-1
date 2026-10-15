import { useState, type FormEvent } from 'react';
import pencil from '../../../assets/my-space/action-pencil.svg';
import trash from '../../../assets/my-space/action-trash.svg';
import cap from '../../../assets/my-space/field-cap.svg';
import clock from '../../../assets/my-space/field-clock.svg';
import globe from '../../../assets/my-space/field-globe.svg';
import Dialog from '../../../components/Dialog/Dialog';
import { PROFILE_FIELDS, type ProfileField } from '../../../data/domain';
import { usePersistentStore } from '../../../data/persistentStore';
import { profileStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import styles from './ProfileCard.module.css';
import { requireText } from '../../../hooks/requireText';

const FIELD_META: Record<ProfileField, { icon: string; hint: string }> = {
  from: { icon: globe, hint: 'Used for translations' },
  time: { icon: clock, hint: 'Used for how much context to add' },
  role: { icon: cap, hint: 'Used for picking examples' },
};

/** "Card / Profile" (21:1347): what the app knows, each field editable and deletable with Undo. */
export default function ProfileCard({ nodeId }: { nodeId: string }) {
  const [profile, setProfile] = usePersistentStore(profileStore);
  const [editing, setEditing] = useState<(typeof PROFILE_FIELDS)[number] | null>(null);

  const remove = (key: ProfileField) => {
    const old = profile[key];
    setProfile((previous) => ({ ...previous, [key]: '' }));
    showToast('Detail deleted', { undo: () => setProfile((previous) => ({ ...previous, [key]: old })) });
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const value = requireText(event.currentTarget, 'value');
    if (value === null) return;
    setProfile((previous) => ({ ...previous, [editing.key]: value }));
    setEditing(null);
    showToast('Saved on this device');
  };

  return (
    <div className={styles.card} data-node-id={nodeId}>
      {PROFILE_FIELDS.map((field) => {
        const value = profile[field.key];
        return (
          <div key={field.key} className={styles.row}>
            <img src={FIELD_META[field.key].icon} alt="" width={18} height={18} />
            <div className={styles.text}>
              <p className={styles.line}>
                <span className={styles.label}>{field.label}</span>
                <span className={value ? styles.value : `${styles.value} ${styles.unset}`}>{value || 'Not set'}</span>
              </p>
              <p className={styles.hint}>{FIELD_META[field.key].hint}</p>
            </div>
            <button type="button" className={styles.action} aria-label={`Edit ${field.label}`} onClick={() => setEditing(field)}>
              <img src={pencil} alt="" width={16} height={16} />
            </button>
            <button
              type="button"
              className={styles.action}
              aria-label={`Delete ${field.label}`}
              onClick={() => remove(field.key)}
              disabled={!value}
            >
              <img src={trash} alt="" width={16} height={16} />
            </button>
          </div>
        );
      })}

      {editing && (
        <Dialog title={`Edit ${editing.label}`} onClose={() => setEditing(null)}>
          <form className={styles.form} onSubmit={save}>
            <label>
              {editing.label}
              <input name="value" defaultValue={profile[editing.key]} required maxLength={60} autoComplete="off" />
            </label>
            <div className="dialog-row">
              <button type="button" className="dialog-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="dialog-primary">
                Save
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
