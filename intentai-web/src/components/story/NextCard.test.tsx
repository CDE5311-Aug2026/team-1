import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { expect, test } from 'vitest';
import { paths, patterns } from '../../routes';
import { NextCard } from './NextCard';

function Card() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <p data-testid="at">{pathname}</p>
      <button type="button" onClick={() => navigate(-1)}>
        history back
      </button>
      {pathname.endsWith('/monument') && <NextCard placeId="berlin-wall-fragments" facet="festival" title="Fall of the Wall · 9 Nov" thumb="balloons.webp" delay={0.66} />}
    </>
  );
}

function renderChain() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.homePlace('berlin-wall-fragments'), paths.placeCard('berlin-wall-fragments', 'monument')]}>
      <Routes>
        <Route path={patterns.homePlace} element={<p data-testid="at">place</p>} />
        <Route path={patterns.placeCard} element={<Card />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('links to the next card with a "NEXT · FACET" kicker and the title', () => {
  renderChain();
  const link = screen.getByRole('link', { name: /NEXT · FESTIVAL.*Fall of the Wall · 9 Nov/ });
  expect(link).toHaveAttribute('href', paths.placeCard('berlin-wall-fragments', 'festival'));
  expect(link).toHaveClass('a-up');
  expect(link.style.animationDelay).toBe('0.66s');
  expect(link.querySelector('img')).toHaveAttribute('alt', '');
});

test('replaces the history entry, so Back returns to whatever opened the chain', async () => {
  renderChain();
  await userEvent.click(screen.getByRole('link', { name: /NEXT · FESTIVAL/ }));
  expect(screen.getByTestId('at')).toHaveTextContent(paths.placeCard('berlin-wall-fragments', 'festival'));
  await userEvent.click(screen.getByRole('button', { name: 'history back' }));
  expect(screen.getByTestId('at')).toHaveTextContent('place');
});
