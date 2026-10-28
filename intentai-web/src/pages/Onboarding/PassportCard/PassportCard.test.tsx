import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { DEFAULT_ONBOARDING, type OnbField, type Onboarding } from '../../../data/domain';
import { COMPLETED_ONBOARDING } from '../../../test/onboardingFixture';
import PassportCard from './PassportCard';
import { MRZ_LENGTH, mrzLine, passportValue } from './passport';

const field = (name: string) => screen.getByText(name).closest('[data-field]') as HTMLElement;

function renderCard(data: Onboarding, active: OnbField | null = null) {
  const onToggle = vi.fn();
  const view = render(<PassportCard data={data} active={active} onToggleHidden={onToggle} />);
  return { ...view, onToggle };
}

test('shows the six labels in card order, each empty with no eye toggle', () => {
  renderCard(DEFAULT_ONBOARDING);
  const card = screen.getByRole('region', { name: 'Your passport' });
  const labels = within(card)
    .getAllByRole('term')
    .map((t) => t.textContent);
  expect(labels).toEqual(['FROM', 'IN SINGAPORE', 'HERE AS', 'LANGUAGE', 'HOME BASE', 'TOPICS']);
  expect(within(card).getAllByText('····')).toHaveLength(6);
  expect(within(card).queryByRole('button')).not.toBeInTheDocument();
});

test('the active empty field shows the caret; others do not', () => {
  renderCard(DEFAULT_ONBOARDING, 'time');
  expect(field('IN SINGAPORE').querySelector('[data-caret]')).not.toBeNull();
  expect(field('FROM').querySelector('[data-caret]')).toBeNull();
});

test('values use the passport forms: short time, native language, base label, topics joined by ›', () => {
  renderCard({ ...COMPLETED_ONBOARDING, hidden: [] });
  expect(within(field('FROM')).getByText('China')).toBeInTheDocument();
  expect(within(field('IN SINGAPORE')).getByText('< 3 months')).toBeInTheDocument();
  expect(within(field('HERE AS')).getByText('Student intern')).toBeInTheDocument();
  expect(within(field('LANGUAGE')).getByText('English')).toBeInTheDocument();
  expect(within(field('HOME BASE')).getByText('NUS UTown')).toBeInTheDocument();
  expect(within(field('TOPICS')).getByText('Food › Festivals › Monuments › History')).toBeInTheDocument();
  expect(passportValue({ ...DEFAULT_ONBOARDING, time: 'gt3y', language: 'zh' }, 'time')).toBe('3+ years');
  expect(passportValue({ ...DEFAULT_ONBOARDING, language: 'zh' }, 'language')).toBe('中文');
  expect(passportValue({ ...DEFAULT_ONBOARDING, topics: ['history'] }, 'topics')).toBe('History');
});

test('a hidden field is masked and its eye says Show; a shown one says Hide', () => {
  renderCard(COMPLETED_ONBOARDING); // hidden: ['from']
  expect(within(field('FROM')).queryByText('China')).not.toBeInTheDocument();
  expect(within(field('FROM')).getByText('••••••')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Show home country' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Hide role' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getAllByRole('button')).toHaveLength(6);
});

test('the eye toggle reports its field', async () => {
  const { onToggle } = renderCard(COMPLETED_ONBOARDING);
  await userEvent.click(screen.getByRole('button', { name: 'Hide time in singapore' }));
  expect(onToggle).toHaveBeenCalledWith('time');
});

test('MRZ: from and role in upper case with < for spaces, skipped while hidden, always 44 chars', () => {
  expect(mrzLine(DEFAULT_ONBOARDING)).toBe('P<SGPW<<<<'.padEnd(MRZ_LENGTH, '<'));
  expect(mrzLine(COMPLETED_ONBOARDING)).toBe('P<SGPW<<<<STUDENT<INTERN'.padEnd(MRZ_LENGTH, '<'));
  expect(mrzLine({ ...COMPLETED_ONBOARDING, hidden: [], from: 'United Kingdom' })).toBe(
    'P<SGPW<<UNITED<KINGDOM<<STUDENT<INTERN'.padEnd(MRZ_LENGTH, '<'),
  );
  expect(mrzLine({ ...COMPLETED_ONBOARDING, hidden: ['role'] })).toBe('P<SGPW<<CHINA<<'.padEnd(MRZ_LENGTH, '<'));
  renderCard(COMPLETED_ONBOARDING);
  expect(screen.getByTestId('passport-mrz')).toHaveTextContent(mrzLine(COMPLETED_ONBOARDING));
  expect(mrzLine(COMPLETED_ONBOARDING)).toHaveLength(MRZ_LENGTH);
});

test('renders a stamp slot only when given a stamp', () => {
  const { rerender } = render(<PassportCard data={COMPLETED_ONBOARDING} active={null} onToggleHidden={() => {}} />);
  expect(screen.queryByTestId('passport-stamp')).not.toBeInTheDocument();
  rerender(<PassportCard data={COMPLETED_ONBOARDING} active={null} onToggleHidden={() => {}} stamp={<svg data-testid="stamp-art" />} />);
  expect(within(screen.getByTestId('passport-stamp')).getByTestId('stamp-art')).toBeInTheDocument();
});
