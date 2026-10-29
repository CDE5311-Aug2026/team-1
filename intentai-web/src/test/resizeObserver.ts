const observers = new Set<ResizeObserverMock>();

export class ResizeObserverMock {
  private readonly targets = new Set<Element>();
  constructor(private readonly callback: ResizeObserverCallback) {
    observers.add(this);
  }
  observe(el: Element): void {
    this.targets.add(el);
  }
  unobserve(el: Element): void {
    this.targets.delete(el);
  }
  disconnect(): void {
    this.targets.clear();
  }
  /** @internal */
  fire(el: Element, rect: Partial<DOMRectReadOnly>): void {
    if (!this.targets.has(el)) return;
    const contentRect = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, ...rect };
    const entry = { target: el, contentRect } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}

/** Calls every observer currently watching `el`. */
export function triggerResize(el: Element, rect: Partial<DOMRectReadOnly>): void {
  for (const o of [...observers]) o.fire(el, rect);
}

export function resetResizeObservers(): void {
  observers.clear();
}
