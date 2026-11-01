import React,{useState,useEffect,useRef,lazy,Suspense} from 'react';
import {ROUTES,findStory} from '../data.js';
import {Sources} from '../components/ArchiveCard.jsx';
import {FIELD_ROUTES} from './field-content.js';
import {blankField,normalizeField,arriveAt,observeAt,setFieldAnswer,submitField,selectFieldStop,fieldStats} from './field-state.js';
import {readField,storeField,mapSearch,walkTo} from './field-storage.js';
import RouteMap from './RouteMap.jsx';
import FieldViewport from './FieldViewport.jsx';
import './field.css';
import '../rooms/rooms.css';
const MemoryRoom=lazy(()=>import('../rooms/RoomViewport.jsx'));
const roomEnd={balestier:['cabinet','splicer','projector'],'telok-ayer':['chest','compass','seal'],'kampong-gelam':['drawer','typecase','press'],'civic-f1':['cabinet','gears','clock']};

export function ModeSwitch({mode,onChange}){return <div className="field-mode"><div role="group" aria-label="探索方式"><button aria-pressed={mode==='field'} className={mode==='field'?'active':''} onClick={()=>onChange('field')}>实地探索</button><button aria-pressed={mode==='preview'} className={mode==='preview'?'active':''} onClick={()=>onChange('preview')}>线上预览</button></div><span>{mode==='field'?'到访由你手动记录；本版不验证定位。':'预览独立保存，不计作实地到访。'}</span></div>;}

function TaskControls({task,record,onAnswer}){
 if(task.kind==='choice')return <div className="field-choices" role="radiogroup" aria-label="地点任务答案">{task.options.map((o,i)=><button key={o.id} role="radio" aria-checked={record.choice===o.id} disabled={record.solved} className={record.choice===o.id?'selected':''} onClick={()=>onAnswer(o.id)}><span>{String(i+1).padStart(2,'0')}</span><div><b>{o.label}</b>{o.detail&&<small>{o.detail}</small>}</div><i>{record.choice===o.id?'●':'○'}</i></button>)}</div>;
 if(task.kind==='sequence')return <div className="field-sequence"><div className="sequence-slots" aria-label="已排顺序">{task.options.map((_,i)=><div key={i}><small>{i+1}</small><span>{task.options.find(o=>o.id===record.sequence[i])?.label||'待放入'}</span></div>)}</div><div className="sequence-pieces">{task.options.map(o=><button key={o.id} disabled={record.solved||record.sequence.includes(o.id)} onClick={()=>onAnswer([...record.sequence,o.id])}>＋ {o.label}</button>)}</div><button className="text-link" disabled={record.solved||!record.sequence.length} onClick={()=>onAnswer(record.sequence.slice(0,-1))}>撤回最后一张 ↶</button></div>;
 return <div className="field-align"><label htmlFor="field-ruler">调整对照标尺 <output>{record.value}</output></label><input id="field-ruler" type="range" min="0" max="100" value={record.value} disabled={record.solved} onChange={e=>onAnswer(Number(e.target.value))}/><div className="ruler-ends"><span>0</span><span>50</span><span>100</span></div><div className="ruler-buttons"><button aria-label="标尺减一" disabled={record.solved||record.value<=0} onClick={()=>onAnswer(record.value-1)}>−</button><span>逐格对照资料中的数值</span><button aria-label="标尺加一" disabled={record.solved||record.value>=100} onClick={()=>onAnswer(record.value+1)}>＋</button></div></div>;
}

