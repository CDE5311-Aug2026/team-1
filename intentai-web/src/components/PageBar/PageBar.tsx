// Every tab's top bar, one design: your avatar (the app logo until you have a photo) on the left, the page's name in the middle, Settings on the right.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { paths } from "../../routes";
import Icon from "../../pages/OnboardingPage/v3/icons";
import logo from "../../assets/avatar-logo.png";
import styles from "./PageBar.module.css";

interface Props {
  title: string;
  /** dark: cream type on the dark desk pages; light: ink on paper. */
  tone?: "dark" | "light";
  /** Drawn around the avatar (e.g. the rank ring). */
  ring?: ReactNode;
  /** The avatar's own action; by default it opens Mine. */
  onAvatar?: () => void;
  avatarLabel?: string;
  /** On Mine itself the avatar is just a picture. */
  here?: boolean;
  className?: string;
  /** false when the page already has its own h1 (Home's is for screen readers). */
  heading?: boolean;
}

export default function PageBar({
  title,
  tone = "light",
  ring,
  onAvatar,
  avatarLabel,
  here,
  className,
  heading = true,
}: Props) {
  // no profile photo yet: everyone starts with the app's logo
  const face = (
    <>
      {ring && <span className={styles.ring}>{ring}</span>}
      <span className={styles.face} aria-hidden="true">
        <img src={logo} alt="" draggable={false} />
      </span>
    </>
  );
  return (
    <header
      className={`${styles.bar} ${tone === "dark" ? styles.dark : styles.light} ${className ?? ""}`}
    >
      {onAvatar ? (
        <button
          type="button"
          className={styles.avatar}
          onClick={onAvatar}
          aria-label={avatarLabel ?? "You"}
        >
          {face}
        </button>
      ) : here ? (
        <span className={styles.avatar}>{face}</span>
      ) : (
        <Link
          to={paths.mySpace}
          className={styles.avatar}
          aria-label={avatarLabel ?? "Mine"}
        >
          {face}
        </Link>
      )}
      {heading ? (
        <h1 className={styles.title}>{title}</h1>
      ) : (
        <span className={styles.title} aria-hidden="true">
          {title}
        </span>
      )}
      <Link
        to={paths.mySpaceSettings}
        className={styles.settings}
        aria-label="Settings"
      >
        <Icon name="gear" size={18} />
        <span aria-hidden="true">Settings</span>
      </Link>
    </header>
  );
}
