type Listener = (e: MediaQueryListEvent) => void;

let reducedMotion = false;
const subscribers = new Set<{ query: string; listener: Listener; mql: MediaQueryList }>();

function matchesQuery(query: string): boolean {
  return reducedMotion && /prefers-reduced-motion:\s*reduce/.test(query);
}

/** jsdom has no matchMedia. This shim answers prefers-reduced-motion only; everything else is false. */
export function matchMediaShim(query: string): MediaQueryList {
  const mql = {
    get matches() {
      return matchesQuery(query);
    },
    media: query,
    onchange: null,
    addEventListener(type: string, listener: Listener) {
      if (type === 'change') subscribers.add({ query, listener, mql });
    },
    removeEventListener(type: string, listener: Listener) {
      if (type !== 'change') return;
      for (const s of subscribers) if (s.listener === listener && s.query === query) subscribers.delete(s);
    },
    addListener(listener: Listener) {
      subscribers.add({ query, listener, mql });
    },
    removeListener(listener: Listener) {
      for (const s of subscribers) if (s.listener === listener && s.query === query) subscribers.delete(s);
    },
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  return mql;
}

export function setReducedMotion(on: boolean): void {
  if (reducedMotion === on) return;
  reducedMotion = on;
  for (const { query, listener, mql } of [...subscribers]) {
    listener({ matches: matchesQuery(query), media: query, target: mql } as unknown as MediaQueryListEvent);
  }
}

export function resetMedia(): void {
  reducedMotion = false;
  subscribers.clear();
}
