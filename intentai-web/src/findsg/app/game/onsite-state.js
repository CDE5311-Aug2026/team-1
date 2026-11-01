import {createQuestState,reduceQuest,isQuestSolved} from './quest-logic.js';

// Local prototype progress: manual arrivals are self-reported, never GPS checks.
// Preview records have their own key and cannot be promoted to manual visits.
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const listOf=stops=>Array.isArray(stops)?stops:[];
const validMode=mode=>mode==='manual'||mode==='preview';
const modeOf=mode=>validMode(mode)?mode:'manual';
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const smallText=(value,max=240)=>typeof value==='string'?value.slice(0,max):'';

export const onsiteStorageKey=(routeId,mode='manual')=>`findsg-onsite-v1:${routeId}:${modeOf(mode)}`;

export function blankOnsite(routeId,mode='manual'){
 return {version:1,routeId,mode:modeOf(mode),started:false,stopIndex:0,stops:{},completed:[],inventory:[],endingSeen:false,feedback:''};
}

const emptyRecord=quest=>({checkin:null,observation:{confirmed:false,method:null,confirmedAt:null,photos:[]},puzzle:createQuestState(quest),actions:[]});
const validRoute=(routeId,stops)=>typeof routeId==='string'&&routeId.length>0&&stops.length>0&&
 stops.every(stop=>isRecord(stop)&&typeof stop.id==='string'&&stop.id.startsWith(routeId+'-')&&isRecord(stop.quest))&&
 new Set(stops.map(stop=>stop.id)).size===stops.length;

// Persist only the semantic action fields consumed by the shared mechanism rules.
// Camera motion, pointer streams, DOM objects and arbitrary solved flags stay out.
function actionCopy(action){
 if(!isRecord(action))return null;
 switch(action.type){
  case 'find': return typeof action.id==='string'&&Number.isFinite(action.yaw)?{type:'find',id:action.id,yaw:action.yaw}:null;
  case 'select':case 'collect':case 'pick':return typeof action.id==='string'?{type:action.type,id:action.id}:null;
  case 'align':case 'slide':return typeof action.value==='number'&&Number.isFinite(action.value)?{type:action.type,value:action.value}:null;
  case 'place':return typeof action.id==='string'&&typeof action.slotId==='string'?{type:'place',id:action.id,slotId:action.slotId}:null;
  default:return null;
 }
}

