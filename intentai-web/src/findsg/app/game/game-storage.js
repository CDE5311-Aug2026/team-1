import {blankGame,normalizeGame} from './game-state.js';

const sessionGames=new Map();
export const gameStorageKey=routeId=>`findsg-story-cards-v1:${routeId}`;
export function readGame(routeId,stops){
 const key=gameStorageKey(routeId);
 if(sessionGames.has(key))return normalizeGame(sessionGames.get(key),routeId,stops);
 try{return normalizeGame(JSON.parse(localStorage.getItem(key)||'null'),routeId,stops);}
 catch{return blankGame(routeId);}
}
export function saveGame(state){
 const key=gameStorageKey(state.routeId);sessionGames.set(key,state);
 try{localStorage.setItem(key,JSON.stringify(state));return true;}catch{return false;}
}
export function notifyStoryEvent(type,state,stopId){
 const detail={schemaVersion:1,type,routeId:state.routeId,stopId:stopId||null,stage:state.stage,
  completedStopIds:[...state.completed],mode:'story-preview',countsAsVisit:false};
 window.dispatchEvent(new CustomEvent('findsg:story-event',{detail}));
}
