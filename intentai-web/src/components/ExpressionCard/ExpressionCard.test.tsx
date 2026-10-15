import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import ExpressionCard from './ExpressionCard';
import styles from './ExpressionCard.module.css';
import { dailyExpressions } from '../../data/expressions';

const expressions = dailyExpressions([]);

test('renders title, phonetic, description, context label and fires onDetail', async () => {
  const onDetail = vi.fn();
  render(<ExpressionCard expression={expressions[0]} active onDetail={onDetail} />);

  expect(screen.getByText('Chope')).toBeInTheDocument();
  expect(screen.getByText('/chohp/')).toBeInTheDocument();
  expect(screen.getByText('Save a seat, often with a tissue packet on the table.')).toBeInTheDocument();
  expect(screen.getByText('Hawker centre · lunch')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /detail/i }));
  expect(onDetail).toHaveBeenCalledTimes(1);
});

test('active prop applies the active styling class', () => {
  const { container, rerender } = render(<ExpressionCard expression={expressions[0]} active />);
  expect(container.firstChild).toHaveClass(styles.active);

  rerender(<ExpressionCard expression={expressions[1]} active={false} />);
  expect(container.firstChild).not.toHaveClass(styles.active);
});
