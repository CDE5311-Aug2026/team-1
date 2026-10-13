import { render } from '@testing-library/react';
import StepProgressBar from './StepProgressBar';
import styles from './StepProgressBar.module.css';

test('renders total bars with current filled', () => {
  const { container } = render(<StepProgressBar total={3} current={1} />);
  const bars = container.querySelectorAll(`.${styles.bar}`);
  expect(bars).toHaveLength(3);
  const filled = container.querySelectorAll(`.${styles.filled}`);
  expect(filled).toHaveLength(1);
  expect(bars[0]).toHaveClass(styles.filled);
  expect(bars[1]).not.toHaveClass(styles.filled);
});
