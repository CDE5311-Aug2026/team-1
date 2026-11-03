import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { curatedPlace } from '../catalogue';
import PlaceStoryCard from './PlaceStoryCard';

const renderCard = (id: string, distance?: string) =>
  render(
    <MemoryRouter>
      <PlaceStoryCard place={curatedPlace(id)!} distance={distance} />
    </MemoryRouter>,
  );

test('a full card: kicker, heading, Chinese name, clip, key numbers, then and now, text, Look for and sources', () => {
  renderCard('curated:sg-sri-mariamman-temple', '400 m from you');
  expect(screen.getByText('LANDMARK · CHINATOWN & TANJONG PAGAR')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Sri Mariamman Temple, for the goddess of rain and healing');
  expect(screen.getByText('马里安曼兴都庙')).toHaveAttribute('lang', 'zh-Hans');
  expect(screen.getByText(/South Bridge Road · Hindu temple · 400 m from you/)).toBeInTheDocument();
  expect(screen.getByText('A gateway of gods')).toBeInTheDocument();
  const numbers = screen.getByRole('region', { name: 'Key numbers' });
  for (const label of ['wood-and-attap temple', 'oldest brick parts (about)', 'five-tiered gopuram']) expect(within(numbers).getByText(label)).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: 'Compare Sri Mariamman Temple in 1895–1906 and 2023' })).toHaveAttribute('aria-valuetext', '50% of the 1895–1906 photo shown');
  expect(screen.getByText(/founded by Naraina Pillai/)).toBeInTheDocument();
  const look = screen.getByRole('region', { name: 'Look for' });
  expect(within(look).getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByRole('link', { name: /National Heritage Board \(Roots\)/ })).toHaveAttribute(
    'href',
    'https://www.roots.gov.sg/places/places-landing/Places/national-monuments/sri-mariamman-temple',
  );
  expect(screen.getByText(/Photos: KITLV 1404868, 1895–1906 · public domain; Chainwit\. 2023 · CC BY-SA 4\.0/)).toBeInTheDocument();
});

test('sources from one publisher are listed once, with each page', () => {
  renderCard('curated:sg-lee-kong-chian-natural-history');
  expect(screen.getByText(/Lee Kong Chian Natural History Museum:/)).toBeInTheDocument();
  for (const page of ['Our Story', 'Museum History']) expect(screen.getByRole('link', { name: new RegExp(`^${page}`) })).toBeInTheDocument();
});

test('a place without a card still gets the header and its photo, and nothing made up', () => {
  const id = 'curated:sg-gardens-by-the-bay'; // outside the 31 Oct research wave (no card yet)
  renderCard(id);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(curatedPlace(id)!.name);
  expect(screen.getByRole('img', { name: curatedPlace(id)!.name })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Key numbers' })).not.toBeInTheDocument();
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Look for' })).not.toBeInTheDocument();
});

test("Team 1's story pages are gone (31 Oct): no link to them", () => {
  renderCard('curated:sg-lim-chee-guan-new-bridge-road');
  expect(screen.queryByRole('link', { name: /story card/ })).toBeNull();
});
