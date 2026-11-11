import { describe, expect, it } from 'vitest';
import { huntLevel, routeLevel, walkMetres } from './level';
import { CHALLENGES } from './challenges';

describe('huntLevel', () => {
  it('grades by stops, then by walk', () => {
    expect(huntLevel(2)).toBe(1);
    expect(huntLevel(3, 5000)).toBe(1);
    expect(huntLevel(6, 600)).toBe(2);
    expect(huntLevel(7, 1499)).toBe(2);
    expect(huntLevel(7, 1500)).toBe(3);
    expect(huntLevel(8, 0)).toBe(3);
  });

  it('measures the walk pin to pin, skipping stops without one', () => {
    const a = { lat: 1.3, lng: 103.85 };
    const b = { lat: 1.301, lng: 103.85 };
    expect(walkMetres([a, null, b])).toBeGreaterThan(100);
    expect(walkMetres([a])).toBe(0);
    expect(routeLevel([a, b])).toBe(1);
  });

  it('gives every weekend challenge a level from its own stops', () => {
    for (const c of CHALLENGES) expect([1, 2, 3]).toContain(routeLevel(c.stops.map((s) => s.pin)));
  });
});
