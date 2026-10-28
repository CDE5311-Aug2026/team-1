import { fireEvent, render, screen, within } from '@testing-library/react';
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
  expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === holiday.kicker)).toBeInTheDocument();
  expect(screen.getByText(holiday.cardBody)).toBeInTheDocument();
  expect(screen.getByText(holiday.also.when)).toBeInTheDocument();
  const img = container.querySelector('img');
  expect(img).not.toBeNull();
  expect(img).toHaveAttribute('alt', '');
});

test('"Long weekend" shimmers; five twinkle dots; all decoration is hidden from assistive tech', () => {
  const { container } = setup();
  expect(screen.getByText('Long weekend')).toHaveClass('shiny');
  const dots = container.querySelectorAll('.tw');
  expect(dots).toHaveLength(5);
  expect([...dots].map((d) => (d as HTMLElement).style.animationDelay)).toEqual(['0.0s', '0.3s', '0.6s', '0.9s', '1.2s']);
  expect(dots[0].parentElement).toHaveAttribute('aria-hidden', 'true');
});

test('the spotlight follows the pointer and rests top right when it leaves', () => {
  setup();
  const card = screen.getByTestId('today-hero');
  card.getBoundingClientRect = () => ({ left: 10, top: 100, right: 360, bottom: 300, width: 350, height: 200, x: 10, y: 100, toJSON() {} }) as DOMRect;
  fireEvent.pointerMove(card, { clientX: 60, clientY: 140 });
  expect(card.style.getPropertyValue('--spot-x')).toBe('50px');
  expect(card.style.getPropertyValue('--spot-y')).toBe('40px');
  fireEvent.pointerLeave(card);
  expect(card.style.getPropertyValue('--spot-x')).toBe('300px');
  expect(card.style.getPropertyValue('--spot-y')).toBe('20px');
});
