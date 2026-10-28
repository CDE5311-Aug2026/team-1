import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { dismissToast } from '../../hooks/useToast';
import { HOME_PLACES, type PlaceProgress } from '../../data/homePlaces';
import { setCarouselGeometry, scrollCarousel } from '../../test/carouselGeometry';
import { setReducedMotion } from '../../test/media';
import AppShell from '../AppShell/AppShell';
import { PARALLAX, PlaceCarousel, nearestCardIndex } from './PlaceCarousel';

const GEOMETRY = { width: 320, cardWidth: 250, gap: 10 };
/** scrollLeft that centres card i under GEOMETRY. */
const leftOf = (i: number) => i * (GEOMETRY.cardWidth + GEOMETRY.gap);
const ids = HOME_PLACES.map((p) => p.id);

let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Wrap({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter useTransitions={false}>
      <AppShell>{children}</AppShell>
    </MemoryRouter>
  );
}

/** jsdom has window.onscrollend; this removes it so the component takes its no-scrollend fallback. */
function withoutScrollEnd(): () => void {
  const desc = Object.getOwnPropertyDescriptor(window, 'onscrollend');
  delete (window as { onscrollend?: unknown }).onscrollend;
  return () => {
    if (desc) Object.defineProperty(window, 'onscrollend', desc);
  };
}

function setup(opts: { selectedId?: string; progress?: PlaceProgress } = {}) {
  const onSelect = vi.fn();
  const onActivate = vi.fn();
  const onOpen = vi.fn();
  const ui = (selectedId: string) => (
    <PlaceCarousel
      places={HOME_PLACES}
      selectedId={selectedId}
      progress={opts.progress ?? {}}
      onSelect={onSelect}
      onActivate={onActivate}
      onOpen={onOpen}
    />
  );
  const view = render(ui(opts.selectedId ?? ids[0]), { wrapper: Wrap });
  const region = screen.getByRole('region', { name: 'Nearby places' });
  const groups = screen.getAllByRole('group');
  const track = groups[0].parentElement as HTMLElement;
  setCarouselGeometry(track, GEOMETRY);
  const select = (id: string) => view.rerender(ui(id));
  return { onSelect, onActivate, onOpen, region, groups, track, select };
}

test('nearestCardIndex picks the card whose centre is closest to the viewport centre', () => {
  const centres = [100, 380, 660];
  expect(nearestCardIndex(0, centres, 300)).toBe(0);
  expect(nearestCardIndex(290, centres, 300)).toBe(1);
  expect(nearestCardIndex(560, centres, 300)).toBe(2);
});

test('PARALLAX is 0.25', () => {
  expect(PARALLAX).toBe(0.25);
});

test('renders a carousel region with one group per place, in order, the first current', () => {
  const { region, groups } = setup();
  expect(region).toHaveAttribute('aria-roledescription', 'carousel');
  expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(HOME_PLACES.map((p) => p.name));
  expect(groups[0]).toHaveAttribute('aria-current', 'true');
  expect(groups[0]).toHaveAttribute('tabindex', '0');
  for (const g of groups.slice(1)) {
    expect(g).not.toHaveAttribute('aria-current');
    expect(g).toHaveAttribute('tabindex', '-1');
  }
});

test('cards with culture cards offer Open; the others offer a disabled-looking Cards soon', () => {
  const { groups } = setup();
  HOME_PLACES.forEach((p, i) => {
    const g = within(groups[i]);
    expect(g.getByText(p.distance)).toBeInTheDocument();
    expect(g.getByText(p.area)).toBeInTheDocument();
    if (p.hasCards) {
      expect(g.getByRole('button', { name: 'Open' })).toBeInTheDocument();
      expect(g.queryByRole('button', { name: 'Cards soon' })).toBeNull();
    } else {
      expect(g.getByRole('button', { name: 'Cards soon' })).toHaveAttribute('aria-disabled', 'true');
      expect(g.queryByRole('button', { name: 'Open' })).toBeNull();
    }
  });
  expect(within(groups[0]).getByRole('button', { name: 'Open' })).toBeInTheDocument();
  expect(within(groups[1]).getByRole('button', { name: 'Open' })).toBeInTheDocument();
});

