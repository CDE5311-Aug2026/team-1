import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { paths } from '../../../routes';
import { renderAt } from '../testUtils';
import { OSM_CREDIT, TERMS, photoCredits } from './LicencesPage';

test('lists the terms, the map attribution and each photo credit once', () => {
  renderAt(paths.licences);
  expect(screen.getByRole('heading', { level: 1, name: 'Terms & licences' })).toBeInTheDocument();
  expect(screen.getByText(TERMS)).toBeInTheDocument();
  expect(screen.getByText(OSM_CREDIT)).toBeInTheDocument();
  const credits = photoCredits();
  expect(credits.some((c) => c.includes('CC BY'))).toBe(true);
  expect(new Set(credits).size).toBe(credits.length);
  expect(screen.getAllByRole('listitem')).toHaveLength(credits.length);
});