export default function FieldExplorer(props){return <FieldSession key={props.routeId+':'+props.mode} {...props}/>;}
function FieldSession({routeId,mode,onModeChange,initialStopId,onStopChange,reducedMotion,onSources,onNavigate,onSelectRoute}){
 const story=findStory(routeId),route=FIELD_ROUTES[routeId],stops=route.stops;
 const [state,setState]=useState(()=>{const saved=readField(routeId,mode,stops);const i=stops.findIndex(s=>s.id===initialStopId);return i>=0?selectFieldStop(saved,i,stops):saved;});
 const [feedback,setFeedback]=useState(''),[showNext,setShowNext]=useState(false),[showMemory,setShowMemory]=useState(false),[resetPrompt,setResetPrompt]=useState(false),[saveFailed,setSaveFailed]=useState(false);
 const stationRef=useRef(null),nextRef=useRef(null);
 const index=Math.max(0,Math.min(state.selected,stops.length-1)),stop=stops[index],place=story.stops.find(p=>p.id===stop.id),record=state.stops[stop.id]||{arrived:false,observed:false,solved:false,choice:'',sequence:[],value:50},stats=fieldStats(state,stops);
 const available=index===0||state.stops[stops[index-1].id]?.solved;
 useEffect(()=>{setSaveFailed(!storeField(state));},[state]);
 useEffect(()=>{const i=stops.findIndex(s=>s.id===initialStopId);if(i>=0)setState(q=>selectFieldStop(q,i,stops));},[initialStopId,stops]);
 function select(i){setState(q=>selectFieldStop(q,i,stops));setFeedback('');setShowNext(false);setShowMemory(false);onStopChange?.(stops[i].id);requestAnimationFrame(()=>stationRef.current?.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'}));}
 function arrive(){setState(q=>arriveAt(q,stop.id,stops));setFeedback(mode==='field'?'已记为你自述的到访。先停下脚步，观察眼前的地点。':'已进入本站线上预览。现场到访记录没有改变。');}
 function observe(){setState(q=>observeAt(q,stop.id,stops));setFeedback('线索已展开。把现场观察与资料放在一起，再完成本站任务。');}
 function answer(value){setState(q=>setFieldAnswer(q,stop.id,value,stops));setFeedback('');}
 function submit(){const result=submitField(state,stop.id,stops);setState(result.state);setFeedback(result.message);if(result.ok)requestAnimationFrame(()=>nextRef.current?.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'}));}
 function inspectModel(){if(record.arrived&&mode==='preview')observe();else setFeedback(record.arrived?'模型可辅助对照。看完现场或资料后，点击“记录观察，展开线索”。':'这是建筑与道具的预览。抵达地点后，再记录观察。');}
 const modelProgress=record.solved?100:stop.task.kind==='align'?record.value:stop.task.kind==='sequence'?record.sequence.length/stop.task.options.length*100:Math.max(0,stop.task.options.findIndex(o=>o.id===record.choice)+1)/stop.task.options.length*100;
 const next=stops[index+1],nextPlace=story.stops[index+1];
 return <section className="page-section field-experience">
  <div className="field-breadcrumb"><button className="text-link" onClick={()=>onNavigate('routes')}>← 全部步行路线</button><span>{ROUTES[routeId].en} / FIELD JOURNAL</span></div>
  <div className="field-route-heading"><div><span className="eyebrow">让地点推动故事</span><h1>{story.title}</h1><p>{route.intro}</p></div><div className="field-completion"><strong>{String(stats.solved).padStart(2,'0')}<small> / {String(stops.length).padStart(2,'0')}</small></strong><span>{mode==='field'?'现场任务已完成':'预览任务已完成'}</span></div></div>
  <div className="field-route-tabs" aria-label="切换步行故事">{Object.entries(ROUTES).map(([id,r])=><button key={id} aria-pressed={routeId===id} onClick={()=>onSelectRoute(id)}>{r.no} {r.area}</button>)}</div>
  <ModeSwitch mode={mode} onChange={onModeChange}/>
  <RouteMap story={story} stops={stops} selectedIndex={index} progress={state} onSelect={select}/>
  <div ref={stationRef} className="field-station" key={stop.id}>
   <header className="field-stop-heading"><span className="field-station-number">{String(index+1).padStart(2,'0')}</span><div><span className="eyebrow">{record.solved?'此站已完成':record.arrived?'你正在探索这一站':available?'下一处真实地点':'后续地点 · 可查看计划'}</span><h2>{place.name}</h2><p>{place.english_name}</p></div><span className={'field-place-status '+(record.solved?'done':'')}>{record.solved?'✓ 已获得线索':record.arrived?(mode==='field'?'自述已到达':'预览中'):'等待抵达'}</span></header>
   <div className="field-address"><span>↗︎</span><div><small>这一站的位置</small><b>{place.address}</b></div><a href={mapSearch(place)} target="_blank" rel="noreferrer">地图查看 ↗︎</a></div>
   <div className="field-stop-layout">
    <div className="field-left">
     <div className="field-observation"><span className="eyebrow">01 / ARRIVE & LOOK</span><h3>先抬头，看这里。</h3><p className="field-look-for">{stop.lookFor}</p><p className="field-standing"><b>观察位置</b>{stop.spot}</p>
      {!record.arrived?<div className="field-arrival-actions"><p>{stop.arrivalPrompt}</p>{available?<><a className="button outline" href={walkTo(place,index?story.stops[index-1]:null)} target="_blank" rel="noreferrer">{index?'步行到这一站':'导航至起点'} ↗︎</a><button className="button primary" onClick={arrive}>{mode==='field'?'我已到达此地点':'预览到达此站'} →</button></>:<button className="button bronze" onClick={()=>select(Math.max(0,stats.nextIndex))}>先完成第 {stats.nextIndex+1} 站，再解锁到达 →</button>}</div>:<div className="field-arrived"><span>✓ {mode==='field'?'到访已手动记录':'线上到达已预览'}</span>{!record.observed?<><button className="button primary" onClick={observe}>记录观察，展开线索 ↗︎</button><button className="text-link" onClick={observe}>现场看不清？使用资料辅助观察</button></>:<b>✓ 观察已记录，线索可阅读</b>}</div>}
     </div>
     <div className="field-object-heading"><div><span className="eyebrow">建筑与道具 · 随地点展开</span><h3>{stop.propName}</h3></div><span>{record.solved?'已收录':record.arrived?'辅助观察':'出发前预览'}</span></div>
     <FieldViewport routeId={routeId} stopId={stop.id} modelKind={stop.modelKind} reducedMotion={reducedMotion} progress={modelProgress} highlight={record.solved} onInteract={inspectModel}/>
     <p className="field-object-description">{stop.propDescription}</p>
    </div>
    <aside className="field-evidence-panel">
     <div className="section-label"><span>02 / FIND THE CONNECTION</span><span>{record.observed?'线索已展开':'到达并观察后展开'}</span></div>
     <h3>{stop.title}</h3>
     {record.observed?<><article className="field-evidence"><span>地点资料与故事线索</span><h4>{stop.evidenceTitle}</h4><p>{stop.evidence}</p></article><section className="field-task"><span className="eyebrow">把观察变成下一条线索</span><h4>{stop.task.prompt}</h4><TaskControls task={stop.task} record={record} onAnswer={answer}/><button className="button primary field-submit" disabled={record.solved} onClick={submit}>{record.solved?'✓ 本站任务已完成':'确认我的发现'} ↗︎</button></section></>:<div className="field-locked"><span className="field-lock-number">{String(index+1).padStart(2,'0')}</span><h4>答案从眼前的地点开始。</h4><p>到达后，对照建筑外观、公开说明或有出处的资料。这里会展开本站的故事线索和互动任务。</p><small>可以先旋转模型，了解要观察的细节。</small></div>}
     {feedback&&<p className="field-feedback" role="status" aria-live="polite">{feedback}</p>}
     <details className="field-source-details"><summary>到访提示与历史出处</summary><p>{stop.accessNote||place.access_note}</p><Sources urls={stop.sourceUrls||place.source_urls}/><small>任务道具与故事为创作，建筑模型为细节示意。</small></details>
    </aside>
   </div>
   {record.solved&&<section ref={nextRef} className="field-next"><div className="field-reward-ticket"><span>{stop.reward.type==='fact'?'HISTORY CARD / 历史卡':'STORY OBJECT / 数字剧情道具'}</span><b>{stop.reward.title}</b><p>{stop.reward.text}</p><small>✓ 已收入{mode==='field'?'现场':'预览'}收藏</small></div><div className="field-next-copy"><span className="eyebrow">03 / FOLLOW THE CLUE</span><h3>{next?'下一条线索，已经指向街上。':'这条街的故事，被你接起来了。'}</h3><p>{stop.nextClue}</p>{next?<><div className="row-actions"><button className="button primary" onClick={()=>select(index+1)}>带着线索，去第 {index+2} 站 →</button><button className="text-link" onClick={()=>setShowNext(!showNext)}>{showNext?'收起目的地':'揭晓下一站位置'} ↗︎</button></div>{showNext&&<div className="next-address"><b>{nextPlace.name}</b><p>{nextPlace.address}</p><a href={walkTo(nextPlace,place)} target="_blank" rel="noreferrer">打开实际步行导航 ↗︎</a></div>}</>:<button className="button primary" onClick={()=>document.getElementById('field-settlement')?.scrollIntoView({behavior:reducedMotion?'instant':'smooth'})}>整理这次旅程的发现 ↓</button>}</div></section>}
  </div>
  <section className="field-pocket"><div><span className="eyebrow">YOUR POCKET CLUES</span><h3>一路带着的发现。</h3><p>{mode==='field'?`${stats.arrived} 个地点手动记录到访`:'本页记录均为线上预览'} · {stats.solved} 张已获得卡片</p></div><div className="field-pocket-cards">{state.inventory.length?stops.filter(s=>state.inventory.includes(s.reward.id)).map(s=><button key={s.id} onClick={()=>select(stops.indexOf(s))}><small>{story.stops.find(p=>p.id===s.id)?.name}</small><b>{s.reward.title}</b><span>回看来源与线索 ↗︎</span></button>):<p>从第一站带回一条线索，之后每一站的发现都会留在这里。</p>}</div></section>
  {stats.complete&&<section id="field-settlement" className="field-settlement"><span className="eyebrow">JOURNEY COMPLETE / 章节结算</span><h2>把走过的地点，连成你的故事。</h2><p>{route.ending}</p><div className="field-settlement-stats"><span><b>{stats.solved}</b> 站任务</span><span><b>{state.inventory.length}</b> 张发现卡</span><span>{mode==='field'?'手动记录的现场旅程':'线上预览完成'}</span></div><div className="row-actions"><button className="button primary" onClick={()=>onNavigate('collection')}>打开本次收藏 ↗︎</button><button className="button outline" onClick={()=>setShowMemory(!showMemory)}>{showMemory?'收起纪念场景':'解锁章节纪念场景'} ↗︎</button><button className="text-link" onClick={()=>onNavigate('routes')}>选择下一条街区路线</button></div>{showMemory&&<div className="field-memory"><p>旅程结束后，物件在这里归档。这是可选纪念场景。</p><Suspense fallback={<p>正在打开本章纪念场景…</p>}><MemoryRoom routeId={routeId} title="章节纪念场景" state={{solved:roomEnd[routeId],values:{}}} reducedMotion={reducedMotion} onInspect={()=>{}}/></Suspense></div>}</section>}
  <div className="field-session-footer"><span>{saveFailed?'记录暂存在本次页面中；刷新可能丢失，请先到“我的收藏”导出。':'进度保存在当前浏览器。现场记录与线上预览各自独立。'}</span><button className="text-link" onClick={()=>setResetPrompt(!resetPrompt)}>重置{mode==='field'?'现场':'预览'}路线记录</button></div>
  {resetPrompt&&<div className="field-reset"><p>清空这条路线的{mode==='field'?'现场':'线上预览'}记录？另一种模式和其他路线会保留。</p><button className="button outline" onClick={()=>setResetPrompt(false)}>保留记录</button><button className="button bronze" onClick={()=>{setState(normalizeField(blankField(routeId,mode),routeId,mode,stops));setResetPrompt(false);setShowMemory(false);onStopChange?.(stops[0].id);setFeedback('这条路线已重新开始。');}}>确认重新开始</button></div>}
 </section>;
}
