import {blankField,normalizeField,fieldStorageKey} from './field-state.js';
// Client-only session cache keeps export usable when persistent storage is full.
const sessionRecords=new Map();
export function readField(routeId,mode,stops){
 const key=fieldStorageKey(routeId,mode);
 if(sessionRecords.has(key))return normalizeField(sessionRecords.get(key),routeId,mode,stops);
 try{return normalizeField(JSON.parse(localStorage.getItem(key)||'null'),routeId,mode,stops);}
 catch{return normalizeField(blankField(routeId,mode),routeId,mode,stops);}
}
export function storeField(state){
 const key=fieldStorageKey(state.routeId,state.mode);sessionRecords.set(key,state);
 try{localStorage.setItem(key,JSON.stringify(state));return true;}
 catch{return false;}
}
export function mapSearch(place){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place.english_name+' '+place.address);}
export function walkTo(place,from){return 'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination='+encodeURIComponent(place.english_name+' '+place.address)+(from?'&origin='+encodeURIComponent(from.english_name+' '+from.address):'');}
