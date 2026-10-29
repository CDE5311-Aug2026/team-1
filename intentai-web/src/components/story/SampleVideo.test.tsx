import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setReducedMotion } from '../../test/media';
import { SampleVideo } from './SampleVideo';

const CAPTIONS = [
  'Behind Tembusu College stand two panels of the Berlin Wall.',
  'Each one is about 3.6 metres tall.',
  'They marked 50 years of German–Singapore ties.',
  'The graffiti was on the western face.',
] as const;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderVideo(duration = 108) {
  return render(
    <SampleVideo poster={{ src: 'panels.webp', alt: 'The two Wall panels in the Tembusu College garden' }} title="The panels up close" duration={duration} captions={CAPTIONS} />,
  );
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

test('idle: poster, duration chip, orbit text, play button and title; no controls', () => {
  renderVideo();
  expect(screen.getByRole('region', { name: 'Video' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'The two Wall panels in the Tembusu College garden' })).toHaveClass('kb');
  expect(screen.getByText('1:48')).toBeInTheDocument();
  expect(document.querySelector('textPath')).toHaveTextContent('PLAY · SAMPLE CLIP · 1:48 · WATCH ·');
  expect(screen.getByRole('button', { name: 'Play video: The panels up close' })).toBeInTheDocument();
  expect(screen.getByText('Video · Sample clip · Captions on')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pause video' })).not.toBeInTheDocument();
});

test('play shows the now-playing chip, first caption and controls, and focuses pause', () => {
  renderVideo();
  fireEvent.click(screen.getByRole('button', { name: 'Play video: The panels up close' }));
  const pause = screen.getByRole('button', { name: 'Pause video' });
  expect(pause).toHaveFocus();
  expect(screen.getByText('0:00 / 1:48')).toBeInTheDocument();
  expect(screen.getByText(CAPTIONS[0])).toBeInTheDocument();
  expect(screen.getByText(CAPTIONS[0]).closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  expect(screen.queryByText('Video · Sample clip · Captions on')).not.toBeInTheDocument();
  expect(screen.getByTestId('now-playing')).toHaveTextContent('The panels up close');
});

test('the caption advances every 5 s and loops after the 4th', () => {
  renderVideo();
  fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
  advance(4750);
  expect(screen.getByText(CAPTIONS[0])).toBeInTheDocument();
  advance(250);
  expect(screen.getByText(CAPTIONS[1])).toBeInTheDocument();
  expect(screen.getByText('0:05 / 1:48')).toBeInTheDocument();
  advance(5000);
  expect(screen.getByText(CAPTIONS[2])).toBeInTheDocument();
  advance(5000);
  expect(screen.getByText(CAPTIONS[3])).toBeInTheDocument();
  advance(5000);
  expect(screen.getByText(CAPTIONS[0])).toBeInTheDocument();
});

test('pause returns to idle, keeps the time, and focuses play; play resumes from there', () => {
  renderVideo();
  fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
  advance(7000);
  fireEvent.click(screen.getByRole('button', { name: 'Pause video' }));
  const play = screen.getByRole('button', { name: /Play video/ });
  expect(play).toHaveFocus();
  advance(10000);
  fireEvent.click(play);
  expect(screen.getByText('0:07 / 1:48')).toBeInTheDocument();
  expect(screen.getByText(CAPTIONS[1])).toBeInTheDocument();
});

test('at the duration it stops and resets to 0:00', () => {
  renderVideo(12);
  fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
  advance(11750);
  expect(screen.getByText('0:11 / 0:12')).toBeInTheDocument();
  advance(250);
  expect(screen.queryByRole('button', { name: 'Pause video' })).not.toBeInTheDocument();
  // Focus was on pause, so it lands on play rather than being lost.
  expect(screen.getByRole('button', { name: /Play video/ })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
  expect(screen.getByText('0:00 / 0:12')).toBeInTheDocument();
});

test('progress fill tracks the time', () => {
  renderVideo(100);
  fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
  advance(25000);
  expect(screen.getByTestId('video-progress')).toHaveStyle({ width: '25%' });
});

test('the clock and captions still run under reduced motion', () => {
  setReducedMotion(true);
  renderVideo();
  fireEvent.click(screen.getByRole('button', { name: /Play video/ }));
  advance(5000);
  expect(screen.getByText(CAPTIONS[1])).toBeInTheDocument();
});

function frameOf() {
  return screen.getByTestId('video-frame');
}

test('a mouse pointer tilts the frame and shows the glare; leaving resets', () => {
  renderVideo();
  const frame = frameOf();
  vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.pointerMove(frame, { clientX: 200, clientY: 0, pointerType: 'mouse' });
  expect(frame.style.transform).toBe('rotateX(4deg) rotateY(5deg)');
  expect(screen.getByTestId('video-glare').style.opacity).toBe('1');
  fireEvent.pointerLeave(frame, { pointerType: 'mouse' });
  expect(frame.style.transform).toBe('rotateX(0deg) rotateY(0deg)');
  expect(screen.getByTestId('video-glare').style.opacity).toBe('0');
});

test('touch and reduced motion get no tilt or glare', () => {
  renderVideo();
  const frame = frameOf();
  vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.pointerMove(frame, { clientX: 200, clientY: 0, pointerType: 'touch' });
  expect(frame.style.transform).toBe('rotateX(0deg) rotateY(0deg)');
  act(() => setReducedMotion(true));
  fireEvent.pointerMove(frame, { clientX: 200, clientY: 0, pointerType: 'mouse' });
  expect(frame.style.transform).toBe('rotateX(0deg) rotateY(0deg)');
  expect(screen.getByTestId('video-glare').style.opacity).toBe('0');
});
