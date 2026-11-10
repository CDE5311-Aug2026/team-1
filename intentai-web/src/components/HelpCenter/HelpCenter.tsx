// The Help Centre (Redesign v2, boards 06 and 23): a light sheet that rises from the bottom over the page, with two tabs.
// Ask: questions about using FindSG, answered by Claude through /api/help (or, with no key on the server, from the
// guide on the device). Feedback: a kind and a note, sent to the team with the screen's name (kept on the phone and sent
// later when the server cannot take it). Owner decision D6: no screenshot attachment.
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/avatar-logo.png';
import { matchTopic, TOPICS, type HelpTopic } from '../../data/help/guide';
import Icon from '../../pages/OnboardingPage/v3/icons';
import useHolderName from '../../pages/OnboardingPage/v3/useHolderName';
import { lockScroll } from '../../hooks/scrollLock';
import { closeHelp, setHelpTab, useHelp, type HelpTab } from './helpStore';
import styles from './HelpCenter.module.css';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  topic?: HelpTopic;
}

/** The kinds the server accepts (server/help/handler.ts), plus "Wrong info" from board 23, sent as a bug with its
 *  label at the front of the note so the handler stays as it is. */
type KindId = 'bug' | 'idea' | 'wrong' | 'confusing' | 'love';
const KINDS: { id: KindId; label: string; send: 'idea' | 'confusing' | 'bug' | 'love'; placeholder: string }[] = [
  { id: 'bug', label: 'Bug', send: 'bug', placeholder: 'What went wrong, and what did you expect?' },
  { id: 'idea', label: 'Idea', send: 'idea', placeholder: 'What would make FindSG better?' },
  { id: 'wrong', label: 'Wrong info', send: 'bug', placeholder: 'Which place or fact is wrong, and what is right?' },
  { id: 'confusing', label: 'Confusing', send: 'confusing', placeholder: 'Which part was unclear?' },
  { id: 'love', label: 'Love it', send: 'love', placeholder: 'What did you enjoy?' },
];

const QUEUE = 'findsg-help-feedback';
const MAX_NOTE = 2000;
const UNSURE = 'I’m not sure about that one yet. Try one of these, or send it as feedback and the team will look at it.';

/** The tab the person is on, by name (v2 tabs: Home · Hunt · Passport, and Search). */
export function pageOf(pathname: string) {
  if (pathname.startsWith('/search')) return 'Search';
  if (pathname.startsWith('/hunt')) return 'Hunt';
  if (pathname.startsWith('/my-space/settings')) return 'Settings';
  if (pathname.startsWith('/my-space') || pathname.startsWith('/moments')) return 'Passport';
  if (pathname.startsWith('/nearby') || pathname.startsWith('/explore')) return 'Places';
  return 'Home';
}

