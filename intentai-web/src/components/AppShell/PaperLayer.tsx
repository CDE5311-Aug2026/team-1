// The app's page background (owner, 8 Nov 2026: "the /hunt background everywhere"): the field archive's chart paper
// (ChartPaper, archive variant: survey grid, rhumb lines, brass roses, the URA coastline) as one fixed layer behind every
// tabbed page. Every page mounts its own AppShell, so the layer lives outside them all: it is drawn once, into its own
// root under <body>, the first time a shell asks for it, and is only shown or hidden after that (never re-rendered on a
// page change or a page's own state). It sits at z-index -1, above the canvas and below every page's content.
// The roses turn only when motion is allowed (chartPaper.module.css: prefers-reduced-motion and html.reduce-motion).
import { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ChartPaper } from '../../pages/HuntPage/notebook/ChartPaper';
import styles from './AppShell.module.css';

let layer: HTMLDivElement | null = null;
let users = 0;

function ensureLayer(): HTMLDivElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = styles.paperLayer;
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.appPaper = '';
  layer.hidden = true;
  document.body.prepend(layer);
  createRoot(layer).render(<ChartPaper variant="archive" />);
  return layer;
}

/** Show the shared chart paper while this shell is mounted (and `on`). */
export function usePaperLayer(on: boolean) {
  useLayoutEffect(() => {
    if (!on) return;
    const el = ensureLayer();
    users += 1;
    el.hidden = false;
    return () => {
      users -= 1;
      // a page change unmounts the old shell and mounts the new one in one commit: no frame without the paper
      if (users <= 0) {
        users = 0;
        el.hidden = true;
      }
    };
  }, [on]);
}
