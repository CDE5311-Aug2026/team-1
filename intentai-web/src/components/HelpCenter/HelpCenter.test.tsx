// The Help Centre sheet (boards 06 and 23): Ask with starter questions for the v2 tabs and answers from the guide when
// the server has none; Feedback as a kind and a note (no screenshot, owner decision D6), posted to /api/help unchanged.
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { renderAt } from '../../pages/MySpacePage/testUtils';
import { paths } from '../../routes';
import { pageOf } from './HelpCenter';
import { closeHelp, openHelp } from './helpStore';

afterEach(() => {
  act(() => closeHelp());
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('the sheet names the tab it was opened on, with v2 starter questions', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(json({}, 503))));
  renderAt(paths.today);
  act(() => openHelp('ask'));
  const help = within(await screen.findByRole('dialog', { name: 'Help Center' }));
  expect(help.getByText('Help Centre')).toBeInTheDocument();
  expect(help.getByText('On Home')).toBeInTheDocument();
  expect(help.getByRole('tab', { name: 'Ask' })).toHaveAttribute('aria-selected', 'true');
  for (const q of ['What are the four categories?', 'How do public hunts work?', 'How do I stamp a place?', 'Can I hunt solo?']) {
    expect(help.getByRole('button', { name: q })).toBeInTheDocument();
  }
  expect(help.getByText('Generative AI assistance may make mistakes.')).toBeInTheDocument();
});

test('with no answer from the server, a starter is answered from the guide on the device', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(json({}, 503))));
  renderAt(paths.today);
  act(() => openHelp('ask'));
  const help = within(await screen.findByRole('dialog', { name: 'Help Center' }));
  await userEvent.click(help.getByRole('button', { name: 'What are the four categories?' }));
  expect(await help.findByText(/Attractions, Wellness, Leisure and Cruise/, undefined, { timeout: 3000 })).toBeInTheDocument();
});

test('Feedback: a kind and a note go to /api/help as before; no screenshot is offered', async () => {
  const fetchFn = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(json({ ok: true })));
  vi.stubGlobal('fetch', fetchFn);
  renderAt(paths.hunt);
  act(() => openHelp('feedback'));
  const help = within(await screen.findByRole('dialog', { name: 'Help Center' }));
  expect(help.queryByText(/screenshot/i)).toBeNull();
  expect(help.getByText('Hunt')).toBeInTheDocument();
  const send = help.getByRole('button', { name: /Send to the team/ });
  expect(send).toBeDisabled();
  await userEvent.click(help.getByRole('radio', { name: 'Wrong info' }));
  expect(help.getByRole('radio', { name: 'Wrong info' })).toHaveAttribute('aria-checked', 'true');
  await userEvent.type(help.getByRole('textbox', { name: 'Your feedback' }), 'The hours are old');
  await userEvent.click(send);
  expect(await help.findByText('Sent to the FindSG team.')).toBeInTheDocument();
  const body = JSON.parse(fetchFn.mock.calls.find((c) => String(c[1]?.body).includes('feedback'))![1]!.body as string);
  // The server's kinds are unchanged: Wrong info goes as a bug, labelled in the note.
  expect(body).toMatchObject({ mode: 'feedback', kind: 'bug', page: 'Hunt', text: 'Wrong info: The hours are old' });
});

test('pageOf names the v2 tabs', () => {
  expect(pageOf('/')).toBe('Home');
  expect(pageOf('/hunt/challenge/x')).toBe('Hunt');
  expect(pageOf('/search')).toBe('Search');
  expect(pageOf('/my-space')).toBe('Passport');
  expect(pageOf('/my-space/settings/motion')).toBe('Settings');
});
