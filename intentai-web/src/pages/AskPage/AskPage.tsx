import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
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
import { culturePrefsStore, lookupsStore, openedCardsStore, reportsStore, tipsStore } from '../../data/stores';
import type { Tip } from '../../data/domain';
import { markCardOpened } from '../../data/openedCards';
import { usePersistentStore } from '../../data/persistentStore';
import { dismissToast, showToast } from '../../hooks/useToast';
import { paths, type AskHandoff, type CommunityHandoff } from '../../routes';
import {
  DEFAULT_SUBJECT,
  SUBJECTS,
  askFromCards,
  cardAnswerText,
  cardById,
  detectTopic,
  recommend,
  rewriteHere,
  subjectById,
  suggestionFor,
  topicInfo,
  topicsIn,
  type Card,
  type CardAnswer,
  type Recommendation,
  type Subject,
  type Topic,
} from './cards';
import { AskLocalRow, CardAnswerBody, NoCardBody, Recommendations, SourceCardDialog, StartPanel, TopicSwitch } from './CardViews';
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

type Exchange = { id: number; feedback?: Feedback } & (
  | {
      kind: 'phrase';
      /** The user's question; a follow-up answer ("Use it in a sentence") has none of its own. */
      question?: string;
      context: string;
      mode: 'explain' | 'sentence';
      /** The phrase a sentence answer is about. */
      phraseId?: string;
      answer: Answer;
    }
  | {
      kind: 'card';
      question: string;
      subjectId: string;
      answer: CardAnswer;
      recs: Recommendation[];
      /** The local tip on the source card when this answer was given, if any. */
      tip?: Tip;
    }
);
type PhraseExchange = Extract<Exchange, { kind: 'phrase' }>;
type NewExchange = Omit<PhraseExchange, 'id'> | Omit<Extract<Exchange, { kind: 'card' }>, 'id'>;

type Modal = { type: 'context'; exchangeId?: number } | { type: 'report'; exchangeId: number } | { type: 'options' } | { type: 'card'; cardId: string };

function phraseAnswerFor(exchange: PhraseExchange): Answer {
  const phrase = PHRASES.find((p) => p.id === exchange.phraseId);
  if (exchange.mode === 'sentence' && phrase) return inSentence(phrase);
  return explain(exchange.question ?? '', exchange.context);
}

/** A question that asks what a word means goes to the phrase explainer even when it names no known phrase. */
const MEANING = /\b(mean|meaning|means|singlish|slang)\b/i;

