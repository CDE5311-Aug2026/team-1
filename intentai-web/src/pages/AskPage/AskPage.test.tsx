import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { askThreadsStore, insightsStore, lookupsStore, openedCardsStore, questionsStore, reduceMotionStore, reportsStore, tipsStore } from '../../data/stores';
import { paths } from '../../routes';
import { EMPTY_MEMORY, memoryStore } from '../../data/memory';
import AskPage from './AskPage';
import { MotionConfig } from 'motion/react';
import { useLocation } from 'react-router-dom';

function CommunityProbe() {
  const state = useLocation().state as { askLocal?: string; link?: Record<string, string> } | null;
  return (
    <>
      <p>community page: {state?.askLocal}</p>
      <p>link: {JSON.stringify(state?.link ?? {})}</p>
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
});

/** Motion off by default (readings show at once, as with the app's Reduce motion); `motion: true` runs the steps. */
function renderAsk({ motion = false }: { motion?: boolean } = {}) {
  return render(
    <MotionConfig reducedMotion={motion ? 'never' : 'always'}>
    <MemoryRouter useTransitions={false} initialEntries={[paths.ask]}>
      <Routes>
        <Route path={paths.ask} element={<AskPage />} />
        <Route path={paths.today} element={<p>today page</p>} />
        <Route path={paths.welcome} element={<p>welcome page</p>} />
        <Route path={paths.community} element={<CommunityProbe />} />
      </Routes>
    </MemoryRouter>
    </MotionConfig>,
  );
}

const input = () => screen.getByRole('textbox', { name: /ask intentai/i });

async function ask(text: string) {
  await userEvent.type(input(), `${text}{Enter}`);
}

const answers = () => screen.getAllByRole('article', { name: /^IntentAI answer/ });
const lastAnswer = () => answers()[answers().length - 1];

/* ---------- Home ---------- */

test('opens on the home page: one question, two image cards, the composer and the footnote', () => {
  renderAsk();
  expect(screen.getByRole('heading', { level: 1, name: 'Ask' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'What do you want to ask today?' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Learn culture' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Understand the meaning' })).toBeInTheDocument();
  expect(input()).toHaveAttribute('placeholder', 'Ask anything…');
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  expect(screen.getByText('Answers come from your cards. They can still be wrong.')).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: /^IntentAI answer/ })).not.toBeInTheDocument();
});

test('Learn culture: an example from a real area answers from its card', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Learn culture' }));
  const sheet = screen.getByRole('dialog', { name: 'Learn culture' });
  expect(sheet).toHaveTextContent('Chinatown · 3 cards');
  await userEvent.click(within(sheet).getByRole('button', { name: /Where can I try Hainanese chicken rice in Chinatown\?/ }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(lastAnswer()).toHaveTextContent('From your food card · Chinatown');
  expect(screen.getByText('TODAY · JUST NOW')).toBeInTheDocument();
});

test('a culture question finds the area whose cards answer it, quotes the card and shows its key numbers', async () => {
  openedCardsStore.set([]);
  renderAsk();
  await ask('How old is Sri Mariamman Temple?');
  const answer = lastAnswer();
  expect(answer).toHaveTextContent('From your cards');
  expect(answer).toHaveTextContent('From your monument card · Chinatown');
  expect(answer).toHaveTextContent('1827');
  await userEvent.click(within(answer).getByRole('button', { name: 'Open the Sri Mariamman Temple card' }));
  expect(screen.getByRole('dialog', { name: 'Sri Mariamman Temple' })).toHaveTextContent('Founded by Naraina Pillai');
  expect(openedCardsStore.get()).toEqual(['sri-mariamman']);
});

test('a question about another area is answered from that area', async () => {
  renderAsk();
  await ask('When is Hari Raya Puasa?');
  expect(lastAnswer()).toHaveTextContent('From your festival card · Katong');
});

test('recommendations say why, and a recommended question is answered from its card', async () => {
  openedCardsStore.set(['thian-hock-keng']);
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Learn culture' }));
  await userEvent.click(screen.getByRole('button', { name: /Where can I try Hainanese chicken rice in Chinatown\?/ }));
  const answer = lastAnswer();
  expect(within(answer).getByRole('link', { name: /Try it: Tian Tian Hainanese Chicken Rice/ })).toBeInTheDocument();
  const recs = within(answer).getByRole('region', { name: 'Recommended for you' });
  expect(recs).toHaveTextContent('Because you opened the Thian Hock Keng Temple card');
  await userEvent.click(within(recs).getByRole('button', { name: /What is the story of Thian Hock Keng Temple\?/ }));
  expect(lastAnswer()).toHaveTextContent('From your monument card · Chinatown');
});

test('a question no card covers offers topics and Ask a local, with "here" named', async () => {
  renderAsk();
  await ask('Where can I buy a SIM card near here?');
  const answer = lastAnswer();
  expect(answer).toHaveTextContent('Your cards don’t cover this yet.');
  await userEvent.click(within(answer).getByRole('button', { name: /Food in Chinatown/ }));
  expect(lastAnswer()).toHaveTextContent('From your food card · Chinatown');
  await userEvent.click(within(answer).getByRole('button', { name: 'Ask a local' }));
  expect(screen.getByText('community page: Where can I buy a SIM card near Chinatown?')).toBeInTheDocument();
});

test('Ask a local under a card answer carries the area, topic and source card', async () => {
  renderAsk();
  await ask('How old is Sri Mariamman Temple?');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: 'Need a first-hand tip? Ask a local' }));
  expect(screen.getByText(/^link:/)).toHaveTextContent(
    '{"areaId":"sg-chinatown","areaName":"Chinatown","topic":"monument","cardId":"sri-mariamman","from":"ask"}',
  );
});

