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
