import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import speaker from '../../assets/onboarding/icon-speaker.svg';
import workSmall from '../../assets/onboarding/icon-work-small.svg';
import { usePersistentStore } from '../../data/persistentStore';
import { onboardingStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import MaskIcon from './MaskIcon';
import OnboardingScreen from './OnboardingScreen';
import screen from './OnboardingScreen.module.css';
import styles from './QuizPage.module.css';
import { QUIZ_LENGTH, quizFor } from './quiz';
import StepHeader from './StepHeader';
import text from './text.module.css';
import { TOPIC_ICON } from './topicArt';
import useSay from './useSay';

const LETTERS = ['A', 'B', 'C'] as const;
const ANSWER_NODES = ['17:255', '17:259', '17:263'] as const;

/** Quiz progress lives here; a reload restarts the quiz. The score goes to the result in the URL. */
export default function QuizPage() {
  const navigate = useNavigate();
  const say = useSay();
  const [{ topics }] = usePersistentStore(onboardingStore);
  const quiz = useMemo(() => quizFor(topics), [topics]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const question = quiz[index];

  const next = (gained: number) => {
    const total = score + gained;
    if (index >= QUIZ_LENGTH - 1) {
      navigate(`${paths.onboardingResult}?score=${total}`);
      return;
    }
    setScore(total);
    setIndex(index + 1);
    setChoice(null);
  };

  const handleCheck = () => {
    if (choice === null) {
      showToast('Choose an answer or skip.');
      return;
    }
    next(choice === question.correct ? 1 : 0);
  };

  return (
    <OnboardingScreen
      footer={
        <>
          <button type="button" className={screen.secondary} data-node-id="17:267" onClick={() => next(0)}>
            Not sure? Skip this one
          </button>
          <button type="button" className={screen.primary} data-node-id="17:268" onClick={handleCheck}>
            Check answer
          </button>
        </>
      }
    >
      <StepHeader step={3} backTo={paths.onboardingTopics} backNodeId="17:229" />
      <h1 className={text.title}>Test your Singlish level</h1>
      <p className={text.lead}>3 short questions. No pressure — this just sets your starting point.</p>
      <div className={styles.counter}>
        <p aria-live="polite">
          Question {index + 1} of {QUIZ_LENGTH}
        </p>
        <span className={styles.dots} aria-hidden="true">
          {quiz.map((q, i) => (
            <span key={q.id} className={i <= index ? styles.dotOn : styles.dotOff} />
          ))}
        </span>
      </div>
      <section className={styles.card} data-node-id="17:242" aria-label="Question">
        <div className={styles.cardTop}>
          <span className={styles.context}>
            <MaskIcon
              src={question.topic === 'Work' ? workSmall : TOPIC_ICON[question.topic]}
              size={14}
              color="var(--text-chip)"
            />
            {question.context}
          </span>
          <button
            type="button"
            className={styles.play}
            aria-label="Play question"
            data-node-id="17:249"
            onClick={() => say(question.phrase.replace(/[“”]/g, ''))}
          >
            <img src={speaker} alt="" width={16} height={16} />
          </button>
        </div>
        <p className={styles.phrase}>{question.phrase}</p>
        <p className={styles.prompt}>{question.prompt}</p>
      </section>
      <ul className={styles.answers}>
        {question.answers.map((answer, i) => (
          <li key={answer}>
            <button
              type="button"
              className={styles.answer}
              aria-pressed={choice === i}
              data-node-id={ANSWER_NODES[i]}
              onClick={() => setChoice(i)}
            >
              <span className={styles.letter}>{LETTERS[i]}</span>{' '}
              {answer}
            </button>
          </li>
        ))}
      </ul>
    </OnboardingScreen>
  );
}
