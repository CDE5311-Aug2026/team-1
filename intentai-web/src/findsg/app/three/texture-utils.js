import * as THREE from 'three';
import {createPatinaSurface,createArchivePaper,createArchiveDial,createStudioBackdrop} from '../story-materials.js';

function rng(seed=17) { let a=seed; return () => { a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function canvas(w,h=w) { const c=document.createElement('canvas'); c.width=w;c.height=h;return c; }
function texture(c,color=true) { const t=new THREE.CanvasTexture(c);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=4;return t; }
function noise(ctx,w,h,seed=17,amount=12) { const random=rng(seed);const d=ctx.getImageData(0,0,w,h);for(let i=0;i<d.data.length;i+=4){const n=(random()-.5)*amount;d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n;}ctx.putImageData(d,0,0); }
export function makeSurface(kind='paper',size=512){const t=texture(createPatinaSurface(kind,size));t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
export function makePaperTexture(options={}){return texture(createArchivePaper({...options,size:options.size||768}));}
export function makeBackdropTexture(size=512){return texture(createStudioBackdrop(size));}
export function makeLabelTexture(label,{color='#cdbb82',background='#263d35',size=512,mirror=false}={}) {
 const c=canvas(size,Math.round(size/6)),x=c.getContext('2d');x.fillStyle=background;x.fillRect(0,0,c.width,c.height);noise(x,c.width,c.height,23,7);if(mirror){x.translate(c.width,0);x.scale(-1,1);}x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.font=`${c.height*.45}px Georgia,serif`;x.fillText(label,size/2,c.height/2,size*.9);return texture(c);
}
export function makeClockFace(size=1024){return texture(createArchiveDial(size));}
export function makeShadowTexture(size=128) {const c=canvas(size),x=c.getContext('2d');const g=x.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);g.addColorStop(0,'rgba(15,12,7,.55)');g.addColorStop(.45,'rgba(15,12,7,.22)');g.addColorStop(1,'rgba(15,12,7,0)');x.fillStyle=g;x.fillRect(0,0,size,size);return texture(c,false);}
export function makeEnvironmentTexture() {
 const c=canvas(1024,512),x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#d8cba9');g.addColorStop(.48,'#9b998c');g.addColorStop(.54,'#574938');g.addColorStop(1,'#342c22');x.fillStyle=g;x.fillRect(0,0,1024,512);
 const soft=(a,b,w,h,color)=>{const gg=x.createRadialGradient(a+w/2,b+h/2,2,a+w/2,b+h/2,w*.6);gg.addColorStop(0,color);gg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gg;x.fillRect(a,b,w,h);};soft(60,25,360,290,'rgba(255,241,209,1)');soft(650,75,220,230,'rgba(205,225,232,.82)');x.fillStyle='#fff0ca';x.fillRect(176,75,125,178);x.fillStyle='#c3d4d3';x.fillRect(755,115,52,125);const t=texture(c);t.mapping=THREE.EquirectangularReflectionMapping;return t;
}
