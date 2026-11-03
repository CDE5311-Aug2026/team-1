import { afterEach, describe, expect, it } from 'vitest';
import { lockScroll, releaseStrayScrollLock } from './scrollLock';

const state = () => [document.documentElement.style.overflow, document.body.style.overflow];

describe('scrollLock', () => {
  afterEach(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  it('frees the page when nested layers close outer-first', () => {
    const outer = lockScroll();
    const inner = lockScroll();
    expect(state()).toEqual(['hidden', 'hidden']);
    outer(); // React runs a parent's cleanup before its child's
    expect(state()).toEqual(['hidden', 'hidden']);
    inner();
    expect(state()).toEqual(['', '']);
  });

  it('ignores a second release', () => {
    const a = lockScroll();
    const b = lockScroll();
    a();
    a();
    expect(state()).toEqual(['hidden', 'hidden']);
    b();
    expect(state()).toEqual(['', '']);
  });

  it('clears a stray lock only when nothing holds one', () => {
    document.body.style.overflow = 'hidden';
    releaseStrayScrollLock();
    expect(state()).toEqual(['', '']);
    const held = lockScroll();
    releaseStrayScrollLock();
    expect(state()).toEqual(['hidden', 'hidden']);
    held();
  });
});
