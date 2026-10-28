import { PreviewCard, PreviewRow } from '../PreviewCard/PreviewCard';
import QuestionHeader from '../QuestionHeader/QuestionHeader';
import { PHOTOS, PREVIEW_KICKER, ROLES, ROLE_PREVIEW_EMPTY } from '../options';
import motion from '../Onboarding.module.css';
import { CheckBadge, TileIcon, choice, useRadioGroup } from './Choice';
import styles from './Role.module.css';
import type { StepDef, StepProps } from './types';

function Body({ data, update, embedded }: StepProps) {
  const group = useRadioGroup(
    ROLES.findIndex((o) => o.code === data.role),
    (i) => update({ role: ROLES[i].code }),
  );
  return (
    <>
      <QuestionHeader hidden={embedded} title="What brings you to Singapore?" helpers={[{ icon: 'info', text: 'Used to pick examples that suit your days' }]} />
      <div role="radiogroup" aria-label="What brings you here" {...group.groupProps} className={`${choice.group} ${styles.grid}`}>
        {ROLES.map((r, i) => (
          <button
            key={r.code}
            type="button"
            role="radio"
            tabIndex={group.tabIndexFor(i)}
            aria-checked={data.role === r.code}
            onClick={() => update({ role: r.code })}
            className={`${choice.tile} ${styles.tile} ${motion.press} ${motion.aUp}`}
            style={{ animationDelay: `${0.08 + i * 0.04}s` }}
          >
            <span aria-hidden="true" className={`${choice.chip} ${styles.chip}`}>
              <TileIcon icon={r.icon} size={21} stroke={2} />
            </span>
            <span className={styles.label}>{r.label}</span>
            {data.role === r.code && <CheckBadge className={styles.badge} />}
          </button>
        ))}
      </div>
    </>
  );
}

function Preview({ data }: StepProps) {
  const role = ROLES.find((r) => r.code === data.role);
  return (
    <PreviewCard kicker={PREVIEW_KICKER.role} empty={role === undefined}>
      <PreviewRow
        key={role?.code ?? 'empty'}
        photo={PHOTOS[role?.photo ?? 'wall']}
        title={role?.previewTitle}
        body={role ? role.previewBody : ROLE_PREVIEW_EMPTY}
      />
    </PreviewCard>
  );
}

export const step: StepDef = {
  id: 'role',
  shell: 'question',
  Body,
  Preview,
  answered: (data) => data.role !== null,
  blockedToast: 'Pick one to continue',
};
