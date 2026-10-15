import { useState } from 'react';
import useSpeech from '../../hooks/useSpeech';
import Icon from '../Icon/Icon';
import styles from './PlayAudioButton.module.css';

interface PlayAudioButtonProps {
  text: string;
}

export default function PlayAudioButton({ text }: PlayAudioButtonProps) {
  const { speak, speaking, supported } = useSpeech();
  const [unavailable, setUnavailable] = useState(false);

  const handleClick = () => {
    if (!supported) {
      setUnavailable(true);
      window.setTimeout(() => setUnavailable(false), 1200);
      return;
    }
    speak(text);
  };

  const className = [styles.button, speaking && styles.playing, unavailable && styles.unavailable]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      aria-label={unavailable ? 'Play audio unavailable' : `Play audio for ${text}`}
    >
      <Icon name="speaker" size={16} />
    </button>
  );
}
