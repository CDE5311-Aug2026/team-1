import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import ExpressionCardExpanded from './ExpressionCardExpanded';
import { dailyExpressions } from '../../data/expressions';

const expressions = dailyExpressions([]);

test('renders a real photo when provided and fires onNext', async () => {
  const onNext = vi.fn();
  render(<ExpressionCardExpanded expression={expressions[0]} total={3} current={1} onNext={onNext} />);

  const img = screen.getByTestId('photo-image') as HTMLImageElement;
  expect(img.src).toContain('chope-photo');

  await userEvent.click(screen.getByRole('button', { name: /next/i }));
  expect(onNext).toHaveBeenCalledTimes(1);
});

test('renders a placeholder block (no broken img) when the expression has no photo', () => {
  render(<ExpressionCardExpanded expression={{ ...expressions[1], photo: undefined }} total={3} current={2} onNext={vi.fn()} />);

  expect(screen.queryByTestId('photo-image')).not.toBeInTheDocument();
  expect(screen.getByTestId('photo-placeholder')).toBeInTheDocument();
});
