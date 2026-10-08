import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgIconChevL = "/assets/dc14d.svg";
const imgIconWork = "/assets/b61b5.svg";
const imgIconCheck = "/assets/55ee8.svg";
const imgIconBowl = "/assets/c5c02.svg";
const imgIconSun = "/assets/cade7.svg";
const imgIconTrain = "/assets/e5762.svg";
const imgLogo = "/assets/37c2c.svg";

export default function Screen17_136(props) {
  return wire(
    <div
      className="d76"
      data-node-id="17:136"
      data-name="Onboarding 3 — Topics"
    >
      <p className="d11" data-node-id="17:137">
        9:00
      </p>
      <div className="d12" data-node-id="17:138" data-name="Dynamic Island" />
      <div className="d13" data-node-id="17:139" data-name="signal" />
      <div className="d14" data-node-id="17:140" data-name="signal" />
      <div className="d15" data-node-id="17:141" data-name="signal" />
      <div className="d16" data-node-id="17:142" data-name="signal" />
      <div className="d17" data-node-id="17:143" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="17:145" data-name="battery" />
      <div className="d19" data-node-id="17:146" data-name="battery fill" />
      <div className="d20" data-node-id="17:147" data-name="cap" />
      <div className="d274" data-node-id="17:149" data-name="back">
        <div className="d275" data-node-id="17:150" data-name="icon/chevL">
          <img alt="" className="d4" src={imgIconChevL} />
        </div>
      </div>
      <div className="d276" data-node-id="17:152" data-name="progress seg 1" />
      <div className="d277" data-node-id="17:153" data-name="progress seg 2" />
      <div className="d278" data-node-id="17:154" data-name="progress seg 3" />
      <p className="d279" data-node-id="17:155">
        STEP 2 OF 3
      </p>
      <p className="d280" data-node-id="17:156">
        What do you want to learn first?
      </p>
      <p
        className="d281"
        data-node-id="17:157"
      >{`Pick all that apply — we'll build your daily three around them.`}</p>
      <div className="d282" data-node-id="17:158" data-name="Topic / Work">
        <div className="d283" data-node-id="17:159" data-name="icon tile">
          <div className="d284" data-node-id="17:160" data-name="icon/work">
            <img alt="" className="d4" src={imgIconWork} />
          </div>
        </div>
        <div className="d285" data-node-id="17:164" data-name="checkbox">
          <div className="d286" data-node-id="17:165" data-name="icon/check">
            <img alt="" className="d4" src={imgIconCheck} />
          </div>
        </div>
        <p className="d287" data-node-id="17:167">
          Work
        </p>
        <p
          className="d288"
          data-node-id="17:168"
        >{`Meetings, emails & office chat`}</p>
        <div className="d289" data-node-id="17:169" data-name="example chip">
          <p className="d290" data-node-id="17:170">
            “Can or not?”
          </p>
        </div>
      </div>
      <div className="d291" data-node-id="17:171" data-name="Topic / Food">
        <div className="d283" data-node-id="17:172" data-name="icon tile">
          <div className="d284" data-node-id="17:173" data-name="icon/bowl">
            <img alt="" className="d4" src={imgIconBowl} />
          </div>
        </div>
        <div className="d285" data-node-id="17:176" data-name="checkbox">
          <div className="d286" data-node-id="17:177" data-name="icon/check">
            <img alt="" className="d4" src={imgIconCheck} />
          </div>
        </div>
        <p className="d287" data-node-id="17:179">
          Food
        </p>
        <p
          className="d288"
          data-node-id="17:180"
        >{`Hawker orders & makan plans`}</p>
        <div className="d292" data-node-id="17:181" data-name="example chip">
          <p className="d290" data-node-id="17:182">
            “Mee siam, tapau”
          </p>
        </div>
      </div>
      <div
        className="d293"
        data-node-id="17:183"
        data-name="Topic / Daily life"
      >
        <div className="d294" data-node-id="17:184" data-name="icon tile">
          <div className="d284" data-node-id="17:185" data-name="icon/sun">
            <img alt="" className="d4" src={imgIconSun} />
          </div>
        </div>
        <div className="d295" data-node-id="17:188" data-name="checkbox" />
        <p className="d296" data-node-id="17:189">
          Daily life
        </p>
        <p
          className="d297"
          data-node-id="17:190"
        >{`Neighbours, shops & errands`}</p>
        <div className="d298" data-node-id="17:191" data-name="example chip">
          <p className="d290" data-node-id="17:192">
            “Chope a seat”
          </p>
        </div>
      </div>
      <div
        className="d299"
        data-node-id="17:193"
        data-name="Topic / Getting around"
      >
        <div className="d294" data-node-id="17:194" data-name="icon tile">
          <div className="d284" data-node-id="17:195" data-name="icon/train">
            <img alt="" className="d4" src={imgIconTrain} />
          </div>
        </div>
        <div className="d295" data-node-id="17:200" data-name="checkbox" />
        <p className="d296" data-node-id="17:201">
          Getting around
        </p>
        <p
          className="d297"
          data-node-id="17:202"
        >{`MRT, buses & Grab rides`}</p>
        <div className="d300" data-node-id="17:203" data-name="example chip">
          <p className="d290" data-node-id="17:204">
            “Paiseh, excuse me”
          </p>
        </div>
      </div>
      <div className="d301" data-node-id="17:205" data-name="AI hint">
        <div className="d302" data-node-id="17:206" data-name="logo">
          <img alt="" className="d4" src={imgLogo} />
        </div>
        <div className="d303" data-node-id="17:210" data-name="bubble">
          <p className="d304" data-node-id="17:211">
            IntentAI
          </p>
          <p
            className="d305"
            data-node-id="17:212"
          >{`Since you've been here under a year, I'll start with Work and Food basics.`}</p>
        </div>
      </div>
      <div
        className="d306"
        data-node-id="17:213"
        data-name="Button / Continue · 2 selected"
      >
        <p className="d307" data-node-id="17:214">
          Continue · 2 selected
        </p>
      </div>
    </div>,
    props,
  );
}