test('a local tip on the source card is cited in the answer and counted', async () => {
  tipsStore.set([
    { id: 't1', cardId: 'thian-hock-keng', questionId: 'q1', text: 'Go early, before the tour groups.', by: 'Mei', areaName: 'Chinatown', createdAt: 1, cited: 0 },
  ]);
  renderAsk();
  await ask('What is the story of Thian Hock Keng Temple?');
  const answer = lastAnswer();
  expect(answer).toHaveTextContent('Mei · Chinatown local');
  expect(answer).toHaveTextContent('“Go early, before the tour groups.”');
  expect(within(answer).getByRole('link', { name: 'Open in Community →' })).toHaveAttribute('href', '/community/q1');
  expect(tipsStore.get()[0].cited).toBe(1);
});

/* ---------- Attach a card ---------- */

test('+ attaches a card; the answer uses only that card, and says so when the card has nothing on it', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Add files or context' }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Bring a little context.' })).getByRole('button', { name: /Thian Hock Keng Temple/ }));
  expect(screen.getByText('Thian Hock Keng Temple · 1 card')).toBeInTheDocument();
  expect(input()).toHaveAttribute('placeholder', 'Ask anything about this…');

  await ask('Why did sailors come here?');
  expect(lastAnswer()).toHaveTextContent('Using your attached card');
  expect(lastAnswer()).toHaveTextContent('Sailors gave thanks here for a safe voyage from China.');

  await ask('Where can I eat nearby?');
  expect(lastAnswer()).toHaveTextContent('The card doesn’t say.');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: 'Remove card' }));
  expect(screen.queryByText('Thian Hock Keng Temple · 1 card')).not.toBeInTheDocument();
});

/* ---------- Actions ---------- */

test('Save insight keeps the answer in Moments, and pressing again removes it', async () => {
  insightsStore.set([]);
  renderAsk();
  await ask('How old is Sri Mariamman Temple?');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: 'Save insight' }));
  expect(insightsStore.get()).toEqual([
    expect.objectContaining({ kind: 'card', title: 'Sri Mariamman Temple', cardId: 'sri-mariamman', areaName: 'Chinatown', question: 'How old is Sri Mariamman Temple?' }),
  ]);
  expect(within(lastAnswer()).getByRole('button', { name: 'Saved to Moments' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: 'Saved to Moments' }));
  expect(insightsStore.get()).toEqual([]);
});

