import React, { useEffect, useRef, useState } from 'react';
import '../race.css';

export const RACE_SEGMENTS = Object.freeze([
  { id: 'straight', name: '直道加速', min: 60, max: 90, cue: '灯光向后掠过。把速度带到目标区间，再确认检查点。', en: 'THE STRAIGHT' },
  { id: 'braking', name: '弯前刹车', min: 30, max: 50, cue: '弯道就在前方。先收住速度，再通过弯前检查点。', en: 'THE CORNER' },
  { id: 'exit', name: '出弯提速', min: 70, max: 100, cue: '最后一段，重新加速。稳定通过检查点，驶向终点。', en: 'THE FINISH' }
]);
const CELEBRATION_MS = 7500;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const copyPassed = (entries) => entries.map((entry) => ({ ...entry, target: { ...entry.target } }));

export function validateRaceSnapshot(value) {
  if (!value || value.version !== 1 || value.mode !== 'step-driving' || value.complete ||
      !Number.isInteger(value.stage) || value.stage < 0 || value.stage > 2 ||
      !Number.isInteger(value.speed) || value.speed < 0 || value.speed > 120 ||
      !Array.isArray(value.attempts) || value.attempts.length !== 3 ||
      !value.attempts.every((n) => Number.isInteger(n) && n >= 0 && n <= 1000000) ||
      !Array.isArray(value.passedSegments) || value.passedSegments.length !== value.stage) return null;
  const passed = [];
  for (let i = 0; i < value.stage; i++) {
    const saved = value.passedSegments[i], segment = RACE_SEGMENTS[i];
    if (!saved || saved.id !== segment.id || !Number.isInteger(saved.speed) || saved.speed < segment.min || saved.speed > segment.max || value.attempts[i] < 1) return null;
    passed.push({ id: segment.id, name: segment.name, speed: saved.speed, target: { min: segment.min, max: segment.max }, attempts: value.attempts[i] });
  }
  return { stage: value.stage, speed: value.speed, attempts: [...value.attempts], passed, replay: Boolean(value.replay) };
}

export function createRaceState({ completed = false, earned = false, snapshot = null } = {}) {
  const done = Boolean(completed || earned), restored = done ? null : validateRaceSnapshot(snapshot);
  return {
    stage: done ? 2 : 0, speed: done ? 70 : 0, attempts: [0, 0, 0], passed: [], replay: false,
    ...restored,
    phase: done ? 'complete' : 'driving', celebrationKey: 0,
    feedback: done ? '挑战已通关。可以重放烟花，或带着线索继续探索。' : restored ? '已回到离开前的赛段。调整速度，继续挑战。' : '先加速到 60–90，再确认第一个检查点。',
    feedbackKind: done ? 'success' : 'neutral'
  };
}

export function raceSnapshot(state) {
  return { version: 1, mode: 'step-driving', stage: state.stage, speed: state.speed, complete: state.phase !== 'driving', replay: state.replay, attempts: [...state.attempts], passedSegments: copyPassed(state.passed) };
}

