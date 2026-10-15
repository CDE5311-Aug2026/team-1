import { STORAGE_PREFIX } from './data/persistentStore';
import { todayKey } from './data/progress';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import App from './App';

test('default route shows Today with the greeting title', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText("Today's three expressions, Can or cannot learn?")).toBeInTheDocument();
});

test('clicking the Ask tab navigates to the Ask page', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));
  expect(screen.getByRole('heading', { level: 1, name: 'Ask' })).toBeInTheDocument();
});

test('an unknown route redirects to Today instead of rendering blank', () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/this-path-does-not-exist']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText("Today's three expressions, Can or cannot learn?")).toBeInTheDocument();
});

test('completing the stepped flow updates the Today progress card to 3 of 3', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^next$/i }));

  expect(screen.getByText('3 of 3 learned today')).toBeInTheDocument();
});


test('learned progress survives a remount', async () => {
  const first = render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
  first.unmount();

  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText('1 of 3 learned today')).toBeInTheDocument();
});

test('progress stored earlier today is restored', () => {
  localStorage.setItem(`${STORAGE_PREFIX}progress`, JSON.stringify({ date: todayKey(), learnedIds: ['chope', 'paiseh'] }));
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText('2 of 3 learned today')).toBeInTheDocument();
});

test('progress stored for a previous day shows as 0 today', () => {
  localStorage.setItem(`${STORAGE_PREFIX}progress`, JSON.stringify({ date: '2000-01-01', learnedIds: ['chope', 'can-or-not', 'paiseh'] }));
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText('0 of 3 learned today')).toBeInTheDocument();
});
test('repeating the same phrase does not inflate progress', async () => {
  for (let i = 0; i < 3; i += 1) {
    const view = render(
      <MemoryRouter useTransitions={false} initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^next$/i })); // learns Chope only
    view.unmount();
  }
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText('1 of 3 learned today')).toBeInTheDocument();
});
