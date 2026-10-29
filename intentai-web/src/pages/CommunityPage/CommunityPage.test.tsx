import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { communitySocialStore } from '../../data/community/social';
import { newQuestion } from '../../data/domain';
import { questionsStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import CommunityPage from './CommunityPage';
import { renderCommunity } from './testUtils';

test('home shows the two doors, the feed, my questions with progress, the map card and the privacy line', () => {
  renderCommunity(paths.community);

  expect(screen.getByRole('heading', { level: 1, name: 'Community' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^ask a local/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^answer as a local/i })).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Answer as a local' })).toHaveAttribute('aria-checked', 'false');
  expect(screen.getByRole('tab', { name: 'Top Questions' })).toHaveAttribute('aria-selected', 'true');
  // Reply counts come from the stored example replies (7 in this thread).
  expect(screen.getByRole('button', { name: /“3 pm, can or not\?”.*7 replies/i })).toBeInTheDocument();

  const mine = screen.getByRole('region', { name: 'My Questions' });
  expect(within(mine).getByText(/replied ·/)).toHaveTextContent('1 replied · 1 waiting');
  const sabo = screen.getByRole('link', { name: /open question “sabo”/i }).closest('article')!;
  expect(within(sabo).getByText('Waiting')).toBeInTheDocument();
  expect(within(sabo).queryByText('Example')).toBeNull();
  expect(within(sabo).getByRole('list', { name: 'Progress: Posted, 1 of 4' })).toBeInTheDocument();
  const paiseh = screen.getByRole('link', { name: /open question “paiseh/i }).closest('article')!;
  expect(within(paiseh).getByText('Replied', { selector: 'span' })).toBeInTheDocument();
  expect(within(paiseh).getByText('A friendly apology for inconveniencing someone: sorry to trouble you.')).toBeInTheDocument();
  expect(within(paiseh).getByRole('link', { name: 'Replies, 1' })).toBeInTheDocument();

  expect(screen.getByRole('link', { name: /locals near your places/i })).toHaveAttribute('href', paths.communityMap);
  expect(screen.getByText('Locals see your question and place, never your name or location.')).toBeInTheDocument();
  expect(screen.getByText(/Photos: .*CC BY-SA/)).toBeInTheDocument();
});

test('a seen question shows Read; a question I closed shows Resolved', () => {
  questionsStore.set([
    { ...newQuestion('Is chope rude?', ''), id: 'a', status: 'Seen' },
    { ...newQuestion('Is lah rude?', ''), id: 'b', status: 'Answered', answer: 'No.' },
  ]);
  communitySocialStore.set((prev) => ({ ...prev, closed: ['b'] }));
  renderCommunity(paths.community);

  const a = screen.getByRole('link', { name: 'Open question Is chope rude?' }).closest('article')!;
  expect(within(a).getByRole('list', { name: 'Progress: Read, 2 of 4' })).toBeInTheDocument();
  expect(within(a).getByText('A local has read your question.')).toBeInTheDocument();
  const b = screen.getByRole('link', { name: 'Open question Is lah rude?' }).closest('article')!;
  expect(within(b).getByText('Resolved', { selector: 'span' })).toBeInTheDocument();
  expect(screen.getByText(/replied ·/)).toHaveTextContent('0 replied · 1 waiting · 1 resolved');
});

test('the feed switches to For You, and a card opens its thread', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('tab', { name: 'For You' }));
  expect(screen.getByRole('tab', { name: 'For You' })).toHaveAttribute('aria-selected', 'true');
  await userEvent.click(screen.getByRole('button', { name: /how can I turn down an invitation/i }));

  expect(screen.getByTestId('location')).toHaveTextContent(paths.question('chinese-kind-no'));
});