/** Starter questions, the ones about this tab first. */
function startersFor(page: string): HelpTopic[] {
  const first: Record<string, string[]> = {
    Home: ['categories', 'public', 'checkin', 'solo'],
    Hunt: ['hunt', 'public', 'solo', 'puzzle'],
    Passport: ['stamps', 'journal', 'rank', 'privacy'],
    Settings: ['settings', 'categories', 'privacy', 'solo'],
    Search: ['search', 'categories', 'checkin', 'start'],
    Places: ['explore', 'checkin', 'stamps', 'start'],
  };
  const ids = first[page] ?? first.Home;
  const picked = ids.flatMap((id) => TOPICS.filter((t) => t.id === id));
  return [...picked, ...TOPICS.filter((t) => !ids.includes(t.id))].slice(0, 4);
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
  const { open, tab } = useHelp();
  const reduce = useReducedMotion();
  const { pathname } = useLocation();
  const page = pageOf(pathname);
  const panel = useRef<HTMLDivElement>(null);

  // the page under it stays put while it is open; Escape closes; focus comes back to the badge after
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const unlock = lockScroll();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && closeHelp();
    window.addEventListener('keydown', onKey);
    panel.current?.focus({ preventScroll: true });
    void flush();
    return () => {
      unlock();
      window.removeEventListener('keydown', onKey);
      back?.focus?.({ preventScroll: true });
    };
  }, [open]);
  // a new page closes it
  useEffect(() => closeHelp(), [pathname]);

  return (
    <AnimatePresence>
      {open && (
        <div className={styles.layer}>
          <motion.div
            className={styles.scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={closeHelp}
          />
          <motion.div
            ref={panel}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Help Center"
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%', transition: { type: 'spring', stiffness: 420, damping: 40 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
          >
            <span className={styles.grabber} aria-hidden="true" />
            <Panel page={page} tab={tab} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Panel({ page, tab }: { page: string; tab: HelpTab }) {
  return (
    <div className={styles.inner}>
      <div className={styles.top}>
        <button type="button" className={styles.closer} aria-label="Close Help Center" onClick={closeHelp}>
          <Icon name="close" size={20} />
        </button>
        <p className={styles.title}>
          Help Centre
          <small>On {page}</small>
        </p>
        <img className={styles.topLion} src={logo} alt="" aria-hidden="true" draggable={false} />
      </div>
      <div className={styles.switch} role="tablist" aria-label="Help">
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
      </div>
      <div className={styles.body}>{tab === 'ask' ? <Ask page={page} /> : <Feedback page={page} />}</div>
    </div>
  );
}

/** The guide: the same lion as the badge. */
function LionAvatar() {
  return (
    <span className={styles.avatarLion} aria-hidden="true">
      <img src={logo} alt="" draggable={false} />
    </span>
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
  const holder = useHolderName();
  const hasName = holder.length > 0;
  const { pathname, search } = useLocation();
  const here = (to: string) => to === pathname + search || (to !== '/' && to.split('?')[0] === pathname && !to.includes('?'));
  const starters = useMemo(() => startersFor(page), [page]);
  useEffect(() => {
    saved = messages;
    list.current?.scrollTo?.({ top: list.current.scrollHeight, behavior: 'smooth' });
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
  const hello = `Hi${hasName ? ` ${holder}` : ''}. I’m the FindSG guide. Ask how anything works, or tell the team what to fix.`;

  return (
    <>
      <div className={styles.chat} ref={list}>
        <ol className={styles.log} aria-live="polite">
          <li className={styles.turn}>
            <LionAvatar />
            <div className={styles.bot}>{hello}</div>
          </li>
          {messages.map((m) => (
            <motion.li
              key={m.id}
              className={m.role === 'user' ? `${styles.turn} ${styles.turnMe}` : styles.turn}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              {m.role === 'assistant' && <LionAvatar />}
              <div className={m.role === 'user' ? styles.me : styles.bot}>
                {m.text}
                {m.topic?.path && m.role === 'assistant' && !here(m.topic.path) && (
                  <button type="button" className={styles.go} onClick={() => navigate(m.topic!.path!)}>
                    Take me there
                    <Icon name="arrow" size={14} />
                  </button>
                )}
              </div>
            </motion.li>
          ))}
          {busy && (
            <li className={styles.turn} aria-label="Writing">
              <LionAvatar />
              <div className={`${styles.bot} ${styles.typing}`}>
                <i />
                <i />
                <i />
              </div>
            </li>
          )}
        </ol>
        {(!messages.length || (last?.role === 'assistant' && last.text === UNSURE)) && !busy && (
          <div className={styles.starters}>
            {starters.map((t) => (
              <button key={t.id} type="button" onClick={() => void ask(t.q)}>
                {t.q}
              </button>
            ))}
          </div>
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
        <button type="submit" className={styles.send} aria-label="Send" disabled={!draft.trim() || busy}>
          <Icon name="send" size={18} />
        </button>
      </form>
      <p className={styles.disclaimer}>Generative AI assistance may make mistakes.</p>
    </>
  );
}

function Feedback({ page }: { page: string }) {
  const [kind, setKind] = useState<KindId>('bug');
  const [text, setText] = useState('');
  const [state, setState] = useState<'edit' | 'sending' | 'sent' | 'kept'>('edit');
  const current = KINDS.find((k) => k.id === kind)!;
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const note = text.trim();
    if (!note || state === 'sending') return;
    setState('sending');
    const item = { at: Date.now(), kind: current.send, page, text: kind === 'wrong' ? `Wrong info: ${note}` : note };
    const ok = (await post({ mode: 'feedback', ...item }))?.ok;
    if (!ok) writeQueue([...readQueue(), item]);
    setState(ok ? 'sent' : 'kept');
    setText('');
  };

  if (state === 'sent' || state === 'kept')
    return (
      <div className={styles.thanks} role="status">
        <span className={styles.seal} aria-hidden="true">
          <Icon name="check" size={28} />
        </span>
        <p className={styles.thanksTitle}>Thank you</p>
        <p>{state === 'sent' ? 'Sent to the FindSG team.' : 'Saved on this phone. It goes to the team as soon as the app can reach it.'}</p>
        <button type="button" className={styles.again} onClick={() => setState('edit')}>
          Send another
        </button>
      </div>
    );

  return (
    <form className={styles.feedback} onSubmit={send}>
      <p className={styles.assist}>
        <img src={logo} alt="" aria-hidden="true" />
        <span>Tell the team what to fix or add. Your note goes with the name of the screen you came from. No account needed.</span>
      </p>
      <h3 className={styles.kicker} id="fb-kind">
        What is it about
      </h3>
      <div className={styles.kinds} role="radiogroup" aria-labelledby="fb-kind">
        {KINDS.map((k) => (
          <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={kind === k.id ? styles.on : undefined} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      <h3 className={styles.kicker}>Screen</h3>
      <div className={styles.screenRow}>
        <span className={styles.screenIcon} aria-hidden="true">
          <Icon name="grid" size={18} />
        </span>
        <span className={styles.screenText}>
          <span className={styles.screenName}>{page}</span>
          <span className={styles.screenSub}>attached automatically</span>
        </span>
      </div>
      <h3 className={styles.kicker} id="fb-note">
        Your note
      </h3>
      <label className={styles.note}>
        <textarea value={text} maxLength={MAX_NOTE} onChange={(e) => setText(e.target.value)} placeholder={current.placeholder} aria-label="Your feedback" />
        <small>
          {text.length} / {MAX_NOTE}
        </small>
      </label>
      <p className={styles.fine}>Only the kind, your note, the screen’s name and the time are sent. Nothing you typed elsewhere in the app is included.</p>
      <button type="submit" className={styles.submit} disabled={!text.trim() || state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send to the team'}
        <Icon name="send" size={18} />
      </button>
    </form>
  );
}
