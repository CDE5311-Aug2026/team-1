/* Independent outdoor observation models. These are interpretive miniatures,
 * not surveyed reproductions and never place game objects on a real monument. */
import {buildStopModel} from './field-stops.js';
const PI=Math.PI,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const FIELD_MODEL_NAMES={shophouse:'Shophouse facade',temple:'Temple eaves',tower:'Twin-tower facade',arch:'Two wings and a hall',gate:'Street-side porch',elephant:'Bronze elephant and plinth',bridge:'Bridge and survey marks',obelisk:'Memorial and inscription',clock:'Public clock tower',fountain:'Fountain and memorial base',press:'Pocket typesetting model',film:'Film viewer',letter:'Family letter and sea chart',roof:'Square and octagonal outline'};

function canvasSurface(document,kind){
 if(!document)return null;const a=document.createElement('canvas');a.width=a.height=256;const x=a.getContext('2d');if(!x)return a;
 const colors={stone:['#ded5be','#9c947f'],paper:['#e9d8b1','#b6a27c'],copper:['#8a916d','#4c685b'],wood:['#87654a','#4d3929']};const [bg,fg]=colors[kind]||colors.stone;x.fillStyle=bg;x.fillRect(0,0,256,256);let seed=89;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 x.fillStyle=fg;for(let n=0;n<1400;n++){x.globalAlpha=.025+rand()*.09;x.fillRect(rand()*256,rand()*256,1+rand()*3,1+rand()*2);}x.globalAlpha=1;
 if(kind==='wood'){x.strokeStyle='rgba(47,28,15,.14)';for(let y=0;y<256;y+=4){x.beginPath();for(let j=0;j<=256;j+=8){const yy=y+Math.sin(j*.04+y*.07)*3;j?x.lineTo(j,yy):x.moveTo(j,yy);}x.stroke();}}
 if(kind==='paper'){x.strokeStyle='rgba(81,66,45,.13)';x.lineWidth=1;for(let j=25;j<240;j+=19){x.beginPath();x.moveTo(18,j);x.lineTo(238,j);x.stroke();}}
 return a;
}
function pyramid(w,d,h,topW=0,topD=0){const x=w/2,z=d/2,a=topW/2,b=topD/2;return {positions:[-x,0,-z,x,0,-z,x,0,z,-x,0,z,-a,h,-b,a,h,-b,a,h,b,-a,h,b],indices:[0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,4,5,6,4,6,7,3,2,1,3,1,0]};}

