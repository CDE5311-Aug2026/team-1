// One of my questions (ZIP refinedQuestionCard): topic and status, photo + title, Posted → Read → Replied → Resolved,
// the latest reply (or what it is waiting for), Replies / Add context, Withdraw.
import { Link } from 'react-router-dom';
import type { Question } from '../../data/domain';
import { STAGES, statusLabel, stageOf, type Thread } from '../../data/community/social';
import mascot from '../../assets/v3/mascot.png';
import { paths } from '../../routes';
import { ExampleTag } from './bits';
import { hasContext } from './ContextSheet';
import { Icon } from './icons';
import styles from './MyQuestionCard.module.css';

interface MyQuestionCardProps {
  thread: Thread;
  question: Question;
  onContext: () => void;
  onWithdraw: () => void;
}

export default function MyQuestionCard({ thread, question, onContext, onWithdraw }: MyQuestionCardProps) {
  const stage = stageOf(question, thread.closed);
  const at = STAGES.indexOf(stage);
  const status = statusLabel(stage);
  const replies = thread.replies.length;
  const fromLocals = thread.replies.filter((r) => !r.mine);
  const latest = fromLocals[fromLocals.length - 1];
  const replied = stage === 'Replied' || stage === 'Resolved';

  return (
    <article className={replied ? styles.card : `${styles.card} ${styles.waitingCard}`} aria-labelledby={`q-${question.id}`}>
      <div className={styles.meta}>
        <span className={styles.topic}>
          <Icon name="chat" size={14} />
          {thread.topic}
        </span>
        {question.sample && <ExampleTag />}
        <span className={styles[`status${status}`]}>
          <span className={styles.statusMark}>
            <Icon name={status === 'Waiting' ? 'hourglass' : status === 'Resolved' ? 'lock' : 'check'} size={12} strokeWidth={2} />
          </span>
          {status}
        </span>
      </div>

      <div className={styles.main}>
        <span className={thread.photo ? styles.photo : `${styles.photo} ${styles.photoMark}`}>
          <img src={thread.photo ?? mascot} alt="" />
        </span>
        <Link id={`q-${question.id}`} to={paths.question(question.id)} className={styles.title} aria-label={`Open question ${question.text}`}>
          {question.text}
        </Link>
      </div>

      <ol className={styles.progress} aria-label={`Progress: ${stage}, ${at + 1} of 4`}>
        {STAGES.map((label, i) => (
          <li key={label} className={i < at ? styles.done : i === at ? styles.now : styles.todo} aria-current={i === at ? 'step' : undefined}>
            <span className={styles.bar} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ol>

      {replied && latest ? (
        <div className={styles.reply}>
          <span className={styles.replyIcon}>
            <Icon name="chat" size={16} />
          </span>
          <div>
            <span className={styles.replyLabel}>{stage === 'Resolved' ? 'Conversation resolved' : 'Latest reply'}</span>
            <p>{latest.text}</p>
          </div>
        </div>
      ) : (
        <p className={styles.waiting}>
          <Icon name="person" size={14} />
          {stage === 'Read' ? 'A local has read your question.' : stage === 'Resolved' ? 'You closed this question.' : 'Waiting for a local to reply.'}
        </p>
      )}

      <div className={styles.actions}>
        {replied || replies > 0 ? (
          <Link to={paths.question(question.id)} className={styles.primary} aria-label={`Replies, ${replies}`}>
            <Icon name="chat" size={15} />
            Replies
            <span className={styles.count}>{replies}</span>
          </Link>
        ) : (
          <button type="button" className={styles.context} onClick={onContext}>
            <Icon name="edit" size={15} />
            {hasContext(question) ? 'Edit context' : 'Add context'}
          </button>
        )}
        <button type="button" className={styles.withdraw} onClick={onWithdraw} aria-label={`Withdraw ${question.text}`}>
          <Icon name="withdraw" size={15} />
          Withdraw
        </button>
      </div>
    </article>
  );
}
