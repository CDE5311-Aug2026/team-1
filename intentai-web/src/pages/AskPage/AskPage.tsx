// Ask (v3): the ZIP prototype's interaction on the app's real content.
// Home → two image cards or a free question. A question is answered as
//   · "Understand the meaning" (a phrase reading: literal / what they might mean / still unclear), or
//   · "Learn culture" (from the cards of the area that answers best, or an attached card), or
//   · honestly not at all, with topics and Ask a local.
// Nothing here calls a model: readings are team-written (answer.ts) and card answers quote the cards (cards.ts).
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeLink from '../../components/HomeLink/HomeLink';
import infoIcon from '../../assets/ask/info.svg';
import micIcon from '../../assets/ask/mic.svg';
import plusIcon from '../../assets/ask/plus.svg';
import sendIcon from '../../assets/ask/send.svg';
import AppShell from '../../components/AppShell/AppShell';
import Dialog from '../../components/Dialog/Dialog';
import { addLookup, makeId, newQuestion, type AskAttachmentKind, type AskContextRef, type AskThread, type AskTurn, type Insight, type Question, type Tip } from '../../data/domain';
import { activeMemories, learnFrom, memoryStore, remember } from '../../data/memory';
import { profileV3Store } from '../../data/profile/profile';
import { localProfileStore, withPrefill } from '../../data/profile/localProfile';
import { communitySocialStore } from '../../data/community/social';
import {
  ACCEPT,
  AddSheet,
  ComposerTray,
  ContextPicker,
  FilesNote,
  MAX_CONTEXT,
  MemoryPill,
  RememberedNote,
  SentExtras,
  addFiles,
  contextRef,
  filesNote,
  isTextDoc,
  metaOf,
  releaseUrl,
  textOpening,
  type AttachedFile,
  type ContextItem,
} from './Attachments';
import { contextLists } from './contextSources';
import {
  askThreadsStore,
  culturePrefsStore,
  insightsStore,
  lookupsStore,
  openedCardsStore,
  questionsStore,
  reduceMotionStore,
  reportsStore,
  tipsStore,
} from '../../data/stores';
import { markCardOpened } from '../../data/openedCards';
import { usePersistentStore } from '../../data/persistentStore';
import { dismissToast, showToast } from '../../hooks/useToast';
import { requireText } from '../../hooks/requireText';
import { useReducedMotionConfig } from 'motion/react';
import { detectSituation, findEntry, situationIsThin } from './guide';
import { ConfirmPanel, HowIRead, ReadingCard, SituationCard, Thinking, stepsFor } from './MeaningViews';
import { paths, type AskHandoff, type CommunityHandoff } from '../../routes';
import { useSpan } from '../../usage/useSpan';
import Toggle from '../../components/Toggle/Toggle';
import historyIcon from '../../assets/v3/history.svg';
import moreIcon from '../../assets/v3/more.svg';
import { HistorySheet } from './HistorySheet';
import { V3_PHOTO_CREDITS } from '../../assets/v3/credits';
import Magnet from '../../components/reactbits/Magnet';
import { AskHome, EntrySheet, type EntryKind } from './AskHome';
import homeStyles from './AskHome.module.css';
import { Recommendations, SourceCardDialog } from './CardViews';
import {
  DEFAULT_SUBJECT,
  SUBJECTS,
  askAcross,
  askFromCards,
  cardAnswerText,
  cardById,
  recommend,
  rewriteHere,
  subjectById,
  subjectOfCard,
  suggestionFor,
  type Card,
  type CardAnswer,
  type Recommendation,
  type Subject,
  type Topic,
} from './cards';
import {
  EMPTY_SITUATION,
  SITUATION_PRESETS,
  findPhrase,
  readingFor,
  readingText,
  situationText,
  type Reading,
  type Situation,
} from './answer';
import {
  AnswerActions,
  AssistantLabel,
  AttachCardOptions,
  AttachedChip,
  CardPaper,
  Chip,
  Chips,
  NoCardPaper,
  ReplyCard,
  SituationSheet,
  Reveal,
  ThreadDate,
  TopicChips,
  UserMessage,
} from './Conversation';
import styles from './AskPage.module.css';
import { startVoiceInput } from './voice';

interface Common {
  id: number;
  question: string;
  helpful?: boolean;
  /** Id of the Moments insight saved from this answer. */
  savedId?: string;
  /** Files sent with the question (previews only while this tab is open). */
  attachments?: AttachedFile[];
  /** Context added from the + menu. */
  context?: AskContextRef[];
  /** What Ask matched against when it was more than the question (context, a document's opening). */
  lens?: string;
  /** The answer's line about the files. */
  note?: string;
  /** What memory kept from the question. */
  remembered?: string;
}
type Extras = Pick<Common, 'attachments' | 'context' | 'lens' | 'note' | 'remembered'>;

type Exchange = Common &
  (
    | {
        kind: 'meaning';
        situation: Situation;
        /** What the sentence itself said about the situation (pre-selected chips). */
        auto: Partial<Situation>;
        /** context: the situation card is open · thinking: the steps run · done: the reading shows. */
        stage: 'context' | 'thinking' | 'done';
        /** Undefined when the phrase isn't one the guide knows. */
        reading?: Reading;
        phraseId?: string;
        showingReply: boolean;
        softer: boolean;
        /** The Community question that asks a local to confirm this reading. */
        questionId?: string;
      }
    | {
        kind: 'card';
        subjectId: string;
        answer: CardAnswer;
        recs: Recommendation[];
        tip?: Tip;
        /** The card the user attached; the answer used only it. */
        attachedId?: string;
        /** The card a suggested / recommended / topic question was bound to (for History). */
        boundCardId?: string;
      }
  );
