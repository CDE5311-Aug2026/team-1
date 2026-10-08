import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgToday = "/assets/d83ae.svg";
const imgAsk = "/assets/497ce.svg";
const imgCommunity = "/assets/b6d52.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/17d00.svg";
const imgChevron = "/assets/2144f.svg";
const imgSwitchOn = "/assets/4028d.svg";
const imgFrame = "/assets/fe9b8.svg";

export default function Screen11_1571(props) {
  return wire(
    <div
      className="d76"
      data-node-id="11:1571"
      data-name="Nearby — Where are you?"
    >
      <p className="d11" data-node-id="11:1572">
        9:00
      </p>
      <div className="d12" data-node-id="11:1573" data-name="Dynamic Island" />
      <div className="d13" data-node-id="11:1574" data-name="signal" />
      <div className="d14" data-node-id="11:1575" data-name="signal" />
      <div className="d15" data-node-id="11:1576" data-name="signal" />
      <div className="d16" data-node-id="11:1577" data-name="signal" />
      <div className="d17" data-node-id="11:1578" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="11:1580" data-name="battery" />
      <div className="d19" data-node-id="11:1581" data-name="battery fill" />
      <div className="d20" data-node-id="11:1582" data-name="cap" />
      <p className="d102" data-node-id="11:1586">
        Where are you?
      </p>
      <div className="d63" data-node-id="11:1707" data-name="Tab bar">
        <div className="d64" data-node-id="11:1708" data-name="tab/Today">
          <div className="d65" data-node-id="11:1709" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d66" data-node-id="11:1711">
            Today
          </p>
        </div>
        <div className="d67" data-node-id="11:1712" data-name="tab/Ask">
          <div className="d65" data-node-id="11:1713" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d68" data-node-id="11:1715">
            Ask
          </p>
        </div>
        <div className="d69" data-node-id="11:1716" data-name="tab/Community">
          <div className="d65" data-node-id="11:1717" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d68" data-node-id="11:1719">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="11:1720" data-name="tab/Moments">
          <div className="d65" data-node-id="11:1721" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="11:1723">
            Moments
          </p>
        </div>
        <div className="d71" data-node-id="11:1724" data-name="tab/My Space">
          <div className="d65" data-node-id="11:1725" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d68" data-node-id="11:1727">
            My Space
          </p>
        </div>
      </div>
      <div className="d153" data-node-id="11:1876" data-name="back">
        <div className="d154" data-node-id="11:1877" data-name="chevron">
          <img alt="" className="d4" src={imgChevron} />
        </div>
      </div>
      <p className="d155" data-node-id="11:1879">
        Pick a place, and we’ll show what people say there.
      </p>
      <div
        className="d156"
        data-node-id="11:1880"
        data-name="Setting / Use my location"
      >
        <div className="d157" data-node-id="11:1881" data-name="icon tile">
          <p className="d158" data-node-id="11:1891">
            📍
          </p>
        </div>
        <div className="d159" data-node-id="11:1886" data-name="text">
          <p className="d160" data-node-id="11:1887">
            Use my location
          </p>
          <p className="d161" data-node-id="11:1888">
            Only on this device · off by default
          </p>
        </div>
        <div className="d162" data-node-id="11:1889" data-name="Switch / on">
          <img alt="" className="d4" src={imgSwitchOn} />
        </div>
      </div>
      <p className="d163" data-node-id="11:1892">
        Places
      </p>
      <div className="d164" data-node-id="11:1893" data-name="count">
        <p className="d143" data-node-id="11:1894">
          9
        </p>
      </div>
      <div
        className="d165"
        data-node-id="11:1895"
        data-name="Place / Hawker centre"
      >
        <div className="d166" data-node-id="11:1896" data-name="icon tile">
          <p className="d167" data-node-id="11:1897">
            🍜
          </p>
        </div>
        <p className="d168" data-node-id="11:1898">
          Hawker centre
        </p>
        <p className="d169" data-node-id="11:1899">
          6 phrases
        </p>
        <div className="d170" data-node-id="11:1900" data-name="check">
          <div className="d171" data-node-id="11:1901" data-name="Frame">
            <img alt="" className="d4" src={imgFrame} />
          </div>
        </div>
      </div>
      <div
        className="d172"
        data-node-id="11:1903"
        data-name="Place / MRT · bus"
      >
        <div className="d173" data-node-id="11:1904" data-name="icon tile">
          <p className="d167" data-node-id="11:1905">
            🚇
          </p>
        </div>
        <p className="d174" data-node-id="11:1906">
          MRT · bus
        </p>
        <p className="d175" data-node-id="11:1907">
          5 phrases
        </p>
      </div>
      <div className="d176" data-node-id="11:1908" data-name="Place / Kopitiam">
        <div className="d173" data-node-id="11:1909" data-name="icon tile">
          <p className="d167" data-node-id="11:1910">
            ☕
          </p>
        </div>
        <p className="d174" data-node-id="11:1911">
          Kopitiam
        </p>
        <p className="d175" data-node-id="11:1912">
          4 phrases
        </p>
      </div>
      <div className="d177" data-node-id="11:1913" data-name="Place / School">
        <div className="d173" data-node-id="11:1914" data-name="icon tile">
          <p className="d167" data-node-id="11:1915">
            🎒
          </p>
        </div>
        <p className="d174" data-node-id="11:1916">
          School
        </p>
        <p className="d175" data-node-id="11:1917">
          7 phrases
        </p>
      </div>
      <div className="d178" data-node-id="11:1918" data-name="Place / Office">
        <div className="d173" data-node-id="11:1919" data-name="icon tile">
          <p className="d167" data-node-id="11:1920">
            💼
          </p>
        </div>
        <p className="d174" data-node-id="11:1921">
          Office
        </p>
        <p className="d175" data-node-id="11:1922">
          4 phrases
        </p>
      </div>
      <div
        className="d179"
        data-node-id="11:1923"
        data-name="Place / Wet market"
      >
        <div className="d173" data-node-id="11:1924" data-name="icon tile">
          <p className="d167" data-node-id="11:1925">
            🐟
          </p>
        </div>
        <p className="d174" data-node-id="11:1926">
          Wet market
        </p>
        <p className="d175" data-node-id="11:1927">
          3 phrases
        </p>
      </div>
      <div
        className="d180"
        data-node-id="11:1928"
        data-name="Place / Grab · taxi"
      >
        <div className="d173" data-node-id="11:1929" data-name="icon tile">
          <p className="d167" data-node-id="11:1930">
            🚕
          </p>
        </div>
        <p className="d174" data-node-id="11:1931">
          Grab · taxi
        </p>
        <p className="d175" data-node-id="11:1932">
          3 phrases
        </p>
      </div>
      <div
        className="d181"
        data-node-id="11:1933"
        data-name="Place / Void deck"
      >
        <div className="d173" data-node-id="11:1934" data-name="icon tile">
          <p className="d167" data-node-id="11:1935">
            🏢
          </p>
        </div>
        <p className="d174" data-node-id="11:1936">
          Void deck
        </p>
        <p className="d175" data-node-id="11:1937">
          2 phrases
        </p>
      </div>
      <div className="d182" data-node-id="11:1938" data-name="Place / Mall">
        <div className="d173" data-node-id="11:1939" data-name="icon tile">
          <p className="d167" data-node-id="11:1940">
            🛍️
          </p>
        </div>
        <p className="d174" data-node-id="11:1941">
          Mall
        </p>
        <p className="d175" data-node-id="11:1942">
          5 phrases
        </p>
      </div>
      <div
        className="d183"
        data-node-id="11:1943"
        data-name="CTA — Show phrases"
      >
        <p className="d184" data-node-id="11:1944">
          Show 6 phrases for Hawker centre
        </p>
      </div>
      <p className="d185" data-node-id="11:1945">
        Chope, tapau, kosong and 3 more
      </p>
    </div>,
    props,
  );
}
