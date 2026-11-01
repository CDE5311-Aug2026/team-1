import * as THREE from 'three';
import { buildStoryRoom } from './room-models.js';
import { createRoomSession, makeRoomLabel } from './room-camera.js';

function transform(node,value={}){
  for(const key of ['position','rotation','scale'])if(value[key]!==undefined){const a=typeof value[key]==='number'&&key==='scale'?[value[key],value[key],value[key]]:value[key];if(Array.isArray(a)&&a.length>=3&&a.slice(0,3).every(Number.isFinite))node[key].set(...a.slice(0,3));}
  if(value.visible!==undefined)node.visible=Boolean(value.visible);return node;
}

export function createThreeRoomBuilder(scene,document){
  const root=new THREE.Group();scene.add(root);const geometries=new Set(),materials=new Set(),textures=new Set(),materialCache=new WeakMap(),textureCache=new WeakMap();
  function texture(image){if(!image||typeof image!=='object')return null;if(textureCache.has(image))return textureCache.get(image);const t=new THREE.CanvasTexture(image);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;textures.add(t);textureCache.set(image,t);return t;}
  function material(value={}){
    const v=value&&typeof value==='object'?value:{color:value};if(materialCache.has(v))return materialCache.get(v);
    const options={color:v.color??'#e9dec3',map:texture(v.texture),side:THREE.DoubleSide,transparent:(v.opacity??1)<1,opacity:v.opacity??1};
    const m=v.unlit?new THREE.MeshBasicMaterial(options):new THREE.MeshStandardMaterial({...options,roughness:v.roughness??.72,metalness:v.metalness??.12,emissive:v.emissive??0,emissiveIntensity:v.emissiveIntensity??0});
    materials.add(m);materialCache.set(v,m);return m;
  }
  const add=(g,m,parent=root,p=[0,0,0],r=[0,0,0])=>{geometries.add(g);const node=new THREE.Mesh(g,material(m));node.castShadow=(m?.opacity??1)>.7&&!m?.unlit;node.receiveShadow=!m?.unlit;transform(node,{position:p||[0,0,0],rotation:r||[0,0,0]});(parent||root).add(node);return node;};
  return {root,engine:'three.js',software:false,
    group(parent=root,p=[0,0,0],r=[0,0,0]){const node=new THREE.Group();transform(node,{position:p||[0,0,0],rotation:r||[0,0,0]});(parent||root).add(node);return node;},
    box:(w,h,d,m,parent,p,r)=>add(new THREE.BoxGeometry(w,h,d),m,parent,p,r),
    cyl:(radius,h,m,parent,p,r,segments=24,bottomRadius=radius)=>add(new THREE.CylinderGeometry(radius,bottomRadius,h,segments),m,parent,p,r),
    torus:(radius,tube,m,parent,p,r,segments=32)=>add(new THREE.TorusGeometry(radius,tube,8,segments),m,parent,p,r),
    sphere(radius,m,parent,p,scale){return transform(add(new THREE.SphereGeometry(radius,24,16),m,parent,p),{scale:scale||[1,1,1]});},
    plane:(w,h,m,parent,p,r)=>add(new THREE.PlaneGeometry(w,h),m,parent,p,r),
    line(points,r,m,parent){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return add(new THREE.TubeGeometry(curve,Math.max(8,Math.min(80,points.length*4)),r,8,false),m,parent);},
    mesh(data,m,parent,p,r){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));if(data.uvs)g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));if(data.indices)g.setIndex(Array.from(data.indices));if(data.normals)g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));else g.computeVertexNormals();return add(g,m,parent,p,r);},
    label(text,w,h,parent,p,r,options={}){return add(new THREE.PlaneGeometry(w,h),{color:'#ffffff',texture:makeRoomLabel(document,text,w,h,options),roughness:.75,metalness:0,unlit:Boolean(options.unlit),opacity:options.opacity??1},parent,p,r);},
    transform,select(node,id){node.userData.roomObjectId=id;return node;},
    dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();root.clear();geometries.clear();materials.clear();textures.clear();}
  };
}

