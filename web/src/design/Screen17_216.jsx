import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgIconChevL = "/assets/dc14d.svg";
const imgIconWork = "/assets/253df.svg";
const imgIconSpeaker = "/assets/79959.svg";

export default function Screen17_216(props) {
  return wire(
    <div
      className="d76"
      data-node-id="17:216"
      data-name="Onboarding 4 — Singlish check"
    >
      <p className="d11" data-node-id="17:217">
        9:00
      </p>
      <div className="d12" data-node-id="17:218" data-name="Dynamic Island" />
      <div className="d13" data-node-id="17:219" data-name="signal" />
      <div className="d14" data-node-id="17:220" data-name="signal" />
      <div className="d15" data-node-id="17:221" data-name="signal" />
      <div className="d16" data-node-id="17:222" data-name="signal" />
      <div className="d17" data-node-id="17:223" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="17:225" data-name="battery" />
      <div className="d19" data-node-id="17:226" data-name="battery fill" />
      <div className="d20" data-node-id="17:227" data-name="cap" />
      <div className="d274" data-node-id="17:229" data-name="back">
        <div className="d275" data-node-id="17:230" data-name="icon/chevL">
          <img alt="" className="d4" src={imgIconChevL} />
        </div>
      </div>
      <div className="d276" data-node-id="17:232" data-name="progress seg 1" />
      <div className="d277" data-node-id="17:233" data-name="progress seg 2" />
      <div className="d308" data-node-id="17:234" data-name="progress seg 3" />
      <p className="d279" data-node-id="17:235">
        STEP 3 OF 3
      </p>
      <p className="d280" data-node-id="17:236">
        Test your Singlish level
      </p>
      <p className="d309" data-node-id="17:237">
        3 short questions. No pressure — this just sets your starting point.
      </p>
      <p className="d310" data-node-id="17:238">
        Question 1 of 3
      </p>
      <div className="d311" data-node-id="17:239" data-name="q dot 1" />
      <div className="d312" data-node-id="17:240" data-name="q dot 2" />
      <div className="d313" data-node-id="17:241" data-name="q dot 3" />
      <div className="d314" data-node-id="17:242" data-name="Scenario card">
        <div className="d315" data-node-id="17:243" data-name="context chip">
          <div className="d316" data-node-id="17:244" data-name="icon/work">
            <img alt="" className="d4" src={imgIconWork} />
          </div>
          <p className="d317" data-node-id="17:248">
            Office · pantry chat
          </p>
        </div>
        <div className="d44" data-node-id="17:249" data-name="play audio">
          <div className="d45" data-node-id="17:250" data-name="icon/speaker">
            <img alt="" className="d4" src={imgIconSpeaker} />
          </div>
        </div>
        <p className="d318" data-node-id="17:253">
          “Paiseh ah, can help me check this report?”
        </p>
        <p className="d319" data-node-id="17:254">
          What does your colleague mean?
        </p>
      </div>
      <div className="d320" data-node-id="17:255" data-name="Answer A">
        <div className="d321" data-node-id="17:256" data-name="letter">
          <p className="d322" data-node-id="17:257">
            A
          </p>
        </div>
        <p className="d323" data-node-id="17:258">
          Sorry to trouble you — can you help?
        </p>
      </div>
      <div className="d324" data-node-id="17:259" data-name="Answer B">
        <div className="d325" data-node-id="17:260" data-name="letter">
          <p className="d326" data-node-id="17:261">
            B
          </p>
        </div>
        <p className="d327" data-node-id="17:262">
          Hurry up and check it now
        </p>
      </div>
      <div className="d328" data-node-id="17:263" data-name="Answer C">
        <div className="d325" data-node-id="17:264" data-name="letter">
          <p className="d326" data-node-id="17:265">
            C
          </p>
        </div>
        <p
          className="d327"
          data-node-id="17:266"
        >{`I'm embarrassed by your report`}</p>
      </div>
      <p className="d329" data-node-id="17:267">
        Not sure? Skip this one
      </p>
      <div
        className="d306"
        data-node-id="17:268"
        data-name="Button / Check answer"
      >
        <p className="d307" data-node-id="17:269">
          Check answer
        </p>
      </div>
    </div>,
    props,
  );
}
