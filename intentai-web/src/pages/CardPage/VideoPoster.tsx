// Figma 4 / 5 / 8–11 video poster: tilt + glare that follow the pointer, a ring of circular text (React Bits
// CircularText) and a magnetic play button (React Bits Magnet). Play swaps the poster for the real YouTube video
// (privacy-enhanced embed). Only cards with a checked video in ARTICLE_VIDEOS get one.
import { useRef, useState, type PointerEvent } from 'react';
import { useReducedMotionConfig } from 'motion/react';
import CircularText from '../../components/reactbits/CircularText';
import Magnet from '../../components/reactbits/Magnet';
import type { PlacePhoto } from '../../data/home/places';
import type { Video } from '../../data/videos';
import HomeIcon from '../TodayPage/shared/HomeIcon';
import styles from './CardPage.module.css';

export default function VideoPoster({ video, photo }: { video: Video; photo?: PlacePhoto }) {
  const reduce = useReducedMotionConfig();
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType === 'touch' || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    frame.current.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
    frame.current.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
    frame.current.style.setProperty('--gx', `${x * 100}%`);
    frame.current.style.setProperty('--gy', `${y * 100}%`);
  };
  const onLeave = () => {
    frame.current?.style.setProperty('--rx', '0deg');
    frame.current?.style.setProperty('--ry', '0deg');
  };

  if (playing) {
    return (
      <div className={styles.videoFrame}>
        <iframe
          className={styles.iframe}
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&cc_load_policy=1`}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const ring = `PLAY · ${video.channel.toUpperCase()} · ${video.length ? `${video.length} · ` : ''}WATCH · `;
  return (
    <div ref={frame} className={styles.poster} onPointerMove={onMove} onPointerLeave={onLeave}>
      {photo ? <img className={styles.posterPhoto} src={photo.src} alt="" /> : <span className={styles.posterBlank} />}
      <span className={styles.posterShade} aria-hidden="true" />
      <span className={styles.glare} aria-hidden="true" />
      {video.length && <span className={styles.length}>{video.length}</span>}
      <div className={styles.ringWrap}>
        <CircularText text={ring} decorative size={136} fontSize={10.5} fontWeight={700} spinDuration={22} onHover="slowDown" color="#fff" fill className={styles.ring}>
          <Magnet padding={50} magnetStrength={3} maxOffset={10}>
            <button type="button" className={styles.playBtn} onClick={() => setPlaying(true)} aria-label={`Play video: ${video.title}`}>
              <HomeIcon name="play" size={26} />
            </button>
          </Magnet>
        </CircularText>
      </div>
      <div className={styles.posterText}>
        <p className={styles.posterTitle}>{video.title}</p>
        <p className={styles.posterMeta}>
          Video · {video.channel}
          {video.length ? ` · ${video.length}` : ''}
        </p>
      </div>
    </div>
  );
}
