// Home's map, on our own Singapore map (merge decision 2026-10-29: the EARTH ONLINE ground and roads that Nearby and
// its 3D view use, with pin clusters) instead of Leaflet tiles. Same props as HomeMap, so Team 1's NearbySection
// (selection, camera commands, carousel inset) drives it unchanged.
import { useEffect, useState } from 'react';
import { curatedPlace } from '../../features/nearby/catalogue';
import CityMap, { type MapFocus, type MapPin } from '../../features/nearby/map/CityMap';
import type { HomeMapProps } from './HomeMap';

/** Map radius (metres from the centre to the nearest edge) for a Leaflet-style zoom level. */
const radiusFor = (zoom: number) => Math.max(400, 1600 * 2 ** (16 - zoom));

export default function CityHomeMap({ pins, selectedId, command, lastFocus, zoom, bottomInset, onPinActivate }: HomeMapProps) {
  const [focus, setFocus] = useState<MapFocus>(() => ({ id: 0, center: lastFocus, radiusM: radiusFor(zoom) }));

  useEffect(() => {
    if (command.kind === 'focus') setFocus({ id: command.seq + 1, center: command.target, radiusM: radiusFor(zoom) });
    // zoom commands come from Team 1's buttons; CityMap has its own zoom controls, so nothing to do here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command.seq]);

  const mapPins: MapPin[] = pins.map((p) => ({
    key: p.id,
    name: p.name,
    location: p.point,
    category: curatedPlace(p.id)?.category ?? 'landmark',
  }));

  return (
    <CityMap
      label="Map of Singapore with the places in the cards below. Tap a pin to see its card."
      pins={mapPins}
      selectedKey={selectedId}
      onSelect={onPinActivate}
      focus={focus}
      bleed
      insets={{ top: 60, bottom: bottomInset }}
      controlsTop={60}
      attribution="hidden"
    />
  );
}
