import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import chevronRight from '../../assets/community/chevron-right.svg';
import lockIcon from '../../assets/community/lock.svg';
import plusIcon from '../../assets/community/plus.svg';
import { newQuestion } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { questionsStore, settingsStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths, type CommunityHandoff } from '../../routes';
import CommunityLayout from './CommunityLayout';
import QuestionDialog from './QuestionDialog';
import StatusPill from './StatusPill';
import { statusNote } from './questionDisplay';
import { useSpan } from '../../usage/useSpan';
import styles from './CommunityPage.module.css';

const NODE_IDS = { tabBar: '3:787', segment: '3:879', switch: '3:884' };
/** Figma anchors the first two cards. */
const CARD_NODE_IDS = ['3:891', '3:901'];

function listNote(count: number, local: boolean): string {
  if (local) return 'Local answering is enabled. Open a question to add an interpretation.';
  if (count === 0) return 'No questions yet — ask a local about anything you heard.';
  return 'Nothing else pending — you can ask a local from any entry.';
}

export default function CommunityPage() {
  const [questions, setQuestions] = usePersistentStore(questionsStore);
  const [settings] = usePersistentStore(settingsStore);
  // Moments "Not sure" arrives with a drafted question for the "Ask a local" dialog.
  const draft = (useLocation().state as CommunityHandoff | null)?.askLocal;
  const [asking, setAsking] = useState(draft !== undefined);
  useSpan('activity', 'Community › ask a local', asking);

  const handleAsk = (text: string, context: string) => {
    const question = newQuestion(text, context);
    setQuestions((prev) => [question, ...prev]);
    setAsking(false);
    showToast('Saved on this device');
  };

  return (
    <CommunityLayout nodeIds={NODE_IDS} onList>
      <h2 className={styles.sectionHeader}>
        Your questions
        <span className={styles.count}>{questions.length}</span>
      </h2>
      {questions.length > 0 && (
        <ul className={styles.list}>
          {questions.map((question, index) => (
            <li key={question.id}>
              <Link
                to={paths.question(question.id)}
                className={styles.card}
                aria-label={`Open question ${question.text}`}
                data-node-id={CARD_NODE_IDS[index]}
              >
                <span className={styles.cardContent}>
                  <span className={styles.cardTitle}>{question.text}</span>
                  {question.context && <span className={styles.cardContext}>{question.context}</span>}
                  <span className={styles.cardStatus}>
                    <StatusPill status={question.status} />
                    <span className={styles.cardNote}>{statusNote(question)}</span>
                  </span>
                </span>
                <img src={chevronRight} alt="" className={styles.chevron} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>{listNote(questions.length, settings.local)}</p>

      <div className={styles.footer}>
        <p className={styles.privacy} data-node-id="3:912">
          <img src={lockIcon} alt="" className={styles.lock} />
          Your questions are shown to locals without your name or profile.
        </p>
        <button type="button" className={styles.askButton} data-node-id="3:915" onClick={() => setAsking(true)}>
          <img src={plusIcon} alt="" className={styles.plus} />
          Ask a local
        </button>
      </div>

      {asking && (
        <QuestionDialog title="Ask a local" askContext defaultMessage={draft} onSave={handleAsk} onClose={() => setAsking(false)} />
      )}
    </CommunityLayout>
  );
}
