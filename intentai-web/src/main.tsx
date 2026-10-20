import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { runLegacyMigration } from './data/migration/legacyMigration';
import './styles/global.css';

// Before any store is read: copy the old web/ app's state (singlish-v2-state) into the v1 stores, once.
runLegacyMigration();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Our stores update synchronously (useSyncExternalStore); router transitions would let a page's
        guard see new state before the navigation lands. React Router 7's opt-out restores v6 timing. */}
    <BrowserRouter useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
