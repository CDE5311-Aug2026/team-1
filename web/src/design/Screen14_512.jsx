import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgLogo = "/assets/e6904.svg";
const imgLogoSpark = "/assets/e8669.svg";
const imgChevronLeft = "/assets/ff31e.svg";
const imgDot = "/assets/8f08d.svg";
const imgIconCalendar = "/assets/da654.svg";
const imgIconUtensils = "/assets/9f259.svg";
const imgIconPencil = "/assets/965b7.svg";
const imgIconUsers = "/assets/4310c.svg";
const imgIconX = "/assets/15ccb.svg";
const imgIconCheck = "/assets/a4eff.svg";
const imgIconChat = "/assets/adb7a.svg";
const imgToday = "/assets/d2be7.svg";
const imgAsk = "/assets/497ce.svg";
const imgCommunity = "/assets/b6d52.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/08664.svg";

export default function Screen14_512(props) {
  return wire(
    <div
      className="d76"
      data-node-id="14:512"
      data-name="3 AI output — Details"
    >
      <p className="d11" data-node-id="14:513">
        9:00
      </p>
      <div className="d12" data-node-id="14:514" data-name="Dynamic Island" />
      <div className="d13" data-node-id="14:515" data-name="signal" />
      <div className="d14" data-node-id="14:516" data-name="signal" />
      <div className="d15" data-node-id="14:517" data-name="signal" />
      <div className="d16" data-node-id="14:518" data-name="signal" />
      <div className="d17" data-node-id="14:519" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="14:521" data-name="battery" />
      <div className="d19" data-node-id="14:522" data-name="battery fill" />
      <div className="d20" data-node-id="14:523" data-name="cap" />
      <div className="d101" data-node-id="14:524" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d21" data-node-id="14:525" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d102" data-node-id="14:527">
        My Space
      </p>
      <div className="d240" data-node-id="14:653" data-name="Body">
        <a className="d241" data-node-id="21:1550" data-name="Back row">
          <div className="d217" data-node-id="21:1551" data-name="chevron-left">
            <img alt="" className="d4" src={imgChevronLeft} />
          </div>
          <p className="d242" data-node-id="21:1553">
            Notices
          </p>
        </a>
        <div
          className="d243"
          data-node-id="21:1554"
          data-name="Card / AI output"
        >
          <div className="d244" data-node-id="21:1555" data-name="headline">
            <div
              className="d208"
              data-node-id="21:1556"
              data-name="Chip / AI · Medium confidence"
            >
              <div className="d198" data-node-id="21:1557" data-name="dot">
                <img alt="" className="d4" src={imgDot} />
              </div>
              <p className="d209" data-node-id="21:1558">
                AI · Medium confidence
              </p>
            </div>
            <p className="d245" data-node-id="21:1559">
              Thursday dinner
            </p>
            <p className="d246" data-node-id="21:1560">
              Seating occasion · Thu 7 pm
            </p>
          </div>
          <div className="d247" data-node-id="21:1561" data-name="View / Why">
            <p className="d248" data-node-id="21:1562">
              WHY
            </p>
            <div className="d249" data-node-id="21:1563" data-name="quote">
              <div
                className="d196"
                data-node-id="22:1770"
                data-name="title row"
              >
                <div
                  className="d217"
                  data-node-id="22:1771"
                  data-name="icon/calendar"
                >
                  <img alt="" className="d4" src={imgIconCalendar} />
                </div>
                <p className="d250">“Team dinner @ Jumbo, Thu 7pm”</p>
              </div>
              <p className="d251" data-node-id="21:1565">
                Only this calendar title was read.
              </p>
            </div>
          </div>
          <div
            className="d244"
            data-node-id="21:1566"
            data-name="Edit / Details"
          >
            <p className="d248" data-node-id="21:1567">
              DETAILS
            </p>
            <a
              className="d252"
              data-node-id="21:1568"
              data-name="Field / Occasion"
            >
              <div
                className="d25"
                data-node-id="22:1752"
                data-name="icon/utensils"
              >
                <img alt="" className="d4" src={imgIconUtensils} />
              </div>
              <div className="d253" data-node-id="21:1569" data-name="text">
                <p className="d254" data-node-id="21:1570">
                  Occasion
                </p>
                <div className="d255" data-node-id="21:1571" data-name="value">
                  <p className="d256" data-node-id="21:1572">
                    Team dinner
                  </p>
                </div>
              </div>
              <div
                className="d189"
                data-node-id="21:1573"
                data-name="icon/pencil"
              >
                <img alt="" className="d4" src={imgIconPencil} />
              </div>
            </a>
            <a className="d252" data-node-id="21:1575" data-name="Field / With">
              <div
                className="d25"
                data-node-id="22:1754"
                data-name="icon/users"
              >
                <img alt="" className="d4" src={imgIconUsers} />
              </div>
              <div className="d253" data-node-id="21:1576" data-name="text">
                <p className="d254" data-node-id="21:1577">
                  With
                </p>
                <div className="d255" data-node-id="21:1578" data-name="value">
                  <p className="d256" data-node-id="21:1579">
                    Colleagues and manager
                  </p>
                </div>
              </div>
              <div
                className="d189"
                data-node-id="21:1580"
                data-name="icon/pencil"
              >
                <img alt="" className="d4" src={imgIconPencil} />
              </div>
            </a>
            <p className="d257" data-node-id="21:1582">
              Editing won’t change the confidence.
            </p>
          </div>
          <div className="d258" data-node-id="21:1583" data-name="actions">
            <a
              className="d259"
              data-node-id="21:1584"
              data-name="btn / secondary"
            >
              <div className="d189" data-node-id="22:1758" data-name="icon/x">
                <img alt="" className="d4" src={imgIconX} />
              </div>
              <p className="d260" data-node-id="21:1585">
                Not right
              </p>
            </a>
            <a
              className="d261"
              data-node-id="21:1586"
              data-name="btn / primary"
            >
              <div
                className="d189"
                data-node-id="22:1760"
                data-name="icon/check"
              >
                <img alt="" className="d4" src={imgIconCheck} />
              </div>
              <p className="d262" data-node-id="21:1587">
                Confirm
              </p>
            </a>
          </div>
        </div>
        <div
          className="d263"
          data-node-id="21:1588"
          data-name="Button / Ask a local"
        >
          <p className="d246" data-node-id="21:1589">
            Not sure?
          </p>
          <div className="d42" data-node-id="22:1774" data-name="icon/chat">
            <img alt="" className="d4" src={imgIconChat} />
          </div>
          <p className="d206" data-node-id="21:1590">
            Ask a local
          </p>
        </div>
      </div>
      <div className="d63" data-node-id="14:627" data-name="Tab bar">
        <div className="d222" data-node-id="14:628" data-name="tab/Today">
          <div className="d65" data-node-id="14:629" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d68" data-node-id="14:631">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="14:632" data-name="tab/Ask">
          <div className="d65" data-node-id="14:633" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="14:635">
            Ask
          </p>
        </div>
        <div className="d69" data-node-id="14:636" data-name="tab/Community">
          <div className="d65" data-node-id="14:637" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d68" data-node-id="14:639">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="14:640" data-name="tab/Moments">
          <div className="d65" data-node-id="14:641" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="14:643">
            Moments
          </p>
        </div>
        <div className="d223" data-node-id="14:644" data-name="tab/My Space">
          <div className="d65" data-node-id="14:645" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d66" data-node-id="14:647">
            My Space
          </p>
        </div>
      </div>
    </div>,
    props,
  );
}
