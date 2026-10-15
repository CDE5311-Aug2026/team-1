import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../App';

function Pathname() {
  return <span data-testid="pathname">{useLocation().pathname}</span>;
}

/** Renders the real app at `path`, so navigation between My Space screens is exercised end to end. */
export function renderAt(path: string, state?: unknown) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[{ pathname: path, state }]}>
      <App />
      <Pathname />
    </MemoryRouter>,
  );
}

export const currentPath = () => screen.getByTestId('pathname').textContent;
