import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Toggle from './Toggle';

test('is a named switch that reports the flipped value', async () => {
  const onChange = vi.fn();
  render(<Toggle label="Daily card" checked={false} onChange={onChange} />);
  const toggle = screen.getByRole('switch', { name: 'Daily card' });
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  await userEvent.click(toggle);
  expect(onChange).toHaveBeenCalledWith(true);
});
