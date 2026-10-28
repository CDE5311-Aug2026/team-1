import { useEffect, useState } from 'react';
import OnboardingMapFrame from '../../../components/OnboardingMap/OnboardingMapFrame';
import { inBaseBounds } from '../../../components/OnboardingMap/bounds';
import { homePlace } from '../../../data/homePlaces';
import { distanceM } from '../../../features/nearby/geo';
import type { LatLng } from '../../../features/nearby/types';
import { formatDistance, labelFor } from '../areas';
import motion from '../Onboarding.module.css';
import { PHOTOS } from '../options';
import { PreviewCard, PreviewRow } from '../PreviewCard/PreviewCard';
import QuestionHeader from '../QuestionHeader/QuestionHeader';
import styles from './Base.module.css';
import type { StepDef, StepProps } from './types';

export const LOCATE_TOAST = 'Location used once, only for Nearby';

const BERLIN = homePlace('berlin-wall-fragments')!;
/** The step opens with the pin on Berlin Wall Fragments, and Locate does not ask for the device location: it drops there too. */
export const LOCATE_LABEL = BERLIN.name;
const CHINATOWN = homePlace('chinatown')!;

function Body({ data, update, toast }: StepProps) {
  // Counts drops so a re-drop on the same spot still recentres and replays the pin.
  const [drops, setDrops] = useState(0);

  // Pre-pin on arrival; DEFAULT_ONBOARDING keeps base null so a reload still resumes at this step.
  useEffect(() => {
    if (data.base === null) update({ base: { lat: BERLIN.point.lat, lng: BERLIN.point.lng, label: BERLIN.name } });
  }, []);

  const save = (point: LatLng, label: string) => {
    if (!inBaseBounds(point)) return;
    update({ base: { lat: point.lat, lng: point.lng, label } });
    setDrops((d) => d + 1);
  };

  return (
    <>
      <QuestionHeader title="Where do you spend most of your time?" helpers={[{ icon: 'info', text: 'Tap the map to set where Nearby searches from' }]} />
      <div className={`${styles.map} ${motion.aUp}`} style={{ animationDelay: '0.08s' }}>
        <OnboardingMapFrame
          base={data.base}
          drops={drops}
          onDrop={(point) => save(point, labelFor(point))}
          onLocate={() => {
            save(BERLIN.point, LOCATE_LABEL);
            toast(LOCATE_TOAST);
          }}
        />
      </div>
    </>
  );
}

/** Nearer of Berlin Wall Fragments and Chinatown, with the other one's distance (canvas copy). */
function Preview({ data }: StepProps) {
  const { base } = data;
  if (!base) {
    return (
      <PreviewCard kicker="PREVIEW · NEARBY FROM HERE" empty>
        <PreviewRow key="empty" photo={PHOTOS.wall} body="Drop a pin to see what’s closest." />
      </PreviewCard>
    );
  }
  const toWall = distanceM(base, BERLIN.point);
  const toChinatown = distanceM(base, CHINATOWN.point);
  const wallNearer = toWall <= toChinatown;
  const area = labelFor(base).replace(/^Near /, '');
  return (
    <PreviewCard kicker="PREVIEW · NEARBY FROM HERE" empty={false}>
      <PreviewRow
        key={`${base.lat},${base.lng},${base.label}`}
        photo={wallNearer ? PHOTOS.wall : PHOTOS.chinatown}
        title={wallNearer ? BERLIN.name : CHINATOWN.name}
        chip={formatDistance(Math.min(toWall, toChinatown))}
        body={`Closest to ${area}. ${wallNearer ? CHINATOWN.name : BERLIN.name} is ${formatDistance(Math.max(toWall, toChinatown))} away.`}
      />
    </PreviewCard>
  );
}

export const step: StepDef = {
  id: 'base',
  shell: 'question',
  Body,
  Preview,
  answered: (data) => data.base !== null,
  blockedToast: 'Tap the map to drop your pin',
};
