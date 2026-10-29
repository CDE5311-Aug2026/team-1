// Community (ZIP sixth round): two photo doors (Ask a local · Answer as a local + switch), Top Questions / For You,
// My Questions with Posted → Read → Replied → Resolved, the Locals map card and the privacy line.
// `?mode=answer` is the Answer as a local browser (four channels, search, All / Open / Answered).
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import HomeLink from '../../components/HomeLink/HomeLink';
import { creditLines, questionSummary } from '../../data/community/social';
import { mapPeople, mapQuestions } from '../../data/community/map';
import { COMMUNITY_STATS, MEMBERS } from '../../data/community/people';
import type { Question } from '../../data/domain';
import { paths, type CommunityHandoff } from '../../routes';
import { useSpan } from '../../usage/useSpan';
import street from '../../assets/v3/community/street.jpg';
import temple from '../../assets/v3/community/temple.jpg';
import lanterns from '../../assets/v3/community/lanterns.jpg';
import mapImage from '../../assets/v3/community/map.jpg';
import AnswerBrowse from './AnswerBrowse';
import AskLocalSheet, { PRIVACY_LINE } from './AskLocalSheet';
import { Avatar, Count } from './bits';
import ContextSheet from './ContextSheet';
import FeedCarousel from './FeedCarousel';
import { Icon } from './icons';
import MyQuestionCard from './MyQuestionCard';
import NotificationsSheet from './NotificationsSheet';
import { postQuestion, withdrawQuestion } from './post';
import { useCommunity } from './useCommunity';
import styles from './CommunityPage.module.css';

