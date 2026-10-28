import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { lookupsStore, openedCardsStore, reportsStore, tipsStore } from '../../data/stores';
import { paths } from '../../routes';
import AskPage from './AskPage';
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

function renderAsk() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.ask]}>
      <Routes>
        <Route path={paths.ask} element={<AskPage />} />
        <Route path={paths.today} element={<p>today page</p>} />
        <Route path={paths.welcome} element={<p>welcome page</p>} />
        <Route path={paths.community} element={<CommunityProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

const input = () => screen.getByRole('textbox', { name: /ask intentai/i });

async function ask(text: string) {
  await userEvent.type(input(), `${text}{Enter}`);
}

const answers = () => screen.getAllByRole('article', { name: /^IntentAI answer/ });
const lastAnswer = () => answers()[answers().length - 1];

test('opens on Chinatown: greeting, topic tiles, one suggested question per card, and the footnote', () => {
  renderAsk();
  expect(screen.getByRole('heading', { level: 1, name: 'Ask' })).toBeInTheDocument();
  expect(screen.getByLabelText('Asking about')).toHaveDisplayValue('Chinatown');
  expect(screen.getByText('3 cards')).toBeInTheDocument();
  expect(screen.getByText(/What would you like to know about the food, monuments or festivals of Chinatown\?/)).toBeInTheDocument();
  const tiles = screen.getByRole('region', { name: 'Pick a topic' });
  expect(within(tiles).getAllByRole('button').map((b) => b.textContent)).toEqual([
    expect.stringContaining('Food'),
    expect.stringContaining('Monument'),
  ]);
  const suggested = within(screen.getByRole('region', { name: 'Suggested questions' })).getAllByRole('button');
  expect(suggested).toHaveLength(3);
  expect(screen.getByRole('button', { name: /Where can I try Hainanese chicken rice in Chinatown\?/ })).toBeInTheDocument();
  expect(screen.getByText('Answers come from your cards and can still be wrong.')).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: /^IntentAI answer/ })).not.toBeInTheDocument();
});

test('the topic switch follows what is typed, and Festival is off where there is no festival card', async () => {
  renderAsk();
  const topic = (name: string) => within(screen.getByRole('group', { name: 'Topic' })).getByRole('button', { name });
  expect(topic('Festival')).toBeDisabled();
  await userEvent.type(input(), 'How old is the temple');
  expect(topic('Monument')).toHaveAttribute('aria-pressed', 'true');
  expect(input()).toHaveAttribute('placeholder', 'Ask about a monument');
});

test('a card answer quotes its card, shows the source card and key numbers, and Open shows the whole card', async () => {
  openedCardsStore.set([]);
  renderAsk();
  await ask('How old is Sri Mariamman Temple?');
  const answer = lastAnswer();
  expect(answer).toHaveTextContent('1827');
  expect(answer).toHaveTextContent('Source · Chinatown · Monument card');
  expect(screen.getByText('Chinatown · Monument')).toBeInTheDocument();

  await userEvent.click(within(answer).getByRole('button', { name: 'Open the Sri Mariamman Temple card' }));
  const dialog = screen.getByRole('dialog', { name: 'Sri Mariamman Temple' });
  expect(dialog).toHaveTextContent('Founded by Naraina Pillai');
  expect(openedCardsStore.get()).toEqual(['sri-mariamman']);
});

test('recommendations say why, and a recommended question is answered from its card', async () => {
  openedCardsStore.set(['thian-hock-keng']);
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: /Where can I try Hainanese chicken rice in Chinatown\?/ }));
  const answer = lastAnswer();
  expect(within(answer).getByRole('link', { name: /Try it: Tian Tian Hainanese Chicken Rice/ })).toBeInTheDocument();
  const recs = within(answer).getByRole('region', { name: 'Recommended for you' });
  expect(recs).toHaveTextContent('Based on cards you’ve opened');
  expect(recs).toHaveTextContent('Because you opened the Thian Hock Keng Temple card');

  await userEvent.click(within(recs).getByRole('button', { name: /What is the story of Thian Hock Keng Temple\?/ }));
  expect(lastAnswer()).toHaveTextContent('Source · Chinatown · Monument card');
  expect(lastAnswer()).toHaveTextContent('Thian Hock Keng Temple');
});