type MeaningExchange = Extract<Exchange, { kind: 'meaning' }>;
type CardExchange = Extract<Exchange, { kind: 'card' }>;
type NewExchange = Omit<MeaningExchange, 'id'> | Omit<CardExchange, 'id'>;

type Modal =
  | { type: 'entry'; kind: EntryKind }
  | { type: 'situation'; exchangeId?: number }
  | { type: 'attach' }
  | { type: 'context' }
  | { type: 'report'; exchangeId: number }
  | { type: 'settings' }
  | { type: 'history' }
  | { type: 'card'; cardId: string };

/** A question that asks what a word means goes to the phrase guide even when it names no known phrase. */
const MEANING = /\b(mean|meaning|means|singlish|slang)\b|什么意思|意思/i;

/** What History keeps of an exchange: enough to rebuild its answer. Files keep only their name, kind, size and type. */
function turnOf(e: Exchange): AskTurn {
  const extras: Partial<AskTurn> = {};
  if (e.attachments?.length) extras.attachments = e.attachments.map(metaOf);
  if (e.context?.length) extras.context = e.context;
  if (e.lens) extras.lens = e.lens;
  if (e.note) extras.note = e.note;
  if (e.remembered) extras.remembered = e.remembered;
  if (e.kind === 'meaning') {
    return { kind: 'meaning', question: e.question, situation: e.situation, showingReply: e.showingReply, softer: e.softer, questionId: e.questionId, ...extras };
  }
  return { kind: 'card', question: e.question, subjectId: e.subjectId, boundCardId: e.boundCardId, attachedId: e.attachedId, ...extras };
}

/** The extras of a History turn, back on screen (files without their previews). */
function extrasOf(turn: AskTurn, index: number): Extras {
  return {
    attachments: turn.attachments?.map((a, i) => ({ ...a, id: `h${index}-${i}` })),
    context: turn.context,
    lens: turn.lens,
    note: turn.note,
    remembered: turn.remembered,
  };
}

/** What to send when the input is empty but files or context were added. */
function defaultQuestion(files: readonly AttachedFile[], context: readonly ContextItem[]): string {
  const first = context.find((c) => c.ask);
  if (first?.ask) return first.ask;
  return files.length === 1 ? 'Can you help me with this file?' : 'Can you help me with these files?';
}

/** Ask context label (Nearby handoff) → a situation. */
function situationForLabel(label: string | undefined): Situation {
  const preset = SITUATION_PRESETS.find((p) => p.label.toLowerCase() === label?.toLowerCase());
  return preset ? preset.situation : EMPTY_SITUATION;
}

