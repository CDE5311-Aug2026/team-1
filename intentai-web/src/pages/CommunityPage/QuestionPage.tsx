import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import chevronLeft from '../../assets/community/chevron-left.svg';
import stepDone from '../../assets/community/step-done.svg';
import stepNow from '../../assets/community/step-now.svg';
import stepTodo from '../../assets/community/step-todo.svg';
import { isAnswered, type Question } from '../../data/domain';
import { answerMessage, answerQuestion, cardTitle, linkedLookup, markSeen, progressOf } from '../../data/localAnswer';
import { usePersistentStore } from '../../data/persistentStore';
import { lookupsStore, questionsStore, settingsStore, tipsStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import CommunityLayout from './CommunityLayout';
import QuestionDialog from './QuestionDialog';
import StatusPill from './StatusPill';
import { displayQuestion } from './questionDisplay';
import { useSpan } from '../../usage/useSpan';
import styles from './QuestionPage.module.css';

const NODE_IDS = { tabBar: '7:1135', segment: '7:1157', switch: '7:1162' };

type StepState = 'done' | 'now' | 'todo';
const MARKERS: Record<StepState, string> = { done: stepDone, now: stepNow, todo: stepTodo };

/** One line under each step: only what this device knows. */
function stepNote(key: string, question: Question, sentNote: string): string {
  if (key === 'posted') return sentNote;
  if (key === 'seen') return question.seenAt ? 'opened by a local in Answer as a local' : 'shown to locals who answer near this place';
  if (key === 'answered') return isAnswered(question) ? `by ${question.answeredBy ?? 'a local'}` : 'answers arrive here';
  const card = question.cardId ? cardTitle(question.cardId) : undefined;
  return card ? `as a local tip on your ${card} card` : 'to your phrase in Moments';
}

export default function QuestionPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = usePersistentStore(questionsStore);
  const [settings] = usePersistentStore(settingsStore);
  const [lookups] = usePersistentStore(lookupsStore);
  const [tips] = usePersistentStore(tipsStore);
  const [dialog, setDialog] = useState<'context' | 'answer' | null>(null);
  useSpan('activity', 'Community question › add context', dialog === 'context');
  useSpan('activity', 'Community question › answer', dialog === 'answer');

  const index = questions.findIndex((item) => item.id === questionId);
  const current = index === -1 ? undefined : questions[index];
  // A local opening a waiting question has seen it (Answer as a local on this device).
  useEffect(() => {
    if (current && settings.local && current.status === 'Pending') {
      questionsStore.set((prev) => prev.map((item) => (item.id === current.id ? markSeen(item) : item)));
    }
  }, [current, settings.local]);
  if (index === -1) return <Navigate to={paths.community} replace />;
  const question = questions[index];
  const display = displayQuestion(question);
  // An answered question isn't answered again; locals can still add context.
  const answering = settings.local && !isAnswered(question);
  const card = question.cardId ? cardTitle(question.cardId) : undefined;
  const phrase = card ? undefined : linkedLookup(question, lookups);
  const linked = Boolean(card || phrase);
  const tip = tips.find((t) => t.questionId === question.id);

  const updateQuestion = (change: (previous: Question) => Question) =>
    setQuestions((prev) => prev.map((item) => (item.id === question.id ? change(item) : item)));

  const handleSave = (message: string, _context: string, name: string) => {
    if (dialog === 'answer') {
      const result = answerQuestion(question, { text: message, by: name }, lookupsStore.get());
      updateQuestion(() => result.question);
      if (result.outcome.kind === 'phrase') lookupsStore.set(result.lookups);
      if (result.tip) tipsStore.set((prev) => [result.tip!, ...prev]);
      showToast(answerMessage(result.outcome));
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


  return (
    <CommunityLayout nodeIds={NODE_IDS} onList={false}>
      <Link to={paths.community} className={styles.back} data-node-id="7:1196">
        <img src={chevronLeft} alt="" className={styles.backChevron} />
        <span className={styles.backLabel}>Your questions</span>
        <span className={styles.backCount}>
          · {index + 1} of {questions.length}
        </span>
      </Link>

      <article className={styles.card} data-node-id="7:1200">
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
            {progressOf(question, linked).map((step) => (
              <li key={step.key} className={styles[step.state]} aria-current={step.state === 'now' ? 'step' : undefined}>
                <img src={MARKERS[step.state]} alt="" className={styles.marker} />
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepNote}>{stepNote(step.key, question, display.sentNote)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {isAnswered(question) ? (
          <section className={styles.section} aria-labelledby="question-answer">
            <h3 id="question-answer" className={styles.label}>
              {question.answeredBy && question.answeredBy !== 'A local' ? `${question.answeredBy} · local answer` : 'Local answer'}
            </h3>
            <p className={styles.answer}>{question.answer}</p>
          </section>
        ) : (
          <p className={styles.reviewersNote}>
            {question.areaName
              ? `Locals who answer near ${question.areaName} will see it.`
              : 'Locals who switch on Answer as a local will see it.'}
          </p>
        )}

        <p className={styles.linkLine}>
          {card
            ? question.status === 'Added' && tip
              ? `Added to your ${card} card as a local tip${tip.cited > 0 ? ` · cited in Ask ${tip.cited === 1 ? 'once' : `${tip.cited} times`}` : ''}.`
              : `Linked to your ${card} card: an answer will be added to it.`
            : phrase
              ? question.status === 'Added'
                ? `Added to “${phrase.word}” in Moments.`
                : `Linked to “${phrase.word}” in Moments: an answer will be added to it.`
              : 'Not linked to a card or phrase: the answer stays here.'}
        </p>

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
          askName={dialog === 'answer'}
          onSave={handleSave}
          onClose={() => setDialog(null)}
        />
      )}
    </CommunityLayout>
  );
}
