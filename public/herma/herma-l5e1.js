// ver1.1_26.02.22
// herma-l5e1_v6.js (L5-E1: 원문 단어 클릭 → 아래 슬롯에 끼우기 + p.p 변환)
// ------------------------------------------------------------
// ✅ 핵심 변경(요청 반영):
// - '새 단어뱅크' 만들지 않음.
// - 원본 문장 자체를 토큰화해서, 그걸 클릭하면 아래 문장 슬롯에 끼워넣음.
// - p.p가 필요한 경우(불규칙 변화) → 원문 동사 토큰 하이라이트.
//   동사를 슬롯에 넣은 뒤, 그 단어를 한 번 더 누르면 p.p로 변환 + shake.
// - 아래 문장에는 head noun(예: sushi)와 (that/that was/that were) 같은 괄호구간을 흐리게 고정(던져둠).
//
// 데이터: /LTRYI-herma-lesson-questions.xlsx
// Lesson 5 / Exercise 1
// Answer 예: "the sushi (that) Kevin ate – 케빈이 먹은 초밥"
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 5;
const TARGET_EXERCISE = 1;



// ---- Irregular verb helper (past -> past participle) ----
// 목적: ppCandidate(정답 p.p)를 기준으로 원문에서 '진짜 동사'를 잡아내기.
// 예: sang -> sung, wrote -> written, ate -> eaten ...
const IRREG_PAST_TO_PP = {
  "ate":"eaten","became":"become","began":"begun","bent":"bent","blew":"blown","bought":"bought","broke":"broken",
  "brought":"brought","built":"built","came":"come","chose":"chosen","did":"done","drew":"drawn","drank":"drunk",
  "drove":"driven","fell":"fallen","felt":"felt","flew":"flown","forgot":"forgotten","forgave":"forgiven",
  "froze":"frozen","gave":"given","got":"gotten","grew":"grown","had":"had","heard":"heard","held":"held","hid":"hidden",
  "hit":"hit","kept":"kept","knew":"known","left":"left","lost":"lost","made":"made","met":"met","paid":"paid",
  "ran":"run","read":"read","rode":"ridden","rang":"rung","rose":"risen","said":"said","sang":"sung","sat":"sat",
  "saw":"seen","sent":"sent","shook":"shaken","shot":"shot","slept":"slept","spoke":"spoken","spent":"spent",
  "stood":"stood","stole":"stolen","swam":"swum","taught":"taught","took":"taken","told":"told","thought":"thought",
  "threw":"thrown","understood":"understood","wore":"worn","went":"gone","won":"won","wrote":"written"
};

let subcategory = "Grammar";
let level = "Basic";
let day = "118";
let quizTitle = "quiz_Grammar_Basic_118";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;
let stage = "rewrite"; // rewrite | translate
let isKoLocked = false;
let stage1Solved = false;

let translateMode = false;
let bankTokens = [];
let selectedTokens = [];
let droppedWords = [];
let activeDropIndex = 0;

// build-state
let srcTokens = [];      // [{id, display, clean, lower, used, verb, ppText}]
let slots = [];          // [{kind:'fixed'|'slot', text, faded, expectedLower, fillRule, filled, fromTokenId, canPP, ppText, ppApplied}]
let selectedSlotIndex = -1;
let moveHistory = [];    // stack: {slotIndex, tokenId, prevSlotText, prevPpApplied}

// grading
let englishRegex = null;
let englishAnswerRaw = "";
let koreanAnswerRaw = "";
let finalKoTargetRaw = "";
let rewritePlan = null;
let stopDragTipArc = null;
let hasFirstDragDone = false;
let finalUseOriginal = false;
let finalOriginalKoRaw = "";
let finalFlippedKoRaw = "";

const UI_INST_REVERSE = "\uBB38\uC7A5\uC744 \uB4A4\uC9D1\uC5B4\uBD05\uC2DC\uB2E4!";
const UI_LABEL_ORIGINAL = "\uC6D0\uBB38\uC7A5";
const UI_LABEL_PARAPHRASE = "\uB4A4\uC9D1\uC73C\uBA74...";

const ORIG_KO_BY_QUESTION = {
  "Kevin ate sushi.": "\ucf00\ube48\uc740 \ucd08\ubc25\uc744 \uba39\uc5c8\uc2b5\ub2c8\ub2e4.",
  "The teacher asked questions in class.": "\uc120\uc0dd\ub2d8\uaed8\uc11c \uc218\uc5c5\uc2dc\uac04\uc5d0 \uc9c8\ubb38\uc744 \ud558\uc168\uc2b5\ub2c8\ub2e4.",
  "The company released a new product.": "\ud68c\uc0ac\uc5d0\uc11c \uc2e0\uc81c\ud488\uc744 \ucd9c\uc2dc\ud588\uc2b5\ub2c8\ub2e4.",
  "Many people visited the museum yesterday.": "\uc5b4\uc81c \ub9ce\uc740 \uc0ac\ub78c\ub4e4\uc774 \ubc15\ubb3c\uad00\uc744 \ubc29\ubb38\ud588\uc2b5\ub2c8\ub2e4.",
  "She wrote a letter to her friend.": "\uadf8\ub140\ub294 \uce5c\uad6c\uc5d0\uac8c \ud3b8\uc9c0\ub97c \uc37c\uc2b5\ub2c8\ub2e4.",
  "They built a bridge over the river.": "\uadf8\ub4e4\uc740 \uac15 \uc704\uc5d0 \ub2e4\ub9ac\ub97c \uac74\uc124\ud588\uc2b5\ub2c8\ub2e4.",
  "He solved the problem quickly.": "\uadf8\ub294 \ubb38\uc81c\ub97c \ube68\ub9ac \ud574\uacb0\ud588\uc2b5\ub2c8\ub2e4.",
  "The students completed the project on time.": "\ud559\uc0dd\ub4e4\uc740 \uc81c\uc2dc\uac04\uc5d0 \ud504\ub85c\uc81d\ud2b8\ub97c \uc644\ub8cc\ud588\uc2b5\ub2c8\ub2e4.",
  "The singer sang a song at the concert.": "\uadf8 \uac00\uc218\ub294 \ucf58\uc11c\ud2b8\uc5d0\uc11c \ub178\ub798\ub97c \ubd88\ub800\ub2e4.",
  "The storm damaged many houses.": "\ud3ed\ud48d\uc73c\ub85c \uc778\ud574 \ub9ce\uc740 \uc9d1\uc774 \ud30c\uc190\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
  "My friend recommended this restaurant.": "\ub0b4 \uce5c\uad6c\uac00 \uc774 \uc2dd\ub2f9\uc744 \ucd94\ucc9c\ud588\uc5b4\uc694.",
  "The manager canceled the meeting.": "\uad00\ub9ac\uc790\uac00 \ud68c\uc758\ub97c \ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4.",
  "The child broke the window.": "\uc544\uc774\uac00 \ucc3d\ubb38\uc744 \uae68\ub728\ub838\uc2b5\ub2c8\ub2e4.",
  "The writer published a novel last year.": "\uc791\uac00\ub294 \uc9c0\ub09c\ud574 \uc18c\uc124\uc744 \ucd9c\uac04\ud588\ub2e4.",
  "The doctor explained the plan to the patient.": "\uc758\uc0ac\ub294 \ud658\uc790\uc5d0\uac8c \uacc4\ud68d\uc744 \uc124\uba85\ud588\ub2e4.",
  "They changed the schedule at the last minute.": "\uadf8\ub4e4\uc740 \ub9c8\uc9c0\ub9c9 \uc21c\uac04\uc5d0 \uc77c\uc815\uc744 \ubcc0\uacbd\ud588\uc2b5\ub2c8\ub2e4.",
  "Someone left a message on your desk.": "\ub204\uad70\uac00 \ub2f9\uc2e0\uc758 \ucc45\uc0c1 \uc704\uc5d0 \uba54\uc2dc\uc9c0\ub97c \ub0a8\uacbc\uc2b5\ub2c8\ub2e4.",
  "The company hired three new employees.": "\ud68c\uc0ac\ub294 \uc138 \uba85\uc758 \uc0c8\ub85c\uc6b4 \uc9c1\uc6d0\uc744 \uace0\uc6a9\ud588\uc2b5\ub2c8\ub2e4.",
  "The teacher corrected the test papers.": "\uc120\uc0dd\ub2d8\uc774 \uc2dc\ud5d8\uc9c0\ub97c \uad50\uc815\ud574 \uc8fc\uc168\uc5b4\uc694.",
  "The police found the missing child.": "\uacbd\ucc30\uc774 \uc2e4\uc885\ub41c \uc544\uc774\ub97c \ucc3e\uc544\ub0c8\uc2b5\ub2c8\ub2e4.",
};

