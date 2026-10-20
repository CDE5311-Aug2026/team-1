import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import { runLegacyMigration } from './data/migration/legacyMigration';
import './styles/global.css';

// Before any store is read: copy the old web/ app's state (singlish-v2-state) into the v1 stores, once.
runLegacyMigration();

// Hash routing only for static previews served from a sub-folder (VITE_ROUTER=hash, built with --base ./).
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Our stores update synchronously (useSyncExternalStore); router transitions would let a page's
        guard see new state before the navigation lands. React Router 7's opt-out restores v6 timing. */}
    <Router useTransitions={false}>
      <App />
    </Router>
  </StrictMode>,
);
