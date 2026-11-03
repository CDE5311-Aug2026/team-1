// Pure state for the independent v5 rooms. No DOM, timers, localStorage, global
// inventory or original-route progress is read or modified here.

const MAX_SEQUENCE_INPUT=32;
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const unique=values=>[...new Set(values)];
const mechanismFor=(room,id)=>room.mechanisms.find(mechanism=>mechanism.id===id);
const objectFor=(room,id)=>room.objects.find(object=>object.id===id);
const itemFor=(room,id)=>room.mechanisms.flatMap(mechanism=>mechanism.rewardItems||[]).find(item=>item.id===id);

function requiredItems(mechanism){
  return unique([mechanism.toolId,...(mechanism.consumes||[])].filter(Boolean));
}

function numericValue(value,fallback){
  if(typeof value==='number'&&Number.isFinite(value))return value;
  if(typeof value==='string'&&/^[+-]?\d+(?:\.\d+)?$/.test(value.trim()))return Number(value);
  return fallback;
}

function normalizeValue(mechanism,value){
  if(mechanism.type==='sequence'){
    const ids=new Set((mechanism.options||[]).map(option=>option.id));
    // Keep extra valid actions so an overlong answer cannot silently become a
    // correct prefix. Undo/clear is implemented by passing a shorter/new array.
    return Array.isArray(value)?value.filter(id=>typeof id==='string'&&ids.has(id)).slice(0,MAX_SEQUENCE_INPUT):[];
  }
  const min=mechanism.type==='dial'?0:(mechanism.min??0);
  const max=mechanism.type==='dial'?9:(mechanism.max??100);
  const step=mechanism.type==='dial'?1:(mechanism.step??1);
  const input=Array.isArray(value)?value:[];
  return [0,1,2].map(index=>{
    const number=Math.max(min,Math.min(max,numericValue(input[index],min)));
    const snapped=min+Math.round((number-min)/step)*step;
    return Math.max(min,Math.min(max,Number(snapped.toFixed(8))));
  });
}

function inspectionEntry(object){
  const text=object.kind==='clue'?(object.clue||object.detail):object.detail;
  return `查看「${object.name}」：${text||object.description}`;
}

function completionEntry(mechanism){
  const rewards=(mechanism.rewardItems||[]).map(item=>item.name).join('、');
  return `完成「${mechanism.title}」：${mechanism.successText}${rewards?` 获得：${rewards}。`:''}`;
}

// Inventory is a replay of accepted solved mechanisms, never a bag of trusted
// IDs from storage. This restores earned items, removes installed/consumed
// items and rejects unearned or cross-room injected item IDs on re-entry.
function replaySolved(room,claimed){
  const requested=new Set(Array.isArray(claimed)?claimed.filter(id=>typeof id==='string'):[]);
  const solved=[],inventory=[];
  let changed=true;
  while(changed){
    changed=false;
    for(const mechanism of room.mechanisms){
      if(!requested.has(mechanism.id)||solved.includes(mechanism.id))continue;
      if(!(mechanism.requires||[]).every(id=>solved.includes(id)))continue;
      if(!requiredItems(mechanism).every(id=>inventory.includes(id)))continue;
      solved.push(mechanism.id);
      for(const id of mechanism.consumes||[]){const index=inventory.indexOf(id);if(index!==-1)inventory.splice(index,1);}
      for(const item of mechanism.rewardItems||[])if(!inventory.includes(item.id))inventory.push(item.id);
      changed=true;
    }
  }
  return {solved,inventory};
}

/** Return a fresh canonical state. journal entries are renderable Chinese strings. */
export function createRoomState(room){
  return normalizeRoomState(room,null);
}

