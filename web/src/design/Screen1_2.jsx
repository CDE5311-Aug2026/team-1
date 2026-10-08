import React from "react";
import { wire } from "./wire";
const imgImage4 = "/assets/30adf.png";
const imgIconSunrise = "/assets/1a3fe.svg";
const imgWifi = "/assets/892ac.svg";
const imgLogoSpark = "/assets/e8669.svg";
const imgBell = "/assets/ff8da.svg";
const imgIconFire = "/assets/47397.svg";
const imgIconWave = "/assets/04b85.svg";
const imgLiveDot = "/assets/7ceea.svg";
const imgChevron = "/assets/0e67a.svg";
const imgIconChair = "/assets/e58de.svg";
const imgIconBowl = "/assets/b1d00.svg";
const imgSpeaker = "/assets/d5357.svg";
const imgIconThink = "/assets/382cf.svg";
const imgIconWork = "/assets/5048f.svg";
const imgIconGrim = "/assets/c8306.svg";
const imgIconMetro = "/assets/000d5.svg";
const imgToday = "/assets/d83ae.svg";
const imgAsk = "/assets/497ce.svg";
const imgCommunity = "/assets/b6d52.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/17d00.svg";

export default function Screen1_2(props) {
  return wire(
    <div
      className="d0"
      data-node-id="1:2"
      data-name="Home — Today's three expressions"
    >
      <div className="d1" data-node-id="1:87" data-name="Progress card">
        <div className="d2" data-node-id="1:88" data-name="icon tile">
          <div className="d3" data-node-id="1:89" data-name="icon/sunrise">
            <img alt="" className="d4" src={imgIconSunrise} />
          </div>
        </div>
        <p className="d5" data-node-id="1:114">
          0 of 3 learned today
        </p>
        <div className="d6" data-node-id="1:115" data-name="progress seg 1" />
        <div className="d7" data-node-id="1:116" data-name="progress seg 2" />
        <div className="d8" data-node-id="1:117" data-name="progress seg 3" />
        <div className="d9" data-node-id="1:118" data-name="Start button">
          <p className="d10" data-node-id="1:119">
            Start
          </p>
        </div>
      </div>
      <p className="d11" data-node-id="1:3">
        9:00
      </p>
      <div className="d12" data-node-id="1:4" data-name="Dynamic Island" />
      <div className="d13" data-node-id="1:5" data-name="signal" />
      <div className="d14" data-node-id="1:6" data-name="signal" />
      <div className="d15" data-node-id="1:7" data-name="signal" />
      <div className="d16" data-node-id="1:8" data-name="signal" />
      <div className="d17" data-node-id="1:9" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="1:11" data-name="battery" />
      <div className="d19" data-node-id="1:12" data-name="battery fill" />
      <div className="d20" data-node-id="1:13" data-name="cap" />
      <div className="d21" data-node-id="1:15" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d22" data-node-id="1:17">
        Good Morning, SY
      </p>
      <div className="d23" data-node-id="1:18" data-name="bell">
        <img alt="" className="d4" src={imgBell} />
      </div>
      <div className="d24" data-node-id="1:22" data-name="streak chip">
        <div className="d25" data-node-id="1:23" data-name="icon/fire">
          <img alt="" className="d4" src={imgIconFire} />
        </div>
        <p className="d26" data-node-id="1:42">
          5
        </p>
      </div>
      <div className="d27" data-node-id="1:43" data-name="icon/wave">
        <img alt="" className="d4" src={imgIconWave} />
      </div>
      <p
        className="d28"
        data-node-id="1:86"
      >{`Today's three expressions, Can or cannot learn?`}</p>
      <div className="d29" data-node-id="18:1949" data-name="Near you card">
        <div className="d30" data-node-id="18:1950" data-name="icon tile">
          <p className="d31" data-node-id="18:1951">
            📍
          </p>
        </div>
        <div className="d32" data-node-id="18:1952" data-name="live dot">
          <img alt="" className="d4" src={imgLiveDot} />
        </div>
        <p className="d33" data-node-id="18:1953">
          Near you
        </p>
        <p className="d34" data-node-id="18:1954">
          · Old Airport Rd Food Centre
        </p>
        <p className="d35" data-node-id="18:1955">
          3 phrases you might hear here
        </p>
        <div className="d36" data-node-id="18:1956" data-name="chevron">
          <img alt="" className="d4" src={imgChevron} />
        </div>
      </div>
      <div
        className="d37"
        data-node-id="1:120"
        data-name="Expression card 1 — Chope"
      >
        <div className="d38" data-node-id="1:121" data-name="icon tile">
          <div className="d39" data-node-id="1:122" data-name="icon/chair">
            <img alt="" className="d4" src={imgIconChair} />
          </div>
        </div>
        <p className="d40" data-node-id="1:149">
          01
        </p>
        <div className="d41" data-node-id="1:150" data-name="context chip">
          <div className="d42" data-node-id="1:151" data-name="icon/bowl">
            <img alt="" className="d4" src={imgIconBowl} />
          </div>
          <p className="d43" data-node-id="1:176">
            Hawker centre · lunch
          </p>
        </div>
        <div className="d44" data-node-id="1:177" data-name="play audio">
          <div className="d45" data-node-id="1:178" data-name="speaker">
            <img alt="" className="d4" src={imgSpeaker} />
          </div>
        </div>
        <p className="d46" data-node-id="1:180">
          Chope
        </p>
        <p className="d47" data-node-id="1:181">
          /chohp/
        </p>
        <p className="d48" data-node-id="1:182">
          Save a seat, often with a tissue packet on the table.
        </p>
        <div className="d49" data-node-id="1:183" data-name="Learn (primary)">
          <p className="d50" data-node-id="1:184">
            Detail
          </p>
        </div>
      </div>
      <div
        className="d51"
        data-node-id="1:185"
        data-name="Expression card 2 — Can or not?"
      >
        <div className="d52" data-node-id="1:186" data-name="icon tile">
          <div className="d39" data-node-id="1:187" data-name="icon/think">
            <img alt="" className="d4" src={imgIconThink} />
          </div>
        </div>
        <p className="d53" data-node-id="1:215">
          02
        </p>
        <div className="d54" data-node-id="1:216" data-name="context chip">
          <div className="d42" data-node-id="29:346" data-name="icon/work">
            <img alt="" className="d4" src={imgIconWork} />
          </div>
          <p className="d43" data-node-id="1:244">
            Team chat · work
          </p>
        </div>
        <div className="d55" data-node-id="1:245" data-name="play audio">
          <div className="d45" data-node-id="1:246" data-name="speaker">
            <img alt="" className="d4" src={imgSpeaker} />
          </div>
        </div>
        <p className="d56" data-node-id="1:248">
          Can or not?
        </p>
        <p className="d57" data-node-id="1:249">
          Is it possible or OK? Reply “Can!” or “Cannot lah.”
        </p>
        <div className="d58" data-node-id="1:250" data-name="Learn">
          <p className="d59" data-node-id="1:251">
            Detail
          </p>
        </div>
      </div>
      <div
        className="d60"
        data-node-id="1:252"
        data-name="Expression card 3 — Paiseh"
      >
        <div className="d52" data-node-id="1:253" data-name="icon tile">
          <div className="d39" data-node-id="1:254" data-name="icon/grim">
            <img alt="" className="d4" src={imgIconGrim} />
          </div>
        </div>
        <p className="d53" data-node-id="1:274">
          03
        </p>
        <div className="d61" data-node-id="1:275" data-name="context chip">
          <div className="d42" data-node-id="1:276" data-name="icon/metro">
            <img alt="" className="d4" src={imgIconMetro} />
          </div>
          <p className="d43" data-node-id="1:308">
            MRT · crowded train
          </p>
        </div>
        <div className="d55" data-node-id="1:309" data-name="play audio">
          <div className="d45" data-node-id="1:310" data-name="speaker">
            <img alt="" className="d4" src={imgSpeaker} />
          </div>
        </div>
        <p className="d56" data-node-id="1:312">
          Paiseh
        </p>
        <p className="d62" data-node-id="1:313">
          /pie-seh/
        </p>
        <p className="d57" data-node-id="1:314">
          Sorry or embarrassed — a soft, polite apology.
        </p>
        <div className="d58" data-node-id="1:315" data-name="Learn">
          <p className="d59" data-node-id="1:316">
            Detail
          </p>
        </div>
      </div>
      <div className="d63" data-node-id="1:317" data-name="Tab bar">
        <div className="d64" data-node-id="1:318" data-name="tab/Today">
          <div className="d65" data-node-id="1:319" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d66" data-node-id="1:321">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="1:322" data-name="tab/Ask">
          <div className="d65" data-node-id="1:323" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="1:325">
            Ask
          </p>
        </div>
        <div className="d69" data-node-id="1:326" data-name="tab/Community">
          <div className="d65" data-node-id="1:327" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d68" data-node-id="1:329">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="1:330" data-name="tab/Moments">
          <div className="d65" data-node-id="1:331" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="1:333">
            Moments
          </p>
        </div>
        <div className="d71" data-node-id="1:334" data-name="tab/My Space">
          <div className="d65" data-node-id="1:335" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d68" data-node-id="1:337">
            My Space
          </p>
        </div>
      </div>
      <div className="d72" data-node-id="1:338" data-name="Home indicator" />
      <div className="d73" data-node-id="34:19" data-name="image 4">
        <div aria-hidden className="d74">
          <img alt="" className="d75" src={imgImage4} />
          <img alt="" className="d75" src={imgImage4} />
        </div>
      </div>
    </div>,
    props,
  );
}