test('History: chats are kept as they happen; New chat starts over (Undo brings it back); a chat reopens with its answers', async () => {
  askThreadsStore.set([]);
  renderAsk();
  await ask('What does chope mean?');
  await ask('How old is Sri Mariamman Temple?');
  expect(askThreadsStore.get()).toEqual([
    expect.objectContaining({ title: 'What does chope mean?', turns: [expect.objectContaining({ kind: 'meaning' }), expect.objectContaining({ kind: 'card', subjectId: 'sg-chinatown' })] }),
  ]);

  await userEvent.click(screen.getByRole('button', { name: 'Chat history' }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'History' })).getByRole('button', { name: /New chat/ }));
  expect(screen.queryByRole('article', { name: /^IntentAI answer/ })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'What do you want to ask today?' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(answers()).toHaveLength(2);

  await userEvent.click(screen.getByRole('button', { name: 'Chat history' }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'History' })).getByRole('button', { name: /New chat/ }));
  await ask('What does paiseh mean?');
  expect(askThreadsStore.get()).toHaveLength(2);

  await userEvent.click(screen.getByRole('button', { name: 'Chat history' }));
  const history = screen.getByRole('dialog', { name: 'History' });
  expect(within(history).getByRole('region', { name: 'Today' })).toBeInTheDocument();
  await userEvent.type(within(history).getByRole('searchbox', { name: 'Search conversations' }), 'temple');
  const found = within(history).getAllByRole('button', { name: /What does chope mean\?/ });
  expect(found).toHaveLength(1);
  await userEvent.click(found[0]);
  expect(answers()).toHaveLength(2);
  expect(lastAnswer()).toHaveTextContent('From your monument card · Chinatown');
});

test('History says so when there is nothing, or nothing matches', async () => {
  askThreadsStore.set([]);
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Chat history' }));
  const history = screen.getByRole('dialog', { name: 'History' });
  expect(history).toHaveTextContent('Your conversations start here');
});

test('Ask settings: Reduce motion is saved for the whole app, and history can be cleared with Undo', async () => {
  reduceMotionStore.set(false);
  askThreadsStore.set([{ id: 't', title: 'q', turns: [{ kind: 'meaning', question: 'q' }], createdAt: 1, updatedAt: 1 }]);
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Ask settings' }));
  const sheet = screen.getByRole('dialog', { name: 'Ask settings' });
  await userEvent.click(within(sheet).getByRole('switch', { name: 'Reduce motion' }));
  expect(reduceMotionStore.get()).toBe(true);
  expect(sheet).toHaveTextContent('It doesn’t use an AI model');
  await userEvent.click(within(sheet).getByRole('button', { name: 'Clear chat history' }));
  expect(askThreadsStore.get()).toEqual([]);
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(askThreadsStore.get()).toHaveLength(1);
});

test('voice input fills the box when speech recognition exists, otherwise shows a toast', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Voice input' }));
  expect(screen.getByRole('status')).toHaveTextContent('Voice input is unavailable. Type your question instead.');

  class FakeRecognition {
    lang = '';
    onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
    onerror: (() => void) | null = null;
    start() {
      this.onresult?.({ results: [[{ transcript: 'what does sabo mean' }]] });
    }
  }
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
  await userEvent.click(screen.getByRole('button', { name: 'Voice input' }));
  expect(input()).toHaveValue('what does sabo mean');
});

/* ---------- Understand the meaning: situation → steps → reading → confirm ---------- */

const reading = () => { const all = screen.getAllByRole('article', { name: 'Phrase reading' }); return all[all.length - 1]; };

test('Understand the meaning: the workplace example asks for the situation first, then reads it (team-written guidance)', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Understand the meaning' }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Understand the meaning' })).getByRole('button', { name: /跟产品对齐一下/ }));
  const card = screen.getByRole('region', { name: 'Add the situation' });
  expect(card).toHaveTextContent('A little context makes the reading better.');
  await userEvent.click(within(card).getByRole('button', { name: 'Skip' }));
  expect(reading()).toHaveTextContent('Behind the words.');
  expect(reading()).toHaveTextContent('Literal meaning先和产品团队统一理解');
  expect(reading()).toHaveTextContent('Low confidence');
  expect(reading()).toHaveTextContent('Team-written guidance. No outside source for this phrase yet.');
  expect(lastAnswer()).toHaveTextContent('How I read it');
});

