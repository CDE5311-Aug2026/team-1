import { useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import check from '../../assets/onboarding/icon-check.svg';
import { CATEGORIES, categoryLabel, type CategoryId } from '../../data/culture';
import { DEFAULT_PREFS, canonicalPrefs } from '../../data/culturePrefs';
import { culturePrefsStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import OnboardingScreen from '../OnboardingPage/OnboardingScreen';
import screen from '../OnboardingPage/OnboardingScreen.module.css';
import text from '../OnboardingPage/text.module.css';
import styles from './TodaySetup.module.css';

const PICKS = 3;
const TOP_THREE = DEFAULT_PREFS.categories.map(categoryLabel).join(', ');

/**
 * Pick Today's 3 culture topics, or Default to the survey's top 3 (first-time onboarding only). Picks stay
 * in this draft until "Show my Today"; leaving keeps the saved picks. From My Space (?from=my-space)
 * the draft starts from the saved picks and Cancel returns there.
 */
export default function TodaySetupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromMySpace = params.get('from') === 'my-space';
  const defaultsId = useId();
  const [picks, setPicks] = useState<CategoryId[]>(() =>
    fromMySpace ? [...culturePrefsStore.get().categories] : [],
  );

  const save = (categories: readonly CategoryId[]) => {
    culturePrefsStore.set(canonicalPrefs(categories));
    navigate(paths.today);
  };

  const toggle = (id: CategoryId) => {
    if (picks.includes(id)) setPicks(picks.filter((c) => c !== id));
    else if (picks.length >= PICKS) showToast('You’ve picked 3. Tap one to swap it.');
    else setPicks([...picks, id]);
  };

  const handleShow = () => {
    if (picks.length < PICKS) {
      showToast(fromMySpace ? 'Pick 3 topics.' : 'Pick 3 topics, or tap Default.');
      return;
    }
    save(picks);
  };

  return (
    <OnboardingScreen
      footer={
        <button type="button" className={screen.primary} onClick={handleShow}>
          Show my Today
        </button>
      }
    >
      <button
        type="button"
        className={styles.back}
        // Onboarding reaches this screen from the result; My Space opens it with ?from=my-space.
        onClick={() => (fromMySpace ? navigate(paths.mySpace) : navigate(-1))}
      >
        {fromMySpace ? 'Cancel' : 'Back'}
      </button>
      <h1 className={text.title}>Pick 3 topics for Today</h1>
      {!fromMySpace && (
        <>
          <div className={styles.defaultRow}>
            <button
              type="button"
              className={styles.default}
              aria-describedby={defaultsId}
              onClick={() => save(DEFAULT_PREFS.categories)}
            >
              Default
            </button>
            <span id={defaultsId} className={styles.defaults}>
              {TOP_THREE}
            </span>
          </div>
          <p className={styles.note}>You can change these anytime in My Space.</p>
        </>
      )}
      <p className={styles.count} aria-live="polite">
        {picks.length} of {PICKS} picked
      </p>
      <ul className={styles.grid}>
        {CATEGORIES.map((category) => {
          const selected = picks.includes(category.id);
          return (
            <li key={category.id}>
              <button type="button" className={styles.tile} aria-pressed={selected} onClick={() => toggle(category.id)}>
                <span className={styles.tileTop}>
                  <span className={styles.name}>{category.label}</span>
                  <span className={styles.checkbox}>{selected && <img src={check} alt="" width={14} height={14} />}</span>
                </span>
                <span className={styles.fullName}>{category.name}</span>
                <span className={styles.topic}>{category.topChoice}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </OnboardingScreen>
  );
}