test('Ask a local posts an anonymous question at the top of My Questions', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('button', { name: /^ask a local/i }));
  const dialog = screen.getByRole('dialog', { name: 'Ask a local' });
  expect(within(dialog).getByText(/never your name or location/i)).toBeInTheDocument();
  expect(within(dialog).getByText('Not linked to a card. A local’s answer will stay in My questions.')).toBeInTheDocument();
  await userEvent.type(within(dialog).getByLabelText('Your message'), 'Is chope polite?');
  await userEvent.type(within(dialog).getByLabelText('Where did you hear it?'), 'Hawker centre · lunch');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Post to locals' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const links = screen.getAllByRole('link', { name: /^open question/i });
  expect(links).toHaveLength(3);
  expect(links[0]).toHaveAccessibleName('Open question Is chope polite?');
  expect(questionsStore.get()[0]).toMatchObject({ text: 'Is chope polite?', context: 'Hawker centre · lunch', status: 'Pending', from: 'community', topic: 'other' });
  expect(screen.getByRole('status')).toHaveTextContent('Posted. Answers arrive in My questions.');
});

test('pinning a place in Ask a local stores the area on the question and the spot for the map', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('button', { name: /^ask a local/i }));
  const dialog = screen.getByRole('dialog', { name: 'Ask a local' });
  await userEvent.click(within(dialog).getByRole('button', { name: /^Chinatown/ }));
  expect(within(dialog).getByText('Locals near Chinatown will see it.')).toBeInTheDocument();
  expect(within(dialog).queryByLabelText('Where did you hear it?')).not.toBeInTheDocument();
  await userEvent.type(within(dialog).getByLabelText('Your message'), 'Where is a quiet place to eat?');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Post to locals' }));

  const q = questionsStore.get()[0];
  expect(q).toMatchObject({ areaId: 'sg-chinatown', areaName: 'Chinatown', context: 'near Chinatown' });
  expect(communitySocialStore.get().places).toEqual([expect.objectContaining({ questionId: q.id, areaId: 'sg-chinatown' })]);
});

test('Ask hands over a draft with its card and area, and the sheet says where the answer goes', async () => {
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: paths.community,
          state: { askLocal: 'When is the queue shortest?', link: { cardId: 'chicken-rice', areaId: 'sg-chinatown', areaName: 'Chinatown', topic: 'food', from: 'ask' } },
        },
      ]}
    >
      <CommunityPage />
    </MemoryRouter>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Ask a local' });
  expect(within(dialog).getByText('From Ask')).toBeInTheDocument();
  expect(within(dialog).getByLabelText('Your message')).toHaveValue('When is the queue shortest?');
  expect(within(dialog).getByText('Linked to your Hainanese chicken rice card. A local’s answer will be added to it as a tip.')).toBeInTheDocument();
  expect(within(dialog).getByText('Locals near Chinatown will see it.')).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Post to locals' }));

  expect(questionsStore.get()[0]).toMatchObject({ cardId: 'chicken-rice', areaId: 'sg-chinatown', topic: 'food', from: 'ask' });
});

test('an empty message is not posted', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('button', { name: /^ask a local/i }));
  await userEvent.click(screen.getByRole('button', { name: 'Post to locals' }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(questionsStore.get()).toHaveLength(2);
});

test('Withdraw on a card removes the question and Undo brings it back', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('button', { name: /withdraw “sabo”/i }));
  expect(screen.queryByRole('link', { name: /open question “sabo”/i })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Question withdrawn');
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

  expect(questionsStore.get().map((q) => q.id)).toEqual(['sabo', 'paiseh']);
});

test('Add / edit context on a waiting question', async () => {
  questionsStore.set([{ ...newQuestion('Is chope rude?', ''), id: 'a' }]);
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('button', { name: 'Add context' }));
  const dialog = screen.getByRole('dialog', { name: 'Add context' });
  await userEvent.type(within(dialog).getByLabelText('Where did you hear it?'), 'Food court');
  await userEvent.type(within(dialog).getByLabelText('What happened?'), 'A tissue packet was on the seat.');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save context' }));

  expect(questionsStore.get()[0]).toMatchObject({ context: 'Food court', detail: 'A tissue packet was on the seat.' });
  expect(screen.getByRole('button', { name: 'Edit context' })).toBeInTheDocument();
});

