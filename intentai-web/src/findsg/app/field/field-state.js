// Browser-local, route-based progress. Field arrivals are the visitor's own
// declaration, not GPS or identity verification. Preview and field progress
// never merge, and this module never reads storage or asks for a location.

const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const modeOf=mode=>mode==='preview'?'preview':'field';
const rows=stops=>Array.isArray(stops)?stops:[];
const freshStop=()=>({arrived:false,observed:false,solved:false,choice:'',sequence:[],value:50});
const indexOf=(stops,id)=>rows(stops).findIndex(stop=>stop.id===id);
const numeric=value=>typeof value==='number'?value:typeof value==='string'&&/^[+-]?\d+(?:\.\d+)?$/.test(value.trim())?Number(value):NaN;

export function fieldStorageKey(routeId,mode='field'){
 return `findsg-field-v1:${routeId}:${modeOf(mode)}`;
}

export function blankField(routeId,mode='field'){
 return {version:1,routeId,mode:modeOf(mode),selected:0,stops:{},inventory:[],journal:[]};
}

function cleanAnswer(raw,stop){
 const options=new Set((stop.task?.options||[]).map(option=>option.id));
 const value=numeric(raw.value);
 return {
  choice:typeof raw.choice==='string'&&options.has(raw.choice)?raw.choice:'',
  sequence:Array.isArray(raw.sequence)?raw.sequence.filter(id=>typeof id==='string'&&options.has(id)).slice(0,64):[],
  value:Number.isFinite(value)?Math.max(0,Math.min(100,value)):50
 };
}

function correct(stop,entry){
 const task=stop.task||{};
 if(task.kind==='choice')return typeof task.answer==='string'&&entry.choice===task.answer;
 if(task.kind==='sequence')return Array.isArray(task.answer)&&entry.sequence.length===task.answer.length&&task.answer.every((id,index)=>entry.sequence[index]===id);
 if(task.kind==='align')return Number.isFinite(task.answer)&&Math.abs(entry.value-task.answer)<=Math.max(0,task.tolerance??0);
 return false;
}

/** Rebuild a legal continuous route and derive its inventory from completions.
 * This is storage consistency checking, not tamper-proof visit verification. */
export function normalizeField(raw,routeId,mode='field',stops=[]){
 const targetMode=modeOf(mode),list=rows(stops);
 const source=record(raw)&&raw.routeId===routeId&&raw.mode===targetMode?raw:{};
 const saved=record(source.stops)?source.stops:{};
 const next=blankField(routeId,targetMode);
 const selected=numeric(source.selected);
 next.selected=list.length?Math.max(0,Math.min(list.length-1,Number.isFinite(selected)?Math.trunc(selected):0)):0;
 let chainOpen=true;
 for(const stop of list){
  const previous=record(saved[stop.id])?saved[stop.id]:{};
  const answer=cleanAnswer(previous,stop),entry={...freshStop(),...answer};
  // No future arrival or completion may survive a broken preceding station.
  entry.arrived=chainOpen&&previous.arrived===true;
  entry.observed=entry.arrived&&previous.observed===true;
  entry.solved=entry.observed&&previous.solved===true&&correct(stop,entry);
  if(!entry.arrived){entry.choice='';entry.sequence=[];entry.value=50;}
  next.stops[stop.id]=entry;
  const name=stop.title||stop.id;
  if(entry.arrived)next.journal.push(`${targetMode==='preview'?'Previewed online':'Arrival noted'}: ${name}`);
  if(entry.observed)next.journal.push(`Checked the observation hint and evidence: ${name}`);
  if(entry.solved){
   next.journal.push(`Place task completed: ${name}`);
   if(stop.reward?.id&&!next.inventory.includes(stop.reward.id))next.inventory.push(stop.reward.id);
  }
  chainOpen=chainOpen&&entry.solved;
 }
 return next;
}

function canonical(state,stops){
 return normalizeField(state,state?.routeId||'',state?.mode,stops);
}

/** Arrival only opens this station's observation step; it never grants a card. */
export function arriveAt(state,stopId,stops){
 const next=canonical(state,stops),list=rows(stops),index=indexOf(list,stopId);
 if(index<0||(index>0&&!next.stops[list[index-1].id].solved))return next;
 next.stops[stopId].arrived=true;
 next.selected=index;
 return canonical(next,list);
}

/** Mark that the visitor has read/used this stop's observation material. */
export function observeAt(state,stopId,stops){
 const next=canonical(state,stops),entry=next.stops[stopId];
 if(!entry?.arrived)return next;
 entry.observed=true;
 return canonical(next,stops);
}

/** Choice ID, ordered option-ID array, or a numeric 0–100 position. */
export function setFieldAnswer(state,stopId,value,stops){
 const next=canonical(state,stops),stop=rows(stops).find(stop=>stop.id===stopId),entry=next.stops[stopId];
 if(!stop||!entry?.arrived||!entry.observed||entry.solved)return next;
 if(stop.task?.kind==='choice')entry.choice=value;
 if(stop.task?.kind==='sequence')entry.sequence=Array.isArray(value)?value.slice():[];
 if(stop.task?.kind==='align')entry.value=value;
 return canonical(next,stops);
}

export function submitField(state,stopId,stops){
 const next=canonical(state,stops),list=rows(stops),index=indexOf(list,stopId),stop=list[index],entry=next.stops[stopId];
 if(!stop||!entry)return {state:next,ok:false,message:'This stop could not be found.'};
 if(index>0&&!next.stops[list[index-1].id].solved)return {state:next,ok:false,message:'Finish the previous stop first to get the clue that leads here.'};
 if(!entry.arrived)return {state:next,ok:false,message:next.mode==='preview'?'Start the online preview for this stop first.':'When you reach the place, record your arrival before you start observing.'};
 if(!entry.observed)return {state:next,ok:false,message:'Check this stop’s observation hint and evidence before you submit an answer.'};
 if(entry.solved)return {state:next,ok:true,message:'This stop is done. Its clue card is in your collection.'};
 if(!correct(stop,entry))return {state:next,ok:false,message:stop.task?.wrong||'That does not match the evidence yet. Look at the observation hint again and try once more.'};
 entry.solved=true;
 return {state:canonical(next,list),ok:true,message:stop.task?.success||'This stop’s clue is filed. You can go on to the next stop.'};
}

/** All stations can be selected for planning; selection does not arrive/solve. */
export function selectFieldStop(state,index,stops){
 return canonical({...canonical(state,stops),selected:index},stops);
}

export function fieldStats(state,stops){
 const next=canonical(state,stops),list=rows(stops),entries=list.map(stop=>next.stops[stop.id]);
 const solved=entries.filter(entry=>entry.solved).length;
 return {
  total:list.length,
  arrived:entries.filter(entry=>entry.arrived).length,
  observed:entries.filter(entry=>entry.observed).length,
  solved,
  unlocked:Math.min(list.length,solved+1),
  nextIndex:entries.findIndex(entry=>!entry.solved),
  complete:list.length>0&&solved===list.length
 };
}
