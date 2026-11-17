import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { SAMPLE_SPEED } from '../../data/hunt/stories';
import Avatar, { ANIMALS, animalFor } from './Avatar';

test('a name always gets the same animal (trimmed, any case)', () => {
  expect(animalFor('Arjun K.')).toBe(animalFor('Arjun K.'));
  expect(animalFor('  arjun k. ')).toBe(animalFor('Arjun K.'));
  for (const n of ['Mei Ling', 'Siti N.', 'Daniel T.', 'You', '']) expect(ANIMALS).toContain(animalFor(n));
});

test('the podium’s three example players and "You" wear four different animals', () => {
  const names = [...SAMPLE_SPEED.slice(0, 3).map((r) => r.name), 'You'];
  expect(new Set(names.map(animalFor)).size).toBe(4);
});

test('the icon is decorative: an aria-hidden svg with no text, and every animal draws', () => {
  for (const animal of ANIMALS) {
    const { container, unmount } = render(<Avatar name="x" animal={animal} size={26} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('data-animal', animal);
    expect(svg).toHaveAttribute('width', '26');
    expect(svg.childElementCount).toBeGreaterThan(2);
    expect(container.textContent).toBe('');
    unmount();
  }
  const { container } = render(<Avatar name="Farid" />);
  expect(container.querySelector('svg')).toHaveAttribute('data-animal', animalFor('Farid'));
});
