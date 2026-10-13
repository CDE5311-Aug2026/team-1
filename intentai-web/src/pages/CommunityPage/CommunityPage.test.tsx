import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { questionsStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import { renderCommunity } from './testUtils';

test('lists my questions with their status, the count and the privacy note', () => {
  renderCommunity(paths.community);

  expect(screen.getByRole('heading', { level: 1, name: 'Community' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: /your questions/i })).toHaveTextContent('2');
  const sabo = screen.getByRole('link', { name: /open question “sabo” — did my colleague insult me\?/i });
  expect(within(sabo).getByText('Pending')).toBeInTheDocument();
  expect(within(sabo).getByText('2 locals reviewing')).toBeInTheDocument();
  const paiseh = screen.getByRole('link', { name: /open question “paiseh to trouble you”/i });
  expect(within(paiseh).getByText('Answered')).toBeInTheDocument();
  expect(within(paiseh).getByText('by a local · written into the entry')).toBeInTheDocument();
  expect(screen.getByText('Nothing else pending — you can ask a local from any entry.')).toBeInTheDocument();
  expect(screen.getByText('Your questions are shown to locals without your name or profile.')).toBeInTheDocument();
});

test('opening a question goes to its detail route', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('link', { name: /open question “sabo”/i }));

  expect(screen.getByTestId('location')).toHaveTextContent(paths.question('sabo'));
});

test('"My questions" is the current segment on the list', () => {
  renderCommunity(paths.community);

  expect(screen.getByRole('link', { name: 'My questions' })).toHaveAttribute('aria-current', 'page');
});

test('Ask a local saves an anonymous question at the top of the list', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('button', { name: 'Ask a local' }));
  const dialog = screen.getByRole('dialog', { name: 'Ask a local' });
  expect(within(dialog).getByText(/your name is not attached/i)).toBeInTheDocument();
  await userEvent.type(within(dialog).getByLabelText('Your message'), 'Is chope polite?');
  await userEvent.type(within(dialog).getByLabelText('Where did you hear it?'), 'Hawker centre · lunch');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const links = screen.getAllByRole('link', { name: /^open question/i });
  expect(links).toHaveLength(3);
  expect(links[0]).toHaveAccessibleName('Open question Is chope polite?');
  expect(within(links[0]).getByText('Hawker centre · lunch')).toBeInTheDocument();
  expect(within(links[0]).getByText('Pending')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: /your questions/i })).toHaveTextContent('3');
  expect(questionsStore.get()[0]).toMatchObject({ text: 'Is chope polite?', status: 'Pending' });
  expect(screen.getByRole('status')).toHaveTextContent('Saved on this device');
});

test('an empty message is not saved', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('button', { name: 'Ask a local' }));
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(questionsStore.get()).toHaveLength(2);
});

test('the local-answering switch is saved and changes the note', async () => {
  renderCommunity(paths.community);
  const toggle = screen.getByRole('switch', { name: 'Answer as a local' });
  expect(toggle).toHaveAttribute('aria-checked', 'false');

  await userEvent.click(toggle);

  expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(settingsStore.get().local).toBe(true);
  expect(screen.getByText('Local answering is enabled. Open a question to add an interpretation.')).toBeInTheDocument();
});

test('with no questions it says so instead of showing an empty list', () => {
  questionsStore.set([]);
  renderCommunity(paths.community);

  expect(screen.queryByRole('link', { name: /^open question/i })).not.toBeInTheDocument();
  expect(screen.getByText('No questions yet — ask a local about anything you heard.')).toBeInTheDocument();
});