export function buildFieldModel(c,{modelKind='shophouse',routeId='telok-ayer',stopId='',document}={}){
 const kind=FIELD_MODEL_NAMES[modelKind]?modelKind:'shophouse';const root=c.group();
 const M={stone:{color:'#ddd1b2',texture:canvasSurface(document,'stone'),roughness:.93},ivory:{color:'#e6dec8',roughness:.85},deep:{color:'#244c43',roughness:.65},glass:{color:'#76908a',roughness:.3,metalness:.3},gold:{color:'#bd9860',roughness:.38,metalness:.72},copper:{color:'#7a8e77',texture:canvasSurface(document,'copper'),roughness:.68,metalness:.66},terra:{color:'#9d5d43',roughness:.9},paper:{color:'#f3e3bd',texture:canvasSurface(document,'paper'),roughness:.95},wood:{color:'#ad8963',texture:canvasSurface(document,'wood'),roughness:.85},ink:{color:'#243b34',roughness:.65},orange:{color:'#db8f49',roughness:.5},water:{color:'#7aaca7',roughness:.18,metalness:.2},black:{color:'#313d38',roughness:.48,metalness:.4}};
 const moving=[],body=c.group(root);c.select(body,'field-object');
 const box=(w,h,d,mat,p,r,parent=body)=>c.box(w,h,d,mat,parent,p,r);
 const cyl=(radius,h,mat,p,r,segments=24,bottomRadius=radius,parent=body)=>c.cyl(radius,h,mat,parent,p,r,segments,bottomRadius);
 const torus=(radius,tube,mat,p,r,parent=body)=>c.torus(radius,tube,mat,parent,p,r);
 const line=(points,r,mat,parent=body)=>c.line(points,r,mat,parent);
 const sphere=(r,mat,p,scale,parent=body)=>c.sphere(r,mat,parent,p,scale);
 const plaque=(text,w,h,p,r,parent=body)=>c.label(text,w,h,parent,p,r,{background:'#e5d4ae',color:'#2f4b40',fontSize:48,border:'#ac8a55'});
 const roof=(w,d,h,p,parent=body,topW=0,topD=0,mat=M.terra)=>c.mesh(pyramid(w,d,h,topW,topD),mat,parent,p);
 const bespoke=buildStopModel(c,body,stopId,M);
 const baseWidth=bespoke?.baseWidth||(['bridge','shophouse','arch'].includes(kind)?7:5.5);
 box(baseWidth,.16,4.4,M.stone,[0,-.12,0],null,root);box(baseWidth+.13,.08,4.53,M.deep,[0,-.23,0],null,root);
 for(let i=-3;i<=3;i++)box(.014,.012,4.2,{color:'#c0b49b'},[i*.85,-.031,0],null,root);
 for(let z=-2;z<=2;z++)box(baseWidth-.15,.012,.014,{color:'#c0b49b'},[0,-.025,z*.8],null,root);
 const window=(x,y,z,w=.6,h=.85,color=M.deep)=>{box(w+.13,h+.13,.1,M.ivory,[x,y,z]);box(w,h,.11,color,[x,y,z+.06]);box(.035,h,.035,M.gold,[x,y,z+.13]);box(w,.025,.035,M.gold,[x,y,z+.13]);};
 const pillar=(x,y,z,h=2)=>{cyl(.11,h,M.ivory,[x,y+h/2,z]);box(.33,.12,.33,M.stone,[x,y+.06,z]);box(.3,.1,.3,M.stone,[x,y+h,z]);};
 const arch=(cx,y,z,w,h,parent=body)=>{const points=[];for(let i=0;i<=16;i++){const a=PI-i/16*PI;points.push([cx+Math.cos(a)*w/2,y+Math.sin(a)*h,z]);}line(points,.1,M.ivory,parent);};
 let detail=[0,1.7,.25],distance=9.6;
 if(bespoke){detail=bespoke.detail;distance=bespoke.distance;}
 else if(kind==='shophouse'){
  const palette=routeId==='balestier'?['#d6b88a','#e5d5b5','#8aa28f']:['#c3bd9a','#d7b37b','#d9d4be'];
  for(let n=0;n<3;n++){const x=(n-1)*1.75,wall={color:palette[n],roughness:.86};box(1.68,3.25,1.45,wall,[x,1.65,-.25]);box(1.76,.13,1.55,M.ivory,[x,1.74,-.2]);box(1.76,.15,1.55,M.ivory,[x,3.24,-.2]);roof(1.85,1.75,.55,[x,3.31,-.25],body,.25,1.75);window(x-.38,2.45,.53,.48,.9);window(x+.38,2.45,.53,.48,.9);box(1.35,.25,.08,M.deep,[x,1.5,.56]);box(1.22,.17,.03,M.ink,[x,1.5,.61]);for(let q=0;q<4;q++)box(.12,.1,.02,M.gold,[x-.39+q*.26,1.5,.63]);box(.82,1.15,.1,M.deep,[x,.65,.57]);arch(x,.94,.67,.85,.38);pillar(x-.76,.05,.74,1.3);pillar(x+.76,.05,.74,1.3);for(let q=0;q<5;q++)box(.035,.35,.06,M.gold,[x-.55+q*.275,1.98,.78]);box(1.3,.06,.28,M.ivory,[x,1.78,.67]);for(let y=0;y<3;y++)box(.18,.08,.1,M.ivory,[x-.74,2.13+y*.4,.6]);}
  const marker=c.group(body,[0,3.58,.76]);cyl(.12,.08,M.gold,[0,0,0],[PI/2,0,0],20,.12,marker);moving.push(p=>c.transform(marker,{position:[(p-.5)*3.5,3.58,.76]}));detail=[0,2.45,.55];distance=10.5;
 }else if(kind==='temple'||kind==='roof'){
  const tier=c.group(body);box(3.2,.35,2.6,M.stone,[0,.18,0]);box(2.9,1.75,2.1,M.ivory,[0,1.18,0]);for(const x of [-1.2,-.6,.6,1.2])pillar(x,.35,1.13,1.65);box(.8,1.36,.12,M.deep,[0,1.03,1.12]);
  const upper=c.group(tier,[0,2.06,0]);roof(3.8,2.85,.73,[0,0,0],upper,.35,1.1);box(3.9,.13,2.92,M.deep,[0,.02,0],null,upper);
  for(let i=-7;i<=7;i++){const x=i*.25;line([[x,.05,1.4],[x,.4,.7],[x,.7,.1]],.022,M.gold,upper);}
  for(const x of [-1.95,1.95])line([[x*.7,.35,0],[x,.3,0],[x*1.08,.54,0]],.055,M.deep,upper);
  if(kind==='roof'){cyl(.75,.95,M.ivory,[0,3.1,0],null,8,.75);for(let i=0;i<8;i++){const a=i*PI/4;box(.065,.9,.065,M.deep,[Math.cos(a)*.72,3.1,Math.sin(a)*.72]);}cyl(1.04,.22,M.terra,[0,3.68,0],null,8,.8);roof(1.95,1.95,.72,[0,3.78,0],body,0,0,M.terra);moving.push(p=>c.transform(upper,{position:[0,2.06+(1-p)*.6,0]}));detail=[0,3.1,0];distance=10.4;}
  else{plaque('MEMORY OF ARRIVAL',1.28,.3,[0,1.86,1.22]);for(const x of [-1.45,1.45]){sphere(.16,M.gold,[x,1.5,1.26],[1,1.3,1]);line([[x,1.63,1.26],[x,1.95,1.26]],.02,M.gold);}moving.push(p=>c.transform(upper,{position:[0,2.06+(1-p)*.36,0]}));detail=[0,2.35,.4];}
 }else if(kind==='tower'){
  box(2.6,2.15,1.25,M.ivory,[0,1.15,0]);box(2.9,.18,1.4,M.gold,[0,2.2,0]);box(.85,1.6,.08,M.deep,[0,.85,.68]);arch(0,1.1,.75,.98,.65);
  for(const x of [-1.5,1.5]){box(.65,3.3,.9,M.stone,[x,1.68,0]);for(const y of [.7,1.5,2.3]){window(x,y,.49,.32,.49);box(.8,.11,1,M.ivory,[x,y+.38,0]);}cyl(.43,.14,M.gold,[x,3.4,0],null,8);roof(.76,.93,.55,[x,3.47,0]);sphere(.06,M.gold,[x,4.08,0]);}
  const glint=box(2.65,.045,.06,M.orange,[0,2.38,.73]);moving.push(p=>c.transform(glint,{scale:[.15+.85*p,1,1]}));detail=[0,2.45,.2];distance=10.2;
 }else if(kind==='arch'){
  for(const x of [-2,2]){box(2.05,2.4,1.7,M.ivory,[x,1.2,0]);box(2.2,.18,1.84,M.stone,[x,2.48,0]);for(const dx of [-.55,.55])for(const y of [.65,1.75])window(x+dx,y,.91,.55,.68);roof(2.22,1.93,.55,[x,2.58,0],body,.4,1.93);}
  box(1.9,2.75,1.9,M.stone,[0,1.38,-.1]);box(1.25,1.6,.09,M.deep,[0,.85,.91]);arch(0,1.45,.98,1.4,.6);roof(2.1,2.1,.5,[0,2.82,-.1],body,.3,.3);plaque('TWO WINGS · ONE HALL',2,.25,[0,2.56,1.01]);
  const hall=box(1.38,.06,1.5,M.orange,[0,.12,.15]);moving.push(p=>c.transform(hall,{scale:[.3+.7*p,1,1]}));distance=11.3;detail=[0,1.5,.5];
 }else if(kind==='gate'){
  for(const x of [-1.25,1.25]){box(.7,2.8,.7,M.stone,[x,1.4,0]);box(.86,.15,.88,M.ivory,[x,2.86,0]);roof(.8,.8,.34,[x,2.96,0]);}
  box(1.8,.48,.58,M.ivory,[0,2.55,0]);arch(0,1.68,.34,1.83,.66);plaque('GATE OF HOPE',1.6,.22,[0,2.56,.32]);
  for(const side of [-1,1]){const door=c.group(body,[side*.84,.05,.1]);for(let i=0;i<6;i++)box(.055,1.9,.07,M.deep,[-side*(.08+i*.15),.98,0],null,door);for(const y of [.22,1.65])box(.91,.065,.08,M.deep,[-side*.45,y,0],null,door);moving.push(p=>c.transform(door,{rotation:[0,side*.35*p,0]}));}
  for(const x of [-2.05,2.05]){box(.9,1.18,.4,M.ivory,[x,.6,0]);for(let i=0;i<5;i++)box(.04,.55,.06,M.deep,[x-.34+i*.17,1.47,0]);box(.98,.08,.45,M.stone,[x,1.2,0]);}
  detail=[0,1.9,.22];
 }else if(kind==='elephant'){
  box(2.7,.23,2.25,M.stone,[0,.13,0]);box(2.3,.4,1.9,M.ivory,[0,.43,0]);box(1.9,.9,1.5,M.stone,[0,1.05,0]);box(2.15,.13,1.75,M.gold,[0,1.57,0]);
  const e=c.group(body,[0,1.63,0]);sphere(.78,M.copper,[0,1.15,0],[1.18,.8,.7],e);sphere(.55,M.copper,[.85,1.35,0],[.8,1,.95],e);for(const x of [-.49,.49])for(const z of [-.34,.34]){cyl(.16,.88,M.copper,[x,.5,z],null,18,.2,e);sphere(.19,M.copper,[x,.1,z],[1.2,.5,1],e);}for(const z of [-.45,.45])sphere(.32,M.copper,[.63,1.33,z],[.72,1.25,.28],e);
  line([[1.08,1.27,0],[1.3,1.06,0],[1.44,.76,0],[1.49,.56,0],[1.68,.57,0]],.125,M.copper,e);for(const z of [-.24,.24]){line([[1.06,1.11,z],[1.33,1,z],[1.47,1.07,z]],.045,M.ivory,e);sphere(.035,M.black,[1.04,1.57,z],null,e);}line([[-.84,1.23,0],[-1.05,.94,0],[-1.12,.62,.05]],.055,M.copper,e);
  for(const z of [-.78,.78])plaque(z>0?'A GIFT · MANY LANGUAGES':'1871 · VISIT',1.72,.42,[0,1.02,z],z<0?[0,PI,0]:null);moving.push(p=>c.transform(e,{rotation:[0,(p-.5)*.3,0]}));detail=[.25,2.72,.1];distance=9.8;
 }else if(kind==='bridge'){
  box(6.3,.05,2.1,M.water,[0,.01,0]);for(const x of [-2.45,2.45]){box(.8,.5,2.6,M.stone,[x,.27,0]);box(.72,.7,2.65,M.ivory,[x,.83,0]);}
  box(5.5,.18,1.65,M.wood,[0,1.1,0]);for(let i=-12;i<=12;i++)box(.025,.012,1.6,M.stone,[i*.21,1.198,0]);
  for(const z of [-.84,.84]){const points=[];for(let i=0;i<=28;i++){const x=-2.5+i*5/28;points.push([x,1.35+1.55*(x*x/6.25),z]);}line(points,.07,M.deep);for(let i=-10;i<=10;i++){const x=i*.235;line([[x,1.2,z],[x,1.35+1.55*x*x/6.25,z]],.025,M.deep);}for(const x of [-2.5,2.5]){box(.14,2.45,.14,M.deep,[x,2.12,z]);sphere(.1,M.gold,[x,3.38,z]);}}
  const mark=c.group(body,[-2.39,.86,1.38]);line([[-.18,.12,0],[0,.35,0],[.18,.12,0]],.028,M.gold,mark);line([[-.22,.42,0],[.22,.42,0]],.024,M.gold,mark);moving.push(p=>c.transform(mark,{scale:[.7+p*.6,.7+p*.6,1]}));detail=[-2.35,1.1,1.13];distance=11;
 }else if(kind==='obelisk'){
  for(let i=0;i<3;i++)box(2.5-i*.32,.16,2.5-i*.32,M.stone,[0,.08+i*.16,0]);box(1.6,.83,1.6,M.ivory,[0,.9,0]);roof(1.28,1.28,2.75,[0,1.35,0],body,.7,.7,M.stone);roof(.72,.72,.48,[0,4.1,0],body,0,0,M.ivory);plaque('PUBLIC MEMORY',1.4,.35,[0,.94,.815]);for(const x of [-.55,.55])box(.045,.75,.035,M.gold,[x,2.04,.59]);
  const plate=c.group(body,[0,1.7,.68]);plaque('1850',.68,.25,[0,0,0],null,plate);moving.push(p=>c.transform(plate,{position:[0,1.7+p*.25,.68]}));detail=[0,1.1,.7];distance=10.6;
 }else if(kind==='clock'){
  for(const x of [-1.7,1.7]){box(2.1,1.9,1.6,M.ivory,[x,.98,0]);roof(2.27,1.8,.48,[x,1.96,0],body,.4,1.8,M.terra);for(const dx of [-.6,0,.6]){window(x+dx,1.04,.86,.34,.8);pillar(x+dx,.12,.99,1.5);}}
  box(1.15,3.3,1.2,M.ivory,[0,1.7,.1]);for(const y of [.4,2.3,3.25])box(1.34,.14,1.4,M.stone,[0,y,.1]);box(1.02,.95,1.14,M.stone,[0,3.75,.1]);cyl(.39,.08,M.ivory,[0,3.75,.73],[PI/2,0,0]);torus(.395,.035,M.gold,[0,3.75,.78]);for(let n=0;n<12;n++){const a=n*PI/6;box(.02,n%3===0?.08:.04,.025,M.deep,[Math.sin(a)*.3,3.75+Math.cos(a)*.3,.79],[0,0,-a]);}const hands=c.group(body,[0,3.75,.82]);box(.035,.27,.03,M.deep,[0,.12,0],null,hands);box(.19,.035,.04,M.deep,[.08,0,.02],null,hands);sphere(.04,M.gold,[0,0,.04],null,hands);roof(1.5,1.5,.7,[0,4.29,.1],body,.35,.35);cyl(.03,.45,M.gold,[0,5.1,.1]);moving.push(p=>c.transform(hands,{rotation:[0,0,-p*PI*2]}));detail=[0,3.73,.7];distance=11.6;
 }else if(kind==='fountain'){
  cyl(1.75,.22,M.stone,[0,.12,0],null,32);torus(1.5,.12,M.ivory,[0,.3,0],[PI/2,0,0]);cyl(1.43,.05,M.water,[0,.29,0],null,32);cyl(.62,.55,M.stone,[0,.58,0],null,8);cyl(.32,1.36,M.copper,[0,1.35,0],null,24,.49);cyl(1.05,.17,M.ivory,[0,1.92,0],null,32,.65);torus(1.02,.055,M.gold,[0,2.01,0],[PI/2,0,0]);cyl(.21,.8,M.copper,[0,2.38,0],null,24,.32);cyl(.59,.12,M.ivory,[0,2.85,0],null,24,.33);sphere(.16,M.gold,[0,3.13,0],[1,1.5,1]);
  for(let i=0;i<4;i++){const a=i*PI/2;const g=c.group(body,[Math.cos(a)*.47,.8,Math.sin(a)*.47],[0,-a+PI/2,0]);sphere(.12,M.copper,[0,.22,0],[1,.9,1.4],g);line([[0,.18,.1],[0,.05,.26],[0,-.05,.34]],.07,M.copper,g);}
  const streams=c.group(body);for(let i=0;i<6;i++){const a=i*PI/3;line([[Math.cos(a)*.5,2.83,Math.sin(a)*.5],[Math.cos(a)*.7,2.3,Math.sin(a)*.7],[Math.cos(a)*.8,2.04,Math.sin(a)*.8]],.018,M.water,streams);}moving.push(p=>c.transform(streams,{visible:p>.2,scale:[1, .6+p*.4,1]}));plaque('DONATION / COMMEMORATION',2.5,.27,[0,.07,1.9],[-.3,0,0]);detail=[0,1.65,.2];distance=9.7;
 }else if(kind==='press'){
  box(3.7,.2,2.6,M.wood,[0,.12,0]);for(const x of [-1.3,1.3]){box(.22,2.5,.28,M.deep,[x,1.46,-.3]);box(.48,.15,.54,M.gold,[x,.28,-.3]);}box(2.85,.25,.45,M.deep,[0,2.65,-.3]);cyl(.1,2.1,M.gold,[0,1.7,-.3]);for(let i=0;i<22;i++)torus(.115,.018,M.black,[0,.75+i*.076,-.3],[PI/2,0,0]);const platen=c.group(body,[0,1.25,0]);box(2.13,.2,1.55,M.black,[0,0,0],null,platen);box(2,.03,1.5,M.paper,[0,.12,0],null,platen);const wheel=c.group(body,[1.58,1.85,-.3]);torus(.72,.065,M.deep,[0,0,0],[0,PI/2,0],wheel);for(let i=0;i<6;i++){const a=i*PI/3;line([[0,0,0],[0,Math.cos(a)*.67,Math.sin(a)*.67]],.035,M.gold,wheel);}cyl(.12,.4,M.gold,[0,0,0],[0,0,PI/2],24,.12,wheel);for(let x=0;x<4;x++)for(let z=0;z<3;z++){box(.3,.12,.3,M.gold,[-.64+x*.42,.4,.58+z*.4]);}moving.push(p=>{c.transform(platen,{position:[0,1.35-p*.65,0]});c.transform(wheel,{rotation:[p*PI*2,0,0]});});detail=[0,1.25,.3];distance=9.2;
 }else if(kind==='film'){
  box(3.4,.2,2.6,M.wood,[0,.12,0]);box(1.1,1.6,.8,M.deep,[0,1.15,0]);for(let i=0;i<6;i++)box(.75,.026,.055,M.gold,[0,.7+i*.12,.43]);const reels=[];
  for(const x of [-.74,.74]){const g=c.group(body,[x,2.55,0]);for(const z of [-.16,.16]){torus(.64,.045,M.gold,[0,0,z],null,g);cyl(.12,.06,M.gold,[0,0,z],[PI/2,0,0],20,.12,g);for(let i=0;i<5;i++){const a=i*PI*2/5;line([[Math.sin(a)*.15,Math.cos(a)*.15,z],[Math.sin(a)*.59,Math.cos(a)*.59,z]],.038,M.gold,g);}}box(.25,.45,.16,M.deep,[0,-.65,0],null,g);reels.push(g);}
  cyl(.29,.55,M.black,[0,1.58,.61],[PI/2,0,0]);torus(.3,.045,M.gold,[0,1.58,.9]);cyl(.23,.03,M.glass,[0,1.58,.92],[PI/2,0,0]);line([[-.75,1.96,.16],[-.3,1.62,.18],[-.3,.45,.18],[.3,.45,.18],[.3,1.62,.18],[.75,1.96,.16]],.035,M.black);for(let i=0;i<12;i++)box(.2,.028,.028,M.paper,[-.31,.55+i*.08,.24]);plaque('LOOK AGAIN',1.2,.25,[0,.2,1.08],[-.45,0,0]);moving.push(p=>reels.forEach(g=>c.transform(g,{rotation:[0,0,-p*PI*2]})));detail=[0,1.7,.4];
 }else if(kind==='letter'){
  const map=c.group(body,[0,.12,0],[0,-.15,0]);box(3.8,.05,2.8,M.paper,[0,.04,0],null,map);for(let i=0;i<6;i++)line([[-1.7,.08,-1.1+i*.4],[1.7,.08,-1.1+i*.4]],.009,{color:'#a8ad98'},map);for(let i=0;i<8;i++)line([[-1.6+i*.45,.08,-1.2],[-1.6+i*.45,.08,1.2]],.009,{color:'#a8ad98'},map);line([[-1.7,.08,-.8],[-1.3,.08,-.65],[-.9,.08,-.2],[-.3,.08,-.4],[.25,.08,.2],[1,.08,.3],[1.6,.08,.9]],.05,M.water,map);
  const envelope=c.group(body,[-.1,.28,.2],[0,.18,0]);box(2.4,.07,1.52,M.ivory,[0,0,0],null,envelope);const flap=c.group(envelope,[0,.06,-.76]);c.mesh({positions:[-1.2,0,0,1.2,0,0,0,0,1.05],indices:[0,1,2]},M.paper,flap);cyl(.21,.045,M.terra,[0,.13,.15],null,24,.21,envelope);cyl(.15,.055,M.gold,[0,.15,.15],null,24,.15,envelope);torus(.5,.055,M.gold,[1.23,.23,-.8],[PI/2,0,0]);const needle=c.group(body,[1.23,.25,-.8]);line([[0,0,-.43],[0,0,.43]],.036,M.deep,needle);moving.push(p=>{c.transform(flap,{rotation:[-p*1.6,0,0]});c.transform(needle,{rotation:[0,p*PI*2,0]});});detail=[0,.4,.1];distance=7.9;
 }
 const badge=c.group(root,[baseWidth/2-.33,.03,1.88]);cyl(.19,.04,M.orange,[0,0,0],null,24,.19,badge);cyl(.1,.052,M.gold,[0,0,0],null,24,.1,badge);
 let disposed=false;return {kind,name:FIELD_MODEL_NAMES[kind],detail,overview:bespoke?.overview||[0,kind==='clock'?2.15:kind==='letter'?.25:1.65,0],distance,anchors:bespoke?.anchors||null,elevation:bespoke?.elevation,alignPart:bespoke?.alignPart,front:bespoke?.front,back:bespoke?.back,
  update({progress=0,highlight=false}={}){if(disposed)return false;const p=clamp(Number(progress)||0,0,100)/100;moving.forEach(fn=>fn(p));c.transform(badge,{scale:highlight?[1.3,1.3,1.3]:[1,1,1]});return false;},
  dispose(){disposed=true;moving.length=0;}
 };
}
