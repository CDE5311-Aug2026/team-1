import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { DEFAULT_ONBOARDING, type CultureTopic, type Onboarding } from '../../../data/domain';
import { step } from './Topics';

/** Body + Preview over a local record, so taps re-render like they do in the flow. */
function Harness({ initial, onUpdate }: { initial: CultureTopic[]; onUpdate?: (patch: Partial<Onboarding>) => void }) {
  const [data, setData] = useState<Onboarding>({ ...DEFAULT_ONBOARDING, topics: initial });
  const update = (patch: Partial<Onboarding>) => {
    onUpdate?.(patch);
    setData((d) => ({ ...d, ...patch }));
  };
  const { Body, Preview } = step;
  const props = { data, update, toast: () => {}, next: () => {} };
  return (
    <>
      <Body {...props} />
      {Preview && (
        <section aria-label="Preview">
          <Preview {...props} />
        </section>
      )}
    </>
  );
}

const renderTopics = (initial: CultureTopic[] = [], onUpdate?: (patch: Partial<Onboarding>) => void) =>
  render(<Harness initial={initial} onUpdate={onUpdate} />);

const tiles = () => within(screen.getByRole('group', { name: 'Topics, tap to rank' })).getAllByRole('button');
const labels = () => tiles().map((t) => t.getAttribute('aria-label'));
const tile = (label: string) => tiles().find((t) => t.getAttribute('aria-label')!.startsWith(`${label},`))!;
const preview = () => screen.getByRole('region', { name: 'Preview' });

test('shows the title, helper, four unranked tiles in canvas order and an empty preview', () => {
  renderTopics();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rank the topics you enjoy most');
  expect(screen.getByText('Tap in order. Home shows your #1 first')).toBeInTheDocument();
  expect(labels()).toEqual([
    'Food, not ranked. Tap to rank next',
    'Monuments, not ranked. Tap to rank next',
    'Festivals, not ranked. Tap to rank next',
    'History, not ranked. Tap to rank next',
  ]);
  expect(within(preview()).getByText('PREVIEW · YOUR HOME FEED')).toBeInTheDocument();
  expect(within(preview()).getByText('Tap a topic to start your ranking.')).toBeInTheDocument();
  expect(within(preview()).getByText('Your preview')).toBeInTheDocument();
});

test('taps rank in tap order; the preview leads with #1', async () => {
  const onUpdate = vi.fn();
  renderTopics([], onUpdate);
  await userEvent.click(tile('Festivals'));
  expect(onUpdate).toHaveBeenLastCalledWith({ topics: ['festival'] });
  expect(within(preview()).getByText('Festivals first')).toBeInTheDocument();
  expect(within(preview()).getByText('Keep tapping to rank the rest.')).toBeInTheDocument();
  await userEvent.click(tile('Food'));
  await userEvent.click(tile('History'));
  expect(labels()).toEqual([
    'Food, ranked 2. Tap to remove',
    'Monuments, not ranked. Tap to rank next',
    'Festivals, ranked 1. Tap to remove',
    'History, ranked 3. Tap to remove',
  ]);
  expect(tile('Food')).toHaveTextContent('2');
  expect(within(preview()).getByText('Then Food, History.')).toBeInTheDocument();
  expect(within(preview()).getByText('1')).toBeInTheDocument();
});

test('tapping a ranked tile removes just that one and later ranks shift up', async () => {
  const onUpdate = vi.fn();
  renderTopics(['food', 'festival', 'monument', 'history'], onUpdate);
  await userEvent.click(tile('Festivals'));
  expect(onUpdate).toHaveBeenLastCalledWith({ topics: ['food', 'monument', 'history'] });
  expect(labels()).toEqual([
    'Food, ranked 1. Tap to remove',
    'Monuments, ranked 2. Tap to remove',
    'Festivals, not ranked. Tap to rank next',
    'History, ranked 3. Tap to remove',
  ]);
  // Re-tapping it ranks it last.
  await userEvent.click(tile('Festivals'));
  expect(onUpdate).toHaveBeenLastCalledWith({ topics: ['food', 'monument', 'history', 'festival'] });
});

test('Reset order clears the ranking; it is dimmed but still tappable when nothing is ranked', async () => {
  const onUpdate = vi.fn();
  renderTopics(['history', 'food'], onUpdate);
  const reset = screen.getByRole('button', { name: 'Reset order' });
  expect(reset).toHaveAttribute('data-dim', 'false');
  await userEvent.click(reset);
  expect(onUpdate).toHaveBeenLastCalledWith({ topics: [] });
  expect(labels().every((l) => l!.endsWith('not ranked. Tap to rank next'))).toBe(true);
  expect(reset).toHaveAttribute('data-dim', 'true');
  await userEvent.click(reset);
  expect(onUpdate).toHaveBeenCalledTimes(2);
});

test('needs all four ranked; CTA reads Stamp my passport with the canvas toast', () => {
  expect(step.shell).toBe('question');
  expect(step.ctaLabel).toBe('Stamp my passport');
  expect(step.blockedToast).toBe('Tap all 4 topics to set the order');
  expect(step.answered({ ...DEFAULT_ONBOARDING, topics: ['food', 'monument', 'festival'] })).toBe(false);
  expect(step.answered({ ...DEFAULT_ONBOARDING, topics: ['food', 'monument', 'festival', 'history'] })).toBe(true);
});
