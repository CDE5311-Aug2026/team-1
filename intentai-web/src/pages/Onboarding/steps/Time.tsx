import { PreviewCard, PreviewRow } from '../PreviewCard/PreviewCard';
import QuestionHeader from '../QuestionHeader/QuestionHeader';
import { PHOTOS, PREVIEW_KICKER, TIMES, TIME_METER_WIDTHS, TIME_PREVIEW_EMPTY, TIME_PREVIEW_TITLE } from '../options';
import motion from '../Onboarding.module.css';
import { CheckBadge, TileIcon, choice, useRadioGroup } from './Choice';
import styles from './Time.module.css';
import type { StepDef, StepProps } from './types';

function Body({ data, update }: StepProps) {
  const group = useRadioGroup(
    TIMES.findIndex((o) => o.code === data.time),
    (i) => update({ time: TIMES[i].code }),
  );
  return (
    <>
      <QuestionHeader title="How long have you been in Singapore?" helpers={[{ icon: 'info', text: 'Used to decide how much background each card gives' }]} />
      <div role="radiogroup" aria-label="Time in Singapore" {...group.groupProps} className={`${choice.group} ${styles.grid}`}>
        {TIMES.map((t, i) => (
          <button
            key={t.code}
            type="button"
            role="radio"
            tabIndex={group.tabIndexFor(i)}
            aria-checked={data.time === t.code}
            onClick={() => update({ time: t.code })}
            className={`${choice.tile} ${styles.tile} ${motion.press} ${motion.aUp}`}
            style={{ animationDelay: `${0.08 + i * 0.05}s` }}
          >
            <span aria-hidden="true" className={`${choice.chip} ${styles.chip}`}>
              <TileIcon icon={t.icon} size={20} stroke={2.1} />
            </span>
            <span>
              <span className={styles.label}>{t.label}</span>{' '}
              <span className={styles.sub}>{t.sub}</span>
            </span>
            {data.time === t.code && <CheckBadge className={styles.badge} />}
          </button>
        ))}
      </div>
    </>
  );
}

/** Four bars; the first `4 - index` are filled (a longer stay fills fewer). */
function Meter({ index }: { index: number }) {
  return (
    <span className={styles.meter} aria-hidden="true" data-testid="time-meter">
      {TIME_METER_WIDTHS.map((w, b) => (
        <span key={b} className={styles.bar} style={{ width: b < 4 - index ? `${w}%` : 0 }} />
      ))}
    </span>
  );
}

function Preview({ data }: StepProps) {
  const index = TIMES.findIndex((t) => t.code === data.time);
  const option = TIMES[index];
  return (
    <PreviewCard kicker={PREVIEW_KICKER.time} empty={option === undefined}>
      <PreviewRow
        key={option?.code ?? 'empty'}
        photo={PHOTOS.monument}
        title={option ? TIME_PREVIEW_TITLE : undefined}
        body={option ? option.body : TIME_PREVIEW_EMPTY}
        aside={option ? <Meter index={index} /> : undefined}
      />
    </PreviewCard>
  );
}

export const step: StepDef = {
  id: 'time',
  shell: 'question',
  Body,
  Preview,
  answered: (data) => data.time !== null,
  blockedToast: 'Pick one to continue',
};
