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
  renderAt('/hunt');
  expect(screen.getByRole('button', { name: 'Hunt' })).toHaveAttribute('aria-current', 'page');
});

test('v2: Moments has no tab; its journal lives under Passport, so Passport is current there', () => {
  renderAt('/moments');
  expect(screen.queryByRole('button', { name: 'Moments' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Passport' })).toHaveAttribute('aria-current', 'page');
});

test('v2: Search lights the round Search button, not a tab', () => {
  renderAt('/search');
  expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
});

test('non-tab routes keep Home current', () => {
  renderAt('/nearby/saved');
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
        <Route path="/hunt" element={<p>hunt page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Hunt' }));
  expect(screen.getByText('hunt page')).toBeInTheDocument();
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

test('tabPop pops the active tab in; off by default', () => {
  const { unmount } = renderAt('/');
  expect(screen.getByRole('button', { name: 'Home' })).not.toHaveClass('a-pill');
  unmount();
  render(
    <MemoryRouter useTransitions={false}>
      <AppShell tabPop>x</AppShell>
    </MemoryRouter>,
  );
  expect(screen.getByRole('button', { name: 'Home' })).toHaveClass('a-pill');
});

// Owner, 8 Nov 2026: the field archive's chart paper is the app's page background, drawn once behind every shell.
test('the chart paper: one fixed layer under body, shown behind tabbed pages, kept across page changes', () => {
  const layer = () => document.querySelectorAll<HTMLElement>('[data-app-paper]');
  const first = render(
    <MemoryRouter useTransitions={false}>
      <AppShell>home</AppShell>
    </MemoryRouter>,
  );
  expect(layer()).toHaveLength(1);
  const el = layer()[0];
  expect(el.parentElement).toBe(document.body);
  expect(el).not.toHaveAttribute('hidden');
  expect(el.querySelector('[data-chart-paper="archive"]')).not.toBeNull();
  // the shell is clear on the paper; the page never draws a chart of its own
  expect(document.querySelector('[data-paper="chart"]')).not.toBeNull();
  expect(screen.getByRole('main').querySelector('[data-chart-paper]')).toBeNull();
  first.unmount();
  expect(el).toHaveAttribute('hidden');
  // the next page reuses the same layer (painted once), a sub-page without the tab bar too
  const settings = render(
    <MemoryRouter useTransitions={false}>
      <AppShell chrome="status" background="var(--bg-app)">settings</AppShell>
    </MemoryRouter>,
  );
  expect(layer()).toHaveLength(1);
  expect(layer()[0]).toBe(el);
  expect(el).not.toHaveAttribute('hidden');
  settings.unmount();
  // onboarding (no chrome) and a page with its own colour (Hunt's dark desk) keep their own ground
  const onboarding = render(
    <MemoryRouter useTransitions={false}>
      <AppShell chrome="none">welcome</AppShell>
    </MemoryRouter>,
  );
  expect(el).toHaveAttribute('hidden');
  onboarding.unmount();
  render(
    <MemoryRouter useTransitions={false}>
      <AppShell background="#1d1711">desk</AppShell>
    </MemoryRouter>,
  );
  expect(el).toHaveAttribute('hidden');
  expect(document.querySelector('[data-paper="chart"]')).toBeNull();
});
