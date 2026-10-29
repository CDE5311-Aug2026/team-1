import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import OnboardingCta from './OnboardingCta';

test('enabled: no aria-disabled, click calls onClick', async () => {
  const onClick = vi.fn();
  render(<OnboardingCta label="Continue" enabled onClick={onClick} />);
  const button = screen.getByRole('button', { name: 'Continue' });
  expect(button).not.toHaveAttribute('aria-disabled');
  await userEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('not enabled: aria-disabled but still tappable, so the flow can explain why', async () => {
  const onClick = vi.fn();
  render(<OnboardingCta label="Continue" enabled={false} onClick={onClick} />);
  const button = screen.getByRole('button', { name: 'Continue' });
  expect(button).toHaveAttribute('aria-disabled', 'true');
  expect(button).not.toBeDisabled();
  await userEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('the button holds only inline content', () => {
  render(<OnboardingCta label="Continue" enabled onClick={() => {}} />);
  const button = screen.getByRole('button');
  expect(button.querySelector('div, p, section, h1, h2, h3, ul, li')).toBeNull();
});
