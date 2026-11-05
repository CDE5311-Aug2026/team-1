// In its own file: mounting the game fills its in-memory saves, which would carry into other tests in the same file.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { matchMediaShim } from '../../test/media';
import HuntPage from './HuntPage';

const openStory = () => {
  window.location.hash = '#story/telok-ayer';
  render(
    <MemoryRouter initialEntries={['/hunt#story/telok-ayer']}>
      <Routes>
        <Route path="/hunt" element={<HuntPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
});

test('a story on a phone is a page of its own: no tab bar under it, and Book is the way back', () => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({ ...matchMediaShim(query), matches: /max-width: 760px/.test(query) }));
  openStory();
  expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
  expect(screen.getByRole('button', { name: /Book$/ })).toBeInTheDocument();
});

test('a story on a wide screen keeps the tab bar', () => {
  openStory();
  expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
});
