import React from "react";
import { wire } from "./wire";
const imgIconTile = "/assets/fba47.png";
const imgImage5 = "/assets/30adf.png";
const imgWifi = "/assets/892ac.svg";
const imgBell = "/assets/ff8da.svg";
const imgIconFire = "/assets/47397.svg";
const imgIconWave = "/assets/04b85.svg";
const imgIconSunrise = "/assets/1a3fe.svg";
const imgToday = "/assets/d83ae.svg";
const imgAsk = "/assets/497ce.svg";
const imgCommunity = "/assets/b6d52.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/17d00.svg";
const imgIconBowl = "/assets/b1d00.svg";
const imgSpeaker = "/assets/d5357.svg";

export default function Screen1_340(props) {
  return wire(
    <div
      className="d76"
      data-node-id="1:340"
      data-name="Home — Today's three expressions"
    >
      <p className="d11" data-node-id="1:341">
        9:00
      </p>
      <div className="d12" data-node-id="1:342" data-name="Dynamic Island" />
      <div className="d13" data-node-id="1:343" data-name="signal" />
      <div className="d14" data-node-id="1:344" data-name="signal" />
      <div className="d15" data-node-id="1:345" data-name="signal" />
      <div className="d16" data-node-id="1:346" data-name="signal" />
      <div className="d17" data-node-id="1:347" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="1:349" data-name="battery" />
      <div className="d19" data-node-id="1:350" data-name="battery fill" />
      <div className="d20" data-node-id="1:351" data-name="cap" />
      <p className="d22" data-node-id="1:355">
        Good Morning, SY
      </p>
      <div className="d23" data-node-id="1:356" data-name="bell">
        <img alt="" className="d4" src={imgBell} />
      </div>
      <div className="d24" data-node-id="1:360" data-name="streak chip">
        <div className="d25" data-node-id="1:361" data-name="icon/fire">
          <img alt="" className="d4" src={imgIconFire} />
        </div>
        <p className="d26" data-node-id="1:380">
          5
        </p>
      </div>
      <div className="d27" data-node-id="1:381" data-name="icon/wave">
        <img alt="" className="d4" src={imgIconWave} />
      </div>
      <p
        className="d77"
        data-node-id="1:424"
      >{`Today's three expressions, Can or cannot learn?`}</p>
      <div className="d78" data-node-id="1:425" data-name="Progress card">
        <div className="d79" data-node-id="1:426" data-name="icon tile">
          <div className="d3" data-node-id="1:427" data-name="icon/sunrise">
            <img alt="" className="d4" src={imgIconSunrise} />
          </div>
        </div>
        <p className="d80" data-node-id="1:452">
          0 of 3 learned today
        </p>
        <div className="d81" data-node-id="1:453" data-name="progress seg 1" />
        <div className="d82" data-node-id="1:454" data-name="progress seg 2" />
        <div className="d83" data-node-id="1:455" data-name="progress seg 3" />
      </div>
      <div className="d63" data-node-id="1:456" data-name="Tab bar">
        <div className="d64" data-node-id="1:457" data-name="tab/Today">
          <div className="d65" data-node-id="1:458" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d66" data-node-id="1:460">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="1:461" data-name="tab/Ask">
          <div className="d65" data-node-id="1:462" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="1:464">
            Ask
          </p>
        </div>
        <div className="d69" data-node-id="1:465" data-name="tab/Community">
          <div className="d65" data-node-id="1:466" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d68" data-node-id="1:468">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="1:469" data-name="tab/Moments">
          <div className="d65" data-node-id="1:470" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="1:472">
            Moments
          </p>
        </div>
        <div className="d71" data-node-id="1:473" data-name="tab/My Space">
          <div className="d65" data-node-id="1:474" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d68" data-node-id="1:476">
            My Space
          </p>
        </div>
      </div>
      <div
        className="d84"
        data-node-id="1:478"
        data-name="Expression card 1 — Chope"
      >
        <div className="d85" data-node-id="1:479" data-name="icon tile">
          <div aria-hidden className="d86">
            <div
              className="d87"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 100%), linear-gradient(90deg, rgb(255, 243, 234) 0%, rgb(255, 243, 234) 100%)",
              }}
            />
            <img alt="" className="d88" src={imgIconTile} />
          </div>
        </div>
        <p className="d89" data-node-id="1:481">
          01
        </p>
        <div className="d90" data-node-id="1:482" data-name="context chip">
          <div className="d42" data-node-id="1:483" data-name="icon/bowl">
            <img alt="" className="d4" src={imgIconBowl} />
          </div>
          <p className="d43" data-node-id="1:508">
            Hawker centre · lunch
          </p>
        </div>
        <div className="d91" data-node-id="1:509" data-name="play audio">
          <div className="d45" data-node-id="1:510" data-name="speaker">
            <img alt="" className="d4" src={imgSpeaker} />
          </div>
        </div>
        <p className="d92" data-node-id="1:512">
          Chope
        </p>
        <p className="d93" data-node-id="1:513">
          /chohp/
        </p>
        <p className="d94" data-node-id="1:514">
          Save a seat, often with a tissue packet on the table.
        </p>
        <div className="d95" data-node-id="1:515" data-name="Learn (primary)">
          <p className="d96" data-node-id="1:516">
            Next
          </p>
        </div>
      </div>
      <div className="d97" data-node-id="1:517" data-name="progress seg 4" />
      <div className="d98" data-node-id="1:518" data-name="progress seg 5" />
      <div className="d99" data-node-id="1:519" data-name="progress seg 6" />
      <div className="d100" data-node-id="34:21" data-name="image 5">
        <div aria-hidden className="d74">
          <img alt="" className="d75" src={imgImage5} />
          <img alt="" className="d75" src={imgImage5} />
        </div>
      </div>
    </div>,
    props,
  );
}
