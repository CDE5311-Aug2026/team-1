import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { PHOTOS } from '../options';
import { PreviewCard, PreviewRow } from './PreviewCard';

test('empty row reads "Your preview" with the step hint', () => {
  render(
    <PreviewCard kicker="PREVIEW · HOW CARDS COMPARE" empty>
      <PreviewRow photo={PHOTOS.festival} body="Pick a country to see how cards compare with home." />
    </PreviewCard>,
  );
  expect(screen.getByText('PREVIEW · HOW CARDS COMPARE')).toBeInTheDocument();
  expect(screen.getByText('Your preview')).toBeInTheDocument();
  expect(screen.getByText('Pick a country to see how cards compare with home.')).toBeInTheDocument();
});

test('answered row shows title, chip, badge and an aside', () => {
  render(
    <PreviewCard kicker="PREVIEW · YOUR HOME FEED" empty={false}>
      <PreviewRow photo={PHOTOS.food} title="Food first" chip="Compare with India" badge="1" body="Then History." aside={<span>meter</span>} />
    </PreviewCard>,
  );
  expect(screen.getByText('Food first')).toBeInTheDocument();
  expect(screen.getByText('Compare with India')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.getByText('meter')).toBeInTheDocument();
  expect(screen.queryByText('Your preview')).not.toBeInTheDocument();
});
