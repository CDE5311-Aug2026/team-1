import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { showToast } from '../../hooks/useToast';
import AppShell from './AppShell';

function renderAt(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<AppShell><p>content</p></AppShell>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('renders children inside main with the primary tab bar', () => {
  renderAt('/');
  expect(screen.getByRole('main')).toHaveTextContent('content');
  expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
});

test('marks the tab matching the current path as current', () => {
  renderAt('/moments');
  expect(screen.getByRole('button', { name: 'Moments' })).toHaveAttribute('aria-current', 'page');
});

test('non-tab routes keep Today current', () => {
  renderAt('/nearby');
  expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
});

test('keeps the status live region mounted and shows the global toast with Undo', async () => {
  const undo = vi.fn();
  render(
    <MemoryRouter useTransitions={false}>
      <AppShell>x</AppShell>
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  act(() => showToast('Lookup deleted', { undo }));
  expect(screen.getByRole('status')).toHaveTextContent('Lookup deleted');
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(undo).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

test('clicking a tab navigates', async () => {
  render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<AppShell>home</AppShell>} />
        <Route path="/ask" element={<p>ask page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
  expect(screen.getByText('ask page')).toBeInTheDocument();
});

test('only matches a tab on a whole path segment', () => {
  renderAt('/ask-foo');
  expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
});

test('chrome="none" renders content without tab bar', () => {
  render(
    <MemoryRouter useTransitions={false}>
      <AppShell chrome="none">onboarding</AppShell>
    </MemoryRouter>,
  );
  expect(screen.getByRole('main')).toHaveTextContent('onboarding');
  expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
});

test('chrome="status" keeps the status bar but drops the tab bar', () => {
  render(
    <MemoryRouter useTransitions={false}>
      <AppShell chrome="status">edit</AppShell>
    </MemoryRouter>,
  );
  expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveTextContent('edit');
});

test('variant="story" has no tab bar and marks the page for story styling', () => {
  render(
    <MemoryRouter useTransitions={false}>
      <AppShell variant="story">story</AppShell>
    </MemoryRouter>,
  );
  expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveAttribute('data-variant', 'story');
  expect(screen.getByRole('main')).toHaveTextContent('story');
});

test('the default variant has no data-variant attribute', () => {
  renderAt('/');
  expect(screen.getByRole('main')).not.toHaveAttribute('data-variant');
});
