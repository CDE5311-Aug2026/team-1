import type { CSSProperties } from 'react';
import { PreviewCard, PreviewRow } from '../PreviewCard/PreviewCard';
import QuestionHeader from '../QuestionHeader/QuestionHeader';
import { COUNTRIES, PREVIEW_KICKER, fromPreview, type CountryOption } from '../options';
import motion from '../Onboarding.module.css';
import { CheckBadge, choice, useRadioGroup } from './Choice';
import styles from './From.module.css';
import type { StepDef, StepProps } from './types';

const HELPERS = [
  { icon: 'info', text: 'Used to compare customs with home' },
  { icon: 'eye', text: 'Private by default · tap the eye to show it' },
] as const;

const PRIMARY = COUNTRIES.filter((c) => c.primary);
const MORE = COUNTRIES.filter((c) => !c.primary);

function flag(c: CountryOption): CSSProperties {
  return { '--flag': c.color } as CSSProperties;
}

function Body({ data, update, embedded }: StepProps) {
  const group = useRadioGroup(
    COUNTRIES.findIndex((c) => c.name === data.from),
    (i) => update({ from: COUNTRIES[i].name }),
  );
  return (
    <>
      <QuestionHeader hidden={embedded} title="Where are you from?" helpers={HELPERS} />
      <div role="radiogroup" aria-label="Where you are from" {...group.groupProps} className={styles.outer}>
        <div className={styles.grid}>
          {PRIMARY.map((c, i) => (
            <button
              key={c.name}
              type="button"
              role="radio"
              tabIndex={group.tabIndexFor(i)}
              aria-checked={data.from === c.name}
              onClick={() => update({ from: c.name })}
              className={`${choice.tile} ${styles.tile} ${motion.press} ${motion.aUp}`}
              style={{ animationDelay: `${0.08 + i * 0.04}s` }}
            >
              <span aria-hidden="true" className={`${choice.chip} ${choice.chipFlag} ${styles.chip}`} style={flag(c)}>
                {c.code}
              </span>
              <span className={styles.label}>{c.name}</span>
              {data.from === c.name && <CheckBadge className={styles.badge} />}
            </button>
          ))}
        </div>
        <div role="group" aria-label="More countries" tabIndex={0} className={`${styles.more} ${motion.aUp}`} style={{ animationDelay: '0.3s' }}>
          {MORE.map((c, j) => (
            <button
              key={c.name}
              type="button"
              role="radio"
              tabIndex={group.tabIndexFor(PRIMARY.length + j)}
              aria-checked={data.from === c.name}
              onClick={() => update({ from: c.name })}
              className={`${choice.tile} ${styles.pill} ${motion.press}`}
            >
              <span aria-hidden="true" className={`${choice.chip} ${choice.chipFlag} ${styles.pillChip}`} style={flag(c)}>
                {c.code}
              </span>
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function Preview({ data }: StepProps) {
  const p = fromPreview(data.from);
  return (
    <PreviewCard kicker={PREVIEW_KICKER.from} empty={data.from === null}>
      <PreviewRow key={data.from ?? 'empty'} photo={p.photo} title={p.title} chip={p.chip} body={p.body} />
    </PreviewCard>
  );
}

export const step: StepDef = {
  id: 'from',
  shell: 'question',
  Body,
  Preview,
  answered: (data) => data.from !== null,
  blockedToast: 'Pick one to continue',
};
