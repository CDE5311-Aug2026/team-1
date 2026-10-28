function define(el: HTMLElement, prop: string, value: number): void {
  Object.defineProperty(el, prop, { configurable: true, value });
}

/** jsdom does no layout. Fakes a centred-snap carousel: card i sits at i*(cardWidth+gap) + (width-cardWidth)/2. */
export function setCarouselGeometry(
  container: HTMLElement,
  opts: { width: number; cardWidth: number; gap: number },
): void {
  const { width, cardWidth, gap } = opts;
  define(container, 'clientWidth', width);
  const groups = Array.from(container.querySelectorAll<HTMLElement>(':scope > [role="group"]'));
  const cards = groups.length > 0 ? groups : (Array.from(container.children) as HTMLElement[]);
  cards.forEach((card, i) => {
    define(card, 'offsetLeft', i * (cardWidth + gap) + (width - cardWidth) / 2);
    define(card, 'offsetWidth', cardWidth);
  });
}

/** Moves the scroll position and fires the events a real scroll would (scroll, then scrollend). */
export function scrollCarousel(container: HTMLElement, left: number): void {
  container.scrollLeft = left;
  container.dispatchEvent(new Event('scroll'));
  container.dispatchEvent(new Event('scrollend'));
}
