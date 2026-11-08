import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import type { TourismCategory } from '../../data/tourism';
import HuntModeEditor from './HuntModeEditor';
import TourismRanker, { rankCategory } from './TourismRanker';

test('rankCategory: tap in order, tap again to remove and close up', () => {
  expect(rankCategory([], 'wel')).toEqual(['wel']);
  expect(rankCategory(['wel', 'att', 'cru'], 'att')).toEqual(['wel', 'cru']);
});

function Ranker() {
  const [v, setV] = useState<TourismCategory[]>([]);
  return <TourismRanker value={v} onChange={setV} />;
}

test('the ranker shows four categories by name, numbers taps in order, and Reset clears them', async () => {
  render(<Ranker />);
  await userEvent.click(screen.getByRole('button', { name: 'Leisure' }));
  await userEvent.click(screen.getByRole('button', { name: 'Attractions' }));
  expect(screen.getByRole('button', { name: 'Leisure, ranked 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Attractions, ranked 2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cruise' })).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(screen.getByRole('button', { name: /reset/i }));
  expect(screen.getByRole('button', { name: 'Leisure' })).toHaveAttribute('aria-pressed', 'false');
});

test('hunt mode: two choices, a region map; no location-sharing claim (D5)', async () => {
  const onMode = vi.fn();
  const onRegion = vi.fn();
  render(<HuntModeEditor mode="together" region="central" onMode={onMode} onRegion={onRegion} />);
  expect(screen.getByRole('button', { name: /yes, hunt together/i })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: /not now/i }));
  expect(onMode).toHaveBeenCalledWith('solo');
  expect(screen.getByRole('group', { name: 'Hunt region map' })).toBeInTheDocument();
  expect(screen.getByText(/hunting in central/i)).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/location is shared/i);
});