export default function AskPage() {
  const navigate = useNavigate();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  // "New chat" Undo restores state that lives only on this page, so close that toast if we leave.
  const newChatToast = useRef<number>();
  useEffect(() => () => dismissToast(newChatToast.current ?? -1), []);
  /** Where / who / topic for the next phrase question. */
  const [situation, setSituation] = useState<Situation>(EMPTY_SITUATION);
  /** The area the last card answer came from (for topics and follow-ups). */
  const [subject, setSubject] = useState<Subject>(DEFAULT_SUBJECT);
  /** Set by "ask my own" on a home card. Cleared by Clear or New chat. */
  const [entryKind, setEntryKind] = useState<EntryKind | undefined>();
  const [attachedId, setAttachedId] = useState<string | undefined>();
  const [draft, setDraft] = useState('');
  const [modal, setModal] = useState<Modal | null>(null);
  /** Files and context waiting in the composer. */
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [fileError, setFileError] = useState<string | undefined>();
  const fileInputs = useRef<Partial<Record<AskAttachmentKind, HTMLInputElement | null>>>({});
  /** Every preview URL made here, released when the page goes. */
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach(releaseUrl), []);
  /** Files, context and memory for the exchange being added (set around ask()). */
  const extras = useRef<Extras | undefined>();
  const [memory] = usePersistentStore(memoryStore);
  const [profile] = usePersistentStore(profileV3Store);
  const [localProfile] = usePersistentStore(localProfileStore);
  const [social] = usePersistentStore(communitySocialStore);
  const [lookups] = usePersistentStore(lookupsStore);
  const [tips] = usePersistentStore(tipsStore);
  const memories = useMemo(() => activeMemories(memory, profile, withPrefill(localProfile, profile)), [memory, profile, localProfile]);
  const [opened] = usePersistentStore(openedCardsStore);
  const [prefs] = usePersistentStore(culturePrefsStore);
  const [insights] = usePersistentStore(insightsStore);
  const [threads] = usePersistentStore(askThreadsStore);
  const [questions] = usePersistentStore(questionsStore);
  /** Motion is off (system or the app setting): skip the thinking steps. */
  const motionOff = Boolean(useReducedMotionConfig());
  const [reduceMotion, setReduceMotion] = usePersistentStore(reduceMotionStore);
  /** The History record this chat is saved under (a new one per New chat). */
  const threadId = useRef(makeId());
  useSpan('activity', 'Ask › typing', draft.trim() !== '');
  useSpan('activity', 'Ask › context', modal?.type === 'situation');
  useSpan('activity', 'Ask › report', modal?.type === 'report');
  useSpan('activity', 'Ask › source card', modal?.type === 'card');
  const nextId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  const attached = attachedId ? cardById(attachedId) : undefined;

  // Bring the newest question to the top of the chat, so its answer reads from the start.
  useEffect(() => {
    if (exchanges.length > 0) latestRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [exchanges.length]);

  // Every chat goes to History as it happens (ZIP: History keeps chats; Moments only what you save).
  useEffect(() => {
    if (exchanges.length === 0) return;
    const id = threadId.current;
    const now = Date.now();
    askThreadsStore.set((list) => {
      const previous = list.find((t) => t.id === id);
      const thread: AskThread = {
        id,
        title: exchanges[0].question,
        turns: exchanges.map(turnOf),
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      return [thread, ...list.filter((t) => t.id !== id)].slice(0, 50);
    });
  }, [exchanges]);

  /** Reopen a chat from History: answers are rebuilt from the cards and phrase guide (as in the ZIP prototype). */
  const openThread = (thread: AskThread) => {
    const rebuilt: Exchange[] = thread.turns.map((turn, index) => {
      if (turn.kind === 'meaning') {
        const where = turn.situation ?? EMPTY_SITUATION;
        const text = turn.lens ?? turn.question;
        return {
          ...extrasOf(turn, index),
          id: index,
          kind: 'meaning',
          question: turn.question,
          situation: where,
          auto: {},
          stage: 'done',
          reading: readingFor(text, where),
          phraseId: findEntry(text)?.id,
          showingReply: Boolean(turn.showingReply),
          softer: Boolean(turn.softer),
          questionId: turn.questionId,
        };
      }
      const about = subjectById(turn.subjectId) ?? subject;
      let answer = turn.attachedId
        ? askFromCards(turn.question, about, { cardId: turn.attachedId, strict: true })
        : turn.boundCardId
          ? askFromCards(turn.question, about, { cardId: turn.boundCardId })
          : askFromCards(turn.question, about);
      if (answer.kind === 'none' && turn.lens && !turn.attachedId && !turn.boundCardId) answer = askFromCards(turn.lens, about);
      const tip = answer.kind === 'card' ? tipsStore.get().find((t) => t.cardId === answer.card.article.id) : undefined;
      return {
        ...extrasOf(turn, index),
        id: index,
        kind: 'card',
        question: turn.question,
        subjectId: about.id,
        answer,
        recs: turn.attachedId ? [] : recommend(about, { opened, interests: prefs.categories, exclude: answer.kind === 'card' ? [answer.card.article.id] : [] }),
        tip,
        attachedId: turn.attachedId,
        boundCardId: turn.boundCardId,
      };
    });
    nextId.current = rebuilt.length;
    threadId.current = thread.id;
    setExchanges(rebuilt);
    setEntryKind(undefined);
    setAttachedId(undefined);
    setModal(null);
  };

  const append = (exchange: NewExchange) => {
    const id = nextId.current;
    nextId.current += 1;
    const more = extras.current;
    setExchanges((prev) => [...prev, { ...exchange, ...more, id } as Exchange]);
  };

  const update = (id: number, change: (exchange: Exchange) => Exchange) =>
    setExchanges((prev) => prev.map((exchange) => (exchange.id === id ? change(exchange) : exchange)));

  /**
   * A phrase question. What the sentence says about the situation is pre-selected; if who / where / how are still
   * mostly unknown, the situation card opens first. Then the steps run, then the reading.
   */
  const askMeaning = (question: string, base: Situation = situation, baseIsKnown = false, lens?: string) => {
    const text = lens ?? question;
    const auto = detectSituation(text);
    const where: Situation = { ...base, ...auto };
    const entry = findEntry(text);
    // Skip the card only when the sentence itself says enough: a new sentence may come from someone else, somewhere
    // else, so an earlier situation is offered pre-selected rather than assumed.
    const stage = situationIsThin(baseIsKnown ? where : { ...EMPTY_SITUATION, ...auto }) ? 'context' : motionOff ? 'done' : 'thinking';
    append({ kind: 'meaning', question, situation: where, auto, stage, reading: readingFor(text, where), phraseId: entry?.id, showingReply: false, softer: false });
    // A recognised phrase is kept in Moments (lookups store).
    if (entry) lookupsStore.set((list) => addLookup(list, { id: entry.id, word: entry.term, meaning: entry.general }));
  };

  /** The situation card was answered (or skipped): read the phrase with it. */
  const readWith = (id: number, next?: Situation) => {
    if (next) setSituation(next);
    update(id, (e) =>
      e.kind === 'meaning'
        ? { ...e, situation: next ?? e.situation, reading: readingFor(e.lens ?? e.question, next ?? e.situation), stage: motionOff ? 'done' : 'thinking' }
        : e,
    );
  };

  /** One tap: a Community question with the sentence, the situation and this reading, for a local to confirm. */
  const sendToLocal = (exchange: MeaningExchange) => {
    const { reading } = exchange;
    const text = reading ? `Is this right? “${exchange.question}”` : exchange.question;
    const detail = [
      exchange.question,
      situationText(exchange.situation) ? `Situation: ${situationText(exchange.situation)}` : '',
      reading ? `IntentAI’s reading: ${reading.meaning} (${reading.confidence.level.toLowerCase()} confidence)` : 'Not in the phrase guide yet.',
    ]
      .filter(Boolean)
      .join('\n');
    const q = { ...newQuestion(text, situationText(exchange.situation), { lookupId: reading ? reading.entry.id : undefined, topic: 'other', from: 'ask' }), detail };
    questionsStore.set((prev) => [q, ...prev]);
    update(exchange.id, (e) => (e.kind === 'meaning' ? { ...e, questionId: q.id } : e));
    showToast('Sent to locals. Their answer will show here.');
  };

  const askCards = (question: string, about: Subject, answer: CardAnswer, attachedCard?: string, boundCardId?: string) => {
    const asked = exchanges.flatMap((e) => (e.kind === 'card' && e.answer.kind === 'card' ? [e.answer.card.article.id] : []));
    const exclude = answer.kind === 'card' ? [answer.card.article.id, ...asked] : asked;
    const recs = attachedCard ? [] : recommend(about, { opened, interests: prefs.categories, exclude });
    const tip = answer.kind === 'card' ? tipsStore.get().find((t) => t.cardId === answer.card.article.id) : undefined;
    if (tip) tipsStore.set((prev) => prev.map((t) => (t.id === tip.id ? { ...t, cited: t.cited + 1 } : t)));
    setSubject(about);
    append({ kind: 'card', question, subjectId: about.id, answer, recs, tip, attachedId: attachedCard, boundCardId });
  };

  /** A card-bound question (an example, a recommendation, a topic). */
  const askCard = (question: string, cardId: string, about: Subject = subjectOfCard(cardId) ?? subject) =>
    askCards(question, about, askFromCards(question, about, { cardId }), undefined, cardId);

  /**
   * Answer a question. `with` is what the + menu added: a card to answer about, a phrase to read, a question or thread
   * to use as the situation, and `lens` (the question plus that context and a document's opening) to match against
   * when the question alone finds nothing.
   */
  const ask = (question: string, withContext: { lens?: string; cardId?: string; phrase?: boolean; detail?: string } = {}) => {
    const { lens, cardId, phrase, detail } = withContext;
    const base: Situation = detail ? { ...situation, detail } : situation;
    if (cardId) return askCard(question, cardId);
    if (entryKind === 'meaning' || phrase) return askMeaning(question, base, false, lens);
    if (attached) {
      const about = subjectOfCard(attached.article.id) ?? subject;
      return askCards(question, about, askFromCards(question, about, { cardId: attached.article.id, strict: true }), attached.article.id);
    }
    if (entryKind !== 'culture' && findEntry(question)) return askMeaning(question, base, false, lens);
    const { subject: about, answer } = askAcross(question, subject);
    if (answer.kind === 'card') return askCards(question, about, answer);
    if (lens) {
      if (entryKind !== 'culture' && findEntry(lens)) return askMeaning(question, base, false, lens);
      const viaLens = askAcross(lens, subject);
      if (viaLens.answer.kind === 'card') return askCards(question, viaLens.subject, viaLens.answer);
    }
    // A sentence the cards don't cover that asks what words mean, quotes someone, or is in Chinese is about meaning.
    if (entryKind !== 'culture' && (MEANING.test(question) || /[“"「『].+[”"」』]/.test(question) || /\p{Script=Han}/u.test(question))) {
      return askMeaning(question, base, false, lens);
    }
    askCards(question, about, answer);
  };

  const canSend = draft.trim() !== '' || files.length > 0 || contextItems.length > 0;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const typed = draft.trim();
    if (!canSend) {
      inputRef.current?.focus();
      return;
    }
    const question = typed || defaultQuestion(files, contextItems);
    const sentFiles = files;
    const sentContext = contextItems;
    setDraft('');
    setFiles([]);
    setContextItems([]);
    setFileError(undefined);

    // Memory: a clear first-person fact ("I'm from Lyon") is kept, unless memory is off.
    const fact = typed ? learnFrom(typed) : undefined;
    if (fact) remember(fact, 'ask');
    const kept = memoryStore.get();
    const remembered = fact && kept.enabled && kept.items.some((m) => m.text.toLocaleLowerCase() === fact.toLocaleLowerCase()) ? fact : undefined;

    const finish = (opening?: { name: string; text: string }) => {
      const card = sentContext.find((c) => c.kind === 'card' && c.cardId);
      const situationFrom = sentContext.find((c) => c.title);
      const texts = [question, ...sentContext.map((c) => (c.phrase ? c.phrase : c.title ? [c.title, c.body].filter(Boolean).join('\n') : '')), opening?.text ?? ''].filter(Boolean);
      const lens = texts.length > 1 ? texts.join('\n') : undefined;
      let note: string | undefined;
      if (sentFiles.length > 0) {
        const entry = opening ? findEntry(opening.text) : undefined;
        const place = opening && !entry ? askAcross(opening.text).answer : undefined;
        const found = entry ? `“${entry.term}”` : place?.kind === 'card' ? `the ${place.card.article.title}` : undefined;
        note = filesNote(sentFiles.map(metaOf), opening ? { name: opening.name, found } : undefined);
      }
      extras.current = { attachments: sentFiles.length ? sentFiles : undefined, context: sentContext.length ? sentContext.map(contextRef) : undefined, lens, note, remembered };
      try {
        ask(question, {
          lens,
          cardId: card?.cardId,
          phrase: sentContext.some((c) => c.kind === 'phrase'),
          detail: situationFrom?.title ? situationFrom.title.slice(0, 140) : undefined,
        });
      } finally {
        extras.current = undefined;
      }
    };
    // Only a .txt document is read (its opening); everything else answers at once.
    if (sentFiles.some(isTextDoc)) void textOpening(sentFiles).then(finish, () => finish());
    else finish();
  };

  const onFiles = (kind: AskAttachmentKind) => (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (picked.length === 0) return;
    const { added, error } = addFiles(files, picked, kind);
    added.forEach((f) => f.url && previews.current.push(f.url));
    setFiles((prev) => [...prev, ...added]);
    setFileError(error);
    if (added.length > 0) setTimeout(() => inputRef.current?.focus(), 0);
  };

  const removeFile = (id: string) => {
    const gone = files.find((f) => f.id === id);
    releaseUrl(gone?.url);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setFileError(undefined);
    inputRef.current?.focus();
  };

  const pickContext = (item: ContextItem) => {
    setContextItems((prev) => (prev.some((c) => c.key === item.key) || prev.length >= MAX_CONTEXT ? prev : [...prev, item]));
    setModal(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Arriving with a question (Nearby → "Ask about this phrase") asks it once, then clears the router state
  // so a reload or Back doesn't ask again.
  const location = useLocation();
  const handoff = useRef(location.state as AskHandoff | null);
  useEffect(() => {
    const pending = handoff.current;
    handoff.current = null;
    if (!pending?.prompt) return;
    const area = subjectById(pending.area);
    if (area) setSubject(area);
    const where = situationForLabel(pending.context);
    setSituation(where);
    // The place's context (from Nearby) is a known situation.
    if (findPhrase(pending.prompt) || !area) askMeaning(pending.prompt, where, true);
    else askCards(pending.prompt, area, askFromCards(pending.prompt, area));
    navigate(paths.ask, { replace: true, state: null });
    // Runs once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSituation = (next: Situation, exchangeId?: number) => {
    setSituation(next);
    if (exchangeId !== undefined) {
      update(exchangeId, (e) => (e.kind === 'meaning' ? { ...e, situation: next, reading: readingFor(e.lens ?? e.question, next) } : e));
    }
    setModal(null);
    showToast(situationText(next) ? 'Context added' : 'Context cleared');
  };

  const textOf = (exchange: Exchange) => {
    if (exchange.kind === 'card') return cardAnswerText(exchange.answer, subjectById(exchange.subjectId) ?? subject);
    return exchange.reading ? readingText(exchange.reading) : 'Not sure yet. Ask a local who knows the situation.';
  };

  const copyText = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(done);
    } catch {
      showToast('Select the text to copy it.');
    }
  };

  const toggleHelpful = (id: number) => {
    update(id, (e) => ({ ...e, helpful: !e.helpful }));
    showToast('Thanks for the feedback');
  };

  /** Save insight: keep this answer in Moments (History keeps every chat; Moments only what you save). */
  const toggleSaved = (exchange: Exchange) => {
    if (isSaved(exchange)) {
      const id = exchange.savedId!;
      insightsStore.set((list) => list.filter((i) => i.id !== id));
      update(exchange.id, (e) => ({ ...e, savedId: undefined }));
      showToast('Removed from Moments');
      return;
    }
    const insight: Insight =
      exchange.kind === 'meaning'
        ? {
            id: makeId(),
            question: exchange.question,
            kind: 'phrase',
            title: exchange.reading?.term ?? exchange.question,
            summary: exchange.reading?.meaning ?? 'Not sure yet: ask a local.',
            lookupId: exchange.phraseId,
            situation: situationText(exchange.situation) || undefined,
            savedAt: Date.now(),
          }
        : {
            id: makeId(),
            question: exchange.question,
            kind: 'card',
            title: exchange.answer.kind === 'card' ? exchange.answer.card.article.title : exchange.question,
            summary: exchange.answer.kind === 'card' ? (exchange.answer.lines[0] ?? exchange.answer.numbers[0]?.caption ?? '') : 'Your cards don’t cover this yet.',
            cardId: exchange.answer.kind === 'card' ? exchange.answer.card.article.id : undefined,
            areaName: (subjectById(exchange.subjectId) ?? subject).short,
            savedAt: Date.now(),
          };
    insightsStore.set((list) => [insight, ...list]);
    update(exchange.id, (e) => ({ ...e, savedId: insight.id }));
    showToast('Saved to Moments');
  };

  /** New chat: the current one stays in History; Undo brings it back on screen. */
  const clearChat = () => {
    const previous = exchanges;
    const previousThread = threadId.current;
    threadId.current = makeId();
    setExchanges([]);
    setDraft('');
    setEntryKind(undefined);
    setAttachedId(undefined);
    setModal(null);
    newChatToast.current = showToast('New chat started', {
      undo: () => {
        threadId.current = previousThread;
        setExchanges(previous);
      },
    });
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

  const askLocalAboutCards = (exchange: CardExchange) => {
    const about = subjectById(exchange.subjectId) ?? subject;
    const { answer } = exchange;
    const card = answer.kind === 'card' ? answer.card : exchange.attachedId ? cardById(exchange.attachedId) : undefined;
    const handoffToCommunity: CommunityHandoff = {
      askLocal: rewriteHere(exchange.question, about.short),
      link: { areaId: about.id, areaName: about.short, topic: card?.topic ?? answer.topic, cardId: card?.article.id, from: 'ask' },
    };
    navigate(paths.community, { state: handoffToCommunity });
  };

  const openCard = (cardId: string) => {
    markCardOpened(cardId);
    setModal({ type: 'card', cardId });
  };

  /** A topic picked under an answer: answer from that topic's first card in the area. */
  const answerTopic = (topic: Topic, about: Subject) => {
    const card = about.cards.find((c) => c.topic === topic);
    if (card) askCard(suggestionFor(card, about).question, card.article.id, about);
  };

  /** Cards to attach: the ones you opened first, then every card that belongs to a place. */
  const attachable = (() => {
    const seen = new Set<string>();
    const list: { card: Card; area: string }[] = [];
    const add = (id: string) => {
      const card = cardById(id);
      const area = subjectOfCard(id);
      if (card && area && !seen.has(id)) {
        seen.add(id);
        list.push({ card, area: area.short });
      }
    };
    [...opened].reverse().forEach(add);
    SUBJECTS.forEach((s) => s.cards.forEach((c) => add(c.article.id)));
    return list.slice(0, 4);
  })();

  /** Saved in Moments (and not removed there since). */
  const isSaved = (exchange: Exchange) => Boolean(exchange.savedId && insights.some((i) => i.id === exchange.savedId));

  const modalCard = modal?.type === 'card' ? cardById(modal.cardId) : undefined;
  const placeholder =
    entryKind === 'meaning'
      ? 'Paste a phrase…'
      : entryKind === 'culture'
        ? 'Ask about culture…'
        : attached
          ? 'Ask anything about this…'
          : exchanges.length > 0
            ? 'Ask a follow-up…'
            : 'Ask anything…';

  return (
    <AppShell background="var(--bg-screen-b)" tabBarNodeId="2:545">
      <div className={styles.page}>
        <header className={styles.header}>
          {/* Figma 71:8: the 58px mascot sits at x=9, in the gutter, like Home's header. */}
          <HomeLink className={styles.logo} nodeId="71:8" />
          <h1 className={styles.srTitle}>Ask</h1>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setModal({ type: 'history' })}
            aria-label="Chat history"
            data-node-id="2:722"
          >
            <img src={historyIcon} alt="" width={18} height={18} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setModal({ type: 'settings' })}
            aria-label="Ask settings"
            data-node-id="2:716"
          >
            <img src={moreIcon} alt="" width={18} height={18} />
          </button>
        </header>

        <div className={styles.chat} role="log" aria-label="Conversation" aria-live="polite">
          {exchanges.length === 0 ? <AskHome onOpen={(kind) => setModal({ type: 'entry', kind })} /> : <ThreadDate />}

          {exchanges.map((exchange, index) => (
            <div key={exchange.id} ref={index === exchanges.length - 1 ? latestRef : undefined} className={styles.exchange}>
              {exchange.kind === 'meaning' ? (
                <MeaningView
                  exchange={exchange}
                  fresh={index === exchanges.length - 1}
                  localQuestion={exchange.questionId ? questions.find((q) => q.id === exchange.questionId) : undefined}
                  onRead={(next) => readWith(exchange.id, next)}
                  onSkip={() => readWith(exchange.id)}
                  onThought={() => update(exchange.id, (e) => (e.kind === 'meaning' ? { ...e, stage: 'done' } : e))}
                  onSend={() => sendToLocal(exchange)}
                  saved={isSaved(exchange)}
                  onCopy={() => copyText(textOf(exchange), 'Answer copied')}
                  onHelpful={() => toggleHelpful(exchange.id)}
                  onReport={() => setModal({ type: 'report', exchangeId: exchange.id })}
                  onSave={() => toggleSaved(exchange)}
                  onContext={() => update(exchange.id, (e) => (e.kind === 'meaning' ? { ...e, stage: 'context' } : e))}
                  onReply={() => update(exchange.id, (e) => (e.kind === 'meaning' ? { ...e, showingReply: !e.showingReply } : e))}
                  onSofter={() => update(exchange.id, (e) => (e.kind === 'meaning' ? { ...e, softer: !e.softer } : e))}
                  onCopyReply={(text) => copyText(text, 'Reply copied')}
                />
              ) : (
                <CardView
                  exchange={exchange}
                  saved={isSaved(exchange)}
                  about={subjectById(exchange.subjectId) ?? subject}
                  opened={opened}
                  onCopy={() => copyText(textOf(exchange), 'Answer copied')}
                  onHelpful={() => toggleHelpful(exchange.id)}
                  onReport={() => setModal({ type: 'report', exchangeId: exchange.id })}
                  onSave={() => toggleSaved(exchange)}
                  onOpen={(card) => openCard(card.article.id)}
                  onAsk={(q, cardId) => askCard(q, cardId, subjectById(exchange.subjectId) ?? subject)}
                  onTopic={(t) => answerTopic(t, subjectById(exchange.subjectId) ?? subject)}
                  onAskLocal={() => askLocalAboutCards(exchange)}
                  onRemoveCard={() => setAttachedId(undefined)}
                />
              )}
            </div>
          ))}
        </div>

        <div className={styles.composer} data-node-id="2:339" data-allow-bleed>
          {entryKind && (
            <div className={homeStyles.entryChip}>
              <span>{entryKind === 'meaning' ? 'Understanding the meaning' : 'Learning culture'}</span>
              <button type="button" onClick={() => setEntryKind(undefined)} aria-label="Return to asking anything">
                Clear
              </button>
            </div>
          )}
          {attached && <AttachedChip card={attached} onRemove={() => setAttachedId(undefined)} />}
          <ComposerTray
            files={files}
            context={contextItems}
            error={fileError}
            onRemoveFile={removeFile}
            onRemoveContext={(key) => {
              setContextItems((prev) => prev.filter((c) => c.key !== key));
              inputRef.current?.focus();
            }}
          />
          {memory.enabled && <MemoryPill items={memories} />}
        </div>

        {/* One hidden picker per kind; the + sheet opens them. */}
        {(['photo', 'audio', 'document'] as const).map((kind) => (
          <input
            key={kind}
            ref={(el) => {
              fileInputs.current[kind] = el;
            }}
            type="file"
            hidden
            multiple
            accept={ACCEPT[kind]}
            aria-label={kind === 'photo' ? 'Attach a photo' : kind === 'audio' ? 'Attach an audio recording' : 'Attach a document'}
            onChange={onFiles(kind)}
          />
        ))}

        <form className={styles.inputBar} onSubmit={submit} data-node-id="2:347" data-allow-bleed>
          <button type="button" className={styles.addButton} onClick={() => setModal({ type: 'attach' })} aria-label="Add files or context">
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
          {/* The send button leans toward the pointer once there is something to send (React Bits Magnet). */}
          <Magnet padding={36} magnetStrength={4} maxOffset={6} disabled={!canSend}>
            <button type="submit" className={styles.sendButton} aria-label="Send" disabled={!canSend}>
              <img src={sendIcon} alt="" width={18} height={18} />
            </button>
          </Magnet>
        </form>
        <p className={styles.disclaimer}>
          <img src={infoIcon} alt="" width={12} height={12} />
          Answers come from your cards. They can still be wrong.
        </p>
      </div>

      {modal?.type === 'entry' && (
        <EntrySheet
          kind={modal.kind}
          onClose={() => setModal(null)}
          onCulture={(example) => {
            setModal(null);
            askCard(example.question, example.cardId, example.subject);
          }}
          onMeaning={(example) => {
            setModal(null);
            askMeaning(example.question);
          }}
          onOwn={() => {
            setEntryKind(modal.kind);
            setModal(null);
            // The closing dialog hands focus back to the card that opened it; move it to the input after that.
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        />
      )}
      {modal?.type === 'situation' && (
        <SituationSheet
          initial={(() => {
            const e = modal.exchangeId === undefined ? undefined : exchanges.find((x) => x.id === modal.exchangeId);
            return e?.kind === 'meaning' ? e.situation : situation;
          })()}
          onSave={(next) => saveSituation(next, modal.exchangeId)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'attach' && (
        <AddSheet
          onFile={(kind) => {
            // Open the system picker inside the tap, then close the sheet.
            fileInputs.current[kind]?.click();
            setModal(null);
          }}
          onContext={() => setModal({ type: 'context' })}
          onClose={() => setModal(null)}
        >
          <AttachCardOptions
            cards={attachable}
            onAttach={(cardId) => {
              setAttachedId(cardId);
              setEntryKind(undefined);
              setModal(null);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            onDescribe={() => setModal({ type: 'situation' })}
          />
        </AddSheet>
      )}
      {modal?.type === 'context' && (
        <ContextPicker
          lists={contextLists({ opened, tips, insights, lookups, questions, social })}
          chosen={contextItems.map((c) => c.key)}
          onPick={pickContext}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'report' && <ReportDialog onSave={(reason) => report(modal.exchangeId, reason)} onClose={() => setModal(null)} />}
      {modalCard && <SourceCardDialog card={modalCard} onClose={() => setModal(null)} />}
      {modal?.type === 'history' && (
        <HistorySheet
          threads={threads}
          currentId={exchanges.length > 0 ? threadId.current : undefined}
          onOpen={openThread}
          onNew={clearChat}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'settings' && (
        <Dialog title="Ask settings" onClose={() => setModal(null)}>
          <div className={styles.settings}>
            <div className={styles.settingsRow}>
              <span>
                <strong>Reduce motion</strong>
                <small>Keep images and cards still, here and across the app.</small>
              </span>
              <Toggle label="Reduce motion" checked={reduceMotion} onChange={setReduceMotion} />
            </div>
            <button
              type="button"
              className={styles.settingsLink}
              disabled={threads.length === 0}
              onClick={() => {
                const previous = threads;
                askThreadsStore.set([]);
                setModal(null);
                showToast('History cleared', { undo: () => askThreadsStore.set(previous) });
              }}
            >
              Clear chat history
            </button>
            <section className={styles.about} aria-label="About these answers">
              <h3>About these answers</h3>
              <p>
                Ask answers from your culture cards and a phrase guide written by the team. It doesn’t use an AI model, so it can
                only answer what the cards and the guide cover; for anything else, ask a local in Community. Chats stay on this
                device, in History. Answers you save go to Moments.
              </p>
            </section>
            <section className={styles.about} aria-label="Photo credits">
              <h3>Photo credits</h3>
              <ul className={styles.credits}>
                {V3_PHOTO_CREDITS.map((c) => (
                  <li key={c.file}>
                    {c.subject}: {c.credit}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Dialog>
      )}
    </AppShell>
  );
}

interface ActionsProps {
  saved: boolean;
  onCopy: () => void;
  onHelpful: () => void;
  onReport: () => void;
  onSave: () => void;
}

function MeaningView({
  exchange,
  fresh,
  localQuestion,
  onRead,
  onSkip,
  onThought,
  onSend,
  onContext,
  onReply,
  onSofter,
  onCopyReply,
  ...actions
}: ActionsProps & {
  exchange: MeaningExchange;
  fresh: boolean;
  localQuestion?: Question;
  onRead: (s: Situation) => void;
  onSkip: () => void;
  onThought: () => void;
  onSend: () => void;
  onContext: () => void;
  onReply: () => void;
  onSofter: () => void;
  onCopyReply: (text: string) => void;
}) {
  const { reading, stage } = exchange;
  const replyText = reading ? (exchange.softer ? reading.softer : reading.reply) : '';
  const steps = stepsFor(exchange.question, reading, exchange.situation);
  return (
    <>
      <UserMessage
        text={exchange.question}
        under={stage === 'done' ? situationText(exchange.situation) || undefined : undefined}
        extras={<SentExtras files={exchange.attachments} context={exchange.context} />}
        after={exchange.remembered && <RememberedNote text={exchange.remembered} />}
      />
      <Reveal>
        <article aria-label={`IntentAI answer: ${exchange.question}`}>
          <AssistantLabel tag="Phrase guide" />
          {exchange.note && <FilesNote text={exchange.note} />}
          {stage === 'context' && <SituationCard initial={exchange.situation} auto={exchange.auto} onRead={onRead} onSkip={onSkip} />}
          {stage === 'thinking' && <Thinking steps={steps} onDone={onThought} />}
          {stage === 'done' && (
            <>
              <HowIRead steps={steps} />
              <ReadingCard reading={reading} situation={exchange.situation} fresh={fresh} />
              <AnswerActions helpful={Boolean(exchange.helpful)} {...actions} />
              <Chips>
                {reading && <Chip onClick={onReply}>{exchange.showingReply ? 'Hide reply' : 'Help me reply'}</Chip>}
                <Chip onClick={onContext}>{situationText(exchange.situation) ? 'Edit situation' : '+ Add situation'}</Chip>
              </Chips>
              {reading && exchange.showingReply && (
                <ReplyCard text={replyText} softer={exchange.softer} onCopy={() => onCopyReply(replyText)} onSofter={onSofter} />
              )}
              <ConfirmPanel question={localQuestion} onSend={onSend} />
            </>
          )}
        </article>
      </Reveal>
    </>
  );
}

function CardView({
  exchange,
  about,
  opened,
  onOpen,
  onAsk,
  onTopic,
  onAskLocal,
  onRemoveCard,
  ...actions
}: ActionsProps & {
  exchange: CardExchange;
  about: Subject;
  opened: readonly string[];
  onOpen: (card: Card) => void;
  onAsk: (question: string, cardId: string) => void;
  onTopic: (topic: Topic) => void;
  onAskLocal: () => void;
  onRemoveCard: () => void;
}) {
  const { answer } = exchange;
  const attachedCard = exchange.attachedId ? cardById(exchange.attachedId) : undefined;
  return (
    <>
      <UserMessage
        text={exchange.question}
        extras={<SentExtras files={exchange.attachments} context={exchange.context} />}
        after={exchange.remembered && <RememberedNote text={exchange.remembered} />}
      />
      <Reveal>
      <article aria-label={`IntentAI answer: ${exchange.question}`}>
        <AssistantLabel tag={attachedCard ? 'From your attached card' : 'From your cards'} />
        {exchange.note && <FilesNote text={exchange.note} />}
        {answer.kind === 'card' ? (
          <CardPaper answer={answer} subject={about} attached={Boolean(attachedCard)} tip={exchange.tip} onOpen={onOpen} />
        ) : (
          <NoCardPaper subject={about} topic={answer.topic} attached={attachedCard} />
        )}
        <AnswerActions helpful={Boolean(exchange.helpful)} {...actions} />
        <Chips>
          {answer.kind === 'none' && !attachedCard && <TopicChips subject={about} onTopic={onTopic} />}
          {answer.kind === 'none' && attachedCard && <Chip onClick={onRemoveCard}>Remove card</Chip>}
          <Chip accent onClick={onAskLocal}>
            {answer.kind === 'card' ? 'Need a first-hand tip? Ask a local' : 'Ask a local'}
          </Chip>
        </Chips>
        <Recommendations items={exchange.recs} basedOnOpened={opened.length > 0} onAsk={onAsk} />
      </article>
      </Reveal>
    </>
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
