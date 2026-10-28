import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Timeline, type TimelineRow } from './Timeline';

const ROWS: TimelineRow[] = [
  { date: '1961 · 13 AUG', text: 'East Germany begins building the Wall around West Berlin.', dot: 'ring', delay: 0.5, dotDelay: 0.6 },
  {
    date: '1989 · 9 NOV',
    text: 'The crossings open.',
    dot: 'fill',
    delay: 0.75,
    dotDelay: 0.9,
    image: { src: 'wall-1989.webp', alt: 'Crowds on the Wall in front of the Brandenburg Gate, 1989', credit: 'Photo: Lear 21 · CC BY-SA 3.0' },
  },
  {
    date: '2016 · 18 OCT',
    text: 'Two panels are unveiled behind Tembusu College, NUS. You are here.',
    dot: 'here',
    delay: 1.25,
    dotDelay: 1.4,
    thumb: { src: 'panels.webp', alt: 'The two panels at Tembusu College' },
  },
];

test('renders an ordered list of rows, each with a decorative dot, date and text', () => {
  render(<Timeline rows={ROWS} source="Source: berlin.de; Tembusu College, NUS" />);
  const section = screen.getByRole('region', { name: 'Timeline' });
  const items = within(section).getAllByRole('listitem');
  expect(items).toHaveLength(3);
  items.forEach((li, i) => {
    expect(li).toHaveTextContent(ROWS[i].date);
    expect(li).toHaveClass('a-up');
    expect(li.style.animationDelay).toBe(`${ROWS[i].delay}s`);
    const dot = li.querySelector('.a-dot') as HTMLElement;
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot.style.animationDelay).toBe(`${ROWS[i].dotDelay}s`);
    expect(dot).toHaveAttribute('data-dot', ROWS[i].dot);
  });
  expect(section).toHaveTextContent('Source: berlin.de; Tembusu College, NUS');
});

test('the spine is decorative and grows with .a-line', () => {
  const { container } = render(<Timeline rows={ROWS} source="Source" />);
  const spine = container.querySelector('.a-line')!;
  expect(spine).toHaveAttribute('aria-hidden', 'true');
  expect(spine).not.toHaveClass('a-line-long');
});

test('embedded photo with credit, side thumbnail, and the long spine variant', () => {
  const { container } = render(<Timeline rows={ROWS} source="Source" longSpine />);
  expect(screen.getByRole('img', { name: 'Crowds on the Wall in front of the Brandenburg Gate, 1989' })).toBeInTheDocument();
  expect(screen.getByText('Photo: Lear 21 · CC BY-SA 3.0')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'The two panels at Tembusu College' })).toBeInTheDocument();
  expect(container.querySelector('.a-line')).toHaveClass('a-line-long');
});

test('a row can carry extra content (p11 map, chips)', () => {
  render(<Timeline rows={[{ date: 'STREET BY STREET', text: 'Each dialect group settled its own streets.', dot: 'ring', delay: 1, extra: <span>Hokkien · Telok Ayer St</span> }]} source="Source" />);
  expect(screen.getByText('Hokkien · Telok Ayer St')).toBeInTheDocument();
});
