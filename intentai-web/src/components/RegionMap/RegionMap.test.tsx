import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import RegionMap, { pinSize, regionCounts, shadeShare, type RegionMapPin } from './RegionMap';
import { REGION_IDS, REGION_PATHS, VIEWBOX, project } from './regionPaths.generated';

const pin = (id: string, category: RegionMapPin['category'], region: RegionMapPin['region'], extra: Partial<RegionMapPin> = {}): RegionMapPin => ({
  id,
  lat: 1.3,
  lng: 103.85,
  category,
  region,
  label: id,
  ...extra,
});

const PINS: RegionMapPin[] = [
  pin('mbs', 'att', 'central', { lat: 1.2838, lng: 103.85941 }),
  pin('gbtb', 'att', 'central'),
  pin('bg', 'wel', 'central'),
  pin('jewel', 'att', 'east', { lat: 1.36022, lng: 103.98975 }),
  pin('ecp', 'wel', 'east'),
  pin('buloh', 'wel', 'north'),
  pin('ubin', 'wel', 'north-east'),
  pin('expo', 'lei', 'east'),
  pin('mbcc', 'cru', 'central'),
  pin('future', 'wel', 'west', { faded: true }),
];

const sizeOf = (c: HTMLElement, id: string) => c.querySelector(`[data-pin="${id}"]`)?.getAttribute('data-size');

describe('generated geometry', () => {
  test('five region paths inside the 346 × 228.3 viewBox, and pins project onto the map', () => {
    expect(VIEWBOX).toEqual({ width: 346, height: 228.3 });
    for (const r of REGION_IDS) {
      const nums = REGION_PATHS[r].match(/-?\d+(\.\d+)?/g)!.map(Number);
      expect(nums.length).toBeGreaterThan(20);
      const xs = nums.filter((_, i) => i % 2 === 0);
      const ys = nums.filter((_, i) => i % 2 === 1);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs)).toBeLessThanOrEqual(346);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(228.3);
    }
    // Marina Bay Sands south of Jewel and west of it
    const mbs = project(1.2838, 103.85941);
    const jewel = project(1.36022, 103.98975);
    expect(mbs.x).toBeLessThan(jewel.x);
    expect(mbs.y).toBeGreaterThan(jewel.y);
  });
});

