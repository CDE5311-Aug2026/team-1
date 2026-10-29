import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeLink from '../../components/HomeLink/HomeLink';
import checkIcon from '../../assets/ask/check.svg';
import copyIcon from '../../assets/ask/copy.svg';
import dotsIcon from '../../assets/ask/dots.svg';
import editIcon from '../../assets/ask/edit.svg';
import infoIcon from '../../assets/ask/info.svg';
import micIcon from '../../assets/ask/mic.svg';
import plusIcon from '../../assets/ask/plus.svg';
import regenerateIcon from '../../assets/ask/regenerate.svg';
import sendIcon from '../../assets/ask/send.svg';
import sparkleIcon from '../../assets/ask/sparkle.svg';
import thumbsDownIcon from '../../assets/ask/thumbs-down.svg';
import thumbsUpIcon from '../../assets/ask/thumbs-up.svg';
import AppShell from '../../components/AppShell/AppShell';
import Dialog from '../../components/Dialog/Dialog';
import { addLookup } from '../../data/domain';
import { lookupsStore, reportsStore } from '../../data/stores';
import { dismissToast, showToast } from '../../hooks/useToast';
import { paths, type AskHandoff } from '../../routes';
import {
  ASK_CONTEXTS,
  DEFAULT_CONTEXT,
  PHRASES,
  answerText,
  contextFor,
  explain,
  findPhrase,
  inSentence,
  type Answer,
} from './answer';
import { useSpan } from '../../usage/useSpan';
import styles from './AskPage.module.css';
import { startVoiceInput } from './voice';
import { requireText } from '../../hooks/requireText';

type Feedback = 'up' | 'down';

interface Exchange {
  id: number;
  /** The user's question; a follow-up answer ("Use it in a sentence") has none of its own. */
  question?: string;
  context: string;
  mode: 'explain' | 'sentence';
  /** The phrase a sentence answer is about. */
  phraseId?: string;
  answer: Answer;
  feedback?: Feedback;
}

type Modal = { type: 'context'; exchangeId?: number } | { type: 'report' } | { type: 'options' };

// Figma 2:312 / 2:328: the conversation the screen opens with.
const SEED_QUESTION = 'My classmates said “can help me chope a seat?” What does chope mean?';
const SEED: Exchange[] = [
  { id: 0, question: SEED_QUESTION, context: DEFAULT_CONTEXT, mode: 'explain', answer: explain(SEED_QUESTION, DEFAULT_CONTEXT) },
];

function answerFor(exchange: Exchange): Answer {
  const phrase = PHRASES.find((p) => p.id === exchange.phraseId);
  if (exchange.mode === 'sentence' && phrase) return inSentence(phrase);
  return explain(exchange.question ?? '', exchange.context);
}

