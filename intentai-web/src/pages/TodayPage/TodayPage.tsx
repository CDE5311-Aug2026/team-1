import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import AppHeader from '../../components/AppHeader/AppHeader';
import Dialog from '../../components/Dialog/Dialog';
import ExpressionCard from '../../components/ExpressionCard/ExpressionCard';
import ExpressionCardExpanded from '../../components/ExpressionCardExpanded/ExpressionCardExpanded';
import NearYouCard from '../../components/NearYouCard/NearYouCard';
import ProgressCard from '../../components/ProgressCard/ProgressCard';
import { staticCopy } from '../../data/expressions';
import { usePersistentStore } from '../../data/persistentStore';
import { DAILY_TOTAL } from '../../data/progress';
import { placeStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import type { Expression } from '../../types';
import styles from './TodayPage.module.css';

interface TodayPageProps {
  /** Today's three, picked from the onboarding topics. */
  expressions: Expression[];
  learnedCount: number;
  /** Ids learned today; the completion pop-up opens only when all of today's phrases are learned. */
  learnedIds?: string[];
  onAdvance: (id: string) => void;
}

type Mode = 'list' | 'stepped';

export default function TodayPage({ expressions, learnedCount, learnedIds = [], onAdvance }: TodayPageProps) {
  const [mode, setMode] = useState<Mode>('list');
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [settings] = usePersistentStore(settingsStore);
  const [place] = usePersistentStore(placeStore);
  const navigate = useNavigate();

  // Fetch all three photos while the list shows, so Next never lands on an empty frame on slow networks.
  const photoUrls = expressions.map((e) => e.photo ?? '').join('|');
  useEffect(() => {
    for (const url of photoUrls.split('|')) {
      if (url) new Image().src = url;
    }
  }, [photoUrls]);

  const handleStart = () => {
    setStepIndex(0);
    setMode('stepped');
  };

  const handleDetail = (index: number) => {
    setStepIndex(index);
    setMode('stepped');
  };

  const handleNext = () => {
    const id = expressions[stepIndex].id;
    onAdvance(id);
    if (stepIndex >= expressions.length - 1) {
      setMode('list');
      setStepIndex(0);
      // Entering at card 3 via Detail reaches the end without learning all three.
      if (new Set([...learnedIds, id]).size >= DAILY_TOTAL) setCompleted(true);
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const current = expressions[stepIndex];

  return (
    <AppShell
      background={mode === 'stepped' ? 'var(--bg-screen-b)' : 'var(--bg-app)'}
      tabBarNodeId="1:317"
      homeIndicatorNodeId={mode === 'list' ? '1:338' : undefined}
    >
        <AppHeader
          onBell={() => navigate(paths.notices)}
          onHome={() => {
            setMode('list');
            setStepIndex(0);
          }}
        />
        {mode === 'stepped' && <h1 className={styles.title}>{staticCopy.title}</h1>}

        {mode === 'list' ? (
          <>
            <ProgressCard variant="full" learnedCount={learnedCount} total={DAILY_TOTAL} onStart={handleStart} title={staticCopy.title} nodeId="1:87" />
            <NearYouCard
              nodeId="18:1949"
              // Figma names the default hawker centre; other picked places show their own name.
              place={place === 'Hawker centre' ? staticCopy.nearYou.place : place}
              subtitle={staticCopy.nearYou.subtitle}
              // Figma notes: Near you opens Nearby when location is on; otherwise the user picks a place first.
              onOpen={() => navigate(settings.location ? paths.nearby : paths.places)}
            />
            <div className={styles.cardGrid}>
              {expressions.map((expression, index) => (
                <ExpressionCard
                  key={expression.id}
                  expression={expression}
                  active={index === 0}
                  onDetail={() => handleDetail(index)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <ProgressCard variant="compact" learnedCount={learnedCount} total={DAILY_TOTAL} nodeId="1:425" />
            <ExpressionCardExpanded
              nodeId="1:478"
              expression={current}
              total={expressions.length}
              current={stepIndex + 1}
              onNext={handleNext}
            />
          </>
        )}

        {completed && (
          // v0 extra kept by owner decision D5 (2026-10-12).
          <Dialog title="Can! You did it." onClose={() => setCompleted(false)}>
            <p>You've learned today's three expressions. Try one in your next conversation.</p>
            <div className="dialog-row">
              <button type="button" className="dialog-primary" onClick={() => navigate(paths.moments)}>
                View your lookups
              </button>
            </div>
          </Dialog>
        )}
    </AppShell>
  );
}
