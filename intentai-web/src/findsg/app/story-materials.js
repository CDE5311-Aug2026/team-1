/* Shared, locally generated archive materials. These are invented scene props, not scans of historical artefacts. */
const TAU=Math.PI*2;
function seeded(seed=17){let a=seed>>>0;return ()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};}
function surface(width,height=width){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return [canvas,canvas.getContext('2d')];}
function grain(ctx,w,h,seed,amount){const random=seeded(seed),image=ctx.getImageData(0,0,w,h);for(let i=0;i<image.data.length;i+=4){const d=(random()-.5)*amount;image.data[i]+=d;image.data[i+1]+=d;image.data[i+2]+=d;}ctx.putImageData(image,0,0);}
function stain(ctx,x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
export function createPatinaSurface(kind='paper',size=512){
 const [canvas,x]=surface(size),random=seeded(kind.length*37+11);
 const palette={wood:'#67452e',brass:'#c3a363',metal:'#c3a363',iron:'#34463f',ink:'#172725',plaster:'#e6ddc6',stone:'#b9b3a0',roof:'#416b5b',felt:'#314d43',paper:'#e8d8b3'};
 x.fillStyle=palette[kind]||palette.paper;x.fillRect(0,0,size,size);
 if(kind==='wood'){
  for(let y=0;y<size;y++){x.strokeStyle=`rgba(${y%3?'34,20,10':'205,157,99'},${.07+random()*.12})`;x.lineWidth=.5+random();x.beginPath();for(let xx=0;xx<=size;xx+=10){const yy=y+Math.sin(xx*.011+y*.03)*4+Math.sin(xx*.043+y*.009);xx?x.lineTo(xx,yy):x.moveTo(xx,yy);}x.stroke();}
  for(let n=0;n<8;n++){const cy=random()*size,cx=random()*size;for(let j=0;j<4;j++){x.strokeStyle='rgba(28,17,10,.13)';x.beginPath();x.ellipse(cx,cy,18+j*8,2.5+j*1.7,.025,0,TAU);x.stroke();}}
  const g=x.createLinearGradient(0,0,0,size);g.addColorStop(0,'rgba(255,213,145,.16)');g.addColorStop(.35,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(27,17,12,.23)');x.fillStyle=g;x.fillRect(0,0,size,size);
 }else if(kind==='brass'||kind==='metal'){
  for(let i=0;i<700;i++){const px=random()*size,py=random()*size;x.strokeStyle=i%4?'rgba(50,43,28,.10)':'rgba(255,239,193,.23)';x.lineWidth=.4;x.beginPath();x.moveTo(px,py);x.lineTo(px+4+random()*45,py+random()*1.2);x.stroke();}
  for(let i=0;i<24;i++)stain(x,random()*size,random()*size,10+random()*36,'rgba(42,80,66,.23)');
  x.strokeStyle='rgba(72,60,32,.24)';x.lineWidth=1;for(let i=0;i<3;i++)x.strokeRect(8+i*4,8+i*4,size-16-i*8,size-16-i*8);
 }else if(kind==='roof'){
  const cols=24,rows=12,cw=size/cols,ch=size/rows;
  for(let y=0;y<rows;y++)for(let col=0;col<cols;col++){const px=col*cw,py=y*ch;x.fillStyle=`rgba(${(col+y)%3?'21,48,40':'154,163,111'},${.07+random()*.12})`;x.fillRect(px+.8,py+.8,cw-1.6,ch-1.6);x.strokeStyle='rgba(16,34,30,.48)';x.lineWidth=1.2;x.beginPath();x.moveTo(px,py);x.lineTo(px,py+ch);x.quadraticCurveTo(px+cw*.5,py+ch+2,px+cw,py+ch);x.stroke();x.strokeStyle='rgba(208,195,144,.26)';x.beginPath();x.moveTo(px+cw*.3,py+2);x.lineTo(px+cw*.3,py+ch-3);x.stroke();}
 }else if(kind==='felt'){
  for(let i=0;i<size;i+=3){x.strokeStyle=i%2?'rgba(176,185,145,.055)':'rgba(3,22,17,.11)';x.lineWidth=.7;x.beginPath();x.moveTo(0,i);x.lineTo(size,i+5);x.moveTo(i,0);x.lineTo(i+5,size);x.stroke();}
  stain(x,size*.3,size*.5,size*.45,'rgba(109,116,71,.17)');
 }else if(kind==='ink'||kind==='iron'){
  for(let i=0;i<600;i++){const px=random()*size,py=random()*size;x.strokeStyle=i%4?'rgba(6,16,14,.15)':'rgba(176,190,162,.13)';x.lineWidth=.4+random()*.8;x.beginPath();x.moveTo(px,py);x.lineTo(px+(kind==='ink'?size*.3:random()*13),py+random()*2);x.stroke();}
  for(let i=0;i<16;i++)stain(x,random()*size,random()*size,8+random()*20,kind==='iron'?'rgba(138,96,54,.15)':'rgba(5,13,16,.17)');
 }else{
  for(let i=0;i<620;i++){const px=random()*size,py=random()*size;x.strokeStyle='rgba(116,90,58,.09)';x.lineWidth=.4;x.beginPath();x.moveTo(px,py);x.lineTo(px+1+random()*12,py+random()*4);x.stroke();}
  for(let i=0;i<16;i++)stain(x,random()*size,random()*size,10+random()*36,'rgba(119,87,51,.08)');
 }
 grain(x,size,size,31,kind==='felt'?7:kind==='brass'||kind==='metal'?8:11);
 return canvas;
}
export function createArchivePaper({title='SCENE STUDY',subtitle='FINDSG / NEWLY CREATED STORY PROP',lines=[],stamp='STORY PROP',year='',columns=false,plain=false,mirror=false,size=640}={}){
 const h=Math.round(size*1.32),[canvas,x]=surface(size,h),random=seeded(title.length*13+43),w=size;
 const base=x.createLinearGradient(0,0,w,h);base.addColorStop(0,'#f0e3c4');base.addColorStop(.58,'#e5d2aa');base.addColorStop(1,'#d6bd91');x.fillStyle=base;x.fillRect(0,0,w,h);grain(x,w,h,42,9);
 for(let i=0;i<420;i++){const px=random()*w,py=random()*h;x.strokeStyle='rgba(124,88,47,.08)';x.lineWidth=.4;x.beginPath();x.moveTo(px,py);x.lineTo(px+random()*8,py+random()*3);x.stroke();}
 for(let i=0;i<15;i++)stain(x,random()*w,random()*h,6+random()*h*.06,'rgba(113,72,28,.10)');
 // Folds and frayed edges belong to the invented prop, never an attributed original.
 for(const fold of [.49]){const f=x.createLinearGradient(w*fold-5,0,w*fold+6,0);f.addColorStop(0,'rgba(91,67,38,0)');f.addColorStop(.45,'rgba(94,70,38,.15)');f.addColorStop(.6,'rgba(255,248,220,.42)');f.addColorStop(1,'rgba(91,67,38,0)');x.fillStyle=f;x.fillRect(w*fold-5,0,11,h);}
 x.strokeStyle='rgba(143,105,57,.22)';x.lineWidth=1.1;x.beginPath();x.moveTo(0,h*.66);x.lineTo(w,h*.67);x.stroke();x.strokeStyle='rgba(255,247,220,.42)';x.beginPath();x.moveTo(0,h*.66+1.8);x.lineTo(w,h*.67+1.8);x.stroke();
 x.strokeStyle='rgba(106,75,35,.26)';x.lineWidth=1;for(const edge of [0,1]){x.beginPath();for(let i=0;i<=80;i++){const px=w*i/80,py=(edge?h-3:3)+(random()-.5)*3;i?x.lineTo(px,py):x.moveTo(px,py);}x.stroke();}
 if(mirror){x.translate(w,0);x.scale(-1,1);}
 x.fillStyle='#3f4337';x.textAlign='center';x.font=`${w*.025}px Georgia,serif`;x.fillText(subtitle,w*.5,h*.088,w*.83);x.font=`bold ${w*(columns?.067:.062)}px Georgia,serif`;x.fillText(title,w*.5,h*.166,w*.84);
 x.strokeStyle='#766347';x.lineWidth=columns?2:1;x.beginPath();x.moveTo(w*.09,h*.19);x.lineTo(w*.91,h*.19);x.stroke();
 if(year){x.font=`${w*.20}px Georgia,serif`;x.fillText(year,w*.5,h*.37);}
 x.textAlign='left';x.font=`${w*.028}px Georgia,serif`;lines.forEach((line,i)=>x.fillText(line,w*.10,h*(year?.45:.245)+i*h*.046,w*.80));
 if(!plain){const count=columns?3:1,start=h*(year?.64:.47);for(let col=0;col<count;col++){const left=w*.10+col*w*.276,width=columns?w*.244:w*.80;x.fillStyle='#5a5948';x.font=`${w*(columns?.020:.022)}px Georgia,serif`;const text=columns?['THE CITY / NOTES','READ THE EVIDENCE','A STORY IN PRINT']:['ARCHIVE NOTES','FORM / DATE / ROLE','A NEWLY CREATED RECORD'];for(let row=0;row<13;row++){x.globalAlpha=.46+random()*.2;x.fillText(text[(row+col)%text.length],left,start+row*h*.022,width*(.72+random()*.28));}x.globalAlpha=1;if(columns&&col<2){x.strokeStyle='#ac9876';x.lineWidth=.6;x.beginPath();x.moveTo(left+width+w*.016,start-8);x.lineTo(left+width+w*.016,h*.85);x.stroke();}}}
 if(stamp){x.save();x.translate(w*.73,h*.885);x.rotate(-.12);x.strokeStyle='#9c6246';x.fillStyle='#9c6246';x.lineWidth=1.8;x.strokeRect(-w*.15,-h*.024,w*.30,h*.048);x.textAlign='center';x.font=`${w*.022}px sans-serif`;x.fillText(stamp,0,h*.006,w*.27);x.restore();}
 return canvas;
}
export function archivePaperGeometry(w,h){
 const nx=6,ny=8,positions=[],uvs=[],indices=[];
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny,edge=(i===0||i===nx)?Math.sin(j*4.7)*.006:0,x=(u-.5)*w+edge,y=(v-.5)*h+(j===0?Math.sin(i*4.1)*.006:0);const crease=.006*Math.exp(-Math.abs(u-.49)*45),curl=Math.pow(Math.max(0,(v-.73)/.27),2)*.032,corner=Math.max(0,(u-.70)/.30)*Math.max(0,(.22-v)/.22)*.055;positions.push(x,y,.004*Math.sin(u*5)+crease+curl+corner);uvs.push(u,v);if(i<nx&&j<ny){const a=j*(nx+1)+i;indices.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}}
 const edge=[];for(let i=0;i<=nx;i++)edge.push(i);for(let j=1;j<=ny;j++)edge.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)edge.push(ny*(nx+1)+i);for(let j=ny-1;j>0;j--)edge.push(j*(nx+1));
 for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length],base=positions.length/3;positions.push(positions[a*3],positions[a*3+1],positions[a*3+2]-.012,positions[b*3],positions[b*3+1],positions[b*3+2]-.012);uvs.push(uvs[a*2],uvs[a*2+1],uvs[b*2],uvs[b*2+1]);indices.push(a,base,b,b,base,base+1);}
 return {positions,uvs,indices};
}
export function createStudioBackdrop(size=512){const [canvas,x]=surface(size),g=x.createLinearGradient(0,0,size,size);g.addColorStop(0,'#879c94');g.addColorStop(.45,'#b8bcb0');g.addColorStop(1,'#6e8985');x.fillStyle=g;x.fillRect(0,0,size,size);stain(x,size*.28,size*.28,size*.68,'rgba(255,215,151,.38)');stain(x,size*.87,size*.25,size*.62,'rgba(42,72,82,.25)');grain(x,size,size,29,3);return canvas;}
export const FOCUS_SHOTS={
 'telok-ayer':{letter:{target:[2.45,.42,.95],distance:8.3,yaw:.30,pitch:.72,title:'Paper and wax of the letter',text:'The folds, paper layers and wax seal are new story props; the people in the letter are fictional.'},architecture:{target:[-1.7,2.0,-1.35],distance:10.8,yaw:.20,pitch:1.02,title:'Eaves and outline',text:'Look closely at the lower storey, the octagonal upper level and the rhythm of the roof tiles. The model is not a surveyed reconstruction.'}},
 'kampong-gelam':{press:{target:[-1.7,1.5,.25],distance:9.3,yaw:.42,pitch:.97,title:'Before the press comes down',text:'Look at the screw, the ink roller and the paper. The mirrored plate and subscription slip are new to this level.'},architecture:{target:[3.65,1.45,-2.13],distance:9.2,yaw:-.20,pitch:1.06,title:'Shophouse details',text:'Columns, louvres and cornices set the street’s mood; for the place’s history, trust the fact cards.'}},
 balestier:{projector:{target:[-2.0,2.15,.05],distance:10.1,yaw:.31,pitch:1.04,title:'Where the film runs',text:'The open reel, sprocket holes and lens are physical props; the Time Camera is fiction.'},architecture:{target:[3.2,1.45,-2.27],distance:8.9,yaw:-.20,pitch:1.06,title:'Putting the credits back on the facade',text:'Two fact cards tell the designer from the developer; these shophouses are concept miniatures.'}},
 'civic-f1':{watch:{target:[-1.12,1.6,.8],distance:8.8,yaw:.12,pitch:.84,title:'Inside the watch lid',text:'The pocket watch is a new prop; 1857 and 1882 are the years of two different events.'},architecture:{target:[0,1.8,-2.3],distance:14.2,yaw:.18,pitch:1.03,title:'Bridge and clock tower',text:'The miniature buildings hint at city landmarks and public time; they are not for real measuring or navigation.'}}
};
export function createArchiveDial(size=768){
 const [canvas,x]=surface(size),m=size/2;
 x.fillStyle='#e9dfc4';x.fillRect(0,0,size,size);grain(x,size,size,73,7);stain(x,size*.20,size*.72,size*.20,'rgba(127,93,47,.10)');
 x.translate(m,m);x.strokeStyle='#615e48';x.fillStyle='#33443c';
 for(const r of [.39,.438,.462]){x.lineWidth=r===.462?2:.8;x.beginPath();x.arc(0,0,size*r,0,TAU);x.stroke();}
 for(let i=0;i<60;i++){x.save();x.rotate(i*Math.PI/30);x.lineWidth=i%5?1.2:3;x.beginPath();x.moveTo(0,-size*.435);x.lineTo(0,-size*(i%5?.423:.398));x.stroke();x.restore();}
 x.font=`${size*.060}px Georgia,serif`;x.textAlign='center';x.textBaseline='middle';['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].forEach((v,i)=>{const a=i*Math.PI/6-Math.PI/2;x.fillText(v,Math.cos(a)*size*.337,Math.sin(a)*size*.337);});
 x.font=`${size*.022}px Georgia,serif`;x.fillText('CITY ARCHIVE',0,-size*.14);x.font=`${size*.014}px sans-serif`;x.fillText('NEWLY CREATED STORY PROP',0,-size*.105);
 if(size>=640){x.save();x.translate(0,size*.20);x.strokeStyle='#929076';x.lineWidth=.8;x.beginPath();x.arc(0,0,size*.086,0,TAU);x.stroke();for(let i=0;i<12;i++){x.save();x.rotate(i*Math.PI/6);x.beginPath();x.moveTo(0,-size*.079);x.lineTo(0,-size*.069);x.stroke();x.restore();}x.strokeStyle='#687460';x.beginPath();x.moveTo(0,0);x.lineTo(size*.039,-size*.047);x.stroke();x.restore();}
 return canvas;
}
