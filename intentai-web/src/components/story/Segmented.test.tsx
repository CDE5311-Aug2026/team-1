import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { Segmented } from './Segmented';

const OPTIONS = [
  { value: 'then', label: '1890' },
  { value: 'both', label: 'Both' },
  { value: 'now', label: '2006' },
] as const;

function Harness({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('both');
  return (
    <Segmented
      label="Show"
      options={OPTIONS}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

test('is a named radiogroup with one checked radio and a roving tab stop', () => {
  render(<Harness />);
  const group = screen.getByRole('radiogroup', { name: 'Show' });
  const radios = screen.getAllByRole('radio');
  expect(group).toContainElement(radios[0]);
  expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
  expect(radios.map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
});

test('click selects an option', async () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  await userEvent.click(screen.getByRole('radio', { name: '2006' }));
  expect(onChange).toHaveBeenCalledWith('now');
  expect(screen.getByRole('radio', { name: '2006' })).toHaveAttribute('aria-checked', 'true');
});

test('arrow keys move selection and focus, wrapping; Home and End jump', () => {
  render(<Harness />);
  const both = screen.getByRole('radio', { name: 'Both' });
  both.focus();
  fireEvent.keyDown(both, { key: 'ArrowRight' });
  expect(screen.getByRole('radio', { name: '2006' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: '2006' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
  expect(screen.getByRole('radio', { name: '1890' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
  expect(screen.getByRole('radio', { name: '2006' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
  expect(screen.getByRole('radio', { name: 'Both' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.keyDown(document.activeElement!, { key: 'Home' });
  expect(screen.getByRole('radio', { name: '1890' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'End' });
  expect(screen.getByRole('radio', { name: '2006' })).toHaveAttribute('aria-checked', 'true');
});

test('the sliding thumb follows the selection', async () => {
  render(<Harness />);
  expect(screen.getByTestId('segmented-thumb').style.transform).toBe('translateX(100%)');
  await userEvent.click(screen.getByRole('radio', { name: '2006' }));
  expect(screen.getByTestId('segmented-thumb').style.transform).toBe('translateX(200%)');
});
