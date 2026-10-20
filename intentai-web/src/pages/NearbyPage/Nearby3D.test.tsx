// The 3D view in Nearby: opened only on request, the position never in the address sent to a server,
// talking to the 3D page only through its own iframe, and removed (memory freed) when the user leaves 3D.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import ExplorePage from './ExplorePage';
import PlaceDetailPage from './PlaceDetailPage';

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path="/nearby" element={<ExplorePage />} />
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

describe('Explore in 3D', () => {
  test('nothing loads until the user picks 3D; then Marina Bay by default, without a pin', async () => {
    renderAt('/nearby');
    expect(frame()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: '3D' }));
    expect(screen.getByTestId('where')).toHaveTextContent('view=3d');
    const f = frame()!;
    expect(f).toHaveAttribute('title', '3D view of Singapore around Marina Bay');
    expect(f.getAttribute('src')).toBe('/earth-online/sg/lite.html#at=1.28680%2C103.85450&pin=0');
    expect(screen.getByText(/Loading 3D… The first time downloads up to 19 MB/)).toBeInTheDocument();
    // back to the 2D map: the iframe (and its memory) is gone
    await userEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(frame()).toBeNull();
  });

  test('an area opens 3D on the area; the point is in the hash only, never in the query', () => {
    renderAt('/nearby?view=3d&area=sg-chinatown');
    const src = frame()!.getAttribute('src')!;
    expect(src).toMatch(/^\/earth-online\/sg\/lite\.html#at=1\.\d{5}%2C103\.\d{5}&pin=0$/);
    expect(new URL(src, 'https://intentai.test').search).toBe('');
  });

  test('a selected place opens its landmark card; selecting another one moves the 3D view instead of reloading', async () => {
    renderAt('/nearby?view=3d&area=sg-marina-bay&sel=curated%3Asg-merlion-park');
    const f = frame()!;
    expect(f.getAttribute('src')).toContain('card=merlion');
    const post = vi.spyOn(f.contentWindow!, 'postMessage');
    fromFrame({ source: 'earth-online-lite', type: 'ready' });
    expect(screen.queryByText(/Loading 3D/)).toBeNull();
    const other = screen.getAllByRole('button', { name: /^(?!Merlion Park$).+/ }).find((b) => b.getAttribute('aria-pressed') === 'false' && b.closest('h3'))!;
    await userEvent.click(other);
    expect(post).toHaveBeenCalledTimes(1);
    const [msg] = post.mock.calls[0];
    expect(msg).toMatchObject({ source: 'intentai', type: 'show' });
    expect((msg as { at: number[] }).at).toHaveLength(2);
    expect(frame()).toBe(f);
    expect(f.getAttribute('src')).toContain('card=merlion');
  });

  test('a card opened inside 3D links to the place; messages from anywhere else are ignored', () => {
    renderAt('/nearby?view=3d');
    fromFrame({ source: 'earth-online-lite', type: 'card', key: 'esplanade' }, window);
    expect(screen.queryByText(/Card open/)).toBeNull();
    fromFrame({ source: 'someone-else', type: 'card', key: 'esplanade' });
    expect(screen.queryByText(/Card open/)).toBeNull();
    fromFrame({ source: 'earth-online-lite', type: 'card', key: 'esplanade' });
    expect(screen.getByText(/Card open: Esplanade/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open place →' })).toHaveAttribute('href', expect.stringMatching(/^\/nearby\/place\/curated%3A/));
    fromFrame({ source: 'earth-online-lite', type: 'card', key: null });
    expect(screen.queryByText(/Card open/)).toBeNull();
    // a key that is not a published place shows nothing (the 3D card itself still has the intro)
    fromFrame({ source: 'earth-online-lite', type: 'card', key: 'sg-no-such-landmark' });
    expect(screen.queryByText(/Card open/)).toBeNull();
  });

  test('full screen covers the app, takes focus and leaves with Esc', async () => {
    renderAt('/nearby?view=3d');
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

describe('Place detail in 3D', () => {
  test('3D replaces the small map on request and opens the landmark card', async () => {
    renderAt('/nearby/place/curated:sg-merlion-park');
    expect(frame()).toBeNull();
    expect(screen.getByText(/up to 19 MB the first time/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '3D' }));
    expect(frame()).toHaveAttribute('title', '3D view around Merlion Park');
    expect(frame()!.getAttribute('src')).toMatch(/#at=1\.\d{5}%2C103\.\d{5}&card=merlion&pin=0$/);
    // the card of the place itself needs no link; another landmark's card links to that place
    fromFrame({ source: 'earth-online-lite', type: 'card', key: 'merlion' });
    expect(screen.queryByText(/Card open/)).toBeNull();
    fromFrame({ source: 'earth-online-lite', type: 'card', key: 'fullerton' });
    expect(screen.getByText(/Card open: The Fullerton Building/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(frame()).toBeNull();
    expect(screen.getByRole('application', { name: 'Map showing Merlion Park' })).toBeInTheDocument();
  });

  test('a place without a model pins its point', async () => {
    renderAt('/nearby/place/curated:sg-maxwell-food-centre');
    await userEvent.click(screen.getByRole('button', { name: '3D' }));
    const src = frame()!.getAttribute('src')!;
    expect(src).toMatch(/^\/earth-online\/sg\/lite\.html#at=1\.\d{5}%2C103\.\d{5}$/);
    expect(src).not.toContain('card=');
  });
});
