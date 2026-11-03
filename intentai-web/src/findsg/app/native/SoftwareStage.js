/* Independent CPU 3D renderer: real scene graph, perspective, lit triangles, canvas materials.
   Used only when a GPU context is unavailable. It deliberately reports software-3d. */
export function createSoftwareStage(container,options,kit){
 const {background=0xcfc8b6,onReady=()=>{},onPick=()=>{},reducedMotion=false}=options;
 const requestedQuality=options.softwareQuality&&typeof options.softwareQuality==='object'?options.softwareQuality:{};
 const budget=(value,fallback,limit)=>Number.isFinite(value)&&value>0?Math.min(value,limit):fallback;
 const quality={maxWidth:budget(requestedQuality.maxWidth,900,4096),maxHeight:budget(requestedQuality.maxHeight,600,4096),pixels:budget(requestedQuality.pixels,420000,8000000),pixelRatio:budget(requestedQuality.pixelRatio,1,2)};
 const {box,cylinder,sphere,torus,plane,geometry,tube,canvasTexture,multiply,compose,lookAt,perspective,rgb}=kit;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
 if(!ctx)return null;
 canvas.style.cssText='display:block;width:100%;height:100%;touch-action:pan-y;';canvas.tabIndex=0;canvas.setAttribute('aria-label','Rotatable 3D scene, rendered in software with true perspective, no graphics acceleration needed');
 container.append(canvas);
 let serial=0,disposed=false,visible=true,hidden=document.hidden,raf=0,loopTimer=0,running=false,tick=null,last=0,time=0,camera=null,hitTriangles=[];
 let pending=false,pendingCamera=null,lastFrameAt=0,averageDrawMs=28,lastSignature=null,skippedFrames=0,referenceSerial=0;
 const referenceIds=new WeakMap();
 const roots=[],nodes=new Map(),geometryCache=new WeakMap(),listeners=[];
 const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 const normalize=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const light=normalize([-7,12,8]);
 const stage={ok:true,engine:'software-3d',canvas,reducedMotion,softwareQuality:quality,root:roots,shadow:{enabled:false,range:15,target:[0,0,0]},box,plane,geometry,canvasTexture,
  cylinder:(rt=.5,rb=.5,h=1,segments=32)=>cylinder(rt,rb,h,Math.min(24,segments)),
  sphere:(r=.5,segments=24,rings=16)=>sphere(r,Math.min(16,segments),Math.min(10,rings)),
  torus:(r=1,t=.08,segments=48,tubeSegments=10)=>torus(r,t,Math.min(32,segments),Math.min(6,tubeSegments)),
  tube:(points,r=.03,segments=8)=>tube(points,r,Math.min(6,segments))
 };
 function makeNode(g,m,o={}){const n={id:++serial,geometry:g,material:m||{},position:o.position?[...o.position]:[0,0,0],rotation:o.rotation?[...o.rotation]:[0,0,0],scale:o.scale?(typeof o.scale==='number'?[o.scale,o.scale,o.scale]:[...o.scale]):[1,1,1],parent:o.parent||null,children:[],visible:true,userData:{},world:identity()};(n.parent?n.parent.children:roots).push(n);nodes.set(n.id,n);return n;}
 stage.add=(g,m,o={})=>makeNode(g,m,o);stage.group=(o={})=>makeNode(null,null,o);stage.remove=n=>{const list=n.parent?n.parent.children:roots,i=list.indexOf(n);if(i>=0)list.splice(i,1);n.visible=false;};
 function flatten(list,parent,out){for(const n of list){if(!n.visible)continue;n.world=multiply(parent,compose(n.position,n.rotation,n.scale));if(n.geometry)out.push(n);flatten(n.children,n.world,out);}}
 function prepare(g){let data=geometryCache.get(g);if(data&&data.version===(g.version||0))return data;const source=g.normals&&g.uvs?g:geometry(g.positions,g.indices,g.normals,g.uvs);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<source.positions.length;i++) {const a=i%3;min[a]=Math.min(min[a],source.positions[i]);max[a]=Math.max(max[a],source.positions[i]);}const center=min.map((v,i)=>(v+max[i])*.5),radius=Math.hypot(...max.map((v,i)=>v-center[i]));data={positions:source.positions,normals:source.normals,uvs:source.uvs,indices:source.indices||Array.from({length:source.positions.length/3},(_,i)=>i),version:g.version||0,center,radius};geometryCache.set(g,data);return data;}
 function normalMatrix(m){const a=[m[0],m[1],m[2]],b=[m[4],m[5],m[6]],c=[m[8],m[9],m[10]],x=cross(b,c),det=dot(a,x)||1;return [...x,...cross(c,a),...cross(a,b)].map(v=>v/det);}
 function projectVertex(matrix,v){return {x:matrix[0]*v[0]+matrix[4]*v[1]+matrix[8]*v[2]+matrix[12],y:matrix[1]*v[0]+matrix[5]*v[1]+matrix[9]*v[2]+matrix[13],z:matrix[2]*v[0]+matrix[6]*v[1]+matrix[10]*v[2]+matrix[14],w:matrix[3]*v[0]+matrix[7]*v[1]+matrix[11]*v[2]+matrix[15],u:v[3]||0,v:v[4]||0};}
 function clipNear(input){const output=[];for(let i=0;i<input.length;i++){const a=input[i],b=input[(i+1)%input.length],da=a.z+a.w,db=b.z+b.w,insideA=da>=0,insideB=db>=0;if(insideA)output.push(a);if(insideA!==insideB){const t=da/(da-db),v={};for(const k of ['x','y','z','w','u','v'])v[k]=a[k]+(b[k]-a[k])*t;output.push(v);}}return output;}
 function colorFor(material,normal,center,eye){const base=rgb(material.color??0xffffff),em=rgb(material.emissive??0),ei=material.emissiveIntensity??(material.emissive?1:0);if(material.unlit)return base.map((v,i)=>Math.min(1,v+em[i]*ei));const n=normalize(normal),diff=Math.max(0,dot(n,light)),hemi=.40+.18*(n[1]*.5+.5),V=normalize(eye.map((v,i)=>v-center[i])),H=normalize(V.map((v,i)=>v+light[i])),rough=material.roughness??.75,metal=material.metalness??0,spec=Math.pow(Math.max(0,dot(n,H)),9+115*(1-rough)**2)*(.09+.6*metal);return base.map((v,i)=>Math.min(1,Math.max(0,v*(hemi+diff*.70*[1.08,1,.86][i])*(1-metal*.12)+spec*(metal?v:.95)+em[i]*ei)));}
 const css=color=>`rgb(${Math.round(color[0]*255)},${Math.round(color[1]*255)},${Math.round(color[2]*255)})`;
 function addTriangles(node,vp,eye,out){const g=prepare(node.geometry),m=node.world,normalMat=normalMatrix(m),mat=node.material||{},alpha=mat.opacity??1;if(alpha<.012)return;const mp=multiply(vp,m),world=[],projected=[],wp=g.positions,np=g.normals;
  const centerClip=projectVertex(mp,g.center),radius=g.radius;for(const axis of [0,1,2])for(const sign of [-1,1]){const value=[centerClip.x,centerClip.y,centerClip.z][axis]*sign+centerClip.w,span=radius*Math.hypot(mp[axis]*sign+mp[3],mp[axis+4]*sign+mp[7],mp[axis+8]*sign+mp[11]);if(value < -span)return;}
  for(let i=0;i<wp.length;i+=3){const v=[wp[i],wp[i+1],wp[i+2],g.uvs[i/3*2]||0,g.uvs[i/3*2+1]||0];world.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);projected.push(projectVertex(mp,v));}
  const idx=g.indices;
  for(let k=0;k<idx.length;k+=3){const ia=idx[k],ib=idx[k+1],ic=idx[k+2],wa=world[ia],wb=world[ib],wc=world[ic];if(!wa||!wb||!wc)continue;const center=[(wa[0]+wb[0]+wc[0])/3,(wa[1]+wb[1]+wc[1])/3,(wa[2]+wb[2]+wc[2])/3],raw=[np[ia*3]+np[ib*3]+np[ic*3],np[ia*3+1]+np[ib*3+1]+np[ic*3+1],np[ia*3+2]+np[ib*3+2]+np[ic*3+2]],normal=[normalMat[0]*raw[0]+normalMat[3]*raw[1]+normalMat[6]*raw[2],normalMat[1]*raw[0]+normalMat[4]*raw[1]+normalMat[7]*raw[2],normalMat[2]*raw[0]+normalMat[5]*raw[1]+normalMat[8]*raw[2]],facing=dot(normal,eye.map((v,i)=>v-center[i]));
   if(facing<=0&&!mat.doubleSided)continue;
   if(facing<=0)for(let n=0;n<3;n++)normal[n]*=-1;
   const a=projected[ia],b=projected[ib],c=projected[ic];if([a,b,c].every(v=>v.z>v.w)||[a,b,c].every(v=>v.x< -v.w)||[a,b,c].every(v=>v.x>v.w)||[a,b,c].every(v=>v.y< -v.w)||[a,b,c].every(v=>v.y>v.w))continue;
   const clipped=clipNear([a,b,c]);if(clipped.length<3)continue;const color=colorFor(mat,normal,center,eye),ys=[wa[1],wb[1],wc[1]],isGround=Math.max(...ys)<.045,flatLow=Math.max(...ys)-Math.min(...ys)<.025&&center[1]<.30&&normal[1]>0;const layer=isGround?-40+Math.max(-20,Math.min(6,Math.round(center[1]*160))):flatLow?(alpha<.95?-5:-10):0;
   for(let j=1;j<clipped.length-1;j++){const vertices=[clipped[0],clipped[j],clipped[j+1]].map(v=>({x:(v.x/v.w*.5+.5)*canvas.width,y:(.5-v.y/v.w*.5)*canvas.height,w:v.w,u:v.u,v:v.v}));if(vertices.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.y)||v.w<=0))continue;const area=Math.abs((vertices[1].x-vertices[0].x)*(vertices[2].y-vertices[0].y)-(vertices[1].y-vertices[0].y)*(vertices[2].x-vertices[0].x))*.5;if(area<.45)continue;out.push({vertices,depth:(vertices[0].w+vertices[1].w+vertices[2].w)/3,layer,color,mat,node,area});}
  }
 }
 let raster=null;const texturePixels=new WeakMap();
 function textureData(image){
  if(!image?.width||!image?.height)return null;
  let t=texturePixels.get(image);if(t)return t;
  try{
   let source=image;
   if(typeof image.getContext!=='function'){source=document.createElement('canvas');source.width=image.width;source.height=image.height;source.getContext('2d').drawImage(image,0,0);}
   const pixels=source.getContext('2d').getImageData(0,0,image.width,image.height);
   t={width:image.width,height:image.height,data:pixels.data};texturePixels.set(image,t);return t;
  }catch{return null;}
 }
 function buffers(){
  const count=canvas.width*canvas.height;
  if(!raster||raster.width!==canvas.width||raster.height!==canvas.height){
   const image=ctx.createImageData(canvas.width,canvas.height);
   raster={width:canvas.width,height:canvas.height,image,pixels:new Uint32Array(image.data.buffer),depth:new Float32Array(count),ids:new Uint32Array(count)};
  }
  return raster;
 }
 function rasterTriangle(t,frame,transparent){
  const v=t.vertices,[a,b,c]=v,w=frame.width,h=frame.height;
  const denominator=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  if(Math.abs(denominator)<.00001)return;
  const x0=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),x1=Math.min(w-1,Math.ceil(Math.max(a.x,b.x,c.x)));
  const y0=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),y1=Math.min(h-1,Math.ceil(Math.max(a.y,b.y,c.y)));
  if(x1<x0||y1<y0)return;
  const A0=(b.y-c.y)/denominator,B0=(c.x-b.x)/denominator,C0=(b.x*c.y-c.x*b.y)/denominator;
  const A1=(c.y-a.y)/denominator,B1=(a.x-c.x)/denominator,C1=(c.x*a.y-a.x*c.y)/denominator;
  const za=1/a.w,zb=1/b.w,zc=1/c.w,da=za-zc,db=zb-zc;
  const texture=t.mat.texture?textureData(t.mat.texture):null,tex=texture?.data,tw=texture?.width||1,th=texture?.height||1;
  const ua=a.u*za,ub=b.u*zb,uc=c.u*zc,va=a.v*za,vb=b.v*zb,vc=c.v*zc;
  const opacity=t.mat.opacity??1,shade=t.color;
  const flatR=Math.max(0,Math.min(255,Math.round(shade[0]*255))),flatG=Math.max(0,Math.min(255,Math.round(shade[1]*255))),flatB=Math.max(0,Math.min(255,Math.round(shade[2]*255)));
  const flatPixel=(255<<24)|(flatB<<16)|(flatG<<8)|flatR;
  const data=frame.image.data,depth=frame.depth,ids=frame.ids,pixels=frame.pixels;
  for(let y=y0;y<=y1;y++){
   let p0=A0*(x0+.5)+B0*(y+.5)+C0,p1=A1*(x0+.5)+B1*(y+.5)+C1,index=y*w+x0;
   for(let x=x0;x<=x1;x++,index++,p0+=A0,p1+=A1){
    if(p0<-.000001||p1<-.000001||p0+p1>1.000001)continue;
    const inverseDepth=zc+p0*da+p1*db;
    if(inverseDepth<=0||inverseDepth+1e-8<depth[index])continue;
    if(!texture&&!transparent){pixels[index]=flatPixel;depth[index]=inverseDepth;ids[index]=t.node.id;continue;}
    let alpha=opacity,r=flatR,g=flatG,b=flatB;
    if(texture){
     const u=(uc+p0*(ua-uc)+p1*(ub-uc))/inverseDepth,vv=(vc+p0*(va-vc)+p1*(vb-vc))/inverseDepth;
     const tx=Math.max(0,Math.min(tw-1,Math.round(u*(tw-1)))),ty=Math.max(0,Math.min(th-1,Math.round((1-vv)*(th-1)))),ti=(ty*tw+tx)*4;
     alpha*=tex[ti+3]/255;if(alpha<.01)continue;
     r=Math.min(255,tex[ti]*shade[0]);g=Math.min(255,tex[ti+1]*shade[1]);b=Math.min(255,tex[ti+2]*shade[2]);
    }
    const i=index*4;
    if(alpha>=.995){data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;}
    else{const inv=1-alpha;data[i]=r*alpha+data[i]*inv;data[i+1]=g*alpha+data[i+1]*inv;data[i+2]=b*alpha+data[i+2]*inv;data[i+3]=255;}
    if(!transparent&&alpha>=.995)depth[index]=inverseDepth;
    if(alpha>.7)ids[index]=t.node.id;
   }
  }
 }
 function signature(nextCamera){
  let hash=2166136261;
  const mix=value=>{hash=Math.imul(hash^(Math.round((Number(value)||0)*10000)|0),16777619);};
  const ref=value=>{if(!value||typeof value!=='object')return 0;if(!referenceIds.has(value))referenceIds.set(value,++referenceSerial);return referenceIds.get(value);};
  const color=value=>{if(Array.isArray(value)||ArrayBuffer.isView(value)){for(const v of value)mix(v);}else if(typeof value==='string'){mix(parseInt(value.replace('#',''),16));}else mix(value);};
  mix(canvas.width);mix(canvas.height);
  for(const key of ['position','target','up','viewProjection'])if(nextCamera[key])for(const value of nextCamera[key])mix(value);
  mix(nextCamera.fov||42);mix(nextCamera.near||.1);mix(nextCamera.far||180);
  for(const node of nodes.values()){
   mix(node.id);mix(node.visible?1:0);mix(node.parent?.id||0);
   if(!node.visible)continue;
   for(const values of [node.position,node.rotation,node.scale])for(const value of values)mix(value);
   mix(ref(node.geometry));mix(node.geometry?.version||0);
   if(node.geometry){const m=node.material||{};color(m.color??0xffffff);color(m.emissive??0);mix(m.emissiveIntensity??(m.emissive?1:0));mix(m.opacity??1);mix(m.roughness??.75);mix(m.metalness??0);mix(m.unlit?1:0);mix(m.doubleSided?1:0);mix(ref(m.texture));}
  }
  return hash;
 }
 function draw(nextCamera){
  if(disposed||!nextCamera||hidden||!visible)return;
  camera=nextCamera;
  const currentSignature=signature(camera);if(currentSignature===lastSignature){skippedFrames++;if(stage.stats)stage.stats.skipped_frames=skippedFrames;return false;}
  const started=performance.now();
  const view=lookAt(camera.position,camera.target||[0,0,0],camera.up||[0,1,0]);
  const vp=camera.viewProjection||multiply(perspective(camera.fov||42,canvas.width/canvas.height,camera.near||.1,camera.far||180),view),list=[],triangles=[];
  flatten(roots,identity(),list);for(const node of list)addTriangles(node,vp,camera.position,triangles);
  const frame=buffers(),bg=rgb(background),packed=(255<<24)|(Math.round(bg[2]*255)<<16)|(Math.round(bg[1]*255)<<8)|Math.round(bg[0]*255);
  frame.pixels.fill(packed);frame.depth.fill(0);frame.ids.fill(0);
  // Per-pixel reciprocal camera depth resolves near-coplanar window/wall and
  // paper/cover intersections. Transparent objects keep back-to-front blending.
  const transparent=[];triangles.sort((a,b)=>a.depth-b.depth);
  for(const triangle of triangles){if((triangle.mat.opacity??1)<.999)transparent.push(triangle);else rasterTriangle(triangle,frame,false);}
  transparent.sort((a,b)=>b.depth-a.depth);
  for(const triangle of transparent)rasterTriangle(triangle,frame,true);
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.putImageData(frame.image,0,0);
  hitTriangles=triangles;lastSignature=currentSignature;const drawMs=performance.now()-started;averageDrawMs=averageDrawMs*.65+drawMs*.35;stage.stats={triangles:triangles.length,nodes:list.length,engine:'software-3d',occlusion:'per-pixel-depth',pixels:canvas.width*canvas.height,draw_ms:Math.round(drawMs),average_draw_ms:Math.round(averageDrawMs),skipped_frames:skippedFrames,target_fps:Math.round(1000/Math.max(1000/18,averageDrawMs*2.6))};return true;
 }
 function resize(){
  if(disposed)return;
  const b=container.getBoundingClientRect(),cssW=Math.max(1,b.width),cssH=Math.max(1,b.height||b.width*.70);
  // A bounded opt-in quality budget lets settled rooms supersample. Legacy scenes
  // retain the original 1x / 900x600 / 420000-pixel budget and scheduling behavior.
  const scale=Math.min(quality.pixelRatio,quality.maxWidth/cssW,quality.maxHeight/cssH,Math.sqrt(quality.pixels/(cssW*cssH)));
  const w=Math.max(1,Math.floor(cssW*scale)),h=Math.max(1,Math.floor(cssH*scale));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;lastSignature=null;if(camera)requestDraw(camera);}
 }
 function cancelScheduled(){if(raf)cancelAnimationFrame(raf);if(loopTimer)clearTimeout(loopTimer);raf=0;loopTimer=0;}
 function stop(){cancelScheduled();running=false;pending=false;pendingCamera=null;last=0;}
 function schedule(){
  if(disposed||hidden||!visible||raf||loopTimer)return;
  if(!pending&&(!running||stage.reducedMotion))return;
  const interval=Math.max(1000/18,averageDrawMs*2.6),delay=Math.max(16,interval-(performance.now()-lastFrameAt));
  loopTimer=setTimeout(()=>{loopTimer=0;if(!disposed&&!hidden&&visible)raf=requestAnimationFrame(frame);},delay);
 }
 function frame(ms){
  raf=0;if(disposed||hidden||!visible){stop();return;}
  const requested=pending,requestedCamera=pendingCamera;pending=false;pendingCamera=null;
  if(!requested&&(!running||stage.reducedMotion))return;
  lastFrameAt=performance.now();
  const dt=stage.reducedMotion?0:(last?Math.min(.12,(ms-last)/1000):1/18);last=ms;time+=dt;
  try{
   // One requested tick applies final camera/shape state in reduced-motion mode.
   // A frozen scene does not retain a timer or animation-frame subscription.
   const next=tick?.(dt,time);
   const candidate=next?.position?next:requestedCamera||(requested?camera:null);
   if(candidate)draw(candidate);
  }catch(error){stop();console.error('Software 3D frame:',error);onReady({ok:false,engine:'software-3d',fallback:true,message:'The fallback 3D view cannot continue for now. The story puzzles still work.'});return;}
  schedule();
 }
 function requestDraw(next){if(next)camera=next;pendingCamera=next||camera;pending=true;schedule();}
 function start(fn){if(fn)tick=fn;if(disposed)return;running=true;pending=true;schedule();}
 function setMotion(value){
  const changed=stage.reducedMotion!==!!value;stage.reducedMotion=!!value;
  if(!changed)return;
  cancelScheduled();last=0;pending=true;if(tick)running=true;schedule();
 }
 function inTriangle(x,y,v){const sign=(a,b)=>(x-b.x)*(a.y-b.y)-(a.x-b.x)*(y-b.y),d1=sign(v[0],v[1]),d2=sign(v[1],v[2]),d3=sign(v[2],v[0]);return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));}
 let down=null;function pick(e){const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*canvas.width,y=(e.clientY-b.top)/b.height*canvas.height;if(raster){const px=Math.max(0,Math.min(raster.width-1,Math.floor(x))),py=Math.max(0,Math.min(raster.height-1,Math.floor(y))),hit=nodes.get(raster.ids[py*raster.width+px]);if(hit)onPick(hit);return;}for(let i=hitTriangles.length-1;i>=0;i--){const t=hitTriangles[i];if((t.mat.opacity??1)<.7)continue;if(inTriangle(x,y,t.vertices)){onPick(t.node);break;}}}
 function listen(target,name,fn){target.addEventListener(name,fn);listeners.push([target,name,fn]);}
 listen(canvas,'pointerdown',e=>{down=[e.clientX,e.clientY];});listen(canvas,'pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<7)pick(e);down=null;});listen(canvas,'pointercancel',()=>{down=null;});
 const inputFrame=()=>{if(stage.reducedMotion){pending=true;schedule();}};listen(canvas,'pointermove',inputFrame);listen(canvas,'keydown',inputFrame);
 listen(document,'visibilitychange',()=>{hidden=document.hidden;if(hidden)stop();else if(tick)start();});
 const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;ro?.observe(container);const io=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(e=>{visible=e[0]?.isIntersecting!==false;if(visible){if(tick)start();else if(camera)requestDraw(camera);}else stop();}):null;io?.observe(container);
 stage.draw=draw;stage.requestDraw=requestDraw;stage.resize=resize;stage.start=start;stage.stop=stop;stage.setMotion=setMotion;stage.dispose=()=>{if(disposed)return;disposed=true;stop();ro?.disconnect();io?.disconnect();listeners.forEach(([t,n,f])=>t.removeEventListener(n,f));canvas.remove();nodes.clear();roots.length=0;hitTriangles=[];raster=null;};resize();queueMicrotask(()=>{if(!disposed)onReady({ok:true,engine:'software-3d'});});return stage;
}