window.addEventListener("DOMContentLoaded", async () => {  var __r2_guard = (new URLSearchParams(window.location.search || "")).get("round2") === "1";
  if (__r2_guard) return;
  applyQueryParams();
  wireBackButton();
  injectStyles();

  try {
    rawRows = await loadExcelRows(EXCEL_FILE);
  } catch (e) {
    console.error(e);
    alert("엑셀 파일을 불러오지 못했습니다.\n" + EXCEL_FILE);
    return;
  }

  buildQuestionsFromRows();
  renderIntro();
});

/** ================== Params / Nav ================== */
function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get("key");
  const id = params.get("id");
  if (id) userId = id;

  if (key) {
    quizTitle = key;
    const parts = key.split("_");
    if (parts.length >= 4) {
      subcategory = parts[1] || subcategory;
      level = parts[2] || level;
      day = parts[3] || day;
    }
  } else {
    quizTitle = `quiz_${subcategory}_${level}_${day}`;
  }
}
function wireBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;
  backBtn.addEventListener("click", () => history.back());
}

/** ================== Styles ================== */
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --ink:#7e3106;
      --warm:#fff3e0;
      --line: rgba(0,0,0,0.10);

      --slot: rgba(126,49,6,0.035);
      --slot2: rgba(126,49,6,0.055);
      --slotBorder: rgba(126,49,6,0.18);

      --pp: #2b6cb0;
      --ok:#2e7d32;
      --no:#c62828;
    }
    .hidden{ display:none !important; }

    .stage-pill{
      display:inline-block;
      font-size:12px;
      padding:6px 10px;
      border-radius:999px;
      font-weight:900;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      margin-bottom:10px;
    }

    /* source sentence tokens */
    .src-sentence{
      line-height: 1.9;
      font-size: 15px;
      font-weight: 900;
      color: #222;
      word-break: keep-all;
    }
    .srcTok{
      display:inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.12);
      background: #fff;
      margin: 3px 4px 3px 0;
      cursor: pointer;
      user-select:none;
      transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
    }
    .srcTok:hover{ transform: translateY(-0.5px); }
    .srcTok.used{
      opacity: .78;
      cursor: not-allowed;
      transform:none;
      background: rgba(233,199,167,0.35);
      border-color: rgba(233,199,167,0.90);
      color: rgba(126,49,6,0.70);
    }
    .srcTok.nope{
      box-shadow: 0 0 0 3px rgba(198,40,40,0.12);
      background: rgba(198,40,40,0.06);
    }
    .srcTok.verb{
      border-color: rgba(241,123,42,0.85);
      box-shadow: 0 0 0 2px rgba(241,123,42,0.12);
      background: rgba(241,123,42,0.10);
      color: #7e3106;
    }

    /* target line */
    .target-wrap{
      margin-top:10px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.08);
      background: rgba(255,255,255,0.92);
    }
    .target-line{
      line-height: 2.0;
      font-size: 15px;
      font-weight: 900;
      color: #222;
      word-break: keep-all;
    }

    .fixed{
      display:inline-block;
      padding:2px 6px;
      border-radius:10px;
      background: rgba(255, 243, 196, 0.95);
      border:1px solid rgba(233,199,167,0.90);
      color:#7e3106;
      font-weight:900;
      margin: 0 2px;
      box-shadow: 0 1px 0 rgba(0,0,0,0.02) inset;
    }
    .fixed.faded{
      opacity: .78;
      filter: none;
      background: rgba(255, 243, 196, 0.65);
      border-color: rgba(233,199,167,0.65);
      color: rgba(126,49,6,0.85);
    }

    .slot{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width: 34px;
      height: 28px;
      padding: 0 10px;
      border-radius: 12px;
      border: 1px dashed var(--slotBorder);
      background: var(--slot);
      margin: 0 3px;
      vertical-align: middle;
      cursor: pointer;
      position: relative;
      overflow: visible;
      transition: background .12s ease, transform .12s ease, box-shadow .12s ease;
    }
    .slot:hover{
      background: var(--slot2);
      transform: translateY(-0.5px);
    }
    .slot.selected{
      box-shadow: 0 0 0 3px rgba(126,49,6,0.10);
    }
    .slot.filled{
      border-style: solid;
      border-color: rgba(198,40,40,0.22);
      background: rgba(198,40,40,0.06);
    }
    .slot.bad{
      box-shadow: 0 0 0 3px rgba(198,40,40,0.10);
      background: rgba(198,40,40,0.06);
    }

    .ghost{
      opacity: .25;
      font-weight: 900;
    }
    .verb-slot.filled{
      border-color: rgba(241,123,42,0.75) !important;
      background: rgba(241,123,42,0.10) !important;
      box-shadow: 0 0 0 2px rgba(241,123,42,0.10);
    }



    .meaning-line{
      margin-top: 10px;
      padding: 0;
      border: none;
      background: transparent;
      line-height: 1.95;
      font-size: 15px;
      font-weight: 900;
      color: #222;
      word-break: keep-all;
    }
    .meaning-label{
      display:inline;
      margin-right:4px;
      padding:0;
      border:none;
      border-radius:0;
      background:transparent;
      color:inherit;
      font-weight:inherit;
      font-size:inherit;
      vertical-align:baseline;
    }
    .pp-pending{
      border-color: rgba(241,123,42,0.70) !important;
      box-shadow: 0 0 0 2px rgba(241,123,42,0.12);
      animation: ppPulse 0.95s ease-in-out infinite;
    }
    .pp-done{
      border-color: rgba(212,175,55,0.85) !important;
      background: linear-gradient(180deg, rgba(255, 244, 210, 0.92) 0%, rgba(255, 235, 170, 0.58) 100%);
      box-shadow: 0 0 0 2px rgba(212,175,55,0.16), 0 8px 18px rgba(212,175,55,0.14);
    }

    .shake{ animation: shake .26s cubic-bezier(.2,.8,.2,1) both; }
    
    @keyframes ppPulse{
      0%, 100%{ transform: translateY(0); box-shadow: 0 0 0 2px rgba(241,123,42,0.10); }
      50%{ transform: translateY(-0.6px); box-shadow: 0 0 0 4px rgba(241,123,42,0.14); }
    }


    .pp-bang{
      animation: ppBang 320ms cubic-bezier(.15, 1.25, .25, 1) both;
    }
    @keyframes ppBang{
      0%{ transform: scale(1); }
      35%{ transform: scale(1.18) rotate(-1.2deg); }
      70%{ transform: scale(0.98) rotate(0.6deg); }
      100%{ transform: scale(1); }
    }
    .pp-float{
      position:absolute;
      right:-6px;
      top:-12px;
      font-size:11px;
      font-weight:900;
      letter-spacing:0.2px;
      color: rgba(126,49,6,0.45);
      text-shadow: 0 10px 16px rgba(0,0,0,0.10);
      filter: blur(0.1px);
      transform: rotate(-10deg);
      pointer-events:none;
      animation: ppFloat 760ms ease-out forwards;
    }
    @keyframes ppFloat{
      0%{ opacity:0; transform: translateY(2px) scale(0.96) rotate(-10deg); }
      22%{ opacity:0.55; }
      100%{ opacity:0; transform: translateY(-16px) scale(1.10) rotate(-10deg); }
    }

