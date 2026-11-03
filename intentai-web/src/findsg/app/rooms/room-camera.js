const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const finite3=(v,fallback=[0,0,0])=>Array.isArray(v)&&v.length>=3&&v.slice(0,3).every(Number.isFinite)?v.slice(0,3):fallback.slice();
const PRESETS={
  overview:{target:[0,1.85,-.35],yaw:.58,elevation:.48,distance:17.4},
  workbench:{target:[0,1.6,.3],yaw:.23,elevation:.66,distance:9.3},
  shelves:{target:[-2.8,2.35,-3.0],yaw:.12,elevation:.31,distance:9.8}
};
const copyPose=p=>({...p,target:p.target.slice()});

export function normalizeRoomState(value={}){
  const s=value&&typeof value==='object'?value:{};
  return {solved:Array.isArray(s.solved)?[...new Set(s.solved.filter(x=>typeof x==='string'))]:[],selectedId:typeof s.selectedId==='string'?s.selectedId:null,values:s.values&&typeof s.values==='object'&&!Array.isArray(s.values)?{...s.values}:{}};
}

export function makeRoomLabel(document,text,w,h,options={}){
  if(options.texture)return options.texture;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.max(96,Math.min(512,Math.round(512*h/Math.max(.1,w))));
  const c=canvas.getContext('2d');if(!c)return canvas;
  c.fillStyle=options.background||'#173d33';c.fillRect(0,0,canvas.width,canvas.height);
  const padding=Number.isFinite(options.padding)?options.padding:canvas.height*.12;
  if(options.border!==false){c.strokeStyle=typeof options.border==='string'?options.border:'#c4a46c';c.lineWidth=2;c.strokeRect(padding*.55,padding*.55,canvas.width-padding*1.1,canvas.height-padding*1.1);}
  c.fillStyle=options.color||'#ebd5a7';c.textAlign=options.align||'center';c.textBaseline='middle';
  c.font=`${options.fontWeight||500} ${options.fontSize||Math.round(canvas.height*.49)}px ${options.fontFamily||'Georgia, serif'}`;
  c.fillText(String(text??''),c.textAlign==='left'?padding:c.textAlign==='right'?canvas.width-padding:canvas.width/2,canvas.height*.52,canvas.width-padding*2);
  return canvas;
}