export default function AskPage() {
  const navigate = useNavigate();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  // "New chat" Undo restores state that lives only on this page, so close that toast if we leave.
  const newChatToast = useRef<number>();
  useEffect(() => () => dismissToast(newChatToast.current ?? -1), []);
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [subject, setSubject] = useState<Subject>(DEFAULT_SUBJECT);
  /** The topic picked on the switch or a tile; while none is picked the switch follows what is typed. */
  const [pickedTopic, setPickedTopic] = useState<Topic | undefined>();
  const [draft, setDraft] = useState('');
  const [modal, setModal] = useState<Modal | null>(null);
  const [opened] = usePersistentStore(openedCardsStore);
  const [prefs] = usePersistentStore(culturePrefsStore);
  useSpan('activity', 'Ask › typing', draft.trim() !== '');
  useSpan('activity', 'Ask › context', modal?.type === 'context');
  useSpan('activity', 'Ask › report', modal?.type === 'report');
  useSpan('activity', 'Ask › source card', modal?.type === 'card');
  const nextId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);

  const typedTopic = detectTopic(draft);
  const activeTopic = draft.trim() ? (typedTopic ?? pickedTopic) : pickedTopic;

  // Bring the newest question to the top of the chat, so its answer reads from the start.
  useEffect(() => {
    if (exchanges.length > 0) latestRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [exchanges.length]);

  const append = (exchange: NewExchange) => {
    const id = nextId.current;
    nextId.current += 1;
    setExchanges((prev) => [...prev, { ...exchange, id } as Exchange]);
  };

  const askPhrase = (question: string, where: string) => {
    append({ kind: 'phrase', question, context: where, mode: 'explain', answer: explain(question, where) });
    const phrase = findPhrase(question);
    // A recognised phrase is kept in Moments (lookups store).
    if (phrase) lookupsStore.set((list) => addLookup(list, { id: phrase.id, word: phrase.title, meaning: phrase.meaning }));
  };

  const askCards = (question: string, options: { cardId?: string; topic?: Topic } = {}, about: Subject = subject) => {
    const answer = askFromCards(question, about, options);
    const asked = exchanges.flatMap((e) => (e.kind === 'card' && e.answer.kind === 'card' ? [e.answer.card.article.id] : []));
    const exclude = answer.kind === 'card' ? [answer.card.article.id, ...asked] : asked;
    const recs = recommend(about, { opened, interests: prefs.categories, exclude });
    const tip = answer.kind === 'card' ? tipsStore.get().find((t) => t.cardId === answer.card.article.id) : undefined;
    if (tip) tipsStore.set((prev) => prev.map((t) => (t.id === tip.id ? { ...t, cited: t.cited + 1 } : t)));
    append({ kind: 'card', question, subjectId: about.id, answer, recs, tip });
  };

  const ask = (question: string) => {
    if (findPhrase(question)) return askPhrase(question, context);
    const answer = askFromCards(question, subject, { topic: pickedTopic && !detectTopic(question) ? pickedTopic : undefined });
    if (answer.kind === 'none' && MEANING.test(question)) return askPhrase(question, context);
    askCards(question, { topic: pickedTopic && !detectTopic(question) ? pickedTopic : undefined });
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question) {
      inputRef.current?.focus();
      return;
    }
    ask(question);
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
    const area = subjectById(pending.area);
    if (area) setSubject(area);
    if (pending.context) setContext(pending.context);
    if (findPhrase(pending.prompt) || !area) askPhrase(pending.prompt, pending.context ?? context);
    else askCards(pending.prompt, {}, area);
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
        if (exchange.kind !== 'phrase') return exchange;
        const moved = { ...exchange, context: label };
        return { ...moved, answer: phraseAnswerFor(moved), feedback: undefined };
      });
    }
    setModal(null);
    showToast(`Context set: ${label}`);
  };

  const useInSentence = (exchange: PhraseExchange) => {
    const phrase = PHRASES.find((p) => p.id === exchange.answer.phraseId);
    if (!phrase) return;
    append({ kind: 'phrase', context: exchange.context, mode: 'sentence', phraseId: phrase.id, answer: inSentence(phrase) });
  };

  const textOf = (exchange: Exchange) =>
    exchange.kind === 'phrase' ? answerText(exchange.answer) : cardAnswerText(exchange.answer, subjectById(exchange.subjectId) ?? subject);

  const copy = async (exchange: Exchange) => {
    try {
      await navigator.clipboard.writeText(textOf(exchange));
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
    updateExchange(id, (exchange) =>
      exchange.kind === 'phrase' ? { ...exchange, answer: phraseAnswerFor(exchange), feedback: undefined } : exchange,
    );
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

  const report = (exchangeId: number, reason: string) => {
    const exchange = exchanges.find((e) => e.id === exchangeId);
    if (!exchange) return;
    reportsStore.set((list) => [...list, { answer: textOf(exchange), reason }]);
    setModal(null);
    showToast('Report saved on this device');
  };

  const askLocal = (question: string, about: Subject, answer?: CardAnswer) => {
    const card = answer?.kind === 'card' ? answer.card : undefined;
    const handoffToCommunity: CommunityHandoff = {
      askLocal: rewriteHere(question, about.short),
      link: { areaId: about.id, areaName: about.short, topic: card?.topic ?? answer?.topic, cardId: card?.article.id, from: 'ask' },
    };
    navigate(paths.community, { state: handoffToCommunity });
  };

  const askLocalAboutPhrase = (exchange: PhraseExchange) => {
    const phrase = PHRASES.find((p) => p.id === exchange.answer.phraseId);
    const saved = phrase && lookupsStore.get().find((l) => l.word.toLowerCase() === phrase.title.toLowerCase());
    const handoffToCommunity: CommunityHandoff = {
      askLocal: exchange.question ?? (phrase ? `What does “${phrase.title}” mean here?` : ''),
      context: exchange.context,
      link: { lookupId: saved?.id, from: 'ask' },
    };
    navigate(paths.community, { state: handoffToCommunity });
  };

  const openCard = (cardId: string) => {
    markCardOpened(cardId);
    setModal({ type: 'card', cardId });
  };

  const pickTopic = (topic: Topic) => {
    setPickedTopic((current) => (current === topic && !draft.trim() ? undefined : topic));
    inputRef.current?.focus();
  };

  /** A topic picked on an off-topic answer: answer from that topic's first card. */
  const answerTopic = (topic: Topic, about: Subject) => {
    const card = about.cards.find((c) => c.topic === topic);
    if (!card) return;
    setPickedTopic(topic);
    askCards(suggestionFor(card, about).question, { cardId: card.article.id }, about);
  };

  const changeSubject = (id: string) => {
    const next = subjectById(id);
    if (!next) return;
    setSubject(next);
    if (pickedTopic && !topicsIn(next).includes(pickedTopic)) setPickedTopic(undefined);
  };

  const modalCard = modal?.type === 'card' ? cardById(modal.cardId) : undefined;
  const placeholder = activeTopic ? `Ask about ${topicInfo(activeTopic).article}` : 'Ask about a food, monument, festival or phrase';

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

        <div className={styles.subjectBar}>
          <label className={styles.subjectLabel} htmlFor="ask-subject">
            Asking about
          </label>
          <select id="ask-subject" className={styles.subjectSelect} value={subject.id} onChange={(event) => changeSubject(event.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short}
              </option>
            ))}
          </select>
          <span className={styles.cardCount}>
            {subject.cards.length} {subject.cards.length === 1 ? 'card' : 'cards'}
          </span>
        </div>

        <div className={styles.chat} ref={chatRef} role="log" aria-label="Conversation" aria-live="polite">
          <div className={styles.aiRow}>
            <AiAvatar />
            <div className={styles.aiMessage}>
              <div className={styles.aiBubble}>
                <p>
                  Hi {USER_INITIAL}. What would you like to know about the food, monuments or festivals of {subject.short}?
                </p>
                <p className={styles.aside}>Heard a Singlish phrase? Ask me what it means, too.</p>
              </div>
            </div>
          </div>

          {exchanges.length === 0 && (
            <StartPanel subject={subject} topic={pickedTopic} onTopic={pickTopic} onAsk={(q, cardId) => askCards(q, { cardId })} />
          )}

          {exchanges.map((exchange, index) => (
            <div key={exchange.id} ref={index === exchanges.length - 1 ? latestRef : undefined} className={styles.exchange}>
              {exchange.kind === 'phrase' ? (
                <PhraseExchangeView
                  exchange={exchange}
                  onContext={() => setModal({ type: 'context', exchangeId: exchange.id })}
                  onSentence={() => useInSentence(exchange)}
                  onAskLocal={() => askLocalAboutPhrase(exchange)}
                  actions={
                    <Actions
                      exchange={exchange}
                      onCopy={() => copy(exchange)}
                      onFeedback={(f) => setFeedback(exchange.id, f)}
                      onRegenerate={() => regenerate(exchange.id)}
                      onReport={() => setModal({ type: 'report', exchangeId: exchange.id })}
                    />
                  }
                />
              ) : (
                <CardExchangeView
                  exchange={exchange}
                  fallback={subject}
                  opened={opened}
                  onOpen={(card) => openCard(card.article.id)}
                  onAsk={(q, cardId) => askCards(q, { cardId }, subjectById(exchange.subjectId) ?? subject)}
                  onTopic={(t) => answerTopic(t, subjectById(exchange.subjectId) ?? subject)}
                  onAskLocal={() => askLocal(exchange.question, subjectById(exchange.subjectId) ?? subject, exchange.answer)}
                  actions={
                    <Actions
                      exchange={exchange}
                      onCopy={() => copy(exchange)}
                      onFeedback={(f) => setFeedback(exchange.id, f)}
                      onReport={() => setModal({ type: 'report', exchangeId: exchange.id })}
                    />
                  }
                />
              )}
            </div>
          ))}
        </div>

        <div className={styles.composer} data-node-id="2:339" data-allow-bleed>
          <TopicSwitch subject={subject} active={activeTopic} onPick={pickTopic} />
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
            placeholder={placeholder}
            maxLength={500}
          />
          <button type="button" className={styles.micButton} onClick={voice} aria-label="Voice input">
            <img src={micIcon} alt="" width={20} height={20} />
          </button>
          <button type="submit" className={styles.sendButton} aria-label="Send">
            <img src={sendIcon} alt="" width={18} height={18} />
          </button>
        </form>
        <p className={styles.disclaimer}>
          <img src={infoIcon} alt="" width={12} height={12} />
          Answers come from your cards and can still be wrong.
        </p>
      </div>

      {modal?.type === 'context' && (
        <ContextDialog
          initial={(() => {
            const e = modal.exchangeId === undefined ? undefined : exchanges.find((x) => x.id === modal.exchangeId);
            return e?.kind === 'phrase' ? e.context : context;
          })()}
          onSave={(label) => saveContext(label, modal.exchangeId)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'report' && <ReportDialog onSave={(reason) => report(modal.exchangeId, reason)} onClose={() => setModal(null)} />}
      {modalCard && <SourceCardDialog card={modalCard} onClose={() => setModal(null)} />}
      {modal?.type === 'options' && (
        <Dialog title="Chat options" onClose={() => setModal(null)}>
          <div className="dialog-row">
            <button type="button" className="dialog-secondary" onClick={clearChat}>
              Clear chat
            </button>
            <button type="button" className="dialog-secondary" onClick={() => navigate(paths.welcome)}>
              Personalise setup
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

function Actions({
  exchange,
  onCopy,
  onFeedback,
  onRegenerate,
  onReport,
}: {
  exchange: Exchange;
  onCopy: () => void;
  onFeedback: (feedback: Feedback) => void;
  onRegenerate?: () => void;
  onReport: () => void;
}) {
  return (
    <div className={styles.actions}>
      <button type="button" className={styles.action} onClick={onCopy} aria-label="Copy answer">
        <img src={copyIcon} alt="" width={16} height={16} />
      </button>
      <button type="button" className={styles.action} onClick={() => onFeedback('up')} aria-label="Helpful" aria-pressed={exchange.feedback === 'up'}>
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
      {onRegenerate && (
        <button type="button" className={styles.action} onClick={onRegenerate} aria-label="Regenerate">
          <img src={regenerateIcon} alt="" width={16} height={16} />
        </button>
      )}
      <button type="button" className={styles.action} onClick={onReport} aria-label="Report this answer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
        </svg>
      </button>
    </div>
  );
}

function UserQuestion({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className={styles.userRow}>
      <div className={styles.userMessage}>
        <p className={styles.userBubble}>{text}</p>
        {children}
      </div>
      <span className={styles.userAvatar} aria-hidden="true">
        {USER_INITIAL}
      </span>
    </div>
  );
}

function PhraseExchangeView({
  exchange,
  onContext,
  onSentence,
  onAskLocal,
  actions,
}: {
  exchange: PhraseExchange;
  onContext: () => void;
  onSentence: () => void;
  onAskLocal: () => void;
  actions: ReactNode;
}) {
  const { answer } = exchange;
  const context = contextFor(exchange.context);
  return (
    <>
      {exchange.question !== undefined && (
        <UserQuestion text={exchange.question}>
          <button type="button" className={styles.contextCard} onClick={onContext}>
            <span className={styles.contextBadge} aria-hidden="true">
              {context.icon}
            </span>
            <span className={styles.contextLabel}>context: {exchange.context}</span>
            <img className={styles.contextCheck} src={checkIcon} alt="" width={16} height={16} />
          </button>
        </UserQuestion>
      )}
      <article className={styles.aiRow} aria-label={exchange.question ? `IntentAI answer: ${exchange.question}` : 'IntentAI answer'}>
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
          {actions}
          {exchange.mode === 'explain' && answer.phraseId && (
            <div className={styles.phraseChips}>
              <button type="button" className={styles.chip} onClick={onSentence}>
                Use it in a sentence
              </button>
              <button type="button" className={styles.chip} onClick={onAskLocal}>
                Ask a local
              </button>
            </div>
          )}
        </div>
      </article>
    </>
  );
}

function CardExchangeView({
  exchange,
  fallback,
  opened,
  onOpen,
  onAsk,
  onTopic,
  onAskLocal,
  actions,
}: {
  exchange: Extract<Exchange, { kind: 'card' }>;
  fallback: Subject;
  opened: readonly string[];
  onOpen: (card: Card) => void;
  onAsk: (question: string, cardId: string) => void;
  onTopic: (topic: Topic) => void;
  onAskLocal: () => void;
  actions: ReactNode;
}) {
  const about = subjectById(exchange.subjectId) ?? fallback;
  const { answer } = exchange;
  const topic = answer.kind === 'card' ? answer.topic : undefined;
  return (
    <>
      <UserQuestion text={exchange.question}>
        <span className={styles.questionTag}>
          {about.short} · {topic ? topicInfo(topic).label : 'No topic'}
        </span>
      </UserQuestion>
      <article className={styles.aiRow} aria-label={`IntentAI answer: ${exchange.question}`}>
        <AiAvatar />
        <div className={styles.aiMessageWide}>
          {answer.kind === 'card' ? (
            <>
              <CardAnswerBody answer={answer} subject={about} tip={exchange.tip} onOpen={onOpen} />
              {actions}
              <AskLocalRow onAskLocal={onAskLocal} />
              <Recommendations items={exchange.recs} basedOnOpened={opened.length > 0} onAsk={onAsk} />
            </>
          ) : (
            <>
              <NoCardBody subject={about} topic={answer.topic} onTopic={onTopic} onAskLocal={onAskLocal} />
              {actions}
            </>
          )}
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
