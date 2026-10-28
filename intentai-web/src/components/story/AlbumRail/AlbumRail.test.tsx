import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setReducedMotion } from '../../../test/media';
import { triggerResize } from '../../../test/resizeObserver';
import { AlbumRail, coverStyle, rulerTicks, type RailItem } from './AlbumRail';

const ITEMS: RailItem[] = ['Food', 'Monument', 'Festival', 'History'].map((name, i) => ({
  key: name.toLowerCase(),
  image: `${name}.webp`,
  label: `${name} card: ${name} title`,
  done: i === 2,
  kicker: `${name.toUpperCase()} · ${i + 1} OF 4`,
  title: `${name} title`,
  blurb: `${name} blurb`,
  format: 'Article · Video',
  href: `/place/p/${name.toLowerCase()}`,
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

function renderRail(props: Partial<Parameters<typeof AlbumRail>[0]> = {}) {
  return render(
    <MemoryRouter useTransitions={false}>
      <AlbumRail items={ITEMS} {...props} />
    </MemoryRouter>,
  );
}

const panelTitle = () => screen.getByRole('heading', { level: 2 }).textContent;
const front = () => screen.getByRole('button', { name: /(Tap to slide the record out|Record out)\.$/ });
const stage = () => document.querySelector('[data-rail-stage]') as HTMLElement;
const ruler = () => document.querySelector('[data-rail-ruler]') as HTMLElement;

test('cover maths: centre, neighbours, stacked far items, playing spread', () => {
  expect(coverStyle(0, false)).toEqual({
    transform: 'translateX(0.0px) translateZ(0.0px) rotateY(0.00deg) rotateZ(0.00deg) scale(1.000)',
    zIndex: 50,
    opacity: 1,
  });
  expect(coverStyle(1, false).transform).toBe('translateX(90.5px) translateZ(-60.0px) rotateY(-22.00deg) rotateZ(6.00deg) scale(0.920)');
  expect(coverStyle(-2, false).transform).toBe('translateX(-135.7px) translateZ(-120.0px) rotateY(22.00deg) rotateZ(-12.00deg) scale(0.840)');
  expect(coverStyle(3, false).zIndex).toBe(20);
  expect(coverStyle(3.6, false).opacity).toBe(0);
  expect(coverStyle(1, true).transform).toMatch(/^translateX\(136\.5px\)/);
  expect(coverStyle(-1, true).transform).toMatch(/^translateX\(-116\.5px\)/);
});

test('ruler ticks: 3 per item, majors 16 high, none near the centre', () => {
  const ticks = rulerTicks(0, 3);
  expect(ticks).toHaveLength(10);
  expect(ticks[0]).toMatchObject({ major: true, opacity: 0 });
  expect(ticks[1]).toMatchObject({ major: false, left: 109.25 });
  expect(ticks[3]).toMatchObject({ major: true, left: 129.25 });
  expect(ticks[3].opacity).toBeCloseTo(0.75);
  expect(ticks[9].opacity).toBeCloseTo(0.75 * 0.25);
});

test('4 sleeves, first in front, done badge only on done items, panel for the front card', () => {
  renderRail();
  expect(screen.getByRole('region', { name: 'Album rail: cards for this place. Drag, use the arrows, or tap the front sleeve.' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /card:/ })).toHaveLength(4);
  expect(front()).toHaveAccessibleName('Food card: Food title. Tap to slide the record out.');
  expect(document.querySelectorAll('[data-done]')).toHaveLength(1);
  expect(screen.getByRole('button', { name: /^Festival card/ }).querySelector('[data-done]')).not.toBeNull();
  expect(panelTitle()).toBe('Food title');
  expect(screen.getByText('FOOD · 1 OF 4')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open card' })).toHaveAttribute('href', '/place/p/food');
  expect(screen.getByRole('button', { name: 'Previous card' })).toHaveStyle({ opacity: '0.35' });
});

test('initialIndex opens on that card', () => {
  renderRail({ initialIndex: 3 });
  expect(panelTitle()).toBe('History title');
  expect(screen.getByRole('button', { name: 'Next card' })).toHaveStyle({ opacity: '0.35' });
});

test('Prev / Next and arrow keys step the index and stay in range', () => {
  renderRail();
  const next = screen.getByRole('button', { name: 'Next card' });
  fireEvent.click(next);
  fireEvent.click(next);
  advance(1000);
  expect(panelTitle()).toBe('Festival title');
  for (let i = 0; i < 5; i++) fireEvent.click(next);
  advance(1000);
  expect(panelTitle()).toBe('History title');
  fireEvent.keyDown(front(), { key: 'ArrowLeft' });
  advance(1000);
  expect(panelTitle()).toBe('Festival title');
  fireEvent.keyDown(front(), { key: 'ArrowRight' });
  advance(1000);
  expect(panelTitle()).toBe('History title');
  for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole('button', { name: 'Previous card' }));
  advance(1000);
  expect(panelTitle()).toBe('Food title');
});

test('dragging the stage scrubs to another card', () => {
  renderRail();
  fireEvent.pointerDown(stage(), { clientX: 300 });
  fireEvent.pointerMove(stage(), { clientX: 200 });
  fireEvent.pointerMove(stage(), { clientX: 119 });
  fireEvent.pointerUp(stage(), { clientX: 119 });
  advance(1000);
  expect(panelTitle()).toBe('Festival title');
});

test('a click right after a drag does not toggle the record', () => {
  renderRail();
  fireEvent.pointerDown(stage(), { clientX: 300 });
  fireEvent.pointerMove(stage(), { clientX: 290 });
  fireEvent.pointerUp(stage(), { clientX: 290 });
  fireEvent.click(front(), { detail: 1 });
  expect(screen.getByRole('button', { name: 'Slide the record out' })).toBeInTheDocument();
});

test('tapping the ruler jumps by offset / 30', () => {
  renderRail();
  // Ruler box starts at 0 in jsdom; centre is 100, so x 160 = 2 cards right.
  fireEvent.pointerDown(ruler(), { clientX: 160 });
  fireEvent.pointerUp(ruler(), { clientX: 160 });
  advance(1000);
  expect(panelTitle()).toBe('Festival title');
});

test('dragging the ruler scrubs', () => {
  renderRail({ initialIndex: 3 });
  fireEvent.pointerDown(ruler(), { clientX: 100 });
  fireEvent.pointerMove(ruler(), { clientX: 160 });
  fireEvent.pointerUp(ruler(), { clientX: 160 });
  advance(1000);
  expect(panelTitle()).toBe('Monument title');
});

test('tapping a non-front sleeve brings it to the front', () => {
  renderRail();
  fireEvent.click(screen.getByRole('button', { name: 'History card: History title' }));
  advance(1000);
  expect(panelTitle()).toBe('History title');
  expect(front()).toHaveAccessibleName('History card: History title. Tap to slide the record out.');
});

test('front sleeve and play button toggle the record; changing the front card stops it', () => {
  renderRail();
  fireEvent.click(front());
  expect(front()).toHaveAccessibleName('Food card: Food title. Record out.');
  expect(document.querySelector('.vinyl')).toHaveStyle({ animationPlayState: 'running' });
  const stop = screen.getByRole('button', { name: 'Stop the record' });
  fireEvent.click(stop);
  expect(screen.getByRole('button', { name: 'Slide the record out' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Slide the record out' }));
  expect(front()).toHaveAccessibleName(/Record out\.$/);
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  advance(1000);
  expect(panelTitle()).toBe('Monument title');
  expect(front()).toHaveAccessibleName('Monument card: Monument title. Tap to slide the record out.');
  expect(screen.getByRole('button', { name: 'Slide the record out' })).toBeInTheDocument();
  for (const v of document.querySelectorAll('.vinyl')) expect(v).toHaveStyle({ animationPlayState: 'paused' });
});

test('Open card calls onOpen with the front index and links to the card', () => {
  const onOpen = vi.fn();
  renderRail({ initialIndex: 1, onOpen });
  const link = screen.getByRole('link', { name: 'Open card' });
  expect(link).toHaveAttribute('href', '/place/p/monument');
  fireEvent.click(link);
  expect(onOpen).toHaveBeenCalledWith(1);
});

test('autoplay advances every 4 s and wraps, until the first interaction', () => {
  renderRail({ initialIndex: 2 });
  advance(4500);
  expect(panelTitle()).toBe('History title');
  advance(4500);
  expect(panelTitle()).toBe('Food title');
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  advance(1000);
  expect(panelTitle()).toBe('Monument title');
  advance(20000);
  expect(panelTitle()).toBe('Monument title');
});

test('autoplay pauses while the pointer is over the rail', () => {
  renderRail();
  fireEvent.pointerEnter(stage());
  advance(9000);
  expect(panelTitle()).toBe('Food title');
  fireEvent.pointerLeave(stage());
  advance(4500);
  expect(panelTitle()).toBe('Monument title');
});

test('reduced motion: no autoplay, moves snap with no transition', () => {
  setReducedMotion(true);
  renderRail();
  advance(20000);
  expect(panelTitle()).toBe('Food title');
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  expect(panelTitle()).toBe('Monument title');
  const item = front().parentElement as HTMLElement;
  expect(item.style.transition).toBe('none');
  expect(item.style.transform).toMatch(/^translateX\(0\.0px\)/);
});

test('items are centred on the measured stage width', () => {
  renderRail();
  const item = front().parentElement as HTMLElement;
  expect(item.style.left).toBe('');
  act(() => triggerResize(stage(), { width: 390 }));
  expect(item.style.left).toBe('117px');
  act(() => triggerResize(stage(), { width: 320 }));
  expect(item.style.left).toBe('82px');
});
