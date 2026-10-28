import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { lookupsStore, reportsStore } from '../../data/stores';
import { paths } from '../../routes';
import AskPage from './AskPage';

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
        <Route path={paths.mySpace} element={<p>my space page</p>} />
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

test('renders the Figma conversation: greeting, chope question in a group chat, and the answer', () => {
  renderAsk();
  expect(screen.getByRole('heading', { level: 1, name: 'Ask' })).toBeInTheDocument();
  expect(screen.getByText(/What did you hear today\? Tell me the phrase and where you heard it\./)).toBeInTheDocument();
  expect(screen.getByText('My classmates said “can help me chope a seat?” What does chope mean?')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'context: group chat · classmates' })).toBeInTheDocument();
  expect(lastAnswer()).toHaveTextContent('Your classmate is asking you to save a seat for them.');
  for (const name of ['Report', 'Use it in a sentence', 'More Singlish']) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  }
  expect(screen.getByText('AI-generated answers may contain mistakes.')).toBeInTheDocument();
});

test('Enter submits a question, answers it, clears the input and saves the phrase as a lookup', async () => {
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

test('Send with an empty box asks for a phrase instead of sending', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(screen.getAllByRole('article', { name: /^IntentAI answer/ })).toHaveLength(1);
  expect(input()).toHaveFocus();
});

test('Choose context sets where the next phrase was heard, and the answer uses it', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Choose context' }));
  const dialog = screen.getByRole('dialog', { name: 'Choose context' });
  await userEvent.selectOptions(within(dialog).getByLabelText('Where did you hear it?'), 'Office · work');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

  await ask('What does paiseh mean?');
  expect(screen.getByRole('button', { name: 'context: Office · work' })).toBeInTheDocument();
  expect(lastAnswer()).toHaveTextContent('Your colleague is apologising');
});

test('changing the context on a message re-answers that message in the new setting', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'context: group chat · classmates' }));
  const dialog = screen.getByRole('dialog', { name: 'Choose context' });
  await userEvent.selectOptions(within(dialog).getByLabelText('Where did you hear it?'), 'At home · friends');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

  expect(screen.getByRole('button', { name: 'context: At home · friends' })).toBeInTheDocument();
  expect(lastAnswer()).toHaveTextContent('Your friend is asking you to save a seat for them.');
});

test('Report saves the latest answer and a reason to the reports store', async () => {
  reportsStore.set([]);
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Report' }));
  const dialog = screen.getByRole('dialog', { name: 'Report this answer' });
  await userEvent.type(within(dialog).getByLabelText('What seems wrong?'), 'Please check this wording.');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

  expect(reportsStore.get()).toEqual([
    { answer: expect.stringMatching(/^“Chope” is Singlish/), reason: 'Please check this wording.' },
  ]);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('Use it in a sentence adds the example for the latest phrase', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Use it in a sentence' }));
  expect(lastAnswer()).toHaveTextContent('“Chope” in a sentence:');
  expect(lastAnswer()).toHaveTextContent('“I chope a table first, you go order.”');
});

test('More Singlish opens Today', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'More Singlish' }));
  expect(screen.getByText('today page')).toBeInTheDocument();
});

test('answer actions: copy, helpful / not helpful (pressed state) and regenerate', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  renderAsk();
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
  await userEvent.click(screen.getByRole('button', { name: 'New chat' }));
  expect(screen.queryByRole('article', { name: /^IntentAI answer/ })).not.toBeInTheDocument();
  expect(screen.getByText(/What did you hear today\?/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(answers()).toHaveLength(1);
});

test('with no answer yet, the answer chips explain instead of failing silently', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'New chat' }));
  await userEvent.click(screen.getByRole('button', { name: 'Report' }));
  expect(screen.getByRole('status')).toHaveTextContent(/ask about a phrase first/i);
  await userEvent.click(screen.getByRole('button', { name: 'Use it in a sentence' }));
  expect(screen.getByRole('status')).toHaveTextContent(/ask about a phrase first/i);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('Chat options: Clear chat empties the conversation; Edit my profile opens My Space', async () => {
  renderAsk();
  await userEvent.click(screen.getByRole('button', { name: 'Chat options' }));
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Chat options' })).getByRole('button', { name: 'Clear chat' }));
  expect(screen.queryByRole('article', { name: /^IntentAI answer/ })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Chat options' }));
  await userEvent.click(screen.getByRole('button', { name: 'Edit my profile' }));
  expect(screen.getByText('my space page')).toBeInTheDocument();
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
