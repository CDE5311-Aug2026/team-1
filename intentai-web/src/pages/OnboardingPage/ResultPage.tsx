import { useNavigate, useSearchParams } from 'react-router-dom';
import aiLogo from '../../assets/onboarding/ai-logo.svg';
import clock from '../../assets/onboarding/icon-clock.svg';
import pinSmall from '../../assets/onboarding/icon-pin-small.svg';
import target from '../../assets/onboarding/icon-target.svg';
import { LEVELS, levelFor, type Topic } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { onboardingStore, profileStore } from '../../data/stores';
import { paths } from '../../routes';
import AiHint from './AiHint';
import { focusLabel, parseScore, planHint, resultSummary } from './copy';
import OnboardingScreen from './OnboardingScreen';
import screen from './OnboardingScreen.module.css';
import { QUIZ_LENGTH } from './quiz';
import styles from './ResultPage.module.css';

const LEVEL_RANGE = ['0–1 correct', '2/3 correct', '3/3 correct'] as const;
const FALLBACK_TOPICS: Topic[] = ['Work'];

export default function ResultPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [onboarding, setOnboarding] = usePersistentStore(onboardingStore);
  const score = parseScore(params.get('score'));
  const level = levelFor(score);
  const levelIndex = LEVELS.indexOf(level);
  // The quiz falls back to Work when no topic is chosen; the plan says the same.
  const topics = onboarding.topics.length > 0 ? onboarding.topics : FALLBACK_TOPICS;

  const handleStart = () => {
    profileStore.set((profile) => ({ ...profile, time: onboarding.duration ?? profile.time, level, topics }));
    // The quiz and My Space follow these topics, so store the fallback too when none were picked.
    setOnboarding((prev) => ({ ...prev, topics, done: true }));
    // Onboarding is done here; the culture topic picker next can keep the top 3.
    navigate(paths.todaySetup);
  };

  const plan = [
    { icon: clock, title: 'Singlish practice', note: 'Phrases for the topics you picked' },
    { icon: target, title: focusLabel(topics), note: 'Picked from your interests' },
    { icon: pinSmall, title: onboarding.duration ? `Tuned for ${onboarding.duration}` : 'Tuned to your level', note: 'Everyday phrases first, slang later' },
  ];

  return (
    <OnboardingScreen
      footer={
        <>
          <button
            type="button"
            className={screen.secondary}
            data-node-id="17:336"
            onClick={() => navigate(paths.onboardingQuiz)}
          >
            Retake the quiz
          </button>
          <button type="button" className={screen.primary} data-node-id="17:337" onClick={handleStart}>
            Start learning
          </button>
        </>
      }
    >
      <p className={styles.badge}>
        <img src={aiLogo} alt="" width={28} height={28} />
        Your IntentAI results
      </p>
      <h1 className={styles.title} data-node-id="17:290">
        You&apos;re <span className={styles.level}>{level}</span>
      </h1>
      <p className={styles.summary}>{resultSummary(score)}</p>

      <section className={styles.levelCard} data-node-id="17:292" aria-labelledby="ob-level-title">
        <div className={styles.levelHead}>
          <h2 id="ob-level-title">Your Singlish level</h2>
          <span className={styles.score}>
            {score}/{QUIZ_LENGTH}
          </span>
        </div>
        <ol className={styles.levels} aria-label="Singlish levels">
          {LEVELS.map((name, i) => (
            <li key={name} aria-current={i === levelIndex ? 'true' : undefined}>
              <span className={i <= levelIndex ? styles.barOn : styles.barOff} />
              <span className={styles.levelName}>{name}</span>
              <span className={styles.levelRange}>{LEVEL_RANGE[i]}</span>
            </li>
          ))}
        </ol>
      </section>

      <h2 className={styles.planTitle}>Your personalised plan</h2>
      <ul className={styles.plan} data-node-id="17:306">
        {plan.map(({ icon, title, note }) => (
          <li key={note}>
            <span className={styles.planIcon}>
              <img src={icon} alt="" width={18} height={18} />
            </span>
            <span className={styles.planCopy}>
              <span className={styles.planName}>{title}</span>
              <span className={styles.planNote}>{note}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.hint}>
        <AiHint nodeId="17:328">{planHint()}</AiHint>
      </div>
    </OnboardingScreen>
  );
}
