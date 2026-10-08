import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgLogo = "/assets/e6904.svg";
const imgLogoSpark = "/assets/e8669.svg";
const imgChevronLeft = "/assets/ff31e.svg";
const imgIconUtensils = "/assets/9f259.svg";
const imgIconPencil = "/assets/965b7.svg";
const imgIconUsers = "/assets/4310c.svg";
const imgIconCheck = "/assets/a4eff.svg";

export default function Screen19_1107(props) {
  return wire(
    <div className="d76" data-node-id="19:1107" data-name="4 AI output — Edit">
      <p className="d11" data-node-id="19:1108">
        9:00
      </p>
      <div className="d12" data-node-id="19:1109" data-name="Dynamic Island" />
      <div className="d13" data-node-id="19:1110" data-name="signal" />
      <div className="d14" data-node-id="19:1111" data-name="signal" />
      <div className="d15" data-node-id="19:1112" data-name="signal" />
      <div className="d16" data-node-id="19:1113" data-name="signal" />
      <div className="d17" data-node-id="19:1114" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="19:1116" data-name="battery" />
      <div className="d19" data-node-id="19:1117" data-name="battery fill" />
      <div className="d20" data-node-id="19:1118" data-name="cap" />
      <div className="d101" data-node-id="19:1119" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d21" data-node-id="19:1120" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d102" data-node-id="19:1122">
        My Space
      </p>
      <div className="d240" data-node-id="19:1123" data-name="Body">
        <a className="d241" data-node-id="21:1591" data-name="Back row">
          <div className="d217" data-node-id="21:1592" data-name="chevron-left">
            <img alt="" className="d4" src={imgChevronLeft} />
          </div>
          <p className="d242" data-node-id="21:1594">
            Back
          </p>
        </a>
        <div className="d397" data-node-id="21:1595" data-name="Card / Edit">
          <p className="d398" data-node-id="21:1596">
            Edit details
          </p>
          <div
            className="d244"
            data-node-id="21:1597"
            data-name="Edit / Details"
          >
            <div
              className="d399"
              data-node-id="21:1598"
              data-name="Field / Occasion"
            >
              <div
                className="d25"
                data-node-id="22:1762"
                data-name="icon/utensils"
              >
                <img alt="" className="d4" src={imgIconUtensils} />
              </div>
              <div className="d253" data-node-id="21:1599" data-name="text">
                <p className="d400" data-node-id="21:1600">
                  Occasion
                </p>
                <div className="d255" data-node-id="21:1601" data-name="value">
                  <p className="d401" data-node-id="21:1602">
                    Team dinner
                  </p>
                </div>
              </div>
              <div
                className="d189"
                data-node-id="21:1603"
                data-name="icon/pencil"
              >
                <img alt="" className="d4" src={imgIconPencil} />
              </div>
            </div>
            <div
              className="d402"
              data-node-id="21:1605"
              data-name="Field / With"
            >
              <div
                className="d25"
                data-node-id="22:1764"
                data-name="icon/users"
              >
                <img alt="" className="d4" src={imgIconUsers} />
              </div>
              <div className="d253" data-node-id="21:1606" data-name="text">
                <p className="d400" data-node-id="21:1607">
                  With
                </p>
                <div className="d403" data-node-id="21:1608" data-name="value">
                  <p className="d401" data-node-id="21:1609">
                    Colleagues and manager
                  </p>
                  <div
                    className="d404"
                    data-node-id="21:1610"
                    data-name="caret"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="d258" data-node-id="21:1611" data-name="actions">
            <a
              className="d405"
              data-node-id="21:1612"
              data-name="btn / secondary"
            >
              <p className="d260" data-node-id="21:1613">
                Cancel
              </p>
            </a>
            <a
              className="d261"
              data-node-id="21:1614"
              data-name="btn / primary"
            >
              <div
                className="d189"
                data-node-id="22:1768"
                data-name="icon/check"
              >
                <img alt="" className="d4" src={imgIconCheck} />
              </div>
              <p className="d262" data-node-id="21:1615">
                Save
              </p>
            </a>
          </div>
        </div>
      </div>
      <div className="d406" data-node-id="19:1207" data-name="Keyboard">
        <div className="d407" data-node-id="19:1208" data-name="key">
          <p className="d408" data-node-id="19:1209">
            q
          </p>
        </div>
        <div className="d409" data-node-id="19:1210" data-name="key">
          <p className="d410" data-node-id="19:1211">
            w
          </p>
        </div>
        <div className="d411" data-node-id="19:1212" data-name="key">
          <p className="d412" data-node-id="19:1213">
            e
          </p>
        </div>
        <div className="d413" data-node-id="19:1214" data-name="key">
          <p className="d414" data-node-id="19:1215">
            r
          </p>
        </div>
        <div className="d415" data-node-id="19:1216" data-name="key">
          <p className="d414" data-node-id="19:1217">
            t
          </p>
        </div>
        <div className="d416" data-node-id="19:1218" data-name="key">
          <p className="d412" data-node-id="19:1219">
            y
          </p>
        </div>
        <div className="d417" data-node-id="19:1220" data-name="key">
          <p className="d412" data-node-id="19:1221">
            u
          </p>
        </div>
        <div className="d418" data-node-id="19:1222" data-name="key">
          <p className="d419" data-node-id="19:1223">
            i
          </p>
        </div>
        <div className="d420" data-node-id="19:1224" data-name="key">
          <p className="d412" data-node-id="19:1225">
            o
          </p>
        </div>
        <div className="d421" data-node-id="19:1226" data-name="key">
          <p className="d408" data-node-id="19:1227">
            p
          </p>
        </div>
        <div className="d422" data-node-id="19:1228" data-name="key">
          <p className="d412" data-node-id="19:1229">
            a
          </p>
        </div>
        <div className="d423" data-node-id="19:1230" data-name="key">
          <p className="d424" data-node-id="19:1231">
            s
          </p>
        </div>
        <div className="d425" data-node-id="19:1232" data-name="key">
          <p className="d408" data-node-id="19:1233">
            d
          </p>
        </div>
        <div className="d426" data-node-id="19:1234" data-name="key">
          <p className="d414" data-node-id="19:1235">
            f
          </p>
        </div>
        <div className="d427" data-node-id="19:1236" data-name="key">
          <p className="d408" data-node-id="19:1237">
            g
          </p>
        </div>
        <div className="d428" data-node-id="19:1238" data-name="key">
          <p className="d412" data-node-id="19:1239">
            h
          </p>
        </div>
        <div className="d429" data-node-id="19:1240" data-name="key">
          <p className="d419" data-node-id="19:1241">
            j
          </p>
        </div>
        <div className="d430" data-node-id="19:1242" data-name="key">
          <p className="d424" data-node-id="19:1243">
            k
          </p>
        </div>
        <div className="d431" data-node-id="19:1244" data-name="key">
          <p className="d419" data-node-id="19:1245">
            l
          </p>
        </div>
        <div className="d432" data-node-id="19:1246" data-name="key">
          <p className="d424" data-node-id="19:1247">
            z
          </p>
        </div>
        <div className="d433" data-node-id="19:1248" data-name="key">
          <p className="d424" data-node-id="19:1249">
            x
          </p>
        </div>
        <div className="d434" data-node-id="19:1250" data-name="key">
          <p className="d412" data-node-id="19:1251">
            c
          </p>
        </div>
        <div className="d435" data-node-id="19:1252" data-name="key">
          <p className="d412" data-node-id="19:1253">
            v
          </p>
        </div>
        <div className="d436" data-node-id="19:1254" data-name="key">
          <p className="d408" data-node-id="19:1255">
            b
          </p>
        </div>
        <div className="d437" data-node-id="19:1256" data-name="key">
          <p className="d412" data-node-id="19:1257">
            n
          </p>
        </div>
        <div className="d438" data-node-id="19:1258" data-name="key">
          <p className="d439" data-node-id="19:1259">
            m
          </p>
        </div>
        <div className="d440" data-node-id="19:1260" data-name="space">
          <p className="d441" data-node-id="19:1261">
            space
          </p>
        </div>
        <a className="d442" data-node-id="19:1262" data-name="done">
          <p className="d443" data-node-id="19:1263">
            done
          </p>
        </a>
        <div className="d444" data-node-id="19:1264" data-name="123">
          <p className="d445" data-node-id="19:1265">
            123
          </p>
        </div>
      </div>
    </div>,
    props,
  );
}