/** Shared orbital camera and input. The renderer remains independent. */
export function createRoomCamera(canvas,{reducedMotion=false,onChange=()=>{},onTap=null}={}){
  const win=canvas.ownerDocument.defaultView,now=()=>win.performance.now();
  let disposed=false,reduced=Boolean(reducedMotion),current=copyPose(PRESETS.overview),from=copyPose(current),goal=copyPose(current),started=0,duration=0;
  let pointerStart=null,lastPoint=null,dragged=false,allowPick=true,pinchDistance=0;
  const pointers=new Map(),cleanup=[];
  const camera={position:[0,0,0],target:current.target.slice(),fov:44,near:.12,far:110};
  function write(){const rect=canvas.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height);
    // Preserve the whole cutaway in portrait layouts without pulling close-ups away.
    const fit=1+(clamp(1.12/Math.max(.3,aspect),1,1.9)-1)*clamp((current.distance-9)/8.4,0,1),d=current.distance*fit,ce=Math.cos(current.elevation);camera.target=current.target.slice();camera.position=[camera.target[0]+Math.sin(current.yaw)*ce*d,camera.target[1]+Math.sin(current.elevation)*d,camera.target[2]+Math.cos(current.yaw)*ce*d];
    // The rear and left walls are intact. Keep low close-ups on their interior side.
    if(camera.position[2]<4.8&&camera.position[1]<5.65)camera.position[0]=Math.max(-5.88,camera.position[0]);
    camera.position[1]=Math.max(1.05,camera.position[1]);
    camera.fov=aspect<1.1?52:44;}
  function update(time=now()){
    if(duration>0){const t=clamp((time-started)/duration,0,1),e=1-(1-t)**3;current={target:lerp(from.target,goal.target,e),yaw:mix(from.yaw,goal.yaw,e),elevation:mix(from.elevation,goal.elevation,e),distance:mix(from.distance,goal.distance,e)};if(t===1){duration=0;current=copyPose(goal);}}
    write();return camera;
  }
  function move(next,instant=false){if(disposed)return;update();from=copyPose(current);goal={target:finite3(next.target,current.target),yaw:clamp(next.yaw??current.yaw,-1.28,1.28),elevation:clamp(next.elevation??current.elevation,.18,1.18),distance:clamp(next.distance??current.distance,3.0,27)};started=now();duration=instant||reduced?0:680;if(!duration)current=copyPose(goal);write();onChange();}
  function setView(view,instant=false){if(PRESETS[view])move(PRESETS[view],instant);}
  function focus(position,instant=false){const p=finite3(position);p[0]=clamp(p[0],-5.8,5.8);p[1]=clamp(p[1],.4,5);p[2]=clamp(p[2],-4.3,4.2);move({target:p,yaw:clamp(-p[0]*.065,-.38,.38),elevation:.39,distance:p[2]<-2?6.4:5.6},instant);}
  function orbit(dx,dy){update();move({...current,yaw:current.yaw-dx*.006,elevation:current.elevation+dy*.0045},true);}
  function pan(dx,dy){update();const scale=current.distance*.0017,c=Math.cos(current.yaw),s=Math.sin(current.yaw),target=current.target.slice();target[0]=clamp(target[0]-dx*scale*c,-6,6);target[2]=clamp(target[2]+dx*scale*s,-4.5,4.5);target[1]=clamp(target[1]+dy*scale,.3,5);move({...current,target},true);}
  function zoom(factor){update();move({...current,distance:current.distance*factor},true);}
  function listen(name,fn,options){canvas.addEventListener(name,fn,options);cleanup.push(()=>canvas.removeEventListener(name,fn,options));}
  listen('pointerdown',e=>{
    if(e.button!==0&&e.button!==2)return;
    canvas.focus({preventScroll:true});pointers.set(e.pointerId,[e.clientX,e.clientY]);
    if(pointers.size===1){pointerStart=[e.clientX,e.clientY];lastPoint=pointerStart.slice();dragged=false;allowPick=true;}
    if(pointers.size===2){dragged=true;allowPick=false;const p=[...pointers.values()];pinchDistance=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);}
    try{canvas.setPointerCapture(e.pointerId);}catch{}
  },true);
  listen('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,[e.clientX,e.clientY]);
    if(pointers.size>1){const p=[...pointers.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(pinchDistance>2&&d>2)zoom(pinchDistance/d);pinchDistance=d;dragged=true;allowPick=false;e.preventDefault();return;}
    if(pointerStart&&Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>6){dragged=true;allowPick=false;}
    if(dragged&&lastPoint){const dx=e.clientX-lastPoint[0],dy=e.clientY-lastPoint[1];if(e.shiftKey||e.buttons===2)pan(dx,dy);else orbit(dx,dy);e.preventDefault();}
    lastPoint=[e.clientX,e.clientY];
  },{capture:true,passive:false});
  const release=(e,cancel=false)=>{
    if(!pointers.has(e.pointerId))return;const wasSingle=pointers.size===1;
    if(pointerStart&&Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>6)dragged=true;
    allowPick=!cancel&&!dragged&&wasSingle&&e.button!==2;pointers.delete(e.pointerId);
    try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}catch{}
    if(allowPick&&onTap)onTap(e);
    if(pointers.size){lastPoint=[...pointers.values()][0].slice();pointerStart=lastPoint.slice();dragged=true;allowPick=false;}else{pointerStart=lastPoint=null;pinchDistance=0;}
  };
  listen('pointerup',e=>release(e),true);listen('pointercancel',e=>release(e,true),true);
  listen('wheel',e=>{e.preventDefault();zoom(Math.exp(clamp(e.deltaY,-250,250)*.0015));},{passive:false});
  listen('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey)return;const actions={ArrowLeft:()=>orbit(18,0),ArrowRight:()=>orbit(-18,0),ArrowUp:()=>orbit(0,16),ArrowDown:()=>orbit(0,-16),Home:()=>setView('overview'),'+':()=>zoom(.88),'=':()=>zoom(.88),'-':()=>zoom(1.14),'_':()=>zoom(1.14)};
    if(actions[e.key]){e.preventDefault();actions[e.key]();}
  });
  listen('contextmenu',e=>e.preventDefault());
  canvas.tabIndex=0;canvas.style.touchAction='none';canvas.setAttribute('aria-label','3D room: drag to rotate, scroll or press plus and minus to zoom, arrow keys to adjust, Home for the full view. Objects can also be picked from the list.');
  canvas.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown Home + -');
  write();
  return {camera,update,focus,setView,canPick:()=>allowPick,isAnimating:()=>duration>0,resize(){write();onChange();},setMotion(value){reduced=Boolean(value);if(reduced){current=copyPose(goal);duration=0;write();}onChange();},dispose(){if(disposed)return;disposed=true;cleanup.forEach(fn=>fn());pointers.clear();}};
}

