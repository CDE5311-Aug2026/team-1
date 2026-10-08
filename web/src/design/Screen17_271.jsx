import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgLogo = "/assets/37c2c.svg";
const imgIconClock = "/assets/3b2c7.svg";
const imgIconTarget = "/assets/e1e0c.svg";
const imgIconPin = "/assets/70270.svg";

export default function Screen17_271(props) {
  return wire(
    <div
      className="d76"
      data-node-id="17:271"
      data-name="Onboarding 5 — Your level"
    >
      <p className="d11" data-node-id="17:272">
        9:00
      </p>
      <div className="d12" data-node-id="17:273" data-name="Dynamic Island" />
      <div className="d13" data-node-id="17:274" data-name="signal" />
      <div className="d14" data-node-id="17:275" data-name="signal" />
      <div className="d15" data-node-id="17:276" data-name="signal" />
      <div className="d16" data-node-id="17:277" data-name="signal" />
      <div className="d17" data-node-id="17:278" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="17:280" data-name="battery" />
      <div className="d19" data-node-id="17:281" data-name="battery fill" />
      <div className="d20" data-node-id="17:282" data-name="cap" />
      <div className="d330" data-node-id="17:284" data-name="AI badge">
        <div className="d302" data-node-id="17:285" data-name="logo">
          <img alt="" className="d4" src={imgLogo} />
        </div>
        <p className="d331" data-node-id="17:289">
          IntentAI · Your results
        </p>
      </div>
      <p className="d332" data-node-id="17:290">
        <span className="d333">{`You're `}</span>
        <span className="d334">Intermediate</span>
      </p>
      <p
        className="d335"
        data-node-id="17:291"
      >{`2 of 3 correct — you get the gist. Now let's make it sound natural.`}</p>
      <div className="d336" data-node-id="17:292" data-name="Level card">
        <p className="d337" data-node-id="17:293">
          Your Singlish level
        </p>
        <div className="d338" data-node-id="17:294" data-name="score">
          <p className="d339" data-node-id="17:295">
            2/3
          </p>
        </div>
        <div className="d340" data-node-id="17:296" data-name="level seg 1" />
        <p className="d341" data-node-id="17:297">
          Beginner
        </p>
        <p className="d342" data-node-id="17:298">
          0–1 correct
        </p>
        <div className="d343" data-node-id="17:299" data-name="level seg 2" />
        <p className="d344" data-node-id="17:300">
          Intermediate
        </p>
        <p className="d345" data-node-id="17:301">
          2/3 correct
        </p>
        <div className="d346" data-node-id="17:302" data-name="level seg 3" />
        <p className="d347" data-node-id="17:303">
          Experienced
        </p>
        <p className="d348" data-node-id="17:304">
          3/3 correct
        </p>
      </div>
      <p className="d349" data-node-id="17:305">
        Your personalised plan
      </p>
      <div className="d350" data-node-id="17:306" data-name="Plan card">
        <div className="d351" data-node-id="17:307" data-name="icon tile">
          <div className="d352" data-node-id="17:308" data-name="icon/clock">
            <img alt="" className="d4" src={imgIconClock} />
          </div>
        </div>
        <p className="d353" data-node-id="17:311">
          3 expressions a day
        </p>
        <p className="d354" data-node-id="17:312">
          About 6 minutes, at your own pace
        </p>
        <div className="d355" data-node-id="17:313" data-name="icon tile">
          <div className="d352" data-node-id="17:314" data-name="icon/target">
            <img alt="" className="d4" src={imgIconTarget} />
          </div>
        </div>
        <p className="d356" data-node-id="17:318">{`Focus: Work & Food`}</p>
        <p className="d357" data-node-id="17:319">
          Picked from your interests
        </p>
        <div className="d358" data-node-id="17:320" data-name="divider" />
        <div className="d359" data-node-id="17:321" data-name="icon tile">
          <div className="d352" data-node-id="17:322" data-name="icon/pin">
            <img alt="" className="d4" src={imgIconPin} />
          </div>
        </div>
        <p className="d360" data-node-id="17:325">
          Tuned for 3 months – 1 year
        </p>
        <p className="d361" data-node-id="17:326">
          Everyday phrases first, slang later
        </p>
        <div className="d362" data-node-id="17:327" data-name="divider" />
      </div>
      <div className="d363" data-node-id="17:328" data-name="AI hint">
        <div className="d302" data-node-id="17:329" data-name="logo">
          <img alt="" className="d4" src={imgLogo} />
        </div>
        <div className="d303" data-node-id="17:333" data-name="bubble">
          <p className="d304" data-node-id="17:334">
            IntentAI
          </p>
          <p
            className="d305"
            data-node-id="17:335"
          >{`I'll start with office and hawker phrases, then add more slang as you level up.`}</p>
        </div>
      </div>
      <p className="d329" data-node-id="17:336">
        Retake the quiz
      </p>
      <div
        className="d306"
        data-node-id="17:337"
        data-name="Button / Start learning"
      >
        <p className="d307" data-node-id="17:338">
          Start learning
        </p>
      </div>
    </div>,
    props,
  );
}
