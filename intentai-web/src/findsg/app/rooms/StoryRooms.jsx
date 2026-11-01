import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ROUTES,imageFor} from '../data.js';
import {ROOMS} from './room-content.js';
import {createRoomState,normalizeRoomState,inspectObject,setMechanismValue,submitMechanism,getMechanismStatus} from './room-state.js';
import RoomViewport from './RoomViewport.jsx';
import './rooms.css';

const kindLabel={clue:'剧情线索',mechanism:'可操作机关',prop:'生活物件'};
const itemFrom=(room,id)=>room.mechanisms.flatMap(m=>m.rewardItems||[]).find(item=>item.id===id);
const safeValues=(mechanism,state)=>{
 const saved=state.values[mechanism.id];
 if(Array.isArray(saved))return saved;
 return mechanism.type==='sequence'?[]:mechanism.answer.map(()=>mechanism.min??0);
};

function MechanismControls({mechanism,value,onChange,disabled}){
 if(mechanism.type==='dial')return <div className="room-dial-bank" role="group" aria-label={mechanism.title+'拨轮'}>
  {mechanism.answer.map((_,index)=><div className="room-number-dial" key={index}>
   <span>{mechanism.labels?.[index]||'第'+(index+1)+'位'}</span>
   <button type="button" aria-label={'第'+(index+1)+'位增加'} disabled={disabled} onClick={()=>onChange(value.map((v,i)=>i===index?(v+1)%10:v))}>＋</button>
   <input type="number" min="0" max="9" step="1" inputMode="numeric" aria-label={'第'+(index+1)+'位密码'} value={value[index]??0} disabled={disabled} onChange={e=>{const n=Number(e.target.value);onChange(value.map((v,i)=>i===index?Math.min(9,Math.max(0,Number.isFinite(n)?n:0)):v));}}/>
   <button type="button" aria-label={'第'+(index+1)+'位减少'} disabled={disabled} onClick={()=>onChange(value.map((v,i)=>i===index?(v+9)%10:v))}>−</button>
  </div>)}
 </div>;
 if(mechanism.type==='align')return <div className="room-alignment-console">
  {mechanism.answer.map((_,index)=>{
   const label=mechanism.labels?.[index]||'调节'+(index+1);
   const per=(v,def)=>Array.isArray(v)?v[index]??def:v??def;
   return <label key={index} className="room-range-control"><span><b>{label}</b><output>{value[index]??0}</output></span><input type="range" min={per(mechanism.min,0)} max={per(mechanism.max,100)} step={per(mechanism.step,1)} value={value[index]??0} aria-label={label} disabled={disabled} onChange={e=>onChange(value.map((v,i)=>i===index?Number(e.target.value):v))}/><span className="room-range-ticks"><i>{per(mechanism.min,0)}</i><i>缓慢调节，观察机关</i><i>{per(mechanism.max,100)}</i></span></label>;
  })}
 </div>;
 return <div className="room-sequence-console">
  <div className="room-sequence-slots" role="list" aria-label="已安排的操作顺序">
   {mechanism.answer.map((_,index)=><div key={index} role="listitem" className={value[index]?'filled':''}><small>0{index+1}</small><span>{mechanism.options.find(option=>option.id===value[index])?.label||'待安排'}</span></div>)}
  </div>
  <div className="room-sequence-options">{mechanism.options.map(option=><button key={option.id} type="button" disabled={disabled||value.length>=mechanism.answer.length} onClick={()=>onChange([...value,option.id])}><span>＋</span><b>{option.label}</b>{option.detail&&<small>{option.detail}</small>}</button>)}</div>
  <div className="room-console-secondary"><button type="button" disabled={disabled||!value.length} onClick={()=>onChange(value.slice(0,-1))}>撤回上一步</button><button type="button" disabled={disabled||!value.length} onClick={()=>onChange([])}>重新排列</button></div>
 </div>;
}