@keyframes shake{
      0%{ transform: translateX(0) rotate(0deg); }
      20%{ transform: translateX(-2px) rotate(-1deg); }
      40%{ transform: translateX(2px) rotate(1deg); }
      60%{ transform: translateX(-1px) rotate(-0.5deg); }
      80%{ transform: translateX(1px) rotate(0.5deg); }
      100%{ transform: translateX(0) rotate(0deg); }
    }

    .controls{ display:flex; gap:8px; margin-top:10px; }
    .mini-btn{
      flex:1;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      font-weight:900;
      cursor:pointer;
    }
    .mini-btn:disabled{ opacity:.45; cursor:not-allowed; }

    .translate-btn{
      width:100%;
      margin-top:10px;
      padding:10px 12px;
      border:none;
      border-radius:12px;
      background: var(--ink);
      color:#fff;
      font-weight:900;
      cursor:pointer;
    }
    .translate-btn:disabled{ opacity:.45; cursor:not-allowed; }

    /* translate block */
    .answer-line{
      min-height:44px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.10);
      background:#fff;
      line-height:1.6;
      font-size:15px;
    }
    .pill-btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:8px 10px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      font-weight:800;
      font-size:14px;
      cursor:pointer;
      user-select:none;
      margin:6px 6px 0 0;
    }
    .pill-btn:disabled{ opacity:0.35; cursor:not-allowed; }

    .ok{ font-weight:900; font-size:18px; color: var(--ok); text-align:center; }
    .no{ font-weight:900; font-size:18px; color: var(--no); text-align:center; }

    /* head noun drop */
    .drop{ animation: drop .32s cubic-bezier(.2,.9,.2,1) both; }
    @keyframes drop{
      from{ transform: translateY(-6px) scale(.98); opacity: 0; }
      to{ transform: translateY(0) scale(1); opacity: 1; }
    }

    .inst-simple{
      font-weight:900;
      color:#7e3106;
      line-height:1.6;
    }
    .head-hl{
      display:inline-block;
      border-radius:8px;
      padding:0 5px;
      background: rgba(255, 208, 90, 0.42);
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight:900;
    }
    .head-group{
      display:inline-block;
      border-radius:10px;
      padding:1px 8px;
      background: rgba(255, 208, 90, 0.42);
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight:900;
      white-space: nowrap;
    }
    .strike-rel{
      text-decoration: line-through;
      text-decoration-thickness: 1.6px;
      text-decoration-color: rgba(126,49,6,0.75);
      opacity: .86;
    }
    .drag-source,
    .drag-source-word{
      display:inline;
      border:none;
      border-radius:0;
      padding:0;
      background:transparent;
      color:inherit;
      font-weight:inherit;
      cursor: grab;
      user-select:none;
      text-decoration: underline;
      text-decoration-thickness: 1.5px;
      text-decoration-style: dashed;
      text-decoration-color: rgba(241,123,42,0.78);
      transition: color .12s ease, opacity .12s ease;
    }
    .drag-source:hover,
    .drag-source-word:hover{
      color:#b45716;
    }
    .drag-source.dragging,
    .drag-source-word.dragging{
      opacity:.42;
      cursor:grabbing;
    }
    .drag-source-word.used-ghost{
      opacity:.22;
      color: rgba(0,0,0,0.42);
      text-decoration-color: rgba(241,123,42,0.30);
    }
    .rewrite-line{
      line-height:1.95;
      font-size:15px;
      font-weight:900;
      color:#222;
      word-break: keep-all;
    }
    .plain-meaning{
      margin-top:6px;
      line-height:1.7;
      font-size:14px;
      font-weight:400;
      color:#444;
      word-break: keep-all;
    }
    .drop-clause{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width: 96px;
      min-height: 30px;
      padding: 0 10px;
      border-radius: 12px;
      border: 1.5px dashed rgba(70,140,255,0.55);
      background: rgba(70,140,255,0.08);
      color:#1f4fb8;
      vertical-align:middle;
      transition: box-shadow .15s ease, border-color .15s ease, background .15s ease;
    }
    .drop-clause.empty{
      opacity:.8;
      font-weight:800;
    }
    .drop-clause.over{
      border-color: rgba(70,140,255,0.82);
      box-shadow: 0 0 0 2px rgba(70,140,255,0.14);
      background: rgba(70,140,255,0.14);
    }
    .drop-clause.filled{
      border-style: solid;
      background: rgba(70,140,255,0.16);
      color:#113a9a;
    }
    .drop-word-slot{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width: 42px;
      min-height: 30px;
      padding: 0 10px;
      border-radius: 12px;
      border: 1.5px dashed rgba(70,140,255,0.55);
      background: rgba(70,140,255,0.08);
      color:#1f4fb8;
      vertical-align:middle;
      margin-right: 4px;
      transition: box-shadow .15s ease, border-color .15s ease, background .15s ease;
    }
    .drop-word-slot.empty{
      opacity:.8;
      font-weight:800;
    }
    .drop-word-slot.active{
      border-color: rgba(70,140,255,0.9);
      box-shadow: 0 0 0 2px rgba(70,140,255,0.18);
    }
    .drop-word-slot.over{
      border-color: rgba(70,140,255,0.82);
      box-shadow: 0 0 0 2px rgba(70,140,255,0.14);
      background: rgba(70,140,255,0.14);
    }
    .drop-word-slot.filled{
      border-style: solid;
      background: rgba(70,140,255,0.16);
      color:#113a9a;
    }
    .drag-tip-fly{
      position: fixed;
      left: 0;
      top: 0;
      font-size: 11px;
      font-weight: 900;
      color: #1f4fb8;
      background: rgba(70,140,255,0.14);
      border: 1px solid rgba(70,140,255,0.42);
      border-radius: 999px;
      padding: 2px 7px;
      user-select: none;
      pointer-events: none;
      white-space: nowrap;
      z-index: 9999;
      opacity: .95;
      transform: translate3d(-9999px,-9999px,0);
    }

    .dual-bank-wrap{
      display:flex;
      flex-direction:column;
      gap:8px;
    }
    .dual-bank-row{
      display:flex;
      flex-wrap:wrap;
      align-items:flex-start;
      gap:5px;
      min-height:34px;
    }
    .dual-bank-divider{
      height:1px;
      border-top: 1px dashed rgba(0,0,0,0.22);
      margin: 1px 0;
    }
    .dual-token{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 8px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.14);
      background:#fff;
      font-weight:900;
      font-size:12px;
      cursor:pointer;
      user-select:none;
      line-height:1.2;
    }
    .dual-token:disabled{
      opacity:.35;
      cursor:not-allowed;
    }
    .dual-token.original{
      border-color: rgba(241,123,42,0.82);
      background: rgba(241,123,42,0.11);
      color:#7e3106;
    }
    .dual-token.flipped{
      border-color: rgba(70,140,255,0.8);
      background: rgba(70,140,255,0.10);
      color:#1f4fb8;
    }
  `;
  document.head.appendChild(style);
}

/** ================== Load Excel ================== */
async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();

  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows.filter((r) => !isRowAllEmpty(r));
}
function isRowAllEmpty(row) {
  const keys = Object.keys(row || {});
  if (!keys.length) return true;
  return keys.every((k) => String(row[k] ?? "").trim() === "");
}

/** ================== Build Questions ================== */
function buildQuestionsFromRows() {
  const filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  questions = filtered.map((r, idx) => {
    const qNumber = Number(r["QNumber"]) || idx + 1;
    const title = String(r["Title"] ?? "").trim();
    const instruction = String(r["Instruction"] ?? "").trim();
    const questionRaw = String(r["Question"] ?? "").trim();
    const answerRaw = String(r["Answer"] ?? "").trim();

    const { english, korean } = splitEnglishAndKoreanByDash(answerRaw);

    return {
      qNumber,
      title,
      instruction,
      questionRaw,
      englishAnswer: english,
      koreanAnswer: korean,
    };
  });
}

function splitEnglishAndKoreanByDash(answerRaw) {
  const s = String(answerRaw || "").trim();

  const m = s.match(/\s[–—]\s/);
  if (m) {
    const idx = m.index;
    const english = stripTrailingPunct(s.slice(0, idx).trim());
    const korean = s.slice(idx + m[0].length).trim();
    return { english, korean };
  }
  const idx2 = s.indexOf(" - ");
  if (idx2 !== -1) {
    const english = stripTrailingPunct(s.slice(0, idx2).trim());
    const korean = s.slice(idx2 + 3).trim();
    return { english, korean };
  }

  return { english: stripTrailingPunct(s), korean: "" };
}

/** ================== Intro ================== */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L5-E1";
  const instruction =
    questions[0]?.instruction ||
    "각 문장을 ‘~한 ~ / ~된 ~’ 구조의 명사구로 바꾸고, 그 명사구를 해석해보세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L5-E1</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106; line-height:1.6;">
        📝 ${escapeHtml(instruction)}
      </div>

      <div style="margin-top:10px; font-size:12px; color:#555; line-height:1.6;">
        (원문 단어를 눌러 아래 슬롯을 채우세요. <br/>
        <b>p.p 표시된 동사</b>는 슬롯에 넣은 뒤 그 단어를 <b>한 번 더</b> 누르면 p.p로 변합니다.)
      </div>

      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">🚀 시작</button>
    </div>
  `;
}

function startQuiz() {
  if (!questions.length) {
    alert("해당 Lesson/Exercise에 문제가 없습니다.");
    return;
  }
  currentIndex = 0;
  results = [];
  renderQuestion();
}

