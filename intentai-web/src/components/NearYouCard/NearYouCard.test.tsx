import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import NearYouCard from './NearYouCard';

test('renders place and subtitle, and fires onOpen when clicked', async () => {
  const onOpen = vi.fn();
  render(<NearYouCard place="Toa Payoh Hawker Centre" subtitle="3 people chope-ing now" onOpen={onOpen} />);

  expect(screen.getByText(/Toa Payoh Hawker Centre/)).toBeInTheDocument();
  expect(screen.getByText('3 people chope-ing now')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button'));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('does not nest block-level <p> elements inside the <button>', () => {
  const { container } = render(<NearYouCard place="Toa Payoh" subtitle="Nearby" />);

  const button = screen.getByRole('button');
  expect(button.querySelector('p')).toBeNull();
  expect(container.querySelectorAll('p')).toHaveLength(0);
});
