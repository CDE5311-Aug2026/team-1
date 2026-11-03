import React,{useEffect,useRef,useState} from 'react';
import {FIELD_MODEL_NAMES} from './field-models.js';
import './field-viewport.css';

export default function FieldViewport({routeId,stopId,modelKind='shophouse',reducedMotion=false,progress=0,highlight=false,onInteract}){
 const host=useRef(null),engine=useRef(null),callback=useRef(onInteract),latest=useRef({progress,highlight,reducedMotion});callback.current=onInteract;latest.current={progress,highlight,reducedMotion};
 const [status,setStatus]=useState('loading'),[renderer,setRenderer]=useState('loading'),[view,setView]=useState('overview'),[touched,setTouched]=useState(false);
 useEffect(()=>{
  let alive=true,attempt=0,active=null,timer,nativeStarted=false;setStatus('loading');setRenderer('loading');setView('overview');setTouched(false);
  const valid=token=>alive&&attempt===token;
  const release=record=>{if(!record)return;if(engine.current===record.instance)engine.current=null;try{record.instance?.dispose();}catch{}record.surface.remove();};
  const fail=token=>{if(valid(token)){setStatus('fallback');setRenderer('unavailable');}};
  function mount(module,kind,token){if(!valid(token)||!host.current)return;const surface=document.createElement('div');surface.style.cssText='width:100%;height:100%;';host.current.append(surface);let constructing=true,instance;const pending=[];
   const ready=result=>{if(!valid(token))return;if(result?.ok===false&&kind==='three'){void loadNative();return;}setStatus(result?.ok===false?'fallback':'ready');setRenderer(result?.engine||kind);};
   try{instance=module.createFieldWorld(surface,{routeId,stopId,modelKind,...latest.current,onInteract:()=>{if(valid(token)){setTouched(true);callback.current?.();}},onReady:result=>{if(!valid(token))return;if(constructing)pending.push(result);else ready(result);}});if(!instance)throw Error('Field factory unavailable');}
   catch{constructing=false;surface.remove();if(!valid(token)){try{instance?.dispose();}catch{}return;}if(kind==='three')void loadNative();else fail(token);return;}
   constructing=false;const record={surface,instance};if(!valid(token)){release(record);return;}active=record;engine.current=instance;instance.setState?.(latest.current);for(const result of pending){if(!valid(token))break;ready(result);}
  }
  async function loadNative(){if(!alive||nativeStarted)return;nativeStarted=true;const token=++attempt,previous=active;active=null;release(previous);try{const module=await import('./FieldWorld.js');if(valid(token))mount(module,'native-webgl',token);}catch{fail(token);}}
  async function open(){try{const module=await Promise.race([import('./ThreeFieldWorld.js'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('3D engine unavailable')),1600);})]);if(alive)mount(module,'three',++attempt);}catch{if(alive)await loadNative();}finally{clearTimeout(timer);}}
  void open();return ()=>{alive=false;++attempt;clearTimeout(timer);release(active);active=null;};
 },[routeId,stopId,modelKind]);
 useEffect(()=>{engine.current?.setState({progress,highlight});},[progress,highlight]);useEffect(()=>{engine.current?.setMotion(reducedMotion);},[reducedMotion]);
 const choose=id=>{setView(id);engine.current?.setView(id);};
 return <div className={'field-viewport field-model-'+status} data-renderer={renderer}>
  <div ref={host} className="field-model-host" aria-label={(FIELD_MODEL_NAMES[modelKind]||'地点细节')+'三维观察模型'}/>
  <div className="field-model-top"><span>随身观察模型</span><small>{FIELD_MODEL_NAMES[modelKind]||'地点细节'}</small></div>
  <div className="field-model-views" role="group" aria-label="建筑观察镜头">{[['overview','整体'],['detail','细节']].map(([id,label])=><button key={id} type="button" aria-pressed={view===id} disabled={status!=='ready'} onClick={()=>choose(id)}>{label}</button>)}</div>
  {status==='loading'&&<div className="field-model-message"><strong>展开这一站的细节</strong><span>正在载入观察模型</span></div>}
  {status==='fallback'&&<div className="field-model-message"><strong>模型暂时无法显示</strong><span>仍可用现场观察与资料卡完成本站任务。</span></div>}
  <span className={'field-model-observed '+(touched?'visible':'')} role="status">已检查模型 · 回到现场寻找对应细节</span>
  <div className="field-model-bottom"><span>拖动旋转 · 双指 / 滚轮缩放</span><span>建筑细节示意 · 以现场外观和资料为准</span></div>
 </div>;
}