describe('regionCounts', () => {
  test('derived per region and filter; faded (planned) pins never count', () => {
    expect(regionCounts(PINS, 'all')).toEqual({ central: 4, east: 3, north: 1, 'north-east': 1, west: 0 });
    expect(regionCounts(PINS, 'wel')).toEqual({ central: 1, east: 1, north: 1, 'north-east': 1, west: 0 });
    expect(regionCounts(PINS, 'att')).toEqual({ central: 2, east: 1, north: 0, 'north-east': 0, west: 0 });
    expect(regionCounts([], 'cru')).toEqual({ central: 0, east: 0, north: 0, 'north-east': 0, west: 0 });
  });

  test('chips show the derived counts', () => {
    render(<RegionMap pins={PINS} filter="att" region="central" onRegion={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Central, 2 places' })).toHaveLength(2); // shape + chip
    expect(document.querySelector('button[data-chip="east"]')).toHaveTextContent('East1');
  });
});

describe('pin sizes', () => {
  test('rule: 12 chosen-region match, 10 match elsewhere, 7 filtered out; all → 10 (12 in chosen region)', () => {
    expect(pinSize(PINS[0], 'att', 'central')).toBe(12);
    expect(pinSize(PINS[3], 'att', 'central')).toBe(10);
    expect(pinSize(PINS[2], 'att', 'central')).toBe(7);
    expect(pinSize(PINS[2], 'all', 'central')).toBe(12);
    expect(pinSize(PINS[4], 'all', 'central')).toBe(10);
    expect(pinSize(PINS[4], 'all')).toBe(10);
  });

  test('rendered pins carry their size, filtered-out class and pulse only for the filtered home pins', () => {
    const { container } = render(<RegionMap pins={PINS} filter="att" region="central" />);
    expect(sizeOf(container, 'mbs')).toBe('12');
    expect(sizeOf(container, 'jewel')).toBe('10');
    expect(sizeOf(container, 'bg')).toBe('7');
    const mbs = container.querySelector<HTMLElement>('[data-pin="mbs"]')!;
    expect(mbs.style.width).toBe('12px');
    expect(mbs).toHaveAttribute('data-pulse', 'true');
    expect(container.querySelector('[data-pin="jewel"]')).not.toHaveAttribute('data-pulse');
    const { container: all } = render(<RegionMap pins={PINS} filter="all" region="east" />);
    expect(sizeOf(all, 'jewel')).toBe('12');
    expect(sizeOf(all, 'mbs')).toBe('10');
    expect(all.querySelector('[data-pulse]')).toBeNull();
  });

  test('pins are decorative and placed by projection', () => {
    const { container } = render(<RegionMap pins={PINS} filter="all" />);
    const layer = container.querySelector('[data-pin="mbs"]')!.parentElement!;
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    const { x } = project(1.2838, 103.85941);
    expect(container.querySelector<HTMLElement>('[data-pin="mbs"]')!.style.left).toBe(`${(x / 346) * 100}%`);
  });

  test('faded pins are marked (dashed outline at 60 %) and not counted', () => {
    const { container } = render(<RegionMap pins={PINS} filter="wel" region="west" onRegion={() => {}} />);
    expect(container.querySelector('[data-pin="future"]')).toHaveAttribute('data-faded', 'true');
    expect(container.querySelector('[data-pin="future"]')).not.toHaveAttribute('data-pulse');
    expect(screen.getAllByRole('button', { name: 'West, 0 places', pressed: true })).toHaveLength(2);
  });
});

describe('regions', () => {
  test('tapping a region shape or a chip calls onRegion', async () => {
    const onRegion = vi.fn();
    const { container } = render(<RegionMap pins={PINS} filter="all" region="central" onRegion={onRegion} />);
    await userEvent.click(container.querySelector('path[data-region="east"]')!);
    expect(onRegion).toHaveBeenLastCalledWith('east');
    await userEvent.click(container.querySelector('button[data-chip="north"]')!);
    expect(onRegion).toHaveBeenLastCalledWith('north');
  });

  test('region shapes are focusable buttons operable by Enter and Space', () => {
    const onRegion = vi.fn();
    const { container } = render(<RegionMap pins={PINS} filter="all" region="central" onRegion={onRegion} />);
    const shape = container.querySelector<SVGPathElement>('path[data-region="north-east"]')!;
    expect(shape).toHaveAttribute('role', 'button');
    expect(shape).toHaveAttribute('tabindex', '0');
    expect(shape).toHaveAttribute('aria-pressed', 'false');
    expect(shape).toHaveAttribute('aria-label', 'North-East, 1 place');
    expect(container.querySelector('path[data-region="central"]')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(shape, { key: 'Enter' });
    expect(onRegion).toHaveBeenLastCalledWith('north-east');
    fireEvent.keyDown(container.querySelector('path[data-region="west"]')!, { key: ' ' });
    expect(onRegion).toHaveBeenLastCalledWith('west');
    expect(onRegion).toHaveBeenCalledTimes(2);
  });

  test('read-only map: no region buttons, no chips by default', () => {
    const { container } = render(<RegionMap pins={PINS} filter="all" region="central" ariaLabel="Hunt map" />);
    expect(screen.getByRole('group', { name: 'Hunt map' })).toBeInTheDocument();
    expect(container.querySelector('[role="button"]')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  test('chosen region gets an ink outline drawn above the others', () => {
    const { container } = render(<RegionMap pins={PINS} filter="all" region="east" />);
    expect(container.querySelector('[data-raised="east"] [data-outline="chosen"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-raised]')).toHaveLength(1);
  });

  test('shading only when a category filter is on, scaled 0.1 + 0.4·n/max', () => {
    const { container, rerender } = render(<RegionMap pins={PINS} filter="all" region="central" />);
    expect(container.querySelectorAll('path[data-shaded="true"]')).toHaveLength(0);
    rerender(<RegionMap pins={PINS} filter="att" region="central" />);
    const central = container.querySelector('path[data-region="central"]')!;
    expect(central).toHaveAttribute('data-shaded', 'true');
    expect(central).toHaveAttribute('data-share', '0.500');
    expect(container.querySelector('path[data-region="east"]')).toHaveAttribute('data-share', '0.300');
    expect(container.querySelector('path[data-region="north"]')).toHaveAttribute('data-shaded', 'false');
    // computed-hex fallback in the attribute: 50 % of #e8862a into #fdfaec
    expect(central).toHaveAttribute('fill', '#f3c08b');
    expect(shadeShare(0, 3)).toBe(0);
    expect(shadeShare(3, 3)).toBeCloseTo(0.5);
    expect(shadeShare(1, 4)).toBeCloseTo(0.2);
  });

  test('badges and labels render; legend has a glyph and a label per category', () => {
    const { container } = render(<RegionMap pins={PINS} filter="all" badges={{ central: '14', east: '6' }} />);
    expect(container.querySelector('[data-badge="central"]')).toHaveTextContent('14');
    expect(container.querySelector('[data-badge="west"]')).toBeNull();
    expect(container.querySelectorAll('[data-legend] [data-glyph]')).toHaveLength(4);
    expect(screen.getByRole('list', { name: 'Categories' })).toHaveTextContent('Attractions');
    const { container: none } = render(<RegionMap pins={PINS} filter="all" legend={false} />);
    expect(none.querySelector('[data-legend]')).toBeNull();
  });
});
