import {normalizeOnsite,onsiteStorageKey} from './onsite-state.js';
import {SAVES_CLEARED} from '../../../data/deviceKeys';
const memory=new Map();
window.addEventListener(SAVES_CLEARED,()=>{memory.clear();});
// Hunt (10 Nov 2026): remote play is gone; every stop is checked in on site with a photo, so the mode is always manual.
export function preferredOnsiteMode(){return 'manual';}
export function readOnsite(routeId,stops,mode=preferredOnsiteMode(routeId)){
 const key=onsiteStorageKey(routeId,mode);
 try{return normalizeOnsite(memory.has(key)?memory.get(key):JSON.parse(localStorage.getItem(key)||'null'),routeId,stops,mode);}catch{return normalizeOnsite(null,routeId,stops,mode);}
}
export function saveOnsite(state){
 const key=onsiteStorageKey(state.routeId,state.mode);memory.set(key,state);
 try{localStorage.setItem(key,JSON.stringify(state));return true;}catch{return false;}
}
export function emitOnsiteEvent(type,state,stopId){window.dispatchEvent(new CustomEvent('findsg:onsite-event',{detail:{schemaVersion:1,type,routeId:state.routeId,stopId,mode:state.mode,completedStopIds:[...state.completed],arrivalVerification:'photo-recognised'}}));}
