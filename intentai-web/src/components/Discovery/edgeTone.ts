// Safari in the browser paints the bands above and below the page (behind the clock, behind its floating toolbar) in
// one flat colour: the page's background colour. Home's backdrop is a map image, so that colour is taken from the
// image itself: the average of the strips that show at the top and bottom of the screen ("cover", centred).
const cache = new Map<string, string>();

export function edgeTone(src: string, width: number, height: number): Promise<string | null> {
  const key = `${src}|${width}x${height}`;
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        if (!iw || !ih || !width || !height) return resolve(null);
        const scale = Math.max(width / iw, height / ih);
        const shownH = height / scale;
        const shownW = width / scale;
        const x0 = (iw - shownW) / 2;
        const y0 = (ih - shownH) / 2;
        const strip = Math.max(1, 14 / scale);
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 2;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, x0, y0, shownW, strip, 0, 0, 32, 1);
        ctx.drawImage(img, x0, y0 + shownH - strip, shownW, strip, 0, 1, 32, 1);
        const px = ctx.getImageData(0, 0, 32, 2).data;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let i = 0; i < px.length; i += 4) {
          r += px[i];
          g += px[i + 1];
          b += px[i + 2];
        }
        const n = px.length / 4;
        const tone = `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
        cache.set(key, tone);
        resolve(tone);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Give Safari's bands (and the page behind them) this colour. */
export function paintBrowserBands(tone: string) {
  document.documentElement.style.backgroundColor = tone;
  document.body.style.backgroundColor = tone;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tone);
}