/** Sanitize saved room progress and deterministically restore earned inventory. */
export function normalizeRoomState(room,raw){
  const source=isRecord(raw)?raw:{};
  const {solved,inventory}=replaySolved(room,source.solved);
  const validObjects=new Set(room.objects.map(object=>object.id));
  const seen=unique([
    ...(Array.isArray(source.seen)?source.seen.filter(id=>typeof id==='string'&&validObjects.has(id)):[]),
    ...solved.map(id=>mechanismFor(room,id).objectId)
  ]);
  const sourceValues=isRecord(source.values)?source.values:{};
  const values=Object.fromEntries(room.mechanisms.map(mechanism=>[
    mechanism.id,
    solved.includes(mechanism.id)?[...mechanism.answer]:normalizeValue(mechanism,sourceValues[mechanism.id])
  ]));
  const expectedJournal=[
    ...seen.map(id=>inspectionEntry(objectFor(room,id))),
    ...solved.map(id=>completionEntry(mechanismFor(room,id)))
  ];
  const allowed=new Set(expectedJournal);
  const previous=Array.isArray(source.journal)?source.journal.filter(entry=>typeof entry==='string'&&allowed.has(entry)):[];
  const journal=unique([...previous,...expectedJournal]);
  return {seen,solved,inventory,values,journal};
}

/** Reading is idempotent and never solves a mechanism or grants an item. */
export function inspectObject(room,state,id){
  const next=normalizeRoomState(room,state),object=objectFor(room,id);
  if(!object||next.seen.includes(id))return next;
  next.seen.push(id);
  next.journal.push(inspectionEntry(object));
  return next;
}

/** Values can be rehearsed while locked. Solved mechanisms stay immutable. */
export function setMechanismValue(room,state,id,value){
  const next=normalizeRoomState(room,state),mechanism=mechanismFor(room,id);
  if(!mechanism||next.solved.includes(id))return next;
  next.values[id]=normalizeValue(mechanism,value);
  return next;
}

function statusFor(room,state,mechanism){
  if(!mechanism)return {locked:true,reason:'没有找到这个机关。',solved:false,ready:false};
  if(state.solved.includes(mechanism.id))return {locked:false,reason:'这个机关已完成，不会重复发放物品。',solved:true,ready:false};
  const missing=(mechanism.requires||[]).filter(id=>!state.solved.includes(id));
  if(missing.length){
    const names=missing.map(id=>mechanismFor(room,id)?.title||id).join('、');
    return {locked:true,reason:`先完成「${names}」，再提交这里的答案。`,solved:false,ready:false};
  }
  const tools=requiredItems(mechanism).filter(id=>!state.inventory.includes(id));
  if(tools.length){
    const names=tools.map(id=>itemFor(room,id)?.name||id).join('、');
    return {locked:true,reason:`需要携带「${names}」才能操作。`,solved:false,ready:false};
  }
  if(mechanism.type==='sequence'&&state.values[mechanism.id].length!==mechanism.answer.length){
    return {locked:false,reason:`这道工序需要${mechanism.answer.length}步，当前已选${state.values[mechanism.id].length}步；可以撤回或清空重排。`,solved:false,ready:false};
  }
  // ready means structurally submittable, NOT that the answer is correct.
  return {locked:false,reason:'可以提交当前设置。',solved:false,ready:true};
}

export function getMechanismStatus(room,state,id){
  return statusFor(room,normalizeRoomState(room,state),mechanismFor(room,id));
}

function answerMatches(mechanism,value){
  if(mechanism.type==='align')return mechanism.answer.every((answer,index)=>Math.abs(value[index]-answer)<=(mechanism.tolerance?.[index]??0));
  return value.length===mechanism.answer.length&&mechanism.answer.every((answer,index)=>value[index]===answer);
}

/** Gate, compare and commit atomically. Wrong answers never consume tools. */
export function submitMechanism(room,state,id){
  const next=normalizeRoomState(room,state),mechanism=mechanismFor(room,id);
  const status=statusFor(room,next,mechanism);
  if(status.solved)return {state:next,ok:true,message:status.reason};
  if(status.locked||!status.ready)return {state:next,ok:false,message:status.reason};
  if(!answerMatches(mechanism,next.values[id])){
    const message=mechanism.type==='sequence'?'工序顺序还不匹配。可以撤回一步或清空，再核对线索。':mechanism.type==='align'?'还有标记没有对齐。请分别核对三个目标，再试一次。':'拨轮组合还不匹配。请核对标签的读取顺序，再试一次。';
    return {state:next,ok:false,message};
  }
  next.solved.push(id);
  if(!next.seen.includes(mechanism.objectId))next.seen.push(mechanism.objectId);
  // Replaying the solved ledger commits consumption and rewards exactly once.
  const committed=normalizeRoomState(room,next);
  return {state:committed,ok:true,message:mechanism.successText};
}