export function createRoomWorld(container,{routeId='telok-ayer',reducedMotion=false,onReady=()=>{},onSelect=()=>{},state}={}){
  const document=container.ownerDocument,win=document.defaultView;
  let renderer=null,scene=null,builder=null,model=null,session=null,environmentTarget=null,disposed=false,contextLost=false;
  let contextListener=null;
  const cleanupRenderer=()=>{
    if(renderer){if(contextListener)renderer.domElement.removeEventListener('webglcontextlost',contextListener);renderer.renderLists?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
    environmentTarget?.dispose();builder?.dispose();scene?.clear();
  };
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(win.devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.07;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const canvas=renderer.domElement;canvas.className='room-world-canvas';canvas.style.cssText='display:block;width:100%;height:100%;';container.appendChild(canvas);
    scene=new THREE.Scene();scene.background=new THREE.Color('#e7e1d4');scene.fog=new THREE.Fog('#e7e1d4',48,100);
    const camera=new THREE.PerspectiveCamera(44,1,.12,110);
    scene.add(new THREE.HemisphereLight('#fff4db','#68776c',1.55));
    const key=new THREE.DirectionalLight('#ffe4b5',3.0);key.position.set(-5,11,7);key.target.position.set(0,1,0);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;key.shadow.camera.near=.1;key.shadow.camera.far=35;key.shadow.bias=-.001;key.shadow.normalBias=.025;scene.add(key,key.target);
    const fill=new THREE.DirectionalLight('#cadcd5',1.2);fill.position.set(7,6,2);scene.add(fill);
    const warm=new THREE.PointLight('#ffd3a0',9,17,2);warm.position.set(-1,4.7,-1.4);scene.add(warm);
    // Local procedural environment, so reflective brass never needs a remote HDR file.
    const environment=document.createElement('canvas');environment.width=512;environment.height=256;const ctx=environment.getContext('2d');
    if(ctx){const gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#f0e5cb');gradient.addColorStop(.45,'#d4bd97');gradient.addColorStop(.55,'#789084');gradient.addColorStop(1,'#424c3e');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);ctx.fillStyle='#fff4dc';ctx.fillRect(335,35,100,95);ctx.fillStyle='#b1c9c2';ctx.fillRect(74,45,64,80);const envTexture=new THREE.CanvasTexture(environment);envTexture.colorSpace=THREE.SRGBColorSpace;envTexture.mapping=THREE.EquirectangularReflectionMapping;const pmrem=new THREE.PMREMGenerator(renderer);environmentTarget=pmrem.fromEquirectangular(envTexture);scene.environment=environmentTarget.texture;scene.environmentIntensity=.65;envTexture.dispose();pmrem.dispose();}
    builder=createThreeRoomBuilder(scene,document);model=buildStoryRoom(builder,routeId);
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),target=new THREE.Vector3();
    const resizeRenderer=()=>{const rect=container.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height||width*.7);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();};resizeRenderer();
    const draw=view=>{if(disposed||contextLost)return;camera.position.fromArray(view.position);camera.fov=view.fov;target.fromArray(view.target);camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);};
    const pick=event=>{
      const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/Math.max(1,rect.width)*2-1,-(event.clientY-rect.top)/Math.max(1,rect.height)*2+1);raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObject(builder.root,true).find(h=>{let n=h.object;while(n){if(!n.visible)return false;n=n.parent;}return (h.object.material?.opacity??1)>.15;});
      let node=hit?.object;while(node&&!node.userData?.roomObjectId)node=node.parent;return node?.userData?.roomObjectId||null;
    };
    session=createRoomSession(container,canvas,model,{state,reducedMotion,onSelect,draw,pick,resizeRenderer,disposeRenderer:cleanupRenderer,onError:error=>{if(!disposed)onReady({ok:false,engine:'three.js',message:error?.message||'Room render failed'});}});
    contextListener=event=>{event.preventDefault();contextLost=true;if(!disposed)onReady({ok:false,engine:'three.js',message:'WebGL context lost'});};canvas.addEventListener('webglcontextlost',contextListener);
    win.queueMicrotask(()=>{if(!disposed&&!contextLost)onReady({ok:true,engine:'three.js',objects:session.objects});});
    return {engine:'three.js',objects:session.objects,setState:session.setState,selectObject:session.selectObject,setView:session.setView,setMotion:session.setMotion,resize:session.resize,
      dispose(){if(disposed)return;disposed=true;session.dispose();}};
  }catch(error){disposed=true;try{model?.dispose?.();}finally{cleanupRenderer();}throw error;}
}

export const createThreeRoomWorld=createRoomWorld;
export default createRoomWorld;
