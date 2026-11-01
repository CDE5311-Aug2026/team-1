import stories from '../story-data.json';
import gameplay from '../gameplay-data.json';
import storyboard from '../visual-story-data.json';

export const DATA=stories;
export const GAME=gameplay;
export const ORDER=['route','intro','arrival','evidence','puzzle','reward','next','ending'];
export const LABELS=['Route','Opening','Arrival','Evidence','Puzzle','Reward','Next stop','Ending'];
export const ROUTES={
 'telok-ayer':{area:'Telok Ayer',en:'TELOK AYER',title:'Letters to the Shore',motif:'THE LETTER',tag:'Letters · Migration · Buildings',asset:'telok-ayer',accent:'#bd8d5c',date:'A family letter never sent',object:'Lift the envelope flap',action:'open',power:'Observe',no:'01',material:'Old paper / wax seal / brass',quote:'The sea has moved far away, but the address on the letter remains.'},
 'kampong-gelam':{area:'Kampong Gelam',en:'KAMPONG GELAM',title:'The Last Edition',motif:'THE LAST EDITION',tag:'Newspapers · Publishing · Community',asset:'kampong-glam',accent:'#b79c72',date:'1938 · a fictional typesetter’s apprentice',object:'Start the press',action:'print',power:'Proofread',no:'02',material:'Metal type / ink / old newsprint',quote:'How many voices does a city write down?'},
 'balestier':{area:'Balestier',en:'BALESTIER',title:'The Last Screening',motif:'THE LOST CREDITS',tag:'Film · Shophouses · Behind the scenes',asset:'balestier',accent:'#b1905c',date:'A cut end credit',object:'Turn the projector',action:'restore',power:'Edit',no:'03',material:'Film / lens / metal reel',quote:'The camera remembered the street. Who remembered the people who built it?'},
 'civic-f1':{area:'Civic District · Marina Bay',en:'CIVIC DISTRICT',title:'The Missing Years',motif:'THE MISSING YEARS',tag:'Public memory · Time · Night race',asset:'civic-f1',accent:'#ee9b52',date:'1857 / 1882 · two kinds of city time',object:'Open the city timer',action:'open',power:'Accelerate',no:'04',material:'Brass / night rain / light trails',quote:'Does time really belong only to the fastest?'}
};
export function assetFor(path){const hit=window.__FINDSG_ASSETS__?.[path];if(hit)return hit;if(typeof path==='string'&&path.startsWith('./assets/'))return import.meta.env.BASE_URL+'findsg/'+path.slice(9).replace(/\.png$/,'.webp');return path;}
export function imageFor(routeId){return assetFor(`./assets/cinematic/${ROUTES[routeId]?.asset||'telok-ayer'}.png`);}
// The left panel of each existing triptych is an outdoor concept scene.
// Scene-card layout must crop to that panel; these are not location photographs.
export function gameSceneImageFor(routeId){
 const paths={'telok-ayer':'./assets/telok-ayer-triptych.png','kampong-gelam':'./assets/kampong-gelam-triptych.png','balestier':'./assets/balestier-triptych.png','civic-f1':'./assets/civic-f1-triptych.png'};
 return assetFor(paths[routeId]||paths['telok-ayer']);
}
export function findStory(routeId){return DATA.stories.find(s=>s.route_id===routeId)||DATA.stories[0];}
export function findGame(routeId){return GAME.routes.find(s=>s.route_id===routeId)||GAME.routes[0];}
export function blankProgress(){return {collected:[],visitedSteps:[],selected:null,saved:false,endingChoice:null,mechanics:{version:1,challengeComplete:false,puzzleSolved:false,granted:false,spent:false,opened:[],nextChoice:null,nextCorrect:false,nextDone:false,work:{},events:[]}};}
export function normalizeProgress(value={},story){
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
 const q=blankProgress(),p=object(value),old=object(p.mechanics),work={...object(old.work)};
 work.words=Array.isArray(work.words)?work.words.filter(x=>['111','JALAN','SULTAN'].includes(x)):[];
 work.read=Array.isArray(work.read)?work.read.filter(x=>typeof x==='string'):[];
 work.raceSnapshot=work.raceSnapshot??old.raceSnapshot??null;
 const mechanics={...q.mechanics,...old,opened:Array.isArray(old.opened)?old.opened.filter(x=>typeof x==='string'):[],work};
 for(const key of ['challengeComplete','puzzleSolved','granted','spent','nextCorrect','nextDone'])mechanics[key]=old[key]===true;
 return {...q,...p,saved:p.saved===true,collected:Array.isArray(p.collected)?p.collected.filter(id=>story.cards.some(c=>c.id===id)):[],visitedSteps:Array.isArray(p.visitedSteps)?p.visitedSteps.filter(x=>ORDER.includes(x)):[],mechanics};
}
export function readRouteHash(){const [view,routeId,phase]=location.hash.slice(1).split('/');if(!['home','story','routes','collection','studio','rooms'].includes(view))return {};return {view,...(ROUTES[routeId]?{routeId}:{}),...(ORDER.includes(phase)?{phase}:{})};}
export function readSaved(){try{let d=JSON.parse(localStorage.getItem('findsg-cinematic-v3')||'null');if(!d){const old=JSON.parse(localStorage.getItem('findsg-story-preview-v1')||'{}');d={...old,routeId:DATA.stories.find(s=>s.id===old.storyId)?.route_id,view:'home'};}return {...(d||{}),...readRouteHash()};}catch{return readRouteHash();}}
export function sourceName(url){try{const host=new URL(url).hostname;return {'www.roots.gov.sg':'National Heritage Board · NHB','www.ura.gov.sg':'Urban Redevelopment Authority · URA','biblioasia.nlb.gov.sg':'National Library Board · NLB','www.nparks.gov.sg':'NParks','artsandculture.google.com':'Museum archive · Arts & Culture','singaporegp.sg':'Singapore GP'}[host]||host.replace(/^www\./,'');}catch{return 'Original source';}}
export function phaseDetail(routeId,phase){const rows=Array.isArray(storyboard)?storyboard:storyboard.scenes||storyboard.routes||[];if(Array.isArray(rows))return rows.find(x=>x.route_id===routeId&&x.step_id===phase)||null;return null;}
