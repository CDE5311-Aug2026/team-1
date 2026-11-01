// The short story has its own progress. Paper presentation never creates a visit.
export const SHORT_ID = 'gold-under-glass';
const modeOf = value => value === 'manual' ? 'manual' : 'preview';
export const shortKey = mode => `findsg-short-v1:${SHORT_ID}:${modeOf(mode)}`;
export function emptyShort(mode = 'preview') {
  return {version:1,episodeId:SHORT_ID,mode:modeOf(mode),ticket:false,letter:false,arrival1:false,arch:false,book:false,travel:false,arrival2:false,band:false,parcel:false,bottle:false,ending:false};
}
export function normalizeShort(raw, mode = 'preview') {
  const s=emptyShort(mode),r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  if(r.episodeId!==SHORT_ID||r.mode!==s.mode)return s;
  s.ticket=r.ticket===true;
  s.letter=s.ticket&&r.letter===true;
  s.arrival1=s.ticket&&r.arrival1===true;
  s.arch=s.arrival1&&r.arch===true;
  s.book=s.arch&&r.book===true;
  s.travel=s.book&&r.travel===true;
  s.arrival2=s.travel&&r.arrival2===true;
  s.band=s.arrival2&&r.band===true;
  s.parcel=s.band&&r.parcel===true;
  s.bottle=s.parcel&&r.bottle===true;
  s.ending=s.bottle&&r.ending===true;
  return s;
}
export function shortTransition(state, action) {
  const s=normalizeShort(state,state?.mode),type=typeof action==='string'?action:action?.type;
  if(type==='reset')return emptyShort(s.mode);
  const rules={ticket:['ticket',true],letter:['letter',s.ticket],checkin1:['arrival1',s.ticket],arch:['arch',s.arrival1],book:['book',s.arch],travel:['travel',s.book],checkin2:['arrival2',s.travel],band:['band',s.arrival2],parcel:['parcel',s.band],bottle:['bottle',s.parcel],ending:['ending',s.bottle]};
  const rule=rules[type];if(!rule||!rule[1]||s[rule[0]])return s;
  return normalizeShort({...s,[rule[0]]:true},s.mode);
}
export function readShort(mode='preview',storage) {
  try{return normalizeShort(JSON.parse((storage||window.localStorage).getItem(shortKey(mode))||'null'),mode);}catch{return emptyShort(mode);}
}
export function saveShort(state,storage) {
  const s=normalizeShort(state,state?.mode);
  try{(storage||window.localStorage).setItem(shortKey(s.mode),JSON.stringify(s));return true;}catch{return false;}
}
export function shortPosition(s){return s.ending?'ending':!s.ticket?'cover':s.travel?'second':'first';}
export function shortCount(s){return Number(s.book)+Number(s.bottle);}
