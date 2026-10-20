import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { todaysHoliday } from '../../data/holiday';
import HolidayCard from './HolidayCard';

test('tells the user today is the day and opens the detail on Learn more', async () => {
  const onLearnMore = vi.fn();
  render(<HolidayCard holiday={todaysHoliday} onLearnMore={onLearnMore} />);

  // v2: just the date (the title already says "today"), no all-caps label.
  expect(screen.getByText('Sat 7 Nov')).toBeInTheDocument();
  expect(screen.queryByText(/Today ·/)).toBeNull();
  expect(screen.getByRole('heading', { level: 1, name: 'Deepavali long weekend starts today' })).toBeInTheDocument();
  expect(screen.getByText(/falls on Sun 8 Nov/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Learn more' }));
  expect(onLearnMore).toHaveBeenCalledTimes(1);
});
