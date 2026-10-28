import { ONB_FIELDS, type OnbField, type Onboarding } from '../../../data/domain';
import { usePersistentStore } from '../../../data/persistentStore';
import { onboardingStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import { COUNTRIES, TIMES } from '../../Onboarding/options';
import { passportValue } from '../../Onboarding/PassportCard/passport';
import { EyeClosed, EyeOpen, Lock } from '../icons';
import styles from './KnowsGrid.module.css';

/** Tile label (canvas S1) and what the app uses the answer for. */
export const TILE: Record<OnbField, { name: string; used: string }> = {
  from: { name: 'From', used: 'Used to compare customs with home' },
  time: { name: 'In Singapore', used: 'Used to decide how much background cards give' },
  role: { name: 'Here as', used: 'Used to pick examples that suit your days' },
  language: { name: 'Language', used: 'Used for translations on cards and in Ask' },
  base: { name: 'Home base', used: 'Used as the point Nearby searches from' },
  topics: { name: 'Topics', used: 'Used to decide what Home shows first' },
};

/** The tile's value text ('' while unanswered). Time shows its full label, like the sheet. */
export function tileValue(data: Onboarding, field: OnbField): string {
  if (field === 'time') return TIMES.find((t) => t.code === data.time)?.label ?? '';
  return passportValue(data, field);
}

const CHIP: Record<OnbField, string> = { from: '', time: '', role: 'ID', language: 'Aa', base: 'SG', topics: '1 2 3' };

function Visual({ field, data }: { field: OnbField; data: Onboarding }) {
  if (field === 'from') {
    const country = COUNTRIES.find((c) => c.name === data.from);
    return (
      <span className={styles.fromVisual}>
        <span className={styles.flag} style={{ background: country?.color ?? '#CFC9BF' }}>
          {country?.code ?? '··'}
        </span>
        <span className={styles.arc} />
        <span className={styles.sg}>SG</span>
      </span>
    );
  }
  if (field === 'time') {
    const idx = Math.max(0, TIMES.findIndex((t) => t.code === data.time));
    return (
      <span className={styles.track}>
        <span className={styles.fill} style={{ width: `${(idx / 3) * 100}%` }} />
        {TIMES.map((t, j) => (
          <span key={t.code} className={`${styles.dot} ${j <= idx ? styles.dotOn : ''}`} style={{ left: `${(j / 3) * 100}%` }} />
        ))}
      </span>
    );
  }
  return <span className={styles.chip}>{CHIP[field]}</span>;
}

/** "What the app knows": six tiles that open the edit sheet, each with an eye toggle that makes it private. */
export default function KnowsGrid({ onEdit }: { onEdit: (field: OnbField) => void }) {
  const [onboarding, setOnboarding] = usePersistentStore(onboardingStore);

  const toggle = (field: OnbField) => {
    const hide = !onboarding.hidden.includes(field);
    setOnboarding((o) => ({ ...o, hidden: hide ? [...o.hidden, field] : o.hidden.filter((f) => f !== field) }));
    showToast(hide ? `${TILE[field].name} is now private` : `${TILE[field].name} is visible again`);
  };

  return (
    // Answers are personal: taps in here are never named in usage timings.
    <div className={styles.grid} data-no-track>
      {ONB_FIELDS.map((field) => {
        const { name, used } = TILE[field];
        const hidden = onboarding.hidden.includes(field);
        const raw = tileValue(onboarding, field);
        const unset = raw === '';
        const value = hidden ? 'Hidden' : unset ? 'Not set' : raw;
        return (
          <div key={field} className={`${styles.tile} ${hidden ? styles.hiddenTile : ''}`}>
            <button
              type="button"
              className={styles.open}
              aria-label={`${name}: ${hidden ? 'hidden' : value}. ${used}. Edit`}
              onClick={() => onEdit(field)}
            >
              <span className={styles.label}>{name}</span>
              <span className={`${styles.visual} ${hidden || unset ? styles.blurred : ''}`} aria-hidden="true">
                <Visual field={field} data={onboarding} />
              </span>
              <span className={`${styles.value} ${unset && !hidden ? styles.unset : ''} ${hidden ? styles.hiddenValue : ''}`}>
                {hidden && <Lock />}
                {value}
              </span>
              <span className={styles.used}>{used}</span>
            </button>
            <button
              type="button"
              className={`${styles.eye} ${hidden ? styles.eyeHidden : ''}`}
              aria-pressed={hidden}
              aria-label={`${hidden ? 'Show' : 'Hide'} ${name.toLowerCase()}`}
              onClick={() => toggle(field)}
            >
              {hidden ? <EyeClosed /> : <EyeOpen />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
