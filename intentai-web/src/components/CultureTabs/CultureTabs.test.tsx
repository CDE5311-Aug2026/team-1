import { render as rtlRender, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import type { CategoryId } from '../../data/culture';
import { VIDEOS } from '../../data/videos';
import CultureTabs from './CultureTabs';

// the cards link to Nearby, so they render inside a router
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });

const TABS: CategoryId[] = ['foods', 'monuments', 'unesco'];

test('shows the three default tabs with Foods selected, leading with its top choice', () => {
  render(<CultureTabs categories={TABS} />);

  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Foods', 'Monuments', 'UNESCO']);
  expect(screen.getByRole('tab', { name: 'Foods' })).toHaveAttribute('aria-selected', 'true');
  const panel = screen.getByRole('tabpanel', { name: 'Foods' });
  expect(within(panel).getByText('Iconic dishes and where they come from')).toBeInTheDocument();
  expect(within(panel).getByRole('heading', { name: 'Hainanese chicken rice' })).toBeInTheDocument();
});

test('clicking a tab switches the panel', async () => {
  render(<CultureTabs categories={TABS} />);

  await userEvent.click(screen.getByRole('tab', { name: 'UNESCO' }));

  expect(screen.getByRole('tab', { name: 'UNESCO' })).toHaveAttribute('aria-selected', 'true');
  const panel = screen.getByRole('tabpanel', { name: 'UNESCO' });
  expect(within(panel).getByRole('heading', { name: 'Hawker culture' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Hainanese chicken rice' })).not.toBeInTheDocument();
});

test('arrow keys move between tabs and wrap; only the selected tab is in the tab order', async () => {
  render(<CultureTabs categories={TABS} />);
  const foods = screen.getByRole('tab', { name: 'Foods' });
  expect(screen.getByRole('tab', { name: 'Monuments' })).toHaveAttribute('tabindex', '-1');

  foods.focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(screen.getByRole('tab', { name: 'Monuments' })).toHaveFocus();
  expect(screen.getByRole('tab', { name: 'Monuments' })).toHaveAttribute('aria-selected', 'true');

  await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
  expect(screen.getByRole('tab', { name: 'UNESCO' })).toHaveFocus();

  await userEvent.keyboard('{Home}');
  expect(foods).toHaveFocus();
  await userEvent.keyboard('{End}');
  expect(screen.getByRole('tab', { name: 'UNESCO' })).toHaveFocus();
});

test('quick facts show first; Read more reveals the deeper read and Show less hides it', async () => {
  render(<CultureTabs categories={TABS} />);
  const article = screen.getByRole('article', { name: 'Hainanese chicken rice' });

  expect(within(article).getByText(/Grew out of Wenchang chicken/)).toBeInTheDocument();
  expect(within(article).queryByText(/Hainanese immigrants arrived/)).not.toBeInTheDocument();

  const more = within(article).getByRole('button', { name: 'Read more' });
  expect(more).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(more);

  expect(within(article).getByText(/Hainanese immigrants arrived/)).toBeInTheDocument();
  expect(within(article).getByText(/Source:/)).toBeInTheDocument();
  const less = within(article).getByRole('button', { name: 'Show less' });
  expect(less).toHaveAttribute('aria-expanded', 'true');
  await userEvent.click(less);
  expect(within(article).queryByText(/Hainanese immigrants arrived/)).not.toBeInTheDocument();
});

test("every tab leads with its category's short video, short articles below", async () => {
  render(<CultureTabs categories={TABS} />);
  const panel = screen.getByRole('tabpanel', { name: 'Foods' });
  expect(within(panel).getByRole('button', { name: `Play video: ${VIDEOS.foods!.title}` })).toBeInTheDocument();
  expect(within(panel).getByRole('heading', { name: 'Hainanese chicken rice' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: 'UNESCO' }));
  expect(screen.getByRole('button', { name: `Play video: ${VIDEOS.unesco!.title}` })).toBeInTheDocument();
});

test('resets to the first tab when the categories change', async () => {
  const { rerender } = render(<CultureTabs categories={TABS} />);
  await userEvent.click(screen.getByRole('tab', { name: 'UNESCO' }));
  rerender(<CultureTabs categories={['holidays', 'ich', 'history']} />);
  expect(screen.getByRole('tab', { name: 'Festivals' })).toHaveAttribute('aria-selected', 'true');
});

test('switching tabs after playing a video shows the next video unplayed', async () => {
  const { container } = render(<CultureTabs categories={TABS} />);
  await userEvent.click(screen.getByRole('button', { name: `Play video: ${VIDEOS.foods!.title}` }));
  expect(container.querySelector('iframe')).not.toBeNull();

  await userEvent.click(screen.getByRole('tab', { name: 'Monuments' }));

  expect(container.querySelector('iframe')).toBeNull();
  expect(screen.getByRole('button', { name: `Play video: ${VIDEOS.monuments!.title}` })).toBeInTheDocument();
});

test('every tab shows exactly three articles', async () => {
  render(<CultureTabs categories={TABS} />);
  for (const name of ['Foods', 'Monuments', 'UNESCO']) {
    await userEvent.click(screen.getByRole('tab', { name }));
    expect(within(screen.getByRole('tabpanel', { name })).getAllByRole('article')).toHaveLength(3);
  }
});

test('each article card opens with its photo and credits the photographer and licence', () => {
  render(<CultureTabs categories={TABS} />);
  const article = screen.getByRole('article', { name: 'Hainanese chicken rice' });

  const photo = within(article).getByRole('img', { name: /Hainanese chicken rice/ });
  expect(photo).toHaveAttribute('loading', 'lazy');
  const credit = within(article).getByRole('link', { name: 'Photo: Terence Ong · CC BY 2.5 · cropped' });
  expect(credit).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Hainanese_Chicken_Rice.jpg');
  expect(credit).toHaveAttribute('target', '_blank');
});

test('an article that names a place links to it in Nearby', () => {
  render(<CultureTabs categories={['monuments', 'foods', 'holidays']} />);
  expect(screen.getByRole('link', { name: 'Sri Mariamman Temple (opens Nearby)' })).toHaveAttribute('href', '/nearby?sel=curated%3Asg-sri-mariamman-temple&info=1');
});
