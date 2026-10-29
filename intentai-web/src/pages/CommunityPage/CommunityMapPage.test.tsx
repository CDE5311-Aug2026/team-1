import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { communitySocialStore } from '../../data/community/social';
import { newQuestion } from '../../data/domain';
import { memoryStore } from '../../data/memory';
import { localProfileStore } from '../../data/profile/localProfile';
import { DEFAULT_PROFILE_V3, profileV3Store } from '../../data/profile/profile';
import { questionsStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import { renderCommunity } from './testUtils';

test('the map card on Community opens the Locals map', async () => {
  renderCommunity(paths.community);
  await userEvent.click(screen.getByRole('link', { name: /locals near your places/i }));
  expect(screen.getByTestId('location')).toHaveTextContent(paths.communityMap);
});

test('pins, filter counts and cards come from the stored questions', async () => {
  questionsStore.set([{ ...newQuestion('Where to eat?', 'near Chinatown', { areaId: 'sg-chinatown', areaName: 'Chinatown' }), id: 'mine' }]);
  renderCommunity(paths.communityMap);

  // mine (needs a local) + 20 community threads with an area (18 answered, 2 open)
  expect(screen.getByRole('button', { name: 'All 21' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Answered 18' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Waiting 0' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Needs a local 3' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Where to eat?. Needs a local, Chinatown' })).toBeInTheDocument();
  const cards = screen.getByLabelText('Questions on the map');
  expect(within(cards).getByRole('heading', { name: 'Where to eat?' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Answered 18' }));
  expect(within(cards).queryByRole('heading', { name: 'Where to eat?' })).not.toBeInTheDocument();
  expect(screen.getAllByText('Answered').length).toBeGreaterThan(0);
});

test('tapping a pin selects its card; the card arrow opens the thread', async () => {
  renderCommunity(paths.communityMap);

  const pin = await screen.findByRole('button', { name: /“chope”.*Chinatown/ });
  await userEvent.click(pin);
  expect(pin).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('link', { name: /Open Is “chope”/ }));
  expect(screen.getByTestId('location')).toHaveTextContent(paths.question('singlish-chope'));
});

test('people show at area level; the profile sheet shows the member’s line, languages and activity, Follow and Ask them', async () => {
  renderCommunity(paths.communityMap);

  await userEvent.click(await screen.findByRole('button', { name: /^Mel T\./ }));
  const sheet = screen.getByRole('dialog', { name: 'Mel T.' });
  expect(within(sheet).queryByText('Example')).toBeNull();
  expect(within(sheet).getByText('Around Clementi (area only)')).toBeInTheDocument();
  expect(within(sheet).getByText('Local · NUS, lives near Kent Ridge')).toBeInTheDocument();
  expect(within(sheet).getByText('Answers').nextSibling).toHaveTextContent('142');
  expect(within(sheet).getByText('Mar 2026')).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole('button', { name: 'Follow' }));
  expect(communitySocialStore.get().followingPeople).toEqual(['p-mel']);

  await userEvent.click(within(sheet).getByRole('button', { name: 'Ask them' }));
  const ask = screen.getByRole('dialog', { name: 'Ask a local' });
  expect(within(ask).getByText('Locals near Clementi will see it.')).toBeInTheDocument();
});

test('I appear on the map only with Answer as a local on and "Show me on the map" chosen', async () => {
  renderCommunity(paths.communityMap);
  expect(screen.queryByRole('button', { name: /^You\b.*near/ })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'You as a local' }));
  const sheet = screen.getByRole('dialog', { name: 'You as a local' });
  expect(within(sheet).getByLabelText('Show me on the map')).toBeDisabled();
  await userEvent.click(within(sheet).getByRole('button', { name: /Switch on Answer as a local/ }));
  await userEvent.selectOptions(within(sheet).getByLabelText('Your area'), 'sg-tiong-bahru');
  await userEvent.click(within(sheet).getByLabelText('Show me on the map'));
  expect(settingsStore.get().local).toBe(true);
  expect(communitySocialStore.get().profile).toEqual({ shown: true, areaId: 'sg-tiong-bahru' });
  await userEvent.click(within(sheet).getByRole('button', { name: 'Close' }));

  expect(await screen.findByRole('button', { name: /^You\b.*near Tiong Bahru/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('switch', { name: 'Answer as a local' }));
  expect(screen.queryByRole('button', { name: /^You\b.*near/ })).not.toBeInTheDocument();
});

test('+ Ask opens Ask a local, and a pinned question joins the map', async () => {
  renderCommunity(paths.communityMap);

  await userEvent.click(screen.getByRole('button', { name: 'Ask a local' }));
  const ask = screen.getByRole('dialog', { name: 'Ask a local' });
  await userEvent.click(within(ask).getByRole('button', { name: /^Chinatown/ }));
  await userEvent.type(within(ask).getByLabelText('Your message'), 'Is there a quiet hawker centre?');
  await userEvent.click(within(ask).getByRole('button', { name: 'Post to locals' }));

  expect(await screen.findByRole('button', { name: 'Is there a quiet hawker centre?. Needs a local, Chinatown' })).toBeInTheDocument();
});

test('the map credit and the privacy line sit behind one info button', async () => {
  renderCommunity(paths.communityMap);
  const PRIVACY = 'Locals see your question and place, never your name or location.';
  const CREDIT = 'EARTH ONLINE map · © OpenStreetMap contributors';
  expect(screen.queryByText(PRIVACY)).not.toBeInTheDocument();
  expect(screen.queryByText(CREDIT)).not.toBeInTheDocument();

  const info = screen.getByRole('button', { name: 'Map info and privacy' });
  expect(info).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(info);
  expect(info).toHaveAttribute('aria-expanded', 'true');
  const popover = screen.getByRole('dialog', { name: 'Map info' });
  expect(info).toHaveAttribute('aria-controls', popover.id);
  expect(within(popover).getByText(PRIVACY)).toBeInTheDocument();
  expect(within(popover).getByText(CREDIT)).toBeInTheDocument();

  // Second tap closes; Escape and a tap outside close too.
  await userEvent.click(info);
  expect(screen.queryByRole('dialog', { name: 'Map info' })).not.toBeInTheDocument();
  await userEvent.click(info);
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog', { name: 'Map info' })).not.toBeInTheDocument();
  expect(info).toHaveFocus();
  await userEvent.click(info);
  await userEvent.click(screen.getByRole('button', { name: 'Answered 18' }));
  expect(screen.queryByRole('dialog', { name: 'Map info' })).not.toBeInTheDocument();
});

test('You as a local is prefilled from onboarding, and Save stores the tags', async () => {
  profileV3Store.set({ ...DEFAULT_PROFILE_V3, from: 'IN', language: 'ta' });
  renderCommunity(paths.communityMap);

  await userEvent.click(screen.getByRole('button', { name: 'You as a local' }));
  const sheet = screen.getByRole('dialog', { name: 'You as a local' });
  expect(within(sheet).getByLabelText(/^Where you grew up/)).toHaveValue('India');
  const native = within(sheet).getByRole('group', { name: 'Native language(s)' });
  expect(within(native).getByRole('button', { name: 'Tamil' })).toHaveAttribute('aria-pressed', 'true');
  const preview = within(sheet).getByRole('group', { name: 'Others see:' });
  expect(within(preview).getByText('Speaks Tamil')).toBeInTheDocument();
  expect(within(preview).getByText('Grew up in India')).toBeInTheDocument();
  expect(within(sheet).getByText('Saved to your memory in My Space')).toBeInTheDocument();

  await userEvent.click(within(within(sheet).getByRole('group', { name: 'Culture' })).getByRole('button', { name: 'Indian' }));
  await userEvent.click(within(native).getByRole('button', { name: 'English' }));
  await userEvent.click(within(within(sheet).getByRole('group', { name: 'Happy to help with' })).getByRole('button', { name: 'Food' }));
  expect(within(preview).getByText('Indian')).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

  expect(localProfileStore.get()).toEqual({
    culture: ['Indian'],
    nativeLanguages: ['Tamil', 'English'],
    // unchanged from the profile: stored empty, so it keeps following From in My Space
    grewUp: '',
    background: '',
    showBackground: false,
    helpWith: ['Food'],
    edited: true,
  });
  expect(screen.queryByRole('dialog', { name: 'You as a local' })).not.toBeInTheDocument();
});

test('background stays private unless shown; my map profile lists my public tags', async () => {
  memoryStore.set((m) => ({ ...m, enabled: false }));
  settingsStore.set((s) => ({ ...s, local: true }));
  communitySocialStore.set((prev) => ({ ...prev, profile: { shown: true, areaId: 'sg-tiong-bahru' } }));
  renderCommunity(paths.communityMap);

  await userEvent.click(screen.getByRole('button', { name: 'You as a local' }));
  const sheet = screen.getByRole('dialog', { name: 'You as a local' });
  expect(within(sheet).queryByText('Saved to your memory in My Space')).not.toBeInTheDocument();
  await userEvent.type(within(sheet).getByLabelText(/Background \/ ethnicity/), 'Peranakan Chinese');
  const preview = within(sheet).getByRole('group', { name: 'Others see:' });
  expect(within(preview).queryByText('Peranakan Chinese')).not.toBeInTheDocument();
  expect(within(sheet).getByText(/Private — only you see this/)).toBeInTheDocument();
  const show = within(sheet).getByRole('switch', { name: 'Show on my profile' });
  expect(show).toHaveAttribute('aria-checked', 'false');
  await userEvent.click(show);
  expect(within(preview).getByText('Peranakan Chinese')).toBeInTheDocument();
  await userEvent.click(show);
  expect(within(preview).queryByText('Peranakan Chinese')).not.toBeInTheDocument();
  await userEvent.click(within(within(sheet).getByRole('group', { name: 'Culture' })).getByRole('button', { name: 'Peranakan' }));
  await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
  expect(localProfileStore.get()).toMatchObject({ background: 'Peranakan Chinese', showBackground: false, culture: ['Peranakan'] });

  await userEvent.click(await screen.findByRole('button', { name: /^You\b.*near Tiong Bahru/ }));
  const me = screen.getByRole('dialog', { name: 'You on the map' });
  const tags = within(me).getByRole('list', { name: 'Your public tags' });
  expect(within(tags).getByText('Peranakan')).toBeInTheDocument();
  expect(within(me).queryByText('Peranakan Chinese')).not.toBeInTheDocument();
});
