import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { communitySocialStore } from '../../data/community/social';
import { newQuestion } from '../../data/domain';
import { lookupsStore, questionsStore, settingsStore, tipsStore } from '../../data/stores';
import { paths } from '../../routes';
import { renderCommunity } from './testUtils';

test('an example thread shows the question, author, topic, photo credit and its replies', () => {
  renderCommunity(paths.question('singlish-can-or-not'));

  expect(screen.getByRole('heading', { level: 1, name: 'Question' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: '“Can or not?” — a question, a nudge, or both?' })).toBeInTheDocument();
  expect(screen.getByText('Kai T.')).toBeInTheDocument();
  expect(screen.getByText(/From Osaka · NUS exchange · .* · 728 views/)).toBeInTheDocument();
  expect(screen.queryByText('Example')).toBeNull();
  expect(screen.getByRole('link', { name: 'Singapore / Singlish' })).toHaveAttribute('href', '/community?mode=answer');
  expect(screen.getByRole('button', { name: 'Open the photo' })).toBeInTheDocument();
  // Three replies to the question; the nested ones are collapsed.
  expect(screen.getAllByRole('button', { name: /^Like reply from/ })).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'View 2 replies' })).toBeInTheDocument();
});

test('replies expand and collapse, and deep replies say who they answer', async () => {
  renderCommunity(paths.question('singlish-can-or-not'));

  await userEvent.click(screen.getByRole('button', { name: 'View 2 replies' }));
  expect(screen.getByText(/It was said quite quickly/)).toBeInTheDocument();
  await userEvent.click(screen.getAllByRole('button', { name: 'View 1 reply' })[0]);
  expect(screen.getByText(/That extra context helps/)).toBeInTheDocument();
  expect(screen.getByText('Replying to Kai T.')).toBeInTheDocument();
  expect(screen.getAllByText('Author').length).toBeGreaterThan(0);

  await userEvent.click(screen.getAllByRole('button', { name: 'Hide replies' })[0]);
  expect(screen.getByRole('button', { name: 'View 2 replies' })).toHaveAttribute('aria-expanded', 'false');
  await waitFor(() => expect(screen.queryByText(/It was said quite quickly/)).not.toBeInTheDocument());
});

test('like, follow and save to Moments are kept on this device; likes add to the members’ likes', async () => {
  renderCommunity(paths.question('singlish-can-or-not'));

  await userEvent.click(screen.getByRole('button', { name: 'Like reply from Mel T., 43 likes' }));
  expect(communitySocialStore.get().likes).toEqual(['singlish-can-or-not-r1']);
  expect(screen.getByRole('button', { name: 'Unlike reply from Mel T., 44 likes' })).toHaveAttribute('aria-pressed', 'true');

  await userEvent.click(screen.getByRole('button', { name: 'Follow' }));
  expect(screen.getByRole('button', { name: 'Following' })).toHaveAttribute('aria-pressed', 'true');
  expect(communitySocialStore.get().following).toEqual(['singlish-can-or-not']);

  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('status')).toHaveTextContent('Saved to Moments');
  expect(communitySocialStore.get().saved[0]).toMatchObject({ threadId: 'singlish-can-or-not', topic: 'Singapore / Singlish' });
  expect(communitySocialStore.get().saved[0].replies).toHaveLength(6);
});

test('Top / Latest: my newest reply comes first under Latest', async () => {
  renderCommunity(paths.question('singlish-can-or-not'));

  await userEvent.type(screen.getByLabelText('Add your reply'), 'Thanks, this helps.');
  await userEvent.click(screen.getByRole('button', { name: 'Submit reply' }));
  expect(screen.getByRole('status')).toHaveTextContent('Reply added');
  expect(communitySocialStore.get().replies).toEqual([expect.objectContaining({ threadId: 'singlish-can-or-not', text: 'Thanks, this helps.' })]);

  await userEvent.click(screen.getByRole('button', { name: 'Latest' }));
  expect(screen.getAllByRole('button', { name: /^Like reply from/ })[0]).toHaveAccessibleName('Like reply from You');
});

