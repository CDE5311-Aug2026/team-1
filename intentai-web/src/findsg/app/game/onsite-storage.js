import {normalizeOnsite,onsiteStorageKey} from './onsite-state.js';
import {SAVES_CLEARED} from '../../../data/deviceKeys';
const memory=new Map(),modeMemory=new Map();
window.addEventListener(SAVES_CLEARED,()=>{memory.clear();modeMemory.clear();});
export function preferredOnsiteMode(routeId){if(modeMemory.has(routeId))return modeMemory.get(routeId);try{return localStorage.getItem('findsg-onsite-mode:'+routeId)==='preview'?'preview':'manual';}catch{return 'manual';}}
export function readOnsite(routeId,stops,mode=preferredOnsiteMode(routeId)){
 const key=onsiteStorageKey(routeId,mode);
 try{return normalizeOnsite(memory.has(key)?memory.get(key):JSON.parse(localStorage.getItem(key)||'null'),routeId,stops,mode);}catch{return normalizeOnsite(null,routeId,stops,mode);}
}
export function saveOnsite(state){
 const key=onsiteStorageKey(state.routeId,state.mode);memory.set(key,state);modeMemory.set(state.routeId,state.mode);
 try{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('findsg-onsite-mode:'+state.routeId,state.mode);return true;}catch{return false;}
}
export function emitOnsiteEvent(type,state,stopId){window.dispatchEvent(new CustomEvent('findsg:onsite-event',{detail:{schemaVersion:1,type,routeId:state.routeId,stopId,mode:state.mode,completedStopIds:[...state.completed],arrivalVerification:state.mode==='manual'?'self-reported':'online-preview'}}));}
