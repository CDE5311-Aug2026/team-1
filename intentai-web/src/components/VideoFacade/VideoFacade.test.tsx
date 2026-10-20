import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import type { Video } from '../../data/videos';
import { VIDEOS } from '../../data/videos';
import VideoFacade from './VideoFacade';

const video: Video = {
  youtubeId: 'abc123',
  title: 'Our National Monuments',
  channel: 'Roots Sg',
  length: '1:58',
  sources: [{ label: 'Roots Sg', url: 'https://www.youtube.com/watch?v=abc123' }],
};

test('shows a local poster and loads nothing from YouTube before the tap', () => {
  const { container } = render(<VideoFacade video={video} />);

  expect(container.querySelector('iframe')).toBeNull();
  expect(container.querySelector('img[src^="http"]')).toBeNull();
  expect(screen.getByRole('button', { name: 'Play video: Our National Monuments' })).toBeInTheDocument();
  // One caption line credits the channel and links the source (the video's YouTube page).
  expect(screen.getByText(/Roots Sg · 1:58 ·/)).toHaveTextContent('Roots Sg · 1:58 · Watch on YouTube');
  expect(screen.queryByText(/Source:/)).toBeNull();
  expect(screen.getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc123');
});

test('tapping play swaps in the privacy-mode player with a title', async () => {
  const { container } = render(<VideoFacade video={video} />);

  await userEvent.click(screen.getByRole('button', { name: 'Play video: Our National Monuments' }));

  const frame = container.querySelector('iframe')!;
  expect(frame).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/abc123?autoplay=1');
  expect(frame).toHaveAttribute('title', 'Our National Monuments');
  expect(frame.getAttribute('allow')).not.toContain('clipboard-write');
  expect(screen.queryByRole('button', { name: /Play video/ })).toBeNull();
});

test('every category has a verified official video', () => {
  expect(Object.keys(VIDEOS).sort()).toEqual(['foods', 'history', 'holidays', 'ich', 'monuments', 'unesco']);
  for (const v of Object.values(VIDEOS)) {
    expect(v!.youtubeId).toMatch(/^[\w-]{11}$/);
    expect(v!.sources[0].url).toBe(`https://www.youtube.com/watch?v=${v!.youtubeId}`);
  }
});