/** Bounded scene updates. No frame loop is left running on a settled room. */
export function createRoomSession(container,canvas,model,{state:initialState,reducedMotion=false,onSelect=()=>{},onError=()=>{},draw,resizeRenderer=()=>{},disposeRenderer=()=>{},pick=null}={}){
  const win=container.ownerDocument.defaultView,document=container.ownerDocument,now=()=>win.performance.now();
  let disposed=false,failed=false,raf=null,reduced=Boolean(reducedMotion),state=normalizeRoomState(initialState),started=now()-1100,lastFrame=0;
  let signature=JSON.stringify(state);const objects=new Map((model.objects||[]).filter(o=>o&&typeof o.id==='string').map(o=>[o.id,{...o,position:finite3(o.position)}]));
  let controller;
  const schedule=()=>{if(!disposed&&!failed&&!document.hidden&&raf===null)raf=win.requestAnimationFrame(frame);};
  function frame(stamp){
    raf=null;if(disposed||failed)return;
    try{
      const camera=controller.update(stamp),time=reduced?1.1:clamp((stamp-started)/1000,0,1.1),active=model.update?.(state,time);
      draw(camera);lastFrame=stamp;
      if(!reduced&&(controller.isAnimating()||(time<1.1&&active!==false)))schedule();
    }catch(error){failed=true;onError(error);}
  }
  function selectObject(id){const object=objects.get(id);if(disposed||failed||!object)return false;const changed=state.selectedId!==id;state={...state,selectedId:id};signature=JSON.stringify(state);if(changed)started=now();controller.focus(object.position);schedule();onSelect({id});return true;}
  controller=createRoomCamera(canvas,{reducedMotion:reduced,onChange:schedule,onTap:pick?event=>{const id=pick(event,controller.camera);if(id)selectObject(id);}:null});
  if(objects.has(state.selectedId))controller.focus(objects.get(state.selectedId).position,true);
  const visibility=()=>{if(document.hidden){if(raf!==null)win.cancelAnimationFrame(raf);raf=null;}else schedule();};document.addEventListener('visibilitychange',visibility);
  function resize(){if(disposed)return;resizeRenderer();controller.resize();schedule();}
  const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;observer?.observe(container);if(!observer)win.addEventListener('resize',resize);
  schedule();
  return {
    camera:controller.camera,objects:[...objects.values()],canPick:controller.canPick,selectObject,
    setState(next){if(disposed)return;const normalized=normalizeRoomState(next),nextSignature=JSON.stringify(normalized);if(nextSignature===signature)return;const changed=normalized.selectedId!==state.selectedId;state=normalized;signature=nextSignature;started=now();if(changed&&objects.has(state.selectedId))controller.focus(objects.get(state.selectedId).position);schedule();},
    setView(view){if(!disposed)controller.setView(view);},
    setMotion(value){if(disposed)return;reduced=Boolean(value);if(reduced)started=now()-1100;controller.setMotion(reduced);schedule();},
    resize,
    dispose(){if(disposed)return;disposed=true;if(raf!==null)win.cancelAnimationFrame(raf);raf=null;observer?.disconnect();if(!observer)win.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);controller.dispose();try{model.dispose?.();}finally{disposeRenderer();}},
    get state(){return normalizeRoomState(state);},get lastFrame(){return lastFrame;}
  };
}
