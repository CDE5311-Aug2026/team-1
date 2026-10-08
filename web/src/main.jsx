import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./style.css";

const files = {
  logo: "30adf.png",
  spark: "e8669.svg",
  wifi: "892ac.svg",
  bell: "ff8da.svg",
  fire: "47397.svg",
  wave: "04b85.svg",
  sun: "1a3fe.svg",
  dot: "7ceea.svg",
  chevron: "0e67a.svg",
  chair: "e58de.svg",
  bowl: "b1d00.svg",
  speaker: "d5357.svg",
  think: "382cf.svg",
  work: "5048f.svg",
  grim: "c8306.svg",
  metro: "000d5.svg",
  Today: "d83ae.svg",
  Ask: "497ce.svg",
  Community: "b6d52.svg",
  Moments: "acf62.svg",
  "My Space": "17d00.svg",
  chope: "fba47.png",
};
const asset = (name) => `/assets/${files[name]}`;
const phrases = [
  {
    id: "chope",
    word: "Chope",
    pronunciation: "/chohp/",
    context: "Hawker centre · lunch",
    icon: "chair",
    contextIcon: "bowl",
    meaning: "Save a seat, often with a tissue packet on the table.",
    example: "“I chope a table first, you go order.”",
    tip: "Leave a tissue packet on an empty table to reserve your seat while you order.",
  },
  {
    id: "can",
    word: "Can or not?",
    pronunciation: "",
    context: "Team chat · work",
    icon: "think",
    contextIcon: "work",
    meaning: "Is it possible or OK? Reply “Can!” or “Cannot lah.”",
    example: "“Meet at six, can or not?” “Can!”",
    tip: "Use it as a friendly, informal way to check whether something works for someone.",
  },
  {
    id: "paiseh",
    word: "Paiseh",
    pronunciation: "/pie-seh/",
    context: "MRT · crowded train",
    icon: "grim",
    contextIcon: "metro",
    meaning: "Sorry or embarrassed — a soft, polite apology.",
    example: "“Paiseh, can I squeeze past?”",
    tip: "A warm way to apologise for a small inconvenience or say you feel shy.",
  },
];
function Icon({ name, ...props }) {
  return <img src={asset(name)} alt="" {...props} />;
}
function readSaved(key, fallback, valid = () => true) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v.filter(valid) : fallback;
  } catch {
    return fallback;
  }
}
function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Keep the prototype usable when browser storage is unavailable. */
  }
}
function Progress({ start = false, count, learned, onStart }) {
  return (
    <div className={"progress " + (start ? "overview-progress" : "")}>
      <div className="sun-tile">
        <Icon name="sun" />
      </div>
      <div className="progress-copy">
        <strong>{count} of 3 learned today</strong>
        <div
          className="segments"
          aria-label={`${count} of 3 expressions learned`}
        >
          {phrases.map((x) => (
            <i key={x.id} className={learned.includes(x.id) ? "done" : ""} />
          ))}
        </div>
      </div>
      {start && (
        <button className="primary start" onClick={onStart}>
          {count === 3 ? "Review phrases" : "Start learning"}
        </button>
      )}
    </div>
  );
}
function PhraseCard({ phrase, index, learned, onSpeak, onDetail }) {
  return (
    <article className="phrase-card">
      <div className="phrase-tile">
        <Icon name={phrase.icon} />
      </div>
      <span className="number">0{index + 1}</span>
      <div className="phrase-copy">
        <span className="chip">
          <Icon name={phrase.contextIcon} />
          {phrase.context}
        </span>
        <div className="word-line">
          <h2>{phrase.word}</h2>
          {phrase.pronunciation && <span>{phrase.pronunciation}</span>}
        </div>
        <p>{phrase.meaning}</p>
      </div>
      <button
        className="audio"
        aria-label={"Play " + phrase.word}
        onClick={() => onSpeak(phrase)}
      >
        <Icon name="speaker" />
      </button>
      <button className="detail" onClick={() => onDetail(phrase)}>
        See examples <span aria-hidden="true">↗</span>
      </button>
      {learned.includes(phrase.id) && (
        <span className="learned-marker">✓ Learned</span>
      )}
    </article>
  );
}
function App() {
  const [tab, setTab] = useState("Today"),
    [lesson, setLesson] = useState(null),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState("");
  const [learned, setLearned] = useState(() =>
    readSaved("singlish-v1-learned", []).filter((x) =>
      phrases.some((p) => p.id === x),
    ),
  );
  const [saved, setSaved] = useState(() =>
    readSaved("singlish-v1-saved", [], (x) => phrases.some((p) => p.id === x)),
  );
  const [moments, setMoments] = useState(() =>
    readSaved(
      "singlish-v1-moments",
      [],
      (x) => x && typeof x.id === "string" && typeof x.text === "string",
    ),
  );
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [caption, setCaption] = useState(""),
    [likes, setLikes] = useState([]);
  const toastTimer = useRef(null);
  useEffect(() => {
    persist("singlish-v1-learned", learned);
  }, [learned]);
  useEffect(() => {
    persist("singlish-v1-saved", saved);
  }, [saved]);
  useEffect(() => {
    persist("singlish-v1-moments", moments);
  }, [moments]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }
  function speak(p) {
    if (!("speechSynthesis" in window)) {
      notify("Audio is unavailable in this browser. Try " + p.pronunciation);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(p.word);
    u.lang = "en-SG";
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
    notify("Playing: " + p.word);
  }
  function mark(p) {
    setLearned((a) => (a.includes(p.id) ? a : [...a, p.id]));
  }
  function next() {
    mark(phrases[lesson]);
    if (lesson < 2) setLesson(lesson + 1);
    else {
      setLesson(null);
      setModal({ type: "complete" });
    }
  }
  function changeTab(t) {
    setTab(t);
    setLesson(null);
  }
  function toggleSave(p) {
    setSaved((a) =>
      a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id],
    );
  }
  const p = lesson !== null ? phrases[lesson] : null;
  const count = learned.length;
  return (
    <main
      className={
        "phone " + (p ? "lesson-mode" : tab !== "Today" ? "secondary-mode" : "")
      }
    >
      <header>
        <div className="brand">
          <Icon name="spark" className="spark" />
          <Icon name="logo" className="logo" />
        </div>
        <div className="greeting">
          <span>YOUR DAILY DOSE OF LOCAL</span>
          <strong>
            Hello, SY <Icon name="wave" className="wave" />
          </strong>
        </div>
        <button
          className="streak"
          aria-label="View 5 day streak"
          onClick={() => setModal({ type: "streak" })}
        >
          <Icon name="fire" />5
        </button>
        <button
          className="bell"
          aria-label="Notifications"
          onClick={() => setModal({ type: "notifications" })}
        >
          <Icon name="bell" />
        </button>
      </header>
      <div className="content">
        {tab === "Today" && (
          <>
            {p ? (
              <>
                <button className="back" onClick={() => setLesson(null)}>
                  ← Back to today
                </button>
                <h1 className="lesson-title">
                  A little Singlish, one phrase at a time.
                </h1>
                <Progress count={count} learned={learned} />
                <article className="lesson-card">
                  {lesson === 0 ? (
                    <img
                      className="lesson-image"
                      src={asset("chope")}
                      alt="Singapore Chope Culture: a tissue packet reserving a table at a hawker centre"
                    />
                  ) : (
                    <div className="lesson-illustration">
                      <Icon name={p.icon} />
                      <h2>{p.word}</h2>
                      <p>{p.context}</p>
                    </div>
                  )}
                  <div className="lesson-bottom">
                    <span className="chip">
                      <Icon name={p.contextIcon} />
                      {p.context}
                    </span>
                    <button
                      className="audio"
                      aria-label={"Play " + p.word}
                      onClick={() => speak(p)}
                    >
                      <Icon name="speaker" />
                    </button>
                    <div className="word-line">
                      <small>0{lesson + 1}</small>
                      <h2>{p.word}</h2>
                      <span>{p.pronunciation}</span>
                    </div>
                    <p>{p.meaning}</p>
                    <blockquote>{p.example}</blockquote>
                    <p className="lesson-tip">{p.tip}</p>
                    <button className="primary next" onClick={next}>
                      {lesson === 2 ? "Finish" : "Next"}
                    </button>
                  </div>
                </article>
                <div className="lesson-pages" aria-label="Lesson navigation">
                  {phrases.map((x, i) => (
                    <button
                      key={x.id}
                      className={i === lesson ? "active" : ""}
                      aria-label={"Go to expression " + (i + 1)}
                      onClick={() => setLesson(i)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <section className="hero">
                  <div className="hero-copy">
                    <span className="eyebrow">CAN LEARN, LAH.</span>
                    <h1>
                      Sound a little
                      <br />
                      more local.
                    </h1>
                    <p>
                      Three Singlish phrases for today. Learn them, hear them,
                      try them out.
                    </p>
                  </div>
                  <Progress
                    start
                    count={count}
                    learned={learned}
                    onStart={() => setLesson(0)}
                  />
                </section>
                <div className="daily-layout">
                  <aside className="local-context">
                    <span className="eyebrow">OUT IN THE NEIGHBOURHOOD</span>
                    <h2>Take it into real life.</h2>
                    <p>
                      A hawker lunch. A chat with friends. A little Singlish
                      goes a long way.
                    </p>
                    <button
                      className="nearby"
                      onClick={() => setModal({ type: "nearby" })}
                    >
                      <span className="pin" aria-hidden="true">
                        📍
                      </span>
                      <span className="nearby-copy">
                        <strong>
                          <em>Explore a place</em>
                          <br />
                          Old Airport Rd Food Centre
                        </strong>
                        <small>3 phrases you might hear here</small>
                      </span>
                      <Icon name="chevron" />
                    </button>
                    <div className="field-note">
                      <span className="eyebrow">A LITTLE LOCAL WISDOM</span>
                      <blockquote>
                        “I chope a table first,
                        <br />
                        you go order.”
                      </blockquote>
                      <p>
                        At a hawker centre, “chope” means reserving your seat. A
                        tissue packet often does the job.
                      </p>
                    </div>
                    <button
                      className="outline"
                      onClick={() => changeTab("Moments")}
                    >
                      Capture your own moment <span aria-hidden="true">↗</span>
                    </button>
                  </aside>
                  <section
                    className="daily-phrases"
                    aria-label="Today's expressions"
                  >
                    <div className="section-heading">
                      <h2>Today's expressions</h2>
                      <span>01 — 03</span>
                    </div>
                    <div className="phrase-list">
                      {phrases.map((x, i) => (
                        <PhraseCard
                          key={x.id}
                          phrase={x}
                          index={i}
                          learned={learned}
                          onSpeak={speak}
                          onDetail={(phrase) =>
                            setModal({ type: "phrase", phrase })
                          }
                        />
                      ))}
                    </div>
                  </section>
                </div>
              </>
            )}
          </>
        )}
        {tab === "Ask" && (
          <section className="secondary">
            <span className="eyebrow">A LITTLE HELP, LAH</span>
            <h1>Heard something new?</h1>
            <p>Ask about a Singlish expression and try it with confidence.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const match = phrases.find(
                  (x) =>
                    question.toLowerCase().includes(x.word.toLowerCase()) ||
                    question.toLowerCase().includes(x.id),
                );
                setAnswer(
                  match
                    ? `${match.word}: ${match.meaning} ${match.example}`
                    : "Try asking about “chope”, “can or not?” or “paiseh”. This local demo knows today’s three expressions.",
                );
              }}
            >
              <label htmlFor="question">What did you hear?</label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What does paiseh mean?"
                required
              />
              <button className="primary">Ask</button>
            </form>
            {answer && (
              <div className="answer" role="status">
                {answer}
              </div>
            )}
            <h2>Try a question</h2>
            {phrases.map((x) => (
              <button
                className="suggestion"
                key={x.id}
                onClick={() => setQuestion(`What does ${x.word} mean?`)}
              >
                {x.word}
                <Icon name="chevron" />
              </button>
            ))}
            <small className="demo-note">Local demo responses</small>
          </section>
        )}
        {tab === "Community" && (
          <section className="secondary">
            <span className="eyebrow">LEARN TOGETHER</span>
            <h1>A little local wisdom.</h1>
            <p>Everyday stories from our demo community.</p>
            {[
              "Tissue packet on the table? That seat is choped!",
              "“Can or not?” is my favourite way to make plans.",
              "A little “paiseh” makes a crowded commute friendlier.",
            ].map((text, i) => (
              <article className="social-card" key={text}>
                <div className="avatar">{["AL", "JT", "SY"][i]}</div>
                <strong>{["Amanda Lim", "Jia Tan", "SY"][i]}</strong>
                <small>Today · Singapore</small>
                <p>{text}</p>
                <button
                  className={"like " + (likes.includes(i) ? "liked" : "")}
                  aria-pressed={likes.includes(i)}
                  onClick={() =>
                    setLikes((a) =>
                      a.includes(i) ? a.filter((x) => x !== i) : [...a, i],
                    )
                  }
                >
                  ♡ {12 + i + (likes.includes(i) ? 1 : 0)} ·{" "}
                  {likes.includes(i) ? "Liked" : "Like"}
                </button>
              </article>
            ))}
          </section>
        )}
        {tab === "Moments" && (
          <section className="secondary">
            <span className="eyebrow">SMALL WINS</span>
            <h1>Your Singlish moments.</h1>
            <p>Used a new phrase today? Keep a little memory.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const text = caption.trim();
                if (!text) return;
                setMoments((a) => [{ id: crypto.randomUUID(), text }, ...a]);
                setCaption("");
                notify("Moment saved on this device");
              }}
            >
              <label htmlFor="caption">Today's moment</label>
              <textarea
                id="caption"
                placeholder="I choped a table at lunch today…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                required
                maxLength={300}
              />
              <button className="primary">Save moment</button>
            </form>
            {moments.length ? (
              moments.map((m) => (
                <article className="social-card" key={m.id}>
                  <small>Your moment</small>
                  <p>{m.text}</p>
                  <button
                    onClick={() =>
                      setMoments((a) => a.filter((x) => x.id !== m.id))
                    }
                  >
                    Delete
                  </button>
                </article>
              ))
            ) : (
              <div className="empty">
                <Icon name="Moments" />
                <h2>Your first moment starts here.</h2>
                <p>Try one of today's expressions, then tell your story.</p>
              </div>
            )}
          </section>
        )}
        {tab === "My Space" && (
          <section className="secondary">
            <span className="eyebrow">YOUR LEARNING JOURNEY</span>
            <h1>Can learn, one day at a time.</h1>
            <Progress count={count} learned={learned} />
            <h2>Saved expressions</h2>
            {saved.length ? (
              phrases
                .filter((x) => saved.includes(x.id))
                .map((x) => (
                  <button
                    className="suggestion"
                    key={x.id}
                    onClick={() => setModal({ type: "phrase", phrase: x })}
                  >
                    {x.word}
                    <Icon name="chevron" />
                  </button>
                ))
            ) : (
              <div className="empty">
                <p>
                  Save expressions from their detail cards to find them here.
                </p>
              </div>
            )}
            <h2>Your progress</h2>
            <p>
              {count} expressions learned · {moments.length} moments saved
            </p>
            <button
              className="outline"
              onClick={() => setModal({ type: "reset" })}
            >
              Reset learning progress
            </button>
            <small className="demo-note">
              Your progress, saved expressions, and moments stay on this device.
            </small>
          </section>
        )}
      </div>
      <nav aria-label="Main navigation">
        <div className="sidebar-brand">
          <Icon name="logo" />
          <strong>
            Singlish<span>A little more local.</span>
          </strong>
        </div>
        {["Today", "Ask", "Community", "Moments", "My Space"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => changeTab(t)}
          >
            <Icon name={t} />
            <span>{t}</span>
          </button>
        ))}
        <div className="sidebar-note">
          <span>ONE DAY AT A TIME</span>
          <p>
            Small phrases.
            <br />
            Everyday connections.
          </p>
        </div>
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          {modal.type === "phrase" && (
            <>
              <span className="eyebrow">EXPRESSION DETAIL</span>
              <div className="modal-icon">
                <Icon name={modal.phrase.icon} />
              </div>
              <h1>{modal.phrase.word}</h1>
              <p className="pronunciation">{modal.phrase.pronunciation}</p>
              <p>{modal.phrase.meaning}</p>
              <blockquote>{modal.phrase.example}</blockquote>
              <p>{modal.phrase.tip}</p>
              <div className="modal-actions">
                <button className="outline" onClick={() => speak(modal.phrase)}>
                  Hear it
                </button>
                <button
                  className="outline"
                  onClick={() => toggleSave(modal.phrase)}
                >
                  {saved.includes(modal.phrase.id)
                    ? "Unsave"
                    : "Save expression"}
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    mark(modal.phrase);
                    setModal(null);
                    notify("Expression learned!");
                  }}
                >
                  {learned.includes(modal.phrase.id)
                    ? "Learned ✓"
                    : "Mark as learned"}
                </button>
              </div>
            </>
          )}
          {modal.type === "nearby" && (
            <>
              <span className="eyebrow">
                EXPLORE SINGAPORE · SAMPLE LOCATION
              </span>
              <h1>Old Airport Rd Food Centre</h1>
              <p>
                Three phrases to try over lunch. The location is sample data
                from the design.
              </p>
              {phrases.map((x) => (
                <button
                  className="suggestion"
                  key={x.id}
                  onClick={() => setModal({ type: "phrase", phrase: x })}
                >
                  {x.word}
                  <Icon name="chevron" />
                </button>
              ))}
            </>
          )}
          {modal.type === "complete" && (
            <>
              <div className="celebration">🎉</div>
              <h1>Can! You did it.</h1>
              <p>
                You've learned today's three expressions. Try one in your next
                conversation.
              </p>
              <button
                className="primary"
                onClick={() => {
                  setModal(null);
                  changeTab("Moments");
                }}
              >
                Capture a moment
              </button>
            </>
          )}
          {modal.type === "streak" && (
            <>
              <Icon name="fire" />
              <h1>5-day streak</h1>
              <p>
                A little every day goes a long way. Keep learning your three
                daily expressions.
              </p>
              <p className="demo-note">
                The five-day streak is sample data from the Figma design.
              </p>
            </>
          )}
          {modal.type === "notifications" && (
            <>
              <h1>Your daily reminder</h1>
              <p>
                Today's three expressions are ready. Take a minute to learn
                something local.
              </p>
              <button
                className="primary"
                onClick={() => {
                  setModal(null);
                  setTab("Today");
                  setLesson(0);
                }}
              >
                Start learning
              </button>
            </>
          )}
          {modal.type === "reset" && (
            <>
              <h1>Start fresh?</h1>
              <p>
                This resets the three learned expressions. Your saved
                expressions and moments will stay.
              </p>
              <button
                className="primary"
                onClick={() => {
                  setLearned([]);
                  setModal(null);
                  notify("Learning progress reset");
                }}
              >
                Reset progress
              </button>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
function Modal({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label="Expression and learning information"
    >
      <button className="close" aria-label="Close dialog" onClick={onClose}>
        ×
      </button>
      {children}
    </dialog>
  );
}
createRoot(document.getElementById("root")).render(<App />);