/** ================== Main Render ================== */
function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  isAnswered = false;
  stage = "rewrite";
  isKoLocked = false;
  stage1Solved = false;
  hasFirstDragDone = false;
  finalUseOriginal = Math.random() < 0.5;
  finalOriginalKoRaw = "";
  finalFlippedKoRaw = "";
  stopDragTipArcHint();

  translateMode = false;
  bankTokens = [];
  selectedTokens = [];
  moveHistory = [];
  selectedSlotIndex = -1;
  englishAnswerRaw = String(q.englishAnswer || "").trim();
  koreanAnswerRaw = String(q.koreanAnswer || "").trim();
  finalKoTargetRaw = "";
  rewritePlan = buildRewritePlan(q.questionRaw, englishAnswerRaw);
  englishAnswerRaw = rewritePlan.fullAnswer || englishAnswerRaw;
  englishRegex = buildFlexibleRegexFromAnswer(englishAnswerRaw);
  droppedWords = new Array((rewritePlan.sourceWords || []).length).fill("");
  activeDropIndex = 0;
  const originalKo = getOriginalMeaningText(q.questionRaw) || "";

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div class="inst-simple">
        ${UI_INST_REVERSE}
      </div>
    </div>

    <div class="box">
      <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">${UI_LABEL_ORIGINAL}</div>
      <div class="sentence">
        <div id="orig-line" class="rewrite-line"></div>
        <div class="plain-meaning">${escapeHtml(originalKo)}</div>
      </div>

      <div style="font-weight:900; color:#7e3106; margin-top:10px; margin-bottom:6px;">${UI_LABEL_PARAPHRASE}</div>
      <div class="sentence">
        <div id="rewrite-line" class="rewrite-line"></div>
        <div class="plain-meaning">${escapeHtml(q.koreanAnswer || "")}</div>
      </div>
    </div>


    <div class="btn-row" style="margin-top:12px;">
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  renderRewriteScene();
  wireRewriteWordDnD();
  startDragTipArc();

  // Final stage 전에는 다음 버튼을 노출하지 않는다.
  const preFinalNextBtn = document.getElementById("next-btn");
  if (preFinalNextBtn) {
    const row = preFinalNextBtn.closest(".btn-row");
    if (row) row.remove();
    else preFinalNextBtn.style.display = "none";
  }
}

function buildRewritePlan(questionRaw, englishAnswer) {
  const original = stripTrailingPunct(String(questionRaw || "").trim());
  const qTokens = original.split(/\s+/).filter(Boolean);

  const parsed = explodeAnswerToWords(englishAnswer);
  const words = parsed.words || [];
  const optionalMask = parsed.optionalMask || [];

  let optStart = optionalMask.findIndex((x) => !!x);
  let optEnd = -1;
  if (optStart >= 0) {
    optEnd = optStart;
    while (optEnd + 1 < optionalMask.length && optionalMask[optEnd + 1]) optEnd += 1;
  }

  let preWords = [];
  let tailWords = [];
  if (optStart >= 0) {
    preWords = words.slice(0, optStart);
    tailWords = words.slice(optEnd + 1);
  } else {
    preWords = words.slice(0, Math.min(2, words.length));
    tailWords = words.slice(preWords.length);
  }
  if (!preWords.length && words.length) {
    preWords = [words[0]];
  }
  if (!preWords.length && qTokens.length) preWords = [cleanWord(qTokens[qTokens.length - 1])];

  const preNoDet = preWords.filter((w, i) => {
    if (i === 0 && ["the", "a", "an"].includes(String(w || "").toLowerCase())) return false;
    return true;
  });
  const headWord = preNoDet.length
    ? String(preNoDet[preNoDet.length - 1] || "").toLowerCase()
    : (preWords.length ? String(preWords[preWords.length - 1] || "").toLowerCase() : "");

  const ppCandidate = String(tailWords[0] || "").toLowerCase();
  let verbIdx = -1;
  if (ppCandidate) {
    for (let i = 1; i < qTokens.length; i++) {
      const lw = cleanWord(qTokens[i]).toLowerCase();
      if (!lw) continue;
      if (lw === ppCandidate) { verbIdx = i; break; }
      if (IRREG_PAST_TO_PP[lw] === ppCandidate) { verbIdx = i; break; }
    }
  }
  if (verbIdx < 0) {
    for (let i = 1; i < qTokens.length; i++) {
      const lw = cleanWord(qTokens[i]).toLowerCase();
      if (!lw) continue;
      if (/(ed|d)$/.test(lw) && !["is","are","am","was","were","be","been","being","has","have","had"].includes(lw)) {
        verbIdx = i;
        break;
      }
    }
  }
  if (verbIdx < 0) verbIdx = Math.min(1, Math.max(0, qTokens.length - 1));

  const subjectWords = qTokens.slice(0, verbIdx).map((w) => cleanWord(w)).filter(Boolean);
  const verbWord = cleanWord(qTokens[verbIdx] || "");
  const sourceWords = subjectWords
    .concat(verbWord ? [verbWord] : [])
    .filter(Boolean)
    .map((w, i) => normalizeClauseWordForIndex(w, i));
  const sourceClause = normalizeEnglish(sourceWords.join(" "));
  const expectedWords = sourceWords.map((w) => String(w || "").toLowerCase());
  const dragStart = sourceWords.length ? 0 : -1;
  const dragEnd = sourceWords.length ? (sourceWords.length - 1) : -1;
  const relWords = ["that"];

  const prefixWords = preWords.slice();
  if (prefixWords.length) {
    const first = String(prefixWords[0] || "");
    prefixWords[0] = first ? first.charAt(0).toUpperCase() + first.slice(1) : first;
  }

  const prefixForRecord = normalizeEnglish(prefixWords.concat(relWords).join(" "));
  const fullAnswer = normalizeEnglish(prefixWords.concat(relWords).concat(sourceWords).join(" "));

  return {
    original,
    qTokens,
    dragStart,
    dragEnd,
    sourceClause,
    expectedClause: sourceClause,
    sourceWords,
    expectedWords,
    preWords,
    prefixWords,
    relWords,
    tailWords,
    headWord,
    prefixForRecord,
    fullAnswer,
  };
}

