import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { testerStore, usageUserOf } from '../../data/stores';
import { renderAt } from './testUtils';

afterEach(() => {
  testerStore.set({ name: '' });
  vi.restoreAllMocks();
});

test('version A opens the UI1 copy at the same address', () => {
  const replace = vi.fn();
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, pathname: '/hunt', search: '', hash: '', replace } as Location);
  testerStore.set({ name: 'P01', version: 'A' });
  renderAt('/hunt');
  expect(replace).toHaveBeenCalledWith('/ui1/hunt');
});

test('usage data names the version with the test name', () => {
  expect(usageUserOf({ name: 'P01', version: 'A' })).toBe('P01-A');
  expect(usageUserOf({ name: 'P02' })).toBe('P02-B');
  expect(usageUserOf({ name: '' })).toBeUndefined();
});

test('Restart test asks once, then clears the phone but keeps the usage log', async () => {
  testerStore.set({ name: 'P03', version: 'B' });
  localStorage.setItem('hunt-book', '"x"');
  localStorage.setItem(`${STORAGE_PREFIX}usage-log`, '[]');
  const assign = vi.fn();
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign } as Location);
  renderAt('/my-space/settings');
  await userEvent.click(screen.getByRole('button', { name: /Restart test/ }));
  expect(localStorage.getItem('hunt-book')).toBe('"x"');
  await userEvent.click(screen.getByRole('button', { name: 'Restart' }));
  expect(localStorage.getItem('hunt-book')).toBeNull();
  expect(localStorage.getItem(`${STORAGE_PREFIX}tester`)).toBeNull();
  expect(localStorage.getItem(`${STORAGE_PREFIX}usage-log`)).toBe('[]');
  expect(assign).toHaveBeenCalledWith('/?v=B');
});

test('/restart clears the phone and keeps its version for the next person', () => {
  const assign = vi.fn();
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign } as Location);
  testerStore.set({ name: 'P05', version: 'A' });
  localStorage.setItem('hunt-book', '"x"');
  renderAt('/restart');
  expect(localStorage.getItem('hunt-book')).toBeNull();
  expect(assign).toHaveBeenCalledWith('/?v=A');
});

test('/t4 clears the phone but keeps the test name, then a fresh load writes the prepared profile', async () => {
  const replace = vi.fn();
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, replace } as Location);
  testerStore.set({ name: 'P06', version: 'B' });
  localStorage.setItem('hunt-book', '"x"');
  renderAt('/t4');
  expect(localStorage.getItem('hunt-book')).toBeNull();
  expect(localStorage.getItem(`${STORAGE_PREFIX}tester`)).toContain('P06');
  expect(replace).toHaveBeenCalledWith('/t4?seed=1');
});

test('/t4?seed=1 saves the Balestier remote clue and finishes onboarding', async () => {
  const replace = vi.fn();
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, replace } as Location);
  testerStore.set({ name: 'P06', version: 'B' });
  render(
    <MemoryRouter initialEntries={['/t4?seed=1']}>
      <App />
    </MemoryRouter>,
  );
  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/'), { timeout: 10000 });
  expect(JSON.parse(localStorage.getItem('findsg-onsite-v1:balestier:preview')!).completed).toEqual(['balestier-01']);
  expect(localStorage.getItem('findsg-onsite-mode:balestier')).toBe('preview');
  expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}onboarding`)!).done).toBe(true);
});
