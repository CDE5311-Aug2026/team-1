import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { InfoCard } from './InfoCard';

test('a named panel with a mono kicker, an optional aside and its content', () => {
  render(
    <InfoCard label="Visit" kicker="VISIT" aside={<span>Open today until 2:30 pm</span>} delay={0.5} top={12}>
      <p>15 Kent Ridge Dr, #01-03</p>
    </InfoCard>,
  );
  const card = screen.getByRole('region', { name: 'Visit' });
  expect(card).toHaveClass('a-up');
  expect(card.style.animationDelay).toBe('0.5s');
  expect(screen.getByText('VISIT').tagName).toBe('P');
  expect(card).toHaveTextContent('Open today until 2:30 pm');
  expect(card).toHaveTextContent('15 Kent Ridge Dr, #01-03');
});

test('without a delay the card is static; the kicker can animate on its own', () => {
  render(
    <InfoCard label="Look for" kicker="LOOK FOR" kickerDelay={0.7}>
      <ul>
        <li>Dragons on the curved roof ridges</li>
      </ul>
    </InfoCard>,
  );
  expect(screen.getByRole('region', { name: 'Look for' })).not.toHaveClass('a-up');
  const kicker = screen.getByText('LOOK FOR');
  expect(kicker).toHaveClass('a-up');
  expect(kicker.style.animationDelay).toBe('0.7s');
});