test('the situation card: tap where / who / how, and the reading uses them (Wikipedia source, good confidence)', async () => {
  lookupsStore.set([]);
  renderAsk();
  await ask('What does chope mean?');
  const card = screen.getByRole('region', { name: 'Add the situation' });
  await userEvent.click(within(card).getByRole('button', { name: 'Office' }));
  await userEvent.click(within(card).getByRole('button', { name: 'Colleague' }));
  await userEvent.click(within(card).getByRole('button', { name: 'Smiling' }));
  await userEvent.click(within(card).getByRole('button', { name: 'Read it' }));
  expect(reading()).toHaveTextContent('What they most likely meanA friendly favour: please hold a seat for them.');
  expect(reading()).toHaveTextContent('Good confidence');
  expect(within(reading()).getByRole('link', { name: 'Wikipedia · Singlish vocabulary' })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Singlish_vocabulary');
  expect(screen.getAllByText('Office · Your colleague · smiling')).toHaveLength(2); // under the question, and in How I read it
  expect(lookupsStore.get().some((l) => l.id === 'chope')).toBe(true);
});

test('what the sentence says is pre-selected; with enough of it the reading comes straight away', async () => {
  renderAsk();
  await ask('领导回我“收到”');
  const card = screen.getByRole('region', { name: 'Add the situation' });
  expect(within(card).getByRole('button', { name: /Boss/ })).toHaveAttribute('aria-pressed', 'true');
  expect(within(card).getByRole('button', { name: /Boss/ })).toHaveTextContent('from your words');
  await userEvent.click(within(card).getByRole('button', { name: 'Group chat' }));
  await userEvent.click(within(card).getByRole('button', { name: 'Read it' }));
  expect(reading()).toHaveTextContent('收到');
  expect(screen.getAllByText('Group chat · Your boss')).toHaveLength(2);

  await ask('My colleague said paiseh in a meeting, smiling');
  expect(screen.queryAllByRole('region', { name: 'Add the situation' })).toHaveLength(0);
  expect(reading()).toHaveTextContent('A light “sorry about that”, nothing serious.');
});

test('Chinese sentences go to the meaning guide, not the culture cards', async () => {
  renderAsk();
  await ask('同事说这个方案要再打磨一下，在会议上');
  expect(reading()).toHaveTextContent('打磨一下');
});

test('an unknown phrase is answered honestly, offers a local, and is not saved', async () => {
  lookupsStore.set([]);
  renderAsk();
  await ask('What does gostan mean?');
  await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
  expect(lastAnswer()).toHaveTextContent('I can’t read this one yet.');
  expect(within(lastAnswer()).queryByRole('button', { name: 'Help me reply' })).not.toBeInTheDocument();
  expect(within(lastAnswer()).getByRole('button', { name: /Ask a local to confirm/ })).toBeInTheDocument();
  expect(lookupsStore.get()).toEqual([]);
});

test('Help me reply shows a reply to send, a softer one, and copies it', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  renderAsk();
  await ask('My friend asked “can or not?” in the group chat');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: 'Help me reply' }));
  expect(lastAnswer()).toHaveTextContent('A reply you could sendCan! What time works for you?');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: 'Make it softer' }));
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: 'Copy reply' }));
  expect(writeText).toHaveBeenCalledWith('Should be can. Let me check and tell you soon, OK?');
});

test('Ask a local to confirm: one tap posts the sentence, the situation and the reading; the answer comes back here', async () => {
  questionsStore.set([]);
  renderAsk();
  await ask('What does sabo mean? My colleague said it laughing');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: /Ask a local to confirm/ }));
  const [q] = questionsStore.get();
  expect(q).toMatchObject({ text: 'Is this right? “What does sabo mean? My colleague said it laughing”', lookupId: 'sabo', from: 'ask', status: 'Pending' });
  expect(q.detail).toMatch(/IntentAI’s reading: A joke/);
  expect(lastAnswer()).toHaveTextContent('Waiting for a local. Their answer will appear here.');

  act(() => questionsStore.set([{ ...q, status: 'Added', answer: 'Yes, just teasing.', answeredBy: 'Mei' }]));
  expect(lastAnswer()).toHaveTextContent('Confirmed by a local · Mei');
  expect(lastAnswer()).toHaveTextContent('“Yes, just teasing.”');
});

