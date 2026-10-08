import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgLogo = "/assets/e6904.svg";
const imgLogoSpark = "/assets/e8669.svg";
const imgToday = "/assets/d2be7.svg";
const imgAsk = "/assets/497ce.svg";
const imgCommunity = "/assets/f7a97.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/17d00.svg";
const imgSwitchOff = "/assets/e1ebf.svg";
const imgDot = "/assets/4da2b.svg";
const imgChevron = "/assets/f8ec2.svg";
const imgDot1 = "/assets/3a5de.svg";
const imgLock = "/assets/2b15e.svg";
const imgPlus = "/assets/a766d.svg";

export default function Screen3_728(props) {
  return wire(
    <div
      className="d76"
      data-node-id="3:728"
      data-name="Community — My questions"
    >
      <p className="d11" data-node-id="3:729">
        9:00
      </p>
      <div className="d12" data-node-id="3:730" data-name="Dynamic Island" />
      <div className="d13" data-node-id="3:731" data-name="signal" />
      <div className="d14" data-node-id="3:732" data-name="signal" />
      <div className="d15" data-node-id="3:733" data-name="signal" />
      <div className="d16" data-node-id="3:734" data-name="signal" />
      <div className="d17" data-node-id="3:735" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="3:737" data-name="battery" />
      <div className="d19" data-node-id="3:738" data-name="battery fill" />
      <div className="d20" data-node-id="3:739" data-name="cap" />
      <div className="d101" data-node-id="3:740" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d21" data-node-id="3:741" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d102" data-node-id="3:743">
        Community
      </p>
      <div className="d63" data-node-id="3:787" data-name="Tab bar">
        <div className="d222" data-node-id="3:788" data-name="tab/Today">
          <div className="d65" data-node-id="3:789" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d68" data-node-id="3:791">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="3:792" data-name="tab/Ask">
          <div className="d65" data-node-id="3:793" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="3:795">
            Ask
          </p>
        </div>
        <div className="d484" data-node-id="3:796" data-name="tab/Community">
          <div className="d65" data-node-id="3:797" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d66" data-node-id="3:799">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="3:800" data-name="tab/Moments">
          <div className="d65" data-node-id="3:801" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="3:803">
            Moments
          </p>
        </div>
        <div className="d71" data-node-id="3:804" data-name="tab/My Space">
          <div className="d65" data-node-id="3:805" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d68" data-node-id="3:807">
            My Space
          </p>
        </div>
      </div>
      <div className="d485" data-node-id="3:878" data-name="Body">
        <div className="d486" data-node-id="3:879" data-name="Segment / mode">
          <div
            className="d487"
            data-node-id="3:880"
            data-name="seg/My questions (active)"
          >
            <p className="d192" data-node-id="3:881">
              My questions
            </p>
          </div>
          <div
            className="d488"
            data-node-id="3:882"
            data-name="seg/Answer as a local (switch)"
          >
            <p className="d489" data-node-id="3:883">
              Answer as a local
            </p>
            <div className="d162" data-node-id="3:884" data-name="Switch / off">
              <img alt="" className="d4" src={imgSwitchOff} />
            </div>
          </div>
        </div>
        <div className="d490" data-node-id="3:887" data-name="Section header">
          <p className="d491" data-node-id="3:888">
            Your questions
          </p>
          <div className="d492" data-node-id="3:889" data-name="count">
            <p className="d493" data-node-id="3:890">
              2
            </p>
          </div>
        </div>
        <a className="d494" data-node-id="3:891" data-name="Card / Pending">
          <div className="d495" data-node-id="3:892" data-name="content">
            <p className="d496" data-node-id="3:893">
              “sabo” — did my colleague insult me?
            </p>
            <p className="d497" data-node-id="3:894">
              in a Chinese-Singaporean enquiry office
            </p>
            <div className="d498" data-node-id="3:895" data-name="status">
              <div className="d499" data-node-id="3:896" data-name="pill">
                <div className="d198" data-node-id="3:897" data-name="dot">
                  <img alt="" className="d4" src={imgDot} />
                </div>
                <p className="d500" data-node-id="3:898">
                  Pending
                </p>
              </div>
              <p className="d501" data-node-id="3:899">
                2 locals reviewing
              </p>
            </div>
          </div>
          <div className="d502" data-node-id="3:900" data-name="chevron">
            <div className="d503">
              <img alt="" className="d504" src={imgChevron} />
            </div>
          </div>
        </a>
        <div className="d505" data-node-id="3:901" data-name="Card / Answered">
          <div className="d495" data-node-id="3:902" data-name="content">
            <p className="d506" data-node-id="3:903">
              “paiseh to trouble you”
            </p>
            <p className="d507" data-node-id="3:904">
              group chat · classmates
            </p>
            <div className="d498" data-node-id="3:905" data-name="status">
              <div className="d508" data-node-id="3:906" data-name="pill">
                <div className="d198" data-node-id="3:907" data-name="dot">
                  <img alt="" className="d4" src={imgDot1} />
                </div>
                <p className="d509" data-node-id="3:908">
                  Answered
                </p>
              </div>
              <p className="d510" data-node-id="3:909">
                by a local · written into the entry
              </p>
            </div>
          </div>
          <div className="d502" data-node-id="3:910" data-name="chevron">
            <div className="d503">
              <img alt="" className="d504" src={imgChevron} />
            </div>
          </div>
        </div>
        <p className="d511" data-node-id="3:911">
          Nothing else pending — you can ask a local from any entry.
        </p>
      </div>
      <div className="d512" data-node-id="3:912" data-name="Privacy note">
        <div className="d513" data-node-id="3:913" data-name="lock">
          <div className="d514">
            <img alt="" className="d504" src={imgLock} />
          </div>
        </div>
        <p className="d201" data-node-id="3:914">
          Your questions are shown to locals without your name or profile.
        </p>
      </div>
      <div
        className="d515"
        data-node-id="3:915"
        data-name="Button / Ask a local"
      >
        <div className="d476" data-node-id="3:916" data-name="plus">
          <div className="d516">
            <img alt="" className="d504" src={imgPlus} />
          </div>
        </div>
        <p className="d517" data-node-id="3:917">
          Ask a local
        </p>
      </div>
    </div>,
    props,
  );
}
