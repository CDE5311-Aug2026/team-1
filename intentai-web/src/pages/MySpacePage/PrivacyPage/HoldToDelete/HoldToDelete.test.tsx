import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import HoldToDelete, { ARM_MS, HOLD_MS } from './HoldToDelete';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

function setup() {
  const onDelete = vi.fn();
  const view = render(<HoldToDelete onDelete={onDelete} />);
  const button = screen.getByRole('button', { name: 'Hold to delete all my data' });
  return { onDelete, button, ...view };
}
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const hide = () => {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
};

test('describes both ways to delete', () => {
  const { button } = setup();
  expect(button).toHaveAccessibleDescription('Press and hold, or press Enter twice');
});

test('holding 1600 ms deletes once', () => {
  const { onDelete, button } = setup();
  fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
  expect(button).toHaveAccessibleName('Keep holding…');
  advance(HOLD_MS);
  fireEvent.pointerUp(button);
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test('releasing early does not delete', () => {
  const { onDelete, button } = setup();
  fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
  advance(800);
  fireEvent.pointerUp(button);
  advance(2000);
  expect(onDelete).not.toHaveBeenCalled();
});

test('pointercancel, hiding the page and unmounting all stop a hold', () => {
  const a = setup();
  fireEvent.pointerDown(a.button, { button: 0, pointerId: 1 });
  advance(800);
  fireEvent.pointerCancel(a.button);
  advance(2000);
  expect(a.onDelete).not.toHaveBeenCalled();
  fireEvent.pointerDown(a.button, { button: 0, pointerId: 1 });
  advance(800);
  hide();
  advance(2000);
  expect(a.onDelete).not.toHaveBeenCalled();
  fireEvent.pointerDown(a.button, { button: 0, pointerId: 1 });
  a.unmount();
  advance(2000);
  expect(a.onDelete).not.toHaveBeenCalled();
});

test('Enter twice deletes; a held (repeat) Enter does not count', () => {
  const { onDelete, button } = setup();
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(button).toHaveAccessibleName('Press again to confirm');
  fireEvent.keyDown(button, { key: 'Enter', repeat: true });
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test('the armed state ends after 5 s and when the page is hidden', () => {
  const { onDelete, button } = setup();
  fireEvent.keyDown(button, { key: 'Enter' });
  advance(ARM_MS + 1);
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(onDelete).not.toHaveBeenCalled();
  hide();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(onDelete).not.toHaveBeenCalled();
});

test('cancelling a pointer gesture also disarms a pending Enter', () => {
  const { onDelete, button } = setup();
  fireEvent.keyDown(button, { key: 'Enter' });
  fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
  fireEvent.pointerCancel(button);
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(onDelete).not.toHaveBeenCalled();
  expect(button).toHaveAccessibleName('Press again to confirm');
  fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
  fireEvent(button, new Event('lostpointercapture', { bubbles: true }));
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(onDelete).not.toHaveBeenCalled();
});

test('assistive-technology clicks (no pointer) arm, then delete; pointer clicks do not count', () => {
  const { onDelete, button } = setup();
  fireEvent.click(button, { detail: 1 });
  expect(button).toHaveAccessibleName('Hold to delete all my data');
  fireEvent.click(button, { detail: 0 });
  expect(button).toHaveAccessibleName('Press again to confirm');
  advance(ARM_MS + 1);
  fireEvent.click(button, { detail: 0 });
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.click(button, { detail: 0 });
  expect(onDelete).toHaveBeenCalledTimes(1);
});
