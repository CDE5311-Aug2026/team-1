#!/usr/bin/env python3
"""The Hunt's night race (f1.html): phone pedals that drive like pedals, and a camera button.

usage: earth_online_f1_touch.py <f1.html>     patches a built f1.html in place (earth-online-lite.py also calls patch()).

The F1 drive's touch pedals were two on/off buttons. Each held its own finger, so a thumb sliding from throttle to brake
kept the throttle pressed and the brake never came on. A touch was always a full stamp on the pedal, and a held throttle
kept pushing against the brake. Now (owner, 2 Nov 2026: "the brake does not respond, or not like a real brake"):
  - the two pedals are one box under the right thumb: the pedal under the finger is the one pressed, so the thumb slides
    from one to the other;
  - how far down the pedal the thumb sits sets the pressure (top light, bottom full); a press comes on at once and builds
    to that pressure in about a tenth of a second, and lets go as fast; the pedal fills to show it;
  - a touch brake press cuts the touch throttle; the brake is gentle near the top of the pedal and strong at the bottom;
  - holding the brake after stopping keeps the car stopped (it used to back away); release and press again to reverse;
  - a round camera button above LOOK cycles cockpit, T-cam and chase.
Every replacement is asserted (exactly one match); a page already patched is left as it is.
"""
import sys

MARK = '[intentai/f1touch]'