function findWordSequence(haystack, needle) {
  if (!needle.length || needle.length > haystack.length) return -1;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function renderRewriteScene() {
  const orig = document.getElementById("orig-line");
  const rewrite = document.getElementById("rewrite-line");
  if (!orig || !rewrite || !rewritePlan) return;

  orig.innerHTML = buildOriginalLineHtml(rewritePlan, droppedWords);
  rewrite.innerHTML = buildParaphraseLineHtml(rewritePlan, droppedWords);
}

function buildOriginalLineHtml(plan, wordsState) {
  const head = String(plan.headWord || "").toLowerCase();
  const tokens = plan.qTokens || [];
  const usedMask = getUsedSourceWordMask(plan.sourceWords || [], wordsState || []);
  const renderTok = (raw) => {
    const lw = cleanWord(raw).toLowerCase();
    const esc = escapeHtml(raw);
    if (lw && head && lw === head) return `<span class="head-hl">${esc}</span>`;
    return esc;
  };

  if (plan.dragStart >= 0 && plan.dragEnd >= plan.dragStart) {
    const before = tokens.slice(0, plan.dragStart).map(renderTok).join(" ");
    const dragToks = tokens.slice(plan.dragStart, plan.dragEnd + 1).map((raw, idx) => {
      const clean = cleanWord(raw);
      const cls = `drag-source-word${usedMask[idx] ? " used-ghost" : ""}`;
      return `<span class="${cls}" data-source-index="${idx}" data-word="${escapeHtml(clean)}" draggable="true">${escapeHtml(clean)}</span>`;
    }).join(" ");
    const after = tokens.slice(plan.dragEnd + 1).map(renderTok).join(" ");
    return `${before ? `${before} ` : ""}${dragToks}${after ? ` ${after}` : ""}`;
  }

  const whole = tokens.map(renderTok).join(" ");
  const sourceWords = (plan.sourceWords || []).map((w, idx) => {
    const cls = `drag-source-word${usedMask[idx] ? " used-ghost" : ""}`;
    return `<span class="${cls}" data-source-index="${idx}" data-word="${escapeHtml(w)}" draggable="true">${escapeHtml(w)}</span>`;
  }).join(" ");
  return `${whole}${sourceWords ? ` ${sourceWords}` : ""}`;
}

function buildHeadPrefixHtml(plan) {
  const head = String(plan.headWord || "").toLowerCase();
  const preArr = plan.prefixWords || [];
  if (!preArr.length) return "";

  let headIdx = preArr.findIndex((w) => String(w || "").toLowerCase() === head);
  if (headIdx < 0) headIdx = preArr.length - 1;
  const firstIsDet = ["the", "a", "an"].includes(String(preArr[0] || "").toLowerCase());

  const chunks = [];
  if (firstIsDet && headIdx >= 1) {
    const grouped = preArr.slice(0, headIdx + 1).map((w) => escapeHtml(w)).join(" ");
    chunks.push(`<span class="head-group">${grouped}</span>`);
    const rest = preArr.slice(headIdx + 1).map((w) => escapeHtml(w)).join(" ");
    if (rest) chunks.push(rest);
    return chunks.join(" ");
  }

  return preArr.map((w) => {
    const lw = String(w || "").toLowerCase();
    if (lw && lw === head) return `<span class="head-hl">${escapeHtml(w)}</span>`;
    return escapeHtml(w);
  }).join(" ");
}

function buildParaphraseLineHtml(plan, wordsState) {
  const pre = buildHeadPrefixHtml(plan);
  const rel = (plan.relWords || []).length
    ? `<span class="strike-rel">${escapeHtml((plan.relWords || []).join(" "))}</span>`
    : "";

  const words = Array.isArray(wordsState) ? wordsState : [];
  const slotsHtml = words.map((val, i) => {
    const filled = String(val || "").trim();
    const label = filled ? escapeHtml(filled) : "...";
    const cls = `drop-word-slot${filled ? " filled" : " empty"}${i === activeDropIndex ? " active" : ""}`;
    return `<span class="${cls}" data-drop-index="${i}">${label}</span>`;
  }).join(" ");

  return `${pre}${rel ? ` ${rel}` : ""}${slotsHtml ? ` ${slotsHtml}` : ""}`;
}

function wireRewriteWordDnD() {
  if (!rewritePlan) return;
  const sourceWords = Array.from(document.querySelectorAll(".drag-source-word"));
  const dropSlots = Array.from(document.querySelectorAll(".drop-word-slot"));

  sourceWords.forEach((src) => {
    const word = String(src.getAttribute("data-word") || "").trim();
    src.addEventListener("dragstart", (e) => {
      if (isAnswered || stage !== "rewrite") return;
      src.classList.add("dragging");
      try { e.dataTransfer.setData("text/plain", word); } catch (_) {}
    });
    src.addEventListener("dragend", () => src.classList.remove("dragging"));
    src.addEventListener("click", () => {
      if (isAnswered || stage !== "rewrite") return;
      fillDropWord(word);
    });
  });

  dropSlots.forEach((slotEl) => {
    const idx = Number(slotEl.getAttribute("data-drop-index") || 0);
    slotEl.addEventListener("click", () => {
      if (isAnswered || stage !== "rewrite") return;
      activeDropIndex = idx;
      renderRewriteScene();
      wireRewriteWordDnD();
      startDragTipArc();
    });
    slotEl.addEventListener("dragover", (e) => {
      if (isAnswered || stage !== "rewrite") return;
      e.preventDefault();
      slotEl.classList.add("over");
    });
    slotEl.addEventListener("dragleave", () => slotEl.classList.remove("over"));
    slotEl.addEventListener("drop", (e) => {
      if (isAnswered || stage !== "rewrite") return;
      e.preventDefault();
      slotEl.classList.remove("over");
      const dt = String(e.dataTransfer?.getData("text/plain") || "").trim();
      activeDropIndex = idx;
      fillDropWord(dt);
    });
  });
}

function fillDropWord(word) {
  const picked = normalizeEnglish(cleanWord(word));
  if (!picked || !Array.isArray(droppedWords) || !droppedWords.length) return;
  let idx = Number(activeDropIndex) || 0;
  if (idx < 0 || idx >= droppedWords.length) idx = 0;
  droppedWords[idx] = normalizeClauseWordForIndex(picked, idx);
  if (!hasFirstDragDone) {
    hasFirstDragDone = true;
    stopDragTipArcHint();
  }
  const next = droppedWords.findIndex((w) => !String(w || "").trim());
  activeDropIndex = next >= 0 ? next : idx;
  renderRewriteScene();
  wireRewriteWordDnD();
  if (checkRewriteAutoAdvance()) return;
  if (!hasFirstDragDone) startDragTipArc();
}

function normalizeClauseWordForIndex(word, idx) {
  const w = normalizeEnglish(String(word || ""));
  if (idx !== 0) return w;
  const low = w.toLowerCase();
  const lowerSet = new Set([
    "the","a","an","this","that","these","those",
    "my","your","his","her","its","our","their",
    "she","he","they","we","i","it","someone","many",
  ]);
  return lowerSet.has(low) ? low : w;
}

function checkRewriteAutoAdvance() {
  if (stage !== "rewrite" || !rewritePlan) return false;
  const expected = rewritePlan.expectedWords || [];
  if (!expected.length) return false;
  const userWords = (droppedWords || []).map((w) => normalizeEnglish(w).toLowerCase());
  if (userWords.some((w) => !w)) return false;

  const ok = userWords.length === expected.length
    && userWords.every((w, i) => w === String(expected[i] || "").toLowerCase());
  if (ok) {
    stage1Solved = true;
    if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
    renderTranslateStage();
    return true;
  }

  const firstBad = userWords.findIndex((w, i) => w !== String(expected[i] || "").toLowerCase());
  if (firstBad >= 0) activeDropIndex = firstBad;
  if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
  renderRewriteScene();
  wireRewriteWordDnD();
  return false;
}

function getUsedSourceWordMask(sourceWords, selectedWords) {
  const counts = new Map();
  (selectedWords || []).forEach((w) => {
    const k = normalizeEnglish(w).toLowerCase();
    if (!k) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  return (sourceWords || []).map((w) => {
    const k = normalizeEnglish(w).toLowerCase();
    const c = counts.get(k) || 0;
    if (c <= 0) return false;
    counts.set(k, c - 1);
    return true;
  });
}

function getOriginalMeaningText(questionRaw) {
  const key = String(questionRaw || "").trim();
  if (!key) return "";
  if (ORIG_KO_BY_QUESTION[key]) return ORIG_KO_BY_QUESTION[key];
  const withDot = key.endsWith(".") ? key : `${key}.`;
  return ORIG_KO_BY_QUESTION[withDot] || "";
}

function stopDragTipArcHint() {
  if (typeof stopDragTipArc === "function") {
    try { stopDragTipArc(); } catch (_) {}
  }
  stopDragTipArc = null;
}

function startDragTipArc() {
  stopDragTipArcHint();
  if (isAnswered || stage !== "rewrite") return;
  if (hasFirstDragDone) return;
  if (!Array.isArray(droppedWords) || !droppedWords.length) return;

  const source = document.querySelector(".drag-source-word");
  const target = document.querySelector(`.drop-word-slot[data-drop-index="${activeDropIndex}"]`)
    || document.querySelector(".drop-word-slot.empty")
    || document.querySelector(".drop-word-slot");
  if (!source || !target) return;

  const tip = document.createElement("div");
  tip.className = "drag-tip-fly";
  tip.textContent = "drag";
  document.body.appendChild(tip);

  let alive = true;
  let rafId = 0;
  let cycleStartTs = 0;
  const durationMs = 1300;
  const pauseMs = 220;
  const arcLift = 42;

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const frame = (ts) => {
    if (!alive) return;
    if (!document.body.contains(tip)) {
      alive = false;
      return;
    }
    if (!cycleStartTs) cycleStartTs = ts;
    let elapsed = ts - cycleStartTs;
    if (elapsed > durationMs + pauseMs) {
      cycleStartTs = ts;
      elapsed = 0;
    }

    const sRect = source.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    if (!sRect.width || !tRect.width) {
      rafId = requestAnimationFrame(frame);
      return;
    }

    const start = { x: sRect.left + (sRect.width / 2), y: sRect.top + (sRect.height / 2) };
    const end = { x: tRect.left + (tRect.width / 2), y: tRect.top + (tRect.height / 2) };
    const control = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - arcLift };

    const moving = elapsed <= durationMs;
    const t0 = moving ? (elapsed / durationMs) : 1;
    const t = easeInOut(Math.max(0, Math.min(1, t0)));
    const omt = 1 - t;
    const x = (omt * omt * start.x) + (2 * omt * t * control.x) + (t * t * end.x);
    const y = (omt * omt * start.y) + (2 * omt * t * control.y) + (t * t * end.y);
    const halfW = tip.offsetWidth / 2;
    const halfH = tip.offsetHeight / 2;

    tip.style.opacity = moving ? ".95" : "0";
    tip.style.transform = `translate3d(${(x - halfW).toFixed(2)}px, ${(y - halfH).toFixed(2)}px, 0)`;

    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);
  stopDragTipArc = () => {
    alive = false;
    cancelAnimationFrame(rafId);
    if (tip.parentNode) tip.parentNode.removeChild(tip);
  };
}

/** ================== Render: Source Sentence ================== */
function renderSourceSentence(){
  const wrap = document.getElementById("src-sentence");
  if (!wrap) return;

  wrap.innerHTML = "";
  srcTokens.forEach((t) => {
    const sp = document.createElement("span");
    sp.className = "srcTok" + (t.used ? " used" : "") + (t.verb ? " verb" : "");
    sp.textContent = t.display;

    sp.addEventListener("click", () => {
      if (isAnswered || t.used) return;
      onClickSourceToken(t.id, sp);
    });

    wrap.appendChild(sp);
  });
}

function onClickSourceToken(tokenId, el){
  const t = srcTokens.find(x => x.id === tokenId);
  if (!t || t.used || isAnswered) return;

  const targetIndex = pickTargetSlotIndex();
  if (targetIndex === -1) return;

  const slot = slots[targetIndex];
  if (!slot || slot.kind !== "slot" || slot.filled) return;

  // validate placement: must match expectedLower (or verbPP rule)
  const ok = canPlaceTokenIntoSlot(t, slot);
  if (!ok) {
    if (el) {
      el.classList.add("nope");
      setTimeout(() => el.classList.remove("nope"), 160);
    }
    flashSlotBad(targetIndex);
    return;
  }

  // place
  const prevText = slot.text || "";
  const prevApplied = !!slot.ppApplied;

  slot.filled = true;
  slot.fromTokenId = t.id;

  if (slot.fillRule === "verbPP") {
    // initially place raw verb form, allow pp conversion
    slot.text = t.clean;
    slot.canPP = true;
    slot.ppText = slot.ppText || t.ppText || "";
    slot.ppApplied = false;
  } else {
    slot.text = t.clean;
    slot.canPP = false;
    slot.ppText = "";
    slot.ppApplied = false;
  }

  t.used = true;

  moveHistory.push({
    slotIndex: targetIndex,
    tokenId: t.id,
    prevSlotText: prevText,
    prevPpApplied: prevApplied,
  });

  selectedSlotIndex = -1;
  renderSourceSentence();
  renderTargetLine(false);
}

function canPlaceTokenIntoSlot(token, slot){
  if (!slot) return false;
  if (slot.fillRule === "exact") {
    return token.lower === slot.expectedLower;
  }
  if (slot.fillRule === "verbPP") {
    // must be the highlighted verb token
    return !!token.verb;
  }
  return false;
}

function flashSlotBad(slotIndex){
  const tl = document.getElementById("target-line");
  if (!tl) return;
  const el = tl.querySelector(`[data-slot="${slotIndex}"]`);
  if (!el) return;
  el.classList.add("bad");
  setTimeout(() => el.classList.remove("bad"), 180);
}

/** ================== Render: Target Line ================== */
function renderTargetLine(withDropAnim=false){
  const tl = document.getElementById("target-line");
  if (!tl) return;

  tl.innerHTML = "";

  slots.forEach((s, i) => {
    if (s.kind === "fixed") {
      const span = document.createElement("span");
      span.className = "fixed" + (s.faded ? " faded" : "") + (withDropAnim && s.drop ? " drop" : "");
      span.textContent = s.text;
      tl.appendChild(span);
      tl.appendChild(document.createTextNode(" "));
      return;
    }

    // slot
    const slot = document.createElement("span");
    slot.className = "slot"
      + (s.filled ? " filled" : "")
      + (s.fillRule === "verbPP" ? " verb-slot" : "")
      + (i === selectedSlotIndex ? " selected" : "")
      + (s.canPP && !s.ppApplied ? " pp-pending" : "")
      + (s.ppApplied ? " pp-done" : "");
    slot.setAttribute("data-slot", String(i));

    const label = document.createElement("span");
    label.className = s.filled ? "" : "ghost";
    label.textContent = s.filled ? s.text : "…";
    slot.appendChild(label);

    slot.addEventListener("click", () => {
      if (isAnswered) return;

      // if filled & pp 가능한 단어면: 한 번 더 누르면 pp 적용
      if (s.filled && s.canPP && !s.ppApplied) {
        s.text = s.ppText || s.text;
        s.ppApplied = true;

        // ✅ 즉시 UI 반영(재렌더 전에 "강화" 느낌)
        label.textContent = s.text;

        // 골드 + 꽝!
        slot.classList.remove("pp-pending");
        slot.classList.add("pp-done");
        slot.classList.remove("pp-bang");
        void slot.offsetWidth;
        slot.classList.add("pp-bang");

        // p.p! 잔상
        const fx = document.createElement("span");
        fx.className = "pp-float";
        fx.textContent = "p.p!";
        slot.appendChild(fx);
        setTimeout(() => fx.remove(), 900);

        // 애니메이션 잠깐 보여주고 재렌더
        setTimeout(() => renderTargetLine(false), 520);
        return;
      }

      // else select empty slot
      if (!s.filled) {
        selectedSlotIndex = i;
        renderTargetLine(false);
      }
    });

    tl.appendChild(slot);
    tl.appendChild(document.createTextNode(" "));
  });

  // enable translate only when all slots filled
  const translateBtn = document.getElementById("translate-btn");
  if (translateBtn) translateBtn.disabled = !areAllSlotsFilled();
}

function pickTargetSlotIndex(){
  if (selectedSlotIndex >= 0) {
    const s = slots[selectedSlotIndex];
    if (s && s.kind === "slot" && !s.filled) return selectedSlotIndex;
  }
  for (let i=0; i<slots.length; i++){
    const s = slots[i];
    if (s.kind === "slot" && !s.filled) return i;
  }
  return -1;
}

function areAllSlotsFilled(){
  return slots.every(s => s.kind !== "slot" || s.filled);
}

function buildUserEnglishFromTarget(){
  const words = [];
  slots.forEach((s) => {
    if (s.kind === "fixed") words.push(s.text);
    else if (s.kind === "slot" && s.filled && s.text) words.push(s.text);
  });
  return normalizeEnglish(words.join(" "));
}

/** ================== Controls: undo/reset ================== */
function undoMove(){
  if (!moveHistory.length || isAnswered) return;

  const last = moveHistory.pop();
  const s = slots[last.slotIndex];

  if (s && s.kind === "slot") {
    s.filled = false;
    s.text = last.prevSlotText || "";
    s.fromTokenId = "";
    s.canPP = false;
    s.ppText = "";
    s.ppApplied = false;
  }

  const t = srcTokens.find(x => x.id === last.tokenId);
  if (t) t.used = false;

  selectedSlotIndex = -1;
  renderSourceSentence();
  renderTargetLine(false);
}

function resetMoves(){
  if (isAnswered) return;

  moveHistory = [];
  selectedSlotIndex = -1;

  // clear all slots
  slots.forEach((s) => {
    if (s.kind === "slot") {
      s.filled = false;
      s.text = "";
      s.fromTokenId = "";
      s.canPP = false;
      s.ppText = "";
      s.ppApplied = false;
    }
  });

  // reset source usage (BUT: words we "던져둔" head noun are considered already used if they exist in source)
  srcTokens.forEach((t) => (t.used = false));
  // mark prefilled-taken again
  const prefilledWords = new Set(
    slots
      .filter(x => x.kind === "fixed" && x.prefillTaken)
      .map(x => String(x.text || "").toLowerCase())
  );
  srcTokens.forEach((t) => {
    if (prefilledWords.has(t.lower)) t.used = true;
  });

  renderSourceSentence();
  renderTargetLine(false);
}

/** ================== Build Source Tokens ================== */
function buildSourceTokens(sentence){
  const raw = String(sentence || "").trim();
  const parts = raw.split(/\s+/).filter(Boolean);

  return parts.map((p, i) => {
    const clean = cleanWord(p);
    return {
      pos: i,
      id: `src_${i}_${clean.toLowerCase()}_${Math.random().toString(16).slice(2,6)}`,
      display: p,                 // keep punctuation in display
      clean: clean,               // clean word for matching/inserting
      lower: clean.toLowerCase(),
      used: false,
      verb: false,
      ppText: "",
    };
  });
}

/** ================== Build Slots Plan ================== */
function buildSlotsPlan(answerEnglish, srcTokens){
  const srcSet = new Set(srcTokens.map(t => t.lower));
  const { words, optionalMask } = explodeAnswerToWords(answerEnglish);

  // determine ppCandidate: first non-stop word in answer that is not in source
  const STOP = new Set(["the","a","an","that","which","who","whom","whose","was","were","is","are","am","be","been","being","by","of","in","on","at","with","for","to","from","and"]);
  let ppCandidate = "";
  for (let i=0; i<words.length; i++){
    const lw = words[i].toLowerCase();
    if (optionalMask[i]) continue;
    if (STOP.has(lw)) continue;
    if (!srcSet.has(lw)) { ppCandidate = words[i]; break; }
  }
  const ppLower = ppCandidate ? ppCandidate.toLowerCase() : "";

  // choose verb token id (only if ppCandidate exists)
  let verbTokenId = "";
  if (ppLower) {
    const ansSet = new Set(words.map(w => w.toLowerCase()));

    // ✅ 1순위: 불규칙(과거형 -> p.p) 매핑으로 직접 찾기
    //   예: ppLower가 "sung"이면 원문 토큰 "sang"을 집는다. (singer 같은 명사는 배제됨)
    const byIrreg = srcTokens.find(t =>
      (t.pos ?? 0) >= 1 &&
      IRREG_PAST_TO_PP[t.lower] === ppLower
    );
    if (byIrreg) {
      verbTokenId = byIrreg.id;
    } else {
      // ✅ 2순위: 기존 휴리스틱 + '명사 후보' 강하게 배제
      // - 주어(첫 토큰) 제외
      // - 답에 없는 단어 중에서 선택
      // - 흔한 명사 접미사(-er/-or/-ion/-ment/-ness/-ity...) 제외
      const nounish = (lw) => /(?:er|or|ion|ment|ness|ity|ship|age|ance|ence|ism|ist|hood)$/i.test(lw);

      const cand = srcTokens.find(t =>
        (t.pos ?? 0) >= 1 &&
        !ansSet.has(t.lower) &&
        !STOP.has(t.lower) &&
        !nounish(t.lower)
      );
      if (cand) verbTokenId = cand.id;
      else {
        const cand2 = srcTokens.find(t =>
          (t.pos ?? 0) >= 1 &&
          !STOP.has(t.lower) &&
          !nounish(t.lower)
        );
        if (cand2) verbTokenId = cand2.id;
      }
    }
  }

  // determine head noun index: last word before first optional group (or before "that" if no parens)
  const detIdx = words.findIndex(w => ["the","a","an"].includes(w.toLowerCase()));
  let firstOptIdx = optionalMask.findIndex(x => x);
  if (firstOptIdx === -1) {
    const thatIdx = words.findIndex(w => ["that","which","who"].includes(w.toLowerCase()));
    firstOptIdx = thatIdx;
  }
  let headIdx = -1;
  if (firstOptIdx > 0) headIdx = firstOptIdx - 1;
  else if (detIdx >= 0 && detIdx + 1 < words.length) headIdx = detIdx + 1;
  else headIdx = 0;

  // Build slots
  const slots = [];
  for (let i=0; i<words.length; i++){
    const w = words[i];
    const lw = w.toLowerCase();
    const opt = !!optionalMask[i];

    // optional group: fixed faded
    if (opt) {
      slots.push({ kind:"fixed", text:w, faded:true, drop:false, prefillTaken:false });
      continue;
    }

    // determiners: fixed (not faded)
    if (["the","a","an"].includes(lw)) {
      slots.push({ kind:"fixed", text:w, faded:false, drop:false, prefillTaken:false });
      continue;
    }

    // head noun: 고정 토큰.
    // - 관사(the/a/an)가 바로 앞에 붙어 "the + noun" 형태면: 둘 다 주어로 고정이므로 head도 흐리지 않음.
    // - 관사가 없거나 다른 구조면: head를 약간 흐리게(가이드) 둘 수 있음.
    if (i === headIdx) {
      const take = srcSet.has(lw);
      const hasDetPair = (detIdx >= 0 && headIdx === detIdx + 1);
      const fadeHead = !hasDetPair; // "the letter"면 false
      slots.push({ kind:"fixed", text:w, faded: fadeHead, drop: fadeHead, prefillTaken: take });
      continue;
    }

    // if word not in source, but it's NOT ppCandidate -> fixed inserted helper (e.g. by)
    if (!srcSet.has(lw) && lw !== ppLower) {
      slots.push({ kind:"fixed", text:w, faded:false, drop:false, prefillTaken:false });
      continue;
    }

    // slot to be filled
    if (lw === ppLower && ppLower) {
      slots.push({
        kind:"slot",
        text:"",
        faded:false,
        expectedLower: ppLower,
        fillRule: "verbPP",
        filled:false,
        fromTokenId:"",
        canPP:false,
        ppText: w,
        ppApplied:false,
      });
    } else {
      slots.push({
        kind:"slot",
        text:"",
        faded:false,
        expectedLower: lw,
        fillRule: "exact",
        filled:false,
        fromTokenId:"",
        canPP:false,
        ppText:"",
        ppApplied:false,
      });
    }
  }

  // apply prefill-taken to source: head noun removed from clicking pool
  const prefillTakenWords = new Set(slots.filter(s => s.kind==="fixed" && s.prefillTaken).map(s => s.text.toLowerCase()));
  srcTokens.forEach((t) => {
    if (prefillTakenWords.has(t.lower)) t.used = true;
  });

  return { slots, verbTokenId, ppText: ppCandidate };
}

/** ================== Answer explode (parentheses) ================== */
function explodeAnswerToWords(answer){
  const s = stripTrailingPunct(String(answer || "").trim());
  const parts = [];
  let i = 0;
  let inParen = false;
  let buf = "";

  const pushBuf = () => {
    const txt = buf.trim();
    if (!txt) return;
    parts.push({ text: txt, optional: inParen });
  };

  while (i < s.length) {
    const ch = s[i];
    if (ch === "(") {
      pushBuf(); buf = ""; inParen = true; i++; continue;
    }
    if (ch === ")") {
      pushBuf(); buf = ""; inParen = false; i++; continue;
    }
    buf += ch;
    i++;
  }
  pushBuf();

  const words = [];
  const optionalMask = [];
  parts.forEach(seg => {
    seg.text.split(/\s+/).filter(Boolean).forEach(w => {
      words.push(cleanWord(w));
      optionalMask.push(!!seg.optional);
    });
  });

  return { words, optionalMask };
}

/** ================== Submit ================== */
function submitAnswer() {
  const q = questions[currentIndex];
  if (!q) return;

  if (stage === "rewrite") {
    if (!rewritePlan) return;
    if ((droppedWords || []).some((w) => !normalizeEnglish(w))) {
      if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
      return;
    }
    checkRewriteAutoAdvance();
    return;
  }

  if (stage !== "translate") return;
  if (isKoLocked) return;

  const userKo = selectedTokens.map((t) => t.text).join(" ").trim();
  const koTarget = String(finalKoTargetRaw || koreanAnswerRaw || "").trim();
  const koOk = normalizeKorean(userKo) === normalizeKorean(koTarget);
  if (!koOk) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    return;
  }

  isKoLocked = true;
  isAnswered = true;
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;
  renderTranslateUI();
  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
}

function renderTranslateStage() {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  const q = questions[currentIndex];
  if (!q || !rewritePlan) return;

  stage = "translate";
  isKoLocked = false;
  isAnswered = false;
  selectedTokens = [];
  bankTokens = [];
  finalOriginalKoRaw = String(getOriginalMeaningText(q.questionRaw) || koreanAnswerRaw || "").trim();
  finalFlippedKoRaw = String(koreanAnswerRaw || finalOriginalKoRaw || "").trim();
  finalKoTargetRaw = finalUseOriginal ? finalOriginalKoRaw : finalFlippedKoRaw;
  bankTokens = buildDualKoBankTokens(finalOriginalKoRaw, finalFlippedKoRaw);

  const topEnglishHtml = buildFinalTopEnglishHTML();
  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${topEnglishHtml}${topEnglishHtml ? "." : ""}</div>
    </div>

    <div class="sentence" id="answer-line" style="
      min-height:86px;
      display:flex;
      flex-wrap:wrap;
      align-items:flex-start;
      gap:6px;
    "></div>

    <div class="box" style="margin-top:10px;">
      <div id="bank-area"></div>
      <div id="remain-info" style="margin-top:8px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78);"></div>
    </div>

    <div class="btn-row" style="margin-top:12px;">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>
    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = true;
  renderTranslateUI();
}

function renderTranslateUI() {
  const answerLine = document.getElementById("answer-line");
  const bankArea = document.getElementById("bank-area");
  const remainInfo = document.getElementById("remain-info");
  if (!answerLine || !bankArea || !remainInfo) return;
  const activeGroup = selectedTokens.length ? String(selectedTokens[0]?.group || "") : "";

  answerLine.innerHTML = "";
  if (!selectedTokens.length) {
    const hint = document.createElement("span");
    hint.innerHTML = "\uC870\uAC01\uC744 \uB20C\uB7EC \uC21C\uC11C\uB300\uB85C \uCC44\uC6CC\uC8FC\uC138\uC694.<br>\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4.";
    hint.style.opacity = ".45";
    hint.style.fontWeight = "900";
    hint.style.color = "#7e3106";
    hint.style.lineHeight = "1.45";
    answerLine.appendChild(hint);
  } else {
    selectedTokens.forEach((tok, idx) => {
      const isLast = idx === selectedTokens.length - 1;
      const sp = document.createElement("button");
      sp.type = "button";
      sp.textContent = tok.text;
      sp.style.display = "inline-flex";
      sp.style.alignItems = "center";
      sp.style.justifyContent = "center";
      sp.style.padding = "8px 10px";
      sp.style.borderRadius = "999px";
      sp.style.border = isLast ? "2px solid rgba(241,123,42,0.9)" : "1px solid rgba(0,0,0,0.14)";
      sp.style.background = "#fff";
      sp.style.fontWeight = "900";
      sp.style.fontSize = "13px";
      sp.style.userSelect = "none";
      sp.style.cursor = isKoLocked ? "not-allowed" : (isLast ? "pointer" : "default");
      sp.style.opacity = isKoLocked ? "0.6" : "1";
      sp.style.margin = "2px 6px 2px 0";

      if (tok.group === "original") {
        sp.style.borderColor = isLast ? "rgba(241,123,42,0.9)" : "rgba(241,123,42,0.68)";
        sp.style.background = "rgba(241,123,42,0.10)";
        sp.style.color = "#7e3106";
      } else if (tok.group === "flipped") {
        sp.style.borderColor = isLast ? "rgba(70,140,255,0.88)" : "rgba(70,140,255,0.62)";
        sp.style.background = "rgba(70,140,255,0.11)";
        sp.style.color = "#1f4fb8";
      }

      sp.onclick = () => {
        if (isKoLocked || !isLast) return;
        const popped = selectedTokens.pop();
        if (popped) {
          bankTokens.push(popped);
          sortDualKoBankTokens(bankTokens);
        }
        renderTranslateUI();
      };
      answerLine.appendChild(sp);
    });
  }

  bankArea.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "dual-bank-wrap";
  const rowTop = document.createElement("div");
  rowTop.className = "dual-bank-row";
  const divider = document.createElement("div");
  divider.className = "dual-bank-divider";
  const rowBottom = document.createElement("div");
  rowBottom.className = "dual-bank-row";

  bankTokens.forEach((tok) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = tok.text;
    btn.className = `dual-token ${tok.group === "original" ? "original" : "flipped"}`;
    const blockedByGroup = !!(activeGroup && tok.group !== activeGroup);
    btn.disabled = isKoLocked || blockedByGroup;
    btn.onclick = () => {
      if (isKoLocked) return;
      if (activeGroup && tok.group !== activeGroup) return;
      const idx = bankTokens.findIndex((x) => x.id === tok.id);
      if (idx < 0) return;
      const [moved] = bankTokens.splice(idx, 1);
      selectedTokens.push(moved);
      renderTranslateUI();
    };
    if (tok.group === "original") rowTop.appendChild(btn);
    else rowBottom.appendChild(btn);
  });

  wrap.appendChild(rowTop);
  wrap.appendChild(divider);
  wrap.appendChild(rowBottom);
  if (activeGroup === "original") {
    rowBottom.style.opacity = "0.38";
  } else if (activeGroup === "flipped") {
    rowTop.style.opacity = "0.38";
  }
  bankArea.appendChild(wrap);

  remainInfo.textContent = `\uB0A8\uC740 \uC870\uAC01: ${bankTokens.length}\uAC1C`;
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = isKoLocked;
}

