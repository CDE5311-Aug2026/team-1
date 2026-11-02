import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../../App';
import { PASSWORD_KEY } from '../AdminPage/password';
import AbTestPage from './AbTestPage';

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const P01 = { code: 'P01', n: 1, first: 'A', status: 'started', startedAt: 0, updatedAt: 0, tasks: {}, ratings: {}, quick: {}, compare: {} };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method === 'POST'
      ? JSON.parse(String(init.body)).type === 'start'
        ? json(P01)
        : Promise.resolve(new Response(null, { status: 204 }))
      : json({ responses: [{ ...P01, status: 'done', compare: { fun: 1 } }] }),
  );
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('/test opens without the user test name gate', async () => {
  render(
    <MemoryRouter initialEntries={['/test']}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'A/B Test' })).toBeInTheDocument();
});

test('a session starts on A, asks for every task, then saves', async () => {
  render(<AbTestPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Start session' }));
  expect(await screen.findByText('P01')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Begin with phone A' }));
  expect(screen.getByRole('heading', { name: 'Phone A · Explore' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '4 left' }));
  expect(screen.getByRole('heading', { name: 'Phone A · Explore' })).toBeInTheDocument();
  for (const group of screen.getAllByRole('group')) await userEvent.click(group.querySelector('button')!);
  await userEvent.click(screen.getByRole('button', { name: 'Hand over' }));
  expect(screen.getByRole('heading', { name: 'Your experience with A' })).toBeInTheDocument();
  const saves = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST' && JSON.parse(String(init.body)).type === 'save');
  expect(JSON.parse(String(saves[saves.length - 1][1]!.body)).response.tasks.A).toEqual({ t1: 'alone', t2: 'alone', t3: 'alone', t4: 'alone' });
});

test('results ask for the team password and reuse it from /admin', async () => {
  window.history.replaceState(null, '', '/test#results');
  sessionStorage.setItem(PASSWORD_KEY, 'pw');
  render(<AbTestPage />);
  expect(await screen.findByText('1 done · 0 unfinished')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/abtest', { headers: { 'x-admin-password': 'pw' } });
});

test('a wrong password asks again', async () => {
  window.history.replaceState(null, '', '/test#results');
  fetchMock.mockImplementation(() => Promise.resolve(new Response('Wrong password', { status: 401 })));
  render(<AbTestPage />);
  await userEvent.type(screen.getByLabelText('Team password'), 'nope');
  await userEvent.click(screen.getByRole('button', { name: 'Show results' }));
  expect(await screen.findByText('Wrong password.')).toBeInTheDocument();
});