test('shows opened progress per place', () => {
  const { groups } = setup({ progress: { chinatown: ['food', 'history'] } });
  expect(groups[1]).toHaveTextContent('2 of 4 opened');
  for (const i of [0, 2, 3, 4]) expect(groups[i]).toHaveTextContent('0 of 4 opened');
  const filled = groups[1].querySelectorAll('[data-filled="true"]');
  expect(filled).toHaveLength(2);
});

test('with no progress every card reads 0 of 4 opened', () => {
  const { groups } = setup();
  for (const g of groups) expect(g).toHaveTextContent('0 of 4 opened');
});

test('ArrowRight on the region selects the next place, focuses it and updates the live region', () => {
  const { region, groups, onSelect, select } = setup();
  const focus = vi.spyOn(groups[1], 'focus');
  groups[0].focus();
  fireEvent.keyDown(groups[0], { key: 'ArrowRight' });
  expect(onSelect).toHaveBeenCalledWith('chinatown');
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  select('chinatown');
  expect(within(region).getByText('Chinatown, 2 of 5, 8.4 km')).toHaveAttribute('aria-live', 'polite');
});

test('ArrowLeft selects the previous place; the ends do not wrap', () => {
  const { groups, onSelect, select } = setup();
  fireEvent.keyDown(groups[0], { key: 'ArrowLeft' });
  expect(onSelect).not.toHaveBeenCalled();
  select('chinatown');
  fireEvent.keyDown(groups[1], { key: 'ArrowLeft' });
  expect(onSelect).toHaveBeenCalledWith(ids[0]);
});

test('ArrowRight outside the carousel does nothing', () => {
  const { onSelect } = setup();
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(onSelect).not.toHaveBeenCalled();
});

test('ArrowRight on an Open button is left alone', () => {
  const { groups, onSelect } = setup();
  fireEvent.keyDown(within(groups[0]).getByRole('button', { name: 'Open' }), { key: 'ArrowRight' });
  expect(onSelect).not.toHaveBeenCalled();
});

test('Open calls onOpen with the place id', async () => {
  const user = userEvent.setup();
  const { groups, onOpen, onActivate } = setup();
  await user.click(within(groups[0]).getByRole('button', { name: 'Open' }));
  expect(onOpen).toHaveBeenCalledWith('berlin-wall-fragments');
  expect(onActivate).not.toHaveBeenCalled();
});

test('Cards soon shows a toast and does not open', async () => {
  const user = userEvent.setup();
  const { groups, onOpen, onActivate } = setup();
  await user.click(within(groups[2]).getByRole('button', { name: 'Cards soon' }));
  expect(await screen.findByText(`Culture cards for ${HOME_PLACES[2].name} are coming soon`)).toBeInTheDocument();
  expect(onOpen).not.toHaveBeenCalled();
  expect(onActivate).not.toHaveBeenCalled();
});

test('clicking a card body activates it', async () => {
  const user = userEvent.setup();
  const { groups, onActivate } = setup();
  await user.click(within(groups[3]).getByText(HOME_PLACES[3].name));
  expect(onActivate).toHaveBeenCalledWith(ids[3]);
});

test('Enter and Space on a focused card activate it', async () => {
  const user = userEvent.setup();
  const { groups, onActivate } = setup();
  groups[0].focus();
  await user.keyboard('{Enter}');
  await user.keyboard(' ');
  expect(onActivate).toHaveBeenCalledTimes(2);
  expect(onActivate).toHaveBeenCalledWith(ids[0]);
});

