import { createStage } from './NativeKit.js';

// Independent WebGL compatibility renderer. This does not implement or impersonate Three.js.
const STARTS = [0.015, 0.35, 0.68], ENDS = [0.31, 0.64, 0.93];
const CONTROL = [[-62,64],[-62,26],[-52,-22],[-15,-48],[30,-44],[60,-12],[55,30],[24,56],[-12,44],[-2,16],[28,6],[58,10],[87,8]];
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const mix = (a,b,t) => a+(b-a)*t;
const ease = (t) => 1-(1-clamp(t,0,1))**3;
const seed = (n) => { const x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };
const vadd = (a,b,s=1) => a.map((x,i)=>x+b[i]*s);
const lerp = (a,b,t) => a.map((x,i)=>mix(x,b[i],t));
const normalized = (v) => {const d=Math.hypot(...v)||1;return v.map(x=>x/d);};
const mat = (color,metalness=.2,roughness=.5,glow=0) => ({color,metalness,roughness,...(glow?{emissive:color,emissiveIntensity:glow}:{})});

function curvePoint(t){
  const v=clamp(t,0,1)*(CONTROL.length-1),i=Math.min(CONTROL.length-2,Math.floor(v)),u=v-i;
  const a=CONTROL[Math.max(0,i-1)],b=CONTROL[i],c=CONTROL[i+1],d=CONTROL[Math.min(CONTROL.length-1,i+2)];
  const p=[0,.1,0];
  for(const [axis,out] of [[0,0],[1,2]])p[out]=.5*((2*b[axis])+(-a[axis]+c[axis])*u+(2*a[axis]-5*b[axis]+4*c[axis]-d[axis])*u*u+(-a[axis]+3*b[axis]-3*c[axis]+d[axis])*u*u*u);
  return p;
}

