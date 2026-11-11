// Pieces shared by the v2 onboarding screens (boards 02–04): the progress header and the home-feed preview.
import { useNavigate } from 'react-router-dom';
import CategoryBadge from '../../components/Category/CategoryBadge';
import { usePersistentStore } from '../../data/persistentStore';
import { onboardingStore } from '../../data/stores';
import { TOURISM_CATEGORIES, TOURISM_INFO, type TourismCategory } from '../../data/tourism';
import { paths } from '../../routes';
import { STEPS, feedPreview, leadLines } from './flow';
import Icon from './v3/icons';
import styles from './Onboarding.module.css';

/** Back · 3-segment bar · n/3 · close (boards 02–04). */
export function ProgressHeader({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <header className={styles.progressRow}>
      <button type="button" className={styles.round} aria-label="Back" onClick={onBack}>
        <Icon name="back" size={20} />
      </button>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Questions"
        aria-valuemin={1}
        aria-valuemax={STEPS}
        aria-valuenow={step}
        aria-valuetext={`Step ${step} of ${STEPS}`}
      >
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={i < step ? `${styles.segment} ${styles.segmentOn}` : styles.segment} />
        ))}
      </div>
      <span className={styles.count} aria-hidden="true">
        {step}/{STEPS}
      </span>
      <ExitButton />
    </header>
  );
}

/**
 * Leave onboarding. Someone who finished it before goes back to the Passport tab with nothing changed; a first-time
 * user skips the rest: onboarding counts as done (so "/" opens Home) and nothing from the draft is saved.
 */
function ExitButton() {
  const navigate = useNavigate();
  const [onboarding] = usePersistentStore(onboardingStore);
  const returning = onboarding.done;
  return (
    <button
      type="button"
      className={styles.round}
      aria-label={returning ? 'Leave onboarding' : 'Skip onboarding'}
      onClick={() => {
        if (returning) navigate(paths.mySpace);
        else {
          onboardingStore.set((prev) => ({ ...prev, done: true }));
          navigate(paths.today);
        }
      }}
    >
      <Icon name="close" size={20} />
    </button>
  );
}

/** Board 02 "Preview · your home feed": two real places in ranking order, and what Home leads with. */
export function FeedPreview({ ranking }: { ranking: TourismCategory[] }) {
  const feed = feedPreview(ranking);
  const [lead, then] = leadLines(ranking);
  const chips = [...ranking, ...TOURISM_CATEGORIES.filter((c) => !ranking.includes(c))];
  return (
    <section className={styles.preview} aria-label="Preview of your home feed">
      <div className={styles.previewHead}>
        <span className={styles.kicker}>
          <Icon name="star" size={12} fill="currentColor" />
          Preview · your home feed
        </span>
        <span className={styles.previewCount}>{ranking.length} of 4</span>
      </div>
      <div className={styles.previewCard}>
        <div className={styles.previewChips} aria-hidden="true">
          <span className={`${styles.previewChip} ${styles.previewChipAll}`}>All</span>
          {chips.map((c) => {
            const on = ranking.includes(c);
            const info = TOURISM_INFO[c];
            return (
              <span
                key={c}
                className={on ? styles.previewChip : `${styles.previewChip} ${styles.previewChipOff}`}
                style={on ? { background: `var(--cat-${c}-tint)`, color: `var(--cat-${c}-ink)` } : undefined}
              >
                <span className={styles.dot} style={{ background: `var(--cat-${c})` }} />
                {info.label}
              </span>
            );
          })}
        </div>
        {feed.length > 0 ? (
          <ul className={styles.feed}>
            {feed.map((p) => (
              <li key={p.id} className={styles.feedCard}>
                <img src={p.photo} alt="" className={styles.feedImg} />
                <CategoryBadge category={p.category} className={styles.feedBadge} />
                <span className={styles.feedShade} aria-hidden="true" />
                <span className={styles.feedTitle}>{p.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.feedEmpty}>Pick a category to see your feed</p>
        )}
        <p className={styles.lead}>
          <b>{lead}</b> {then}
        </p>
      </div>
    </section>
  );
}
