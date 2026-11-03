'use client';

// Adapted from React Bits — OptionWheel (JavaScript + CSS), using the source
// supplied by the user. The supplied excerpt does not specify a license ID.
// Selection is separate from confirmation; this component never grants rewards.
import React,{useCallback,useEffect,useId,useRef,useState} from 'react';
import './option-wheel.css';

const DEFAULT_ITEMS=['Ambient','House','Techno','Jazz','Lo-Fi','Synthwave','Trance','Funk','Disco','Hip-Hop','Chillwave','Drum & Bass'];
const finite=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const indexFor=(value,count,loop=false)=>count<1?-1:loop?((Math.round(value)%count)+count)%count:clamp(Math.round(value),0,count-1);
const nearestPosition=(index,position,count,loop)=>loop&&count>1?position+(((index-position+count/2)%count+count)%count-count/2):index;
const rootRem=()=>typeof document==='undefined'?16:parseFloat(getComputedStyle(document.documentElement).fontSize)||16;

export default function OptionWheel({
 items=DEFAULT_ITEMS,defaultSelected=3,selectedIndex:controlledIndex,onChange,onConfirm,
 ariaLabel='Choose a clue',disabled=false,reducedMotion=false,
 textColor='#a6a6a6',activeColor='#ffffff',side='left',fontSize=3,spacing=1.4,
 curve=1,tilt=6,blur=2,fade=.25,minOpacity=.05,smoothing=200,inset=80,
 loop=false,draggable=true,soundUrl='',soundVolume=.5,className='',style
}){
 const labels=Array.isArray(items)?items:[],count=labels.length,controlled=controlledIndex!==undefined;
 const initial=indexFor(finite(controlled?controlledIndex:defaultSelected,0),count);
 const [internalIndex,setInternalIndex]=useState(initial),[isDragging,setIsDragging]=useState(false),[remPx,setRemPx]=useState(rootRem),[systemReduced,setSystemReduced]=useState(false);
 const activeIndex=controlled?indexFor(finite(controlledIndex,0),count):indexFor(finite(internalIndex,0),count);
 const rootRef=useRef(null),itemRefs=useRef([]),cfgRef=useRef({}),mountedRef=useRef(false),initializedRef=useRef(false);
 const posRef=useRef(Math.max(0,initial)),targetRef=useRef(Math.max(0,initial)),selectionRef=useRef(initial),notifiedRef=useRef(initial);
 const rafRef=useRef(null),lastFrameRef=useRef(0),wheelTimerRef=useRef(null),dragRef=useRef(null),suppressClickUntil=useRef(0);
 const audioRef=useRef(null),audioUrlRef=useRef(''),lastTickRef=useRef(0);
 const id=useId(),reduced=Boolean(reducedMotion||systemReduced);
 const safeFont=Math.max(.25,finite(fontSize,3)),safeInset=Math.max(0,finite(inset,80));
 cfgRef.current={items:labels,count,controlled,activeIndex,disabled:Boolean(disabled),reduced,draggable:Boolean(draggable),loop:Boolean(loop),
  rowH:Math.max(1,safeFont*Math.max(.1,finite(spacing,1.4))*remPx),curve:finite(curve,1),tilt:clamp(finite(tilt,6),0,85),
  blur:Math.max(0,finite(blur,2)),fade:clamp(finite(fade,.25),0,1),minOpacity:clamp(finite(minOpacity,.05),0,1),
  side:side==='right'?'right':'left',smoothing:clamp(finite(smoothing,200),1,5000),soundUrl,soundVolume,onChange,onConfirm};

 const stopAnimation=useCallback(()=>{if(rafRef.current!==null)cancelAnimationFrame(rafRef.current);rafRef.current=null;},[]);
 const clearWheel=useCallback(()=>{if(wheelTimerRef.current!==null)clearTimeout(wheelTimerRef.current);wheelTimerRef.current=null;},[]);
 const releaseDrag=useCallback((render=true)=>{
  const drag=dragRef.current;dragRef.current=null;
  try{if(drag&&rootRef.current?.hasPointerCapture?.(drag.id))rootRef.current.releasePointerCapture(drag.id);}catch{}
  if(render&&mountedRef.current)setIsDragging(false);
 },[]);

 const paint=useCallback(position=>{
  const cfg=cfgRef.current,n=cfg.count,mirror=cfg.side==='right'?-1:1;
  const tiltRad=cfg.tilt*Math.PI/180,radius=tiltRad>.0005?cfg.rowH/tiltRad:0;
  for(let i=0;i<n;i++){
   const element=itemRefs.current[i];if(!element)continue;
   let distance=i-position;
   if(cfg.loop&&n>1){distance=((distance%n)+n)%n;if(distance>n/2)distance-=n;}
   const absolute=Math.abs(distance);let x=0,y=distance*cfg.rowH,rotation=0;
   if(radius){const angle=clamp(distance*tiltRad,-Math.PI/2,Math.PI/2);x=-mirror*radius*(1-Math.cos(angle))*cfg.curve;y=radius*Math.sin(angle);rotation=mirror*angle*180/Math.PI;}
   element.style.transform=`translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${rotation.toFixed(3)}deg)`;
   element.style.opacity=String(Math.max(cfg.minOpacity,1-absolute*cfg.fade));
   element.style.filter=cfg.blur?`blur(${(absolute*cfg.blur).toFixed(2)}px)`:'none';
   element.style.setProperty('--ow-p',Math.max(0,1-Math.min(absolute,1)).toFixed(4));
  }
 },[]);

 const runFrame=useCallback(now=>{
  rafRef.current=null;if(!mountedRef.current)return;
  const cfg=cfgRef.current;if(!cfg.count)return;
  if(cfg.reduced){posRef.current=cfg.controlled?nearestPosition(cfg.activeIndex,posRef.current,cfg.count,cfg.loop):targetRef.current;paint(posRef.current);return;}
  const dt=clamp((now-lastFrameRef.current)/1000,.001,.05);lastFrameRef.current=now;
  const amount=1-Math.exp(-dt/(cfg.smoothing/1000));
  const eased=posRef.current+(targetRef.current-posRef.current)*amount;
  const settled=Math.abs(targetRef.current-eased)<.001;
  posRef.current=settled?targetRef.current:eased;paint(posRef.current);
  if(!settled){rafRef.current=requestAnimationFrame(runFrame);return;}
  // A controlled parent is authoritative even when it declines a proposal.
  if(cfg.controlled&&!dragRef.current&&wheelTimerRef.current===null&&indexFor(targetRef.current,cfg.count,cfg.loop)!==cfg.activeIndex){
   targetRef.current=nearestPosition(cfg.activeIndex,posRef.current,cfg.count,cfg.loop);notifiedRef.current=cfg.activeIndex;
   rafRef.current=requestAnimationFrame(runFrame);
  }else if(cfg.loop&&!dragRef.current&&wheelTimerRef.current===null){
   posRef.current=targetRef.current=indexFor(targetRef.current,cfg.count,true);paint(posRef.current);
  }
 },[paint]);

 const startLoop=useCallback(()=>{
  stopAnimation();const cfg=cfgRef.current;if(!mountedRef.current||!cfg.count)return;
  if(cfg.reduced){posRef.current=cfg.controlled?nearestPosition(cfg.activeIndex,posRef.current,cfg.count,cfg.loop):targetRef.current;paint(posRef.current);return;}
  lastFrameRef.current=performance.now();rafRef.current=requestAnimationFrame(runFrame);
 },[paint,runFrame,stopAnimation]);

 const playTick=useCallback(()=>{
  const cfg=cfgRef.current;if(!cfg.soundUrl||typeof Audio==='undefined')return;
  const now=performance.now();if(now-lastTickRef.current<70)return;lastTickRef.current=now;
  try{
   if(!audioRef.current||audioUrlRef.current!==cfg.soundUrl){audioRef.current?.pause();audioRef.current=new Audio(cfg.soundUrl);audioRef.current.preload='auto';audioUrlRef.current=cfg.soundUrl;}
   const audio=audioRef.current;audio.volume=clamp(finite(cfg.soundVolume,.5),0,1);audio.currentTime=0;audio.play()?.catch?.(()=>{});
  }catch{}
 },[]);

 const applyTarget=useCallback((value,snap=false,notify=true)=>{
  const cfg=cfgRef.current;if(cfg.disabled||!cfg.count||!Number.isFinite(value))return;
  let target=cfg.loop?value:clamp(value,0,cfg.count-1);if(snap)target=Math.round(target);
  targetRef.current=target;const index=indexFor(target,cfg.count,cfg.loop);
  if(notify&&index!==notifiedRef.current){
   notifiedRef.current=index;
   if(!cfg.controlled){selectionRef.current=index;setInternalIndex(index);}
   cfg.onChange?.(index,cfg.items[index]);playTick();
  }
  startLoop();
 },[playTick,startLoop]);

 useEffect(()=>{
  mountedRef.current=true;
  const resize=()=>setRemPx(rootRem());window.addEventListener('resize',resize);
  const query=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motion=()=>setSystemReduced(Boolean(query?.matches));motion();query?.addEventListener?.('change',motion);
  return()=>{mountedRef.current=false;stopAnimation();clearWheel();releaseDrag(false);window.removeEventListener('resize',resize);query?.removeEventListener?.('change',motion);audioRef.current?.pause();audioRef.current=null;audioUrlRef.current='';};
 },[clearWheel,releaseDrag,stopAnimation]);

 // Only actual external selection/count changes reconcile the selection. This
 // effect never emits onChange, so inline parent arrays cannot form a loop.
 useEffect(()=>{
  const cfg=cfgRef.current,desired=cfg.controlled?cfg.activeIndex:indexFor(selectionRef.current<0?finite(defaultSelected,0):selectionRef.current,cfg.count);
  if(!cfg.count){clearWheel();releaseDrag();stopAnimation();posRef.current=targetRef.current=0;selectionRef.current=notifiedRef.current=-1;if(!cfg.controlled)setInternalIndex(-1);return;}
  if(!cfg.controlled){selectionRef.current=desired;setInternalIndex(desired);}
  const matches=indexFor(targetRef.current,cfg.count,cfg.loop)===desired;
  if(!matches){clearWheel();releaseDrag();targetRef.current=nearestPosition(desired,posRef.current,cfg.count,cfg.loop);}
  notifiedRef.current=desired;
  if(!initializedRef.current){initializedRef.current=true;posRef.current=targetRef.current=Math.max(0,desired);paint(posRef.current);}
  else startLoop();
  itemRefs.current.length=cfg.count;
 },[count,controlled,controlledIndex,loop,clearWheel,paint,releaseDrag,startLoop,stopAnimation]);

 useEffect(()=>{
  if(disabled||!draggable){clearWheel();releaseDrag();}
  if(disabled){stopAnimation();posRef.current=targetRef.current=Math.max(0,cfgRef.current.activeIndex);paint(posRef.current);}
  else startLoop();
 },[disabled,draggable,reduced,clearWheel,paint,releaseDrag,startLoop,stopAnimation]);

 // Refresh the layout for visual prop changes without issuing selection events.
 useEffect(()=>{paint(posRef.current);},[count,fontSize,spacing,curve,tilt,blur,fade,minOpacity,side,inset,remPx,paint]);
 useEffect(()=>{if(audioUrlRef.current!==soundUrl){audioRef.current?.pause();audioRef.current=null;audioUrlRef.current='';}},[soundUrl]);

 useEffect(()=>{
  const root=rootRef.current;if(!root)return;
  const wheel=event=>{
   const cfg=cfgRef.current;if(cfg.disabled||cfg.count<2||event.ctrlKey||!event.deltaY)return;
   const pixels=event.deltaMode===1?event.deltaY*24:event.deltaMode===2?event.deltaY*(root.clientHeight||cfg.rowH*3):event.deltaY;
   const step=clamp(pixels/cfg.rowH,-1,1);
   if(!cfg.loop&&((targetRef.current<=0&&step<0)||(targetRef.current>=cfg.count-1&&step>0)))return;
   event.preventDefault();event.stopPropagation();releaseDrag();clearWheel();
   // Install the timer before starting motion, so a controlled wheel waits for
   // the gesture to settle before reconciling a parent that rejects a change.
   wheelTimerRef.current=setTimeout(()=>{wheelTimerRef.current=null;if(mountedRef.current)applyTarget(targetRef.current,true);},140);
   applyTarget(targetRef.current+step);
  };
  root.addEventListener('wheel',wheel,{passive:false});
  return()=>{root.removeEventListener('wheel',wheel);clearWheel();};
 },[applyTarget,clearWheel,releaseDrag]);

 const handlePointerDown=useCallback(event=>{
  const cfg=cfgRef.current;if(cfg.disabled||!cfg.draggable||cfg.count<2||event.button!==0||event.isPrimary===false)return;
  clearWheel();releaseDrag();suppressClickUntil.current=0;rootRef.current?.focus({preventScroll:true});
  dragRef.current={id:event.pointerId,y:event.clientY,start:targetRef.current,last:targetRef.current,time:performance.now(),velocity:0,moved:false};
 },[clearWheel,releaseDrag]);

 const handlePointerMove=useCallback(event=>{
  const drag=dragRef.current,cfg=cfgRef.current;if(!drag||event.pointerId!==drag.id||cfg.disabled)return;
  const dy=event.clientY-drag.y;
  if(!drag.moved&&Math.abs(dy)>4){drag.moved=true;setIsDragging(true);try{rootRef.current?.setPointerCapture(drag.id);}catch{}}
  if(!drag.moved)return;event.preventDefault();
  const target=drag.start-dy/cfg.rowH,now=performance.now(),dt=Math.max(8,now-drag.time)/1000;
  drag.velocity=.65*drag.velocity+.35*(target-drag.last)/dt;drag.last=target;drag.time=now;
  applyTarget(target);
 },[applyTarget]);

 const finishPointer=useCallback((event,cancelled=false)=>{
  const drag=dragRef.current;if(!drag||event.pointerId!==drag.id)return;
  const moved=drag.moved,velocity=performance.now()-drag.time>120?0:drag.velocity;
  releaseDrag();
  if(moved){suppressClickUntil.current=performance.now()+300;const momentum=cancelled||cfgRef.current.reduced?0:clamp(velocity*.15,-2,2);applyTarget(targetRef.current+momentum,true);}
 },[applyTarget,releaseDrag]);

 const handleItemClick=useCallback(index=>{
  const cfg=cfgRef.current;if(cfg.disabled||!cfg.count||performance.now()<suppressClickUntil.current)return;
  clearWheel();rootRef.current?.focus({preventScroll:true});applyTarget(nearestPosition(index,targetRef.current,cfg.count,cfg.loop),true);
 },[applyTarget,clearWheel]);

 const handleKeyDown=useCallback(event=>{
  const cfg=cfgRef.current;if(cfg.disabled||!cfg.count||event.altKey||event.ctrlKey||event.metaKey)return;
  const delta={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1,PageUp:-3,PageDown:3}[event.key];
  if(delta!==undefined||event.key==='Home'||event.key==='End'){
   event.preventDefault();clearWheel();releaseDrag();
   const target=event.key==='Home'?nearestPosition(0,targetRef.current,cfg.count,cfg.loop):event.key==='End'?nearestPosition(cfg.count-1,targetRef.current,cfg.count,cfg.loop):Math.round(targetRef.current)+delta;
   applyTarget(target,true);return;
  }
  if(event.key==='Enter'){
   event.preventDefault();if(event.repeat)return;clearWheel();releaseDrag();
   const index=cfg.controlled?cfg.activeIndex:selectionRef.current;
   if(index<0)return;applyTarget(nearestPosition(index,targetRef.current,cfg.count,cfg.loop),true,false);
   cfg.onConfirm?.(index,cfg.items[index]);
  }
 },[applyTarget,clearWheel,releaseDrag]);

 return <div ref={rootRef} role="listbox" tabIndex={disabled||!count?-1:0} aria-label={ariaLabel} aria-orientation="vertical" aria-disabled={disabled||undefined}
  aria-activedescendant={activeIndex>=0?`${id}-option-${activeIndex}`:undefined} data-reduced-motion={reduced?'true':'false'}
  className={`option-wheel${side==='right'?' option-wheel--right':''}${isDragging?' option-wheel--dragging':''}${disabled?' option-wheel--disabled':''}${!draggable?' option-wheel--fixed':''}${count<2?' option-wheel--static':''}${className?` ${className}`:''}`}
  style={{'--ow-text-color':textColor,'--ow-active-color':activeColor,'--ow-font-size':`${safeFont}rem`,'--ow-inset':`${safeInset}px`,...style}}
  onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={event=>finishPointer(event)} onPointerCancel={event=>finishPointer(event,true)}
  onLostPointerCapture={event=>finishPointer(event,true)} onPointerLeave={event=>{if(dragRef.current&&!rootRef.current?.hasPointerCapture?.(dragRef.current.id))finishPointer(event,true);}} onKeyDown={handleKeyDown}>
  {count?labels.map((label,index)=><div key={index} id={`${id}-option-${index}`} ref={element=>{itemRefs.current[index]=element;}} role="option" aria-selected={activeIndex===index}
   className={`option-wheel__item${activeIndex===index?' option-wheel__item--selected':''}`} title={String(label??'')} onClick={()=>handleItemClick(index)}>{String(label??'')}</div>):<div className="option-wheel__empty" role="status">Nothing to choose yet</div>}
 </div>;
}
