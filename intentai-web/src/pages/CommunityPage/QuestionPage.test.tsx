import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { newQuestion } from '../../data/domain';
import { lookupsStore, questionsStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import { renderCommunity } from './testUtils';

test('shows the pending question with what I wrote and its progress', () => {
  renderCommunity(paths.question('sabo'));

  expect(screen.getByRole('heading', { level: 1, name: 'Community' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Sabo' })).toBeInTheDocument();
  expect(screen.getByText('/sah-boh/')).toBeInTheDocument();
  expect(screen.getByText('Did my colleague insult me?')).toBeInTheDocument();
  expect(screen.getByText('in a Chinese-Singaporean enquiry office · asked 8:55')).toBeInTheDocument();
  expect(screen.getByText('Enquiry office · work')).toBeInTheDocument();
  expect(screen.getByText('Pending')).toBeInTheDocument();
  expect(screen.getByText(/after the manager gave me extra forms/i)).toBeInTheDocument();
  const progress = screen.getByRole('list', { name: 'Progress' });
  expect(within(progress).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'Question sent8:55 · shared anonymously',
    '2 locals reviewingusually answered within a day',
    'Answer written into the entryyou’ll get a notification',
  ]);
  expect(screen.getByText('Locals who speak Hokkien & Singlish are looking at the tone, not just the word.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Your questions · 1 of 2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add more context' })).toBeInTheDocument();
});

test('an answered question shows the local answer and finished progress', () => {
  renderCommunity(paths.question('paiseh'));

  expect(screen.getByText('Answered')).toBeInTheDocument();
  expect(screen.getByText('A friendly apology for inconveniencing someone: sorry to trouble you.')).toBeInTheDocument();
  expect(screen.getByText('Answer written into the entry')).toBeInTheDocument();
  expect(screen.queryByText(/locals reviewing/i)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Your questions · 2 of 2' })).toBeInTheDocument();
});

test('an unknown question id redirects to the list', () => {
  renderCommunity(paths.question('nope'));

  expect(screen.getByTestId('location')).toHaveTextContent(paths.community);
});

test('the back row and "My questions" return to the list', async () => {
  renderCommunity(paths.question('sabo'));
  await userEvent.click(screen.getByRole('link', { name: 'Your questions · 1 of 2' }));
  expect(screen.getByTestId('location')).toHaveTextContent(paths.community);

  await userEvent.click(screen.getByRole('link', { name: /open question “sabo”/i }));
  await userEvent.click(screen.getByRole('link', { name: 'My questions' }));
  expect(screen.getByTestId('location')).toHaveTextContent(paths.community);
});

test('the pager opens the other question', async () => {
  renderCommunity(paths.question('sabo'));

  expect(screen.getByRole('button', { name: 'Question 1 of 2' })).toHaveAttribute('aria-current', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Question 2 of 2' }));

  expect(screen.getByTestId('location')).toHaveTextContent(paths.question('paiseh'));
});

test('Add more context appends to what I wrote', async () => {
  renderCommunity(paths.question('sabo'));

  await userEvent.click(screen.getByRole('button', { name: 'Add more context' }));
  const dialog = screen.getByRole('dialog', { name: 'Add more context' });
  expect(within(dialog).getByText(/your name is not attached/i)).toBeInTheDocument();
  await userEvent.type(within(dialog).getByLabelText('Your message'), 'She was smiling.');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText(/she was smiling\./i)).toBeInTheDocument();
  expect(questionsStore.get()[0].detail).toMatch(/\nShe was smiling\.$/);
  expect(screen.getByRole('status')).toHaveTextContent('Saved on this device');
});

test('as a local, answering marks the question answered and writes it into the phrase entry', async () => {
  settingsStore.set((prev) => ({ ...prev, local: true }));
  renderCommunity(paths.question('sabo'));

  await userEvent.click(screen.getByRole('button', { name: 'Answer question' }));
  const dialog = screen.getByRole('dialog', { name: 'Answer question' });
  await userEvent.type(within(dialog).getByLabelText('Your message'), 'Just teasing, not rude.');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

  expect(screen.getByText('Answered')).toBeInTheDocument();
  expect(screen.getByText('Just teasing, not rude.')).toBeInTheDocument();
  expect(questionsStore.get()[0]).toMatchObject({ status: 'Answered', answer: 'Just teasing, not rude.' });
  expect(lookupsStore.get().find((lookup) => lookup.id === 'sabo')).toMatchObject({
    meaning: 'Just teasing, not rude.',
    source: 'Confirmed by a local',
  });
  expect(screen.getByRole('status')).toHaveTextContent('Answer added to the phrase’s entry');
});

test('an answer to a question I created finds the phrase entry by the phrase, not the id', async () => {
  settingsStore.set((prev) => ({ ...prev, local: true }));
  questionsStore.set([{ ...newQuestion('What does sabo mean here?', 'office'), id: 'q-new' }]);
  renderCommunity(paths.question('q-new'));
  await userEvent.click(screen.getByRole('button', { name: 'Answer question' }));
  const dialog = screen.getByRole('dialog', { name: 'Answer question' });
  await userEvent.type(within(dialog).getByLabelText('Your message'), 'Selling someone out.');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(lookupsStore.get().find((lookup) => lookup.word === 'sabo')?.meaning).toBe('Selling someone out.');
});

test('an answered question offers Add more context, not a second answer', () => {
  settingsStore.set((prev) => ({ ...prev, local: true }));
  renderCommunity(paths.question('paiseh'));
  expect(screen.queryByRole('button', { name: 'Answer question' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add more context' })).toBeInTheDocument();
});

test('Withdraw removes the question, returns to the list, and Undo brings it back', async () => {
  renderCommunity(paths.question('sabo'));

  await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

  expect(screen.getByTestId('location')).toHaveTextContent(paths.community);
  expect(screen.queryByRole('link', { name: /open question “sabo”/i })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Question withdrawn');

  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

  expect(questionsStore.get().map((question) => question.id)).toEqual(['sabo', 'paiseh']);
  expect(screen.getByRole('link', { name: /open question “sabo”/i })).toBeInTheDocument();
});
