import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { searchRecentStore } from '../../data/v2Stores';
import SearchPage from './SearchPage';

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search + l.hash}</output>;
}

function renderAt(path: string, entries: string[] = []) {
  return render(
    <MemoryRouter initialEntries={[...entries, path]} initialIndex={entries.length}>
      <Routes>
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<p>elsewhere</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

const field = () => screen.getByRole('searchbox', { name: 'Search places, challenges and volumes' });

describe('Search (board 07)', () => {
  test('the field is focused; typing groups results under category headers with a kicker per row', async () => {
    renderAt('/search');
    expect(field()).toHaveFocus();
    await userEvent.type(field(), 'rain');
    expect(screen.getByTestId('where')).toHaveTextContent('/search?q=rain');
    const results = screen.getByRole('region', { name: 'Results for “rain”' });
    const group = within(results).getByRole('region', { name: /^Attractions/ });
    const link = within(group).getByRole('link', { name: /Rainforest Wild Adventure/ });
    expect(link).toHaveTextContent('Attractions · Place');
    expect(link.getAttribute('href')).toMatch(/^\/nearby\/place\/curated%3A/);
    expect(within(results).getByRole('status')).toHaveTextContent(/\d+ match/);
    // chip counts follow the query; no "hunters"
    expect(screen.getByRole('button', { name: /^Attractions \d+/ })).toBeInTheDocument();
    expect(screen.queryByText(/hunter/i)).toBeNull();
  });

  test('challenges and volumes are found; a challenge links to its volume in Hunt', () => {
    renderAt('/search?q=missing%20years');
    expect(screen.getByRole('link', { name: /Attractions · Volume.*The Missing Years/ })).toHaveAttribute('href', '/hunt#story/civic-f1');
    expect(screen.getByRole('link', { name: /Attractions · Challenge/ })).toHaveAttribute('href', '/hunt#story/civic-f1');
  });

  test('a chip narrows the list (kept in ?cat=); an empty category says so and offers all categories', async () => {
    renderAt('/search?q=rain&cat=cru');
    expect(screen.getByRole('button', { name: /^Cruise/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Nothing matches “rain” in Cruise/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Search all categories' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/search?q=rain');
    expect(screen.getAllByRole('link', { name: /Rainforest/ }).length).toBeGreaterThan(0);
  });

  test('no results at all: a friendly suggestion', () => {
    renderAt('/search?q=zzqx');
    expect(screen.getByText(/Nothing matches “zzqx”/)).toBeInTheDocument();
    expect(screen.getByText(/Try another category/)).toBeInTheDocument();
  });

  test('empty: recent searches (remembered on submit, clear all) and browse by category', async () => {
    renderAt('/search');
    expect(screen.queryByRole('region', { name: 'Recent' })).toBeNull();
    await userEvent.type(field(), 'Sultan Mosque{Enter}');
    expect(searchRecentStore.get()).toEqual(['Sultan Mosque']);
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(field()).toHaveValue('');
    const recent = screen.getByRole('region', { name: 'Recent' });
    await userEvent.click(within(recent).getByRole('button', { name: /Sultan Mosque/ }));
    expect(field()).toHaveValue('Sultan Mosque');
    await userEvent.clear(field());
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(searchRecentStore.get()).toEqual([]);
    const browse = screen.getByRole('region', { name: 'Browse by category' });
    await userEvent.click(within(browse).getByRole('button', { name: /^Wellness/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/search?cat=wel');
    expect(screen.getByRole('region', { name: 'Browse · Wellness' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Show all \d+ in Wellness/ })).toBeInTheDocument();
  });

  test('opening a result remembers the search', async () => {
    renderAt('/search?q=jewel');
    await userEvent.click(screen.getAllByRole('link', { name: /Jewel Changi Airport/ })[0]);
    expect(searchRecentStore.get()).toEqual(['jewel']);
    expect(screen.getByText('elsewhere')).toBeInTheDocument();
  });

  test('Cancel with no browser history goes Home', async () => {
    // (with history, the browser router's own history index is set, and Cancel steps back instead)
    renderAt('/search');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });
});
