// Is the detail in the photo? The stop passes only on a clear yes from the recognition service (/api/recognize, Claude
// looking at the photo; server/recognize/handler.ts). A host page may plug in its own checker instead, as the FindSG
// prototype allowed (`window.FindSGHost.recognizeObservationPhoto`). There is no way round it: when the service is
// down or unsure, the player is asked to try again.

export type Recognition =
  | { kind: 'match'; reason: string }
  | { kind: 'no-match'; reason: string }
  | { kind: 'unavailable'; reason: string };

export interface RecognizeInput {
  routeId: string;
  stopId: string;
  /** What the photo must show. */
  feature: string;
  place: string;
  file: File;
}

/** The same bar the prototype used for a pass. */
export const PASS_CONFIDENCE = 0.8;
/** Long side of the photo sent: enough to see a window or a sign, small enough to send fast on a phone. */
const MAX_SIDE = 1280;

type HostResult = { decision?: string; confidence?: number; reason?: string } | null | undefined;
declare global {
  interface Window {
    FindSGHost?: { recognizeObservationPhoto?: (input: { routeId: string; stopId: string; expectedFeature: string; file: File }) => Promise<HostResult> };
  }
}

function judge(r: HostResult): Recognition {
  const reason = typeof r?.reason === 'string' ? r.reason : '';
  if (r?.decision === 'match' && typeof r.confidence === 'number' && r.confidence >= PASS_CONFIDENCE) return { kind: 'match', reason };
  return { kind: 'no-match', reason };
}

/** The photo as a JPEG no larger than MAX_SIDE, base64 without its data: prefix. */
async function shrink(file: File): Promise<{ data: string; mediaType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const url = canvas.toDataURL('image/jpeg', 0.82);
    return { data: url.slice(url.indexOf(',') + 1), mediaType: 'image/jpeg' };
  } catch {
    // no canvas decoding (an old browser): send the file as it is
    const url = await new Promise<string>((done, fail) => {
      const r = new FileReader();
      r.onload = () => done(String(r.result));
      r.onerror = () => fail(r.error);
      r.readAsDataURL(file);
    });
    return { data: url.slice(url.indexOf(',') + 1), mediaType: file.type || 'image/jpeg' };
  }
}

export async function recognizePhoto(input: RecognizeInput, signal?: AbortSignal): Promise<Recognition> {
  const host = window.FindSGHost?.recognizeObservationPhoto;
  try {
    if (typeof host === 'function') {
      return judge(await host({ routeId: input.routeId, stopId: input.stopId, expectedFeature: input.feature, file: input.file }));
    }
    const { data, mediaType } = await shrink(input.file);
    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feature: input.feature, place: input.place, mediaType, data }),
      signal,
    });
    if (!res.ok) return { kind: 'unavailable', reason: res.status === 413 ? 'This photo is too large to check.' : '' };
    return judge((await res.json()) as HostResult);
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    return { kind: 'unavailable', reason: '' };
  }
}