test('replying to a reply nests it under that reply', async () => {
  renderCommunity(paths.question('singlish-chope'));

  await userEvent.click(screen.getByRole('button', { name: 'Reply to Liv N.' }));
  expect(screen.getByText('Replying to', { exact: false })).toHaveTextContent('Replying to Liv N.');
  await userEvent.type(screen.getByRole('textbox', { name: 'Reply to Liv N.' }), 'Good idea.');
  await userEvent.click(screen.getByRole('button', { name: 'Submit reply' }));

  expect(communitySocialStore.get().replies[0]).toMatchObject({ parentId: 'singlish-chope-r1', text: 'Good idea.' });
  expect(screen.getByText('Good idea.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hide replies' })).toBeInTheDocument();
});

test('my own question shows what I wrote, what it is linked to, and owner tools', () => {
  renderCommunity(paths.question('sabo'));

  expect(screen.getByRole('heading', { level: 2, name: '“sabo” — did my colleague insult me?' })).toBeInTheDocument();
  expect(screen.getByText(/after the manager gave me extra forms/i)).toBeInTheDocument();
  expect(screen.getByText('Linked to “sabo” in Moments: a local’s answer will be added to it.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit context' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close question' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  expect(screen.getByText('A new conversation starts here.')).toBeInTheDocument();
});

test('long text is cut with Read more', async () => {
  questionsStore.set([{ ...newQuestion('Long one?', ''), id: 'long', detail: 'word '.repeat(60) }]);
  renderCommunity(paths.question('long'));

  const more = screen.getByRole('button', { name: /Read more/ });
  expect(more).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(more);
  expect(screen.getByRole('button', { name: /Show less/ })).toHaveAttribute('aria-expanded', 'true');
});

test('my own reply does not move my question to Replied', async () => {
  renderCommunity(paths.question('sabo'));

  await userEvent.type(screen.getByLabelText('Add your reply'), 'She was smiling.');
  await userEvent.click(screen.getByRole('button', { name: 'Submit reply' }));

  expect(questionsStore.get()[0].status).toBe('Pending');
  expect(screen.getByText('She was smiling.')).toBeInTheDocument();
  expect(screen.getAllByText('Author').length).toBe(1);
});

test('Close marks it resolved and closes replies; Reopen opens them again', async () => {
  renderCommunity(paths.question('paiseh'));

  await userEvent.click(screen.getByRole('button', { name: 'Close question' }));
  expect(communitySocialStore.get().closed).toEqual(['paiseh']);
  expect(screen.getByText('Resolved')).toBeInTheDocument();
  expect(screen.getByLabelText('Replies are closed')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Reply to Siti A.' })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: 'Reopen question' }));
  expect(communitySocialStore.get().closed).toEqual([]);
  expect(screen.getByLabelText('Add your reply')).toBeEnabled();
});

test('Withdraw returns to the list with Undo; a saved copy stays readable', async () => {
  renderCommunity(paths.question('sabo'));
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/community$/);
  expect(screen.getByRole('status')).toHaveTextContent('Question withdrawn');
  expect(questionsStore.get().map((q) => q.id)).toEqual(['paiseh']);
  expect(communitySocialStore.get().saved.map((s) => s.threadId)).toEqual(['sabo']);

  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(questionsStore.get().map((q) => q.id)).toEqual(['sabo', 'paiseh']);
});

test('a withdrawn question I saved opens as a saved copy', () => {
  communitySocialStore.set((prev) => ({ ...prev, saved: [{ threadId: 'gone', title: 'Old question', body: '', topic: 'Daily Usage', replies: [{ author: 'Mel', text: 'Hi' }], savedAt: 1 }] }));
  renderCommunity(paths.question('gone'));

  expect(screen.getByRole('heading', { level: 2, name: 'Old question' })).toBeInTheDocument();
  expect(screen.getByText('Saved copy')).toBeInTheDocument();
  expect(screen.getByLabelText('Replies are closed')).toBeDisabled();
});

test('an unknown id redirects to Community', () => {
  renderCommunity(paths.question('nope'));

  expect(screen.getByTestId('location')).toHaveTextContent(/^\/community$/);
});

test('add context from the thread', async () => {
  questionsStore.set([{ ...newQuestion('Is chope rude?', ''), id: 'a' }]);
  renderCommunity(paths.question('a'));

  await userEvent.click(screen.getByRole('button', { name: 'Add context' }));
  const dialog = screen.getByRole('dialog', { name: 'Add context' });
  await userEvent.type(within(dialog).getByLabelText('Where did you hear it?'), 'Food court');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save context' }));

  expect(screen.getByText('Where: Food court')).toBeInTheDocument();
});

/* ---------- Answering as a local on this device (the real loop) ---------- */

test('a local opening a waiting question marks it read', () => {
  settingsStore.set((prev) => ({ ...prev, local: true }));
  renderCommunity(paths.question('sabo'));

  expect(questionsStore.get()[0]).toMatchObject({ status: 'Seen', seenAt: expect.any(Number) });
});

test('as a local, the reply box answers through answerQuestion and writes the phrase entry', async () => {
  settingsStore.set((prev) => ({ ...prev, local: true }));
  renderCommunity(paths.question('sabo'));

  expect(screen.getByText('Answering as a local')).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Your answer as a local'), 'Just teasing, not rude.');
  await userEvent.click(screen.getByRole('button', { name: 'Send answer' }));

  expect(questionsStore.get()[0]).toMatchObject({ status: 'Added', answer: 'Just teasing, not rude.', answeredBy: 'A local' });
  expect(lookupsStore.get().find((l) => l.id === 'sabo')).toMatchObject({ meaning: 'Just teasing, not rude.', source: 'Confirmed by a local' });
  expect(screen.getByRole('status')).toHaveTextContent('Answer added to “sabo” in Moments');
  expect(screen.getByText('Added to “sabo” in Moments.')).toBeInTheDocument();
  // Answered once: the box is a normal reply box again.
  expect(screen.getByLabelText('Add your reply')).toBeInTheDocument();
});

test('answering a question from an Ask card adds the answer to that card as a tip', async () => {
  const q = newQuestion('When is the queue shortest at Tian Tian?', 'near Chinatown', { cardId: 'chicken-rice', areaName: 'Chinatown', topic: 'food', from: 'ask' });
  questionsStore.set([q]);
  tipsStore.set([]);
  settingsStore.set((prev) => ({ ...prev, local: true }));
  renderCommunity(paths.question(q.id));
  expect(screen.getByText('Linked to your Hainanese chicken rice card: a local’s answer will be added to it.')).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText('Name shown with your answer (optional)'), 'Mei');
  await userEvent.type(screen.getByLabelText('Your answer as a local'), 'Weekday mornings, before 11.');
  await userEvent.click(screen.getByRole('button', { name: 'Send answer' }));

  expect(screen.getByRole('status')).toHaveTextContent('Answer added to the Hainanese chicken rice card as a local tip');
  expect(screen.getByText('Added to your Hainanese chicken rice card as a local tip.')).toBeInTheDocument();
  expect(screen.getByText('Mei')).toBeInTheDocument();
  expect(tipsStore.get()).toEqual([expect.objectContaining({ cardId: 'chicken-rice', questionId: q.id, text: 'Weekday mornings, before 11.', by: 'Mei' })]);
});

test('answering a question with no link saves only the answer, and says so', async () => {
  const q = newQuestion('Where can I buy a SIM card?', '');
  questionsStore.set([q]);
  tipsStore.set([]);
  settingsStore.set((prev) => ({ ...prev, local: true }));
  renderCommunity(paths.question(q.id));

  await userEvent.type(screen.getByLabelText('Your answer as a local'), 'Any 7-Eleven.');
  await userEvent.click(screen.getByRole('button', { name: 'Send answer' }));

  expect(screen.getByRole('status')).toHaveTextContent('Answer saved. It isn’t linked to a card or phrase.');
  expect(questionsStore.get()[0].status).toBe('Answered');
  expect(tipsStore.get()).toEqual([]);
});