function photoCopy(raw){
 if(!isRecord(raw))return null;
 const name=smallText(raw.name),type=smallText(raw.type,80);
 if(!name||!/^image\//.test(type)||!Number.isFinite(raw.size)||raw.size<0)return null;
 const lastModified=Number.isFinite(raw.lastModified)&&raw.lastModified>=0?raw.lastModified:null;
 const id=smallText(raw.id)||`${name}:${raw.size}:${lastModified??''}`;
 return {id,name,type,size:raw.size,lastModified,addedAt:iso(raw.addedAt),storage:'metadata-only',verified:false};
}

function cleanRecord(raw,stop,mode){
 const record=emptyRecord(stop.quest);
 if(!isRecord(raw)||!isRecord(raw.checkin)||raw.checkin.mode!==mode)return record;
 record.checkin={mode,method:mode==='manual'?'manual-self-report':'online-preview',confirmedAt:iso(raw.checkin.confirmedAt),countsAsVisit:mode==='manual'};
 const observation=isRecord(raw.observation)?raw.observation:{};
 if(observation.confirmed===true){
  record.observation.confirmed=true;
  record.observation.method=mode==='manual'?'manual-self-report':'demo';
  record.observation.confirmedAt=iso(observation.confirmedAt);
 }
 const seen=new Set();
 for(const photo of Array.isArray(observation.photos)?observation.photos:[]){
  const clean=photoCopy(photo);if(clean&&!seen.has(clean.id)){seen.add(clean.id);record.observation.photos.push(clean);}
 }
 return record;
}

/** Restore by replaying semantic actions, not by trusting saved puzzle/solved
 * or inventory flags. This is checkpoint consistency, not anti-cheat or proof
 * that someone visited a real location. */
export function normalizeOnsite(raw,routeId,stops=[],mode='manual'){
 const list=listOf(stops),next=blankOnsite(routeId,mode);
 if(!validRoute(routeId,list))return next;
 for(const stop of list)next.stops[stop.id]=emptyRecord(stop.quest);
 if(!isRecord(raw)||raw.version!==1||raw.routeId!==routeId||raw.mode!==next.mode||!isRecord(raw.stops))return next;
 next.started=raw.started===true;
 next.feedback=smallText(raw.feedback,600);
 let previousSolved=true;
 for(const stop of list){
  const saved=raw.stops[stop.id],record=cleanRecord(saved,stop,next.mode);
  next.stops[stop.id]=record;
  if(record.checkin)next.started=true;
  if(previousSolved&&record.checkin&&record.observation.confirmed){
   for(const proposed of Array.isArray(saved?.actions)?saved.actions:[]){
    if(isQuestSolved(stop.quest,record.puzzle))break;
    const action=actionCopy(proposed);if(!action)continue;
    const result=reduceQuest(stop.quest,record.puzzle,action);
    if(result.ok){record.puzzle=result.state;record.actions.push(action);}
   }
  }
  const solved=previousSolved&&isQuestSolved(stop.quest,record.puzzle);
  if(solved){
   next.completed.push(stop.id);
   const rewardId=typeof stop.reward?.id==='string'?stop.reward.id:`${stop.id}-onsite-discovery`;
   if(!next.inventory.includes(rewardId))next.inventory.push(rewardId);
  }
  previousSolved=solved;
 }
 const done=next.completed.length,last=list.length-1;
 next.stopIndex=done>0&&raw.stopIndex===done-1?done-1:Math.min(done,last);
 next.endingSeen=done===list.length&&raw.endingSeen===true&&raw.stopIndex===last;
 return next;
}

const canonical=(state,stops)=>normalizeOnsite(state,state?.routeId||'',stops,state?.mode||'manual');
const updateRecord=(state,id,record,extra={})=>({...state,stops:{...state.stops,[id]:record},...extra});

export function beginOnsite(state){
 if(!isRecord(state)||state.version!==1||!validMode(state.mode))return blankOnsite(state?.routeId||'');
 return {...state,started:true,feedback:''};
}

export function checkInOnsite(state,stopId,stops,options={}){
 const next=canonical(state,stops),record=next.stops[stopId],mode=options.mode??next.mode;
 if(!record)return next;
 if(mode!==next.mode)return {...next,feedback:'On-site and remote progress are saved separately. Switch mode first, then start this stop.'};
 if(record.checkin)return next;
 return updateRecord(next,stopId,{...record,checkin:{mode,method:mode==='manual'?'manual-self-report':'online-preview',confirmedAt:iso(options.confirmedAt),countsAsVisit:mode==='manual'}},{started:true,feedback:''});
}

export function observeOnsite(state,stopId,stops,options={}){
 const next=canonical(state,stops),record=next.stops[stopId];
 if(!record?.checkin)return {...next,feedback:'Check in with the place button first, then confirm your observation.'};
 if(record.observation.confirmed)return next;
 return updateRecord(next,stopId,{...record,observation:{...record.observation,confirmed:true,method:next.mode==='manual'?'manual-self-report':'demo',confirmedAt:iso(options.confirmedAt)}},{feedback:''});
}

/** The UI owns ephemeral photo blobs. Metadata does not confirm observation or
 * provide AI/location verification, and no data/blob URL enters the save. */
export function addOnsitePhoto(state,stopId,metadata,stops){
 const next=canonical(state,stops),record=next.stops[stopId],photo=photoCopy(metadata);
 if(!record?.checkin||!photo)return next;
 const photos=record.observation.photos.filter(item=>item.id!==photo.id);
 photos.push(photo);
 return updateRecord(next,stopId,{...record,observation:{...record.observation,photos}});
}

export function operateOnsite(state,stopId,proposed,stops){
 const next=canonical(state,stops),list=listOf(stops),stop=list.find(item=>item.id===stopId),record=next.stops[stopId];
 const reject=message=>({state:{...next,feedback:message},ok:false,message});
 if(!stop||!record)return reject('This place has no mechanism to use.');
 if(next.completed.includes(stopId))return {state:next,ok:true,message:'You already have the clue from this stop.'};
 if(!record.checkin)return reject('Check in with the place button before using the building scene.');
 if(!record.observation.confirmed)return reject('Observe the detail on site and confirm it to unlock the mechanism.');
 if(list[next.stopIndex]?.id!==stopId)return reject('Finish the mechanism here before taking the clue to the next stop.');
 const action=actionCopy(proposed);
 if(!action)return reject('Use the parts in the scene directly.');
 const result=reduceQuest(stop.quest,record.puzzle,action);
 if(!result.ok)return reject(result.message);
 const updated=updateRecord(next,stopId,{...record,puzzle:result.state,actions:[...record.actions,action]},{feedback:result.message});
 return {state:normalizeOnsite(updated,next.routeId,list,next.mode),ok:true,message:result.message};
}

export function advanceOnsite(state,stops){
 const next=canonical(state,stops),list=listOf(stops),stop=list[next.stopIndex];
 if(!stop||!next.completed.includes(stop.id))return next;
 if(next.completed.length===list.length)return {...next,endingSeen:true,feedback:''};
 return {...next,stopIndex:next.completed.length,feedback:''};
}

/** These are states within the same location scene, not separate UI pages. */
export function onsiteStatus(state,stopId,stops){
 const next=canonical(state,stops),list=listOf(stops),record=next.stops[stopId];
 if(next.endingSeen&&stopId===list[list.length-1]?.id)return 'ending';
 if(next.completed.includes(stopId))return 'reward';
 if(!record?.checkin)return 'arrival';
 if(!record.observation.confirmed)return 'observe';
 return 'puzzle';
}

export function onsiteStats(state,stops){
 const next=canonical(state,stops),records=Object.values(next.stops),checked=records.filter(record=>record.checkin);
 return {mode:next.mode,total:listOf(stops).length,checkedIn:checked.length,observed:records.filter(record=>record.observation.confirmed).length,
  completed:next.completed.length,cards:next.inventory.length,manualVisits:checked.filter(record=>record.checkin.countsAsVisit).length,
  previewStops:checked.filter(record=>record.checkin.mode==='preview').length,allComplete:listOf(stops).length>0&&next.completed.length===listOf(stops).length};
}
