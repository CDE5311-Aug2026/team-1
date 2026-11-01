import React, {useId, useState} from 'react';
import {assetFor} from '../data.js';
import '../archive-experience.css';

const INITIAL = {alignment:-17, focus:50, light:42};

export default function FilmLab({reducedMotion=false,onContinue}) {
  const id=useId();
  const [settings,setSettings]=useState(INITIAL);
  const [revealed,setRevealed]=useState(false);
  const [showGuide,setShowGuide]=useState(false);
  const aligned=Math.abs(settings.alignment)<=3;
  const focused=Math.abs(settings.focus-72)<=8;
  const exposed=settings.light>=55&&settings.light<=75;
  const ready=aligned&&focused&&exposed;
  const checks=[aligned,focused,exposed];
  const progress=checks.filter(Boolean).length;
  const change=(key,value)=>{setSettings(previous=>({...previous,[key]:Number(value)}));setRevealed(false);};
  const reset=()=>{setSettings({...INITIAL});setRevealed(false);setShowGuide(false);};
  const blur=Math.max(0,Math.abs(settings.focus-72)-4)/13;
  const brightness=.48+settings.light/100;
  const lightHint=settings.light<55?'增加一点灯光':settings.light>75?'降低灯光，保留暗部':'明暗层次已保留';

  return <section className={`film-lab ${revealed?'is-revealed':''} ${reducedMotion?'is-gentle':''}`} aria-labelledby={`${id}-title`}>
    <header className="film-lab-heading"><div><span className="eyebrow">THE PROJECTION ROOM / 03</span><h2 id={`${id}-title`}>让失焦的记忆，重新清晰。</h2><p>对齐胶片、转动焦环、调整灯光。亲手打开放映篇的下一条线索。</p></div><span className="lab-edition">档案练习<b>01</b><small>BALESTIER</small></span></header>
    <div className="lab-layout">
      <div className="lab-stage">
        <div className="lab-screen-meta"><span><i/>片场检视</span><span>{revealed?'CLUE DEVELOPED':`CALIBRATION / ${progress} OF 3`}</span></div>
        <div className="lab-viewfinder" role="img" aria-label={`放映机概念画面。胶片${aligned?'已对齐':'待对齐'}，焦点${focused?'清晰':'待调整'}，灯光${exposed?'合适':'待调整'}。`}>
          <div className="lab-image-carrier" style={{'--frame-shift':`${settings.alignment*1.1}px`,'--focus-blur':`${blur}px`,'--lamp-brightness':brightness}}>
            <img src={assetFor('./assets/cinematic/projector-detail.png')} alt="" draggable="false"/>
            <div className="lab-sprockets left"/><div className="lab-sprockets right"/>
          </div>
          <div className="lab-optical-shade"/>
          <div className={`lab-registration ${aligned?'is-aligned':''}`} aria-hidden="true"><i/><i/><span style={{transform:`translateY(${settings.alignment*1.1}px)`}}/></div>
          <div className="lab-frame-corner top-left"/><div className="lab-frame-corner top-right"/><div className="lab-frame-corner bottom-left"/><div className="lab-frame-corner bottom-right"/>
          <div className="lab-frame-caption"><span>{revealed?'一条新的线索，已回到光里。':ready?'画面准备好了。按下「显影线索」。':'把细节，一点一点找回来。'}</span><small>AI 概念美术 · 剧情道具</small></div>
          {revealed&&<div className="lab-developed-stamp" aria-hidden="true">DEVELOPED<br/><b>已显影</b></div>}
        </div>
        <div className="lab-film-edge" aria-hidden="true"><span>FINDSG — THE LOST CREDIT</span><span>03 / CITY MEMORY</span></div>
        <ol className="lab-checks" aria-label="检视进度">{['胶片对齐','细节清晰','灯光合适'].map((label,i)=><li key={label} className={checks[i]?'done':''}><span>{checks[i]?'✓':`0${i+1}`}</span>{label}</li>)}</ol>
      </div>
      <div className="lab-console">
        <div className="lab-console-title"><span>亲手调整</span><small>THE RESTORER'S DESK</small></div>
        <div className="lab-control"><div><label htmlFor={`${id}-alignment`}>01 <b>胶片对齐</b></label><output htmlFor={`${id}-alignment`}>{settings.alignment>0?'+':''}{settings.alignment}</output></div><input id={`${id}-alignment`} type="range" min="-30" max="30" step="1" value={settings.alignment} onChange={e=>change('alignment',e.target.value)}/><p>{aligned?'✓ 齿孔已归位': '将两侧金色刻线，移到取景框的中央。'}</p></div>
        <div className="lab-control"><div><label htmlFor={`${id}-focus`}>02 <b>转动焦环</b></label><output htmlFor={`${id}-focus`}>{settings.focus}</output></div><input id={`${id}-focus`} type="range" min="0" max="100" step="1" value={settings.focus} onChange={e=>change('focus',e.target.value)}/><p>{focused?'✓ 金属边缘与胶片轮廓已清晰':'慢慢向右转，找到轮廓最清楚的位置。'}</p></div>
        <div className="lab-control"><div><label htmlFor={`${id}-light`}>03 <b>调整灯光</b></label><output htmlFor={`${id}-light`}>{settings.light}</output></div><input id={`${id}-light`} type="range" min="0" max="100" step="1" value={settings.light} onChange={e=>change('light',e.target.value)}/><p>{exposed?'✓ ':''}{lightHint}</p></div>
        <button className="lab-develop button primary" disabled={!ready||revealed} onClick={()=>setRevealed(true)}>{revealed?'✓ 线索已显影':ready?'显影线索':'完成三项调整'}<span aria-hidden="true">↗︎</span></button>
        <div className="lab-secondary"><button onClick={reset}>重新检视 ↻</button><button aria-expanded={showGuide} aria-controls={`${id}-guide`} onClick={()=>setShowGuide(!showGuide)}>{showGuide?'收起提示':'需要一点提示？'}</button></div>
        {showGuide&&<div className="lab-help" id={`${id}-guide`}>将胶片移到 0 附近；焦环转到 72 左右；灯光保持在 55–75。滑块也支持键盘方向键。</div>}
      </div>
    </div>
    <div className="lab-result" aria-live="polite">{revealed?<div className="lab-clue-paper"><span className="eyebrow">A FRAGMENT RECOVERED / 剧情线索</span><h3>“日期还在，名字去了哪里？”</h3><p>你找回的片尾，只留下两页年代。把它们和人物档案并排，找回被遗漏的署名。</p><button className="button bronze" onClick={onContinue}>带着线索，进入年代谜题 <span>↗︎</span></button></div>:<p><span>{progress} / 3</span>{ready?'三个细节已校准，可以显影。':'慢慢来。调整后的画面会留在取景框里。'}</p>}</div>
  </section>;
}