/** Pure checkpoint rules. Rewards deliberately stay in the user event handler. */
export function applyRaceAction(state, action) {
  if (action === 'replay') return { ...createRaceState(), replay: true, celebrationKey: state.celebrationKey, feedback: '重新体验，从直道开始。再次完赛也不会重复发卡。' };
  if (action === 'celebrate' && state.phase === 'complete') return { ...state, phase: 'celebrating', celebrationKey: state.celebrationKey + 1, feedback: '重温冲线与烟花，不重复领取奖励。', feedbackKind: 'success' };
  if (action === 'settle' && state.phase === 'celebrating') return { ...state, phase: 'complete', feedback: '三段挑战完成。带着加速卡，去寻找下一条线索。', feedbackKind: 'success' };
  if (state.phase !== 'driving') return state;
  const segment = RACE_SEGMENTS[state.stage];
  if (action === 'accelerate' || action === 'brake') {
    const speed = clamp(state.speed + (action === 'accelerate' ? 15 : -20), 0, 120);
    const inRange = speed >= segment.min && speed <= segment.max;
    return { ...state, speed, feedback: speed === state.speed ? `已到${speed === 0 ? '最低' : '最高'}速度。目标是 ${segment.min}–${segment.max}。` : inRange ? `速度 ${speed}，正好在目标区间。确认检查点！` : `速度 ${speed}。${speed < segment.min ? '再加一点速' : '轻踩刹车'}，目标 ${segment.min}–${segment.max}。`, feedbackKind: inRange ? 'ready' : 'neutral' };
  }
  if (action !== 'checkpoint') return state;
  const attempts = [...state.attempts]; attempts[state.stage] += 1;
  if (state.speed < segment.min || state.speed > segment.max) return { ...state, attempts, feedback: `还差一点：当前 ${state.speed}，需要 ${segment.min}–${segment.max}。调整后再试，本段进度保留。`, feedbackKind: 'retry' };
  const passed = [...state.passed, { id: segment.id, name: segment.name, speed: state.speed, target: { min: segment.min, max: segment.max }, attempts: attempts[state.stage] }];
  if (state.stage < 2) {
    const next = RACE_SEGMENTS[state.stage + 1];
    return { ...state, attempts, passed, stage: state.stage + 1, feedback: `${segment.name}通过！现在${next.name}，将速度调整到 ${next.min}–${next.max}。`, feedbackKind: 'success' };
  }
  return { ...state, attempts, passed, phase: 'celebrating', celebrationKey: state.celebrationKey + 1, feedback: '漂亮冲线！三段检查点全部通过。', feedbackKind: 'success' };
}

function useMotionPreference() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const change = () => setReduced(query.matches); change();
    if (query.addEventListener) query.addEventListener('change', change); else query.addListener(change);
    return () => { if (query.removeEventListener) query.removeEventListener('change', change); else query.removeListener(change); };
  }, []);
  return reduced;
}

