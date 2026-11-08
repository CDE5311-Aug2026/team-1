import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import CategoryBadge from './CategoryBadge';
import CategoryChips, { useCategoryParam } from './CategoryChips';

test('chips: All plus the four Tourism 2040 categories, each with a glyph; the picked one is pressed', async () => {
  const onChange = vi.fn();
  const { container } = render(<CategoryChips value="wel" onChange={onChange} counts={{ wel: 3 }} />);
  ['All', 'Attractions', 'Wellness', 'Leisure', 'Cruise'].forEach((l) =>
    expect(screen.getByRole('button', { name: new RegExp(`^${l}`) })).toBeInTheDocument(),
  );
  expect(screen.getByRole('button', { name: /^wellness/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^all/i })).toHaveAttribute('aria-pressed', 'false');
  expect(container.querySelectorAll('[data-glyph]')).toHaveLength(4);
  expect(screen.getByRole('button', { name: /^wellness/i })).toHaveTextContent('3');
  await userEvent.click(screen.getByRole('button', { name: /^cruise/i }));
  expect(onChange).toHaveBeenCalledWith('cru');
});

function Probe() {
  const [cat, setCat] = useCategoryParam();
  const loc = useLocation();
  return (
    <>
      <CategoryChips value={cat} onChange={setCat} />
      <span data-testid="loc">{loc.search}</span>
    </>
  );
}

test('useCategoryParam keeps the pick in ?cat= and ignores unknown values', async () => {
  render(
    <MemoryRouter initialEntries={['/?cat=bogus&x=1']}>
      <Probe />
    </MemoryRouter>,
  );
  expect(screen.getByRole('button', { name: /^all/i })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: /^leisure/i }));
  expect(screen.getByTestId('loc').textContent).toContain('cat=lei');
  await userEvent.click(screen.getByRole('button', { name: /^all/i }));
  expect(screen.getByTestId('loc').textContent).toBe('?x=1');
});

test('badge names the category in text, not colour alone', () => {
  render(<CategoryBadge category="cru" suffix="Place" variant="kicker" />);
  expect(screen.getByText('Cruise')).toBeInTheDocument();
  expect(screen.getByText('· Place')).toBeInTheDocument();
});
