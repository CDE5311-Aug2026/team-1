import React from "react";
import { wire } from "./wire";
const imgWifi = "/assets/892ac.svg";
const imgLogo = "/assets/e6904.svg";
const imgLogoSpark = "/assets/e8669.svg";
const imgToday = "/assets/d2be7.svg";
const imgAsk = "/assets/e5b5f.svg";
const imgCommunity = "/assets/b6d52.svg";
const imgMoments = "/assets/acf62.svg";
const imgMySpace = "/assets/17d00.svg";
const imgSparkle = "/assets/f9150.svg";
const imgCheck = "/assets/65d00.svg";
const imgPerson = "/assets/686b1.svg";
const imgCopy = "/assets/f1798.svg";
const imgUp = "/assets/a1516.svg";
const imgDown = "/assets/4ff55.svg";
const imgRedo = "/assets/7ca90.svg";
const imgInfo = "/assets/89afc.svg";
const imgPlus = "/assets/9ece6.svg";
const imgMic = "/assets/b2737.svg";
const imgSend = "/assets/6cf04.svg";
const imgDots = "/assets/09396.svg";
const imgEdit = "/assets/a31cc.svg";

export default function Screen2_429(props) {
  return wire(
    <div className="d76" data-node-id="2:429" data-name="Ask Feature">
      <p className="d11" data-node-id="2:430">
        9:00
      </p>
      <div className="d12" data-node-id="2:431" data-name="Dynamic Island" />
      <div className="d13" data-node-id="2:432" data-name="signal" />
      <div className="d14" data-node-id="2:433" data-name="signal" />
      <div className="d15" data-node-id="2:434" data-name="signal" />
      <div className="d16" data-node-id="2:435" data-name="signal" />
      <div className="d17" data-node-id="2:436" data-name="wifi">
        <img alt="" className="d4" src={imgWifi} />
      </div>
      <div className="d18" data-node-id="2:438" data-name="battery" />
      <div className="d19" data-node-id="2:439" data-name="battery fill" />
      <div className="d20" data-node-id="2:440" data-name="cap" />
      <div className="d101" data-node-id="2:441" data-name="logo">
        <img alt="" className="d4" src={imgLogo} />
      </div>
      <div className="d21" data-node-id="2:442" data-name="logo/spark">
        <img alt="" className="d4" src={imgLogoSpark} />
      </div>
      <p className="d102" data-node-id="2:444">
        Ask
      </p>
      <div className="d63" data-node-id="2:545" data-name="Tab bar">
        <div className="d222" data-node-id="2:546" data-name="tab/Today">
          <div className="d65" data-node-id="2:547" data-name="Today">
            <img alt="" className="d4" src={imgToday} />
          </div>
          <p className="d68" data-node-id="2:549">
            Today
          </p>
        </div>
        <div className="d446" data-node-id="2:550" data-name="tab/Ask">
          <div className="d65" data-node-id="2:551" data-name="Ask">
            <img alt="" className="d4" src={imgAsk} />
          </div>
          <p className="d66" data-node-id="2:553">
            Ask
          </p>
        </div>
        <div className="d69" data-node-id="2:554" data-name="tab/Community">
          <div className="d65" data-node-id="2:555" data-name="Community">
            <img alt="" className="d4" src={imgCommunity} />
          </div>
          <p className="d68" data-node-id="2:557">
            Community
          </p>
        </div>
        <div className="d70" data-node-id="2:558" data-name="tab/Moments">
          <div className="d65" data-node-id="2:559" data-name="Moments">
            <img alt="" className="d4" src={imgMoments} />
          </div>
          <p className="d68" data-node-id="2:561">
            Moments
          </p>
        </div>
        <div className="d71" data-node-id="2:562" data-name="tab/My Space">
          <div className="d65" data-node-id="2:563" data-name="My Space">
            <img alt="" className="d4" src={imgMySpace} />
          </div>
          <p className="d68" data-node-id="2:565">
            My Space
          </p>
        </div>
      </div>
      <div className="d447" data-node-id="2:303" data-name="Chat">
        <div className="d448" data-node-id="2:304" data-name="AI message">
          <div
            className="d449"
            data-node-id="2:305"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgb(255, 138, 76) 25%, rgb(217, 54, 110) 75%)",
            }}
            data-name="Avatar/IntentAI"
          >
            <div className="d450" data-node-id="2:306" data-name="Sparkle">
              <img alt="" className="d4" src={imgSparkle} />
            </div>
          </div>
          <div className="d451" data-node-id="2:309" data-name="Message">
            <div className="d452" data-node-id="2:310" data-name="Bubble">
              <p className="d453" data-node-id="2:311">
                Hi SY 👋 What did you hear today? Tell me the phrase and where
                you heard it.
              </p>
            </div>
          </div>
        </div>
        <div className="d454" data-node-id="2:312" data-name="User message">
          <div className="d455" data-node-id="2:313" data-name="Message">
            <div className="d456" data-node-id="2:314" data-name="Bubble">
              <p className="d457" data-node-id="2:315">
                My classmates said “can help me chope a seat?” What does chope
                mean?
              </p>
            </div>
            <div
              className="d458"
              data-node-id="2:316"
              data-name="ContextSelector"
            >
              <div
                className="d459"
                data-node-id="I2:316;20:130"
                data-name="IconBadge"
              >
                <p className="d460" data-node-id="I2:316;20:131">
                  💬
                </p>
              </div>
              <p className="d461" data-node-id="I2:316;3:20">
                context: group chat · classmates
              </p>
              <div
                className="d462"
                data-node-id="I2:316;28:361"
                data-name="Check"
              >
                <img alt="" className="d4" src={imgCheck} />
              </div>
            </div>
          </div>
          <div className="d463" data-node-id="2:317" data-name="Avatar/User">
            <div className="d464" data-node-id="2:318" data-name="Person">
              <img alt="" className="d4" src={imgPerson} />
            </div>
          </div>
        </div>
        <div className="d448" data-node-id="2:321" data-name="AI answer">
          <div
            className="d449"
            data-node-id="2:322"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgb(255, 138, 76) 25%, rgb(217, 54, 110) 75%)",
            }}
            data-name="Avatar/IntentAI"
          >
            <div className="d450" data-node-id="2:323" data-name="Sparkle">
              <img alt="" className="d4" src={imgSparkle} />
            </div>
          </div>
          <div className="d465" data-node-id="2:326" data-name="Message">
            <div className="d452" data-node-id="2:327" data-name="Bubble">
              <div className="d466" data-node-id="2:328">
                <p className="d467">
                  <span className="d468">“</span>
                  <span className="d469">Chope</span>
                  <span className="d468">
                    ” is Singlish for reserving a seat — usually at a hawker
                    centre, by leaving a tissue packet on the table.
                  </span>
                </p>
                <p className="d470">​</p>
                <p className="d468">
                  Your classmate is asking you to save a seat for them.
                </p>
              </div>
            </div>
            <div className="d471" data-node-id="2:329" data-name="Actions">
              <div className="d217" data-node-id="2:330" data-name="copy">
                <img alt="" className="d4" src={imgCopy} />
              </div>
              <div className="d217" data-node-id="2:333" data-name="up">
                <img alt="" className="d4" src={imgUp} />
              </div>
              <div className="d217" data-node-id="2:335" data-name="down">
                <img alt="" className="d4" src={imgDown} />
              </div>
              <div className="d217" data-node-id="2:337" data-name="redo">
                <img alt="" className="d4" src={imgRedo} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="d472" data-node-id="2:339" data-name="Composer">
        <div className="d448" data-node-id="2:340" data-name="Suggestions">
          <div className="d473" data-node-id="2:341" data-name="Chip">
            <p className="d474" data-node-id="2:342">
              Report
            </p>
          </div>
          <div className="d473" data-node-id="2:343" data-name="Chip">
            <p className="d474" data-node-id="2:344">
              Use it in a sentence
            </p>
          </div>
          <div className="d473" data-node-id="2:345" data-name="Chip">
            <p className="d474" data-node-id="2:346">
              More Singlish
            </p>
          </div>
        </div>
        <div className="d475" data-node-id="2:358" data-name="Disclaimer">
          <div className="d476" data-node-id="2:359" data-name="info">
            <img alt="" className="d4" src={imgInfo} />
          </div>
          <p className="d400" data-node-id="2:363">
            AI-generated answers may contain mistakes.
          </p>
        </div>
      </div>
      <div className="d477" data-node-id="2:347" data-name="Input">
        <div className="d478" data-node-id="2:348" data-name="Add">
          <div className="d25" data-node-id="2:349" data-name="plus">
            <img alt="" className="d4" src={imgPlus} />
          </div>
        </div>
        <p className="d479" data-node-id="2:351">
          Ask IntentAI anything…
        </p>
        <div className="d480" data-node-id="2:352" data-name="mic">
          <img alt="" className="d4" src={imgMic} />
        </div>
        <div className="d481" data-node-id="2:355" data-name="Send">
          <div className="d25" data-node-id="2:356" data-name="send">
            <img alt="" className="d4" src={imgSend} />
          </div>
        </div>
      </div>
      <div className="d482" data-node-id="2:716" data-name="IconBtn/dots">
        <div className="d25" data-node-id="2:717" data-name="dots">
          <img alt="" className="d4" src={imgDots} />
        </div>
      </div>
      <div className="d483" data-node-id="2:722" data-name="IconBtn/edit">
        <div className="d25" data-node-id="2:723" data-name="edit">
          <img alt="" className="d4" src={imgEdit} />
        </div>
      </div>
    </div>,
    props,
  );
}
