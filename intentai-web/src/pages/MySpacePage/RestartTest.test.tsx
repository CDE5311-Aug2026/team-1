import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { testerStore, usageUserOf } from '../../data/stores';
import { currentPath, renderAt } from './testUtils';

afterEach(() => {
  testerStore.set({ name: '' });
  vi.restoreAllMocks();
});

test('version A sends /hunt back home', () => {
  testerStore.set({ name: 'P01', version: 'A' });
  renderAt('/hunt');
  expect(currentPath()).toBe('/');
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
  expect(assign).toHaveBeenCalledWith('/');
});

test('version A help never points at the Hunt', async () => {
  const { topicsFor } = await import('../../data/help/guide');
  const a = topicsFor('A');
  expect(a.some((t) => t.path?.startsWith('/hunt'))).toBe(false);
  expect(a.find((t) => t.id === 'start')?.a).not.toMatch(/hunt/i);
});
