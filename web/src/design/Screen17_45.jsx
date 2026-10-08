import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgGlow = "/assets/57142.svg";
const imgLogo = "/assets/621d1.svg";

export default function Screen17_45(props) {
  return wire(
    <div
      className="d76"
      data-node-id="17:45"
      data-name="Onboarding 1 — Welcome"
    >
      <p className="d11" data-node-id="17:46">
        9:00
      </p>
      <div className="d12" data-node-id="17:47" data-name="Dynamic Island" />
      <div className="d13" data-node-id="17:48" data-name="signal" />
      <div className="d14" data-node-id="17:49" data-name="signal" />
      <div className="d15" data-node-id="17:50" data-name="signal" />
      <div className="d16" data-node-id="17:51" data-name="signal" />
      <div className="d17" data-node-id="17:52" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="17:54" data-name="battery" />
      <div className="d19" data-node-id="17:55" data-name="battery fill" />
      <div className="d20" data-node-id="17:56" data-name="cap" />
      <div className="d364" data-node-id="17:58" data-name="glow">
        <img alt="" className="d4" src={imgGlow} />
      </div>
      <div className="d365" data-node-id="17:59" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d366" data-node-id="17:63">
        <div className="d367">
          <div className="d368" data-name="phrase pill / Chope">
            <p className="d369" data-node-id="17:64">
              Chope
            </p>
          </div>
        </div>
      </div>
      <div className="d370" data-node-id="17:65">
        <div className="d371">
          <div className="d372" data-name="phrase pill / Can or not?">
            <p className="d369" data-node-id="17:66">
              Can or not?
            </p>
          </div>
        </div>
      </div>
      <div className="d373" data-node-id="17:67">
        <div className="d374">
          <div className="d375" data-name="phrase pill / Paiseh">
            <p className="d369" data-node-id="17:68">
              Paiseh
            </p>
          </div>
        </div>
      </div>
      <div className="d376" data-node-id="17:69">
        <div className="d377">
          <div className="d378" data-name="phrase pill / Shiok!">
            <p className="d369" data-node-id="17:70">
              Shiok!
            </p>
          </div>
        </div>
      </div>
      <div className="d379" data-node-id="17:71">
        <p className="d380">Hello, SY!</p>
        <p className="d381">Welcome to IntentAI</p>
      </div>
      <p
        className="d382"
        data-node-id="17:72"
      >{`Learn the Singlish locals really use — tailored to how long you've been here and what you do every day.`}</p>
      <div
        className="d383"
        data-node-id="17:73"
        data-name="Button / Get started"
      >
        <p className="d307" data-node-id="17:74">
          Get started
        </p>
      </div>
    </div>,
    props,
  );
}
