// Every tab's top bar, one design: the Help Center badge (the FindSG lion and its info bulb) on the left, the page's
// name in the middle, Settings on the right. The badge unfolds this bar into the Help Center.
import HelpHint from "../HelpCenter/HelpHint";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { paths } from "../../routes";
import Icon from "../../pages/OnboardingPage/v3/icons";
import HelpBadge from "../HelpCenter/HelpBadge";
import { openHelp } from "../HelpCenter/helpStore";
import styles from "./PageBar.module.css";

interface Props {
  title: string;
  /** dark: cream type on the dark desk pages; light: ink on paper. */
  tone?: "dark" | "light";
  /** Drawn around the lion (e.g. the rank ring). */
  ring?: ReactNode;
  className?: string;
  /** false when the page already has its own h1 (Home's is for screen readers). */
  heading?: boolean;
  /** Hunt's game screens (a stop, the story reader) are full-screen layers: the bar stays over them and tells them
   *  where it ends (--game-top), so the game starts below it. */
  game?: boolean;
}

export default function PageBar({
  title,
  tone = "light",
  ring,
  className,
  heading = true,
  game = false,
}: Props) {
  const bar = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = bar.current;
    if (!game || !el) return;
    const root = document.documentElement.style;
    const mark = () =>
      root.setProperty("--game-top", `${Math.round(el.getBoundingClientRect().bottom)}px`);
    mark();
    const ro = new ResizeObserver(mark);
    ro.observe(el);
    window.addEventListener("resize", mark);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", mark);
      root.removeProperty("--game-top");
    };
  }, [game]);
  return (
    <header
      ref={bar}
      className={`${styles.bar} ${tone === "dark" ? styles.dark : styles.light} ${game ? styles.game : ""} ${className ?? ""}`}
    >
      <HelpBadge ring={ring} onOpen={(el) => openHelp("ask", el)} />
      <HelpHint />
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
        title="Settings"
      >
        <Icon name="gear" size={20} />
      </Link>
    </header>
  );
}
