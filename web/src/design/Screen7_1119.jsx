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
const imgChevronLeft = "/assets/4e3f4.svg";
const imgDot = "/assets/4da2b.svg";
const imgM = "/assets/6cde7.svg";
const imgM1 = "/assets/56197.svg";
const imgM2 = "/assets/0f7a7.svg";

export default function Screen7_1119(props) {
  return wire(
    <div
      className="d76"
      data-node-id="7:1119"
      data-name="Community — Question detail (sabo)"
    >
      <p className="d11" data-node-id="7:1120">
        9:00
      </p>
      <div className="d12" data-node-id="7:1121" data-name="Dynamic Island" />
      <div className="d13" data-node-id="7:1122" data-name="signal" />
      <div className="d14" data-node-id="7:1123" data-name="signal" />
      <div className="d15" data-node-id="7:1124" data-name="signal" />
      <div className="d16" data-node-id="7:1125" data-name="signal" />
      <div className="d17" data-node-id="7:1126" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="7:1128" data-name="battery" />
      <div className="d19" data-node-id="7:1129" data-name="battery fill" />
      <div className="d20" data-node-id="7:1130" data-name="cap" />
      <div className="d101" data-node-id="7:1131" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d21" data-node-id="7:1132" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d102" data-node-id="7:1134">
        Community
      </p>
      <div className="d63" data-node-id="7:1135" data-name="Tab bar">
        <div className="d222" data-node-id="7:1136" data-name="tab/Today">
          <div className="d65" data-node-id="7:1137" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d68" data-node-id="7:1139">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="7:1140" data-name="tab/Ask">
          <div className="d65" data-node-id="7:1141" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="7:1143">
            Ask
          </p>
        </div>
        <div className="d484" data-node-id="7:1144" data-name="tab/Community">
          <div className="d65" data-node-id="7:1145" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d66" data-node-id="7:1147">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="7:1148" data-name="tab/Moments">
          <div className="d65" data-node-id="7:1149" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="7:1151">
            Moments
          </p>
        </div>
        <div className="d71" data-node-id="7:1152" data-name="tab/My Space">
          <div className="d65" data-node-id="7:1153" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d68" data-node-id="7:1155">
            My Space
          </p>
        </div>
      </div>
      <div className="d485" data-node-id="7:1156" data-name="Body">
        <div className="d486" data-node-id="7:1157" data-name="Segment / mode">
          <div
            className="d487"
            data-node-id="7:1158"
            data-name="seg/My questions (active)"
          >
            <p className="d192" data-node-id="7:1159">
              My questions
            </p>
          </div>
          <div
            className="d488"
            data-node-id="7:1160"
            data-name="seg/Answer as a local (switch)"
          >
            <p className="d489" data-node-id="7:1161">
              Answer as a local
            </p>
            <div
              className="d162"
              data-node-id="7:1162"
              data-name="Switch / off"
            >
              <img alt="" className="d4" src={imgSwitchOff} />
            </div>
          </div>
        </div>
        <a className="d543" data-node-id="7:1196" data-name="Back row">
          <div className="d502" data-node-id="7:1197" data-name="chevron-left">
            <div className="d503">
              <img alt="" className="d504" src={imgChevronLeft} />
            </div>
          </div>
          <p className="d544" data-node-id="7:1198">
            Your questions
          </p>
          <p className="d545" data-node-id="7:1199">
            · 1 of 2
          </p>
        </a>
        <div
          className="d546"
          data-node-id="7:1200"
          data-name="Card / Pending — expanded"
        >
          <div className="d547" data-node-id="7:1201" data-name="meta">
            <div
              className="d548"
              data-node-id="7:1202"
              data-name="context pill"
            >
              <p className="d549" data-node-id="7:1203">
                🏢
              </p>
              <p className="d550" data-node-id="7:1204">
                Enquiry office · work
              </p>
            </div>
            <div className="d551" data-node-id="7:1205" data-name="pill">
              <div className="d198" data-node-id="7:1206" data-name="dot">
                <img alt="" className="d4" src={imgDot} />
              </div>
              <p className="d535" data-node-id="7:1207">
                Pending
              </p>
            </div>
          </div>
          <div className="d552" data-node-id="7:1208" data-name="headline">
            <div className="d553" data-node-id="7:1209" data-name="word">
              <p className="d554" data-node-id="7:1210">
                Sabo
              </p>
              <p className="d555" data-node-id="7:1211">
                /sah-boh/
              </p>
            </div>
            <p className="d556" data-node-id="7:1212">
              Did my colleague insult me?
            </p>
            <p className="d557" data-node-id="7:1213">
              in a Chinese-Singaporean enquiry office · asked 8:55
            </p>
          </div>
          <div className="d558" data-node-id="7:1214" data-name="What happened">
            <p className="d248" data-node-id="7:1215">
              WHAT YOU WROTE
            </p>
            <div className="d559" data-node-id="7:1216" data-name="quote">
              <p className="d560" data-node-id="7:1217">
                “After the manager gave me extra forms, my colleague laughed and
                said ‘wah, you kena sabo lah.’ Was she being rude to me?”
              </p>
            </div>
          </div>
          <div className="d561" data-node-id="7:1218" data-name="Progress">
            <p className="d248" data-node-id="7:1219">
              PROGRESS
            </p>
            <div className="d562" data-node-id="7:1220" data-name="step / done">
              <div className="d563" data-node-id="7:1222" data-name="m">
                <img alt="" className="d4" src={imgM} />
              </div>
              <div className="d564" data-node-id="7:1223" data-name="text">
                <p className="d160" data-node-id="7:1224">
                  Question sent
                </p>
                <p className="d565" data-node-id="7:1225">
                  8:55 · shared anonymously
                </p>
              </div>
            </div>
            <div className="d562" data-node-id="7:1226" data-name="step / now">
              <div className="d563" data-node-id="7:1228" data-name="m">
                <img alt="" className="d4" src={imgM1} />
              </div>
              <div className="d564" data-node-id="7:1229" data-name="text">
                <p className="d160" data-node-id="7:1230">
                  2 locals reviewing
                </p>
                <p className="d566" data-node-id="7:1231">
                  usually answered within a day
                </p>
              </div>
            </div>
            <div className="d562" data-node-id="7:1232" data-name="step / todo">
              <div className="d563" data-node-id="7:1234" data-name="m">
                <img alt="" className="d4" src={imgM2} />
              </div>
              <div className="d567" data-node-id="7:1235" data-name="text">
                <p className="d568" data-node-id="7:1236">
                  Answer written into the entry
                </p>
                <p className="d569" data-node-id="7:1237">
                  you’ll get a notification
                </p>
              </div>
            </div>
          </div>
          <div className="d570" data-node-id="7:1238" data-name="Reviewers">
            <div className="d571" data-node-id="7:1239" data-name="avatars">
              <div className="d572" data-node-id="7:1240" data-name="avatar">
                <p className="d573" data-node-id="7:1241">
                  M
                </p>
              </div>
              <div className="d574" data-node-id="7:1242" data-name="avatar">
                <p className="d573" data-node-id="7:1243">
                  J
                </p>
              </div>
            </div>
            <p
              className="d575"
              data-node-id="7:1244"
            >{`Locals who speak Hokkien & Singlish are looking at the tone, not just the word.`}</p>
          </div>
          <div className="d576" data-node-id="7:1245" data-name="actions">
            <div
              className="d577"
              data-node-id="7:1246"
              data-name="btn / secondary"
            >
              <p className="d578" data-node-id="7:1247">
                Withdraw
              </p>
            </div>
            <div
              className="d579"
              data-node-id="7:1248"
              data-name="btn / primary"
            >
              <p className="d192" data-node-id="7:1249">
                Add more context
              </p>
            </div>
          </div>
        </div>
        <div className="d580" data-node-id="7:1250" data-name="pager">
          <div className="d581" data-node-id="7:1251" data-name="Rectangle" />
          <div className="d582" data-node-id="7:1252" data-name="Rectangle" />
        </div>
      </div>
    </div>,
    props,
  );
}
