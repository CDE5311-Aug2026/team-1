import { act, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ScrollKeeper from './ScrollKeeper';

let navigate: ReturnType<typeof useNavigate> = () => undefined;
function Nav() {
  navigate = useNavigate();
  return null;
}

// jsdom does not scroll: scrollTo sets scrollY and says so, as a browser does
const scrollTo = vi.fn((_x: number, y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
});
const scroll = async (y: number) => {
  scrollTo(0, y);
  await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));
};

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('scrollTo', scrollTo);
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  scrollTo.mockClear();
});

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <ScrollKeeper />
      <Nav />
    </MemoryRouter>,
  );

test('a new page opens at its top; Back lands where you were', async () => {
  mount();
  await scroll(900);
  act(() => navigate('/nearby/place/x'));
  expect(window.scrollY).toBe(0);
  act(() => navigate(-1));
  expect(window.scrollY).toBe(900);
});

test('a move within the page (replace) keeps its place for Back, even without another scroll', async () => {
  mount();
  await scroll(751);
  act(() => navigate('/?cat=att', { replace: true }));
  expect(window.scrollY).toBe(751);
  act(() => navigate('/hunt'));
  expect(window.scrollY).toBe(0);
  act(() => navigate(-1));
  expect(window.scrollY).toBe(751);
});
