import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../../App';
import type { UsageEvent } from '../../usage/event';
import AdminPage, { PASSWORD_KEY } from './AdminPage';

const EVENTS: UsageEvent[] = [
  { uid: 'alice-1234567', sid: 'a1', kind: 'page', name: 'Today', ms: 60_000, at: 1 },
  { uid: 'alice-1234567', sid: 'a1', kind: 'page', name: 'Ask', ms: 120_000, at: 2 },
  { uid: 'alice-1234567', sid: 'a1', kind: 'activity', name: 'Ask › typing', ms: 30_000, at: 3 },
  { uid: 'bob-7654321', sid: 'b1', kind: 'page', name: 'Today', ms: 30_000, at: 4 },
  { uid: 'bob-7654321', sid: 'b1', kind: 'section', name: 'Today › Foods', ms: 20_000, at: 5 },
];

const reply = (status: number, body: unknown) =>
  // A 204 response may not carry a body, not even an empty string.
  Promise.resolve(new Response(status === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body), { status }));
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sessionStorage.clear();
  fetchMock = vi.fn(() => reply(200, { events: EVENTS }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function signIn(password = 'pw') {
  render(<AdminPage />);
  await userEvent.type(screen.getByLabelText('Admin password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Open dashboard' }));
}

const summary = () => screen.getByRole('table', { name: /time per/i });
const rowNames = () =>
  within(summary())
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

test('asks for the password, then shows page times with people, visits and averages', async () => {
  await signIn();
  expect(fetchMock).toHaveBeenCalledWith('/api/stats', expect.objectContaining({ headers: { 'x-admin-password': 'pw' } }));
  expect(sessionStorage.getItem(PASSWORD_KEY)).toBe('pw');
  const today = within(summary()).getByRole('row', { name: /^Today/ });
  // Today: 2 people, 2 visits, 1:30 total, 0:45 per visit, 0:45 per person.
  expect(within(today).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Today', '2', '2', '1:30', '0:45', '0:45']);
  expect(rowNames()).toEqual(['Ask', 'Today']);
  expect(screen.getByText(/^Section and activity time is part of page time\./)).toBeInTheDocument();
});

test('switches between pages, sections and activities', async () => {
  await signIn();
  await userEvent.click(screen.getByRole('button', { name: 'Activities' }));
  expect(rowNames()).toEqual(['Ask › typing']);
  await userEvent.click(screen.getByRole('button', { name: 'Sections' }));
  expect(rowNames()).toEqual(['Today › Foods']);
});

test('sorts by a column header', async () => {
  await signIn();
  await userEvent.click(within(summary()).getByRole('button', { name: 'People' }));
  expect(rowNames()).toEqual(['Today', 'Ask']);
  expect(within(summary()).getByRole('columnheader', { name: 'People' })).toHaveAttribute('aria-sort', 'descending');
});

test('shows landing pages and each person in visit order', async () => {
  await signIn();
  const landing = screen.getByRole('table', { name: 'Landing page' });
  expect(within(landing).getByRole('row', { name: 'Today 2' })).toBeInTheDocument();
  const people = screen.getByRole('table', { name: 'People' });
  expect(within(people).getByRole('row', { name: /^alice-/ })).toHaveTextContent('Today → Ask');
});

test("shows each person's time on each page, following the Pages / Sections / Activities filter", async () => {
  await signIn();
  const grid = () => screen.getByRole('table', { name: 'Person by page' });
  // Columns: most total time first. A dash means the person never opened it.
  expect(within(grid()).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Person', 'Ask', 'Today']);
  expect(within(grid()).getByRole('row', { name: /^alice-/ })).toHaveTextContent('alice-2:001:00');
  expect(within(grid()).getByRole('row', { name: /^bob-76/ })).toHaveTextContent('bob-76–0:30');
  await userEvent.click(screen.getByRole('button', { name: 'Sections' }));
  const sections = screen.getByRole('table', { name: 'Person by Today tab' });
  expect(within(sections).getByRole('row', { name: /^bob-76/ })).toHaveTextContent('bob-760:20');
});

test('a wrong password says so and asks again', async () => {
  fetchMock.mockImplementation(() => reply(401, 'Wrong password'));
  await signIn('nope');
  expect(screen.getByRole('alert')).toHaveTextContent('Wrong password');
  expect(screen.getByLabelText('Admin password')).toBeInTheDocument();
  expect(sessionStorage.getItem(PASSWORD_KEY)).toBeNull();
});

test("shows the server's error when storage is not connected", async () => {
  fetchMock.mockImplementation(() => reply(503, 'Storage not connected. Add Upstash Redis to the Vercel project.'));
  await signIn();
  expect(screen.getByRole('alert')).toHaveTextContent('Storage not connected');
});

test('says when there is no data yet', async () => {
  fetchMock.mockImplementation(() => reply(200, { events: [] }));
  await signIn();
  expect(screen.getByText('No usage data yet.')).toBeInTheDocument();
});

test('Reset needs the in-page confirmation, then deletes and reloads', async () => {
  await signIn();
  await userEvent.click(screen.getByRole('button', { name: 'Reset data' }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await userEvent.click(screen.getByRole('button', { name: 'Reset data' }));
  fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
    init?.method === 'DELETE' ? reply(204, '') : reply(200, { events: [] }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
  expect(fetchMock).toHaveBeenCalledWith('/api/stats', expect.objectContaining({ method: 'DELETE' }));
  expect(await screen.findByText('No usage data yet.')).toBeInTheDocument();
});

test('the app serves the dashboard at /admin instead of redirecting', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/admin']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Usage dashboard' })).toBeInTheDocument();
});
