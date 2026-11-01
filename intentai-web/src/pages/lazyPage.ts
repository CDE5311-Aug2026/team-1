// A screen that loads on demand (React.lazy), with two extras: once its code is in, it renders straight away (no
// Suspense flash when you come back to it), and `preloadPages()` fetches every registered screen up front (the tests
// do, so they can read a screen as soon as they open it).
import { createElement, lazy, type ComponentType } from 'react';

const loaders: (() => Promise<unknown>)[] = [];

export function lazyPage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): ComponentType<P> {
  let ready: ComponentType<P> | undefined;
  const fetch = () =>
    load().then((m) => {
      ready = m.default;
      return m;
    });
  const Lazy = lazy(fetch);
  loaders.push(fetch);
  function Page(props: P) {
    return ready ? createElement(ready, props) : createElement(Lazy as unknown as ComponentType<P>, props);
  }
  return Page;
}

/** Add other code loaded on demand to what `preloadPages()` fetches (Home's Editor's Picks). */
export function registerPreload(load: () => Promise<unknown>) {
  loaders.push(load);
}

/** Load every screen made with lazyPage so far. */
export function preloadPages(): Promise<unknown> {
  return Promise.all(loaders.map((f) => f()));
}
