import React, { useState, useEffect, useRef } from "react";
import { screens } from "./design/screens";
const routes = {
  home: "1:2",
  lesson: "1:340",
  ask: "2:429",
  community: "3:728",
  question: "7:1119",
  moments: "4:919",
  nearby: "11:1414",
  places: "11:1571",
  profile: "12:40",
  notices: "12:182",
  details: "14:512",
  edit: "19:1107",
  confirmed: "14:730",
  rejected: "14:850",
  welcome: "17:45",
  time: "17:77",
  topics: "17:136",
  quiz: "17:216",
  result: "17:271",
};
const phrases = [
  {
    id: "chope",
    word: "Chope",
    meaning: "Save a seat, often with a tissue packet on the table.",
    example: "“I chope a table first, you go order.”",
    icon: "e58de.svg",
  },
  {
    id: "can",
    word: "Can or not?",
    meaning: "Is it possible or OK? Reply “Can!” or “Cannot lah.”",
    example: "“Meet at six, can or not?” “Can!”",
    icon: "382cf.svg",
  },
  {
    id: "paiseh",
    word: "Paiseh",
    meaning: "Sorry or embarrassed — a soft, polite apology.",
    example: "“Paiseh, can I squeeze past?”",
    icon: "c8306.svg",
  },
];
const initial = {
  done: false,
  profile: { from: "China", time: "3 months", role: "Student intern" },
  settings: {
    daily: false,
    occasions: false,
    local: false,
    rehearse: false,
    judgement: false,
    location: false,
  },
  learned: [],
  saved: [],
  notice: "pending",
  occasion: "Team dinner",
  with: "Colleagues and manager",
  dismissed: false,
  place: "Hawker centre",
  duration: "3 months – 1 year",
  topics: ["Work", "Food"],
  lookups: [
    {
      id: "wah",
      word: "wah, finally ah",
      meaning: "Mostly teasing, with some impatience — both at once.",
      source: "Confirmed by a local",
    },
    {
      id: "chope",
      word: "chope",
      meaning: "To reserve a seat by leaving tissues on it.",
      source: "Confirmed by a local",
    },
    {
      id: "sabo",
      word: "sabo",
      meaning: "To sell someone out — joking or serious; tone decides.",
      source: "AI-generated",
    },
  ],
  questions: [
    {
      id: "sabo",
      text: "“sabo” — did my colleague insult me?",
      context: "in a Chinese-Singaporean enquiry office",
      detail:
        "“After the manager gave me extra forms, my colleague laughed and said ‘wah, you kena sabo lah.’ Was she being rude to me?”",
      status: "Pending",
    },
    {
      id: "paiseh",
      text: "“paiseh to trouble you”",
      context: "group chat · classmates",
      detail: "My classmate said “paiseh to trouble you”. What does it mean?",
      status: "Answered",
      answer:
        "A friendly apology for inconveniencing someone: sorry to trouble you.",
    },
  ],
};
function load() {
  try {
    const v = JSON.parse(localStorage.getItem("singlish-v2-state"));
    if (
      v?.profile &&
      v.settings &&
      Array.isArray(v.lookups) &&
      Array.isArray(v.questions)
    )
      return { ...initial, ...v };
    return {
      ...initial,
      learned: JSON.parse(localStorage.getItem("singlish-v1-learned") || "[]"),
      saved: JSON.parse(localStorage.getItem("singlish-v1-saved") || "[]"),
    };
  } catch {
    return initial;
  }
}
function Dialog({ title, children, close }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      className="design-dialog"
      ref={ref}
      aria-label={title}
      onCancel={close}
    >
      <button className="close" aria-label="Close dialog" onClick={close}>
        ×
      </button>
      <h1>{title}</h1>
      {children}
    </dialog>
  );
}
export default function DesignApp() {
  const params = new URLSearchParams(location.search),
    reference = params.get("reference") === "1";
  const [data, setData] = useState(load),
    [route, setRoute] = useState(() =>
      routes[params.get("screen")]
        ? params.get("screen")
        : load().done
          ? "home"
          : "welcome",
    );
  const [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [lesson, setLesson] = useState(0),
    [draft, setDraft] = useState(""),
    [chat, setChat] = useState(null),
    [context, setContext] = useState("group chat · classmates"),
    [question, setQuestion] = useState("sabo"),
    [lookupPage, setLookupPage] = useState(1),
    [quizIndex, setQuizIndex] = useState(0),
    [answerChoice, setAnswerChoice] = useState(0),
    [score, setScore] = useState(0),
    [feedback, setFeedback] = useState(null),
    [width, setWidth] = useState(innerWidth);
  const timer = useRef();
  useEffect(() => {
    try {
      localStorage.setItem("singlish-v2-state", JSON.stringify(data));
    } catch {}
  }, [data]);
  useEffect(() => {
    const resize = () => setWidth(innerWidth);
    addEventListener("resize", resize);
    return () => {
      removeEventListener("resize", resize);
      clearTimeout(timer.current);
    };
  }, []);
  const update = (values) => setData((d) => ({ ...d, ...values }));
  function go(r) {
    setRoute(r);
    setModal(null);
    window.scrollTo(0, 0);
  }
  function notify(message, undo) {
    setToast({ message, undo });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), undo ? 10000 : 3500);
  }
  function speak(word) {
    if (!window.speechSynthesis) {
      notify("Audio is unavailable in this browser.");
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-SG";
    u.rate = 0.8;
    speechSynthesis.speak(u);
    notify("Playing: " + word);
  }
  function remember(p) {
    setData((d) =>
      d.lookups.some((x) => x.word.toLowerCase() === p.word.toLowerCase())
        ? d
        : {
            ...d,
            lookups: [
              {
                ...p,
                id: p.id || crypto.randomUUID(),
                source: p.source || "AI-generated",
              },
              ...d.lookups,
            ],
          },
    );
  }
  function ask(value) {
    const p = phrases.find(
      (x) =>
        value.toLowerCase().includes(x.id) ||
        value.toLowerCase().includes(x.word.toLowerCase()),
    );
    setChat({
      question: value,
      answer: p
        ? `${p.word}: ${p.meaning}\n\n${p.example}\nContext: ${context}`
        : value.toLowerCase().includes("sabo")
          ? "Sabo can mean selling someone out. The tone and setting decide whether it is teasing or hurtful. Ask a local if unsure."
          : "This local prototype explains chope, paiseh, can or not, and sabo. For another phrase, save a question for a local.",
    });
    setDraft("");
    if (p) remember(p);
  }
  function toggle(key) {
    setData((d) => ({
      ...d,
      settings: { ...d.settings, [key]: !d.settings[key] },
    }));
  }
  const actions = {},
    patches = {};
  function act(id, label, onClick, extra = {}) {
    actions[id] = { label, onClick, ...extra };
  }
  function text(id, value) {
    patches[id] = { ...patches[id], text: value };
  }
  function hide(id, v = true) {
    patches[id] = { ...patches[id], hidden: v };
  }
  function select(id, v) {
    patches[id] = {
      style: {
        borderColor: v ? "#e4671f" : "#e9e9ec",
        backgroundColor: v ? "#fff3ea" : "white",
      },
    };
  }
  function sw(id, key) {
    const on = (reference && key === "occasions") || data.settings[key];
    act(id, key, () => toggle(key), { checked: !!on });
    patches[id] = {
      children: (
        <img src={"/assets/" + (on ? "4028d.svg" : "e1ebf.svg")} alt="" />
      ),
    };
  }
  const navigate = (t) =>
    go(
      {
        Today: "home",
        Ask: "ask",
        Community: "community",
        Moments: "moments",
        "My Space": "profile",
      }[t],
    );
  const learn = (p) =>
    setData((d) => ({
      ...d,
      learned: d.learned.includes(p.id) ? d.learned : [...d.learned, p.id],
    }));
  if (route === "home") {
    patches["1:86"] = {
      children: (
        <>
          Today's three expressions,
          <br />
          Can or cannot learn?
        </>
      ),
      style: { whiteSpace: "nowrap" },
    };
    act("1:118", "Start", () => {
      setLesson(0);
      go("lesson");
    });
    ["1:183", "1:250", "1:315"].forEach((id, i) =>
      act(id, "Detail " + phrases[i].word, () => {
        remember(phrases[i]);
        setModal({ type: "phrase", title: phrases[i].word, p: phrases[i] });
      }),
    );
    ["1:177", "1:245", "1:309"].forEach((id, i) =>
      act(id, "Play " + phrases[i].word, () => speak(phrases[i].word)),
    );
    act("18:1949", "Near you", () => go("nearby"));
    act("1:18", "Notifications", () => go("notices"));
    act("1:22", "View 5 day streak", () =>
      setModal({
        type: "info",
        title: "5-day streak",
        body: "A little every day goes a long way. This streak is sample data from the design.",
      }),
    );
    text("1:114", `${data.learned.length} of 3 learned today`);
    ["1:115", "1:116", "1:117"].forEach((id, i) => {
      if (data.learned.includes(phrases[i].id))
        patches[id] = { style: { backgroundColor: "#e4671f" } };
    });
  }
  if (route === "lesson") {
    patches["1:424"] = {
      children: (
        <>
          Today's three expressions,
          <br />
          Can or cannot learn?
        </>
      ),
      style: { whiteSpace: "nowrap" },
    };
    const p = phrases[lesson];
    text("1:452", `${data.learned.length} of 3 learned today`);
    act("1:515", lesson === 2 ? "Finish" : "Next", () => {
      learn(p);
      remember(p);
      if (lesson < 2) setLesson(lesson + 1);
      else {
        go("home");
        setModal({ type: "complete", title: "Can! You did it." });
      }
    });
    act("1:509", "Play " + p.word, () => speak(p.word));
    ["1:517", "1:518", "1:519"].forEach((id, i) => {
      act(id, "Go to expression " + (i + 1), () => setLesson(i));
      patches[id] = {
        style: { backgroundColor: i === lesson ? "#e4671f" : "#f3d5c0" },
      };
    });
    text("1:481", "0" + (lesson + 1));
    text("1:512", p.word);
    text("1:513", ["/chohp/", "", "/pie-seh/"][lesson]);
    text("1:514", p.meaning);
    text("1:516", lesson === 2 ? "Finish" : "Next");
    if (lesson > 0) {
      patches["1:479"] = {
        children: (
          <div
            style={{
              width: 318,
              height: 267,
              background: "#fff3ea",
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
            }}
          >
            <img src={"/assets/" + p.icon} alt={p.word} />
          </div>
        ),
      };
      text("1:508", lesson === 1 ? "Team chat · work" : "MRT · crowded train");
    }
  }
  if (route === "ask") {
    patches["2:311"] = {
      children: (
        <>
          Hi SY 👋 What did you hear today? Tell
          <br />
          me the phrase and where you heard it.
        </>
      ),
      style: { whiteSpace: "nowrap", fontSize: "13.5px" },
    };
    patches["2:351"] = {
      children: (
        <input
          className="live-input"
          aria-label="Ask IntentAI anything"
          placeholder="Ask IntentAI anything…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) ask(draft.trim());
          }}
        />
      ),
    };
    act("2:355", "Send", () => {
      if (draft.trim()) ask(draft.trim());
    });
    ["2:348", "2:316"].forEach((id) =>
      act(id, "Choose context", () =>
        setModal({ type: "context", title: "Choose context" }),
      ),
    );
    text("I2:316;3:20", "context: " + context);
    if (chat) {
      text("2:315", chat.question);
      patches["2:328"] = {
        children: (
          <p style={{ lineHeight: "20px", whiteSpace: "pre-wrap" }}>
            {chat.answer}
          </p>
        ),
      };
    }
    patches["2:303"] = {
      style: { overflowY: "auto", overscrollBehavior: "contain" },
    };
    act("2:330", "Copy answer", async () => {
      try {
        await navigator.clipboard.writeText(chat?.answer || phrases[0].meaning);
        notify("Answer copied");
      } catch {
        notify("Select the answer text to copy it.");
      }
    });
    act(
      "2:333",
      "Helpful",
      () => {
        setFeedback("up");
        notify("Feedback saved");
      },
      { pressed: feedback === "up" },
    );
    act(
      "2:335",
      "Not helpful",
      () => {
        setFeedback("down");
        notify("Feedback saved");
      },
      { pressed: feedback === "down" },
    );
    act("2:337", "Regenerate", () =>
      ask(chat?.question || "What does chope mean?"),
    );
    act("2:341", "Report", () =>
      setModal({ type: "report", title: "Report this answer" }),
    );
    act("2:343", "Use it in a sentence", () =>
      setChat((c) => ({
        question: c?.question || "What does chope mean?",
        answer:
          phrases.find((x) =>
            (c?.question || "chope").toLowerCase().includes(x.id),
          )?.example || phrases[0].example,
      })),
    );
    act("2:345", "More Singlish", () => go("lesson"));
    act("2:722", "New chat", () => {
      setChat(null);
      setDraft("");
      notify("New chat");
    });
    act("2:716", "Chat options", () =>
      setModal({ type: "chatMenu", title: "Chat options" }),
    );
    act("2:352", "Voice input", () => {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) {
        notify("Voice input is unavailable. Type your question instead.");
        return;
      }
      const r = new R();
      r.lang = "en-SG";
      r.onresult = (e) => setDraft(e.results[0][0].transcript);
      r.onerror = () => notify("Microphone access was unavailable.");
      r.start();
    });
  }
  if (route === "community" || route === "question") {
    const list = route === "community";
    sw(list ? "3:884" : "7:1162", "local");

    act(list ? "3:880" : "7:1158", "My questions", () => go("community"));
    if (list) {
      text("3:890", String(data.questions.length));
      patches["3:878"] = {
        style: { maxHeight: 540, overflowY: "auto" },
        append: data.questions.slice(2).map((q) => (
          <button
            key={q.id}
            className="question-extra"
            onClick={() => {
              setQuestion(q.id);
              go("question");
            }}
          >
            <strong>{q.text}</strong>
            <small>{q.context}</small>
            <span>{q.status} →</span>
          </button>
        )),
      };
      ["3:891", "3:901"].forEach((id, i) => {
        const q = data.questions[i];
        hide(id, !q);
        if (q)
          act(id, "Open question " + q.text, () => {
            setQuestion(q.id);
            go("question");
          });
      });
      [
        ["3:893", "3:894", "3:898"],
        ["3:903", "3:904", "3:908"],
      ].forEach((ids, i) => {
        const q = data.questions[i];
        if (q)
          ids.forEach((id, j) => text(id, [q.text, q.context, q.status][j]));
      });
      act("3:915", "Ask a local", () =>
        setModal({ type: "question", title: "Ask a local" }),
      );
      if (data.settings.local)
        text(
          "3:911",
          "Local answering is enabled. Open a question to add an interpretation.",
        );
    } else {
      const q =
        data.questions.find((x) => x.id === question) || data.questions[0];
      if (q) {
        text(
          "7:1212",
          q.id === "sabo" ? "Did my colleague insult me?" : q.text,
        );
        text("7:1217", q.detail);
        if (q.id !== "sabo") text("7:1213", q.context);
        text("7:1207", q.status);
        if (q.status === "Answered") {
          patches["7:1218"] = {
            children: (
              <p
                style={{ lineHeight: "20px", fontSize: 13, padding: "12px 0" }}
              >
                {q.answer}
              </p>
            ),
          };
          hide("7:1238");
        }
        act("7:1246", "Withdraw", () => {
          const old = data.questions;
          update({ questions: data.questions.filter((x) => x.id !== q.id) });
          go("community");
          notify("Question withdrawn", () => update({ questions: old }));
        });
        act(
          "7:1248",
          data.settings.local ? "Answer question" : "Add more context",
          () =>
            setModal({
              type: data.settings.local ? "localAnswer" : "questionContext",
              title: data.settings.local
                ? "Answer question"
                : "Add more context",
              q,
            }),
        );
        text(
          "7:1249",
          data.settings.local ? "Answer question" : "Add more context",
        );
      }
      act("7:1196", "Your questions", () => go("community"));
    }
  }
  if (route === "moments") {
    if (data.settings.daily) {
      text(
        "4:939",
        "Today's card: " + (data.lookups[0]?.word || "No saved phrases"),
      );
      text("4:940", data.lookups[0]?.meaning || "Look up a phrase to start.");
    }

    sw("4:941", "daily");
    text("4:944", String(reference ? 24 : data.lookups.length));
    const nodes = [
      ["4:961", "4:963", "4:964", "4:956", "4:957", "4:959", "7:1051", "4:968"],
      ["4:977", "4:979", "4:980", "4:972", "4:973", "4:975", "7:1056", "4:984"],
      ["4:991", "4:993", "4:994", "4:988", "4:989", null, "7:1061", "4:998"],
    ];
    nodes.forEach(
      ([card, word, meaning, badge, got, met, del, practice], i) => {
        const x = data.lookups[(lookupPage - 1) * 3 + i];
        hide(card, !x);
        if (!x) return;
        text(word, x.word);
        text(meaning, x.meaning);
        text(badge, x.source);
        act(got, "Got it " + x.word, () => {
          update({
            lookups: data.lookups.map((v) =>
              v.id === x.id ? { ...v, got: true } : v,
            ),
          });
          notify("Marked understood");
        });
        if (met)
          act(met, "Met it again " + x.word, () => {
            update({
              lookups: data.lookups.map((v) =>
                v.id === x.id
                  ? { ...v, encounters: (v.encounters || 0) + 1 }
                  : v,
              ),
            });
            notify("Encounter saved");
          });
        act(del, "Delete " + x.word, () => {
          const old = data.lookups;
          update({ lookups: data.lookups.filter((v) => v.id !== x.id) });
          setLookupPage(1);
          notify("Lookup deleted", () => update({ lookups: old }));
        });
        act(practice, "Practise " + x.word, () =>
          setModal({ type: "practice", title: "Practise " + x.word, p: x }),
        );
      },
    );
    const total = Math.max(1, Math.ceil(data.lookups.length / 3));
    [
      ["7:1096", lookupPage - 1],
      ["7:1100", 1],
      ["7:1102", 2],
      ["7:1104", 3],
      ["7:1108", total],
      ["7:1110", lookupPage + 1],
    ].forEach(([id, n]) =>
      act(id, "Page " + n, () =>
        setLookupPage(Math.min(total, Math.max(1, n))),
      ),
    );
    if (!reference) {
      ["7:1102", "7:1104", "7:1106", "7:1108"].forEach((id) =>
        hide(id, total < 2),
      );
      text(
        "7:1114",
        data.lookups.length
          ? `Showing ${(lookupPage - 1) * 3 + 1}–${Math.min(lookupPage * 3, data.lookups.length)} of ${data.lookups.length} lookups`
          : "No lookups yet. Ask about a phrase to save it here.",
      );
    }
  }
  const places = [
    "Hawker centre",
    "MRT · bus",
    "Kopitiam",
    "School",
    "Office",
    "Wet market",
    "Grab · taxi",
    "Void deck",
    "Mall",
  ];
  if (route === "nearby") {
    if (
      data.place !== "Hawker centre" &&
      data.place !== "Kopitiam" &&
      data.place !== "Wet market"
    ) {
      const np = ["MRT · bus", "Grab · taxi"].includes(data.place)
        ? phrases[2]
        : phrases[1];
      text("11:1843", np.word);
      text("11:1844", np.id === "paiseh" ? "/pie-seh/" : "");
      text("11:1845", np.meaning);
      text("11:1839", data.place);
      text("11:1850", np.example);
      patches["11:1785"] = {
        children: <img src={"/assets/" + np.icon} alt="" />,
      };
      text("11:1861", "Paiseh");
      text("11:1862", "/pie-seh/");
      text("11:1863", "A soft, polite apology");
      text("11:1870", "Can or not?");
      text("11:1871", "");
      text("11:1872", "Is it possible or OK?");
    }

    if (!reference)
      text("11:1732", data.settings.location ? "Location on" : "Manual place");
    text(
      "11:1779",
      data.place === "Hawker centre"
        ? "Old Airport Rd Food Centre"
        : data.place,
    );
    if (!data.settings.location && !reference) text("11:1780", "");
    act("11:1781", "Change", () => go("places"));
    act("11:1851", "Got it", () => {
      remember(phrases[0]);
      notify("Chope saved to Moments");
    });
    act("11:1853", "Ask IntentAI", () => {
      go("ask");
      setContext(data.place);
      ask("What does chope mean?");
    });
    ["11:1840", "11:1864", "11:1873"].forEach((id, i) =>
      act(id, "Play " + ["Chope", "Tapau", "Kosong"][i], () =>
        speak(["Chope", "Tapau", "Kosong"][i]),
      ),
    );
  }
  if (route === "places") {
    act("11:1876", "Back", () => go("nearby"));
    act(
      "11:1889",
      "Use my location",
      () => {
        if (data.settings.location) {
          toggle("location");
          return;
        }
        if (!navigator.geolocation) {
          notify("Location unavailable. Pick a place manually.");
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => {
            setData((d) => ({
              ...d,
              settings: { ...d.settings, location: true },
            }));
            notify("Location enabled on this device. Pick a place to explore.");
          },
          () =>
            notify("Location permission unavailable. Pick a place manually."),
        );
      },
      { checked: data.settings.location },
    );
    patches["11:1889"] = {
      children: (
        <img
          src={
            "/assets/" +
            (reference || data.settings.location ? "4028d.svg" : "e1ebf.svg")
          }
          alt=""
        />
      ),
    };
    [
      "11:1895",
      "11:1903",
      "11:1908",
      "11:1913",
      "11:1918",
      "11:1923",
      "11:1928",
      "11:1933",
      "11:1938",
    ].forEach((id, i) => {
      act(id, places[i], () => update({ place: places[i] }), {
        pressed: data.place === places[i],
      });
      select(id, data.place === places[i]);
    });
    hide("11:1900", data.place !== "Hawker centre");
    act("11:1943", "Show phrases", () => go("nearby"));
    if (!reference) {
      text("11:1944", "Show phrases for " + data.place);
      text("11:1945", "Explore the phrases available for this setting");
    }
  }
  if (route === "profile") {
    act("21:1341", "Notices", () => go("notices"));
    [
      ["from", "21:1350", "21:1352", "21:1355", "From"],
      ["time", "21:1361", "21:1363", "21:1366", "In Singapore"],
      ["role", "21:1372", "21:1374", "21:1377", "Here as"],
    ].forEach(([key, id, edit, del, label]) => {
      patches[id] = {
        children: (
          <>
            <span
              style={{
                fontWeight: 400,
                color: "#6b7280",
                lineHeight: "normal",
              }}
            >
              {label}
            </span>
            <span style={{ lineHeight: "normal" }}>
              {" "}
              {data.profile[key] || "Not set"}
            </span>
          </>
        ),
      };
      act(edit, "Edit " + label, () =>
        setModal({
          type: "profile",
          title: "Edit " + label,
          key,
          value: data.profile[key],
        }),
      );
      act(del, "Delete " + label, () => {
        const old = data.profile;
        update({ profile: { ...old, [key]: "" } });
        notify("Detail deleted", () => update({ profile: old }));
      });
    });
    [
      ["21:1389", "daily"],
      ["21:1396", "occasions"],
      ["21:1403", "local"],
      ["21:1410", "rehearse"],
      ["21:1417", "judgement"],
    ].forEach(([id, key]) => sw(id, key));
  }
  function resolve(value) {
    const old = data.notice;
    update({ notice: value });
    go(value);
    notify(value === "confirmed" ? "Confirmed" : "Marked not right", () => {
      update({ notice: old });
      go("notices");
    });
  }
  if (["notices", "confirmed", "rejected"].includes(route)) {
    const n =
      route === "notices"
        ? ["21:1420", "21:1433", "21:1438", "21:1462", "21:1426"]
        : route === "confirmed"
          ? ["21:1467", "21:1480", "21:1485", "21:1500", "21:1473"]
          : ["21:1508", "21:1521", "21:1526", "21:1543", "21:1514"];
    act(n[0], "About you", () => go("profile"));
    act(n[1], "Dismiss local update", () => {
      update({ dismissed: true });
      notify("Notice dismissed", () => update({ dismissed: false }));
    });
    hide(n[4], data.dismissed);
    act(n[2], "See change", () =>
      setModal({
        type: "info",
        title: "A local updated “chope”",
        body: "It also means saving a spot in a queue.",
      }),
    );
    act(n[3], "Delete all my data", () =>
      setModal({ type: "delete", title: "Delete your data?" }),
    );
    if (route === "notices") {
      act("21:1451", "Details", () => go("details"));
      act("21:1454", "Not right", () => resolve("rejected"));
      act("21:1456", "Confirm", () => resolve("confirmed"));
      if (!data.settings.occasions && !reference) hide("21:1440");
      if (data.notice !== "pending" && !reference) {
        text(
          "21:1448",
          data.notice === "confirmed"
            ? "Seating phrases added for Thursday"
            : "We won’t flag events like this",
        );
        text(
          "21:1443",
          data.notice === "confirmed" ? "Confirmed" : "Not right",
        );
        hide("21:1450");
      }
    } else {
      hide(
        route === "confirmed" ? "21:1504" : "21:1547",
        !reference && !toast?.undo,
      );
      act(route === "confirmed" ? "21:1506" : "21:1549", "Undo", () => {
        if (toast?.undo) toast.undo();
        else {
          update({ notice: "pending" });
          go("notices");
        }
        setToast(null);
      });
    }
    if (route === "rejected")
      act("21:1537", "Ask a local instead", () =>
        setModal({ type: "question", title: "Ask a local" }),
      );
  }
  if (route === "details") {
    act("21:1550", "Notices", () => go("notices"));
    ["21:1568", "21:1575"].forEach((id) =>
      act(id, "Edit details", () => {
        setEditValue({ occasion: data.occasion, with: data.with });
        go("edit");
      }),
    );
    text("21:1572", data.occasion);
    text("21:1579", data.with);
    act("21:1584", "Not right", () => resolve("rejected"));
    act("21:1586", "Confirm", () => resolve("confirmed"));
    act("21:1588", "Ask a local", () =>
      setModal({ type: "question", title: "Ask a local" }),
    );
  }
  const [editValue, setEditValue] = useState({
    occasion: data.occasion,
    with: data.with,
  });
  if (route === "edit") {
    ["21:1591", "21:1612"].forEach((id) =>
      act(id, "Cancel", () => go("details")),
    );
    const save = () => {
      update(editValue);
      go("details");
      notify("Details saved");
    };
    act("21:1614", "Save", save);
    [
      ["21:1602", "occasion", "Occasion"],
      ["21:1609", "with", "With"],
    ].forEach(([id, key, label]) => {
      patches[id] = {
        children: (
          <input
            className="live-input"
            aria-label={label}
            value={editValue[key]}
            onChange={(e) =>
              setEditValue((v) => ({ ...v, [key]: e.target.value }))
            }
          />
        ),
      };
    });
    act("19:1262", "Done", save);
    const letters = "qwertyuiopasdfghjklzxcvbnm";
    letters
      .split("")
      .forEach((letter, i) =>
        act("19:" + (1208 + i * 2), letter, () =>
          setEditValue((v) => ({ ...v, with: v.with + letter })),
        ),
      );
    act("19:1260", "Space", () =>
      setEditValue((v) => ({ ...v, with: v.with + " " })),
    );
    act("19:1264", "Numbers", () =>
      notify("Use the editable fields to enter numbers."),
    );
  }
  if (route === "welcome") act("17:73", "Get started", () => go("time"));
  if (route === "time") {
    act("17:90", "Back", () => go("welcome"));
    act("17:133", "Continue", () => go("topics"));
    [
      ["17:99", "Less than 3 months"],
      ["17:106", "3 months – 1 year"],
      ["17:116", "1 – 3 years"],
    ].forEach(([id, value]) => {
      act(id, value, () => update({ duration: value }), {
        pressed: data.duration === value,
      });
      select(id, data.duration === value);
    });
    hide("17:114", data.duration !== "3 months – 1 year");
  }
  if (route === "topics") {
    act("17:149", "Back", () => go("time"));
    [
      ["17:158", "Work"],
      ["17:171", "Food"],
      ["17:183", "Daily life"],
      ["17:193", "Getting around"],
    ].forEach(([id, t]) => {
      act(
        id,
        t,
        () =>
          update({
            topics: data.topics.includes(t)
              ? data.topics.filter((x) => x !== t)
              : [...data.topics, t],
          }),
        { pressed: data.topics.includes(t) },
      );
      select(id, data.topics.includes(t));
    });
    hide("17:165", !data.topics.includes("Work"));
    hide("17:177", !data.topics.includes("Food"));
    text("17:214", `Continue · ${data.topics.length} selected`);
    if (!reference)
      text(
        "17:212",
        `Since you've been here ${data.duration.toLowerCase()}, I'll start with ${data.topics.join(" and ") || "everyday"} basics.`,
      );
    act("17:213", "Continue", () => {
      if (!data.topics.length) {
        notify("Pick at least one topic.");
        return;
      }
      setQuizIndex(0);
      setScore(0);
      setAnswerChoice(0);
      go("quiz");
    });
  }
  const quiz = [
    {
      phrase: "“Paiseh ah, can help me check this report?”",
      answers: [
        "Sorry to trouble you — can you help?",
        "Hurry up and check it now",
        "I'm embarrassed by your report",
      ],
      correct: 0,
    },
    {
      phrase: "“I chope a table first, you go order.”",
      answers: [
        "I will clean the table",
        "I will reserve a table",
        "I will order for you",
      ],
      correct: 1,
    },
    {
      phrase: "“Meet at six, can or not?”",
      answers: [
        "The meeting is cancelled",
        "We must meet at six",
        "Is meeting at six possible?",
      ],
      correct: 2,
    },
  ];
  function check(skip) {
    setScore(
      (s) => s + (!skip && answerChoice === quiz[quizIndex].correct ? 1 : 0),
    );
    if (quizIndex < 2) {
      setQuizIndex(quizIndex + 1);
      setAnswerChoice(null);
    } else go("result");
  }
  if (route === "quiz") {
    act("17:229", "Back", () => go("topics"));
    text("17:238", `Question ${quizIndex + 1} of 3`);
    text("17:253", quiz[quizIndex].phrase);
    ["17:255", "17:259", "17:263"].forEach((id, i) => {
      act(id, "Answer " + "ABC"[i], () => setAnswerChoice(i), {
        pressed: answerChoice === i,
      });
      select(id, answerChoice === i);
    });
    ["17:258", "17:262", "17:266"].forEach((id, i) =>
      text(id, quiz[quizIndex].answers[i]),
    );
    act("17:249", "Play question", () => speak(quiz[quizIndex].phrase));
    act("17:267", "Skip this one", () => check(true));
    act("17:268", "Check answer", () => {
      if (answerChoice === null) {
        notify("Choose an answer or skip.");
        return;
      }
      check(false);
    });
  }
  if (route === "result") {
    const level =
      score === 3 ? "Experienced" : score === 2 ? "Intermediate" : "Beginner";
    if (!reference) {
      patches["17:290"] = {
        children: (
          <>
            You're <span style={{ color: "#e4671f" }}>{level}</span>
          </>
        ),
        style: { lineHeight: "36px" },
      };
      text(
        "17:291",
        `${score} of 3 correct — we'll tailor your daily phrases to your level.`,
      );
      text("17:295", `${score}/3`);
      text("17:318", "Focus: " + data.topics.join(" & "));
      text("17:325", "Tuned for " + data.duration);
    }
    if (!reference) {
      ["17:296", "17:299", "17:302"].forEach(
        (id, i) =>
          (patches[id] = {
            style: {
              backgroundColor: i < Math.max(1, score) ? "#e4671f" : "#f3d5c0",
            },
          }),
      );
      ["17:297", "17:300", "17:303"].forEach(
        (id, i) =>
          (patches[id] = {
            style: {
              color:
                i === (score === 3 ? 2 : score === 2 ? 1 : 0)
                  ? "#e4671f"
                  : "#9ca3af",
            },
          }),
      );
    }
    act("17:336", "Retake the quiz", () => {
      setQuizIndex(0);
      setScore(0);
      setAnswerChoice(0);
      go("quiz");
    });
    act("17:337", "Start learning", () => {
      update({
        done: true,
        profile: {
          ...data.profile,
          time: data.duration,
          level,
          topics: data.topics,
        },
      });
      go("home");
    });
  }
  const Screen = screens[routes[route]],
    scale = Math.min(1, width / 390);
  function formSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      value = String(f.get("value") || "").trim();
    if (modal.type === "profile")
      update({ profile: { ...data.profile, [modal.key]: value } });
    if (modal.type === "context") setContext(value);
    if (modal.type === "report")
      update({
        reports: [
          ...(data.reports || []),
          { answer: chat?.answer || phrases[0].meaning, reason: value },
        ],
      });
    if (modal.type === "question")
      update({
        questions: [
          {
            id: crypto.randomUUID(),
            text: value,
            detail: value,
            context: String(f.get("context") || context),
            status: "Pending",
          },
          ...data.questions,
        ],
      });
    if (["questionContext", "localAnswer"].includes(modal.type))
      update({
        questions: data.questions.map((q) =>
          q.id === modal.q.id
            ? modal.type === "localAnswer"
              ? { ...q, status: "Answered", answer: value }
              : { ...q, detail: q.detail + "\n" + value }
            : q,
        ),
      });
    setModal(null);
    notify("Saved on this device");
    if (["question", "questionContext", "localAnswer"].includes(modal.type))
      go("community");
  }
  return (
    <>
      <div className="design-viewport" style={{ height: 844 * scale }}>
        <div
          className="design-screen"
          data-screen={route}
          style={{ transform: `scale(${scale})` }}
        >
          <Screen actions={actions} patches={patches} navigate={navigate} />
        </div>
      </div>
      {toast && !["confirmed", "rejected"].includes(route) && (
        <div className="design-toast" role="status">
          {toast.message}
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
      {modal && (
        <Dialog title={modal.title} close={() => setModal(null)}>
          {[
            "profile",
            "context",
            "report",
            "question",
            "questionContext",
            "localAnswer",
          ].includes(modal.type) && (
            <form onSubmit={formSubmit}>
              {["question", "localAnswer", "questionContext"].includes(
                modal.type,
              ) && (
                <p>
                  Your name is not attached. This prototype saves on this device
                  and does not send to a live community.
                </p>
              )}
              <label>
                {modal.type === "context"
                  ? "Where did you hear it?"
                  : modal.type === "profile"
                    ? modal.title
                    : modal.type === "report"
                      ? "What seems wrong?"
                      : "Your message"}
                {modal.type === "context" ? (
                  <select name="value" defaultValue={context}>
                    {[
                      "group chat · classmates",
                      "Office · work",
                      "Hawker centre · lunch",
                      "MRT · commute",
                      "At home · friends",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                ) : modal.type === "profile" ? (
                  <input
                    name="value"
                    defaultValue={modal.value}
                    required
                    maxLength={60}
                  />
                ) : (
                  <textarea name="value" required maxLength={1000} />
                )}
              </label>
              {modal.type === "question" && (
                <label>
                  Where did you hear it?
                  <input name="context" defaultValue={context} />
                </label>
              )}
              <button className="primary">Save</button>
            </form>
          )}
          {modal.type === "phrase" && (
            <>
              <p>{modal.p.meaning}</p>
              <blockquote>{modal.p.example}</blockquote>
              <div className="dialog-row">
                <button className="outline" onClick={() => speak(modal.p.word)}>
                  Hear it
                </button>
                <button
                  className="outline"
                  onClick={() =>
                    update({
                      saved: data.saved.includes(modal.p.id)
                        ? data.saved.filter((x) => x !== modal.p.id)
                        : [...data.saved, modal.p.id],
                    })
                  }
                >
                  {data.saved.includes(modal.p.id)
                    ? "Unsave"
                    : "Save expression"}
                </button>
              </div>
              <div className="dialog-row">
                <button
                  className="primary"
                  onClick={() => {
                    learn(modal.p);
                    setModal(null);
                  }}
                >
                  Mark as learned
                </button>
                <button
                  className="outline"
                  onClick={() =>
                    setModal({ type: "question", title: "Ask a local" })
                  }
                >
                  Ask a local
                </button>
              </div>
            </>
          )}
          {modal.type === "practice" && (
            <>
              <p>{modal.p.meaning}</p>
              <button className="outline" onClick={() => speak(modal.p.word)}>
                Hear it
              </button>
              <label>
                Your example
                <textarea placeholder="Try the phrase in a sentence…" />
              </label>
              <button
                className="primary"
                onClick={() => {
                  setModal(null);
                  notify("Practice complete");
                }}
              >
                Done
              </button>
            </>
          )}
          {modal.type === "complete" && (
            <>
              <p>
                You've learned today's three expressions. Try one in your next
                conversation.
              </p>
              <button className="primary" onClick={() => go("moments")}>
                View your lookups
              </button>
            </>
          )}
          {modal.type === "delete" && (
            <>
              <p>
                Delete your profile, settings, questions, lookups and learning
                progress from this device?
              </p>
              <button
                className="primary"
                onClick={() => {
                  try {
                    Object.keys(localStorage)
                      .filter((k) => k.startsWith("singlish-"))
                      .forEach((k) => localStorage.removeItem(k));
                  } catch {}
                  setData({
                    ...initial,
                    profile: { from: "", time: "", role: "" },
                    lookups: [],
                    questions: [],
                  });
                  go("welcome");
                }}
              >
                Delete all my data
              </button>
            </>
          )}
          {modal.type === "info" && <p>{modal.body}</p>}
          {modal.type === "chatMenu" && (
            <div className="dialog-row">
              <button
                className="outline"
                onClick={() => {
                  setChat(null);
                  setDraft("");
                  setModal(null);
                }}
              >
                Clear chat
              </button>
              <button className="outline" onClick={() => go("welcome")}>
                Personalise setup
              </button>
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
