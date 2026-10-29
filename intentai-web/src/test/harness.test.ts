import { describe, expect, it, vi } from 'vitest';
import { setReducedMotion } from './media';
import { triggerResize } from './resizeObserver';
import { scrollCarousel, setCarouselGeometry } from './carouselGeometry';

let observed: { el: Element; cb: ReturnType<typeof vi.fn> } | undefined;

describe('browser-API harness', () => {
  it('matchMedia: reduced motion is off by default and can be flipped, notifying listeners', () => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    expect(mq.matches).toBe(false);
    expect(window.matchMedia('(min-width: 1px)').matches).toBe(false);
    expect(mq.matches).toBe(false);
    expect(window.matchMedia('(prefers-reduced-motion: no-preference)').matches).toBe(true);
    const listener = vi.fn();
    mq.addEventListener('change', listener);
    setReducedMotion(true);
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    mq.removeEventListener('change', listener);
    // Left ON on purpose: the next test only passes if beforeEach resets it.
    expect(window.matchMedia('(prefers-reduced-motion: no-preference)').matches).toBe(false);
  });

  it('matchMedia state resets between tests', () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
    expect(window.matchMedia('(prefers-reduced-motion: no-preference)').matches).toBe(true);
  });

  it('scrollTo exists and is spy-able', () => {
    expect(typeof HTMLElement.prototype.scrollTo).toBe('function');
    const spy = vi.spyOn(HTMLElement.prototype, 'scrollTo');
    document.createElement('div').scrollTo({ left: 10 });
    expect(spy).toHaveBeenCalledWith({ left: 10 });
    spy.mockRestore();
  });

  it('ResizeObserver mock calls back for observed elements only', () => {
    const cb = vi.fn();
    const a = document.createElement('div');
    const b = document.createElement('div');
    const ro = new ResizeObserver(cb);
    ro.observe(a);
    triggerResize(b, { height: 5 });
    expect(cb).not.toHaveBeenCalled();
    triggerResize(a, { height: 120 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0][0].target).toBe(a);
    expect(cb.mock.calls[0][0][0].contentRect.height).toBe(120);
    ro.disconnect();
    triggerResize(a, { height: 1 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('triggerResize fills missing rect fields with 0', () => {
    const el = document.createElement('div');
    const cb = vi.fn();
    new ResizeObserver(cb).observe(el);
    observed = { el, cb };
    triggerResize(el, { height: 120 });
    const rect = cb.mock.calls[0][0][0].contentRect;
    expect(rect).toMatchObject({ x: 0, y: 0, width: 0, height: 120, top: 0, left: 0, right: 0, bottom: 0 });
  });

  it('resize observers reset between tests (registers one)', () => {
    const el = document.createElement('div');
    const cb = vi.fn();
    new ResizeObserver(cb).observe(el);
    observed = { el, cb };
  });

  it('resize observers reset between tests (previous observer is gone)', () => {
    triggerResize(observed!.el, { height: 1 });
    expect(observed!.cb).not.toHaveBeenCalled();
  });

  it('carousel geometry and scroll events', () => {
    const c = document.createElement('div');
    for (let i = 0; i < 3; i++) {
      const g = document.createElement('div');
      g.setAttribute('role', 'group');
      c.appendChild(g);
    }
    setCarouselGeometry(c, { width: 400, cardWidth: 300, gap: 10 });
    expect(c.clientWidth).toBe(400);
    const cards = Array.from(c.children) as HTMLElement[];
    expect(cards.map((x) => x.offsetLeft)).toEqual([50, 360, 670]);
    expect(cards[0].offsetWidth).toBe(300);
    const seen: string[] = [];
    c.addEventListener('scroll', () => seen.push('scroll'));
    c.addEventListener('scrollend', () => seen.push('scrollend'));
    scrollCarousel(c, 310);
    expect(c.scrollLeft).toBe(310);
    expect(seen).toEqual(['scroll', 'scrollend']);
  });
});
