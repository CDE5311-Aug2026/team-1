// Hunt (3 Nov 2026, owner): on site, the page shows where the stop is and how far you are from it. The map sits
// from the stop's pin; your position (asked for once, with the locate button) is a blue dot on it, and the distance is
// in the corner. Tapping the map opens walking directions in Google Maps.
import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {distanceLabel, metresBetween, worldPx} from './stop-photos.js';
import './nearby.css';

const HERE_M = 60; // close enough to say you are there

/** Your position, watched once you allow it (or straight away if you already have). */
export function useWhere() {
  const [where, setWhere] = useState({status: 'idle', at: null});
  const watch = useRef(null);
  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {setWhere({status: 'none', at: null}); return;}
    if (watch.current != null) return;
    setWhere(w => ({...w, status: w.at ? 'on' : 'asking'}));
    watch.current = navigator.geolocation.watchPosition(
      p => setWhere({status: 'on', at: {lat: p.coords.latitude, lng: p.coords.longitude}}),
      e => {watch.current = null; setWhere({status: e.code === 1 ? 'denied' : 'none', at: null});},
      {enableHighAccuracy: true, maximumAge: 10000, timeout: 20000});
  }, []);
  useEffect(() => {
    let live = true;
    navigator.permissions?.query({name: 'geolocation'}).then(r => {if (live && r.state === 'granted') start();}).catch(() => {});
    return () => {live = false; if (watch.current != null) navigator.geolocation.clearWatch(watch.current); watch.current = null;};
  }, [start]);
  return [where, start];
}

const Locate = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const Walk = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// the map is drawn from OpenStreetMap's tiles, so the stop's pin and your dot sit exactly
const tile = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const PAD = 26; // the pin and the dot keep this far from the map's edge

/** The stop's map with you on it. `pin` {lat, lng}; `walk` the directions link; `size` 'card' or 'sheet'. */
export function DistanceMap({pin, name, walk, size = 'card'}) {
  const [where, locate] = useWhere();
  const box = useRef(null);
  const [dims, setDims] = useState({w: 300, h: 120});
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setDims({w: el.clientWidth || 300, h: el.clientHeight || 120});
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const at = where.at;
  const metres = at ? metresBetween(at, pin) : null;
  const here = metres != null && metres <= HERE_M;
  // the closest zoom that shows both you and the stop; centred between them
  let z = 17;
  if (at && !here) {
    for (z = 18; z > 11; z--) {
      const a = worldPx(at, z), b = worldPx(pin, z);
      if (Math.abs(a.x - b.x) <= dims.w - 2 * PAD && Math.abs(a.y - b.y) <= dims.h - 2 * PAD) break;
    }
  }
  const P = worldPx(pin, z), Y = at ? worldPx(at, z) : null;
  const centre = Y && !here ? {x: (P.x + Y.x) / 2, y: (P.y + Y.y) / 2} : P;
  const x0 = centre.x - dims.w / 2, y0 = centre.y - dims.h / 2;
  const tiles = [];
  const n = 2 ** z;
  for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + dims.h) / 256); ty++)
    for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + dims.w) / 256); tx++)
      if (ty >= 0 && ty < n) tiles.push({key: `${z}/${tx}/${ty}`, src: tile(z, ((tx % n) + n) % n, ty), left: tx * 256 - x0, top: ty * 256 - y0});
  const clamp = (v, max) => Math.min(max - 10, Math.max(10, v));
  const dot = Y && {x: clamp(Y.x - x0, dims.w), y: clamp(Y.y - y0, dims.h)};
  const spot = {x: P.x - x0, y: P.y - y0};

  return <div className={'nb-map is-' + size + (here ? ' is-here' : '')} ref={box}>
    <div className="nb-tiles" aria-hidden="true">{tiles.map(t => <img key={t.key} src={t.src} alt="" style={{left: t.left, top: t.top}} draggable={false}/>)}</div>
    <svg className="nb-pin" viewBox="0 0 24 32" style={{left: spot.x, top: spot.y}} aria-hidden="true"><path d="M12 31s-10-10.6-10-18.5a10 10 0 0 1 20 0C22 20.4 12 31 12 31z" fill="#c0392b" stroke="#6e1c10" strokeWidth="1.4"/><circle cx="12" cy="12.5" r="3.8" fill="#fff4dc"/></svg>
    <a className="nb-walk-area" href={walk} target="_blank" rel="noreferrer" aria-label={`Walking directions to ${name} in Google Maps`}/>
    {dot && <span className="nb-you" style={{left: dot.x, top: dot.y}} aria-hidden="true"/>}
    <div className="nb-corner">
      {metres != null
        ? <b aria-label={here ? 'You are here' : `${distanceLabel(metres)} away`}>{here ? 'Here' : distanceLabel(metres)}</b>
        : <button className={'nb-locate' + (where.status === 'idle' ? ' is-glow' : '')} onClick={locate} disabled={where.status === 'asking'}
          aria-label={where.status === 'denied' ? 'Location is off in your settings' : 'Show how far you are'}>
          <Locate/>
        </button>}
    </div>
    <span className="nb-walk" aria-hidden="true"><Walk/></span>
    <small className="nb-attr">© OpenStreetMap contributors</small>
  </div>;
}
