import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { todaysHoliday as holiday } from '../../data/holiday';
import { TodayHero } from './TodayHero';

function setup() {
  const onOpenHoliday = vi.fn();
  const onOpenAlso = vi.fn();
  const { container } = render(
    <TodayHero holiday={holiday} onOpenHoliday={onOpenHoliday} onOpenAlso={onOpenAlso} />,
  );
  return { onOpenHoliday, onOpenAlso, container };
}

test('exposes the title as an h2 and two separate, non-nested buttons', () => {
  setup();
  expect(screen.getByRole('heading', { level: 2, name: holiday.cardTitle })).toBeInTheDocument();
  const main = screen.getByRole('button', { name: holiday.cardTitle });
  const row = screen.getByRole('button', { name: new RegExp(holiday.also.title) });
  expect(main).not.toBe(row);
  expect(within(main).queryByRole('button', { name: holiday.also.title })).toBeNull();
});

test('clicking or pressing Enter on the main button opens the holiday only', async () => {
  const user = userEvent.setup();
  const { onOpenHoliday, onOpenAlso } = setup();
  const main = screen.getByRole('button', { name: holiday.cardTitle });
  await user.click(main);
  main.focus();
  await user.keyboard('{Enter}');
  expect(onOpenHoliday).toHaveBeenCalledTimes(2);
  expect(onOpenAlso).not.toHaveBeenCalled();
});

test('Enter on the row opens the place only', async () => {
  const user = userEvent.setup();
  const { onOpenHoliday, onOpenAlso } = setup();
  screen.getByRole('button', { name: new RegExp(holiday.also.title) }).focus();
  await user.keyboard('{Enter}');
  expect(onOpenAlso).toHaveBeenCalledExactlyOnceWith('berlin-wall-fragments');
  expect(onOpenHoliday).not.toHaveBeenCalled();
});

test('shows kicker, body, row kicker; thumb is decorative', () => {
  const { container } = setup();
  expect(screen.getByText(holiday.kicker)).toBeInTheDocument();
  expect(screen.getByText(holiday.cardBody)).toBeInTheDocument();
  expect(screen.getByText(holiday.also.when)).toBeInTheDocument();
  const img = container.querySelector('img');
  expect(img).not.toBeNull();
  expect(img).toHaveAttribute('alt', '');
});
