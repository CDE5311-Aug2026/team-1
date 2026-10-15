import { useNavigate } from 'react-router-dom';
import check from '../../assets/onboarding/icon-check.svg';
import home from '../../assets/onboarding/icon-home.svg';
import pin from '../../assets/onboarding/icon-pin.svg';
import plane from '../../assets/onboarding/icon-plane.svg';
import { DURATIONS, type Duration } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { onboardingStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import AiHint from './AiHint';
import { timeHint } from './copy';
import MaskIcon from './MaskIcon';
import OnboardingScreen from './OnboardingScreen';
import screen from './OnboardingScreen.module.css';
import StepHeader from './StepHeader';
import styles from './TimePage.module.css';
import text from './text.module.css';

const OPTIONS: Record<Duration, { nodeId: string; icon: string; note: string }> = {
  'Less than 3 months': { nodeId: '17:99', icon: plane, note: 'Just landed — start with essentials' },
  '3 months – 1 year': { nodeId: '17:106', icon: pin, note: 'Settling in, picking up phrases' },
  '1 – 3 years': { nodeId: '17:116', icon: home, note: 'Comfortable, want to sound local' },
};

export default function TimePage() {
  const navigate = useNavigate();
  const [onboarding, setOnboarding] = usePersistentStore(onboardingStore);

  return (
    <OnboardingScreen
      footer={
        <button
          type="button"
          className={screen.primary}
          data-node-id="17:133"
          onClick={() => {
            if (!onboarding.duration) {
              showToast('Pick how long you have been here.');
              return;
            }
            navigate(paths.onboardingTopics);
          }}
        >
          Continue
        </button>
      }
    >
      <StepHeader step={1} backTo={paths.welcome} backNodeId="17:90" />
      <h1 className={text.title} data-node-id="17:97">
        How long have you been in Singapore?
      </h1>
      <p className={text.lead}>We&apos;ll pitch your lessons at the right level.</p>
      <ul className={styles.options}>
        {DURATIONS.map((duration) => {
          const { nodeId, icon, note } = OPTIONS[duration];
          const selected = onboarding.duration === duration;
          return (
            <li key={duration}>
              <button
                type="button"
                className={styles.option}
                aria-pressed={selected}
                data-node-id={nodeId}
                onClick={() => setOnboarding((prev) => ({ ...prev, duration }))}
              >
                <span className={styles.tile}>
                  <MaskIcon src={icon} size={20} color={selected ? 'var(--accent)' : 'var(--ob-icon-off)'} />
                </span>
                <span className={styles.copy}>
                  <span className={styles.name}>{duration}</span>
                  <span className={styles.note}>{note}</span>
                </span>
                <span className={styles.radio}>{selected && <img src={check} alt="" width={14} height={14} />}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className={styles.hint}>
        <AiHint nodeId="17:125">{timeHint(onboarding.duration)}</AiHint>
      </div>
    </OnboardingScreen>
  );
}