test('an off-topic question offers the topics and Ask a local, with "here" named', async () => {
  renderAsk();
  await ask('Where can I buy a SIM card near here?');
  const answer = lastAnswer();
  expect(answer).toHaveTextContent('This question falls outside those cards.');
  expect(screen.getByText('Chinatown · No topic')).toBeInTheDocument();
  await userEvent.click(within(answer).getByRole('button', { name: 'Ask a local in Community' }));
  expect(screen.getByText('community page: Where can I buy a SIM card near Chinatown?')).toBeInTheDocument();
});

test('an off-topic answer: picking a topic answers from that topic’s card', async () => {
  renderAsk();
  await ask('Is there a festival here?');
  const answer = lastAnswer();
  expect(answer).toHaveTextContent('There is no festival card for Chinatown yet.');
  await userEvent.click(within(answer).getByRole('button', { name: /Food/ }));
  expect(lastAnswer()).toHaveTextContent('Source · Chinatown · Food card');
});

test('changing the area asks about its cards', async () => {
  renderAsk();
  await userEvent.selectOptions(screen.getByLabelText('Asking about'), 'Katong');
  expect(screen.getByText('2 cards')).toBeInTheDocument();
  await ask('When is the festival?');
  expect(lastAnswer()).toHaveTextContent('Source · Katong · Festival card');
  expect(lastAnswer()).toHaveTextContent('Hari Raya Puasa');
});

test('Enter submits a phrase question, answers it, clears the input and saves the phrase as a lookup', async () => {
  lookupsStore.set([]);
  renderAsk();
  await ask('What does paiseh mean?');

  expect(screen.getByText('What does paiseh mean?')).toBeInTheDocument();
  expect(lastAnswer()).toHaveTextContent('“Paiseh” is Singlish for feeling sorry or embarrassed');
  expect(input()).toHaveValue('');
  expect(lookupsStore.get().some((lookup) => /paiseh/i.test(lookup.word))).toBe(true);
});

test('Send submits too; an unknown phrase is answered honestly and not saved', async () => {
  lookupsStore.set([]);
  renderAsk();
  await userEvent.type(input(), 'What does shiok mean?');
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));

  expect(lastAnswer()).toHaveTextContent('This prototype can explain chope, can or not, paiseh and sabo.');
  expect(lookupsStore.get()).toEqual([]);
});

test('Send with an empty box focuses the input instead of sending', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(screen.queryByRole('article', { name: /^IntentAI answer/ })).not.toBeInTheDocument();
  expect(input()).toHaveFocus();
});

test('Choose context sets where the next phrase was heard, and the answer uses it; the message can change it', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Choose context' }));
  let dialog = screen.getByRole('dialog', { name: 'Choose context' });
  await userEvent.selectOptions(within(dialog).getByLabelText('Where did you hear it?'), 'Office · work');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

  await ask('What does chope mean?');
  expect(lastAnswer()).toHaveTextContent('Your colleague is asking you to save a seat for them.');

  await userEvent.click(screen.getByRole('button', { name: 'context: Office · work' }));
  dialog = screen.getByRole('dialog', { name: 'Choose context' });
  await userEvent.selectOptions(within(dialog).getByLabelText('Where did you hear it?'), 'At home · friends');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(lastAnswer()).toHaveTextContent('Your friend is asking you to save a seat for them.');
});

