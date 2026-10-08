import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgIconChevL = "/assets/dc14d.svg";
const imgIconPlane = "/assets/0c661.svg";
const imgIconPin = "/assets/60a68.svg";
const imgIconCheck = "/assets/55ee8.svg";
const imgIconHome = "/assets/34807.svg";
const imgLogo = "/assets/37c2c.svg";

export default function Screen17_77(props) {
  return wire(
    <div
      className="d76"
      data-node-id="17:77"
      data-name="Onboarding 2 — Time in Singapore"
    >
      <p className="d11" data-node-id="17:78">
        9:00
      </p>
      <div className="d12" data-node-id="17:79" data-name="Dynamic Island" />
      <div className="d13" data-node-id="17:80" data-name="signal" />
      <div className="d14" data-node-id="17:81" data-name="signal" />
      <div className="d15" data-node-id="17:82" data-name="signal" />
      <div className="d16" data-node-id="17:83" data-name="signal" />
      <div className="d17" data-node-id="17:84" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="17:86" data-name="battery" />
      <div className="d19" data-node-id="17:87" data-name="battery fill" />
      <div className="d20" data-node-id="17:88" data-name="cap" />
      <div className="d274" data-node-id="17:90" data-name="back">
        <div className="d275" data-node-id="17:91" data-name="icon/chevL">
          <img alt="" className="d4" src={imgIconChevL} />
        </div>
      </div>
      <div className="d276" data-node-id="17:93" data-name="progress seg 1" />
      <div className="d384" data-node-id="17:94" data-name="progress seg 2" />
      <div className="d278" data-node-id="17:95" data-name="progress seg 3" />
      <p className="d279" data-node-id="17:96">
        STEP 1 OF 3
      </p>
      <p className="d280" data-node-id="17:97">
        How long have you been in Singapore?
      </p>
      <p
        className="d281"
        data-node-id="17:98"
      >{`We'll pitch your lessons at the right level.`}</p>
      <div
        className="d385"
        data-node-id="17:99"
        data-name="Option / Less than 3 months"
      >
        <div className="d386" data-node-id="17:100" data-name="icon tile">
          <div className="d284" data-node-id="17:101" data-name="icon/plane">
            <img alt="" className="d4" src={imgIconPlane} />
          </div>
        </div>
        <p className="d387" data-node-id="17:103">
          Less than 3 months
        </p>
        <p className="d388" data-node-id="17:104">
          Just landed — start with essentials
        </p>
        <div className="d389" data-node-id="17:105" data-name="radio" />
      </div>
      <div
        className="d390"
        data-node-id="17:106"
        data-name="Option / 3 months – 1 year"
      >
        <div className="d391" data-node-id="17:107" data-name="icon tile">
          <div className="d284" data-node-id="17:108" data-name="icon/pin">
            <img alt="" className="d4" src={imgIconPin} />
          </div>
        </div>
        <p className="d392" data-node-id="17:111">
          3 months – 1 year
        </p>
        <p className="d393" data-node-id="17:112">
          Settling in, picking up phrases
        </p>
        <div className="d394" data-node-id="17:113" data-name="radio">
          <div className="d286" data-node-id="17:114" data-name="icon/check">
            <img alt="" className="d4" src={imgIconCheck} />
          </div>
        </div>
      </div>
      <div
        className="d395"
        data-node-id="17:116"
        data-name="Option / 1 – 3 years"
      >
        <div className="d386" data-node-id="17:117" data-name="icon tile">
          <div className="d284" data-node-id="17:118" data-name="icon/home">
            <img alt="" className="d4" src={imgIconHome} />
          </div>
        </div>
        <p className="d387" data-node-id="17:122">
          1 – 3 years
        </p>
        <p className="d388" data-node-id="17:123">
          Comfortable, want to sound local
        </p>
        <div className="d389" data-node-id="17:124" data-name="radio" />
      </div>
      <div className="d396" data-node-id="17:125" data-name="AI hint">
        <div className="d302" data-node-id="17:126" data-name="logo">
          <img alt="" className="d4" src={imgLogo} />
        </div>
        <div className="d303" data-node-id="17:130" data-name="bubble">
          <p className="d304" data-node-id="17:131">
            IntentAI
          </p>
          <p className="d305" data-node-id="17:132">
            Nice — at this stage most people learn fastest with phrases they
            hear every day.
          </p>
        </div>
      </div>
      <div className="d306" data-node-id="17:133" data-name="Button / Continue">
        <p className="d307" data-node-id="17:134">
          Continue
        </p>
      </div>
    </div>,
    props,
  );
}
