import { createStage } from '../native/NativeKit.js';
import { buildStoryRoom } from './room-models.js';
import { createRoomSession, makeRoomLabel } from './room-camera.js';

const vector=(value,fallback=[0,0,0])=>Array.isArray(value)&&value.length>=3&&value.slice(0,3).every(Number.isFinite)?value.slice(0,3):fallback.slice();
function transform(node,value={}){
  for(const key of ['position','rotation','scale'])if(value[key]!==undefined){const a=typeof value[key]==='number'&&key==='scale'?[value[key],value[key],value[key]]:value[key];if(Array.isArray(a)&&a.length>=3&&a.slice(0,3).every(Number.isFinite))node[key]=a.slice(0,3);}
  if(value.visible!==undefined)node.visible=Boolean(value.visible);return node;
}

export function createNativeRoomBuilder(stage,document){
  const root=stage.group(),software=stage.engine==='software-3d';
  const add=(geometry,material,parent=root,p=[0,0,0],r=[0,0,0])=>stage.add(geometry,material||{color:'#e9dec3'},{parent:parent||root,position:vector(p),rotation:vector(r)});
  const c={root,engine:stage.engine,software,
    group(parent=root,p=[0,0,0],r=[0,0,0]){return stage.group({parent:parent||root,position:vector(p),rotation:vector(r)});},
    box:(w,h,d,mat,parent,p,r)=>add(stage.box(w,h,d),mat,parent,p,r),
    cyl:(radius,h,mat,parent,p,r,segments=24,bottomRadius=radius)=>add(stage.cylinder(radius,bottomRadius,h,software?Math.min(16,segments):segments),mat,parent,p,r),
    torus:(radius,tube,mat,parent,p,r,segments=32)=>add(stage.torus(radius,tube,software?Math.min(24,segments):segments,software?5:8),mat,parent,p,r),
    sphere(radius,mat,parent,p,scale){return transform(add(stage.sphere(radius,software?12:24,software?8:16),mat,parent,p),{scale:scale||[1,1,1]});},
    plane:(w,h,mat,parent,p,r)=>add(stage.plane(w,h),mat,parent,p,r),
    line:(points,r,mat,parent)=>add(stage.tube(points,r,software?5:8),mat,parent),
    mesh:(data,mat,parent,p,r)=>add(stage.geometry(data.positions,data.indices,data.normals,data.uvs),mat,parent,p,r),
    label(text,w,h,parent,p,r,options={}){return add(stage.plane(w,h),{color:'#ffffff',texture:makeRoomLabel(document,text,w,h,options),roughness:.75,metalness:0,unlit:Boolean(options.unlit),opacity:options.opacity??1},parent,p,r);},
    transform,select(node,id){node.userData??={};node.userData.roomObjectId=id;return node;}
  };return c;
}

export function createRoomWorld(container,{routeId='telok-ayer',reducedMotion=false,onReady=()=>{},onSelect=()=>{},state}={}){
  let disposed=false,session=null,stage=null,model=null,pendingReady=null;
  const report=result=>{if(disposed)return;if(!session){pendingReady=result;return;}onReady({...result,engine:stage.engine,objects:session.objects});};
  try{
    stage=createStage(container,{background:'#e7e1d4',reducedMotion:true,shadows:true,shadowRange:12,softwareQuality:{maxWidth:1280,maxHeight:960,pixels:900000,pixelRatio:1.4},onReady:report,onPick:node=>{
      if(!session?.canPick())return;let n=node;while(n&&!n.userData?.roomObjectId)n=n.parent;if(n?.userData?.roomObjectId)session.selectObject(n.userData.roomObjectId);
    }});
    if(!stage.ok)throw new Error('Room renderer unavailable');
    stage.canvas.className='room-world-canvas';stage.canvas.style.width='100%';stage.canvas.style.height='100%';
    if(stage.shadow)stage.shadow.target=[0,1.8,-.5];
    model=buildStoryRoom(createNativeRoomBuilder(stage,container.ownerDocument),routeId);
    session=createRoomSession(container,stage.canvas,model,{state,reducedMotion,onSelect,
      draw:camera=>stage.requestDraw(camera),resizeRenderer:()=>stage.resize(),disposeRenderer:()=>stage.dispose(),
      onError:error=>report({ok:false,message:error?.message||'Room render failed'})
    });
    if(pendingReady){const result=pendingReady;pendingReady=null;report(result);}
    return {engine:stage.engine,objects:session.objects,setState:session.setState,selectObject:session.selectObject,setView:session.setView,setMotion:session.setMotion,resize:session.resize,
      dispose(){if(disposed)return;disposed=true;session.dispose();}};
  }catch(error){disposed=true;try{model?.dispose?.();}finally{stage?.dispose?.();}throw error;}
}

export default createRoomWorld;
