// /community/:questionId — the social thread (ZIP community-social.js), shared by my own questions and the example
// channel threads: question, topic, author, photo, long text that expands, nested replies (reply to someone,
// expand / collapse), like, Top / Latest, Follow, Save to Moments, Close / Reopen, Withdraw with Undo, add / edit
// context, and a reply box fixed at the bottom. Answering my question as a local goes through answerQuestion().
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import ClickSpark from '../../components/reactbits/ClickSpark';
import {
  ancestorsOf,
  communitySocialStore,
  descendantCount,
  linkLine,
  newLocalReply,
  photoCredit,
  replyTree,
  snapshotOf,
  timeAgo,
  toggleIn,
  threadFor,
  type ReplySort,
  type ReplyTree,
  type Thread,
  type ThreadReply,
} from '../../data/community/social';
import { isAnswered } from '../../data/domain';
import { answerMessage, answerQuestion, markSeen } from '../../data/localAnswer';

/** One-tap answers for a reading sent from Ask ("Is this right? …"). */
const QUICK_REPLIES = ['Yes, that’s right.', 'Not quite: ', 'Mostly, but '];
import { usePersistentStore } from '../../data/persistentStore';
import { lookupsStore, questionsStore, settingsStore, tipsStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import { useSpan } from '../../usage/useSpan';
import { Avatar, Count, ExampleTag } from './bits';
import { memberByName } from '../../data/community/people';
import ContextSheet, { hasContext } from './ContextSheet';
import { Icon } from './icons';
import type { ThreadFocusState } from './NotificationsSheet';
import { withdrawQuestion } from './post';
import Sheet from './Sheet';
import styles from './QuestionPage.module.css';

const SPARK = ['#e3661f', '#f4b389', '#a3400a'];
const LONG = 170;

export default function QuestionPage() {
  const { questionId = '' } = useParams();
  const navigate = useNavigate();
  const focusReply = (useLocation().state as ThreadFocusState | null)?.focusReply;
  const [questions] = usePersistentStore(questionsStore);
  const [social, setSocial] = usePersistentStore(communitySocialStore);
  const [lookups] = usePersistentStore(lookupsStore);
  const [settings] = usePersistentStore(settingsStore);
  const [tips] = usePersistentStore(tipsStore);
  const thread = useMemo(() => threadFor(questionId, questions, lookups, social), [questionId, questions, lookups, social]);
  const question = thread?.question;

  // A local opening a waiting question has read it (Answer as a local on this device).
  useEffect(() => {
    if (question && settings.local && question.status === 'Pending') {
      questionsStore.set((prev) => prev.map((q) => (q.id === question.id ? markSeen(q) : q)));
    }
  }, [question, settings.local]);

  if (!thread) return <Navigate to={paths.community} replace />;
  return (
    <ThreadView
      key={thread.id}
      thread={thread}
      focusReply={focusReply}
      local={settings.local}
      lookupsLine={question ? linkLine(question, lookups, tips.find((t) => t.questionId === question.id)?.cited) : undefined}
      following={social.following.includes(thread.id)}
      saved={social.saved.some((s) => s.threadId === thread.id)}
      onSocial={setSocial}
      onLeave={() => navigate(paths.community)}
    />
  );
}

interface ThreadViewProps {
  thread: Thread;
  focusReply?: string;
  local: boolean;
  lookupsLine?: string;
  following: boolean;
  saved: boolean;
  onSocial: (next: (prev: ReturnType<typeof communitySocialStore.get>) => ReturnType<typeof communitySocialStore.get>) => void;
  onLeave: () => void;
}

function ThreadView({ thread, focusReply, local, lookupsLine, following, saved, onSocial, onLeave }: ThreadViewProps) {
  const question = thread.question;
  const [sort, setSort] = useState<ReplySort>('top');
  const tree = useMemo(() => replyTree(thread.replies, sort), [thread.replies, sort]);
  const [expanded, setExpanded] = useState<string[]>(() => (focusReply ? ancestorsOf(replyTree(thread.replies, 'top'), focusReply) : []));
  const [bodyOpen, setBodyOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ThreadReply | null>(null);
  const [draft, setDraft] = useState('');
  const [name, setName] = useState('');
  const [sheet, setSheet] = useState<'context' | 'photo' | null>(null);
  const [highlight, setHighlight] = useState(focusReply);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ids = { replies: useId(), input: useId(), name: useId() };
  useSpan('activity', 'Community question › add context', sheet === 'context');

  const closed = thread.closed;
  // My own question, still waiting, with Answer as a local on: the reply box writes the local answer.
  const answering = Boolean(question && local && !isAnswered(question) && !closed && !replyTo);
  const long = thread.body.length > LONG || thread.body.split('\n').length > 4;
  const credit = photoCredit(thread.photo);

  // Opened from a notification: bring that reply into view and flash it.
  useEffect(() => {
    if (!focusReply) return undefined;
    const el = document.querySelector(`[data-reply-id="${CSS.escape(focusReply)}"]`);
    el?.scrollIntoView?.({ block: 'center' });
    const t = setTimeout(() => setHighlight(undefined), 2600);
    return () => clearTimeout(t);
  }, [focusReply]);

  const startReply = (reply: ThreadReply | null) => {
    setReplyTo(reply);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || closed) return;
    if (answering && question) {
      const result = answerQuestion(question, { text, by: name }, lookupsStore.get());
      questionsStore.set((prev) => prev.map((q) => (q.id === question.id ? result.question : q)));
      if (result.outcome.kind === 'phrase') lookupsStore.set(result.lookups);
      if (result.tip) tipsStore.set((prev) => [result.tip!, ...prev]);
      showToast(answerMessage(result.outcome));
    } else {
      const reply = newLocalReply(thread.id, text, replyTo?.id);
      onSocial((prev) => ({ ...prev, replies: [...prev.replies, reply] }));
      if (replyTo) setExpanded((prev) => [...new Set([...prev, ...ancestorsOf(tree, replyTo.id), replyTo.id])]);
      showToast(replyTo ? `Replied to ${replyTo.author}` : 'Reply added');
    }
    setDraft('');
    setReplyTo(null);
  };

  const toggleSave = () => {
    onSocial((prev) =>
      prev.saved.some((s) => s.threadId === thread.id)
        ? { ...prev, saved: prev.saved.filter((s) => s.threadId !== thread.id) }
        : { ...prev, saved: [snapshotOf(thread), ...prev.saved] },
    );
    showToast(saved ? 'Removed from Moments' : 'Saved to Moments');
  };

  const toggleClosed = () => {
    onSocial((prev) => ({ ...prev, closed: toggleIn(prev.closed, thread.id) }));
    showToast(closed ? 'Question reopened' : 'Question closed. Marked resolved.');
  };

  const withdraw = () => {
    if (!question) return;
    onLeave();
    withdrawQuestion(question);
  };

  return (
    <AppShell background="#f9f7f2" chrome="status" layout="fill">
      {/* Full-screen thread (own top bar and fixed reply box), edge to edge like Nearby Explore. */}
      <div className={styles.screen} data-allow-bleed>
        <div className={styles.topbar}>
          <Link to={paths.community} className={styles.iconButton} aria-label="Back to Community">
            <Icon name="back" size={18} />
          </Link>
          <h1 className={styles.heading}>Question</h1>
          <Link to={paths.community} className={styles.iconButton} aria-label="Close">
            <Icon name="close" size={16} />
          </Link>
        </div>

        <div ref={scrollRef} className={styles.scroll}>
          <motion.article className={styles.question} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className={styles.authorRow}>
              <Avatar name={thread.author} tone={thread.own ? 'warm' : 'warm'} />
              <span className={styles.authorCopy}>
                <strong>{thread.author}</strong>
                <span>
                  {[memberByName(thread.author)?.line, timeAgo(thread.createdAt), thread.views ? `${thread.views.toLocaleString('en-SG')} views` : undefined]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {thread.sample && <ExampleTag />}
              <span className={closed ? `${styles.state} ${styles.stateClosed}` : styles.state}>
                {closed ? <Icon name="lock" size={12} /> : <i aria-hidden="true" />}
                {thread.archived ? 'Saved copy' : closed ? 'Resolved' : 'Open'}
              </span>
            </div>

            {thread.channel ? (
              <Link to={`${paths.community}?mode=answer`} className={styles.topic}>
                {thread.topic}
              </Link>
            ) : (
              <span className={styles.topic}>{thread.topic}</span>
            )}

            <h2 className={styles.title}>{thread.title}</h2>

            {thread.body && (
              <>
                <div id="question-body" className={long && !bodyOpen ? `${styles.body} ${styles.bodyCollapsed}` : styles.body}>
                  <p>{thread.body}</p>
                </div>
                {long && (
                  <button type="button" className={styles.more} aria-expanded={bodyOpen} aria-controls="question-body" onClick={() => setBodyOpen((v) => !v)}>
                    {bodyOpen ? 'Show less' : 'Read more'}
                    <Icon name={bodyOpen ? 'up' : 'down'} size={14} />
                  </button>
                )}
              </>
            )}

            {thread.photo && (
              <figure className={styles.media}>
                <button type="button" className={styles.mediaButton} aria-label="Open the photo" onClick={() => setSheet('photo')}>
                  <img src={thread.photo} alt={thread.photoAlt ?? ''} loading="lazy" />
                  <span className={styles.mediaHint}>
                    <Icon name="expand" size={16} />
                  </span>
                </button>
                {credit && <figcaption>{credit}</figcaption>}
              </figure>
            )}

            {thread.tags.length > 0 && (
              <p className={styles.tags}>
                {thread.tags.map((tag) => (
                  <span key={tag}># {tag}</span>
                ))}
              </p>
            )}

            {lookupsLine && <p className={styles.linkLine}>{lookupsLine}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={following ? `${styles.action} ${styles.actionOn}` : styles.action}
                aria-pressed={following}
                onClick={() => onSocial((prev) => ({ ...prev, following: toggleIn(prev.following, thread.id) }))}
              >
                <Icon name={following ? 'following' : 'follow'} size={18} />
                {following ? 'Following' : 'Follow'}
              </button>
              <ClickSpark className={styles.spark} disabled={saved} sparkColor={SPARK} sparkCount={9} sparkRadius={20} sparkSize={7}>
                <button type="button" className={saved ? `${styles.action} ${styles.actionOn}` : styles.action} aria-pressed={saved} onClick={toggleSave}>
                  <Icon name="bookmark" size={18} />
                  {saved ? 'Saved' : 'Save'}
                </button>
              </ClickSpark>
              <button type="button" className={styles.action} disabled={closed} onClick={() => startReply(null)}>
                <Icon name="reply" size={18} />
                Reply
              </button>
            </div>

            {question && (
              <div className={styles.ownerTools}>
                <button type="button" onClick={() => setSheet('context')}>
                  <Icon name="edit" size={14} />
                  {hasContext(question) ? 'Edit context' : 'Add context'}
                </button>
                <button type="button" onClick={toggleClosed}>
                  <Icon name={closed ? 'unlock' : 'lock'} size={14} />
                  {closed ? 'Reopen question' : 'Close question'}
                </button>
                <button type="button" onClick={withdraw}>
                  <Icon name="withdraw" size={14} />
                  Withdraw
                </button>
              </div>
            )}
          </motion.article>

          <section className={styles.discussion} aria-labelledby={ids.replies}>
            <div className={styles.discussionHead}>
              <h3 id={ids.replies}>
                Replies <Count value={thread.replies.length} className={styles.replyCount} />
              </h3>
              <div className={styles.sort} role="group" aria-label="Sort replies">
                {(['top', 'latest'] as const).map((s) => (
                  <button key={s} type="button" aria-pressed={sort === s} className={sort === s ? styles.sortOn : undefined} onClick={() => setSort(s)}>
                    {s === 'top' ? 'Top' : 'Latest'}
                  </button>
                ))}
              </div>
            </div>
            {tree.roots.length > 0 ? (
              <motion.div className={styles.replyList} layout>
                {tree.roots.map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    reply={reply}
                    depth={0}
                    tree={tree}
                    expanded={expanded}
                    highlight={highlight}
                    closed={closed}
                    onToggle={(id) => setExpanded((prev) => toggleIn(prev, id))}
                    onReply={startReply}
                    onLike={(id) => onSocial((prev) => ({ ...prev, likes: toggleIn(prev.likes, id) }))}
                  />
                ))}
              </motion.div>
            ) : (
              <div className={styles.noReplies}>
                <strong>{closed ? 'No replies were added.' : 'A new conversation starts here.'}</strong>
                <p>{closed ? 'This question is closed to new replies.' : 'Bring your experience, or ask a thoughtful follow-up.'}</p>
              </div>
            )}
          </section>
        </div>

        <div className={styles.composerWrap}>
          {closed ? (
            <p className={styles.closedNote}>
              <Icon name="lock" size={14} />
              This question is closed to new replies.
            </p>
          ) : (
            <>
              <AnimatePresence>
                {replyTo && (
                  <motion.div className={styles.target} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
                    <span>
                      Replying to <strong>{replyTo.author}</strong>
                    </span>
                    <button type="button" aria-label={`Cancel replying to ${replyTo.author}`} onClick={() => setReplyTo(null)}>
                      <Icon name="close" size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {answering && question?.text.startsWith('Is this right?') && (
                // Ask's "Ask a local to confirm": one tap to confirm or correct IntentAI's reading (then add a word if needed).
                <div className={styles.quickReplies} role="group" aria-label="Quick answers">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setDraft(q);
                        inputRef.current?.focus();
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {answering && (
                <div className={styles.answerAs}>
                  <span>Answering as a local</span>
                  <label htmlFor={ids.name} className={styles.srOnly}>
                    Name shown with your answer (optional)
                  </label>
                  <input id={ids.name} value={name} maxLength={24} placeholder="Name shown (optional)" onChange={(e) => setName(e.target.value)} />
                </div>
              )}
            </>
          )}
          <form className={styles.composer} onSubmit={submit}>
            <label htmlFor={ids.input} className={styles.srOnly}>
              {closed ? 'Replies are closed' : answering ? 'Your answer as a local' : replyTo ? `Reply to ${replyTo.author}` : 'Add your reply'}
            </label>
            <textarea
              ref={inputRef}
              id={ids.input}
              rows={1}
              maxLength={2400}
              value={draft}
              disabled={closed}
              placeholder={closed ? 'Replies are closed' : answering ? 'Answer as a local…' : replyTo ? `Reply to ${replyTo.author}…` : 'Add your perspective…'}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className={draft.trim() && !closed ? `${styles.send} ${styles.sendReady}` : styles.send} aria-label={answering ? 'Send answer' : 'Submit reply'} disabled={!draft.trim() || closed}>
              <Icon name="send" size={18} />
            </button>
          </form>
        </div>
      </div>

      {sheet === 'context' && question && <ContextSheet question={question} onClose={() => setSheet(null)} />}
      {sheet === 'photo' && thread.photo && (
        <Sheet title="Photo" onClose={() => setSheet(null)}>
          <img className={styles.bigPhoto} src={thread.photo} alt={thread.photoAlt ?? `Photo shared with “${thread.title}”`} />
          {credit && <p className={styles.credit}>{credit}</p>}
        </Sheet>
      )}
    </AppShell>
  );
}

interface ReplyItemProps {
  reply: ThreadReply;
  depth: number;
  tree: ReplyTree;
  expanded: string[];
  highlight?: string;
  closed: boolean;
  onToggle: (id: string) => void;
  onReply: (reply: ThreadReply) => void;
  onLike: (id: string) => void;
}

function ReplyItem({ reply, depth, tree, expanded, highlight, closed, onToggle, onReply, onLike }: ReplyItemProps) {
  const children = tree.children.get(reply.id) ?? [];
  const count = descendantCount(tree, reply.id);
  const open = expanded.includes(reply.id);
  const parent = reply.parentId ? tree.byId.get(reply.parentId) : undefined;
  const listId = `replies-to-${reply.id}`;
  return (
    <motion.article
      layout="position"
      className={depth ? `${styles.reply} ${styles.child}` : styles.reply}
      data-reply-id={reply.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={highlight === reply.id ? `${styles.replyRow} ${styles.highlight}` : styles.replyRow}>
        <Avatar name={reply.author} size={depth ? 'sm' : 'md'} tone={reply.mine ? 'accent' : 'warm'} />
        <div className={styles.replyBody}>
          <div className={styles.replyHead}>
            <strong>{reply.author}</strong>
            {reply.byAsker && <span className={styles.badge}>Author</span>}
            {reply.mine && !reply.byAsker && <span className={styles.badge}>You</span>}
            {!reply.byAsker && memberByName(reply.author)?.role === 'local' && <span className={`${styles.badge} ${styles.localBadge}`}>Local</span>}
            {timeAgo(reply.createdAt) && <span className={styles.time}>{timeAgo(reply.createdAt)}</span>}
          </div>
          {depth >= 2 && parent && <span className={styles.path}>Replying to {parent.author}</span>}
          <p className={styles.replyText}>{reply.text}</p>
          <div className={styles.replyActions}>
            <ClickSpark className={styles.spark} disabled={reply.liked} sparkColor={SPARK} sparkCount={7} sparkRadius={16} sparkSize={6}>
              <button
                type="button"
                className={reply.liked ? `${styles.replyAction} ${styles.liked}` : styles.replyAction}
                aria-pressed={reply.liked}
                aria-label={`${reply.liked ? 'Unlike' : 'Like'} reply from ${reply.author}${reply.likes ? `, ${reply.likes} ${reply.likes === 1 ? 'like' : 'likes'}` : ''}`}
                onClick={() => onLike(reply.id)}
              >
                <motion.span animate={reply.liked ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.3 }} className={styles.heart}>
                  <Icon name="like" size={16} />
                </motion.span>
                <span aria-hidden="true">{reply.likes || 'Like'}</span>
              </button>
            </ClickSpark>
            <button type="button" className={styles.replyAction} disabled={closed} onClick={() => onReply(reply)} aria-label={`Reply to ${reply.author}`}>
              <Icon name="reply" size={16} />
              <span aria-hidden="true">Reply</span>
            </button>
          </div>
          {count > 0 && (
            <button type="button" className={styles.expand} aria-expanded={open} aria-controls={listId} onClick={() => onToggle(reply.id)}>
              <Icon name={open ? 'up' : 'down'} size={14} />
              {open ? 'Hide replies' : `View ${count} ${count === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && children.length > 0 && (
          <motion.div
            id={listId}
            className={depth >= 2 ? `${styles.children} ${styles.flat}` : styles.children}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24 }}
          >
            {children.map((child) => (
              <ReplyItem
                key={child.id}
                reply={child}
                depth={depth + 1}
                tree={tree}
                expanded={expanded}
                highlight={highlight}
                closed={closed}
                onToggle={onToggle}
                onReply={onReply}
                onLike={onLike}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