def patch(h):
    if MARK in h:
        return h

    def rep(old, new):
        nonlocal h
        n = h.count(old)
        assert n == 1, f'f1 touch: expected 1 x {old[:80]!r}, found {n}'
        h = h.replace(old, new)

    # the smoothed touch pedals: on at once (0.3), up to the thumb's pressure in ~0.1 s, off in ~0.1 s
    rep('const KPED = {thr:0, brk:0};',
        'const KPED = {thr:0, brk:0};\n'
        f'// {MARK} touch pedals: the box under the thumb sets a target (TOUCH.thr / brk); the pedal follows it quickly\n'
        'const TP = {thr:0, brk:0};\n'
        'function touchPedals(dt){\n'
        '  for (const k of [\'thr\', \'brk\']){ const t = TOUCH[k] || 0, v = TP[k];\n'
        '    TP[k] = t > v ? Math.min(t, Math.max(v, 0.3) + (k === \'brk\' ? 7 : 5)*dt) : Math.max(t, v - 10*dt); }\n'
        '  return TP;\n'
        '}')
    rep('  thr = Math.max(thr, TOUCH.thr); brk = Math.max(brk, TOUCH.brk); if (Math.abs(TOUCH.steer) > Math.abs(st)) st = TOUCH.steer;',
        '  { const tp = touchPedals(dt); thr = Math.max(thr, tp.brk > 0.02 ? 0 : tp.thr); brk = Math.max(brk, tp.brk); }   // a touch brake cuts the touch throttle\n'
        '  if (Math.abs(TOUCH.steer) > Math.abs(st)) st = TOUCH.steer;')

    # one pedal box: the pedal under the finger, pressure by depth
    rep("  for (const [el, k] of [[HUD.q.brkP, 'brk'], [HUD.q.thrP, 'thr']]){\n"
        "    el.addEventListener('pointerdown', e => { try { el.setPointerCapture(e.pointerId); } catch (_){ } TOUCH[k] = 1; TOUCH.used = true; el.classList.add('on'); e.preventDefault(); });\n"
        "    const up = () => { TOUCH[k] = 0; el.classList.remove('on'); }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up); }",
        f"  // {MARK} the pedals are one box under the right thumb: the pedal nearest the finger is pressed (a thumb slides from one\n"
        "  // to the other), harder the lower the finger sits on it; a finger that leaves the box lifts off\n"
        "  { const box = h.querySelector('.f1pedals'), P = new Map(), peds = [[HUD.q.brkP, 'brk'], [HUD.q.thrP, 'thr']];\n"
        "    const at = e => { const a = HUD.q.brkP.getBoundingClientRect(), b = HUD.q.thrP.getBoundingClientRect();\n"
        "      if (e.clientX < a.left - 24 || e.clientX > b.right + 24 || e.clientY < Math.min(a.top, b.top) - 70 || e.clientY > Math.max(a.bottom, b.bottom) + 30) return null;\n"
        "      const r = e.clientX < (a.right + b.left)/2 ? a : b, k = r === a ? 'brk' : 'thr';\n"
        "      const d = clamp((e.clientY - r.top)/r.height, 0, 1); return [k, k === 'brk' ? 0.2 + 0.8*Math.pow(d, 1.4) : 0.4 + 0.6*d]; };\n"
        "    const sum = () => { const o = {thr:0, brk:0}; for (const p of P.values()) if (p) o[p[0]] = Math.max(o[p[0]], p[1]);\n"
        "      if (o.brk > 0 && !TOUCH.brk && navigator.vibrate) try { navigator.vibrate(8); } catch (_){ }\n"
        "      TOUCH.thr = o.thr; TOUCH.brk = o.brk; for (const [el, k] of peds) el.classList.toggle('on', o[k] > 0); };\n"
        "    box.addEventListener('pointerdown', e => { try { box.setPointerCapture(e.pointerId); } catch (_){ } TOUCH.used = true; P.set(e.pointerId, at(e)); sum(); e.preventDefault(); });\n"
        "    box.addEventListener('pointermove', e => { if (P.has(e.pointerId)){ P.set(e.pointerId, at(e)); sum(); } });\n"
        "    const up = e => { if (P.delete(e.pointerId)) sum(); };\n"
        "    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up); box.addEventListener('lostpointercapture', up); }\n"
        "  // the camera button: cockpit, T-cam, chase\n"
        "  { const ORD = [0, 1, 2], NAME = ['Cockpit', 'T-cam', 'Chase'];\n"
        "    h.querySelector('#f1CamT').addEventListener('click', () => { const k = (ORD.indexOf(F1.cam) + 1) % ORD.length; dcSetCam(ORD[k]); flash(NAME[k], 0.9); }); }")

    # holding the brake after stopping keeps the car stopped (it had backed away after 0.35 s); release and press again for
    # reverse, as the road cars already did
    rep('  if (rc){ if (I.brk > 0.5 && su > 0.6 && !C.rev) C.brkHold = true; else if (I.brk < 0.1) C.brkHold = false; }\n'
        '  if (!C.rev && !(rc && C.brkHold) && I.brk > 0.5',
        '  if (I.brk > 0.5 && su > 0.6 && !C.rev) C.brkHold = true; else if (I.brk < 0.1) C.brkHold = false;   // ' + MARK + ' every car\n'
        '  if (!C.rev && !C.brkHold && I.brk > 0.5')

    # the pedals fill to the pressure they are pressed with
    rep("q.brkP.classList.toggle('on', TOUCH.brk > 0); q.thrP.classList.toggle('on', TOUCH.thr > 0);",
        "{ const b = Math.round(TP.brk*20)/20, t = Math.round(TP.thr*20)/20; if (HUD.last.pb !== b){ HUD.last.pb = b; q.brkP.style.setProperty('--p', b); } if (HUD.last.pt !== t){ HUD.last.pt = t; q.thrP.style.setProperty('--p', t); } }")
    rep('TOUCH.steer = TOUCH.thr = TOUCH.brk = 0;', 'TOUCH.steer = TOUCH.thr = TOUCH.brk = 0; TP.thr = TP.brk = 0;')

    # markup: the camera button above LOOK
    rep('<div class="f1touch" id="f1Touch"><button class="f1lbT"',
        '<div class="f1touch" id="f1Touch"><button class="f1camT" id="f1CamT" type="button" aria-label="Camera view">'
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        '<path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg></button><button class="f1lbT"')
    # the pedals: same height, side by side, a fill for the pressure, a camera button over LOOK
    rep('.f1pedal.on{filter:brightness(1.45)}',
        '.f1pedal.on{filter:brightness(1.45)}\n'
        '.f1pedals{gap:8px}.f1pedals .f1pedal.brk{width:80px;height:128px}.f1pedals .f1pedal.thr{width:84px;height:128px}\n'
        '.f1pedals .f1pedal{background-image:linear-gradient(to top,rgba(255,255,255,.34) calc(var(--p,0)*100%),transparent calc(var(--p,0)*100%));user-select:none;-webkit-user-select:none}\n'
        '.f1camT{position:absolute;right:22px;bottom:calc(232px + env(safe-area-inset-bottom,0px));width:56px;height:56px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(12,17,20,.62);color:#fff;display:grid;place-items:center;touch-action:manipulation;cursor:pointer}\n'
        '.f1camT svg{width:24px;height:24px}.f1camT:active{background:rgba(255,255,255,.22)}')
    return h


if __name__ == '__main__':
    path = sys.argv[1]
    page = open(path, encoding='utf-8').read()
    out = patch(page)
    if out == page:
        print('already patched')
    else:
        open(path, 'w', encoding='utf-8').write(out)
        print('patched', path)