export default function AskPage() {
  const navigate = useNavigate();
  const [exchanges, setExchanges] = useState<Exchange[]>(SEED);
  // "New chat" Undo restores state that lives only on this page, so close that toast if we leave.
  const newChatToast = useRef<number>();
  useEffect(() => () => dismissToast(newChatToast.current ?? -1), []);
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [draft, setDraft] = useState('');
  const [modal, setModal] = useState<Modal | null>(null);
  useSpan('activity', 'Ask › typing', draft.trim() !== '');
  useSpan('activity', 'Ask › context', modal?.type === 'context');
  useSpan('activity', 'Ask › report', modal?.type === 'report');
  const nextId = useRef(SEED.length);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const latest = exchanges[exchanges.length - 1];

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    const chat = chatRef.current;
    if (chat && exchanges.length > SEED.length) chat.scrollTop = chat.scrollHeight;
  }, [exchanges.length]);

  const append = (exchange: Omit<Exchange, 'id'>) => {
    const id = nextId.current;
    nextId.current += 1;
    setExchanges((prev) => [...prev, { ...exchange, id }]);
  };

  const ask = (question: string, where: string) => {
    append({ question, context: where, mode: 'explain', answer: explain(question, where) });
    const phrase = findPhrase(question);
    // A recognised phrase is kept in Moments (lookups store).
    if (phrase) lookupsStore.set((list) => addLookup(list, { id: phrase.id, word: phrase.title, meaning: phrase.meaning }));
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question) {
      inputRef.current?.focus();
      return;
    }
    ask(question, context);
    setDraft('');
  };

  // Arriving with a question (Nearby → "Ask IntentAI") asks it once, then clears the router state
  // so a reload or Back doesn't ask again.
  const location = useLocation();
  const handoff = useRef(location.state as AskHandoff | null);
  useEffect(() => {
    const pending = handoff.current;
    handoff.current = null;
    if (!pending?.prompt) return;
    if (pending.context) setContext(pending.context);
    ask(pending.prompt, pending.context ?? context);
    navigate(paths.ask, { replace: true, state: null });
    // Runs once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateExchange = (id: number, change: (exchange: Exchange) => Exchange) =>
    setExchanges((prev) => prev.map((exchange) => (exchange.id === id ? change(exchange) : exchange)));

  const saveContext = (label: string, exchangeId?: number) => {
    setContext(label);
    if (exchangeId !== undefined) {
      updateExchange(exchangeId, (exchange) => {
        const moved = { ...exchange, context: label };
        return { ...moved, answer: answerFor(moved), feedback: undefined };
      });
    }
    setModal(null);
    showToast(`Context set: ${label}`);
  };

  const needAnswer = () => {
    showToast('Ask about a phrase first.');
    inputRef.current?.focus();
  };

  const useInSentence = () => {
    const phrase = PHRASES.find((p) => p.id === latest?.answer.phraseId);
    if (!latest || !phrase) {
      needAnswer();
      return;
    }
    append({ context: latest.context, mode: 'sentence', phraseId: phrase.id, answer: inSentence(phrase) });
  };

  const copy = async (answer: Answer) => {
    try {
      await navigator.clipboard.writeText(answerText(answer));
      showToast('Answer copied');
    } catch {
      showToast('Select the answer text to copy it.');
    }
  };

  const setFeedback = (id: number, feedback: Feedback) => {
    updateExchange(id, (exchange) => ({ ...exchange, feedback: exchange.feedback === feedback ? undefined : feedback }));
    showToast('Thanks for the feedback');
  };

  const regenerate = (id: number) => {
    updateExchange(id, (exchange) => ({ ...exchange, answer: answerFor(exchange), feedback: undefined }));
    showToast('Answer regenerated');
  };

  const clearChat = () => {
    const previous = exchanges;
    setExchanges([]);
    setDraft('');
    setModal(null);
    newChatToast.current = showToast('New chat started', { undo: () => setExchanges(previous) });
  };

  const voice = () => {
    const started = startVoiceInput(setDraft, () => showToast('Microphone access was unavailable.'));
    if (!started) showToast('Voice input is unavailable. Type your question instead.');
  };

  const report = (reason: string) => {
    if (!latest) return;
    const answer = answerText(latest.answer);
    reportsStore.set((list) => [...list, { answer, reason }]);
    setModal(null);
    showToast('Report saved on this device');
  };

  return (
    <AppShell background="var(--bg-screen-b)" tabBarNodeId="2:545">
      <div className={styles.page}>
        <header className={styles.header}>
          {/* Figma 71:8: the 58px mascot sits at x=9, in the gutter, like Home's header. */}
          <HomeLink className={styles.logo} nodeId="71:8" />
          <h1 className={styles.title}>Ask</h1>
          <button type="button" className={styles.iconButton} onClick={clearChat} aria-label="New chat" data-node-id="2:722">
            <img src={editIcon} alt="" width={18} height={18} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setModal({ type: 'options' })}
            aria-label="Chat options"
            data-node-id="2:716"
          >
            <img src={dotsIcon} alt="" width={18} height={18} />
          </button>
        </header>

        <div className={styles.chat} ref={chatRef} data-node-id="2:303" role="log" aria-label="Conversation" aria-live="polite">
          <div className={styles.aiRow} data-node-id="2:304">
            <AiAvatar />
            <div className={styles.aiMessage}>
              <p className={styles.aiBubble}>Hi {USER_INITIAL} 👋 What did you hear today? Tell me the phrase and where you heard it.</p>
            </div>
          </div>

          {exchanges.map((exchange, index) => (
            <ExchangeView
              key={exchange.id}
              exchange={exchange}
              first={index === 0}
              onContext={() => setModal({ type: 'context', exchangeId: exchange.id })}
              onCopy={() => copy(exchange.answer)}
              onFeedback={(feedback) => setFeedback(exchange.id, feedback)}
              onRegenerate={() => regenerate(exchange.id)}
            />
          ))}
        </div>

        {/* Figma 2:339 / 2:347: composer and input are 371px wide at x=9 (inside the gutter only at 320px). */}
        <div className={styles.composer} data-node-id="2:339" data-allow-bleed>
          <div className={styles.suggestions}>
            <button
              type="button"
              className={styles.chip}
              onClick={() => (latest ? setModal({ type: 'report' }) : needAnswer())}
              data-node-id="2:341"
            >
              Report
            </button>
            <button type="button" className={styles.chip} onClick={useInSentence}>
              Use it in a sentence
            </button>
            <button type="button" className={styles.chip} onClick={() => navigate(paths.today)}>
              More Singlish
            </button>
          </div>
          <p className={styles.disclaimer}>
            <img src={infoIcon} alt="" width={12} height={12} />
            AI-generated answers may contain mistakes.
          </p>
        </div>

        <form className={styles.inputBar} onSubmit={submit} data-node-id="2:347" data-allow-bleed>
          <button type="button" className={styles.addButton} onClick={() => setModal({ type: 'context' })} aria-label="Choose context">
            <img src={plusIcon} alt="" width={18} height={18} />
          </button>
          <input
            ref={inputRef}
            className={styles.input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Ask IntentAI anything"
            placeholder="Ask IntentAI anything…"
            maxLength={500}
          />
          <button type="button" className={styles.micButton} onClick={voice} aria-label="Voice input">
            <img src={micIcon} alt="" width={20} height={20} />
          </button>
          <button type="submit" className={styles.sendButton} aria-label="Send">
            <img src={sendIcon} alt="" width={18} height={18} />
          </button>
        </form>
      </div>

      {modal?.type === 'context' && (
        <ContextDialog
          initial={
            modal.exchangeId === undefined
              ? context
              : (exchanges.find((exchange) => exchange.id === modal.exchangeId)?.context ?? context)
          }
          onSave={(label) => saveContext(label, modal.exchangeId)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'report' && <ReportDialog onSave={report} onClose={() => setModal(null)} />}
      {modal?.type === 'options' && (
        <Dialog title="Chat options" onClose={() => setModal(null)}>
          <div className="dialog-row">
            <button type="button" className="dialog-secondary" onClick={clearChat}>
              Clear chat
            </button>
            <button type="button" className="dialog-secondary" onClick={() => navigate(paths.mySpace)}>
              Edit my profile
            </button>
          </div>
        </Dialog>
      )}
    </AppShell>
  );
}

/** The demo user's initial, shared by the greeting and the user's avatar. */
const USER_INITIAL = 'W';

function AiAvatar() {
  return (
    <span className={styles.aiAvatar} aria-hidden="true">
      <img src={sparkleIcon} alt="" width={16.24} height={16.24} />
    </span>
  );
}

interface ExchangeViewProps {
  exchange: Exchange;
  /** The first exchange carries the Figma node ids used by the geometry test. */
  first: boolean;
  onContext: () => void;
  onCopy: () => void;
  onFeedback: (feedback: Feedback) => void;
  onRegenerate: () => void;
}

function ExchangeView({ exchange, first, onContext, onCopy, onFeedback, onRegenerate }: ExchangeViewProps) {
  const { answer } = exchange;
  const context = contextFor(exchange.context);
  return (
    <>
      {exchange.question !== undefined && (
        <div className={styles.userRow} data-node-id={first ? '2:312' : undefined}>
          <div className={styles.userMessage}>
            <p className={styles.userBubble}>{exchange.question}</p>
            <button type="button" className={styles.contextCard} onClick={onContext} data-node-id={first ? '2:316' : undefined}>
              <span className={styles.contextBadge} aria-hidden="true">
                {context.icon}
              </span>
              <span className={styles.contextLabel}>context: {exchange.context}</span>
              <img className={styles.contextCheck} src={checkIcon} alt="" width={16} height={16} />
            </button>
          </div>
          <span className={styles.userAvatar} aria-hidden="true">
            {USER_INITIAL}
          </span>
        </div>
      )}
      <article className={styles.aiRow} aria-label={exchange.question ? `IntentAI answer: ${exchange.question}` : 'IntentAI answer'} data-node-id={first ? '2:321' : undefined}>
        <AiAvatar />
        <div className={styles.aiMessage}>
          <div className={styles.aiBubble}>
            <p>
              {answer.term ? (
                <>
                  “<strong>{answer.term}</strong>”{answer.lead}
                </>
              ) : (
                answer.lead
              )}
            </p>
            {answer.detail && <p>{answer.detail}</p>}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.action} onClick={onCopy} aria-label="Copy answer">
              <img src={copyIcon} alt="" width={16} height={16} />
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => onFeedback('up')}
              aria-label="Helpful"
              aria-pressed={exchange.feedback === 'up'}
            >
              <img src={thumbsUpIcon} alt="" width={16} height={16} />
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => onFeedback('down')}
              aria-label="Not helpful"
              aria-pressed={exchange.feedback === 'down'}
            >
              <img src={thumbsDownIcon} alt="" width={16} height={16} />
            </button>
            <button type="button" className={styles.action} onClick={onRegenerate} aria-label="Regenerate">
              <img src={regenerateIcon} alt="" width={16} height={16} />
            </button>
          </div>
        </div>
      </article>
    </>
  );
}

function ContextDialog({ initial, onSave, onClose }: { initial: string; onSave: (label: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <Dialog title="Choose context" onClose={onClose}>
      <form
        className={styles.dialogForm}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(value);
        }}
      >
        <label>
          Where did you hear it?
          <select value={value} onChange={(event) => setValue(event.target.value)}>
            {ASK_CONTEXTS.map((option) => (
              <option key={option.label}>{option.label}</option>
            ))}
          </select>
        </label>
        <div className="dialog-row">
          <button type="button" className="dialog-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="dialog-primary">
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ReportDialog({ onSave, onClose }: { onSave: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <Dialog title="Report this answer" onClose={onClose}>
      <form
        className={styles.dialogForm}
        onSubmit={(event) => {
          event.preventDefault();
          const text = requireText(event.currentTarget, 'reason');
          if (text !== null) onSave(text);
        }}
      >
        <label>
          What seems wrong?
          <textarea name="reason" value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={1000} />
        </label>
        <div className="dialog-row">
          <button type="button" className="dialog-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="dialog-primary">
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}