function RoomSession({routeId,reducedMotion=false,onReadFacts,onContinue,legacyActionRef,embedded=false}){
 const room=ROOMS[routeId],key='findsg-story-rooms-v1:'+routeId;
 const [state,setState]=useState(()=>{try{return normalizeRoomState(room,JSON.parse(localStorage.getItem(key)||'null'));}catch{return createRoomState(room);}});
 const [selectedId,setSelectedId]=useState(null),[activeItem,setActiveItem]=useState(null),[filter,setFilter]=useState('all'),[message,setMessage]=useState(''),[showHint,setShowHint]=useState(false),[journalOpen,setJournalOpen]=useState(false);
 const scene=useRef(null),inspector=useRef(null);
 const selected=room.objects.find(object=>object.id===selectedId);
 const mechanism=room.mechanisms.find(m=>m.objectId===selectedId);
 const status=mechanism?getMechanismStatus(room,state,mechanism.id):null;
 const complete=room.mechanisms.every(m=>state.solved.includes(m.id));
 const nextMechanism=room.mechanisms.find(m=>!state.solved.includes(m.id));
 const engineState=useMemo(()=>({...state,selectedId}),[state,selectedId]);
 const controls=mechanism?safeValues(mechanism,state):[];
 const activeDefinition=itemFrom(room,activeItem);
 const requiredItem=mechanism?.toolId?itemFrom(room,mechanism.toolId):null;
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{}},[key,state]);
 const inspect=useCallback((id,focus=false)=>{
  if(!room.objects.some(object=>object.id===id))return;
  setSelectedId(id);setShowHint(false);setMessage('');
  inspector.current?.scrollTo({top:0,behavior:'instant'});
  setState(previous=>inspectObject(room,previous,id));
  if(focus)scene.current?.selectObject(id);
 },[room]);
 useEffect(()=>{
  if(!legacyActionRef)return;
  const legacy=name=>{
   const target=routeId==='balestier'?'projector':routeId==='kampong-gelam'?'press':routeId==='telok-ayer'?(name==='stamp'?'seal':'letter'):'clock';
   inspect(target,true);
  };
  legacyActionRef.current=legacy;
  return ()=>{if(legacyActionRef.current===legacy)legacyActionRef.current=null;};
 },[inspect,legacyActionRef,routeId]);
 function choose(id){
  inspect(id,true);
  requestAnimationFrame(()=>{
   const node=inspector.current,box=node?.getBoundingClientRect();
   if(box&&(box.top<0||box.bottom>window.innerHeight))node.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:window.innerWidth<900?'start':'center'});
  });
 }
 function change(value){setMessage('');setState(previous=>setMechanismValue(room,previous,mechanism.id,value));}
 function submit(){
  if(!mechanism)return;
  if(requiredItem&&activeItem!==requiredItem.id&&!status.solved){setMessage('先从随身物品中选择「'+requiredItem.name+'」，再操作这件机关。');return;}
  const result=submitMechanism(room,state,mechanism.id);
  setState(result.state);setMessage(result.message);
  if(result.ok&&!result.state.inventory.includes(activeItem))setActiveItem(null);
 }
 function equip(id){const puttingAway=activeItem===id;setActiveItem(puttingAway?null:id);setMessage(puttingAway?'已将「'+itemFrom(room,id)?.name+'」放回背包。':'已选中「'+itemFrom(room,id)?.name+'」。检查相关机关后，可将它用于修复。');}
 const visibleObjects=room.objects.filter(object=>filter==='all'||object.kind===filter);
 return <section className={'story-room '+(embedded?'room-embedded':'')} aria-label={room.title+'探索'}>
  <header className="room-chapter-heading"><div><span className="eyebrow">{room.kicker||'ENTER THE STORY'} / {ROUTES[routeId].area}</span><h2>{room.title}</h2><p>{room.hook}</p></div><div className="room-progress-medallion"><b>{String(state.solved.length).padStart(2,'0')}<i> / 03</i></b><span>机关已复原</span></div></header>
  <div className="room-mission"><span className="room-mission-label">此刻的任务</span><p>{complete?room.ending:room.mission}</p><button type="button" onClick={()=>choose(nextMechanism?.objectId||room.objects[0].id)}>{complete?'再检查物件':'查看下一处机关'} <span>↗︎</span></button></div>
  <div className="room-play-layout">
   <div className="room-scene-column"><RoomViewport routeId={routeId} title={room.title} state={engineState} reducedMotion={reducedMotion} onInspect={inspect} controlRef={scene}/>
    <div className="room-stage-chapters" aria-label="房间机关进度">{room.mechanisms.map((m,index)=>{const s=getMechanismStatus(room,state,m.id);return <button type="button" key={m.id} className={(s.solved?'solved ':'')+(selectedId===m.objectId?'selected':'')} onClick={()=>choose(m.objectId)}><span>{s.solved?'✓':String(index+1).padStart(2,'0')}</span><div><b>{m.title}</b><small>{s.solved?'已完成':s.locked?'等待前一条线索':'可以探索'}</small></div><i>↗︎</i></button>;})}</div>
   </div>
   <aside ref={inspector} className={'room-inspector '+(selected?'has-selection':'')} aria-label="物件检查台">
    <div className="room-inspector-label"><span>THE INSPECTOR'S DESK</span><span>{selected?String(room.objects.indexOf(selected)+1).padStart(2,'0'):'—'} / 08</span></div>
    {selected?<div key={selected.id} className="room-inspection-content">
     <div className="room-object-type"><span>{kindLabel[selected.kind]}</span>{state.solved.includes(selected.id)&&<span>✓ 已复原</span>}</div>
     <h3>{selected.name}</h3><p className="room-object-description">{selected.description}</p>
     <div className="room-object-detail">{selected.detail}</div>
     {selected.clue&&<div className="room-clue-slip"><span>发现的线索 / FICTIONAL PROP</span><p>{selected.clue}</p></div>}
     {mechanism?<div className="room-mechanism">
      <div className="room-mechanism-rule"><small>怎样操作</small><p>{mechanism.instruction}</p></div>
      {status.locked&&<p className="room-dependency"><span>↳</span>{status.reason}</p>}
      {requiredItem&&<button type="button" className={'room-tool-slot '+(activeItem===requiredItem.id?'equipped':'')} disabled={!state.inventory.includes(requiredItem.id)||status.solved} onClick={()=>equip(requiredItem.id)}><span>{status.solved||activeItem===requiredItem.id?'✓':'＋'}</span><div><small>{status.solved?'已用于修复':activeItem===requiredItem.id?'已装备':state.inventory.includes(requiredItem.id)?'点击装备所需物品':'需要找到'}</small><b>{requiredItem.name}</b></div></button>}
      <MechanismControls mechanism={mechanism} value={controls} onChange={change} disabled={status.solved}/>
      <button type="button" className="room-submit" disabled={status.locked||status.solved} onClick={submit}>{status.solved?'✓ 机关已复原':mechanism.type==='dial'?'转动锁扣':mechanism.type==='align'?'确认校准':'执行这组操作'}<span>↗︎</span></button>
      {status.solved&&<div className="room-solved-note"><span>STORY RECOVERED</span><p>{mechanism.successText}</p></div>}
      {!status.solved&&<button type="button" className="room-hint-button" aria-expanded={showHint} onClick={()=>setShowHint(!showHint)}>{showHint?'收起提示':'需要一点提示？'}</button>}
      {showHint&&!status.solved&&<p className="room-hint">{mechanism.hint}</p>}
     </div>:<div className="room-observation"><small>观察记录</small><p>{selected.afterText||'这件物品已记入你的探索笔记。试着把它和房间里的机关联系起来。'}</p>{selected.kind==='clue'&&nextMechanism&&<button type="button" className="room-text-button" onClick={()=>choose(nextMechanism.objectId)}>带着线索，检查{room.objects.find(o=>o.id===nextMechanism.objectId)?.name} ↗︎</button>}</div>}
    </div>:<div className="room-inspector-empty"><div className="room-archive-symbol" aria-hidden="true"><span>F</span><i/><i/></div><span className="eyebrow">EVERY OBJECT HAS A PART</span><h3>先环顾房间，<br/>再靠近一个细节。</h3><p>点击三维场景里的物件，或使用下方的物件清单。藏在交接记录里的线索，会带你找到第一处机关。</p><button type="button" className="room-submit" onClick={()=>choose(room.objects.find(o=>o.kind==='clue')?.id||room.objects[0].id)}>检查第一条线索 <span>↗︎</span></button></div>}
    <div className={'room-feedback '+(message?'visible':'')} role="status" aria-live="polite">{message||'检查、取物、使用，再让故事向前一步。'}</div>
   </aside>
  </div>
  <section className="room-inventory" aria-label="随身物品"><div className="room-inventory-title"><span className="eyebrow">YOUR SATCHEL</span><h3>随身物品 <b>{state.inventory.length}</b></h3><p>选择一件，再把它用在相关机关上。</p></div><div className="room-inventory-items">
   {state.inventory.length?state.inventory.map((id,index)=>{const item=itemFrom(room,id);return item&&<button key={id} type="button" className={'room-inventory-item '+(activeItem===id?'active':'')} aria-pressed={activeItem===id} onClick={()=>equip(id)}><span className="room-item-token"><i>{String(index+1).padStart(2,'0')}</i></span><div><b>{item.name}</b><small>{item.description}</small></div><span>{activeItem===id?'✓':'↗︎'}</span></button>;}):<div className="room-empty-satchel"><span>＋</span><p>背包还空着。<br/><small>打开第一处机关，把找到的物品带走。</small></p></div>}
  </div>{activeDefinition&&<p className="room-equipped-caption">正在携带：{activeDefinition.name}。再次点击可放回背包。</p>}</section>
  <section className="room-object-catalog" aria-label="房间物件清单"><div className="room-catalog-heading"><div><span className="eyebrow">THINGS LEFT BEHIND</span><h3>每一件，都有它的位置。</h3></div><div className="room-object-filters" role="group" aria-label="筛选房间物件">{[['all','全部'],['mechanism','机关'],['clue','线索'],['prop','生活物件']].map(([id,label])=><button type="button" key={id} className={filter===id?'active':''} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>
   <div className="room-object-grid">{visibleObjects.map(object=><button type="button" key={object.id} className={'room-object-tile '+(selectedId===object.id?'selected':'')} aria-pressed={selectedId===object.id} onClick={()=>choose(object.id)}><span className="room-object-number">{String(room.objects.indexOf(object)+1).padStart(2,'0')}</span><div><small>{kindLabel[object.kind]}</small><b>{object.name}</b><p>{object.description}</p></div><span className="room-object-read">{state.solved.includes(object.id)?'已复原':state.seen.includes(object.id)?'已检查':'走近看'} ↗︎</span></button>)}</div>
  </section>
  <section className="room-journal"><button type="button" aria-expanded={journalOpen} className="room-journal-toggle" onClick={()=>setJournalOpen(!journalOpen)}><span><small>FIELD NOTES</small><b>这间房的探索记录</b></span><span>{state.seen.length} 件已检查 / {state.solved.length} 处已复原 <i>{journalOpen?'−':'＋'}</i></span></button>{journalOpen&&<div className="room-journal-content">{state.journal?.length?<ol>{state.journal.map((entry,index)=><li key={index}>{typeof entry==='string'?entry:entry.text||entry.message||entry.title||'一条新的发现'}</li>)}</ol>:<p>还没有记录。检查一件物品，故事就会开始留下痕迹。</p>}<p className="quiet">{room.fictionNote}</p></div>}</section>
  <div className={'room-story-bridge '+(complete?'is-complete':'')}><div><span className="eyebrow">{complete?'THE ROOM REMEMBERS':'BEYOND THIS ROOM'}</span><h3>{complete?'物件重新运转，故事还在街上继续。':'带着房间里的疑问，去读真实的街区。'}</h3><p>{complete?room.ending:'房间与机关是剧情创作。人物、建筑与年代的依据，保留在原故事的地点和历史卡中。'}</p></div><div>{onReadFacts&&<button type="button" className="button outline" onClick={onReadFacts}>查看地点与历史出处 ↗︎</button>}{onContinue&&<button type="button" className="button primary" onClick={onContinue}>继续原故事任务 <span>↗︎</span></button>}</div></div>
 </section>;
}

export default function StoryRoom(props){return <RoomSession key={props.routeId} {...props}/>;}

export function RoomsPage({routeId,onSelect,reducedMotion,onReadFacts,enter}){
 const entries=Object.entries(ROOMS);
 return <section className="page-section rooms-page"><div className="rooms-page-heading"><div><span className="eyebrow">FINDSG / THE LIVING ARCHIVE</span><h1>走进房间，<br/>把故事<span>重新接上。</span></h1><p>打开一只抽屉，修好一台机器。那些被留下的物品，正在等你把它们连成一段故事。</p></div><div className="rooms-edition"><b>04</b><span>可探索的故事空间</span><small>32 件剧情物品 · 12 处连锁机关</small></div></div><div className="rooms-selector" role="group" aria-label="选择探索房间">{entries.map(([id,room],index)=><button type="button" key={id} className={'rooms-selector-card '+(routeId===id?'active':'')} aria-pressed={routeId===id} onClick={()=>onSelect(id)}><img src={imageFor(id)} alt="" loading="lazy"/><span className="rooms-selector-shade"/><span className="rooms-selector-index">0{index+1}</span><span className="rooms-selector-copy"><small>{ROUTES[id].area}</small><b>{room.title}</b><span>8 件物品 / 3 处机关</span></span><i>{routeId===id?'探索中':'↗︎'}</i></button>)}</div><StoryRoom routeId={routeId} reducedMotion={reducedMotion} onReadFacts={onReadFacts} onContinue={()=>enter(routeId,'evidence')}/></section>;
}