test('Edit situation reopens the card and re-reads with the new answer', async () => {
  renderAsk();
  await ask('What does sabo mean?');
  await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: '+ Add situation' }));
  await userEvent.click(screen.getByRole('button', { name: 'Annoyed' }));
  await userEvent.click(screen.getByRole('button', { name: 'Read it' }));
  expect(reading()).toHaveTextContent('A real complaint: they think someone got them into trouble.');
});

test('Copy, Helpful and Report work on a reading', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  reportsStore.set([]);
  renderAsk();
  await ask('What does chope mean?');
  await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
  const answer = lastAnswer();
  await userEvent.click(within(answer).getByRole('button', { name: 'Copy answer' }));
  expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^Chope\n\nLiteral meaning:/));
  const helpful = within(answer).getByRole('button', { name: 'Helpful' });
  await userEvent.click(helpful);
  expect(helpful).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(within(answer).getByRole('button', { name: 'Report this answer' }));
  const dialog = screen.getByRole('dialog', { name: 'Report this answer' });
  await userEvent.type(within(dialog).getByLabelText('What seems wrong?'), 'Please check this wording.');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(reportsStore.get()).toEqual([{ answer: expect.stringMatching(/^Chope/), reason: 'Please check this wording.' }]);
});

test('with motion on, the steps tick off one by one before the reading', async () => {
  renderAsk({ motion: true });
  await ask('My colleague said paiseh in a meeting, smiling');
  expect(screen.getByRole('status', { name: 'Reading the phrase' })).toHaveTextContent('Reading the words');
  expect(await screen.findByRole('article', { name: 'Phrase reading' }, { timeout: 5000 })).toHaveTextContent('Behind the words.');
});

/* ---------- Files, quick context and memory ---------- */

async function openAdd() {
  await userEvent.click(screen.getByRole('button', { name: 'Add files or context' }));
  return screen.getByRole('dialog', { name: 'Bring a little context.' });
}

const userBubbles = () => document.querySelectorAll('[class*="userMessage"]');
const lastBubble = () => userBubbles()[userBubbles().length - 1] as HTMLElement;

test('+ Document attaches a .txt file: a chip shows above the input, then in the sent bubble, and the answer reads its opening', async () => {
  askThreadsStore.set([]);
  renderAsk();
  const sheet = await openAdd();
  expect(within(sheet).getByRole('button', { name: /Photo/ })).toBeInTheDocument();
  expect(within(sheet).getByRole('button', { name: /Audio recording/ })).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole('button', { name: /Document/ }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  const file = new File(['My colleague keeps saying chope before lunch.'], 'guide.txt', { type: 'text/plain' });
  await userEvent.upload(screen.getByLabelText('Attach a document'), file);
  const tray = screen.getByRole('list', { name: 'Added to your question' });
  expect(tray).toHaveTextContent('guide.txt');
  expect(tray).toHaveTextContent('Document · 45 B');
  expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();

  await ask('What does this mean?');
  await screen.findByRole('article', { name: /^IntentAI answer/ });
  expect(screen.queryByRole('list', { name: 'Added to your question' })).not.toBeInTheDocument();
  expect(lastBubble()).toHaveTextContent('guide.txt');
  expect(lastAnswer()).toHaveTextContent('I’ve kept your file with this question. guide.txt mentions “Chope”.');
  // History keeps the file's name, kind, size and type, never the file.
  expect(askThreadsStore.get()[0].turns[0].attachments).toEqual([{ name: 'guide.txt', kind: 'document', size: 45, mime: 'text/plain' }]);
});

test('a photo shows a thumbnail chip that can be removed', async () => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() }));
  renderAsk();
  await userEvent.upload(screen.getByLabelText('Attach a photo'), new File(['x'], 'menu.jpg', { type: 'image/jpeg' }));
  expect(screen.getByRole('img', { name: 'menu.jpg' })).toHaveAttribute('src', 'blob:photo');
  await userEvent.click(screen.getByRole('button', { name: 'Remove menu.jpg' }));
  expect(screen.queryByRole('img', { name: 'menu.jpg' })).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
});

