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
const imgDot1 = "/assets/8f08d.svg";
const imgIconX = "/assets/4ec4c.svg";
const imgIconCheck = "/assets/c61b5.svg";
const imgIconLock = "/assets/270aa.svg";
const imgIconTrash = "/assets/29a7c.svg";
const imgToday = "/assets/d2be7.svg";
const imgAsk = "/assets/497ce.svg";
const imgCommunity = "/assets/b6d52.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/08664.svg";

export default function Screen12_182(props) {
  return wire(
    <div className="d76" data-node-id="12:182" data-name="2 My Space — Notices">
      <p className="d11" data-node-id="12:183">
        9:00
      </p>
      <div className="d12" data-node-id="12:184" data-name="Dynamic Island" />
      <div className="d13" data-node-id="12:185" data-name="signal" />
      <div className="d14" data-node-id="12:186" data-name="signal" />
      <div className="d15" data-node-id="12:187" data-name="signal" />
      <div className="d16" data-node-id="12:188" data-name="signal" />
      <div className="d17" data-node-id="12:189" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="12:191" data-name="battery" />
      <div className="d19" data-node-id="12:192" data-name="battery fill" />
      <div className="d20" data-node-id="12:193" data-name="cap" />
      <div className="d101" data-node-id="12:194" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d21" data-node-id="12:195" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d102" data-node-id="12:197">
        My Space
      </p>
      <div className="d186" data-node-id="12:323" data-name="Body">
        <div
          className="d187"
          data-node-id="21:1419"
          data-name="Segment / My Space"
        >
          <a
            className="d188"
            data-node-id="21:1420"
            data-name="seg/What it knows"
          >
            <div className="d189" data-node-id="22:1683" data-name="icon/user">
              <img alt="" className="d4" src={imgIconUser} />
            </div>
            <p className="d190" data-node-id="21:1421">
              About you
            </p>
          </a>
          <div
            className="d191"
            data-node-id="21:1422"
            data-name="seg/Notices (active)"
          >
            <div className="d189" data-node-id="22:1686" data-name="icon/bell">
              <img alt="" className="d4" src={imgIconBell} />
            </div>
            <p className="d192" data-node-id="21:1423">
              Notices
            </p>
            <div className="d193" data-node-id="21:1424" data-name="count">
              <p className="d194" data-node-id="21:1425">
                2
              </p>
            </div>
          </div>
        </div>
        <div
          className="d195"
          data-node-id="21:1426"
          data-name="Notice / Local fix"
        >
          <div className="d196" data-node-id="21:1430" data-name="header">
            <div
              className="d197"
              data-node-id="21:1427"
              data-name="Chip / Local fix"
            >
              <div className="d198" data-node-id="21:1428" data-name="dot">
                <img alt="" className="d4" src={imgDot} />
              </div>
              <p className="d199" data-node-id="21:1429">
                Local fix
              </p>
            </div>
            <div className="d200" data-node-id="21:1431" data-name="spacer" />
            <p className="d201" data-node-id="21:1432">
              2h
            </p>
            <div
              className="d42"
              data-node-id="21:1433"
              data-name="Button / Dismiss"
            >
              <img alt="" className="d4" src={imgButtonDismiss} />
            </div>
          </div>
          <div className="d202" data-node-id="21:1435" data-name="text">
            <p className="d203" data-node-id="21:1436">
              A local updated “chope”
            </p>
            <p className="d204" data-node-id="21:1437">
              It also means saving a spot in a queue.
            </p>
          </div>
          <div
            className="d205"
            data-node-id="21:1438"
            data-name="Button / See change"
          >
            <p className="d206" data-node-id="21:1439">
              See change
            </p>
            <div className="d207" data-node-id="22:1728" data-name="icon/chev">
              <img alt="" className="d4" src={imgIconChev} />
            </div>
          </div>
        </div>
        <div
          className="d195"
          data-node-id="21:1440"
          data-name="Notice / Thursday dinner"
        >
          <div className="d196" data-node-id="21:1444" data-name="header">
            <div
              className="d208"
              data-node-id="21:1441"
              data-name="Chip / AI · Medium confidence"
            >
              <div className="d198" data-node-id="21:1442" data-name="dot">
                <img alt="" className="d4" src={imgDot1} />
              </div>
              <p className="d209" data-node-id="21:1443">
                AI · Medium confidence
              </p>
            </div>
            <div className="d200" data-node-id="21:1445" data-name="spacer" />
            <p className="d201" data-node-id="21:1446">
              Today
            </p>
          </div>
          <div className="d202" data-node-id="21:1447" data-name="text">
            <p className="d203" data-node-id="21:1448">
              Thursday dinner may need seating tips
            </p>
            <p className="d204" data-node-id="21:1449">
              Based on your calendar title.
            </p>
          </div>
          <div className="d196" data-node-id="21:1450" data-name="actions">
            <a
              className="d210"
              data-node-id="21:1451"
              data-name="Button / Details"
            >
              <p className="d211" data-node-id="21:1452">
                Details
              </p>
              <div
                className="d207"
                data-node-id="22:1746"
                data-name="icon/chev"
              >
                <img alt="" className="d4" src={imgIconChev} />
              </div>
            </a>
            <div className="d200" data-node-id="21:1453" data-name="spacer" />
            <a
              className="d212"
              data-node-id="21:1454"
              data-name="Button / Not right"
            >
              <div className="d207" data-node-id="22:1748" data-name="icon/x">
                <img alt="" className="d4" src={imgIconX} />
              </div>
              <p className="d213" data-node-id="21:1455">
                Not right
              </p>
            </a>
            <a
              className="d214"
              data-node-id="21:1456"
              data-name="Button / Confirm"
            >
              <div
                className="d207"
                data-node-id="22:1750"
                data-name="icon/check"
              >
                <img alt="" className="d4" src={imgIconCheck} />
              </div>
              <p className="d215" data-node-id="21:1457">
                Confirm
              </p>
            </a>
          </div>
        </div>
        <div
          className="d216"
          data-node-id="21:1458"
          data-name="Section / Your data"
        >
          <div className="d217" data-node-id="22:1725" data-name="icon/lock">
            <img alt="" className="d4" src={imgIconLock} />
          </div>
          <p className="d218" data-node-id="21:1459">
            Your data
          </p>
          <div className="d200" data-node-id="21:1460" data-name="spacer" />
          <p className="d219" data-node-id="21:1461">
            On this phone only
          </p>
        </div>
        <div
          className="d220"
          data-node-id="21:1462"
          data-name="Button / Delete all my data"
        >
          <div className="d189" data-node-id="21:1463" data-name="icon/trash">
            <img alt="" className="d4" src={imgIconTrash} />
          </div>
          <p className="d221" data-node-id="21:1465">
            Delete all my data
          </p>
        </div>
      </div>
      <div className="d63" data-node-id="12:297" data-name="Tab bar">
        <div className="d222" data-node-id="12:298" data-name="tab/Today">
          <div className="d65" data-node-id="12:299" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d68" data-node-id="12:301">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="12:302" data-name="tab/Ask">
          <div className="d65" data-node-id="12:303" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="12:305">
            Ask
          </p>
        </div>
        <div className="d69" data-node-id="12:306" data-name="tab/Community">
          <div className="d65" data-node-id="12:307" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d68" data-node-id="12:309">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="12:310" data-name="tab/Moments">
          <div className="d65" data-node-id="12:311" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="12:313">
            Moments
          </p>
        </div>
        <div className="d223" data-node-id="12:314" data-name="tab/My Space">
          <div className="d65" data-node-id="12:315" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d66" data-node-id="12:317">
            My Space
          </p>
        </div>
      </div>
    </div>,
    props,
  );
}