test('Report saves that answer and a reason to the reports store', async () => {
  reportsStore.set([]);
  renderAsk();
  await ask('What does chope mean?');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: 'Report this answer' }));
  const dialog = screen.getByRole('dialog', { name: 'Report this answer' });
  await userEvent.type(within(dialog).getByLabelText('What seems wrong?'), 'Please check this wording.');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

  expect(reportsStore.get()).toEqual([{ answer: expect.stringMatching(/^“Chope” is Singlish/), reason: 'Please check this wording.' }]);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('Use it in a sentence adds the example for that phrase', async () => {
  renderAsk();
  await ask('What does chope mean?');
  await userEvent.click(screen.getByRole('button', { name: 'Use it in a sentence' }));
  expect(lastAnswer()).toHaveTextContent('“Chope” in a sentence:');
  expect(lastAnswer()).toHaveTextContent('“I chope a table first, you go order.”');
});

test('answer actions: copy, helpful / not helpful (pressed state) and regenerate', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  renderAsk();
  await ask('What does chope mean?');
  const answer = lastAnswer();

  await userEvent.click(within(answer).getByRole('button', { name: 'Copy answer' }));
  expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^“Chope” is Singlish/));
  expect(screen.getByRole('status')).toHaveTextContent('Answer copied');

  const helpful = within(answer).getByRole('button', { name: 'Helpful' });
  const notHelpful = within(answer).getByRole('button', { name: 'Not helpful' });
  await userEvent.click(helpful);
  expect(helpful).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(notHelpful);
  expect(helpful).toHaveAttribute('aria-pressed', 'false');
  expect(notHelpful).toHaveAttribute('aria-pressed', 'true');

  await userEvent.click(within(answer).getByRole('button', { name: 'Regenerate' }));
  expect(screen.getByRole('status')).toHaveTextContent('Answer regenerated');
});

test('New chat clears the conversation, and Undo brings it back', async () => {
  renderAsk();
  await ask('What does chope mean?');
  await userEvent.click(screen.getByRole('button', { name: 'New chat' }));
  expect(screen.queryByRole('article', { name: /^IntentAI answer/ })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Suggested questions' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(answers()).toHaveLength(1);
});

test('Chat options: Clear chat empties the conversation; Personalise setup opens Welcome', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Chat options' }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Chat options' })).getByRole('button', { name: 'Clear chat' }));
  expect(screen.queryByRole('article', { name: /^IntentAI answer/ })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Chat options' }));
  await userEvent.click(screen.getByRole('button', { name: 'Personalise setup' }));
  expect(screen.getByText('welcome page')).toBeInTheDocument();
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

test('Ask a local under a card answer carries the area, topic and source card', async () => {
  renderAsk();
  await ask('How old is Sri Mariamman Temple?');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: /Need a first-hand tip\? Ask a local/ }));
  expect(screen.getByText('community page: How old is Sri Mariamman Temple?')).toBeInTheDocument();
  expect(screen.getByText(/^link:/)).toHaveTextContent(
    '{"areaId":"sg-chinatown","areaName":"Chinatown","topic":"monument","cardId":"sri-mariamman","from":"ask"}',
  );
});

test('Ask a local under a phrase answer carries the saved phrase', async () => {
  renderAsk();
  await ask('What does sabo mean?');
  await userEvent.click(within(lastAnswer()).getByRole('button', { name: 'Ask a local' }));
  expect(screen.getByText(/^link:/)).toHaveTextContent('{"lookupId":"sabo","from":"ask"}');
});

test('a local tip on the source card is cited in the answer and counted', async () => {
  tipsStore.set([
    { id: 't1', cardId: 'thian-hock-keng', questionId: 'q1', text: 'Go early, before the tour groups.', by: 'Mei', areaName: 'Chinatown', createdAt: 1, cited: 0 },
  ]);
  renderAsk();
  await ask('What is the story of Thian Hock Keng Temple?');
  const answer = lastAnswer();
  expect(answer).toHaveTextContent('Mei · Chinatown local');
  expect(answer).toHaveTextContent('Local tip');
  expect(answer).toHaveTextContent('“Go early, before the tour groups.”');
  expect(answer).toHaveTextContent('+1 local tip');
  expect(within(answer).getByRole('link', { name: 'Open in Community →' })).toHaveAttribute('href', '/community/q1');
  expect(tipsStore.get()[0].cited).toBe(1);
});
