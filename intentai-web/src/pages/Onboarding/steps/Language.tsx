import { PreviewCard, PreviewRow } from '../PreviewCard/PreviewCard';
import QuestionHeader from '../QuestionHeader/QuestionHeader';
import { LANGS, LANG_PREVIEW_BODY, LANG_PREVIEW_EMPTY, PHOTOS, PREVIEW_KICKER } from '../options';
import motion from '../Onboarding.module.css';
import { choice, useRadioGroup } from './Choice';
import styles from './Language.module.css';
import type { StepDef, StepProps } from './types';

function Body({ data, update, embedded }: StepProps) {
  const group = useRadioGroup(
    LANGS.findIndex((o) => o.code === data.language),
    (i) => update({ language: LANGS[i].code }),
  );
  return (
    <>
      <QuestionHeader hidden={embedded} title="Which language do you prefer?" helpers={[{ icon: 'info', text: 'Used for translations on cards and in Ask' }]} />
      <div role="radiogroup" aria-label="Language" {...group.groupProps} className={`${choice.group} ${styles.grid}`}>
        {LANGS.map((l, i) => (
          <button
            key={l.code}
            type="button"
            role="radio"
            tabIndex={group.tabIndexFor(i)}
            aria-checked={data.language === l.code}
            aria-label={`${l.label}, ${l.sub}`}
            onClick={() => update({ language: l.code })}
            className={`${choice.tile} ${styles.tile} ${motion.press} ${motion.aUp}`}
            style={{ animationDelay: `${0.08 + i * 0.04}s` }}
          >
            <span aria-hidden="true" className={`${choice.chip} ${styles.chip}`}>
              {l.glyph}
            </span>
            <span className={styles.text}>
              <span className={styles.label}>{l.label}</span>
              <span className={styles.sub}>{l.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function Preview({ data }: StepProps) {
  const lang = LANGS.find((l) => l.code === data.language);
  return (
    <PreviewCard kicker={PREVIEW_KICKER.language} empty={lang === undefined}>
      <PreviewRow
        key={lang?.code ?? 'empty'}
        photo={PHOTOS.monument}
        title={lang?.previewTitle}
        chip={lang?.glyph}
        body={lang ? LANG_PREVIEW_BODY : LANG_PREVIEW_EMPTY}
      />
    </PreviewCard>
  );
}

export const step: StepDef = {
  id: 'language',
  shell: 'question',
  Body,
  Preview,
  answered: (data) => data.language !== null,
  blockedToast: 'Pick one to continue',
};