test('the switch on the door turns Answer as a local on', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('switch', { name: 'Answer as a local' }));

  expect(settingsStore.get().local).toBe(true);
  expect(screen.getByRole('switch', { name: 'Answer as a local' })).toHaveTextContent('On');
});

test('notifications: unread dot, All / Unread, mark all read, and opening goes to the reply', async () => {
  renderCommunity(paths.community);

  // paiseh's answer + the kit's 41 + two from our own threads I follow
  await userEvent.click(screen.getByRole('button', { name: 'Notifications, 44 unread' }));
  const sheet = screen.getByRole('dialog', { name: 'Notifications' });
  expect(within(sheet).getAllByRole('button', { name: /^Unread\./ })).toHaveLength(44);
  expect(within(sheet).getByRole('button', { name: /Siti A\. replied to your question\. “paiseh/ })).toBeInTheDocument();
  expect(within(sheet).queryByText('Example')).toBeNull();

  await userEvent.click(within(sheet).getByRole('button', { name: 'Mark all read' }));
  expect(communitySocialStore.get().readNotifications).toHaveLength(44);
  await userEvent.click(within(sheet).getByRole('button', { name: 'Unread' }));
  expect(within(sheet).getByText('You’re all caught up.')).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole('button', { name: 'All' }));

  await userEvent.click(within(sheet).getByRole('button', { name: /\bMel mentioned you/ }));
  expect(screen.getByTestId('location')).toHaveTextContent(paths.question('singlish-can-or-not'));
  // The mentioned reply is a child of my own reply: its branch is expanded.
  expect(screen.getByText(/yep, that sounds natural/)).toBeInTheDocument();
});

test('with no questions it says so', () => {
  questionsStore.set([]);
  renderCommunity(paths.community);

  expect(screen.queryByRole('link', { name: /^open question/i })).not.toBeInTheDocument();
  expect(screen.getByText(/No questions yet/)).toBeInTheDocument();
});

/* ---------- Answer as a local (?mode=answer) ---------- */

test('the Answer door opens the channel browser in the URL', async () => {
  renderCommunity(paths.community);

  await userEvent.click(screen.getByRole('button', { name: /^answer as a local/i }));

  expect(screen.getByTestId('location')).toHaveTextContent('/community?mode=answer');
  expect(screen.getByRole('heading', { level: 1, name: 'Answer as a local' })).toBeInTheDocument();
});

test('channels, search and All / Open / Answered filter the conversations, with counts', async () => {
  renderCommunity(`${paths.community}?mode=answer`);

  for (const name of ['Daily Usage', 'Mandarin & English', 'Chinese Culture in Malaysia', 'Singapore / Singlish']) {
    expect(screen.getByRole('button', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
  }
  // 210 community threads (the kit's 200 + our 10) + my 2 questions
  expect(screen.getByText('212 conversations')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'New questions' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^Singapore \/ Singlish/ }));
  expect(screen.getByText('53 conversations')).toBeInTheDocument();
  expect(screen.getByText('Something you heard on campus, at lunch, or in a group chat? Ask here.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^Open/ }));
  expect(screen.getByText('1 conversation')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /paiseh/ })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^All channels/ }));
  await userEvent.click(screen.getByRole('button', { name: /^All \d/ }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search community questions' }), 'Lim Chee Guan');
  expect(screen.getByText('1 conversation found')).toBeInTheDocument();
  await userEvent.clear(screen.getByRole('searchbox'));
  await userEvent.type(screen.getByRole('searchbox'), 'zzzz');
  expect(screen.getByText('No matching questions yet.')).toBeInTheDocument();
});

test('the back button returns to the Community home', async () => {
  renderCommunity(`${paths.community}?mode=answer`);

  await userEvent.click(screen.getByRole('button', { name: 'Back to Community' }));

  expect(screen.getByTestId('location')).toHaveTextContent(/^\/community$/);
});
