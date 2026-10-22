import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import glow from '../../assets/onboarding/glow.svg';
import mascot from '../../assets/onboarding/mascot.png';
import { paths } from '../../routes';
import OnboardingScreen from './OnboardingScreen';
import screen from './OnboardingScreen.module.css';
import useSay from './useSay';
import styles from './WelcomePage.module.css';

// Pill centres and tilt from Figma 17:63–17:69, relative to the 350×290 hero box (x 20, y 148).
const PILLS = [
  { phrase: 'Chope', x: 58.53, y: 68.72, tilt: 6 },
  { phrase: 'Can or not?', x: 280.28, y: 50.31, tilt: -5 },
  { phrase: 'Paiseh', x: 70.1, y: 248.38, tilt: -4 },
  { phrase: 'Shiok!', x: 275.89, y: 248.03, tilt: 5 },
] as const;

export default function WelcomePage() {
  const navigate = useNavigate();
  const say = useSay();

  return (
    <OnboardingScreen
      footer={
        <button
          type="button"
          className={screen.primary}
          data-node-id="17:73"
          onClick={() => navigate(paths.onboardingTime)}
        >
          Get started
        </button>
      }
    >
      <div className={styles.hero}>
        <img className={styles.glow} src={glow} alt="" data-node-id="17:58" />
        <img className={styles.mascot} src={mascot} alt="" data-node-id="71:31" />
        {PILLS.map(({ phrase, x, y, tilt }) => (
          <button
            key={phrase}
            type="button"
            className={styles.pill}
            style={
              {
                left: `${(x / 350) * 100}%`,
                top: `${(y / 290) * 100}%`,
                '--tilt': `${tilt}deg`,
              } as CSSProperties
            }
            aria-label={`Hear “${phrase}”`}
            onClick={() => say(phrase)}
          >
            {phrase}
          </button>
        ))}
      </div>
      <h1 className={styles.title} data-node-id="17:71">
        <span>Hello, W!</span> <span>Welcome to IntentAI</span>
      </h1>
      <p className={styles.lead} data-node-id="17:72">
        Learn the Singlish locals really use — tailored to how long you&apos;ve been here and what you do every day.
      </p>
      {/* v2 class user test: usage timings (time only) go to the team's dashboard. */}
      <p className={styles.notice}>We record how long you spend on each page, anonymously, to improve the app.</p>
    </OnboardingScreen>
  );
}
