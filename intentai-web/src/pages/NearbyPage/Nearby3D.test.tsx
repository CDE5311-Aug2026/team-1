// The 3D view on a place page: opened only on request, the position never in the address sent to a server,
// talking to the 3D page only through its own iframe, and removed (memory freed) when the user leaves 3D.
// (The v1 explorer's own 3D view was retired with /nearby on 8 Nov 2026.)
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import PlaceDetailPage from './PlaceDetailPage';

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path="/nearby/place/:placeKey" element={<PlaceDetailPage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

const frame = () => document.querySelector('iframe');
const fromFrame = (data: unknown, source: Window | null = frame()!.contentWindow) =>
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, source }));
  });

describe('Place detail in 3D', () => {
  test('3D replaces the small map on request and opens the landmark card', async () => {
    renderAt('/nearby/place/curated:sg-merlion-park');
    expect(frame()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: '3D' }));
    expect(frame()).toHaveAttribute('title', '3D view around Merlion Park');
    expect(frame()!.getAttribute('src')).toMatch(/#at=1\.\d{5}%2C103\.\d{5}&card=merlion&pin=0&cards=0$/);
    // the card of the place itself needs no link; another landmark's card links to that place
    fromFrame({ source: 'earth-online-lite', type: 'card', key: 'merlion' });
    expect(screen.queryByRole('link', { name: 'Open place →' })).toBeNull();
    fromFrame({ source: 'earth-online-lite', type: 'card', key: 'fullerton' });
    expect(screen.getByText(/^The Fullerton Building .*·/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(frame()).toBeNull();
    expect(screen.getByRole('application', { name: 'Map showing Merlion Park' })).toBeInTheDocument();
  });

  test('a place without a model pins its point', async () => {
    renderAt('/nearby/place/curated:sg-the-spread-nus');
    await userEvent.click(screen.getByRole('button', { name: '3D' }));
    const src = frame()!.getAttribute('src')!;
    expect(src).toMatch(/^\/earth-online\/sg\/lite\.html#at=1\.\d{5}%2C103\.\d{5}&cards=0$/);
    expect(src).not.toContain('card=');
  });

  test('full screen covers the app, takes focus and leaves with Esc', async () => {
    renderAt('/nearby/place/curated:sg-merlion-park');
    await userEvent.click(screen.getByRole('button', { name: '3D' }));
    await userEvent.click(screen.getByRole('button', { name: 'Show the 3D view full screen' }));
    const exit = screen.getByRole('button', { name: /Exit full screen/ });
    expect(exit).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: /Exit full screen/ })).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByRole('button', { name: 'Show the 3D view full screen' })).toHaveFocus();
  });
});
