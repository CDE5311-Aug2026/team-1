// The Help Center: the top bar the person tapped unfolds down over the page, like a game's pause menu dropping in,
// and becomes a small assistant. Ask: questions about using FindSG, answered by Claude through /api/help (or, with no
// key on the server, from the guide on the device). Feedback: an idea, a confusing bit, a bug or something loved,
// sent to the team (kept on the phone and sent later when the server cannot take it).
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { matchTopic, TOPICS, type HelpTopic } from '../../data/help/guide';
import Icon, { type IconName } from '../../pages/OnboardingPage/v3/icons';
import { HelpMark } from './HelpBadge';
import { closeHelp, setHelpTab, useHelp, type HelpTab } from './helpStore';
import styles from './HelpCenter.module.css';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  topic?: HelpTopic;
}

const KINDS: { id: 'idea' | 'confusing' | 'bug' | 'love'; label: string; icon: IconName }[] = [
  { id: 'idea', label: 'Idea', icon: 'sparkle' },
  { id: 'confusing', label: 'Confusing', icon: 'help' },
  { id: 'bug', label: 'Bug', icon: 'flag' },
  { id: 'love', label: 'Love it', icon: 'star' },
];

const QUEUE = 'findsg-help-feedback';
const HELLO = 'Hi! I’m the FindSG guide. Ask me how anything in the app works, or tell the team what to fix.';
const UNSURE = 'I’m not sure about that one yet. Try one of these, or send it as feedback and the team will look at it.';

/** The tab the person is on, by name. */
function pageOf(pathname: string) {
  if (pathname.startsWith('/moments')) return 'Moments';
  if (pathname.startsWith('/hunt')) return 'Hunt';
  if (pathname.startsWith('/my-space')) return 'Passport';
  if (pathname.startsWith('/nearby') || pathname.startsWith('/explore')) return 'Explore';
  return 'Home';
}

/** Starter questions, the ones about this tab first. */
function startersFor(page: string): HelpTopic[] {
  const first: Record<string, string[]> = {
    Home: ['start', 'checkin', 'hunt'],
    Moments: ['share', 'stamps', 'photos'],
    Hunt: ['hunt', 'public', 'stamps'],
    Passport: ['rank', 'privacy', 'settings'],
    Explore: ['checkin', 'stamps', 'start'],
  };
  const ids = first[page] ?? first.Home;
  return [...ids.map((id) => TOPICS.find((t) => t.id === id)!), ...TOPICS.filter((t) => !ids.includes(t.id))].slice(0, 4);
}

