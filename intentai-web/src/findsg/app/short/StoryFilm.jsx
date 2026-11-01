import React,{useCallback,useEffect,useId,useRef,useState} from 'react';
import {assetFor} from '../data.js';
import {SHORT_FILMS} from './short-films.js';
import './story-film.css';

const clock=seconds=>`${Math.floor(Math.max(0,seconds)/60)}:${String(Math.floor(Math.max(0,seconds)%60)).padStart(2,'0')}`;
const savesData=()=>typeof navigator!=='undefined'&&navigator.connection?.saveData===true;

/** Presentation only: the caller owns check-ins, puzzle state and routing. */
export default function StoryFilm({filmId,onContinue,onClose,reducedMotion=false,replay=false,continueLabel}){
 const film=SHORT_FILMS[filmId];
 const labelId=useId(),descriptionId=useId(),seekId=useId();
 const dialog=useRef(null),video=useRef(null),playButton=useRef(null),closeButton=useRef(null);
 const alive=useRef(false),finished=useRef(false),callbacks=useRef({onContinue,onClose}),watchdog=useRef(null),wantsPlay=useRef(false);
 const [status,setStatus]=useState('poster'),[time,setTime]=useState(0),[duration,setDuration]=useState(film?.duration||8),[muted,setMuted]=useState(true),[captions,setCaptions]=useState(true),[message,setMessage]=useState('');
 const [gentleStart]=useState(()=>reducedMotion||savesData());
 callbacks.current={onContinue,onClose};

 const clearWatchdog=useCallback(()=>{clearTimeout(watchdog.current);watchdog.current=null;},[]);
 const watchLoading=useCallback(()=>{
  clearWatchdog();
  watchdog.current=setTimeout(()=>{
   if(!alive.current)return;
   wantsPlay.current=false;
   video.current?.pause();
   setStatus('error');
   setMessage('The film is loading slowly. Try again, or continue the story.');
  },12000);
 },[clearWatchdog]);

 // a tap that opened the film (on a button where the film's own button now lies) must not also close it
 const openedAt=useRef(0);
 const finish=useCallback((reason='continue')=>{
  if(finished.current||performance.now()-openedAt.current<500)return;
  finished.current=true;wantsPlay.current=false;clearWatchdog();video.current?.pause();
  const callback=callbacks.current.onContinue||callbacks.current.onClose;
  callback?.(reason);
 },[clearWatchdog]);

 const play=useCallback(async({restart=false,reload=false}={})=>{
  const media=video.current;if(!media||!alive.current)return;
  setMessage('');wantsPlay.current=true;
  if(reload)media.load();
  if(restart||media.ended){try{media.currentTime=0;}catch{}setTime(0);}
  setStatus('loading');watchLoading();
  try{await media.play();}
  catch(error){
   if(!alive.current||!wantsPlay.current)return;
   wantsPlay.current=false;clearWatchdog();
   setStatus(error?.name==='NotAllowedError'?'poster':'error');
   setMessage(error?.name==='NotAllowedError'?'Tap play to start the film.':'The film cannot play right now. Try again, or continue the story.');
  }
 },[clearWatchdog,watchLoading]);

 useEffect(()=>{
  if(!film)return;
  alive.current=true;finished.current=false;wantsPlay.current=false;openedAt.current=performance.now();
  setStatus('poster');setTime(0);setDuration(film.duration);setMuted(true);setMessage('');
  const previousFocus=document.activeElement,modal=dialog.current,media=video.current;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  if(modal&&!modal.open)modal.showModal();
  const focusFrame=requestAnimationFrame(()=>{(gentleStart?playButton.current:closeButton.current)?.focus({preventScroll:true});});
  if(!gentleStart&&!reducedMotion)void play();
  const hide=()=>{if(document.hidden){wantsPlay.current=false;clearWatchdog();media?.pause();}};
  document.addEventListener('visibilitychange',hide);
  return()=>{
   alive.current=false;wantsPlay.current=false;clearWatchdog();cancelAnimationFrame(focusFrame);
   document.removeEventListener('visibilitychange',hide);
   media?.pause();modal?.close();document.body.style.overflow=previousOverflow;
   if(previousFocus?.isConnected)previousFocus.focus?.({preventScroll:true});
  };
 // A different film is a fresh presentation, never a new game action.
 },[filmId]);

 if(!film)return null;
 const ended=status==='ended',playing=status==='playing',loading=status==='loading',failed=status==='error';
 const progress=duration>0?Math.min(100,time/duration*100):0;
 const caption=captions?film.captions.find(c=>time>=c.start&&time<c.end)?.text:'';
 const nextLabel=continueLabel||(replay?'Back to the archive':film.continueLabel);
 const statusLabel={poster:'Ready to play',loading:'Loading',playing:'Playing',paused:'Paused',ended:'Ended',error:'Not playing'}[status];

 function togglePlay(){
  const media=video.current;if(!media)return;
  if(!media.paused&&!media.ended){wantsPlay.current=false;clearWatchdog();media.pause();setStatus('paused');}
  else void play({restart:media.ended});
 }
 function seek(event){
  const next=Math.min(duration,Math.max(0,Number(event.target.value)));setTime(next);
  if(video.current){try{video.current.currentTime=next;}catch{}}
  if(ended)setStatus('paused');
 }
 function metadata(){
  const media=video.current;
  if(Number.isFinite(media?.duration)&&media.duration>0)setDuration(media.duration);
  // The visual caption uses the same timed copy locally, including offline HTML.
  // Keep the VTT available to assistive/media clients without duplicate display.
  if(media?.textTracks)for(let i=0;i<media.textTracks.length;i++)media.textTracks[i].mode='hidden';
 }

 return <dialog ref={dialog} className="short-film" aria-labelledby={labelId} aria-describedby={descriptionId}
  data-film-id={filmId} data-film-status={status} data-film-replay={replay?'true':'false'}
  onCancel={event=>{event.preventDefault();finish('skip');}}>
  <div className="short-film-shell">
   <header className="short-film-heading">
    <div><span className="short-film-kicker">FINDSG / {film.label}</span><h2 id={labelId}>{film.title}</h2></div>
    <button ref={closeButton} type="button" className="short-film-skip" onClick={()=>finish('skip')}>{replay?'Back to the archive':'Skip film'} <span aria-hidden="true">→</span></button>
   </header>
   <div className="short-film-window">
    <div className="short-film-edge" aria-hidden="true"><span>GOLD UNDER GLASS</span><b>VOL. 01</b></div>
    <div className="short-film-picture">
     <video ref={video} src={assetFor(film.src)} poster={assetFor(film.poster)} muted={muted} playsInline preload={gentleStart?'none':'metadata'}
      aria-label={`${film.title}, story film`} controlsList="nodownload noremoteplayback" disablePictureInPicture
      onLoadedMetadata={metadata} onTimeUpdate={event=>setTime(event.currentTarget.currentTime)}
      onPlaying={()=>{clearWatchdog();if(alive.current){setStatus('playing');setMessage('');}}}
      onPause={()=>{if(alive.current&&!video.current?.ended)setStatus(current=>['error','poster'].includes(current)?current:'paused');}}
      onWaiting={()=>{if(alive.current&&wantsPlay.current){setStatus('loading');watchLoading();}}}
      onEnded={()=>{clearWatchdog();wantsPlay.current=false;setStatus('ended');setTime(video.current?.duration||duration);}}
      onError={()=>{clearWatchdog();wantsPlay.current=false;if(alive.current){setStatus('error');setMessage('The film cannot play right now. Try again, or continue the story.');}}}>
      <track kind="captions" srcLang="en" label="English" src={assetFor(film.track)} onLoad={metadata}/>
     </video>
     {caption&&<div className="short-film-caption" aria-live="off"><span>{caption}</span></div>}
     {(status==='poster'||failed||ended)&&<div className={'short-film-overlay'+(ended?' is-ended':'')}>
      <span>{ended?'FIELD FILM / COMPLETE':failed?'THE STORY CAN CONTINUE':'FIELD FILM / 08 SEC'}</span>
      <strong>{ended?'This scene is complete.':failed?'Could not open the film':film.title}</strong>
      {(message||gentleStart)&&!ended&&<p>{message||(reducedMotion?'Paused on a still frame. Tap to play.':'Autoplay is off. Tap to load the film.')}</p>}
      <button ref={playButton} type="button" className="short-film-overlay-play" onClick={()=>play({restart:true,reload:failed})}>{ended?'Play again':failed?'Try again':'Play film'} <span aria-hidden="true">{ended?'↻':'▶'}</span></button>
     </div>}
     {loading&&<div className="short-film-loading" role="status"><i aria-hidden="true"/> Preparing the picture</div>}
    </div>
    <div className="short-film-edge is-bottom" aria-hidden="true"><span>CONTEMPORARY STORY / MOTION EDITION</span><span>FINDSG</span></div>
   </div>
   <div className="short-film-controls">
    <div className="short-film-timeline"><label className="short-film-sr" htmlFor={seekId}>Film progress</label><input id={seekId} type="range" min="0" max={duration} step="0.05" value={Math.min(time,duration)} onChange={seek} aria-valuetext={`${clock(time)} of ${clock(duration)}`} style={{'--film-progress':`${progress}%`}}/><output htmlFor={seekId}>{clock(time)} <span>/ {clock(duration)}</span></output></div>
    <div className="short-film-buttons">
     <div className="short-film-transport"><button type="button" onClick={togglePlay} aria-label={playing?'Pause film':'Play film'}><span aria-hidden="true">{playing?'Ⅱ':'▶'}</span>{playing?'Pause':'Play'}</button><button type="button" onClick={()=>play({restart:true,reload:failed})} aria-label="Replay the film from the start">↻ <span>Replay</span></button><button type="button" aria-pressed={!muted} onClick={()=>setMuted(value=>!value)}>{muted?'Turn sound on':'Turn sound off'}</button><button type="button" aria-pressed={captions} onClick={()=>setCaptions(value=>!value)}>{captions?'Subtitles on':'Subtitles off'}</button></div>
     <span className="short-film-status" role="status"><i aria-hidden="true"/>{statusLabel}</span>
    </div>
   </div>
   <footer className="short-film-footer"><div><p id={descriptionId}>{film.description}</p><small>Story film · not archival footage{replay?' · replaying does not change your progress':''}</small></div><button type="button" className="short-film-continue" onClick={()=>finish('continue')}>{nextLabel} <span aria-hidden="true">→</span></button></footer>
  </div>
 </dialog>;
}
