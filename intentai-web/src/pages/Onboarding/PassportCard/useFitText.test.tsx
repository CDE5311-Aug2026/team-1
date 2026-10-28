import { useRef } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIT_FLOOR, useFitText } from './useFitText';

const BASE = 13;
const CHAR = 1; // content width = chars * fontSize * CHAR

function Probe({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useFitText(ref, text);
  return (
    <span ref={ref} data-testid="t">
      {text}
    </span>
  );
}

function mockWidths(box: number) {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => box });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      const size = parseFloat(this.style.fontSize) || BASE;
      return Math.max(box, (this.textContent ?? '').length * size * CHAR);
    },
  });
}

describe('useFitText', () => {
  beforeEach(() => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize: `${BASE}px` } as CSSStyleDeclaration);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
  });

  it('leaves text that fits at the CSS size', () => {
    mockWidths(100);
    const { getByTestId } = render(<Probe text="Home" />);
    expect(getByTestId('t').style.fontSize).toBe('');
  });

  it('shrinks text that is too wide so it fits', () => {
    mockWidths(150); // 14 chars * 13 = 182 > 150
    const { getByTestId } = render(<Probe text="Fourteen chars" />);
    const size = parseFloat(getByTestId('t').style.fontSize);
    expect(size).toBeLessThan(BASE);
    expect(size).toBeGreaterThanOrEqual(BASE * FIT_FLOOR);
    expect(14 * size).toBeLessThanOrEqual(150);
  });

  it('never goes below the floor', () => {
    mockWidths(40);
    const { getByTestId } = render(<Probe text="A very long value that cannot fit" />);
    expect(parseFloat(getByTestId('t').style.fontSize)).toBeCloseTo(BASE * FIT_FLOOR, 1);
    expect(getByTestId('t').dataset.fitFloor).toBe('');
  });

  it('re-measures when the text changes, and resets when it fits again', () => {
    mockWidths(150);
    const { getByTestId, rerender } = render(<Probe text="Fourteen chars" />);
    const first = parseFloat(getByTestId('t').style.fontSize);
    rerender(<Probe text="Fourteen chars plus more" />);
    expect(parseFloat(getByTestId('t').style.fontSize)).toBeLessThan(first);
    rerender(<Probe text="Short" />);
    expect(getByTestId('t').style.fontSize).toBe('');
  });

  it('does not throw without ResizeObserver', () => {
    mockWidths(100);
    const prev = globalThis.ResizeObserver;
    // @ts-expect-error simulate absence
    delete globalThis.ResizeObserver;
    expect(() => render(<Probe text="Home" />)).not.toThrow();
    globalThis.ResizeObserver = prev;
  });
});
