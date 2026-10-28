import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { SourceLine } from './SourceLine';
import { StoryArticle } from './StoryArticle';

function renderArticle() {
  return render(
    <StoryArticle
      lead="Behind Tembusu College stand two concrete panels from the Berlin Wall."
      more={['German businessman Elmar Prost and his company gave them to Singapore.', 'Look at the paint.']}
    >
      <SourceLine inArticle delay={0.6}>Source: Tembusu College, NUS</SourceLine>
    </StoryArticle>,
  );
}

test('shows the lead; the rest sits in a native details element', () => {
  const { container } = renderArticle();
  expect(screen.getByText(/two concrete panels/)).toBeVisible();
  const details = container.querySelector('details')!;
  expect(details).not.toHaveAttribute('open');
  expect(details).toHaveTextContent('Look at the paint.');
});

test('Read more toggles to Show less and back', async () => {
  const { container } = renderArticle();
  const summary = container.querySelector('summary')!;
  expect(summary).toHaveTextContent('Read more');
  await userEvent.click(summary);
  expect(container.querySelector('details')).toHaveAttribute('open');
  expect(summary).toHaveTextContent('Show less');
  await userEvent.click(summary);
  expect(container.querySelector('details')).not.toHaveAttribute('open');
  expect(summary).toHaveTextContent('Read more');
});

test('children render after the details (source line)', () => {
  renderArticle();
  const source = screen.getByText('Source: Tembusu College, NUS');
  expect(source.tagName).toBe('P');
  expect(source).toHaveClass('a-up');
  expect(source.style.animationDelay).toBe('0.6s');
});
