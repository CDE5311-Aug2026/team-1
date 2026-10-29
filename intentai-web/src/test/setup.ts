import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
import { STORAGE_PREFIX, resetPersistentStores } from '../data/persistentStore';
import { dismissToast } from '../hooks/useToast';
import { resetLocationForTests } from '../features/nearby/location';
import { matchMediaShim, resetMedia } from './media';
import { COMPLETED_ONBOARDING } from './onboardingFixture';
import { ResizeObserverMock, resetResizeObservers } from './resizeObserver';

// jsdom has <dialog> but not its modal methods.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

// jsdom has no PointerEvent; without it fireEvent.pointer* drops clientX / clientY (drag tests need them).
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventShim extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  (window as unknown as { PointerEvent: typeof PointerEventShim }).PointerEvent = PointerEventShim;
}

// jsdom has no matchMedia, scrollTo or ResizeObserver. Shims stay configurable so tests can vi.spyOn them.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: matchMediaShim });
  }
  if (typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.scrollTo !== 'function') {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      writable: true,
      value: function scrollTo() {},
    });
  }
  if (!('ResizeObserver' in window)) {
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, writable: true, value: ResizeObserverMock });
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;
  }
}

/** Marks onboarding as finished, so a test that renders "/" lands on Today, not the onboarding flow. */
export const ONBOARDED = JSON.stringify(COMPLETED_ONBOARDING);

beforeEach(() => {
  // Server tests run in the node environment (no window, no stores).
  if (typeof window === 'undefined') return;
  window.localStorage.clear();
  // Tests start as a returning user. Onboarding tests remove this key to start fresh.
  window.localStorage.setItem(`${STORAGE_PREFIX}onboarding`, ONBOARDED);
  // ...and past the user test start screen (UserGate.test starts without a test name).
  window.localStorage.setItem(`${STORAGE_PREFIX}tester`, JSON.stringify({ name: 'T01' }));
  resetPersistentStores();
  dismissToast();
  resetLocationForTests();
  resetMedia();
  resetResizeObservers();
});
