import { CULTURE_TOPICS } from '../../../data/domain';
import motion from '../Onboarding.module.css';
import { PHOTOS, PREVIEW_KICKER, TOPIC_OPTIONS, topicsPreview } from '../options';
import { PreviewCard, PreviewRow } from '../PreviewCard/PreviewCard';
import QuestionHeader, { type QuestionHelper } from '../QuestionHeader/QuestionHeader';
import styles from './Topics.module.css';
import type { StepDef, StepProps } from './types';

const HELPERS: readonly QuestionHelper[] = [{ icon: 'info', text: 'Tap in order. Home shows your #1 first' }];

/** O7: tap-to-rank. Tapping an unranked tile ranks it next; tapping a ranked one removes just that one. */
function Body({ data, update, embedded }: StepProps) {
  const ranks = data.topics;
  return (
    <>
      <QuestionHeader hidden={embedded} title="Rank the topics you enjoy most" helpers={HELPERS} />
      <div role="group" aria-label="Topics, tap to rank" className={styles.grid}>
        {TOPIC_OPTIONS.map((o, i) => {
          const r = ranks.indexOf(o.id);
          const ranked = r >= 0;
          return (
            <button
              key={o.id}
              type="button"
              className={`${styles.tile} ${ranked ? styles.ranked : ''} ${motion.aUp}`}
              style={{ animationDelay: `${(0.08 + i * 0.05).toFixed(2)}s` }}
              aria-label={`${o.label}, ${ranked ? `ranked ${r + 1}. Tap to remove` : 'not ranked. Tap to rank next'}`}
              onClick={() => update({ topics: ranked ? ranks.filter((t) => t !== o.id) : [...ranks, o.id] })}
            >
              <img src={PHOTOS[o.photo].src} alt="" className={styles.photo} />
              <span aria-hidden="true" className={styles.shade} />
              <span className={styles.label}>{o.label}</span>
              {ranked ? (
                <span className={`${styles.rank} ${motion.aPop}`}>{r + 1}</span>
              ) : (
                <span aria-hidden="true" className={styles.slot} />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`${styles.reset} ${motion.press} ${motion.aUp}`}
        style={{ animationDelay: '0.3s' }}
        data-dim={ranks.length === 0}
        onClick={() => update({ topics: [] })}
      >
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12a8 8 0 1 1-2.4-5.7" />
          <path d="M20 4v5h-5" />
        </svg>
        Reset order
      </button>
    </>
  );
}

/** Home feed preview: the #1 topic's photo with a rank badge, then the order of the rest. */
function Preview({ data }: StepProps) {
  const p = topicsPreview(data.topics);
  const empty = data.topics.length === 0;
  return (
    <PreviewCard kicker={PREVIEW_KICKER.topics} empty={empty}>
      {/* topicsPreview carries the #1 rank in `chip`; on this step it is the badge on the thumb. */}
      <PreviewRow key={empty ? 'empty' : data.topics.join('-')} photo={p.photo} title={p.title} badge={p.chip} body={p.body} />
    </PreviewCard>
  );
}

export const step: StepDef = {
  id: 'topics',
  shell: 'question',
  Body,
  Preview,
  answered: (data) => data.topics.length === CULTURE_TOPICS.length,
  blockedToast: 'Tap all 4 topics to set the order',
  ctaLabel: 'Stamp my passport',
};
