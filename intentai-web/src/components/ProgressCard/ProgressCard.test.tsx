import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import ProgressCard from './ProgressCard';
import styles from './ProgressCard.module.css';

test('full variant shows label, filled segments, and fires onStart', async () => {
  const onStart = vi.fn();
  const { container } = render(
    <ProgressCard variant="full" learnedCount={2} total={3} onStart={onStart} />,
  );

  expect(screen.getByText('2 of 3 learned today')).toBeInTheDocument();

  const segments = container.querySelectorAll(`.${styles.segment}`);
  expect(segments).toHaveLength(3);
  expect(segments[0]).toHaveClass(styles.filled);
  expect(segments[1]).toHaveClass(styles.filled);
  expect(segments[2]).not.toHaveClass(styles.filled);

  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  expect(onStart).toHaveBeenCalledTimes(1);
});

test('compact variant has no Start button', () => {
  render(<ProgressCard variant="compact" learnedCount={0} total={3} />);
  expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
});

test('full variant renders the title as the page heading inside the card', () => {
  render(<ProgressCard variant="full" learnedCount={0} total={3} title="Hello" nodeId="1:87" />);
  const heading = screen.getByRole('heading', { level: 1, name: 'Hello' });
  expect(heading.closest('[data-node-id="1:87"]')).not.toBeNull();
});
