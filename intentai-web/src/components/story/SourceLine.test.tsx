import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { SourceLine } from './SourceLine';

test('page-level source line fades up with its delay', () => {
  render(<SourceLine delay={0.9}>Source: National Heritage Board, Roots.gov.sg</SourceLine>);
  const p = screen.getByText('Source: National Heritage Board, Roots.gov.sg');
  expect(p.tagName).toBe('P');
  expect(p).toHaveClass('a-up');
  expect(p.style.animationDelay).toBe('0.9s');
});

test('without a delay it has no entrance animation', () => {
  render(<SourceLine>Source: berlin.de</SourceLine>);
  expect(screen.getByText('Source: berlin.de')).not.toHaveClass('a-up');
});
