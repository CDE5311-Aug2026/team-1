import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgLogo = "/assets/e6904.svg";
const imgLogoSpark = "/assets/e8669.svg";
const imgIconUser = "/assets/13c6f.svg";
const imgIconBell = "/assets/f06fe.svg";
const imgDot = "/assets/9a8ba.svg";
const imgButtonDismiss = "/assets/560b3.svg";
const imgIconChev = "/assets/ec0d8.svg";
const imgIconLock = "/assets/270aa.svg";
const imgIconTrash = "/assets/29a7c.svg";
const imgToday = "/assets/d2be7.svg";
const imgAsk = "/assets/497ce.svg";
const imgCommunity = "/assets/b6d52.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/08664.svg";
const imgIconCheck = "/assets/8b978.svg";

export default function Screen14_730(props) {
  return wire(
    <div
      className="d76"
      data-node-id="14:730"
      data-name="5 AI output — Confirmed"
    >
      <p className="d11" data-node-id="14:731">
        9:00
      </p>
      <div className="d12" data-node-id="14:732" data-name="Dynamic Island" />
      <div className="d13" data-node-id="14:733" data-name="signal" />
      <div className="d14" data-node-id="14:734" data-name="signal" />
      <div className="d15" data-node-id="14:735" data-name="signal" />
      <div className="d16" data-node-id="14:736" data-name="signal" />
      <div className="d17" data-node-id="14:737" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="14:739" data-name="battery" />
      <div className="d19" data-node-id="14:740" data-name="battery fill" />
      <div className="d20" data-node-id="14:741" data-name="cap" />
      <div className="d101" data-node-id="14:742" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d21" data-node-id="14:743" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d102" data-node-id="14:745">
        My Space
      </p>
      <div className="d186" data-node-id="14:746" data-name="Body">
        <div
          className="d187"
          data-node-id="21:1466"
          data-name="Segment / My Space"
        >
          <a
            className="d188"
            data-node-id="21:1467"
            data-name="seg/What it knows"
          >
            <div className="d189" data-node-id="22:1688" data-name="icon/user">
              <img alt="" className="d4" src={imgIconUser} />
            </div>
            <p className="d190" data-node-id="21:1468">
              About you
            </p>
          </a>
          <div
            className="d191"
            data-node-id="21:1469"
            data-name="seg/Notices (active)"
          >
            <div className="d189" data-node-id="22:1691" data-name="icon/bell">
              <img alt="" className="d4" src={imgIconBell} />
            </div>
            <p className="d192" data-node-id="21:1470">
              Notices
            </p>
            <div className="d193" data-node-id="21:1471" data-name="count">
              <p className="d194" data-node-id="21:1472">
                1
              </p>
            </div>
          </div>
        </div>
        <div
          className="d195"
          data-node-id="21:1473"
          data-name="Notice / Local fix"
        >
          <div className="d196" data-node-id="21:1477" data-name="header">
            <div
              className="d197"
              data-node-id="21:1474"
              data-name="Chip / Local fix"
            >
              <div className="d198" data-node-id="21:1475" data-name="dot">
                <img alt="" className="d4" src={imgDot} />
              </div>
              <p className="d199" data-node-id="21:1476">
                Local fix
              </p>
            </div>
            <div className="d200" data-node-id="21:1478" data-name="spacer" />
            <p className="d201" data-node-id="21:1479">
              2h
            </p>
            <div
              className="d42"
              data-node-id="21:1480"
              data-name="Button / Dismiss"
            >
              <img alt="" className="d4" src={imgButtonDismiss} />
            </div>
          </div>
          <div className="d202" data-node-id="21:1482" data-name="text">
            <p className="d203" data-node-id="21:1483">
              A local updated “chope”
            </p>
            <p className="d204" data-node-id="21:1484">
              It also means saving a spot in a queue.
            </p>
          </div>
          <div
            className="d205"
            data-node-id="21:1485"
            data-name="Button / See change"
          >
            <p className="d206" data-node-id="21:1486">
              See change
            </p>
            <div className="d207" data-node-id="22:1733" data-name="icon/chev">
              <img alt="" className="d4" src={imgIconChev} />
            </div>
          </div>
        </div>
        <div
          className="d264"
          data-node-id="21:1487"
          data-name="Notice / Thursday dinner — confirmed"
        >
          <div className="d196" data-node-id="21:1491" data-name="header">
            <div
              className="d197"
              data-node-id="21:1488"
              data-name="Chip / Confirmed"
            >
              <div className="d198" data-node-id="21:1489" data-name="dot">
                <img alt="" className="d4" src={imgDot} />
              </div>
              <p className="d199" data-node-id="21:1490">
                Confirmed
              </p>
            </div>
            <div className="d200" data-node-id="21:1492" data-name="spacer" />
            <p className="d201" data-node-id="21:1493">
              Now
            </p>
          </div>
          <div className="d265" data-node-id="21:1494" data-name="text">
            <p className="d266" data-node-id="21:1495">
              Seating phrases added for Thursday
            </p>
          </div>
        </div>
        <div
          className="d216"
          data-node-id="21:1496"
          data-name="Section / Your data"
        >
          <div className="d217" data-node-id="22:1730" data-name="icon/lock">
            <img alt="" className="d4" src={imgIconLock} />
          </div>
          <p className="d218" data-node-id="21:1497">
            Your data
          </p>
          <div className="d200" data-node-id="21:1498" data-name="spacer" />
          <p className="d219" data-node-id="21:1499">
            On this phone only
          </p>
        </div>
        <div
          className="d220"
          data-node-id="21:1500"
          data-name="Button / Delete all my data"
        >
          <div className="d189" data-node-id="21:1501" data-name="icon/trash">
            <img alt="" className="d4" src={imgIconTrash} />
          </div>
          <p className="d221" data-node-id="21:1503">
            Delete all my data
          </p>
        </div>
      </div>
      <div className="d63" data-node-id="14:811" data-name="Tab bar">
        <div className="d222" data-node-id="14:812" data-name="tab/Today">
          <div className="d65" data-node-id="14:813" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d68" data-node-id="14:815">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="14:816" data-name="tab/Ask">
          <div className="d65" data-node-id="14:817" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="14:819">
            Ask
          </p>
        </div>
        <div className="d69" data-node-id="14:820" data-name="tab/Community">
          <div className="d65" data-node-id="14:821" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d68" data-node-id="14:823">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="14:824" data-name="tab/Moments">
          <div className="d65" data-node-id="14:825" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="14:827">
            Moments
          </p>
        </div>
        <div className="d223" data-node-id="14:828" data-name="tab/My Space">
          <div className="d65" data-node-id="14:829" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d66" data-node-id="14:831">
            My Space
          </p>
        </div>
      </div>
      <div className="d267" data-node-id="21:1504" data-name="Toast">
        <div className="d217" data-node-id="22:1735" data-name="icon/check">
          <img alt="" className="d4" src={imgIconCheck} />
        </div>
        <p className="d268" data-node-id="21:1505">
          Confirmed
        </p>
        <a className="d269" data-node-id="21:1506">
          <p className="d231">Undo</p>
        </a>
      </div>
    </div>,
    props,
  );
}