type Note = { at: number; kind: string; page: string; text: string };
const readQueue = (): Note[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) ?? '[]') as Note[];
  } catch {
    return [];
  }
};
const writeQueue = (q: Note[]) => {
  try {
    if (q.length) localStorage.setItem(QUEUE, JSON.stringify(q.slice(-20)));
    else localStorage.removeItem(QUEUE);
  } catch {
    /* private mode: nothing kept */
  }
};
async function post(body: unknown): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch('/api/help', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
/** Sends the notes kept on the phone; returns how many are still waiting. */
async function flush(): Promise<number> {
  const q = readQueue();
  const left: Note[] = [];
  for (const n of q) if (!(await post({ mode: 'feedback', ...n }))?.ok) left.push(n);
  writeQueue(left);
  return left.length;
}

export default function HelpCenter() {
  const { open, tab, from } = useHelp();
  const reduce = useReducedMotion();
  const { pathname } = useLocation();
  const page = pageOf(pathname);
  const panel = useRef<HTMLDivElement>(null);

  // the page under it stays put while it is open; Escape closes; focus comes back to the badge after
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && closeHelp();
    window.addEventListener('keydown', onKey);
    panel.current?.focus({ preventScroll: true });
    void flush();
    return () => {
      html.style.overflow = was;
      window.removeEventListener('keydown', onKey);
      back?.focus?.({ preventScroll: true });
    };
  }, [open]);
  // a new page closes it
  useEffect(() => closeHelp(), [pathname]);

  const top = from?.height ?? 64;
  return (
    <AnimatePresence>
      {open && (
        <div className={styles.layer}>
          <motion.div
            className={styles.scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.1 } }}
            onClick={closeHelp}
          />
          <motion.div
            ref={panel}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Help Center"
            tabIndex={-1}
            // the header grows down from its own height, overshoots a little and settles, like a menu dropping in
            initial={reduce ? { opacity: 0 } : { height: top, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
            animate={{ height: 'min(88dvh, 760px)', opacity: 1, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
            exit={
              reduce
                ? { opacity: 0 }
                : { height: top, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, transition: { type: 'spring', stiffness: 380, damping: 36 } }
            }
            transition={{ type: 'spring', stiffness: 210, damping: 19, mass: 0.9 }}
          >
            <Panel page={page} tab={tab} />
            <motion.i
              className={styles.hem}
              aria-hidden="true"
              initial={{ scaleX: 0.3, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1, transition: { delay: 0.25, type: 'spring', stiffness: 200, damping: 16 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const rise = {
  hidden: { opacity: 0, y: -14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.12 + i * 0.05, type: 'spring' as const, stiffness: 300, damping: 24 } }),
};

function Panel({ page, tab }: { page: string; tab: HelpTab }) {
  return (
    <div className={styles.inner}>
      <div className={styles.top}>
        <button type="button" className={styles.closer} aria-label="Close Help Center" onClick={closeHelp}>
          <HelpMark glyph="close" />
        </button>
        <motion.p className={styles.title} variants={rise} initial="hidden" animate="show" custom={0}>
          Help Center
          <small>On {page}</small>
        </motion.p>
      </div>
      <motion.div className={styles.switch} role="tablist" aria-label="Help" variants={rise} initial="hidden" animate="show" custom={1}>
        <LayoutGroup id="help-tabs">
          {(['ask', 'feedback'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? styles.on : undefined}
              onClick={() => setHelpTab(t)}
            >
              {tab === t && <motion.span layoutId="help-pill" className={styles.pill} transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
              <Icon name={t === 'ask' ? 'chat' : 'feedback'} size={18} />
              <span>{t === 'ask' ? 'Ask' : 'Feedback'}</span>
            </button>
          ))}
        </LayoutGroup>
      </motion.div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          className={styles.body}
          initial={{ opacity: 0, x: tab === 'ask' ? -24 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: tab === 'ask' ? -24 : 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          {tab === 'ask' ? <Ask page={page} /> : <Feedback page={page} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// the conversation survives closing and opening again (until the app reloads)
let saved: Message[] = [];
let nextId = 1;

function Ask({ page }: { page: string }) {
  const [messages, setMessages] = useState<Message[]>(saved);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const here = (to: string) => to === pathname + search || (to !== '/' && to.split('?')[0] === pathname && !to.includes('?'));
  const starters = useMemo(() => startersFor(page), [page]);
  useEffect(() => {
    saved = messages;
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    const mine: Message = { id: nextId++, role: 'user', text };
    const convo = [...messages, mine];
    setMessages(convo);
    setDraft('');
    setBusy(true);
    const topic = matchTopic(text) ?? undefined;
    const started = Date.now();
    const data = await post({ mode: 'ask', page, messages: convo.map((m) => ({ role: m.role, text: m.text })) });
    // a beat of "typing" even when the answer is local, so it reads as a reply
    await new Promise((r) => setTimeout(r, Math.max(0, 650 - (Date.now() - started))));
    const answer = typeof data?.answer === 'string' ? data.answer : (topic?.a ?? UNSURE);
    setMessages((m) => [...m, { id: nextId++, role: 'assistant', text: answer, topic }]);
    setBusy(false);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void ask(draft);
    }
  };
  const last = messages[messages.length - 1];

  return (
    <>
      <div className={styles.chat} ref={list}>
      <ol className={styles.log} aria-live="polite">
        <motion.li className={styles.bot} variants={rise} initial="hidden" animate="show" custom={2}>
          {HELLO}
        </motion.li>
        {messages.map((m) => (
          <motion.li
            key={m.id}
            className={m.role === 'user' ? styles.me : styles.bot}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            style={{ originX: m.role === 'user' ? 1 : 0 }}
          >
            {m.text}
            {m.topic?.path && m.role === 'assistant' && !here(m.topic.path) && (
              <button type="button" className={styles.go} onClick={() => navigate(m.topic!.path!)}>
                Take me there
                <Icon name="arrow" size={14} />
              </button>
            )}
          </motion.li>
        ))}
        {busy && (
          <motion.li className={`${styles.bot} ${styles.typing}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-label="Writing">
            <i />
            <i />
            <i />
          </motion.li>
        )}
      </ol>
      {(!messages.length || (last?.role === 'assistant' && last.text === UNSURE)) && !busy && (
        <motion.div className={styles.starters} initial="hidden" animate="show">
          {starters.map((t, i) => (
            <motion.button key={t.id} type="button" variants={rise} custom={3 + i} onClick={() => void ask(t.q)} whileTap={{ scale: 0.96 }}>
              {t.q}
            </motion.button>
          ))}
        </motion.div>
      )}
      </div>
      <form className={styles.compose} onSubmit={submit}>
        <textarea
          rows={1}
          value={draft}
          maxLength={600}
          placeholder="Ask how something works…"
          aria-label="Your question"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          enterKeyHint="send"
        />
        <motion.button type="submit" className={styles.send} aria-label="Send" disabled={!draft.trim() || busy} whileTap={{ scale: 0.9 }}>
          <Icon name="send" size={20} />
        </motion.button>
      </form>
    </>
  );
}

function Feedback({ page }: { page: string }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('idea');
  const [text, setText] = useState('');
  const [state, setState] = useState<'edit' | 'sending' | 'sent' | 'kept'>('edit');
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const note = text.trim();
    if (!note || state === 'sending') return;
    setState('sending');
    const item = { at: Date.now(), kind, page, text: note };
    const ok = (await post({ mode: 'feedback', ...item }))?.ok;
    if (!ok) writeQueue([...readQueue(), item]);
    setState(ok ? 'sent' : 'kept');
    setText('');
  };

  if (state === 'sent' || state === 'kept')
    return (
      <div className={styles.thanks}>
        <motion.div
          className={styles.seal}
          initial={{ scale: 2.2, rotate: -24, opacity: 0 }}
          animate={{ scale: 1, rotate: -8, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          aria-hidden="true"
        >
          <span>Thank</span>
          <b>you</b>
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}>
          {state === 'sent' ? 'Sent to the FindSG team.' : 'Saved on this phone. It goes to the team as soon as the app can reach it.'}
        </motion.p>
        <motion.button type="button" className={styles.again} onClick={() => setState('edit')} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.45 } }}>
          Send another
        </motion.button>
      </div>
    );

  return (
    <form className={styles.feedback} onSubmit={send}>
      <motion.div className={styles.kinds} role="radiogroup" aria-label="What kind of feedback" initial="hidden" animate="show">
        {KINDS.map((k, i) => (
          <motion.button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={kind === k.id}
            className={kind === k.id ? styles.on : undefined}
            onClick={() => setKind(k.id)}
            variants={rise}
            custom={2 + i}
            whileTap={{ scale: 0.94 }}
          >
            <Icon name={k.icon} size={22} />
            <span>{k.label}</span>
          </motion.button>
        ))}
      </motion.div>
      <motion.label className={styles.note} variants={rise} initial="hidden" animate="show" custom={6}>
        <textarea
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            kind === 'bug'
              ? 'What happened, and what did you expect?'
              : kind === 'confusing'
                ? 'Which part was unclear?'
                : kind === 'love'
                  ? 'What did you enjoy?'
                  : 'What would make FindSG better?'
          }
          aria-label="Your feedback"
        />
        <small>
          From {page} · {text.length}/2000
        </small>
      </motion.label>
      <motion.button type="submit" className={styles.submit} disabled={!text.trim() || state === 'sending'} variants={rise} initial="hidden" animate="show" custom={7} whileTap={{ scale: 0.97 }}>
        <Icon name="send" size={20} />
        {state === 'sending' ? 'Sending…' : 'Send feedback'}
      </motion.button>
    </form>
  );
}
