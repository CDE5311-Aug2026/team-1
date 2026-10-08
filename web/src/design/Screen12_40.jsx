import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgLogo = "/assets/e6904.svg";
const imgLogoSpark = "/assets/e8669.svg";
const imgIconUser = "/assets/c0626.svg";
const imgIconBell = "/assets/3c6b9.svg";
const imgIconUser1 = "/assets/692c0.svg";
const imgIconGlobe = "/assets/156ee.svg";
const imgIconPencil = "/assets/6f4c7.svg";
const imgIconTrash = "/assets/3010a.svg";
const imgIconClock = "/assets/2e53f.svg";
const imgIconCap = "/assets/222a0.svg";
const imgIconSliders = "/assets/ec059.svg";
const imgIconCard = "/assets/c6624.svg";
const imgSwitchOff = "/assets/e1ebf.svg";
const imgIconFlag = "/assets/a8c84.svg";
const imgSwitchOn = "/assets/4028d.svg";
const imgIconLocal = "/assets/b3d87.svg";
const imgIconMic = "/assets/32439.svg";
const imgIconShield = "/assets/54dfe.svg";
const imgToday = "/assets/d2be7.svg";
const imgAsk = "/assets/497ce.svg";
const imgCommunity = "/assets/b6d52.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/08664.svg";

