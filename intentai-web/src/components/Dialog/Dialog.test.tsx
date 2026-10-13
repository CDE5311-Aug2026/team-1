import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Dialog from './Dialog';

test('renders a named modal dialog whose close button calls onClose', async () => {
  const onClose = vi.fn();
  render(
    <Dialog title="Can! You did it." onClose={onClose}>
      <p>body</p>
    </Dialog>,
  );
  expect(screen.getByRole('dialog', { name: 'Can! You did it.' })).toHaveTextContent('body');
  await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('returns focus to the opener when it unmounts', () => {
  const opener = document.createElement('button');
  document.body.appendChild(opener);
  opener.focus();
  const { unmount } = render(
    <Dialog title="t" onClose={() => {}}>
      x
    </Dialog>,
  );
  unmount();
  expect(document.activeElement).toBe(opener);
  opener.remove();
});

test('Escape (the dialog cancel event) calls onClose instead of closing natively', () => {
  const onClose = vi.fn();
  render(
    <Dialog title="t" onClose={onClose}>
      x
    </Dialog>,
  );
  const cancel = new Event('cancel', { cancelable: true });
  screen.getByRole('dialog').dispatchEvent(cancel);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(cancel.defaultPrevented).toBe(true);
});

test('focus falls back to main when the opener is gone', () => {
  const main = document.createElement('main');
  main.tabIndex = -1;
  const opener = document.createElement('button');
  main.appendChild(opener);
  document.body.appendChild(main);
  opener.focus();
  const { unmount } = render(
    <Dialog title="t" onClose={() => {}}>
      x
    </Dialog>,
  );
  opener.remove();
  unmount();
  expect(document.activeElement).toBe(main);
  main.remove();
});

test('two dialogs get distinct title ids', () => {
  render(
    <>
      <Dialog title="One" onClose={() => {}}>
        a
      </Dialog>
      <Dialog title="Two" onClose={() => {}}>
        b
      </Dialog>
    </>,
  );
  expect(screen.getByRole('dialog', { name: 'One' })).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Two' })).toBeInTheDocument();
});