export default function RaceGame({ completed = false, earned = false, snapshot = null, reducedMotion = false, onProgress, onComplete, onContinue }) {
  const [state, setState] = useState(() => createRaceState({ completed, earned, snapshot }));
  const stateRef = useRef(state), callbacks = useRef({ onProgress, onComplete, onContinue });
  callbacks.current = { onProgress, onComplete, onContinue };
  const rewarded = useRef(Boolean(completed || earned || validateRaceSnapshot(snapshot)?.replay));
  const initialEarned = useRef(Boolean(earned));
  const continued = useRef(false);
  const host = useRef(null), world = useRef(null);
  const [rendererState, setRendererState] = useState('loading');
  const [rendererEngine, setRendererEngine] = useState('pending');
  const [rendererAttempt, setRendererAttempt] = useState(0);
  const [view, setView] = useState(() => completed || earned ? 'podium' : 'chase');
  const [motionPaused, setMotionPaused] = useState(false);
  const systemReduced = useMotionPreference();
  const gentle = Boolean(reducedMotion || systemReduced || motionPaused);
  const sceneState = useRef(null);
  sceneState.current = { stage: state.stage, speed: state.speed, phase: state.phase, celebrationKey: state.celebrationKey, reducedMotion: gentle, view };
  const segment = RACE_SEGMENTS[state.stage];
  const inRange = state.speed >= segment.min && state.speed <= segment.max;
  const finished = state.phase !== 'driving';

  const commit = (next, emit = true) => {
    if (next === stateRef.current) return;
    stateRef.current = next; setState(next);
    if (emit && next.phase === 'driving') callbacks.current.onProgress?.(raceSnapshot(next));
  };

  const act = (action) => {
    const previous = stateRef.current;
    if (action === 'replay') { continued.current = false; setView('chase'); }
    const next = applyRaceAction(previous, action);
    commit(next);
    if (previous.phase !== 'celebrating' && next.phase === 'celebrating') {
      setView('podium');
      // Mobile controls sit below the canvas: bring the finish back into view.
      const bounds = host.current?.getBoundingClientRect();
      const viewportHeight = host.current?.ownerDocument.defaultView?.innerHeight || 0;
      if (bounds && (bounds.top < 40 || bounds.bottom > viewportHeight - 20)) host.current.scrollIntoView({ block: 'center', behavior: gentle ? 'auto' : 'smooth' });
    }
    if (previous.phase === 'driving' && next.phase === 'celebrating' && !rewarded.current) {
      rewarded.current = true;
      callbacks.current.onComplete?.({ segments: 3, mode: 'step-driving', completed: true, replay: false, earned: initialEarned.current, finalSpeed: next.speed, attempts: next.attempts.reduce((sum, n) => sum + n, 0), passedSegments: copyPassed(next.passed), renderer: rendererState === 'ready' ? rendererEngine : 'controls-only', celebration: '3d-grand-prix-finish' });
    }
  };

  useEffect(() => { if (completed || earned) rewarded.current = true; }, [completed, earned]);

  useEffect(() => {
    let live = true;
    let scene = null;
    let importTimer = null;
    const clearImportTimer = () => { if (importTimer !== null) window.clearTimeout(importTimer); importTimer = null; };
    setRendererState('loading');
    const mountScene = (World, engine) => {
      if (!live || !host.current) return;
      scene = new World(host.current, { onFailure: () => { if (live) setRendererState('fallback'); } });
      world.current = scene;
      // Controls remain usable while the module loads; apply the latest render.
      scene.setGameState(sceneState.current);
      setRendererEngine(scene.engine || engine);
      setRendererState('ready');
    };
    // Independent native WebGL keeps 3D available when the external Three.js module is blocked.
    Promise.race([
      import('../three/RaceWorld.js'),
      new Promise((_, reject) => { importTimer = window.setTimeout(() => reject(new Error('Three.js load timed out')), 2200); })
    ]).then(({ default: World }) => {
      clearImportTimer();
      mountScene(World, 'three.js');
    }).catch(() => {
      clearImportTimer();
      scene?.dispose();
      if (world.current === scene) world.current = null;
      scene = null;
      if (!live) return;
      return import('../native/NativeRaceWorld.js').then(({ default: World }) => mountScene(World, 'native-webgl'));
    }).catch(() => {
      clearImportTimer();
      scene?.dispose();
      if (world.current === scene) world.current = null;
      if (live) setRendererState('fallback');
    });
    return () => {
      live = false;
      clearImportTimer();
      scene?.dispose();
      if (world.current === scene) world.current = null;
    };
  }, [rendererAttempt]);

  useEffect(() => {
    world.current?.setGameState(sceneState.current);
  }, [state.stage, state.speed, state.phase, state.celebrationKey, gentle, view, rendererAttempt]);

  useEffect(() => {
    if (state.phase !== 'celebrating') return undefined;
    if (gentle) { commit(applyRaceAction(stateRef.current, 'settle'), false); return undefined; }
    const timer = window.setTimeout(() => commit(applyRaceAction(stateRef.current, 'settle'), false), CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.celebrationKey, gentle]);

  const continueStory = () => {
    if (stateRef.current.phase !== 'complete' || continued.current) return;
    continued.current = true;
    callbacks.current.onContinue?.({ segments: 3, mode: 'step-driving', completed: true, replay: stateRef.current.replay, earned: rewarded.current });
  };
  const keyboard = (event) => {
    if (event.repeat || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === 'ArrowUp') { event.preventDefault(); act('accelerate'); }
    if (event.key === 'ArrowDown') { event.preventDefault(); act('brake'); }
    if ((event.key === ' ' || event.key === 'Enter') && event.target === event.currentTarget) { event.preventDefault(); act('checkpoint'); }
  };

  return <section className={`race3d-game ${finished ? 'race3d-finished' : ''} ${gentle ? 'race3d-reduced' : ''}`} data-renderer={rendererState === 'ready' ? rendererEngine : rendererState} onKeyDown={keyboard} tabIndex={0} aria-label="滨湾夜赛驾驶挑战">
    <header className="race3d-heading">
      <div><span className="race3d-eyebrow">FIND / GRAND PRIX EXPERIENCE</span><h3>滨湾夜赛</h3><p>稳住速度，穿过三道检查点。让城市为你亮起烟花。</p></div>
      <span className="race3d-engine" title={rendererState !== 'ready' ? '三段驾驶规则与进度不受渲染模式影响' : rendererEngine === 'software-3d' ? '基于真实几何与透视相机的 Canvas 软件 3D 兼容渲染' : rendererEngine === 'native-webgl' ? '原生 WebGL 实时三维渲染' : 'Three.js 实时三维渲染'}><i />{rendererState === 'fallback' ? '轻量驾驶模式' : rendererState !== 'ready' ? '3D 场景加载中' : rendererEngine === 'software-3d' ? '兼容 3D' : '实时 3D'}</span>
    </header>

    <ol className="race3d-segments" aria-label="三段挑战进度">
      {RACE_SEGMENTS.map((part, index) => <li key={part.id} className={`${index === state.stage && !finished ? 'race3d-current' : ''} ${index < state.stage || finished ? 'race3d-passed' : ''}`} aria-current={index === state.stage && !finished ? 'step' : undefined}>
        <span className="race3d-segment-index">{index < state.stage || finished ? '✓' : `0${index + 1}`}</span><div><strong>{part.name}</strong><small>{part.min}–{part.max} <span>虚拟速度</span></small></div>
      </li>)}
    </ol>

    <div className={`race3d-stage race3d-${state.phase}`}>
      <div className="race3d-world" ref={host} />
      {rendererState !== 'ready' && <div className="race3d-fallback" role="status"><div className="race3d-fallback-skyline" /><div className="race3d-fallback-message"><strong>{rendererState === 'loading' ? '夜幕拉开，准备发车' : '轻量驾驶模式'}</strong><span>{rendererState === 'loading' ? '正在准备 3D 场景…' : '此设备暂不能显示 3D。按钮和三段挑战仍可正常使用。'}</span>{rendererState === 'fallback' && <button type="button" onClick={() => setRendererAttempt((n) => n + 1)}>重新加载 3D</button>}</div></div>}
      <div className="race3d-vignette" />
      <div className="race3d-scene-top"><div className="race3d-location"><span>MARINA / NIGHT RUN</span><strong>{finished ? 'FINISH LINE' : segment.en}</strong></div><div className="race3d-view-controls"><div className="race3d-camera-switch" role="group" aria-label="选择三维镜头">{[['chase','车后'],['wide','全景'],['podium','领奖']].map(([id,label])=><button key={id} type="button" aria-pressed={view===id} disabled={id==='podium'&&!finished} title={id==='podium'&&!finished?'完成三段后，查看领奖台':`${label}视角`} onClick={()=>setView(id)}>{label}</button>)}</div><button type="button" className="race3d-motion-button" onClick={() => setMotionPaused(!motionPaused)} aria-pressed={motionPaused} disabled={Boolean(reducedMotion || systemReduced)}>{reducedMotion || systemReduced ? '减弱动效' : motionPaused ? '恢复动效' : '暂停动效'}</button></div></div>
      {finished ? <div className="race3d-finish-title" aria-live="polite"><span>{state.phase === 'celebrating' ? 'CHEQUERED FLAG' : 'CHALLENGE COMPLETE'}</span><h4>{state.phase === 'celebrating' ? '漂亮冲线' : '三段，全数通过'}</h4><p>{state.phase === 'celebrating' ? '把这一刻留给烟花。' : '下一段故事，等你开启。'}</p></div> : <div className="race3d-speed-hud"><div className="race3d-speed-number">{state.speed}<span>虚拟速度</span></div><div className="race3d-target"><span>目标区间</span><strong>{segment.min}—{segment.max}</strong><small>{inRange ? '速度就绪 · 可确认' : state.speed < segment.min ? '继续加速' : '需要减速'}</small></div></div>}
      <span className="race3d-scene-caption"><b>{view==='podium'?'领奖台留影':view==='wide'?'全景镜头':'车后镜头'}</b>创作赛道 · 非实际 F1 赛道布局</span>
      {finished && <div className={`race3d-reward-seal ${state.phase === 'celebrating' ? 'race3d-reveal' : ''}`}><span className="race3d-reward-icon">↗︎</span><div><small>FINISHER / 03 OF 03</small><strong>加速卡</strong><span>{completed || earned || state.replay ? '已收藏 · 重温纪念' : '完赛纪念 · 已解锁'}</span></div></div>}
    </div>

    {!finished ? <div className="race3d-controls">
      <div className="race3d-instructions"><span className="race3d-eyebrow">CHECKPOINT 0{state.stage + 1} / 03</span><h4>{segment.name}</h4><p>{segment.cue}</p><div className="race3d-meter" role="meter" aria-label="当前虚拟速度" aria-valuemin={0} aria-valuemax={120} aria-valuenow={state.speed} aria-valuetext={`${state.speed}，目标 ${segment.min} 至 ${segment.max}`}><span className="race3d-meter-target" style={{ left: `${segment.min / 1.2}%`, width: `${(segment.max - segment.min) / 1.2}%` }} /><span className={`race3d-meter-fill ${inRange ? 'race3d-in-range' : ''}`} style={{ width: `${state.speed / 1.2}%` }} /><i style={{ left: `${state.speed / 1.2}%` }} /></div><div className="race3d-meter-labels"><span>0</span><span>目标 {segment.min}–{segment.max}</span><span>120</span></div></div>
      <div className="race3d-driving-buttons"><div className="race3d-pedal-row"><button type="button" className="race3d-brake" onClick={() => act('brake')}><span>−20</span>刹车 <kbd>↓</kbd></button><button type="button" className="race3d-accelerate" onClick={() => act('accelerate')}><span>+15</span>加速 <kbd>↑</kbd></button></div><button type="button" className={`race3d-checkpoint ${inRange ? 'race3d-ready' : ''}`} onClick={() => act('checkpoint')}>确认检查点 <span>→</span></button><small>不用抢时间。速度进入范围后，点击确认。</small></div>
    </div> : <div className="race3d-complete-panel"><div><span className="race3d-eyebrow">YOUR NEXT CHAPTER</span><h4>{state.phase === 'celebrating' ? '为这一圈，停留片刻' : '收下线索，继续向前'}</h4><p>{state.phase === 'celebrating' ? '约八秒的冲线庆祝。随时切换镜头，看看烟花与奖杯。' : '驾驶挑战已完成。可以切换镜头留影，再带着线索继续探索。'}</p>{state.phase==='celebrating'&&<div className="race3d-celebration-progress" key={state.celebrationKey} aria-hidden="true"><i/><span>冲线</span><span>烟花</span><span>领奖</span></div>}</div><div className="race3d-complete-actions"><button type="button" className="race3d-continue" disabled={state.phase !== 'complete'} onClick={continueStory}>{state.phase === 'celebrating' ? '冲线庆祝中…' : '领取线索 / 继续解谜'}<span>→</span></button><div><button type="button" onClick={() => act('celebrate')} disabled={state.phase !== 'complete'}>重放烟花</button><button type="button" onClick={() => act('replay')} disabled={state.phase !== 'complete'}>重玩驾驶</button></div><small>重放或重玩，不会重复发放奖励。</small></div></div>}
    <p className={`race3d-feedback race3d-feedback-${state.feedbackKind}`} role="status" aria-live="polite">{state.feedback}</p>
  </section>;
}
