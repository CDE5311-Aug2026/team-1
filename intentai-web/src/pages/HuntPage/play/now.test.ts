import { SAVES_CLEARED } from '../../../data/deviceKeys';
import { loadHunt, passStop, startHunt } from './model';
import { nowLine } from './now';

const photo = { name: 'stop.jpg', type: 'image/jpeg', size: 1000 };

beforeEach(() => {
  localStorage.clear();
  window.dispatchEvent(new Event(SAVES_CLEARED));
});

it('says to read the letter on the opening', () => {
  expect(nowLine(loadHunt('short')!)).toEqual({ label: 'Now · Opening', text: 'Read the letter, then tap Start the hunt.' });
});

it('at a stop: where to go, then the stop’s own detail to photograph', () => {
  startHunt('short');
  const hunt = loadHunt('short')!;
  const stop = hunt.stops[0];
  expect(stop.address).not.toBe('');
  expect(nowLine(hunt)).toEqual({
    label: `Now · Stop 1 of ${hunt.stops.length}`,
    text: `Go to ${stop.address}, then photograph: ${stop.target}`,
  });
});

it('follows the photo check: checking, not recognised (with the hint), unavailable', () => {
  startHunt('telok-ayer');
  const hunt = loadHunt('telok-ayer')!;
  expect(nowLine(hunt, 'checking').text).toBe('Checking your photo…');
  expect(nowLine(hunt, 'no-match').text).toBe(
    `Not recognised — reframe the detail and take another photo${hunt.stops[0].hint ? '; tap Hint if stuck' : ''}.`,
  );
  expect(nowLine(hunt, 'unavailable').text).toMatch(/Try again or take a new photo/);
});

it('moves on with the stop and ends on the medals', () => {
  startHunt('short');
  passStop('short', 'short-press', photo);
  const second = loadHunt('short')!;
  expect(nowLine(second).label).toBe('Now · Stop 2 of 2');
  expect(nowLine(second).text).toContain(second.stops[1].target);
  passStop('short', 'short-mosque', photo);
  expect(nowLine(loadHunt('short')!)).toEqual({ label: 'Now · Finished', text: 'Hunt finished — see your medals.' });
});