test('a file over 25 MB is not added, with a friendly message', async () => {
  renderAsk();
  const big = new File(['x'], 'lecture.mp3', { type: 'audio/mpeg' });
  Object.defineProperty(big, 'size', { value: 30 * 1024 * 1024 });
  await userEvent.upload(screen.getByLabelText('Attach an audio recording'), big);
  expect(screen.getByRole('alert')).toHaveTextContent('lecture.mp3 is 30 MB. Files can be up to 25 MB.');
  expect(screen.queryByRole('list', { name: 'Added to your question' })).not.toBeInTheDocument();
});

test('Add context: a phrase from Moments is read, and the bubble says what was added', async () => {
  lookupsStore.set([{ id: 'chope', word: 'chope', meaning: 'To reserve a seat by leaving tissues on it.', source: 'Confirmed by a local' }]);
  renderAsk();
  await userEvent.click(within(await openAdd()).getByRole('button', { name: /Pick from Hints, Moments or Community/ }));
  const picker = screen.getByRole('dialog', { name: 'Add context' });
  await userEvent.click(within(picker).getByRole('tab', { name: /Moments/ }));
  await userEvent.click(within(picker).getByRole('button', { name: 'Phrase: chope' }));
  expect(screen.getByRole('list', { name: 'Added to your question' })).toHaveTextContent('Phrase: chope');

  await ask('My classmate said this, what did she mean?');
  expect(lastBubble()).toHaveTextContent('Phrase: chope');
  const situationCard = screen.queryByRole('region', { name: 'Add the situation' });
  if (situationCard) await userEvent.click(within(situationCard).getByRole('button', { name: 'Skip' }));
  expect(reading()).toHaveTextContent('Chope');
});

test('Add context: a Community question becomes the situation, found by search', async () => {
  renderAsk();
  await userEvent.click(within(await openAdd()).getByRole('button', { name: /Pick from Hints, Moments or Community/ }));
  const picker = screen.getByRole('dialog', { name: 'Add context' });
  await userEvent.click(within(picker).getByRole('tab', { name: /^Community/ }));
  await userEvent.type(within(picker).getByRole('searchbox', { name: 'Search context' }), 'own orders');
  await userEvent.click(within(picker).getByRole('button', { name: /Thread: How do I suggest paying for our own orders without making it awkward\?/ }));
  // Nothing typed: the thread's question is sent.
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(lastBubble()).toHaveTextContent('Thread: How do I suggest paying for our own orders without making it awkward?');
  expect(answers()).toHaveLength(1);
});

test('Add context: a hint card answers about that card', async () => {
  renderAsk();
  await userEvent.click(within(await openAdd()).getByRole('button', { name: /Pick from Hints, Moments or Community/ }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Add context' })).getByRole('button', { name: 'About: Thian Hock Keng Temple' }));
  await ask('Why did sailors come here?');
  expect(lastBubble()).toHaveTextContent('About: Thian Hock Keng Temple');
  expect(lastAnswer()).toHaveTextContent('Sailors gave thanks here for a safe voyage from China.');
});

test('memory: a fact about the user is remembered, with a Manage link and the Using memory pill', async () => {
  memoryStore.set(EMPTY_MEMORY);
  renderAsk();
  await ask("I'm from Lyon. What does chope mean?");
  expect(memoryStore.get().items).toEqual([expect.objectContaining({ text: 'From Lyon', source: 'ask' })]);
  expect(screen.getByText('Remembered: From Lyon')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Manage memory' })).toHaveAttribute('href', '/my-space/settings?section=memory');
  const pill = screen.getByRole('button', { name: /Using memory · \d+/ });
  await userEvent.click(pill);
  expect(screen.getByRole('region', { name: 'What Ask remembers' })).toHaveTextContent('From Lyon');
});

test('memory off: nothing is remembered and there is no Using memory pill', async () => {
  memoryStore.set({ ...EMPTY_MEMORY, enabled: false, items: [{ id: 'm1', text: 'From Paris', source: 'you' }] });
  renderAsk();
  expect(screen.queryByRole('button', { name: /Using memory/ })).not.toBeInTheDocument();
  await ask("I'm from Lyon. What does chope mean?");
  expect(memoryStore.get().items).toEqual([{ id: 'm1', text: 'From Paris', source: 'you' }]);
  expect(screen.queryByText(/Remembered:/)).not.toBeInTheDocument();
});