export default function CommunityPage() {
  const data = useCommunity();
  const { questions, social, settings, ownThreads, notifications, setLocal } = data;
  const [params, setParams] = useSearchParams();
  const answerMode = params.get('mode') === 'answer';
  // Ask / Moments "Ask a local" arrive with a drafted question.
  const handoff = useLocation().state as CommunityHandoff | null;
  const [asking, setAsking] = useState(handoff?.askLocal !== undefined);
  const [sheet, setSheet] = useState<'notifications' | null>(null);
  const [contextFor, setContextFor] = useState<Question | null>(null);
  useSpan('activity', 'Community › ask a local', asking);
  useSpan('activity', 'Community › answer as a local', answerMode);

  const unread = notifications.filter((n) => n.unread).length;
  const summary = questionSummary(questions, social.closed);
  const pins = mapQuestions(questions, social, data.lookups, data.tips);
  const people = mapPeople(social, settings.local);

  const setMode = (answer: boolean) => setParams(answer ? { mode: 'answer' } : {}, { replace: false });

  const askSheet = asking && (
    <AskLocalSheet
      defaultMessage={handoff?.askLocal}
      defaultContext={handoff?.context}
      link={handoff?.link}
      onPost={(text, context, link, place) => {
        postQuestion(text, context, link, place);
        setAsking(false);
        if (answerMode) setMode(false);
      }}
      onClose={() => setAsking(false)}
    />
  );

  if (answerMode) {
    return (
      <AppShell background="var(--bg-screen-b)">
        <AnswerBrowse data={data} onBack={() => setMode(false)} onAsk={() => setAsking(true)} />
        {askSheet}
      </AppShell>
    );
  }

  const credits = creditLines([street, temple, ...ownThreads.map((t) => t.photo)]);

  return (
    <AppShell background="var(--bg-screen-b)">
      <header className={styles.header}>
        <HomeLink className={styles.logo} />
        <h1 className={styles.srOnly}>Community</h1>
        <button
          type="button"
          className={styles.bell}
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          onClick={() => setSheet('notifications')}
        >
          <Icon name="bell" size={20} />
          {unread > 0 && <span className={styles.bellDot} aria-hidden="true" />}
        </button>
      </header>

      <p className={styles.pulse}>
        <span className={styles.liveDot} aria-hidden="true" />
        <span>
          <strong>{COMMUNITY_STATS.members.toLocaleString('en-SG')}</strong> members · <strong>{COMMUNITY_STATS.answeredThisWeek}</strong> questions answered this week
        </span>
      </p>

      <div className={styles.doors}>
        <motion.button
          type="button"
          className={styles.door}
          onClick={() => setAsking(true)}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <img className={styles.doorPhoto} src={street} alt="" />
          <span className={styles.doorShade} />
          <span className={styles.ping} aria-hidden="true">
            <Icon name="plus" size={22} strokeWidth={2} />
          </span>
          <span className={styles.doorCopy}>
            <span className={styles.avatars} aria-hidden="true">
              {MEMBERS.filter((p) => p.role === 'local').slice(0, 3).map((p) => (
                <Avatar key={p.id} name={p.name} size="sm" />
              ))}
            </span>
            <strong>Ask a local</strong>
            <span className={styles.doorNote}>{COMMUNITY_STATS.localsOnline} locals online now</span>
          </span>
        </motion.button>

        <motion.div
          className={styles.door}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
        >
          <img className={styles.doorPhoto} src={temple} alt="" />
          <span className={styles.doorShade} />
          <button type="button" className={styles.doorLink} onClick={() => setMode(true)}>
            <span className={styles.doorCopy}>
              <span className={styles.thumbs} aria-hidden="true">
                <img src={street} alt="" />
                <img src={lanterns} alt="" />
              </span>
              <strong>Answer as a local</strong>
              <span className={styles.doorNote}>Find a question you can help with</span>
            </span>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={settings.local}
            aria-label="Answer as a local"
            className={settings.local ? `${styles.switch} ${styles.switchOn}` : styles.switch}
            onClick={() => setLocal(!settings.local)}
          >
            <span>{settings.local ? 'On' : 'Off'}</span>
            <i aria-hidden="true">
              <motion.b layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
            </i>
          </button>
        </motion.div>
      </div>

      <FeedCarousel social={social} />

      <section className={styles.mine} aria-labelledby="my-questions-heading">
        <div className={styles.sectionHead}>
          <h2 id="my-questions-heading">My Questions</h2>
          <span className={styles.summary}>
            <Count value={summary.replied} /> replied · <Count value={summary.waiting} /> waiting
            {summary.resolved > 0 && (
              <>
                {' '}
                · <Count value={summary.resolved} /> resolved
              </>
            )}
          </span>
        </div>
        {ownThreads.length > 0 ? (
          <motion.ul className={styles.list} initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.06 } } }}>
            {ownThreads.map((thread) => (
              <motion.li
                key={thread.id}
                layout
                variants={{ hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0, transition: { duration: 0.32 } } }}
              >
                <MyQuestionCard
                  thread={thread}
                  question={thread.question!}
                  onContext={() => setContextFor(thread.question!)}
                  onWithdraw={() => withdrawQuestion(thread.question!)}
                />
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <div className={styles.empty}>
            <Icon name="people" size={20} />
            <p>
              No questions yet — ask a local about anything you heard.
              <small>Answers arrive here.</small>
            </p>
          </div>
        )}
      </section>

      <section aria-label="Locals near your places">
      <Link to={paths.communityMap} className={styles.mapCard} aria-label={`Locals near your places: open the map. ${pins.length} questions, ${people.length} people`}>
        <img className={styles.mapPhoto} src={mapImage} alt="" />
        {people.slice(0, 2).map((p, i) => (
          <span key={p.id} className={styles.mapPerson} style={{ left: `${22 + i * 40}%`, top: `${26 + i * 14}%` }} aria-hidden="true">
            <Avatar name={p.name} size="sm" tone={i ? 'dark' : 'warm'} />
          </span>
        ))}
        {pins.slice(0, 2).map((q, i) => (
          <span key={q.id} className={`${styles.mapPin} ${styles[`pin_${q.status}`]}`} style={{ left: `${46 + i * 26}%`, top: `${22 + i * 20}%` }} aria-hidden="true">
            {q.photo ? <img src={q.photo} alt="" /> : null}
          </span>
        ))}
        <span className={styles.mapShade} />
        <span className={styles.osm}>© OpenStreetMap contributors</span>
        <span className={styles.mapCaption}>
          <Icon name="pin" size={18} />
          <strong>Locals near your places</strong>
          <span className={styles.mapButton}>
            Map <Icon name="arrow" size={13} />
          </span>
        </span>
      </Link>
      </section>

      <p className={styles.privacy}>
        <Icon name="lock" size={14} />
        {PRIVACY_LINE}
      </p>
      {credits.length > 0 && <p className={styles.credits}>Photos: {credits.join(' · ')}</p>}

      {askSheet}
      {sheet === 'notifications' && <NotificationsSheet items={notifications} onClose={() => setSheet(null)} />}
      {contextFor && <ContextSheet question={contextFor} onClose={() => setContextFor(null)} />}
    </AppShell>
  );
}
