import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import SourceLine from './SourceLine';

test('lists source labels and links the ones with a url in a new tab', () => {
  render(
    <SourceLine
      sources={[{ label: 'UNESCO' }, { label: 'NLB Infopedia', url: 'https://www.nlb.gov.sg/main/article-detail?cmsuuid=x' }]}
    />,
  );
  expect(screen.getByText(/Source:/)).toHaveTextContent('Source: UNESCO · NLB Infopedia');
  const link = screen.getByRole('link', { name: 'NLB Infopedia' });
  expect(link).toHaveAttribute('href', 'https://www.nlb.gov.sg/main/article-detail?cmsuuid=x');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.queryByRole('link', { name: 'UNESCO' })).toBeNull();
});
