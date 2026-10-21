import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
import { STORAGE_PREFIX, resetPersistentStores } from '../data/persistentStore';
import { dismissToast } from '../hooks/useToast';
import { resetLocationForTests } from '../features/nearby/location';

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

/** Marks onboarding as finished, so a test that renders "/" lands on Today, not Welcome. */
export const ONBOARDED = JSON.stringify({ done: true, duration: '3 months – 1 year', topics: ['Work', 'Food', 'Daily life', 'Getting around'] });

beforeEach(() => {
  // Server tests run in the node environment (no window, no stores).
  if (typeof window === 'undefined') return;
  window.localStorage.clear();
  // Tests start as a returning user. Onboarding tests remove this key to start fresh.
  window.localStorage.setItem(`${STORAGE_PREFIX}onboarding`, ONBOARDED);
  resetPersistentStores();
  dismissToast();
  resetLocationForTests();
});
