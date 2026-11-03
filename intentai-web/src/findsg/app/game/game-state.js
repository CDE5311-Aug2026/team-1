// Pure state for the story-card game. This is virtual story progress only:
// no arrival records, location permissions, field storage or GPS claims.
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const rows=stops=>Array.isArray(stops)?stops:[];
const cloneAnswer=value=>Array.isArray(value)?value.slice():value;
const knownStages=new Set(['scene','inspect','challenge']);

export function gameStorageKey(routeId){return `findsg-story-cards-v1:${routeId}`;}

export function blankGame(routeId){
 return {version:1,routeId,started:false,stage:'prologue',stopIndex:0,inspected:false,answer:null,feedback:'',completed:[],inventory:[],solutions:{},endingSeen:false};
}

export const restartGame=blankGame;

function validRoute(routeId,stops){
 return typeof routeId==='string'&&routeId.length>0&&stops.length>0&&
  new Set(stops.map(stop=>stop.id)).size===stops.length&&
  stops.every(stop=>typeof stop.id==='string'&&stop.id.replace(/-\d+$/,'')===routeId);
}

function cleanAnswer(value,task={}){
 if(value===null||value===undefined)return null;
 const validIds=new Set((task.options||[]).map(option=>option.id));
 if(task.kind==='choice')return typeof value==='string'&&validIds.has(value)?value:null;
 if(task.kind==='sequence')return Array.isArray(value)&&value.every(id=>typeof id==='string'&&validIds.has(id))?value.slice(0,64):null;
 if(task.kind==='align'){
  const parsed=typeof value==='number'?value:typeof value==='string'&&/^[+-]?\d+(?:\.\d+)?$/.test(value.trim())?Number(value):NaN;
  return Number.isFinite(parsed)?Math.max(0,Math.min(100,parsed)):null;
 }
 return null;
}

function matches(value,task={}){
 if(task.kind==='choice')return typeof value==='string'&&value===task.answer;
 if(task.kind==='sequence')return Array.isArray(value)&&Array.isArray(task.answer)&&value.length===task.answer.length&&task.answer.every((id,i)=>value[i]===id);
 if(task.kind==='align')return typeof value==='number'&&Number.isFinite(task.answer)&&Math.abs(value-task.answer)<=(Number.isFinite(task.tolerance)?Math.max(0,task.tolerance):0);
 return false;
}

/** Restore a coherent checkpoint, not an arbitrary collection of unlock flags.
 * Accepted-answer receipts rebuild the continuous completed prefix and cards.
 * Local save validation is not an anti-cheat or visit-verification mechanism. */
export function normalizeGame(raw,routeId,stops=[]){
 const list=rows(stops),next=blankGame(routeId);
 if(!validRoute(routeId,list)||!isRecord(raw)||raw.version!==1||raw.routeId!==routeId||raw.started!==true)return next;
 next.started=true;
 const claimed=Array.isArray(raw.completed)?raw.completed:[];
 const receipts=isRecord(raw.solutions)?raw.solutions:{};
 for(let i=0;i<list.length;i++){
  const stop=list[i],answer=cleanAnswer(receipts[stop.id],stop.task);
  if(claimed[i]!==stop.id||!matches(answer,stop.task))break;
  next.completed.push(stop.id);next.solutions[stop.id]=cloneAnswer(answer);
  if(typeof stop.reward?.id==='string'&&!next.inventory.includes(stop.reward.id))next.inventory.push(stop.reward.id);
 }
 const done=next.completed.length,last=list.length-1;
 const validIndex=Number.isInteger(raw.stopIndex);
 if(done===list.length){
  next.stopIndex=last;
  next.stage=raw.stage==='ending'&&raw.endingSeen===true&&validIndex&&raw.stopIndex===last?'ending':'reward';
  next.inspected=true;next.answer=cloneAnswer(next.solutions[list[last].id]);
  next.endingSeen=next.stage==='ending';
 }else if(done>0&&raw.stage==='reward'&&validIndex&&raw.stopIndex===done-1){
  next.stopIndex=done-1;next.stage='reward';next.inspected=true;
  next.answer=cloneAnswer(next.solutions[list[done-1].id]);
 }else{
  next.stopIndex=done;
  const sameCheckpoint=validIndex&&raw.stopIndex===done;
  next.stage=sameCheckpoint&&knownStages.has(raw.stage)?raw.stage:'scene';
  if(next.stage==='challenge'&&raw.inspected!==true)next.stage='inspect';
  next.inspected=(next.stage==='inspect'||next.stage==='challenge')&&sameCheckpoint&&raw.inspected===true;
  next.answer=next.stage==='challenge'?cleanAnswer(raw.answer,list[done].task):null;
  next.feedback=sameCheckpoint&&typeof raw.feedback==='string'?raw.feedback.slice(0,600):'';
 }
 if(next.stage==='reward')next.feedback=list[next.stopIndex].task?.success||'Clue card collected.';
 return next;
}

const canonical=(state,stops)=>normalizeGame(state,state?.routeId||'',stops);

export function beginGame(state,stops){
 const next=canonical(state,stops);
 if(next.started||!validRoute(next.routeId,rows(stops)))return next;
 return {...next,started:true,stage:'scene'};
}

/** A single forward action; no station or chapter can be jumped over. */
export function advanceGame(state,stops){
 const next=canonical(state,stops),list=rows(stops);
 if(!next.started)return next;
 if(next.stage==='scene')return {...next,stage:'inspect',inspected:false,answer:null,feedback:''};
 if(next.stage==='inspect'&&next.inspected)return {...next,stage:'challenge',answer:null,feedback:''};
 if(next.stage==='reward'){
  if(next.completed.length===list.length)return {...next,stage:'ending',endingSeen:true,feedback:''};
  return {...next,stage:'scene',stopIndex:next.completed.length,inspected:false,answer:null,feedback:''};
 }
 return next;
}

/** Reveal the virtual clue object. It never records a real-place visit. */
export function inspectGame(state,stops){
 const next=canonical(state,stops);
 return next.started&&next.stage==='inspect'?{...next,inspected:true,feedback:''}:next;
}

export function setGameAnswer(state,value,stops){
 const next=canonical(state,stops),stop=rows(stops)[next.stopIndex];
 if(next.stage!=='challenge'||!next.inspected||!stop)return next;
 return {...next,answer:cleanAnswer(value,stop.task),feedback:''};
}

export function submitGame(state,stops){
 const next=canonical(state,stops),list=rows(stops),stop=list[next.stopIndex];
 if(next.stage==='reward'||next.stage==='ending')return {state:next,ok:true,message:next.stage==='ending'?'This story is complete.':'You already have this clue card; it is only given once.'};
 if(!next.started||!stop)return {state:next,ok:false,message:'Open the story’s prologue first.'};
 if(next.stage!=='challenge'||!next.inspected)return {state:next,ok:false,message:'Open the scene and tap the clue object first, then decide.'};
 if(!matches(next.answer,stop.task)){
  const message=stop.task?.wrong||'That answer does not quite fit the clues yet. Look back at the evidence and try again.';
  return {state:{...next,feedback:message},ok:false,message};
 }
 const completed=[...next.completed,stop.id];
 const solved=normalizeGame({...next,stage:'reward',completed,solutions:{...next.solutions,[stop.id]:cloneAnswer(next.answer)},feedback:stop.task?.success||'Clue card collected.'},next.routeId,list);
 return {state:solved,ok:true,message:solved.feedback};
}
