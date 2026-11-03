// A place's sky on Home (owner, 31 Oct 2026: "对于具体的 landmark，就可以开启昼夜交替的模式了，以及天气"): over the live 3D
// view, one key for the time of day (now, dawn, noon, sunset, night, or day and night playing on) and one for the
// weather (the page's own plan for the day, or clear, cloudy, haze, rain, storm). A key opens a row of choices under it.
import { useState } from 'react';
import type { View3DSky, View3DWeather } from '../../features/nearby/components/View3D';
import styles from './SkyControls.module.css';

type Time = View3DSky['time'];

const P = {
  now: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  dawn: 'M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5 9.5l1.6 1.6M19 9.5l-1.6 1.6',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  dusk: 'M3 18h18M7 18a5 5 0 0 1 10 0M12 9V5M9.5 7 12 9.5 14.5 7',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',
  cycle: 'M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4',
  auto: 'M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4L12 3ZM18 15l.8 2.2 2.2.8-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z',
  cloud: 'M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 11 3.5 3.5 0 0 0 7 18Z',
  haze: 'M4 9h16M3 13h18M5 17h14M8 5h8',
  rain: 'M7 14h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 7 3.5 3.5 0 0 0 7 14ZM8 17l-1 3M12 17l-1 3M16 17l-1 3',
  storm: 'M7 14h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 7 3.5 3.5 0 0 0 7 14ZM12.5 14 10 18h4l-2.5 4',
};

export const TIMES: { id: Time; label: string; d: string }[] = [
  { id: 'now', label: 'Now', d: P.now },
  { id: 6.6, label: 'Dawn', d: P.dawn },
  { id: 12.5, label: 'Noon', d: P.sun },
  { id: 18.7, label: 'Sunset', d: P.dusk },
  { id: 21.5, label: 'Night', d: P.moon },
  { id: 'cycle', label: 'Day & night', d: P.cycle },
];
export const WEATHER: { id: View3DWeather; label: string; d: string }[] = [
  { id: 'auto', label: 'Auto', d: P.auto },
  { id: 'clear', label: 'Clear', d: P.sun },
  { id: 'cloudy', label: 'Cloudy', d: P.cloud },
  { id: 'haze', label: 'Haze', d: P.haze },
  { id: 'rain', label: 'Rain', d: P.rain },
  { id: 'storm', label: 'Storm', d: P.storm },
];

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

interface Props {
  sky: View3DSky;
  onChange(sky: View3DSky): void;
}

export function SkyControls({ sky, onChange }: Props) {
  const [open, setOpen] = useState<'time' | 'wx' | null>(null);
  const t = TIMES.find((x) => x.id === sky.time) ?? TIMES[0];
  const w = WEATHER.find((x) => x.id === sky.wx) ?? WEATHER[0];
  const list = open === 'time' ? TIMES : open === 'wx' ? WEATHER : null;
  const current = open === 'time' ? sky.time : sky.wx;

  return (
    <>
      <div className={styles.keys} role="group" aria-label="Sky">
        <button
          type="button"
          className={styles.key}
          aria-expanded={open === 'time'}
          aria-label={`Time of day: ${t.label}`}
          onClick={() => setOpen(open === 'time' ? null : 'time')}
        >
          <Icon d={t.d} />
          <span>{t.label}</span>
        </button>
        <button
          type="button"
          className={styles.key}
          aria-expanded={open === 'wx'}
          aria-label={`Weather: ${w.label}`}
          onClick={() => setOpen(open === 'wx' ? null : 'wx')}
        >
          <Icon d={w.d} />
          <span>{w.label}</span>
        </button>
      </div>
      {list && (
        <div className={styles.row} role="radiogroup" aria-label={open === 'time' ? 'Time of day' : 'Weather'}>
          {list.map((o) => (
            <button
              key={String(o.id)}
              type="button"
              role="radio"
              aria-checked={o.id === current}
              className={styles.chip}
              onClick={() => {
                onChange(open === 'time' ? { ...sky, time: o.id as Time } : { ...sky, wx: o.id as View3DWeather });
                setOpen(null);
              }}
            >
              <Icon d={o.d} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
