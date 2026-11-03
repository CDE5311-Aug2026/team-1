import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { ORDER_GUIDES } from '../../../data/explore/orders';
import { lookupsStore } from '../../../data/stores';
import OrderBuilder from './OrderBuilder';

test('build an order, show it to the stall and save it to Moments', async () => {
  const user = userEvent.setup();
  render(<OrderBuilder guide={ORDER_GUIDES.kopi} />);
  const card = screen.getByRole('region', { name: 'Order kopi like a local' });
  expect(within(within(card).getByRole('group', { name: 'Sugar?' })).queryByRole('button', { name: /Kosong/ })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Auntie' }));
  await user.click(screen.getByRole('button', { name: 'O · black' }));
  await user.click(screen.getByRole('button', { name: 'Kosong · none' }));
  await user.click(screen.getByRole('button', { name: 'Peng · iced' }));
  await user.click(screen.getByRole('button', { name: 'Da bao' }));
  expect(screen.getByRole('button', { name: 'Da bao' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Auntie, kopi O kosong peng, da bao.')).toBeInTheDocument();
  expect(screen.getByText('Black coffee, without sugar, iced, to take away.')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Show the stall' }));
  const dialog = screen.getByRole('dialog', { name: 'My order' });
  expect(dialog).toHaveTextContent('Auntie, kopi O kosong peng, da bao.');
  await user.click(within(dialog).getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Save this order' }));
  expect(lookupsStore.get().some((l) => l.word === 'Auntie, kopi O kosong peng, da bao.')).toBe(true);

  expect(screen.getByRole('link', { name: /Wikipedia, “Kopi \(drink\)”/ })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Kopi_(drink)');
});
