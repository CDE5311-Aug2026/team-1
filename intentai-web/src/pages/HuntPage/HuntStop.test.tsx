// A stop as a page of its book. In a file of its own: mounting the game fills FindSG's in-memory progress for the whole file.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import HuntPage from './HuntPage';

const at = (url: string) =>
  render(
    <MemoryRouter useTransitions={false} initialEntries={[url]}>
      <Routes>
        <Route path="/hunt" element={<HuntPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('a stop as a page of its book', () => {
  const phoneOr = (phone: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: phone && query === '(max-width: 760px)', addEventListener() {}, removeEventListener() {} }));
  const tabs = () =>
    within(screen.getByRole('navigation', { name: 'Chapters' }))
      .getAllByRole('button')
      .map((b) => b.textContent);
  beforeEach(() => {
    sessionStorage.clear();
    // FindSG reads the page's own hash
    window.location.hash = '#story/telok-ayer';
  });
  afterEach(() => vi.unstubAllGlobals());

  test('on a phone, Clues leaves the tabs and every other tab still opens its own page of the book', async () => {
    phoneOr(true);
    at('/hunt#story/telok-ayer');
    expect(tabs()).toEqual(['Story', 'Map', 'Notes', 'Record', 'Play']);
    await userEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(sessionStorage.getItem('hunt-page-telok-ayer')).toBe('3');
    expect(sessionStorage.getItem('hunt-book')).toBe('telok-ayer');
  });

  test('on a phone, Record opens page 4', async () => {
    phoneOr(true);
    at('/hunt#story/telok-ayer');
    await userEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(sessionStorage.getItem('hunt-page-telok-ayer')).toBe('4');
  });

  test('on a phone, back goes to this story’s book at its saved page, even with another book saved', async () => {
    phoneOr(true);
    sessionStorage.setItem('hunt-book', 'balestier');
    sessionStorage.setItem('hunt-page-telok-ayer', '1');
    at('/hunt#story/telok-ayer');
    await userEvent.click(screen.getByRole('button', { name: /Book$/ }));
    expect(sessionStorage.getItem('hunt-book')).toBe('telok-ayer');
    expect(sessionStorage.getItem('hunt-page-telok-ayer')).toBe('1');
  });

  test('on a wide screen, the Clues tab stays and back goes to the shelf', async () => {
    phoneOr(false);
    sessionStorage.setItem('hunt-book', 'telok-ayer');
    at('/hunt#story/telok-ayer');
    expect(tabs()).toEqual(['Story', 'Map', 'Clues', 'Notes', 'Record', 'Play']);
    await userEvent.click(screen.getByRole('button', { name: /Shelf$/ }));
    expect(sessionStorage.getItem('hunt-book')).toBeNull();
  });
});
