import { useSyncExternalStore } from 'react';

// One app-wide toast, so a message raised just before navigating ("Question withdrawn", Undo)
// is still shown on the next page. AppShell renders it; pages only call showToast.

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

export const TOAST_MS = 3000;
/** Undo toasts stay longer so the action is reachable (WCAG 2.2.1 timing). */
export const UNDO_TOAST_MS = 10000;

let current: Toast | null = null;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

/** Shows a toast and returns its id (pass it to dismissToast to close only this one). */
export function showToast(message: string, options: { undo?: () => void } = {}): number {
  if (timer !== undefined) clearTimeout(timer);
  current = { id: nextId++, message, undo: options.undo };
  timer = setTimeout(() => dismissToast(), options.undo ? UNDO_TOAST_MS : TOAST_MS);
  emit();
  return current.id;
}

/** Closes the toast; with an id, only if that toast is still the one showing. */
export function dismissToast(id?: number) {
  if (id !== undefined && current?.id !== id) return;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  if (current === null) return;
  current = null;
  emit();
}

/** Runs the toast's undo action (if any) and closes it. */
export function undoToast() {
  const undo = current?.undo;
  dismissToast();
  undo?.();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useToastState(): Toast | null {
  return useSyncExternalStore(subscribe, () => current);
}
