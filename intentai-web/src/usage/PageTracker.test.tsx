import { act, render } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { expect, test } from 'vitest';
import type { UsageEvent } from './event';
import PageTracker from './PageTracker';
import { createTracker, type TrackerDeps } from './tracker';

function realTracker() {
  let clock = 0;
  const sent: UsageEvent[] = [];
  const deps: TrackerDeps = {
    now: () => clock,
    send: (events) => sent.push(...events),
    uid: () => 'me',
    newId: () => 's1',
    doc: { visibilityState: 'visible', addEventListener: () => {} } as unknown as TrackerDeps['doc'],
    win: { addEventListener: () => {} } as unknown as TrackerDeps['win'],
  };
  return { tracker: createTracker(deps), sent, advance: (ms: number) => (clock += ms) };
}

let go: (to: string) => void = () => {};
function Nav() {
  go = useNavigate();
  return null;
}

function renderAt(path: string, t: ReturnType<typeof realTracker>) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <PageTracker t={t.tracker} />
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

test('one page span per route, stopped on navigation; the redirect from / is not the landing page', () => {
  const t = realTracker();
  renderAt('/', t);
  t.advance(2000);
  act(() => go('/ask'));
  t.advance(3000);
  act(() => go('/admin'));
  t.advance(9000);
  act(() => go('/moments'));
  t.advance(1000);
  act(() => go('/ask'));
  expect(t.sent.map(({ name, ms }) => ({ name, ms }))).toEqual([
    { name: 'Onboarding', ms: 2000 },
    { name: 'Ask', ms: 3000 },
    { name: 'Moments', ms: 1000 },
  ]);
});

test('moving from one question to another is a new visit with the same name', () => {
  const t = realTracker();
  renderAt('/community/a', t);
  t.advance(1000);
  act(() => go('/community/b'));
  t.advance(1000);
  act(() => go('/ask'));
  expect(t.sent.map((e) => e.name)).toEqual(['Community question', 'Community question']);
});
