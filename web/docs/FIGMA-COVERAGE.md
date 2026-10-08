# Figma coverage — Week 7

Reference file: [Week 7](https://www.figma.com/design/aAPocY386mzfKwK5nqjGkB/Week-7).

The complete document structure was read with the Figma Plugin API, rather than relying on the metadata tool's incomplete initial page listing. All seven pages, page notes, and 19 main screen contexts and screenshots were inspected. The React implementation uses the original local images/SVGs, Inter, colors, dimensions, and layout. It preserves the 390 × 844 reference frame, including simulated device chrome, and scales the frame for narrower browsers. The earlier desktop dashboard redesign has been removed.

| Page | Screen/node | Implemented flow | Screenshot |
| --- | --- | --- | --- |
| 1 Home | Overview `1:2` | Start, details, speech, streak, notifications, Nearby | [Home](screenshots/home.png) |
| 1 Home | Lesson `1:340` | Three-step lesson, progress persistence, completion | [Lesson](screenshots/lesson.png) |
| 2 Ask | Chat `2:429` | Context selection, input, speech recognition when supported, copy, feedback, regenerate, report, examples, new chat | [Ask](screenshots/ask.png) |
| 3 Community | My questions `3:728` | Anonymous questions, pending/answered states, local-answer switch | [Community](screenshots/community.png) |
| 3 Community | Question detail `7:1119` | Context addition, withdrawal/undo, locally entered answers | [Question](screenshots/question.png) |
| 4 Moments | Every lookup `4:919` | History, source labels, daily-card switch, understood/re-encountered state, delete/undo, practice, pagination | [Moments](screenshots/moments.png) |
| 5 Nearby | Heads up `11:1414` | Manual place context, phrase playback, learning, Ask | [Nearby](screenshots/nearby.png) |
| 5 Nearby | Place selector `11:1571` | Nine selectable contexts; browser location permission, off by default | [Places](screenshots/places.png) |
| 6 My Space | About you `12:40` | Three editable/deletable profile fields, undo, five persisted switches, all initially off | [Profile](screenshots/profile.png) |
| 6 My Space | Notices `12:182` | Local update, dismiss/undo, AI notice gated by Flag occasions, delete device data | [Notices](screenshots/notices.png) |
| 6 My Space | Details `14:512` | Explanation, editable occasion/people, confirm/reject, Ask a local | [Details](screenshots/details.png) |
| 6 My Space | Edit `19:1107` | Editable fields, reference keyboard, save/cancel | [Edit](screenshots/edit.png) |
| 6 My Space | Confirmed `14:730` | Confirmed state with undo | [Confirmed](screenshots/confirmed.png) |
| 6 My Space | Not right `14:850` | Rejected state with undo and local-question action | [Rejected](screenshots/rejected.png) |
| 7 Onboarding | Welcome `17:45` | Get started | [Welcome](screenshots/welcome.png) |
| 7 Onboarding | Time in SG `17:77` | Three choices, back/continue | [Time](screenshots/time.png) |
| 7 Onboarding | Topics `17:136` | Multiple choices and selection count | [Topics](screenshots/topics.png) |
| 7 Onboarding | Singlish check `17:216` | Three questions, answer/skip, scoring, audio | [Quiz](screenshots/quiz.png) |
| 7 Onboarding | Result `17:271` | 0–1 Beginner / 2 Intermediate / 3 Experienced, interests/time plan, retake, start | [Result](screenshots/result.png) |

## Validation and state

Nine Playwright tests cover every screen's image loading, runtime errors, reference geometry, all major flows, persistence, and overflow at 320px, 390px and desktop widths. Screenshots in this directory show the supplied reference states: for example Flag occasions and location enabled, 24 lookups, and an Intermediate result. Normal first-run switches start off, and real counts and result values follow local state rather than those sample numbers.

Original SVG dimensions and design slots are retained. `figma-screens.json` maps every screen to its Figma node, component and local assets. Reference CSS is plain CSS adapted to this project's React/Vite stack; Tailwind is not installed.

## Services not connected

This is a local interactive prototype. AI explanations use a small local phrase set; reports and community questions/answers are stored on the device, not submitted to a server. Calendar notices, local confirmations, map graphics, distance, and streak are supplied design samples. The location switch requests browser permission but does not perform live venue lookup. Browser speech recognition/playback depends on device support. Real AI, community moderation/notifications, calendar integration and venue lookup require separately configured services. They are not claimed as complete integrations.

The native SwiftUI app remains the earlier Home prototype. This restoration implements all seven pages in the React web app; it does not claim the native app has this expanded coverage.