export default function Screen12_40(props) {
  return wire(
    <div
      className="d76"
      data-node-id="12:40"
      data-name="1 My Space — About you"
    >
      <p className="d11" data-node-id="12:41">
        9:00
      </p>
      <div className="d12" data-node-id="12:42" data-name="Dynamic Island" />
      <div className="d13" data-node-id="12:43" data-name="signal" />
      <div className="d14" data-node-id="12:44" data-name="signal" />
      <div className="d15" data-node-id="12:45" data-name="signal" />
      <div className="d16" data-node-id="12:46" data-name="signal" />
      <div className="d17" data-node-id="12:47" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="12:49" data-name="battery" />
      <div className="d19" data-node-id="12:50" data-name="battery fill" />
      <div className="d20" data-node-id="12:51" data-name="cap" />
      <div className="d101" data-node-id="12:52" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d21" data-node-id="12:53" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d102" data-node-id="12:55">
        My Space
      </p>
      <div className="d186" data-node-id="12:181" data-name="Body">
        <div
          className="d187"
          data-node-id="21:1338"
          data-name="Segment / My Space"
        >
          <div
            className="d191"
            data-node-id="21:1339"
            data-name="seg/What it knows (active)"
          >
            <div className="d189" data-node-id="22:1678" data-name="icon/user">
              <img alt="" className="d4" src={imgIconUser} />
            </div>
            <p className="d192" data-node-id="21:1340">
              About you
            </p>
          </div>
          <a className="d188" data-node-id="21:1341" data-name="seg/Notices">
            <div className="d189" data-node-id="22:1681" data-name="icon/bell">
              <img alt="" className="d4" src={imgIconBell} />
            </div>
            <p className="d190" data-node-id="21:1342">
              Notices
            </p>
            <div className="d224" data-node-id="21:1343" data-name="count">
              <p className="d225" data-node-id="21:1344">
                2
              </p>
            </div>
          </a>
        </div>
        <div
          className="d216"
          data-node-id="21:1345"
          data-name="Section / About you"
        >
          <div className="d217" data-node-id="22:1720" data-name="icon/user">
            <img alt="" className="d4" src={imgIconUser1} />
          </div>
          <p className="d218" data-node-id="21:1346">
            What the app knows
          </p>
        </div>
        <div className="d226" data-node-id="21:1347" data-name="Card / Profile">
          <div className="d227" data-node-id="21:1348" data-name="Field / From">
            <div className="d25" data-node-id="22:1698" data-name="icon/globe">
              <img alt="" className="d4" src={imgIconGlobe} />
            </div>
            <div className="d228" data-node-id="21:1349" data-name="text">
              <p className="d229" data-node-id="21:1350">
                <span className="d230">From</span>
                <span className="d231">{`  China`}</span>
              </p>
              <p className="d232" data-node-id="21:1351">
                Used for translations
              </p>
            </div>
            <div
              className="d233"
              data-node-id="21:1352"
              data-name="Button / Edit"
            >
              <div
                className="d217"
                data-node-id="21:1353"
                data-name="icon/pencil"
              >
                <img alt="" className="d4" src={imgIconPencil} />
              </div>
            </div>
            <div
              className="d233"
              data-node-id="21:1355"
              data-name="Button / Delete"
            >
              <div
                className="d217"
                data-node-id="21:1356"
                data-name="icon/trash"
              >
                <img alt="" className="d4" src={imgIconTrash} />
              </div>
            </div>
          </div>
          <div className="d234" data-node-id="21:1358" data-name="divider" />
          <div
            className="d227"
            data-node-id="21:1359"
            data-name="Field / In Singapore"
          >
            <div className="d25" data-node-id="22:1701" data-name="icon/clock">
              <img alt="" className="d4" src={imgIconClock} />
            </div>
            <div className="d228" data-node-id="21:1360" data-name="text">
              <p className="d229" data-node-id="21:1361">
                <span className="d230">In Singapore</span>
                <span className="d231">{`  3 months`}</span>
              </p>
              <p className="d232" data-node-id="21:1362">
                Used for how much context to add
              </p>
            </div>
            <div
              className="d233"
              data-node-id="21:1363"
              data-name="Button / Edit"
            >
              <div
                className="d217"
                data-node-id="21:1364"
                data-name="icon/pencil"
              >
                <img alt="" className="d4" src={imgIconPencil} />
              </div>
            </div>
            <div
              className="d233"
              data-node-id="21:1366"
              data-name="Button / Delete"
            >
              <div
                className="d217"
                data-node-id="21:1367"
                data-name="icon/trash"
              >
                <img alt="" className="d4" src={imgIconTrash} />
              </div>
            </div>
          </div>
          <div className="d234" data-node-id="21:1369" data-name="divider" />
          <div
            className="d227"
            data-node-id="21:1370"
            data-name="Field / Here as"
          >
            <div className="d25" data-node-id="22:1704" data-name="icon/cap">
              <img alt="" className="d4" src={imgIconCap} />
            </div>
            <div className="d228" data-node-id="21:1371" data-name="text">
              <p className="d229" data-node-id="21:1372">
                <span className="d230">Here as</span>
                <span className="d231">{`  Student intern`}</span>
              </p>
              <p className="d232" data-node-id="21:1373">
                Used for picking examples
              </p>
            </div>
            <div
              className="d233"
              data-node-id="21:1374"
              data-name="Button / Edit"
            >
              <div
                className="d217"
                data-node-id="21:1375"
                data-name="icon/pencil"
              >
                <img alt="" className="d4" src={imgIconPencil} />
              </div>
            </div>
            <div
              className="d233"
              data-node-id="21:1377"
              data-name="Button / Delete"
            >
              <div
                className="d217"
                data-node-id="21:1378"
                data-name="icon/trash"
              >
                <img alt="" className="d4" src={imgIconTrash} />
              </div>
            </div>
          </div>
        </div>
        <div
          className="d216"
          data-node-id="21:1380"
          data-name="Section / Switches"
        >
          <div className="d217" data-node-id="22:1723" data-name="icon/sliders">
            <img alt="" className="d4" src={imgIconSliders} />
          </div>
          <p className="d218" data-node-id="21:1381">
            Switches
          </p>
          <div className="d200" data-node-id="21:1382" data-name="spacer" />
          <p className="d219" data-node-id="21:1383">
            All off by default
          </p>
        </div>
        <div
          className="d235"
          data-node-id="21:1384"
          data-name="Card / Switches"
        >
          <div
            className="d236"
            data-node-id="21:1385"
            data-name="Setting / Daily card"
          >
            <div className="d25" data-node-id="22:1707" data-name="icon/card">
              <img alt="" className="d4" src={imgIconCard} />
            </div>
            <div className="d237" data-node-id="21:1386" data-name="text">
              <p className="d238" data-node-id="21:1387">
                Daily card
              </p>
              <p className="d161" data-node-id="21:1388">
                One saved phrase a day
              </p>
            </div>
            <div
              className="d162"
              data-node-id="21:1389"
              data-name="Switch / off"
            >
              <img alt="" className="d4" src={imgSwitchOff} />
            </div>
          </div>
          <div className="d239" data-node-id="21:1391" data-name="divider" />
          <div
            className="d236"
            data-node-id="21:1392"
            data-name="Setting / Flag occasions"
          >
            <div className="d25" data-node-id="22:1710" data-name="icon/flag">
              <img alt="" className="d4" src={imgIconFlag} />
            </div>
            <div className="d237" data-node-id="21:1393" data-name="text">
              <p className="d238" data-node-id="21:1394">
                Flag occasions
              </p>
              <p className="d161" data-node-id="21:1395">
                Reads calendar titles only
              </p>
            </div>
            <div
              className="d162"
              data-node-id="21:1396"
              data-name="Switch / on"
            >
              <img alt="" className="d4" src={imgSwitchOn} />
            </div>
          </div>
          <div className="d239" data-node-id="21:1398" data-name="divider" />
          <div
            className="d236"
            data-node-id="21:1399"
            data-name="Setting / Answer as a local"
          >
            <div className="d25" data-node-id="22:1712" data-name="icon/local">
              <img alt="" className="d4" src={imgIconLocal} />
            </div>
            <div className="d237" data-node-id="21:1400" data-name="text">
              <p className="d238" data-node-id="21:1401">
                Answer as a local
              </p>
              <p className="d161" data-node-id="21:1402">
                Confirm entries for others
              </p>
            </div>
            <div
              className="d162"
              data-node-id="21:1403"
              data-name="Switch / off"
            >
              <img alt="" className="d4" src={imgSwitchOff} />
            </div>
          </div>
          <div className="d239" data-node-id="21:1405" data-name="divider" />
          <div
            className="d236"
            data-node-id="21:1406"
            data-name="Setting / Rehearse with AI"
          >
            <div className="d25" data-node-id="22:1715" data-name="icon/mic">
              <img alt="" className="d4" src={imgIconMic} />
            </div>
            <div className="d237" data-node-id="21:1407" data-name="text">
              <p className="d238" data-node-id="21:1408">
                Rehearse with AI
              </p>
              <p className="d161" data-node-id="21:1409">
                Practice chats, never saved
              </p>
            </div>
            <div
              className="d162"
              data-node-id="21:1410"
              data-name="Switch / off"
            >
              <img alt="" className="d4" src={imgSwitchOff} />
            </div>
          </div>
          <div className="d239" data-node-id="21:1412" data-name="divider" />
          <div
            className="d236"
            data-node-id="21:1413"
            data-name="Setting / No-judgement mode"
          >
            <div className="d25" data-node-id="22:1718" data-name="icon/shield">
              <img alt="" className="d4" src={imgIconShield} />
            </div>
            <div className="d237" data-node-id="21:1414" data-name="text">
              <p className="d238" data-node-id="21:1415">
                No-judgement mode
              </p>
              <p className="d161" data-node-id="21:1416">
                Sources only, no advice
              </p>
            </div>
            <div
              className="d162"
              data-node-id="21:1417"
              data-name="Switch / off"
            >
              <img alt="" className="d4" src={imgSwitchOff} />
            </div>
          </div>
        </div>
      </div>
      <div className="d63" data-node-id="12:155" data-name="Tab bar">
        <div className="d222" data-node-id="12:156" data-name="tab/Today">
          <div className="d65" data-node-id="12:157" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d68" data-node-id="12:159">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="12:160" data-name="tab/Ask">
          <div className="d65" data-node-id="12:161" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="12:163">
            Ask
          </p>
        </div>
        <div className="d69" data-node-id="12:164" data-name="tab/Community">
          <div className="d65" data-node-id="12:165" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d68" data-node-id="12:167">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="12:168" data-name="tab/Moments">
          <div className="d65" data-node-id="12:169" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="12:171">
            Moments
          </p>
        </div>
        <div className="d223" data-node-id="12:172" data-name="tab/My Space">
          <div className="d65" data-node-id="12:173" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d66" data-node-id="12:175">
            My Space
          </p>
        </div>
      </div>
    </div>,
    props,
  );
}