export class NativeRaceWorld {
  constructor(container,{onFailure=()=>{},onReady=()=>{}}={}){
    this.container=container;this.onFailure=onFailure;this.disposed=false;
    this.now=()=>container.ownerDocument.defaultView?.performance?.now()??Date.now();
    this.celebrationStarted=0;this.celebrationPausedAt=null;this.cameraStamp=this.now();
    this.state={stage:0,speed:0,phase:'driving',celebrationKey:0,reducedMotion:false,view:'chase'};
    this.progress=STARTS[0];this.forcedTarget=this.progress;this.time=0;this.elapsed=0;this.kick=0;this.wheelTravel=0;this.wheels=[];this.sparks=[];this.confetti=[];
    this.camera={position:[-57,7,75],target:[-62,1,52],fov:55,near:.1,far:550};
    this.samples=[];this.length=0;let previous=null;
    for(let i=0;i<=800;i++){const p=curvePoint(i/800);if(previous)this.length+=Math.hypot(...p.map((x,j)=>x-previous[j]));this.samples.push({p,d:this.length});previous=p;}
    try{
      this.stage=createStage(container,{background:'#07181d',reducedMotion:false,shadows:false,onReady:r=>{if(r?.ok===false)onFailure(new Error('3D renderer unavailable'));}});
      if(!this.stage.ok)throw new Error('3D renderer unavailable');
      this.engine=this.stage.engine||'native-webgl';this.software=this.engine==='software-3d';
      this.stage.canvas.className='race3d-canvas';this.stage.canvas.tabIndex=-1;
      this.stage.canvas.setAttribute('aria-hidden','true');this.stage.canvas.removeAttribute('aria-label');
      this.buildGround();this.buildTrack();this.buildCity();this.buildCar();this.buildPodium();this.buildFireworks();
      this.update(0,true);this.stage.start((dt)=>{if(this.disposed)return null;this.update(dt);return this.camera;});
      onReady({ok:true,engine:this.engine});
    }catch(error){this.dispose();throw error;}
  }
  sample(u){
    const target=clamp(u,0,1)*this.length;let low=0,high=this.samples.length-1;
    while(low+1<high){const mid=(low+high)>>1;if(this.samples[mid].d<target)low=mid;else high=mid;}
    const a=this.samples[low],b=this.samples[high],p=lerp(a.p,b.p,(target-a.d)/(b.d-a.d||1));
    const before=this.samples[Math.max(0,low-1)].p,after=this.samples[Math.min(this.samples.length-1,high+1)].p;
    const tangent=normalized(after.map((x,i)=>x-before[i]));
    return {p,tangent,normal:[tangent[2],0,-tangent[0]]};
  }
  add(geometry,material,position=[0,0,0],rotation=[0,0,0],parent=null,scale=[1,1,1]){return this.stage.add(geometry,material,{position,rotation,scale,...(parent?{parent}:{})});}
  box(w,h,d,material,position,rotation=[0,0,0],parent=null){return this.add(this.stage.box(w,h,d),material,position,rotation,parent);}
  group(position=[0,0,0],parent=null){return this.stage.group({position,...(parent?{parent}:{})});}
  surfaceTexture(kind,text=''){
    this.surfaceTextures??=new Map();const key=kind+':'+text;if(this.surfaceTextures.has(key))return this.surfaceTextures.get(key);
    const canvas=this.container.ownerDocument.createElement('canvas');canvas.width=kind==='road'?128:256;canvas.height=kind==='road'?512:128;const c=canvas.getContext('2d');
    if(c){
      if(kind==='road'){
        c.fillStyle='#303b40';c.fillRect(0,0,128,512);
        for(let i=0;i<2200;i++){c.fillStyle=i%3?'rgba(200,211,209,.07)':'rgba(2,9,13,.18)';c.fillRect(seed(i+5)*128,seed(i+800)*512,1+seed(i)*2,1+seed(i+30)*3);}
        c.fillStyle='rgba(8,15,20,.19)';c.fillRect(37,0,10,512);c.fillRect(81,0,10,512);
        c.fillStyle='rgba(177,197,189,.07)';c.fillRect(7,0,7,512);c.fillRect(114,0,7,512);
      }else{
        c.fillStyle=kind==='number'?'#e8dec2':'#152923';c.fillRect(0,0,256,128);
        c.strokeStyle='#bd985d';c.lineWidth=3;c.strokeRect(8,8,240,112);c.fillStyle=kind==='number'?'#243d34':'#e8c581';c.textAlign='center';c.textBaseline='middle';
        c.font=kind==='team'?'600 31px sans-serif':'700 83px Georgia,serif';c.fillText(text,128,69,226);
      }
    }
    this.surfaceTextures.set(key,canvas);return canvas;
  }
  bar(a,b,width,material,parent=null){const v=b.map((x,i)=>x-a[i]),length=Math.hypot(...v);return this.add(this.stage.cylinder(width,width,length,6),material,lerp(a,b,.5),[Math.acos(clamp(v[1]/(length||1),-1,1)),Math.atan2(v[0],v[2]),0],parent);}
  ribbon(from,to,y,material,steps=this.software?160:260,start=0,end=1){
    const positions=[],normals=[],uvs=[],indices=[];
    for(let i=0;i<=steps;i++){const {p,normal}=this.sample(mix(start,end,i/steps));for(const x of [from,to]){positions.push(p[0]+normal[0]*x,y,p[2]+normal[2]*x);normals.push(0,1,0);uvs.push(x===from?0:1,i/steps);}if(i<steps){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}}
    return this.add({positions,normals,uvs,indices},material);
  }
  buildGround(){
    this.add(this.stage.plane(500,500),mat('#112624',0,.95),[0,-.1,-20],[-Math.PI/2,0,0]);
    this.water=this.add(this.stage.plane(350,90),mat('#13383c',.75,.2),[5,.015,-114],[-Math.PI/2,0,0]);
    this.box(350,.6,2,mat('#456053',.35,.5),[5,.15,-68]);
    this.waterStreaks=[];
    const streakCount=this.software?24:38;
    for(let i=0;i<streakCount;i++){
      const material={...mat(i%3?'#bd9652':'#91b7a5',.6,.3,.16),opacity:.20};
      const n=this.add(this.stage.plane(.5+seed(i)*1.8,8+seed(i+9)*26),material,[-150+i*312/streakCount,.035,-115+seed(i+8)*34],[-Math.PI/2,0,0]);
      this.waterStreaks.push(n);
    }
  }
  buildTrack(){
    this.ribbon(-5.25,5.25,.12,{...mat('#ced5d0',.3,.57),texture:this.surfaceTexture('road')});
    this.ribbon(-5.95,-5.25,.16,mat('#bb6c48',.1,.55));this.ribbon(5.25,5.95,.16,mat('#bb6c48',.1,.55));
    const pale=mat('#d1cdb8',.1,.55),rail=mat('#71887b',.75,.3),lane=mat('#d7cfaf',0,.7,.12);
    this.ribbon(-5.04,-4.91,.15,lane);this.ribbon(4.91,5.04,.15,lane);
    this.ribbon(-6.3,-6.1,1.0,rail);this.ribbon(6.1,6.3,1.0,rail);
    const stripe=this.stage.box(.12,.02,2),post=this.stage.box(.16,1.1,.18),kerb=this.stage.box(.65,.045,1.8);
    const roadDetails=this.software?32:62;
    for(let i=0;i<roadDetails;i++){
      const {p,tangent,normal}=this.sample(i/roadDetails),rot=[0,Math.atan2(tangent[0],tangent[2]),0];
      this.add(stripe,lane,[p[0],.15,p[2]],rot);
      if(i%2===0)for(const side of [-1,1])this.add(post,rail,[p[0]+normal[0]*side*6.2,.55,p[2]+normal[2]*side*6.2]);
      for(const side of [-1,1])this.add(kerb,pale,[p[0]+normal[0]*side*5.6,.17,p[2]+normal[2]*side*5.6],rot);
    }
    const pole=this.stage.cylinder(.09,.16,8,7),lamp=this.stage.box(2,.16,.6),glow=mat('#ffddb0',0,.4,1.5);
    const lampCount=this.software?20:26;
    for(let i=0;i<lampCount;i++){
      const {p,normal,tangent}=this.sample(i/(lampCount-1)),side=i%2?1:-1;
      this.add(pole,rail,[p[0]+normal[0]*side*8,4,p[2]+normal[2]*side*8]);
      this.add(lamp,glow,[p[0]+normal[0]*side*7.3,8,p[2]+normal[2]*side*7.3],[0,Math.atan2(tangent[0],tangent[2]),0]);
    }
    this.gates=[];
    for(let i=0;i<3;i++){
      const {p,tangent}=this.sample(ENDS[i]),group=this.group(p);group.rotation=[0,Math.atan2(tangent[0],tangent[2]),0];
      this.box(.16,3.8,.2,rail,[-5.8,1.9,0],[0,0,0],group);this.box(.16,3.8,.2,rail,[5.8,1.9,0],[0,0,0],group);
      const gateMaterial=mat('#c3a063',.2,.4,.6);this.gates.push(gateMaterial);this.box(11.8,.25,.25,gateMaterial,[0,3.8,0],[0,0,0],group);
    }
    const f=this.sample(.96),fg=this.group(f.p);fg.rotation=[0,Math.atan2(f.tangent[0],f.tangent[2]),0];
    const black=mat('#152527',.2,.5),white=mat('#d9d9c1',.2,.5),tile=this.stage.box(1,.025,.7);
    for(let x=0;x<10;x++)for(let z=0;z<3;z++)this.add(tile,(x+z)%2?white:black,[x-4.5,.15,z*.7-.7],[0,0,0],fg);
  }
  buildCity(){
    const canvas=this.container.ownerDocument.createElement('canvas');canvas.width=64;canvas.height=128;const ctx=canvas.getContext('2d');
    if(ctx){ctx.fillStyle='#102328';ctx.fillRect(0,0,64,128);for(let y=4;y<128;y+=this.software?20:12)for(let x=3;x<64;x+=this.software?12:8){if(seed(x+y*8)>.3){ctx.fillStyle=seed(x+y)>.35?'#e4bd77':'#94ab9a';ctx.fillRect(x,y,3,5);}}}
    const city={...mat('#8a9d8e',.35,.45,.14),texture:canvas};
    const buildingCount=this.software?18:24;
    for(let i=0;i<buildingCount;i++){
      const w=7+seed(i+8)*10,h=17+seed(i+30)*46,d=8+seed(i+50)*9,x=-135+i*274/buildingCount,z=-157-(i%3)*12;
      this.box(w,h,d,city,[x,h/2,z]);
      if(i%3===0)this.box(w*.9,.24,d*.9,mat('#d6b477',.5,.3,.7),[x,h+.12,z]);
    }
    const steel=mat('#6d8b7b',.65,.4),wheel=this.group([104,27,-138]);
    this.add(this.stage.torus(23,.18,this.software?36:60,this.software?4:6),mat('#9ebba4',.5,.4,.3),[0,0,0],[0,0,0],wheel);
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2,p=[Math.cos(a)*23,Math.sin(a)*23,0];this.bar([0,0,0],p,.055,steel,wheel);this.box(1.2,1,1.3,mat('#dfc48d',.3,.4,.5),p,[0,0,0],wheel);}
    this.bar([104,27,-138],[94,0,-138],.5,steel);this.bar([104,27,-138],[114,0,-138],.5,steel);
    for(const [x,z,rotation]of[[-79,4,Math.PI/2],[61,53,-.65]]){
      const stand=this.group([x,0,z]);stand.rotation=[0,rotation,0];const seats=mat('#365447',.3,.6);
      for(let row=0;row<5;row++)this.box(19,.55,1.6,seats,[0,row*.65+.3,-row*1.3],[0,0,0],stand);
      this.box(21,.22,8.5,mat('#ae7b4b',.4,.4),[0,5,-2.3],[0,0,0],stand);
      const head=this.stage.sphere(.19,6,4),crowd=mat('#c1b491',0,.8);
      const crowdCount=this.software?20:35,crowdColumns=this.software?4:7;
      for(let j=0;j<crowdCount;j++)this.add(head,crowd,[(j%crowdColumns)*14.4/(crowdColumns-1)-7.2,Math.floor(j/crowdColumns)*.65+.88,-Math.floor(j/crowdColumns)*1.3],[0,0,0],stand);
    }
  }
  buildCar(){
    this.car=this.group();this.shell=this.group([0,0,0],this.car);
    const body=mat('#f27c38',.68,.23),dark=mat('#0d191d',.45,.45),ivory=mat('#eee0bd',.4,.4),chrome=mat('#c2d0bf',.85,.2),rubber=mat('#101417',.03,.88);
    this.add(this.stage.cylinder(1.7,1.7,.015,this.software?16:24),{color:'#061113',opacity:.35},[0,.03,0],[0,0,0],this.car,[1,1,1.65]);
    this.box(1.36,.46,3.5,body,[0,.72,-.08],[0,0,0],this.shell);this.box(2.25,.12,3.5,dark,[0,.38,-.05],[0,0,0],this.shell);
    for(const side of [-1,1]){this.box(.65,.46,1.9,body,[side*.91,.68,-.25],[0,0,-side*.07],this.shell);this.box(.44,.23,.08,dark,[side*.91,.73,.74],[0,0,0],this.shell);}
    this.add(this.stage.cylinder(.18,.49,2.05,4),body,[0,.72,1.5],[Math.PI/2,Math.PI/4,0],this.shell);
    this.box(.15,.025,1.8,ivory,[0,.97,1.25],[0,0,0],this.shell);
    this.add(this.stage.plane(.45,.62),{...mat('#ffffff',.15,.45),texture:this.surfaceTexture('number','07')},[0,.994,1.45],[-Math.PI/2,0,0],this.shell);
    this.add(this.stage.cylinder(.19,.43,1.22,8),body,[0,1.02,-1.15],[Math.PI/2,0,0],this.shell);
    this.box(.065,.5,1.08,body,[0,1.35,-1.25],[0,0,0],this.shell);
    for(const side of [-1,1]){
      this.box(.055,.055,1.53,ivory,[side*1.245,.83,-.21],[0,0,0],this.shell);
      this.box(.28,.16,.17,body,[side*.85,1.16,.36],[0,0,0],this.shell);this.bar([side*.52,1.03,.30],[side*.85,1.13,.36],.026,dark,this.shell);
      for(let i=0;i<3;i++)this.box(.38,.028,.06,dark,[side*.91,.93,-.22-i*.23],[0,0,0],this.shell);
    }
    this.box(3.15,.13,.53,body,[0,.37,2.37],[0,0,0],this.shell);this.box(3.02,.1,.24,dark,[0,.49,2.5],[0,0,0],this.shell);
    for(const side of [-1,1])this.box(.12,.55,.7,body,[side*1.53,.56,2.36],[0,0,0],this.shell);
    this.box(2.95,.16,.64,body,[0,1.42,-2.03],[0,0,0],this.shell);this.box(2.95,.1,.26,dark,[0,1.59,-2.17],[0,0,0],this.shell);
    this.add(this.stage.plane(2.42,.21),{...mat('#ffffff',.15,.5),texture:this.surfaceTexture('team','FIND / SG')},[0,1.43,-2.365],[0,Math.PI,0],this.shell);
    for(const side of [-1,1]){this.box(.1,.8,.18,dark,[side*.63,1,-1.95],[0,0,0],this.shell);this.box(.1,.55,.84,body,[side*1.44,1.42,-2.02],[0,0,0],this.shell);}
    this.add(this.stage.sphere(.63,this.software?12:16,this.software?8:10),dark,[0,1,-.3],[0,0,0],this.shell,[.8,.4,1.15]);
    this.add(this.stage.sphere(.24,12,8),mat('#e1ad51',.7,.25),[0,1.23,-.25],[0,0,0],this.shell);
    this.box(.36,.09,.06,dark,[0,1.26,.0],[0,0,0],this.shell);
    this.bar([-.48,1.13,-.8],[-.48,1.4,.15],.045,dark,this.shell);this.bar([.48,1.13,-.8],[.48,1.4,.15],.045,dark,this.shell);this.bar([-.48,1.4,.15],[0,1.42,.45],.045,dark,this.shell);this.bar([.48,1.4,.15],[0,1.42,.45],.045,dark,this.shell);this.bar([0,1.42,.45],[0,.93,.72],.045,dark,this.shell);
    const tire=this.stage.cylinder(.59,.59,.49,this.software?16:22),rim=this.stage.cylinder(.31,.31,.51,16),ring=this.stage.torus(.46,.018,this.software?16:24,this.software?3:5);
    for(const side of [-1,1])for(const z of [-1.45,1.48]){
      const pivot=this.group([side*1.29,.62,z],this.shell),spin=this.group([0,0,0],pivot);this.wheels.push({pivot,spin,front:z>0});
      this.add(tire,rubber,[0,0,0],[0,0,Math.PI/2],spin);this.add(rim,chrome,[0,0,0],[0,0,Math.PI/2],spin);
      for(const offset of [-.26,.26])this.add(ring,ivory,[offset,0,0],[0,Math.PI/2,0],spin);
      this.bar([side*.55,.75,z-.32],[side*1.28,.6,z],.045,dark,this.shell);this.bar([side*.55,.48,z+.35],[side*1.28,.6,z],.045,dark,this.shell);
    }
    this.brakeMaterial=mat('#b24025',0,.5,.7);this.box(.24,.18,.06,this.brakeMaterial,[0,.73,-1.92],[0,0,0],this.shell);
  }
  buildPodium(){
    const f=this.sample(.98);this.finishPoint=f.p;this.podium=this.group(vadd(f.p,f.normal,-10));this.podium.rotation=[0,Math.atan2(f.tangent[0],f.tangent[2]),0];this.podium.visible=false;
    this.focus=vadd(this.podium.position,[0,3.5,0]);const dark=mat('#29443a',.65,.3),gold=mat('#e7b955',.95,.21,.18);
    this.box(11.8,.35,5,dark,[0,.18,0],[0,0,0],this.podium);
    for(const [x,h,rank]of[[-3.4,1.15,'2'],[0,2.1,'1'],[3.4,.8,'3']]){this.box(3.2,h,3.2,dark,[x,h/2+.35,0],[0,0,0],this.podium);this.box(3.2,.08,3.2,gold,[x,h+.39,0],[0,0,0],this.podium);this.add(this.stage.plane(.72,Math.min(.76,h*.72)),{...mat('#ffffff',.25,.45),texture:this.surfaceTexture('rank',rank)},[x,h/2+.35,1.61],[0,0,0],this.podium);}
    this.trophy=this.group([0,2.5,0],this.podium);this.add(this.stage.cylinder(.9,1.05,.3,this.software?16:24),gold,[0,.15,0],[0,0,0],this.trophy);this.add(this.stage.cylinder(.17,.25,1,this.software?16:18),gold,[0,.8,0],[0,0,0],this.trophy);
    this.add(this.stage.cylinder(1.05,.25,1.35,this.software?16:28),gold,[0,1.9,0],[0,0,0],this.trophy);this.add(this.stage.torus(1.04,.065,this.software?20:32,this.software?5:8),gold,[0,2.58,0],[Math.PI/2,0,0],this.trophy);
    this.add(this.stage.cylinder(.89,.89,.025,16),mat('#795321',.7,.35),[0,2.586,0],[0,0,0],this.trophy);
    for(const side of [-1,1])this.add(this.stage.torus(.52,.09,this.software?16:22,this.software?5:8),gold,[side*1.02,2.07,0],[0,0,0],this.trophy);
  }
  buildFireworks(){
    const origins=[[-17,24,-16,.8],[13,30,-24,1.5],[-3,36,10,2.3],[24,25,7,3.1],[-26,35,4,4],[7,42,-18,4.8],[-10,30,20,5.55]];
    const particle=this.software?this.stage.geometry([0,.48,0,0,-.48,0,.30,0,0,-.30,0,0,0,0,.30,0,0,-.30],[0,2,4,0,4,3,0,3,5,0,5,2,1,4,2,1,3,4,1,5,3,1,2,5]):this.stage.sphere(.18,6,4),colors=['#ffc874','#f0e5ba','#bcd9b5'],burstCount=this.software?24:36;
    for(let b=0;b<origins.length;b++){
      const [x,y,z,start]=origins[b],origin=[this.finishPoint[0]+x,y,this.finishPoint[2]+z];
      for(let i=0;i<burstCount;i++){
        const vy=1-2*(i+.5)/burstCount,r=Math.sqrt(1-vy*vy),a=i*2.399963+b,speed=8+seed(i+b*31)*10;
        const node=this.add(particle,mat(colors[b%3],.1,.3,this.software?.65:1.6),origin);node.visible=false;
        const vertical=b%3===1?vy*.26:b%3===2?.3+Math.abs(vy)*.6:vy*.86;
        this.sparks.push({node,origin,start,burst:b,velocity:[Math.cos(a)*r*speed,vertical*speed,Math.sin(a)*r*speed],life:2.3+seed(i+92)*1.2});
      }
    }
    const fleck=this.stage.box(.12,.34,.025);
    for(let i=0;i<28;i++){const node=this.add(fleck,mat(i%3?'#e6bd6d':'#d4dfbf',.7,.3,.25),this.focus);node.visible=false;this.confetti.push({node,seed:seed(i+777),angle:seed(i+93)*Math.PI*2});}
  }
  setGameState(next){
    if(this.disposed)return;
    const old=this.state;this.state={...old,...next};const s=this.state,now=this.now();
    if(s.phase==='driving'&&(old.phase!=='driving'||s.stage<old.stage))this.progress=this.forcedTarget=STARTS[s.stage];
    if(s.phase==='driving'&&s.stage>old.stage)this.forcedTarget=STARTS[s.stage];
    this.kick=s.speed>old.speed?-.065:s.speed<old.speed?.055:this.kick;
    if(s.phase==='celebrating'&&(s.celebrationKey!==old.celebrationKey||old.phase!=='celebrating')){this.elapsed=0;this.celebrationStarted=now;this.celebrationPausedAt=s.reducedMotion?now:null;this.finishFrom=old.phase==='complete'?.90:this.progress;this.progress=this.finishFrom;}
    else if(s.phase==='celebrating'&&s.reducedMotion!==old.reducedMotion){
      if(s.reducedMotion)this.celebrationPausedAt=now;
      else if(this.celebrationPausedAt!==null){this.celebrationStarted+=now-this.celebrationPausedAt;this.celebrationPausedAt=null;}
    }
    if(s.phase!=='celebrating')this.celebrationPausedAt=null;
    if(s.phase==='complete')this.progress=.992;
    if(s.reducedMotion&&s.phase==='driving')this.progress=STARTS[s.stage]+s.speed/120*.045;
    this.gates.forEach((m,i)=>{m.color=i<s.stage||s.phase!=='driving'?'#9dbf9d':i===s.stage?'#ffd49a':'#897752';m.emissive=m.color;});
    this.stage.setMotion(s.reducedMotion||s.phase==='complete');
    this.update(0,s.reducedMotion||s.phase==='complete');this.stage.requestDraw(this.camera);
  }
  setState(state){this.setGameState(state);}
  setMotion(reducedMotion){this.setGameState({reducedMotion});}
  setView(view){this.setGameState({view});}
  setCelebration(value=true){this.setGameState({phase:value?'celebrating':'complete',celebrationKey:this.state.celebrationKey+1});}
  update(dt,snap=false){
    if(this.disposed)return;
    const s=this.state,previous=this.progress,now=this.now(),cameraDt=Math.min(1,Math.max(0,(now-this.cameraStamp)/1000));this.cameraStamp=now;
    if(!s.reducedMotion)this.time+=dt;
    if(s.phase==='celebrating')this.elapsed=clamp(((this.celebrationPausedAt??now)-this.celebrationStarted)/1000,0,7.5);
    if(s.phase==='driving'&&!s.reducedMotion){
      if(this.progress<this.forcedTarget)this.progress=Math.min(this.forcedTarget,this.progress+Math.max(.12,(this.forcedTarget-this.progress)*3)*dt);
      else this.progress=Math.min(ENDS[s.stage]-.015,this.progress+s.speed*.18/this.length*dt);
    }else if(s.phase==='celebrating'){this.progress=s.reducedMotion?.992:mix(this.finishFrom,.992,ease(this.elapsed/1.6));}
    const {p,tangent,normal}=this.sample(this.progress),ahead=this.sample(Math.min(1,this.progress+.008)).tangent;
    this.car.position=p;this.car.rotation=[0,Math.atan2(tangent[0],tangent[2]),0];this.wheelTravel+=(this.progress-previous)*this.length/.59;
    const steer=clamp(tangent[0]*ahead[2]-tangent[2]*ahead[0],-.25,.25);this.kick*=Math.exp(-dt*6);
    this.shell.rotation=[s.reducedMotion?0:this.kick,0,s.reducedMotion?0:steer*s.speed/80];
    this.wheels.forEach(({pivot,spin,front})=>{spin.rotation=[this.wheelTravel,0,0];if(front)pivot.rotation=[0,-steer*1.6,0];});
    this.brakeMaterial.color=this.kick>.01?'#ffac6a':'#b24025';this.brakeMaterial.emissive=this.brakeMaterial.color;
    this.podium.visible=s.phase!=='driving';let cameraGoal,lookGoal;
    if(this.podium.visible){
      const complete=s.phase==='complete'||s.reducedMotion,e=complete?7.5:this.elapsed,rise=complete?1:ease((e-1.7)/1.1);this.podium.scale=[Math.max(.001,rise),Math.max(.001,rise),Math.max(.001,rise)];
      this.trophy.rotation=[0,complete?.5:Math.min(e,7.5)*.18,0];
      for(const spark of this.sparks){const age=complete?.85:e-spark.start,live=age>=0&&age<spark.life&&(!complete||spark.burst<4);spark.node.visible=live;if(!live)continue;const travel=(1-Math.exp(-age*.65))/.65;spark.node.position=vadd(spark.origin,spark.velocity,travel);spark.node.position[1]-=2.1*age*age;const size=Math.max(.05,Math.pow(1-age/spark.life,.55)*(1.2+seed(spark.start)*.6));spark.node.scale=this.software?[size,size*1.2,size]:[size,size,size];if(this.software){const velocity=spark.velocity.map(v=>v*Math.exp(-age*.65));velocity[1]-=4.2*age;spark.node.rotation=[Math.acos(clamp(velocity[1]/(Math.hypot(...velocity)||1),-1,1)),Math.atan2(velocity[0],velocity[2]),0];}}
      for(let i=0;i<this.confetti.length;i++){const c=this.confetti[i],age=complete?3:e-2-c.seed;c.node.visible=age>=0&&age<5;if(!c.node.visible)continue;c.node.position=[this.focus[0]+Math.cos(c.angle)*age*2.2,10+c.seed*6-age*1.4,this.focus[2]+Math.sin(c.angle)*age*2.2];c.node.rotation=s.reducedMotion?[.3,c.angle,.6]:[age*2+c.seed,c.angle+age,age*1.3];}
      const angle=complete?.7:-.15+Math.min(e,7.5)*.113;cameraGoal=[this.focus[0]+Math.sin(angle)*60,24,this.focus[2]+Math.cos(angle)*60];lookGoal=vadd(this.focus,[0,17,0]);
      if(s.view==='podium'){
        const reveal=complete?1:ease((e-3.4)/3.3),close=[this.focus[0]+Math.sin(.7)*34,12,this.focus[2]+Math.cos(.7)*34];
        cameraGoal=lerp(cameraGoal,close,reveal);lookGoal=lerp(lookGoal,vadd(this.focus,[0,8.5,0]),reveal);
      }else if(s.view==='chase'){
        cameraGoal=vadd(vadd(p,tangent,-10.4),normal,4.4);cameraGoal[1]+=4.8;lookGoal=vadd(p,tangent,3.2);lookGoal[1]+=1.0;
      }
    }else{
      this.sparks.forEach(x=>x.node.visible=false);this.confetti.forEach(x=>x.node.visible=false);const wide=s.view==='wide';cameraGoal=vadd(vadd(p,tangent,wide?-23:-11.3),normal,wide?17:3.5);cameraGoal[1]+=wide?17:6.5;lookGoal=vadd(p,tangent,wide?5:6.2);lookGoal[1]+=.85;
    }
    const smooth=snap||s.reducedMotion?1:1-Math.exp(-(s.phase==='driving'?dt:cameraDt)*(s.phase==='driving'?5:2.1));this.camera.position=lerp(this.camera.position,cameraGoal,smooth);this.camera.target=lerp(this.camera.target,lookGoal,smooth);
    this.camera.fov=this.container.clientWidth/Math.max(1,this.container.clientHeight)<1.15?63:55;
    this.waterStreaks.forEach((node,i)=>{node.scale=[1,.9+Math.sin(this.time*.6+i)*.1,1];});
  }
  resize(){if(!this.disposed){this.stage.resize();this.update(0,true);this.stage.requestDraw(this.camera);}}
  dispose(){if(this.disposed)return;this.disposed=true;this.stage?.dispose();this.sparks=[];this.confetti=[];this.wheels=[];}
}

export function createRaceWorld(container,options){return new NativeRaceWorld(container,options);}
export default NativeRaceWorld;
