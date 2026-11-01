import React,{useRef} from 'react';
import {ROUTES,imageFor,sourceName} from '../data.js';

export function Sources({urls=[]}){return <div className="sources">{[...new Set(urls)].filter(x=>/^https:\/\//.test(x)).map((u,i)=><a key={u} href={u} target="_blank" rel="noreferrer"><span>{String(i+1).padStart(2,'0')}</span>{sourceName(u)} <b>↗︎</b></a>)}</div>;}
export function TiltCard({children,className='',disabled=false,...props}){const ref=useRef(null);function move(e){if(disabled||e.pointerType==='touch'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const b=ref.current.getBoundingClientRect();ref.current.style.setProperty('--rx',`${-(e.clientY-b.top-b.height/2)/b.height*8}deg`);ref.current.style.setProperty('--ry',`${(e.clientX-b.left-b.width/2)/b.width*10}deg`);}function reset(){ref.current?.style.setProperty('--rx','0deg');ref.current?.style.setProperty('--ry','0deg');}return <div {...props} ref={ref} className={`tilt-card ${className}`} onPointerMove={move} onPointerLeave={reset}>{children}</div>;}

export function AbilityCard({routeId,mechanics={},onUse,small=false,reducedMotion=false}){const r=ROUTES[routeId],status=mechanics.spent?'已使用':mechanics.granted?'可使用':'待解锁';return <TiltCard disabled={reducedMotion} className={`relic-card ${small?'small':''} ${mechanics.granted?'earned':''} ${mechanics.spent?'spent':''}`}>
 <div className="relic-rim"/><div className="relic-image" style={{backgroundImage:`url("${imageFor(routeId)}")`}}/><div className="relic-shade"/>
 <div className="relic-top"><span>FINDSG / DISCOVERY POWER</span><b>{r.no}</b></div><div className="relic-foil">{r.power}</div><div className="relic-bottom"><span className="relic-state">{status} · {mechanics.granted&&!mechanics.spent?'01':'00'}</span><h3>{r.power}卡</h3><span>把发现，带到下一站。</span></div>{onUse&&<button className="relic-use" onClick={onUse} disabled={!mechanics.granted||mechanics.spent}>{mechanics.spent?'能力已生效':'使用这张卡 ↗︎'}</button>}
 </TiltCard>;}

export default function ArchiveCard({card,routeId,collected,onCollect,onOpen,compact=false}){return <article className={`archive-paper ${card.is_fiction?'fiction':''} ${compact?'compact':''}`}>
 <div className="paper-meta"><span>{card.is_fiction?'STORY OBJECT':'HISTORICAL RECORD'}</span><b>{card.label||card.type}</b></div><div className="paper-rule"/><h3>{card.title}</h3><p>{card.text}</p><div className="paper-bottom"><span>{card.is_fiction?'剧情创作':'资料有出处'}</span><button onClick={()=>onOpen?.(card)}>展开档案 ↗︎</button></div>{onCollect&&<button className={`collect-card ${collected?'collected':''}`} onClick={()=>onCollect(card)} disabled={collected}>{collected?'✓ 已在收藏':'＋ 收下这张卡'}</button>}
 </article>;}
