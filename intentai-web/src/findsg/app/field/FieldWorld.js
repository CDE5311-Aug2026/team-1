import {createStage} from '../native/NativeKit.js';
import {createNativeRoomBuilder} from '../rooms/RoomWorld.js';
import {buildFieldModel} from './field-models.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t;
const poseCopy=p=>({...p,target:p.target.slice()});

/** Independent exterior orbit. No indoor camera or room model is instantiated. */
export function createFieldSession(container,canvas,model,{progress=0,highlight=false,reducedMotion=false,onInteract=()=>{},draw,resizeRenderer=()=>{},disposeRenderer=()=>{},onError=()=>{},pick=null}={}){
 const doc=container.ownerDocument,win=doc.defaultView,now=()=>win.performance.now();
 let disposed=false,failed=false,raf=null,reduced=Boolean(reducedMotion),state={progress,highlight},selectedView='overview';
 const presets={overview:{target:model.overview.slice(),yaw:.48,elevation:model.kind==='letter'?.72:.32,distance:model.distance},detail:{target:model.detail.slice(),yaw:.18,elevation:model.kind==='letter'?.85:.23,distance:model.kind==='bridge'?4.1:model.kind==='letter'?5.2:5.0}};
 let current=poseCopy(presets.overview),from=poseCopy(current),goal=poseCopy(current),started=0,duration=0,allowPick=true,dragged=false,start=null,last=null,pinch=0;
 const pointers=new Map(),cleanup=[];const camera={position:[0,0,0],target:current.target.slice(),fov:43,near:.1,far:80};
 function updateCamera(stamp=now()){
  if(duration){const t=clamp((stamp-started)/duration,0,1),ease=1-(1-t)**3;current={target:from.target.map((a,i)=>mix(a,goal.target[i],ease)),yaw:mix(from.yaw,goal.yaw,ease),elevation:mix(from.elevation,goal.elevation,ease),distance:mix(from.distance,goal.distance,ease)};if(t===1)duration=0;}
  const rect=canvas.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height),fit=selectedView==='overview'?clamp(1.16/Math.max(.4,aspect),1,1.55):1;
  const d=current.distance*fit,ce=Math.cos(current.elevation);camera.target=current.target.slice();camera.position=[current.target[0]+Math.sin(current.yaw)*ce*d,current.target[1]+Math.sin(current.elevation)*d,current.target[2]+Math.cos(current.yaw)*ce*d];camera.fov=aspect<1?49:43;return camera;
 }
 function schedule(){if(!disposed&&!failed&&!doc.hidden&&raf===null)raf=win.requestAnimationFrame(frame);}
 function frame(stamp){raf=null;if(disposed||failed)return;try{model.update(state);draw(updateCamera(stamp));if(duration&&!reduced)schedule();}catch(error){failed=true;onError(error);}}
 function move(next,instant=false){if(disposed)return;updateCamera();from=poseCopy(current);goal={target:(next.target||current.target).slice(),yaw:next.yaw??current.yaw,elevation:clamp(next.elevation??current.elevation,.12,1.35),distance:clamp(next.distance??current.distance,3,18)};started=now();duration=instant||reduced?0:560;if(!duration)current=poseCopy(goal);schedule();}
 function setView(id){if(!presets[id])return;selectedView=id;move(presets[id]);}
 function orbit(dx,dy){selectedView='custom';move({...current,yaw:current.yaw-dx*.007,elevation:current.elevation+dy*.005},true);}
 function zoom(factor){move({...current,distance:current.distance*factor},true);}
 function listen(name,fn,options){canvas.addEventListener(name,fn,options);cleanup.push(()=>canvas.removeEventListener(name,fn,options));}
 listen('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;canvas.focus({preventScroll:true});pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===1){start=last=[e.clientX,e.clientY];dragged=false;allowPick=true;}else{dragged=true;allowPick=false;const a=[...pointers.values()];pinch=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);}try{canvas.setPointerCapture(e.pointerId);}catch{}},true);
 listen('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size>1){const a=[...pointers.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(d>2&&pinch>2)zoom(pinch/d);pinch=d;allowPick=false;dragged=true;e.preventDefault();return;}if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>6){dragged=true;allowPick=false;}if(dragged&&last){orbit(e.clientX-last[0],e.clientY-last[1]);e.preventDefault();}last=[e.clientX,e.clientY];},{capture:true,passive:false});
 const release=(e,cancel=false)=>{if(!pointers.has(e.pointerId))return;const single=pointers.size===1;allowPick=!cancel&&single&&!dragged&&e.button!==2;if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)allowPick=false;pointers.delete(e.pointerId);try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}catch{}if(allowPick&&pick&&pick(e,camera))onInteract();if(pointers.size){last=start=[...pointers.values()][0];allowPick=false;dragged=true;}else{start=last=null;pinch=0;}};
 listen('pointerup',e=>release(e),true);listen('pointercancel',e=>release(e,true),true);listen('wheel',e=>{e.preventDefault();zoom(Math.exp(clamp(e.deltaY,-200,200)*.0015));},{passive:false});
 listen('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey)return;const actions={ArrowLeft:()=>orbit(20,0),ArrowRight:()=>orbit(-20,0),ArrowUp:()=>orbit(0,15),ArrowDown:()=>orbit(0,-15),Home:()=>setView('overview'),'+':()=>zoom(.88),'=':()=>zoom(.88),'-':()=>zoom(1.14)};if(actions[e.key]){e.preventDefault();actions[e.key]();}});listen('contextmenu',e=>e.preventDefault());
 canvas.tabIndex=0;canvas.style.touchAction='none';canvas.setAttribute('aria-label',model.name+'：拖动旋转、滚轮或双指缩放；方向键调整，Home 返回整体。');canvas.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown Home + -');
 const visibility=()=>{if(doc.hidden){if(raf!==null)win.cancelAnimationFrame(raf);raf=null;}else schedule();};doc.addEventListener('visibilitychange',visibility);
 function resize(){if(disposed)return;resizeRenderer();schedule();}
 const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;observer?.observe(container);if(!observer)win.addEventListener('resize',resize);schedule();
 return {canPick:()=>allowPick,setView,setState(next){state={progress:Number(next?.progress)||0,highlight:Boolean(next?.highlight)};schedule();},setMotion(value){reduced=Boolean(value);if(reduced){duration=0;current=poseCopy(goal);}schedule();},resize,
  dispose(){if(disposed)return;disposed=true;if(raf!==null)win.cancelAnimationFrame(raf);observer?.disconnect();if(!observer)win.removeEventListener('resize',resize);doc.removeEventListener('visibilitychange',visibility);cleanup.forEach(fn=>fn());pointers.clear();model.dispose?.();disposeRenderer();}
 };
}

