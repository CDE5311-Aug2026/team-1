import styles from './MaskIcon.module.css';

interface MaskIconProps {
  src: string;
  size: number;
  /** Selected tiles show the icon in the accent colour, others in dark grey (Figma). */
  color: string;
}

/** A Figma icon drawn as a mask, so the same asset takes the selected or unselected colour. */
export default function MaskIcon({ src, size, color }: MaskIconProps) {
  const mask = `url("${src}") center / contain no-repeat`;
  return (
    <span
      className={styles.icon}
      aria-hidden="true"
      style={{ width: size, height: size, background: color, mask, WebkitMask: mask }}
    />
  );
}
