import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Our stores update synchronously (useSyncExternalStore); router transitions would let a page's
        guard see new state before the navigation lands. React Router 7's opt-out restores v6 timing. */}
    <BrowserRouter useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