test('Enter and Space on a focused Open button open only', async () => {
  const user = userEvent.setup();
  const { groups, onOpen, onActivate, onSelect } = setup();
  within(groups[0]).getByRole('button', { name: 'Open' }).focus();
  await user.keyboard('{Enter}');
  await user.keyboard(' ');
  expect(onOpen).toHaveBeenCalledTimes(2);
  expect(onActivate).not.toHaveBeenCalled();
  expect(onSelect).not.toHaveBeenCalled();
});

test('Enter and Space on a focused Cards soon button show the toast only', async () => {
  const user = userEvent.setup();
  const { groups, onOpen, onActivate, onSelect } = setup();
  within(groups[2]).getByRole('button', { name: 'Cards soon' }).focus();
  await user.keyboard('{Enter}');
  expect(await screen.findByText(/are coming soon/)).toBeInTheDocument();
  // dismiss so the second press is observable on its own
  act(() => dismissToast());
  expect(screen.queryByText(/are coming soon/)).toBeNull();
  await user.keyboard(' ');
  expect(await screen.findByText(/are coming soon/)).toBeInTheDocument();
  expect(onOpen).not.toHaveBeenCalled();
  expect(onActivate).not.toHaveBeenCalled();
  expect(onSelect).not.toHaveBeenCalled();
});

test('a user swipe that settles on another card selects it', () => {
  const { track, onSelect } = setup();
  act(() => scrollCarousel(track, leftOf(2) + 20));
  expect(onSelect).toHaveBeenCalledWith(ids[2]);
});

test('a settle on the selected card does not call onSelect', () => {
  const { track, onSelect } = setup();
  act(() => scrollCarousel(track, 15));
  expect(onSelect).not.toHaveBeenCalled();
});

test('without scrollend, selection settles 150 ms after the last scroll', () => {
  vi.useFakeTimers();
  const restore = withoutScrollEnd();
  try {
    const { track, onSelect } = setup();
    track.scrollLeft = leftOf(1);
    fireEvent.scroll(track);
    act(() => vi.advanceTimersByTime(100));
    expect(onSelect).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(60));
    expect(onSelect).toHaveBeenCalledWith(ids[1]);
  } finally {
    restore();
    vi.useRealTimers();
  }
});

test('an outside selection scrolls the carousel smoothly and does not echo onSelect', () => {
  const { track, onSelect, select } = setup();
  select(ids[3]);
  expect(scrollTo).toHaveBeenCalledTimes(1);
  expect(scrollTo.mock.contexts[0]).toBe(track);
  expect(scrollTo).toHaveBeenLastCalledWith({ left: leftOf(3), behavior: 'smooth' });
  // the smooth scroll passes card 2 on its way and settles short of the target
  act(() => scrollCarousel(track, leftOf(2)));
  expect(onSelect).not.toHaveBeenCalled();
});

test('under reduced motion the outside selection jumps', () => {
  setReducedMotion(true);
  const { select } = setup();
  select(ids[2]);
  expect(scrollTo).toHaveBeenLastCalledWith({ left: leftOf(2), behavior: 'auto' });
});

test('user input during a programmatic scroll hands the scroll back to the user', () => {
  const { track, onSelect, select } = setup();
  select(ids[2]);
  fireEvent.pointerDown(track);
  act(() => scrollCarousel(track, leftOf(1)));
  expect(onSelect).toHaveBeenCalledWith(ids[1]);
});

test.each(['wheel', 'touchStart', 'keyDown'] as const)('%s also hands the scroll back', (type) => {
  const { track, onSelect, select } = setup();
  select(ids[2]);
  fireEvent[type](track, { key: 'Shift' });
  act(() => scrollCarousel(track, leftOf(1)));
  expect(onSelect).toHaveBeenCalledWith(ids[1]);
});

test('rapid outside selections target the last one, and its settle selects nothing new', () => {
  const { track, onSelect, select } = setup();
  select(ids[1]);
  select(ids[3]);
  expect(scrollTo).toHaveBeenLastCalledWith({ left: leftOf(3), behavior: 'smooth' });
  act(() => scrollCarousel(track, leftOf(3)));
  expect(onSelect).not.toHaveBeenCalled();
});

