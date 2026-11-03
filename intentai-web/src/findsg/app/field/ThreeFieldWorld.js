import * as THREE from 'three';
import {createThreeRoomBuilder} from '../rooms/ThreeRoomWorld.js';
import {buildFieldModel} from './field-models.js';
import {createFieldSession} from './FieldWorld.js';

export function createFieldWorld(container,{routeId,stopId,modelKind='shophouse',progress=0,highlight=false,reducedMotion=false,onReady=()=>{},onInteract=()=>{}}={}){
 let renderer,scene,builder,model,session,disposed=false,contextListener;const win=container.ownerDocument.defaultView;
 const cleanup=()=>{if(renderer){if(contextListener)renderer.domElement.removeEventListener('webglcontextlost',contextListener);renderer.renderLists?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}builder?.dispose();scene?.clear();};
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(win.devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;const canvas=renderer.domElement;canvas.className='field-model-canvas';canvas.style.cssText='display:block;width:100%;height:100%;';container.append(canvas);
  scene=new THREE.Scene();scene.background=new THREE.Color('#e8e0cf');const camera=new THREE.PerspectiveCamera(43,1,.1,80);scene.add(new THREE.HemisphereLight('#fff3d7','#4f796b',2.0));
  const key=new THREE.DirectionalLight('#fff0cf',3.25);key.position.set(-5,9,6);key.target.position.set(0,1.5,0);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:30});key.shadow.bias=-.001;key.shadow.normalBias=.025;scene.add(key,key.target);const fill=new THREE.DirectionalLight('#d4e9e6',1.3);fill.position.set(6,4,-2);scene.add(fill);
  builder=createThreeRoomBuilder(scene,container.ownerDocument);model=buildFieldModel(builder,{routeId,stopId,modelKind,document:container.ownerDocument});const target=new THREE.Vector3(),pointer=new THREE.Vector2(),ray=new THREE.Raycaster();
  const resizeRenderer=()=>{const r=container.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};resizeRenderer();
  const draw=v=>{if(disposed)return;camera.position.fromArray(v.position);target.fromArray(v.target);camera.fov=v.fov;camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);};
  const pick=e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/Math.max(1,r.width)*2-1,1-(e.clientY-r.top)/Math.max(1,r.height)*2);ray.setFromCamera(pointer,camera);const hits=ray.intersectObject(builder.root,true);for(const hit of hits){let n=hit.object,visible=true;while(n){if(!n.visible)visible=false;n=n.parent;}if(!visible)continue;n=hit.object;while(n&&!n.userData?.roomObjectId)n=n.parent;if(n?.userData?.roomObjectId==='field-object')return true;return false;}return false;};
  session=createFieldSession(container,canvas,model,{progress,highlight,reducedMotion,onInteract,draw,pick,resizeRenderer,disposeRenderer:cleanup,onError:error=>{if(!disposed)onReady({ok:false,engine:'three.js',message:error?.message});}});
  contextListener=e=>{e.preventDefault();if(!disposed)onReady({ok:false,engine:'three.js',message:'WebGL context lost'});};canvas.addEventListener('webglcontextlost',contextListener);win.queueMicrotask(()=>{if(!disposed)onReady({ok:true,engine:'three.js'});});
  return {engine:'three.js',setState:session.setState,setView:session.setView,setMotion:session.setMotion,resize:session.resize,dispose(){if(disposed)return;disposed=true;session.dispose();}};
 }catch(error){disposed=true;model?.dispose?.();cleanup();throw error;}
}
export default createFieldWorld;
