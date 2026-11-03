import { expect, test } from 'vitest';
import { ROUTES } from '../../findsg';
import { HUNT_CHALLENGES, HUNT_ROUTE_IDS, rankAmong } from './stories';

test('challenges and Hunt routes are FindSG routes', () => {
  for (const id of HUNT_ROUTE_IDS) expect(ROUTES[id], id).toBeDefined();
  for (const c of HUNT_CHALLENGES) expect(ROUTES[c.routeId], c.id).toBeDefined();
});

test('rank: one more than those ahead', () => {
  const rows = [{ value: 10 }, { value: 7 }, { value: 3 }];
  expect(rankAmong(rows, 8)).toBe(2);
  expect(rankAmong(rows, 11)).toBe(1);
  expect(rankAmong(rows, 5, true)).toBe(2);
});