test('rapid outside selections: a settle passing the earlier target without user input selects nothing', () => {
  const { track, onSelect, select } = setup();
  select(ids[1]);
  select(ids[3]);
  act(() => scrollCarousel(track, leftOf(1)));
  expect(onSelect).not.toHaveBeenCalled();
});

test('the fallback settle waits while a finger or pointer is still down', () => {
  vi.useFakeTimers();
  const restore = withoutScrollEnd();
  try {
    const { track, onSelect } = setup();
    fireEvent.pointerDown(track);
    track.scrollLeft = leftOf(1);
    fireEvent.scroll(track);
    act(() => vi.advanceTimersByTime(160));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.pointerUp(track);
    act(() => vi.advanceTimersByTime(160));
    expect(onSelect).toHaveBeenCalledWith(ids[1]);
  } finally {
    restore();
    vi.useRealTimers();
  }
});

test('touch: the fallback settle waits for touchend', () => {
  vi.useFakeTimers();
  const restore = withoutScrollEnd();
  try {
    const { track, onSelect } = setup();
    fireEvent.touchStart(track);
    track.scrollLeft = leftOf(2);
    fireEvent.scroll(track);
    act(() => vi.advanceTimersByTime(400));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.touchEnd(track);
    act(() => vi.advanceTimersByTime(160));
    expect(onSelect).toHaveBeenCalledWith(ids[2]);
  } finally {
    restore();
    vi.useRealTimers();
  }
});

test('browsers with scrollend do not arm the fallback timer', () => {
  vi.useFakeTimers();
  expect('onscrollend' in window).toBe(true);
  try {
    const { track, onSelect } = setup();
    track.scrollLeft = leftOf(1);
    fireEvent.scroll(track);
    act(() => vi.advanceTimersByTime(500));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent(track, new Event('scrollend'));
    expect(onSelect).toHaveBeenCalledWith(ids[1]);
  } finally {
    vi.useRealTimers();
  }
});

test('the programmatic guard clears after one settle', () => {
  const { track, onSelect, select } = setup();
  select(ids[2]);
  act(() => scrollCarousel(track, leftOf(2)));
  act(() => scrollCarousel(track, leftOf(4)));
  expect(onSelect).toHaveBeenCalledWith(ids[4]);
});

test('does not call scrollTo when the selected card is already centred', () => {
  const { track, select } = setup();
  act(() => scrollCarousel(track, leftOf(1)));
  select(ids[1]);
  expect(scrollTo).not.toHaveBeenCalled();
});

function photos(groups: HTMLElement[]) {
  return groups.map((g) => g.querySelector<HTMLElement>('[data-parallax]'));
}

test('parallax shifts each photo against its offset from the centre', () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 1;
  });
  const { track, groups } = setup();
  act(() => scrollCarousel(track, 100));
  const [p0, p1] = photos(groups);
  // card 0 centre = 160, viewport centre = 100 + 160 = 260 → offset -100
  expect(p0!.style.transform).toBe(`translateX(${100 * PARALLAX}px)`);
  // card 1 centre = 420 → offset 160
  expect(p1!.style.transform).toBe(`translateX(${-160 * PARALLAX}px)`);
});

test('no parallax under reduced motion', () => {
  setReducedMotion(true);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 1;
  });
  const { track, groups } = setup();
  act(() => scrollCarousel(track, 100));
  for (const p of photos(groups)) expect(p!.style.transform).toBe('');
});

test('a place without a photo gets a placeholder', () => {
  const places = HOME_PLACES.map((p, i) => (i === 0 ? { ...p, photo: undefined } : p));
  render(
    <PlaceCarousel
      places={places}
      selectedId={ids[0]}
      progress={{}}
      onSelect={() => {}}
      onActivate={() => {}}
      onOpen={() => {}}
    />,
  );
  const first = screen.getAllByRole('group')[0];
  expect(first.querySelector('img')).toBeNull();
  expect(first.querySelector('[data-parallax]')).not.toBeNull();
});
