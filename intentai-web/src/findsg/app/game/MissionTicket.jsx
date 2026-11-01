import React,{useRef} from 'react';
import TearTicket from './TearTicket.jsx';
import {ROUTES} from '../data.js';
import {GAME_STORIES} from './game-content.js';
import './mission-ticket.css';

/** Opening an invitation only navigates to a story. It never marks arrival,
 * confirms an observation, or grants a collectible. */
export default function MissionTicket({routeId,reducedMotion=false,started=false,completed=0,total=0,onOpen}){
 const ticket=useRef(null),story=GAME_STORIES[routeId],meta=ROUTES[routeId];
 return <section className="mission-ticket" aria-label={`Story commission: ${story.title}`}>
  <div className="mission-ticket__caption"><span>YOUR NEXT CITY STORY</span><small>{started?`In progress · ${completed} of ${total} found`:'A commission waiting to be opened'}</small></div>
  <TearTicket ref={ticket} width={460} height={208} stubSize={111} radius={10} holes={11} holeSize={5} notch={5} roughness={1.8} tearAngle={27} stretch={25} resistance={.42} rotate={-1.2} tiltMax={4} tiltReach={170} parallax={2} background="#e2d0a6" color="#354a38" stubBackground="#be8042" borderColor="#a78a54" reducedMotion={reducedMotion} onTear={()=>onOpen?.()} ariaLabel={`Tear the stub to open ${story.title}`} className="mission-ticket__paper" stub={<div className="mission-ticket__stub"><small>Hold the stub</small><strong>Tear to<br/>{started?'continue':'begin'}</strong><span aria-hidden="true">↘︎</span><b>SG / {meta.no}</b></div>}>
   <div className="mission-ticket__body"><span className="mission-ticket__folio">FINDSG / COMMISSION {meta.no}</span><h3>{story.title}</h3><p>{story.playerRole}</p><div className="mission-ticket__details"><span>{meta.area}</span><b>{total} PLACES</b></div><span className="mission-ticket__mark" aria-hidden="true">F.</span></div>
  </TearTicket>
  <div className="mission-ticket__actions"><p>Pull the orange stub outward to open this commission.</p><button type="button" onClick={()=>ticket.current?.tear()}>{started?'Open and keep exploring':'Open the commission'} <span aria-hidden="true">↗︎</span></button></div>
 </section>;
}