export function createFieldWorld(container,{routeId,stopId,modelKind='shophouse',progress=0,highlight=false,reducedMotion=false,onReady=()=>{},onInteract=()=>{}}={}){
 let stage=null,model=null,session=null,disposed=false,pending=null;
 const report=result=>{if(disposed)return;if(!session){pending=result;return;}onReady({...result,engine:stage.engine});};
 try{
  stage=createStage(container,{background:'#e8e0cf',shadows:true,shadowRange:8,reducedMotion:true,softwareQuality:{maxWidth:1180,maxHeight:900,pixels:760000,pixelRatio:1.35},onReady:report,onPick:node=>{if(!session?.canPick())return;let n=node;while(n&&!n.userData?.roomObjectId)n=n.parent;if(n?.userData?.roomObjectId==='field-object')onInteract();}});
  if(!stage.ok)throw new Error('Field renderer unavailable');stage.canvas.className='field-model-canvas';if(stage.shadow)stage.shadow.target=[0,1.5,0];
  model=buildFieldModel(createNativeRoomBuilder(stage,container.ownerDocument),{routeId,stopId,modelKind,document:container.ownerDocument});
  session=createFieldSession(container,stage.canvas,model,{progress,highlight,reducedMotion,onInteract,draw:camera=>stage.requestDraw(camera),resizeRenderer:()=>stage.resize(),disposeRenderer:()=>stage.dispose(),onError:error=>report({ok:false,message:error?.message||'Field model failed'})});
  if(pending){const p=pending;pending=null;report(p);}
  return {engine:stage.engine,setState:session.setState,setView:session.setView,setMotion:session.setMotion,resize:session.resize,dispose(){if(disposed)return;disposed=true;session.dispose();}};
 }catch(error){disposed=true;model?.dispose?.();stage?.dispose?.();throw error;}
}
export default createFieldWorld;
