import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { STORAGE_PREFIX } from './persistentStore';
import { clearGroup, exportJson, formatBytes, isGroupEmpty, storageBytes, useStorageReport } from './storage';
import { deleteAllData, lookupsStore } from './stores';
import { LOCAL_USAGE_EVENT, LOCAL_USAGE_KEY } from '../usage/localLog';

const lookup = { id: 'l1', word: 'shiok', meaning: 'great', source: 'AI-generated' as const };

test('storageBytes sizes each group and the total', () => {
  localStorage.setItem(STORAGE_PREFIX + 'lookups', 'x'.repeat(2000));
  const bytes = storageBytes();
  expect(bytes.ask).toBeGreaterThan(2000);
  expect(bytes.total).toBeGreaterThanOrEqual(bytes.ask);
});

test('formatBytes', () => {
  expect(formatBytes(0)).toBe('0 B');
  expect(formatBytes(812)).toBe('812 B');
  expect(formatBytes(3482)).toBe('3.4 KB');
  expect(formatBytes(1677722)).toBe('1.6 MB');
});

test('exportJson parses every app key and leaves out device ids, the timing log and other keys', () => {
  localStorage.setItem(STORAGE_PREFIX + 'lookups', JSON.stringify([lookup]));
  localStorage.setItem(STORAGE_PREFIX + 'broken', '{not json');
  localStorage.setItem(STORAGE_PREFIX + 'tester', JSON.stringify({ name: 'T1' }));
  localStorage.setItem(LOCAL_USAGE_KEY, '[]');
  localStorage.setItem('other-app', '1');
  const out = JSON.parse(exportJson(new Date('2026-10-29T00:00:00Z')));
  expect(out.format).toBe('intentai-data');
  expect(out.exportedAt).toBe('2026-10-29T00:00:00.000Z');
  expect(out.data.lookups).toEqual([lookup]);
  expect(out.data.broken).toBe('{not json');
  expect(out.data).not.toHaveProperty('tester');
  expect(out.data).not.toHaveProperty('usage-log');
  expect(out.data).not.toHaveProperty('other-app');
});

test('clearGroup empties through the store; undo restores the cached value', () => {
  lookupsStore.set([lookup]);
  const undo = clearGroup('ask');
  expect(lookupsStore.get()).toEqual([]);
  expect(isGroupEmpty('ask')).toBe(true);
  undo();
  expect(lookupsStore.get()).toEqual([lookup]);
  expect(isGroupEmpty('ask')).toBe(false);
});

test('undo after deleting all data writes nothing back', () => {
  lookupsStore.set([lookup]);
  const undo = clearGroup('ask');
  deleteAllData();
  undo();
  expect(lookupsStore.get()).toEqual([]);
});

test('useStorageReport follows clear, undo and the timing log', () => {
  lookupsStore.set([lookup]);
  const { result } = renderHook(() => useStorageReport());
  const before = result.current.bytes.ask;
  let undo = () => {};
  act(() => {
    undo = clearGroup('ask');
  });
  expect(result.current.bytes.ask).toBeLessThan(before);
  expect(result.current.empty.ask).toBe(true);
  act(() => undo());
  expect(result.current.bytes.ask).toBe(before);
  expect(result.current.empty.ask).toBe(false);
  act(() => {
    localStorage.setItem(LOCAL_USAGE_KEY, '[' + '0,'.repeat(500) + '0]');
    window.dispatchEvent(new Event(LOCAL_USAGE_EVENT));
  });
  expect(result.current.bytes.timing).toBeGreaterThan(1000);
});
