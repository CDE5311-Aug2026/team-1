import { expect, test } from 'vitest';
import { STORAGE_PREFIX } from './persistentStore';
import { deleteAllData } from './stores';

test('Delete all clears what the old Memory screen stored', () => {
  localStorage.setItem(`${STORAGE_PREFIX}memory`, JSON.stringify({ enabled: true, items: [{ id: 'a', text: 'I am vegetarian' }], forgotten: [] }));
  deleteAllData();
  expect(localStorage.getItem(`${STORAGE_PREFIX}memory`)).toBeNull();
});
