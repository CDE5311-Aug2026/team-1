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
const imgDot1 = "/assets/dbe2d.svg";
const imgIconChat = "/assets/adb7a.svg";
const imgIconLock = "/assets/270aa.svg";
const imgIconTrash = "/assets/29a7c.svg";
const imgToday = "/assets/d2be7.svg";
const imgAsk = "/assets/497ce.svg";
const imgCommunity = "/assets/b6d52.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/08664.svg";
const imgIconX = "/assets/52df9.svg";

export default function Screen14_850(props) {
  return wire(
    <div
      className="d76"
      data-node-id="14:850"
      data-name="6 AI output — Not right"
    >
      <p className="d11" data-node-id="14:851">
        9:00
      </p>
      <div className="d12" data-node-id="14:852" data-name="Dynamic Island" />
      <div className="d13" data-node-id="14:853" data-name="signal" />
      <div className="d14" data-node-id="14:854" data-name="signal" />
      <div className="d15" data-node-id="14:855" data-name="signal" />
      <div className="d16" data-node-id="14:856" data-name="signal" />
      <div className="d17" data-node-id="14:857" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="14:859" data-name="battery" />
      <div className="d19" data-node-id="14:860" data-name="battery fill" />
      <div className="d20" data-node-id="14:861" data-name="cap" />
      <div className="d101" data-node-id="14:862" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d21" data-node-id="14:863" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d102" data-node-id="14:865">
        My Space
      </p>
      <div className="d186" data-node-id="14:866" data-name="Body">
        <div
          className="d187"
          data-node-id="21:1507"
          data-name="Segment / My Space"
        >
          <a
            className="d188"
            data-node-id="21:1508"
            data-name="seg/What it knows"
          >
            <div className="d189" data-node-id="22:1693" data-name="icon/user">
              <img alt="" className="d4" src={imgIconUser} />
            </div>
            <p className="d190" data-node-id="21:1509">
              About you
            </p>
          </a>
          <div
            className="d191"
            data-node-id="21:1510"
            data-name="seg/Notices (active)"
          >
            <div className="d189" data-node-id="22:1696" data-name="icon/bell">
              <img alt="" className="d4" src={imgIconBell} />
            </div>
            <p className="d192" data-node-id="21:1511">
              Notices
            </p>
            <div className="d193" data-node-id="21:1512" data-name="count">
              <p className="d194" data-node-id="21:1513">
                1
              </p>
            </div>
          </div>
        </div>
        <div
          className="d195"
          data-node-id="21:1514"
          data-name="Notice / Local fix"
        >
          <div className="d196" data-node-id="21:1518" data-name="header">
            <div
              className="d197"
              data-node-id="21:1515"
              data-name="Chip / Local fix"
            >
              <div className="d198" data-node-id="21:1516" data-name="dot">
                <img alt="" className="d4" src={imgDot} />
              </div>
              <p className="d199" data-node-id="21:1517">
                Local fix
              </p>
            </div>
            <div className="d200" data-node-id="21:1519" data-name="spacer" />
            <p className="d201" data-node-id="21:1520">
              2h
            </p>
            <div
              className="d42"
              data-node-id="21:1521"
              data-name="Button / Dismiss"
            >
              <img alt="" className="d4" src={imgButtonDismiss} />
            </div>
          </div>
          <div className="d202" data-node-id="21:1523" data-name="text">
            <p className="d203" data-node-id="21:1524">
              A local updated “chope”
            </p>
            <p className="d204" data-node-id="21:1525">
              It also means saving a spot in a queue.
            </p>
          </div>
          <div
            className="d205"
            data-node-id="21:1526"
            data-name="Button / See change"
          >
            <p className="d206" data-node-id="21:1527">
              See change
            </p>
            <div className="d207" data-node-id="22:1740" data-name="icon/chev">
              <img alt="" className="d4" src={imgIconChev} />
            </div>
          </div>
        </div>
        <div
          className="d270"
          data-node-id="21:1528"
          data-name="Notice / Thursday dinner — not right"
        >
          <div className="d196" data-node-id="21:1532" data-name="header">
            <div
              className="d271"
              data-node-id="21:1529"
              data-name="Chip / Not right"
            >
              <div className="d198" data-node-id="21:1530" data-name="dot">
                <img alt="" className="d4" src={imgDot1} />
              </div>
              <p className="d272" data-node-id="21:1531">
                Not right
              </p>
            </div>
            <div className="d200" data-node-id="21:1533" data-name="spacer" />
            <p className="d201" data-node-id="21:1534">
              Now
            </p>
          </div>
          <div className="d265" data-node-id="21:1535" data-name="text">
            <p className="d266" data-node-id="21:1536">
              We won’t flag events like this
            </p>
          </div>
          <div
            className="d273"
            data-node-id="21:1537"
            data-name="Button / Ask a local instead"
          >
            <div className="d42" data-node-id="22:1742" data-name="icon/chat">
              <img alt="" className="d4" src={imgIconChat} />
            </div>
            <p className="d206" data-node-id="21:1538">
              Ask a local instead
            </p>
          </div>
        </div>
        <div
          className="d216"
          data-node-id="21:1539"
          data-name="Section / Your data"
        >
          <div className="d217" data-node-id="22:1737" data-name="icon/lock">
            <img alt="" className="d4" src={imgIconLock} />
          </div>
          <p className="d218" data-node-id="21:1540">
            Your data
          </p>
          <div className="d200" data-node-id="21:1541" data-name="spacer" />
          <p className="d219" data-node-id="21:1542">
            On this phone only
          </p>
        </div>
        <div
          className="d220"
          data-node-id="21:1543"
          data-name="Button / Delete all my data"
        >
          <div className="d189" data-node-id="21:1544" data-name="icon/trash">
            <img alt="" className="d4" src={imgIconTrash} />
          </div>
          <p className="d221" data-node-id="21:1546">
            Delete all my data
          </p>
        </div>
      </div>
      <div className="d63" data-node-id="14:931" data-name="Tab bar">
        <div className="d222" data-node-id="14:932" data-name="tab/Today">
          <div className="d65" data-node-id="14:933" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d68" data-node-id="14:935">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="14:936" data-name="tab/Ask">
          <div className="d65" data-node-id="14:937" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="14:939">
            Ask
          </p>
        </div>
        <div className="d69" data-node-id="14:940" data-name="tab/Community">
          <div className="d65" data-node-id="14:941" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d68" data-node-id="14:943">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="14:944" data-name="tab/Moments">
          <div className="d65" data-node-id="14:945" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="14:947">
            Moments
          </p>
        </div>
        <div className="d223" data-node-id="14:948" data-name="tab/My Space">
          <div className="d65" data-node-id="14:949" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d66" data-node-id="14:951">
            My Space
          </p>
        </div>
      </div>
      <div className="d267" data-node-id="21:1547" data-name="Toast">
        <div className="d217" data-node-id="22:1744" data-name="icon/x">
          <img alt="" className="d4" src={imgIconX} />
        </div>
        <p className="d268" data-node-id="21:1548">
          Marked not right
        </p>
        <a className="d269" data-node-id="21:1549">
          <p className="d231">Undo</p>
        </a>
      </div>
    </div>,
    props,
  );
}
