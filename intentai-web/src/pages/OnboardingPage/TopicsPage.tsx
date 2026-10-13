import { useNavigate } from 'react-router-dom';
import check from '../../assets/onboarding/icon-check.svg';
import { TOPICS, type Topic } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { onboardingStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import AiHint from './AiHint';
import { topicsHint } from './copy';
import MaskIcon from './MaskIcon';
import OnboardingScreen from './OnboardingScreen';
import screen from './OnboardingScreen.module.css';
import StepHeader from './StepHeader';
import text from './text.module.css';
import { TOPIC_ICON } from './topicArt';
import styles from './TopicsPage.module.css';

const TILES: Record<Topic, { nodeId: string; note: string; sample: string }> = {
  Work: { nodeId: '17:158', note: 'Meetings, emails & office chat', sample: '“Can or not?”' },
  Food: { nodeId: '17:171', note: 'Hawker orders & makan plans', sample: '“Mee siam, tapau”' },
  'Daily life': { nodeId: '17:183', note: 'Neighbours, shops & errands', sample: '“Chope a seat”' },
  'Getting around': { nodeId: '17:193', note: 'MRT, buses & Grab rides', sample: '“Paiseh, excuse me”' },
};

export default function TopicsPage() {
  const navigate = useNavigate();
  const [onboarding, setOnboarding] = usePersistentStore(onboardingStore);
  const { topics } = onboarding;

  const toggle = (topic: Topic) =>
    setOnboarding((prev) => ({
      ...prev,
      // Keep the canonical order so copy and the quiz read naturally.
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : TOPICS.filter((t) => t === topic || prev.topics.includes(t)),
    }));

  const handleContinue = () => {
    if (topics.length === 0) {
      showToast('Pick at least one topic.');
      return;
    }
    navigate(paths.onboardingQuiz);
  };

  return (
    <OnboardingScreen
      footer={
        <button type="button" className={screen.primary} data-node-id="17:213" onClick={handleContinue}>
          Continue · {topics.length} selected
        </button>
      }
    >
      <StepHeader step={2} backTo={paths.onboardingTime} backNodeId="17:149" />
      <h1 className={text.title} data-node-id="17:156">
        What do you want to learn first?
      </h1>
      <p className={text.lead}>Pick all that apply — we&apos;ll build your daily three around them.</p>
      <ul className={styles.grid}>
        {TOPICS.map((topic) => {
          const { nodeId, note, sample } = TILES[topic];
          const selected = topics.includes(topic);
          return (
            <li key={topic}>
              <button
                type="button"
                className={styles.tile}
                aria-pressed={selected}
                data-node-id={nodeId}
                onClick={() => toggle(topic)}
              >
                <span className={styles.top}>
                  <span className={styles.iconTile}>
                    <MaskIcon
                      src={TOPIC_ICON[topic]}
                      size={20}
                      color={selected ? 'var(--accent)' : 'var(--ob-icon-off)'}
                    />
                  </span>
                  <span className={styles.checkbox}>
                    {selected && <img src={check} alt="" width={14} height={14} />}
                  </span>
                </span>
                <span className={styles.name}>{topic}</span>
                <span className={styles.note}>{note}</span>
                <span className={styles.sample}>{sample}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className={styles.hint}>
        <AiHint nodeId="17:205">{topicsHint(onboarding.duration, topics)}</AiHint>
      </div>
    </OnboardingScreen>
  );
}
