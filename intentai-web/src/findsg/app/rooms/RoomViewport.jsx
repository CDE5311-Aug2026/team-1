import React,{useEffect,useRef,useState} from 'react';
import {imageFor} from '../data.js';

export default function RoomViewport({routeId,title,state,reducedMotion,onInspect,controlRef}){
 const host=useRef(null),engine=useRef(null),callback=useRef(onInspect);
 const latest=useRef({state,reducedMotion});latest.current={state,reducedMotion};callback.current=onInspect;
 const [status,setStatus]=useState('loading'),[renderer,setRenderer]=useState('loading'),[view,setView]=useState('overview');
 useEffect(()=>{
  let alive=true,attempt=0,active=null,timer,nativeStarted=false;
  setStatus('loading');setRenderer('loading');setView(latest.current.state?.selectedId?'object':'overview');
  const valid=token=>alive&&attempt===token;
  const controls={
   selectObject:id=>{setView('object');engine.current?.selectObject(id);},
   setView:id=>{setView(id);engine.current?.setView(id);}
  };
  if(controlRef)controlRef.current=controls;
  function release(record){
   if(!record)return;
   if(engine.current===record.instance)engine.current=null;
   try{record.instance?.dispose();}catch(error){console.warn('Room cleanup',error);}
   record.surface.remove();
  }
  function failed(token){if(valid(token)){setStatus('fallback');setRenderer('poster');}}
  function mount(module,kind,token){
   if(!valid(token)||!host.current)return;
   const surface=document.createElement('div');surface.style.cssText='width:100%;height:100%;';
   host.current.append(surface);
   let constructing=true,instance;const pending=[];
   const ready=result=>{
    if(!valid(token))return;
    if(result?.ok===false&&kind==='three'){void loadNative();return;}
    setStatus(result?.ok===false?'fallback':'ready');setRenderer(result?.engine||kind);
   };
   try{
    instance=module.createRoomWorld(surface,{routeId,...latest.current,
     onSelect:item=>{if(valid(token)&&item?.id){setView('object');callback.current?.(item.id);}},
     onReady:result=>{if(!valid(token))return;if(constructing)pending.push(result);else ready(result);}
    });
    if(!instance)throw new Error('Room factory returned no instance');
   }catch(error){
    constructing=false;surface.remove();
    if(!valid(token)){try{instance?.dispose();}catch{}return;}
    if(kind==='three')void loadNative();else failed(token);
    return;
   }
   constructing=false;
   const record={instance,surface};
   if(!valid(token)){release(record);return;}
   active=record;engine.current=instance;instance.setState?.(latest.current.state);
   for(const result of pending){if(!valid(token))break;ready(result);}
  }
  async function loadNative(){
   if(!alive||nativeStarted)return;
   nativeStarted=true;const token=++attempt,previous=active;active=null;release(previous);
   setStatus('loading');
   try{const module=await import('./RoomWorld.js');if(valid(token))mount(module,'native-webgl',token);}
   catch(error){console.warn('Room unavailable',error);failed(token);}
  }
  async function open(){
   try{
    const module=await Promise.race([import('./ThreeRoomWorld.js'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Room engine unavailable')),2200);})]);
    if(alive)mount(module,'three',++attempt);
   }catch{if(alive)await loadNative();}
   finally{clearTimeout(timer);}
  }
  void open();
  return ()=>{
   alive=false;++attempt;clearTimeout(timer);const previous=active;active=null;release(previous);
   if(controlRef?.current===controls)controlRef.current=null;
  };
 },[routeId]);
 useEffect(()=>{engine.current?.setState(state);},[state]);
 useEffect(()=>{engine.current?.setMotion(reducedMotion);},[reducedMotion]);
 const chooseView=id=>{setView(id);engine.current?.setView(id);};
 return <div className={'room-viewport room-render-'+status} data-renderer={renderer}>
  <div className="room-scene-poster" style={{backgroundImage:'url("'+imageFor(routeId)+'")'}} aria-hidden="true"/>
  <div ref={host} className="room-canvas-host" aria-label={title+'的可旋转三维房间'}/>
  <div className="room-scene-vignette" aria-hidden="true"/>
  <div className="room-frame-top"><span><i/>{status==='ready'?'可探索的 3D 空间':status==='loading'?'正在打开房间':'故事空间预览'}</span><b>FINDSG / ROOMS</b></div>
  {status==='loading'&&<div className="room-loading"><span/><strong>灯已点亮，故事正展开。</strong><small>正在载入房间与物件</small></div>}
  {status==='fallback'&&<div className="room-loading"><strong>房间暂时未能载入</strong><small>可用下方物件列表继续检查线索与操作机关。</small></div>}
  <div className="room-view-switch" role="group" aria-label="房间镜头">
   {[['overview','整间房间'],['workbench','工作台'],['shelves','档案架']].map(([id,label])=><button key={id} type="button" aria-pressed={view===id} disabled={status!=='ready'} onClick={()=>chooseView(id)}>{label}</button>)}
  </div>
  <div className="room-scene-bottom"><span>拖动环顾 · 滚轮缩放 · 点击物件走近</span><span>概念场景 / 剧情道具</span></div>
 </div>;
}
