import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import HomeGreeting from './HomeGreeting';

test('date line and greeting with the name', () => {
  render(<HomeGreeting date="Sat 7 Nov" name="W" />);
  expect(screen.getByText('Sat 7 Nov')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'Good morning, W' })).toBeInTheDocument();
});

test('no name reads just "Good morning"', () => {
  render(<HomeGreeting date="Sat 7 Nov" name="" />);
  expect(screen.getByRole('heading', { level: 1, name: 'Good morning' })).toBeInTheDocument();
});

test('each word blurs in after the one before; the h1 can take focus', () => {
  render(<HomeGreeting date="Sat 7 Nov" name="W" />);
  const h1 = screen.getByRole('heading', { level: 1 });
  const words = [...h1.querySelectorAll('.a-blur')] as HTMLElement[];
  expect(words.map((w) => w.textContent)).toEqual(['Good', 'morning,', 'W']);
  expect(words.map((w) => w.style.animationDelay)).toEqual(['0.1s', '0.22s', '0.34s']);
  expect(h1).toHaveAttribute('tabindex', '-1');
});
