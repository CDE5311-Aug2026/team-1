import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import chevronLeft from '../../assets/community/chevron-left.svg';
import stepDone from '../../assets/community/step-done.svg';
import stepNow from '../../assets/community/step-now.svg';
import stepTodo from '../../assets/community/step-todo.svg';
import type { Question } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { lookupsStore, questionsStore, settingsStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import CommunityLayout from './CommunityLayout';
import QuestionDialog from './QuestionDialog';
import StatusPill from './StatusPill';
import { displayQuestion } from './questionDisplay';
import styles from './QuestionPage.module.css';

const NODE_IDS = { tabBar: '7:1135', segment: '7:1157', switch: '7:1162' };

type StepState = 'done' | 'now' | 'todo';
interface Step {
  state: StepState;
  title: string;
  note: string;
}

const MARKERS: Record<StepState, string> = { done: stepDone, now: stepNow, todo: stepTodo };

function progressSteps(question: Question, sentNote: string): Step[] {
  const sent: Step = { state: 'done', title: 'Question sent', note: sentNote };
  if (question.status === 'Answered') {
    return [
      sent,
      { state: 'done', title: 'Answered by a local', note: 'checked for tone, not just the word' },
      { state: 'done', title: 'Answer written into the entry', note: 'saved on this device' },
    ];
  }
  return [
    sent,
    { state: 'now', title: '2 locals reviewing', note: 'usually answered within a day' },
    { state: 'todo', title: 'Answer written into the entry', note: 'you’ll get a notification' },
  ];
}

export default function QuestionPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = usePersistentStore(questionsStore);
  const [settings] = usePersistentStore(settingsStore);
  const [dialog, setDialog] = useState<'context' | 'answer' | null>(null);

  const index = questions.findIndex((item) => item.id === questionId);
  if (index === -1) return <Navigate to={paths.community} replace />;
  const question = questions[index];
  const display = displayQuestion(question);
  // An answered question isn't answered again; locals can still add context.
  const answering = settings.local && question.status !== 'Answered';

  const updateQuestion = (change: (previous: Question) => Question) =>
    setQuestions((prev) => prev.map((item) => (item.id === question.id ? change(item) : item)));

  const handleSave = (message: string) => {
    if (dialog === 'answer') {
      updateQuestion((prev) => ({ ...prev, status: 'Answered', answer: message }));
      // Figma notes: the answer is added to the phrase's entry, i.e. the Moments lookup whose phrase
      // the question mentions (longest match wins: "can or not" over "can").
      const text = question.text.toLowerCase();
      const entry = lookupsStore
        .get()
        .filter((lookup) => text.includes(lookup.word.toLowerCase()))
        .sort((a, b) => b.word.length - a.word.length)[0];
      const hasEntry = entry !== undefined;
      if (entry) {
        lookupsStore.set((prev) =>
          prev.map((lookup) =>
            lookup.id === entry.id ? { ...lookup, meaning: message, source: 'Confirmed by a local' } : lookup,
          ),
        );
      }
      showToast(hasEntry ? 'Answer added to the phrase’s entry' : 'Saved on this device');
    } else {
      updateQuestion((prev) => ({ ...prev, detail: `${prev.detail}\n${message}` }));
      showToast('Saved on this device');
    }
    setDialog(null);
  };

  const handleWithdraw = () => {
    navigate(paths.community);
    setQuestions((prev) => prev.filter((item) => item.id !== question.id));
    showToast('Question withdrawn', {
      undo: () =>
        questionsStore.set((prev) =>
          prev.some((item) => item.id === question.id)
            ? prev
            : [...prev.slice(0, index), question, ...prev.slice(index)],
        ),
    });
  };

  const pending = question.status === 'Pending';

  return (
    <CommunityLayout nodeIds={NODE_IDS} onList={false}>
      <Link to={paths.community} className={styles.back} data-node-id="7:1196">
        <img src={chevronLeft} alt="" className={styles.backChevron} />
        <span className={styles.backLabel}>Your questions</span>
        <span className={styles.backCount}>
          · {index + 1} of {questions.length}
        </span>
      </Link>

      <article className={pending ? styles.cardPending : styles.card} data-node-id="7:1200">
        <div className={styles.meta}>
          {display.place && (
            <span className={styles.placePill}>
              <span aria-hidden="true">{display.place.emoji}</span>
              {display.place.label}
            </span>
          )}
          <StatusPill status={question.status} />
        </div>

        <div className={styles.headline}>
          {display.word ? (
            <>
              <div className={styles.wordRow}>
                <h2 className={styles.word}>{display.word}</h2>
                {display.pronunciation && <span className={styles.pronunciation}>{display.pronunciation}</span>}
              </div>
              <p className={styles.question}>{display.headline}</p>
            </>
          ) : (
            <h2 className={styles.question}>{display.headline}</h2>
          )}
          {display.contextLine && <p className={styles.context}>{display.contextLine}</p>}
        </div>

        <section className={styles.section} aria-labelledby="question-wrote">
          <h3 id="question-wrote" className={styles.label}>
            What you wrote
          </h3>
          <p className={styles.quote}>{question.detail}</p>
        </section>

        <section className={styles.progress}>
          <h3 id="question-progress" className={styles.label}>
            Progress
          </h3>
          <ol className={styles.steps} aria-labelledby="question-progress">
            {progressSteps(question, display.sentNote).map((step) => (
              <li key={step.title} className={styles[step.state]} aria-current={step.state === 'now' ? 'step' : undefined}>
                <img src={MARKERS[step.state]} alt="" className={styles.marker} />
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepNote}>{step.note}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {pending ? (
          <div className={styles.reviewers}>
            <span className={styles.avatars} aria-hidden="true">
              <span className={styles.avatarM}>M</span>
              <span className={styles.avatarJ}>J</span>
            </span>
            <p className={styles.reviewersNote}>{display.reviewersNote}</p>
          </div>
        ) : (
          <section className={styles.section} aria-labelledby="question-answer">
            <h3 id="question-answer" className={styles.label}>
              Local answer
            </h3>
            <p className={styles.answer}>{question.answer}</p>
          </section>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} data-node-id="7:1246" onClick={handleWithdraw}>
            Withdraw
          </button>
          <button
            type="button"
            className={styles.primary}
            data-node-id="7:1248"
            onClick={() => setDialog(answering ? 'answer' : 'context')}
          >
            {answering ? 'Answer question' : 'Add more context'}
          </button>
        </div>
      </article>

      {questions.length > 1 && (
        <nav className={styles.pager} aria-label="Questions" data-node-id="7:1250">
          {questions.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={i === index ? styles.pageActive : styles.page}
              aria-label={`Question ${i + 1} of ${questions.length}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => navigate(paths.question(item.id))}
            />
          ))}
        </nav>
      )}

      {dialog && (
        <QuestionDialog
          title={dialog === 'answer' ? 'Answer question' : 'Add more context'}
          onSave={handleSave}
          onClose={() => setDialog(null)}
        />
      )}
    </CommunityLayout>
  );
}