function buildDualKoBankTokens(originalKoRaw, flippedKoRaw) {
  const top = shuffleArray(tokenizeKorean(originalKoRaw)).map((t, i) => ({
    id: `ko_o_${i}_${Math.random().toString(16).slice(2, 6)}`,
    text: t,
    group: "original",
    groupRank: 0,
    order: i,
  }));
  const bottom = shuffleArray(tokenizeKorean(flippedKoRaw)).map((t, i) => ({
    id: `ko_f_${i}_${Math.random().toString(16).slice(2, 6)}`,
    text: t,
    group: "flipped",
    groupRank: 1,
    order: i,
  }));
  return top.concat(bottom);
}

function sortDualKoBankTokens(arr) {
  arr.sort((a, b) => {
    const ga = Number(a?.groupRank ?? 9);
    const gb = Number(b?.groupRank ?? 9);
    if (ga !== gb) return ga - gb;
    return Number(a?.order ?? 0) - Number(b?.order ?? 0);
  });
}

function buildUserEnglishFromRewrite() {
  const prefix = rewritePlan ? String(rewritePlan.prefixForRecord || "") : "";
  const clause = Array.isArray(droppedWords) ? droppedWords.join(" ") : "";
  return normalizeEnglish([prefix, clause].join(" "));
}

