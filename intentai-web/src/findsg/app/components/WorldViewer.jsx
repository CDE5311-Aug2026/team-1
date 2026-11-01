import React,{useEffect,useRef,useState} from 'react';
import {ROUTES,imageFor} from '../data.js';
import '../archive-experience.css';

const OBJECT_SHOTS={
 'telok-ayer':{action:'focus:letter',label:'家书特写',replay:'replay'},
 'kampong-gelam':{action:'focus:press',label:'铅字特写',replay:'print'},
 'balestier':{action:'focus:projector',label:'胶片特写',replay:'restore'},
 'civic-f1':{action:'focus:watch',label:'怀表特写',replay:'replay'}
};

export default function WorldViewer({routeId,phase='intro',reducedMotion=false,actionRef,onSelect,compact=false}){
 const host=useRef(null),engine=useRef(null),callback=useRef(onSelect);
 const latest=useRef({phase,reducedMotion});latest.current={phase,reducedMotion};
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[note,setNote]=useState(null),[rendererName,setRendererName]=useState('loading');
 const [shot,setShot]=useState('reset');
 callback.current=onSelect;
 useEffect(()=>{
  setReady(false);setFailed(false);setNote(null);setRendererName('loading');setShot('reset');
  let alive=true,timer,active=null,attempt=0,nativeStarted=false;
  const invoke=name=>active?.instance?.setAction(name);
  if(actionRef)actionRef.current=invoke;
  const valid=token=>alive&&token===attempt;
  function release(record){
   if(!record)return;
   if(engine.current===record.instance)engine.current=null;
   try{record.instance?.dispose();}catch(error){console.warn('Scene cleanup:',error);}
   record.surface.remove();
  }
  function fail(token,renderer='poster'){
   if(!valid(token))return;
   setReady(false);setFailed(true);setRendererName(renderer);
  }
  function mount(module,renderer,token){
   if(!valid(token)||!host.current)return;
   // Each attempt owns its DOM and instance. A synchronous onReady is buffered
   // until create() returns, so fallback can dispose the failed instance first.
   const surface=document.createElement('div');
   surface.style.cssText='width:100%;height:100%;';
   host.current.append(surface);
   let constructing=true,instance;const pending=[];
   const readyResult=result=>{
    if(!valid(token))return;
    if(result?.ok===false&&renderer==='three'){
     void loadNative();
     return;
    }
    setReady(result?.ok!==false);setFailed(result?.ok===false);
    setRendererName(result?.engine||renderer);
   };
   try{
    const create=module.createStoryWorld||module.createNativeStoryWorld;
    if(typeof create!=='function')throw new Error('Scene factory is unavailable');
    instance=create(surface,{routeId,...latest.current,
     onReady:result=>{
      if(!valid(token))return;
      if(constructing)pending.push(result);else readyResult(result);
     },
     onSelect:item=>{
      if(!valid(token))return;
      setNote(item);callback.current?.(item);
     }
    });
    if(!instance)throw new Error('Scene factory returned no instance');
   }catch(error){
    constructing=false;surface.remove();
    if(!valid(token)){try{instance?.dispose();}catch{}return;}
    if(renderer==='three')void loadNative();else fail(token);
    return;
   }
   constructing=false;
   const record={instance,surface};
   if(!valid(token)){release(record);return;}
   active=record;engine.current=instance;
   for(const result of pending){
    if(!valid(token))break;
    readyResult(result);
   }
  }
  async function loadNative(){
   if(!alive||nativeStarted)return;
   nativeStarted=true;
   const token=++attempt,previous=active;
   active=null;release(previous);
   setReady(false);setFailed(false);setRendererName('loading');
   try{
    const module=await import('../native/NativeStoryWorld.js');
    if(valid(token))mount(module,'native-webgl',token);
   }catch{fail(token);}
  }
  async function loadWorld(){
   let module;
   try{
    module=await Promise.race([
     import('../three/StoryWorld.js'),
     new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('Scene engine is unavailable')),2200);
     })
    ]);
   }catch{
    if(alive)await loadNative();
    return;
   }finally{clearTimeout(timer);}
   if(alive)mount(module,'three',++attempt);
  }
  void loadWorld().catch(()=>{if(alive)fail(attempt);});
  return ()=>{
   alive=false;++attempt;clearTimeout(timer);
   const previous=active;active=null;release(previous);
   if(actionRef?.current===invoke)actionRef.current=null;
  };
 },[routeId]);
 useEffect(()=>{engine.current?.setPhase(phase);setNote(null);setShot('reset');},[phase]);
 useEffect(()=>{engine.current?.setMotion(reducedMotion);},[reducedMotion]);
 const r=ROUTES[routeId],objectShot=OBJECT_SHOTS[routeId];
 const selectShot=name=>{setShot(name);setNote(null);engine.current?.setAction(name);};
 return <section className="world-stage" aria-label={`${r.area}立体物件探索`}><div data-renderer={rendererName} className={`world-viewer ${compact?'compact':''} ${ready?'is-ready':''} ${failed?'is-fallback':''}`}>
  <div className="world-poster" style={{backgroundImage:`url("${imageFor(routeId)}")`}} aria-hidden="true"/>
  <div className="world-vignette"/>
  <div className="world-canvas" ref={host} aria-label={`${r.area}的可旋转三维档案台`}/>
  <div className="world-corner"><span className="live-dot"/>{failed?'故事概念画面':'INTERACTIVE 3D'}<i/>{r.material}</div>
  {!ready&&!failed&&<div className="world-loading"><span/>正在打开城市档案…</div>}
  {failed&&<div className="world-fallback-message">3D 场景暂未载入，仍可通过下方按钮完成故事。</div>}
  <div className="world-bottom"><span>{failed?'概念美术 · 非历史照片':'拖动旋转 · 方向键调整 · 点选物件'}</span><div><button aria-label="重置三维视角" disabled={!ready||failed} onClick={()=>selectShot('reset')}>复位视角</button><button className="world-action" disabled={!ready||failed} onClick={()=>engine.current?.setAction(r.action)}>{r.object} <span>↗︎</span></button></div></div>
  {note&&<div className="object-caption" role="status"><button aria-label="关闭物件说明" onClick={()=>setNote(null)}>×</button><small>物件中的故事</small><b>{note.title||'新的发现'}</b><p>{note.text||note.description||'继续读证据卡，把这件物品放回故事里。'}</p></div>}
 </div><div className="scene-director"><div className="scene-director-label"><small>LOOK A LITTLE CLOSER</small><strong>换个角度，发现细节。</strong></div><div className="scene-shots" role="group" aria-label="档案镜头">{[['reset','场景全貌'],[objectShot.action,objectShot.label],['focus:architecture','建筑线索']].map(([action,label],i)=><button key={action} disabled={!ready||failed} className={shot===action?'active':''} aria-pressed={shot===action} onClick={()=>selectShot(action)}><small>0{i+1}</small>{label}</button>)}</div><button className="scene-replay" disabled={!ready||failed} onClick={()=>engine.current?.setAction(objectShot.replay)}>重演动作 ↻</button></div></section>;
}