function buildFinalTopEnglishHTML() {
  const q = questions[currentIndex];
  if (!q || !rewritePlan) return "";
  if (finalUseOriginal) {
    const s = stripTrailingPunct(String(q.questionRaw || "").trim());
    const head = String(rewritePlan.headWord || "").toLowerCase();
    const parts = s.split(/(\s+)/);
    return parts.map((p) => {
      if (!p || /^\s+$/.test(p)) return p;
      const lw = cleanWord(p).toLowerCase();
      const esc = escapeHtml(p);
      return (head && lw === head) ? `<span class="head-hl">${esc}</span>` : esc;
    }).join("");
  }

  const pre = buildHeadPrefixHtml(rewritePlan);
  const rel = (rewritePlan.relWords || []).map((w) => escapeHtml(w)).join(" ");
  const clause = (rewritePlan.sourceWords || []).map((w) => escapeHtml(w)).join(" ");
  return `${pre}${rel ? ` ${rel}` : ""}${clause ? ` ${clause}` : ""}`.trim();
}

function goNext() {
  stopDragTipArcHint();
  if (stage === "rewrite") {
    const q = questions[currentIndex];
    const userEng = buildUserEnglishFromRewrite();
    results.push({
      no: currentIndex + 1,
      word: `Herma L5-E1 / Q${q.qNumber}`,
      selected: `${userEng || "무응답"} || ko:무응답`,
      correct: false,
      question: q.questionRaw,
      englishAnswer: englishAnswerRaw,
      koreanAnswer: koreanAnswerRaw,
    });
  } else if (stage === "translate") {
    const q = questions[currentIndex];
    const userEng = rewritePlan?.fullAnswer || buildUserEnglishFromRewrite();
    const userKo = selectedTokens.map((t) => t.text).join(" ").trim();
    const finalCorrect = !!(stage1Solved && isKoLocked);
    results.push({
      no: currentIndex + 1,
      word: `Herma L5-E1 / Q${q.qNumber}`,
      selected: `${userEng || "무응답"} || ko:${userKo || "무응답"}`,
      correct: finalCorrect,
      question: q.questionRaw,
      englishAnswer: englishAnswerRaw,
      koreanAnswer: koreanAnswerRaw,
    });
  }

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

/** ================== Result Popup ================== */
function showResultPopup() {
  stopDragTipArcHint();
  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const resultObject = {
    quiztitle: quizTitle,
    subcategory,
    level,
    day,
    teststatus: "done",
    course: "herma",
    lesson: TARGET_LESSON,
    exercise: TARGET_EXERCISE,
    userId: userId || "",
    testspecific: results,
  };

  localStorage.setItem("QuizResults", JSON.stringify(resultObject));

  const popup = document.getElementById("result-popup");
  const content = document.getElementById("result-content");
  if (!popup || !content) return alert(`완료! 점수: ${score}점 (${correctCount}/${total})`);

  const rows = results
    .map(
      (r) => `
    <tr>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.no}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.word)}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(trimForTable(r.selected))}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.correct ? "⭕" : "❌"}</td>
    </tr>
  `
    )
    .join("");

  content.innerHTML = `
    <div style="font-weight:900; font-size:16px; margin-bottom:8px;">📄 전체 결과</div>
    <div style="margin-bottom:10px; font-size:14px;">
      점수: <b>${score}점</b> (${correctCount} / ${total})
    </div>

    <div style="max-height:260px; overflow-y:auto; margin-bottom:14px;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f6f6f6;">
            <th style="padding:6px; border-bottom:1px solid #ccc;">번호</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">문항</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 답(영어)</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">정답</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" onclick="restartQuiz()">🔁 재시험</button>
      <button class="quiz-btn" onclick="closePopup()">닫기</button>
    </div>
  `;

  popup.style.display = "flex";
}
function restartQuiz() { window.location.reload(); }
function closePopup() {
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

/** ================== English grading (optional groups) ================== */
function buildFlexibleRegexFromAnswer(answer) {
  const raw = stripTrailingPunct(String(answer || "")).trim();

  const segs = [];
  const re = /\([^)]*\)/g;
  let pos = 0;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > pos) segs.push({ opt: false, text: raw.slice(pos, m.index) });
    segs.push({ opt: true, text: m[0].slice(1, -1) });
    pos = re.lastIndex;
  }
  if (pos < raw.length) segs.push({ opt: false, text: raw.slice(pos) });

  let rx = "^\\s*";
  let hasAnyWord = false;

  for (const seg of segs) {
    const words = String(seg.text || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(cleanWord)
      .filter(Boolean);

    if (!words.length) continue;

    const body = words.map(escapeRegex).join("\\s+");

    if (seg.opt) {
      rx += hasAnyWord ? `(?:\\s+${body})?` : `(?:${body})?`;
    } else {
      if (!hasAnyWord) {
        rx += body;
        hasAnyWord = true;
      } else {
        rx += `\\s+${body}`;
      }
    }
  }

  rx += "\\s*$";
  return new RegExp(rx, "i");
}

/** ================== Korean Utils ================== */
function tokenizeKorean(kor) {
  const s = String(kor || "").trim();
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}
function normalizeKorean(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.。!?]+$/g, "")
    .trim();
}

/** ================== Misc Utils ================== */
function normalizeEnglish(s){ return String(s || "").trim().replace(/\s+/g, " ").trim(); }
function escapeRegex(str) { return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function stripTrailingPunct(s) { return String(s || "").trim().replace(/[.。!?]+$/g, "").trim(); }
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function trimForTable(s) {
  const t = String(s || "");
  return t.length > 70 ? t.slice(0, 70) + "..." : t;
}
function cleanWord(w){
  return String(w || "").replace(/^[“"']+|[”"']+$/g, "").replace(/[,:;]+$/g, "").replace(/[.?!]+$/g, "").trim();
}
