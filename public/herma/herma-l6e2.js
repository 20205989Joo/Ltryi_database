// ver1.1_26.02.22
// herma-l6e2.js (L6-E2: A/B 명사구 만들기(2회) + C의 It 약분 + 뜻(순서))
// ------------------------------------------------------------
// ✅ 변경 요약 (요구사항 반영)
// 1) A/B 각각 "1단계(명사구 만들기)"를 두 번 진행
//    - A 완료 → A는 '명사구 상태'로 표시, B/C는 미완성 유지
//    - B 완료 → 그제야 C의 It 클릭(2단계) 활성화
// 2) 2단계: C의 It 클릭 → 완결된 한 문장 표시(정답 문장)
// 3) 문제2 버그 수정: "The + rose → rapid" 같은 오작동 방지
//    - 명사화(verb→noun) 대상은 '명사구의 head(전치사 of/in/to 앞 단어)'로 1개만 지정
//    - rapid 같은 형용사는 fixed 처리 (rose가 rapid로 바뀌는 현상 제거)
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 6;
const TARGET_EXERCISE = 2;

let subcategory = "Grammar";
let level = "Basic";
let day = "121";
let quizTitle = "quiz_Grammar_Basic_121";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;

// stage flags
let stage1AOk = false; // A 명사구 완성
let stage1BOk = false; // B 명사구 완성
let stageReduceOk = false; // C의 It 약분 완료
let stageABOk = false; // B를 A로 드래그 완료
let stage2Ok  = false; // C 드래그 완료
let stage3Ok  = false; // 뜻 순서 완료

let stage3Shown = false;

// current
let englishAnswerRaw = "";
let koreanAnswerRaw = "";
let aRaw = "";
let bRaw = "";
let cRaw = "";
let currentTransformRules = [];
let laststageFinalSentenceRaw = "";
let laststageKRTokensRaw = "";

// nominal targets extracted from Answer
let subjA = "";
let subjB = "";
let subjCombined = "";

// per-part nominal state
const nominalState = {
  A: { label:"A", srcTokens:[], slots:[], headLower:"", headText:"", targetPhrase:"" },
  B: { label:"B", srcTokens:[], slots:[], headLower:"", headText:"", targetPhrase:"" },
};
let nominalPart = null; // "A" | "B"

// active references (point to nominalState[A/B])
let srcTokens = [];
let slots = [];
let selectedSlotIndex = -1;
let moveHistory = [];
let nominalActiveSlotIndex = 0;
let nominalHasFirstDrag = false;
let stopNominalDragTipArc = null;
let stopReduceDragTipArc = null;
let abJoinGhostEl = null;
let transparentDragImage = null;

// 3단계 뜻(순서)
let korBankTokens = [];
let korSelectedTokens = [];

// UI state
let nominalOpen = false;
let abFlipDefaultHeight = 0;
let nominalFlipCleanupTimer = null;
const UI_INST_FLIP = "\uB4A4\uC9D1\uC5B4\uBCF4\uC138\uC694";
const UI_INST_REDUCE_SAME = "\uAC19\uC740 \uAC83\uC744 \uC57D\uBD84\uD574\uBCF4\uC138\uC694";
const UI_INST_DRAG = "\uB4DC\uB798\uADF8\uD574\uBCF4\uC138\uC694";
const UI_HINT_AND = "\uD78C\uD2B8 : and";

/* ------------------------------ init ------------------------------ */
window.addEventListener("DOMContentLoaded", async () => {
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

/* ================== Params / Nav ================== */
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

/* ================== Styles ================== */
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --ink:#7e3106;
      --slot: rgba(126,49,6,0.04);
      --slot2: rgba(126,49,6,0.07);
      --slotBorder: rgba(126,49,6,0.22);
      --ok:#2e7d32;
      --no:#c62828;
      --hl: rgba(241,123,42,0.18);
      --hlBorder: rgba(241,123,42,0.60);
      --nounGold: rgba(212,175,55,0.20);
      --nounGold2: rgba(212,175,55,0.38);
      --aInk:#b85716;
      --aBg: rgba(241,123,42,0.08);
      --aBd: rgba(241,123,42,0.36);
      --aHl: rgba(241,123,42,0.20);
      --aHlBd: rgba(241,123,42,0.66);
      --bInk:#1f5fbf;
      --bBg: rgba(70,140,255,0.08);
      --bBd: rgba(70,140,255,0.36);
      --bHl: rgba(70,140,255,0.20);
      --bHlBd: rgba(70,140,255,0.68);
      --cInk:#7a45b8;
      --cBg: rgba(153,102,255,0.10);
      --cBd: rgba(153,102,255,0.42);
      --cHl: rgba(153,102,255,0.20);
      --cHlBd: rgba(153,102,255,0.68);
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
      margin-bottom:8px;
    }

    .hl{
      display:inline-block;
      padding:2px 6px;
      border-radius:10px;
      background: var(--hl);
      box-shadow: inset 0 0 0 1px var(--hlBorder);
      font-weight:900;
      color:#222;
    }
    .hl-a{ background: var(--aHl); box-shadow: inset 0 0 0 1px var(--aHlBd); color: var(--aInk); }
    .hl-b{ background: var(--bHl); box-shadow: inset 0 0 0 1px var(--bHlBd); color: var(--bInk); }
    .hl-c{ background: var(--cHl); box-shadow: inset 0 0 0 1px var(--cHlBd); color: var(--cInk); }

    .ab-line{
      line-height: 2.0;
      font-size: 16px;
      font-weight: 900;
      color: #222;
      word-break: keep-all;
    }
    .ab-row{ margin-bottom: 8px; }
    .ab-tag{
      font-size: 12px;
      font-weight: 900;
      color: #7e3106;
      margin-bottom: 4px;
    }
    .ab-card{
      position: relative;
      line-height: 1.75;
      font-size: 15px;
      font-weight: 900;
      color: #222;
      word-break: keep-all;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 10px 12px;
    }
    .ab-row.part-a .ab-tag,
    .ab-row.part-b .ab-tag,
    .ab-row.part-c .ab-tag{ color:#7e3106; }
    .ab-row.part-a .ab-card,
    .ab-row.part-b .ab-card,
    .ab-row.part-c .ab-card{ border-color:#ddd; background:#fff; }
    .ab-row.part-a .ab-card.done,
    .ab-row.part-b .ab-card.done,
    .ab-row.part-c .ab-card.done{
      background: rgba(46,125,50,0.10);
      border-color: rgba(46,125,50,0.42);
      box-shadow: 0 0 0 2px rgba(46,125,50,0.10);
    }
    .ab-card.joined-glow{
      background: rgba(46,125,50,0.14);
      border-color: rgba(46,125,50,0.54);
      box-shadow: 0 0 0 3px rgba(46,125,50,0.16), 0 0 14px rgba(46,125,50,0.20);
    }
    .tone-a, .tone-b, .tone-c{
      text-decoration-line: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
      text-decoration-skip-ink: none;
    }
    .tone-a{ text-decoration-color: rgba(241,123,42,0.90); }
    .tone-b{ text-decoration-color: rgba(70,140,255,0.92); }
    .tone-c{ text-decoration-color: rgba(153,102,255,0.92); }
    .ab-card.clickable{
      cursor:pointer;
      transition: background .12s ease, transform .12s ease, box-shadow .12s ease;
    }
    .ab-card.clickable:hover{
      background: rgba(241,123,42,0.06);
      transform: translateY(-0.6px);
      box-shadow: 0 0 0 2px rgba(241,123,42,0.10);
    }
    .ab-card.done{
      background: rgba(46,125,50,0.10);
      border-color: rgba(46,125,50,0.42);
      box-shadow: 0 0 0 2px rgba(46,125,50,0.10);
    }
    #ab-box{
      transition: background .28s ease, border-color .28s ease, box-shadow .28s ease;
    }
    #ab-box.nominal-face{
      background: linear-gradient(180deg, rgba(246,239,230,0.98) 0%, rgba(236,226,214,0.98) 100%);
      border-color: rgba(126,49,6,0.18);
      box-shadow: 0 10px 22px rgba(126,49,6,0.06);
    }
    .ab-flip-scene{
      perspective: 1200px;
    }
    .ab-flip-card{
      display:grid;
      position:relative;
      overflow:visible;
      transform-style: preserve-3d;
      transition:
        transform .58s cubic-bezier(.22,.88,.28,1),
        height .42s cubic-bezier(.22,.88,.28,1);
    }
    .ab-flip-card.is-flipped{
      transform: rotateY(180deg);
    }
    .ab-face{
      grid-area: 1 / 1;
      min-width: 0;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      transform-style: preserve-3d;
      pointer-events: none;
    }
    .ab-face.front{
      transform: rotateY(0deg);
      pointer-events: auto;
      transition: opacity .12s ease;
    }
    .ab-face.back{
      transform: rotateY(180deg);
    }
    .ab-flip-card.is-flipped .front{
      opacity:0;
      pointer-events:none;
    }
    .ab-flip-card.is-flipped .back{
      pointer-events:auto;
    }
    .ab-card.drag-source{
      cursor: grab;
      user-select: none;
    }
    .ab-card.drag-source.dragging{
      opacity:.55;
      cursor:grabbing;
    }
    .ab-card.over{
      border-color: rgba(70,140,255,0.82);
      box-shadow: 0 0 0 2px rgba(70,140,255,0.14);
      background: rgba(70,140,255,0.08);
    }
    .ab-card.join-target-glow{
      border-color: rgba(46,125,50,0.62) !important;
      box-shadow: 0 0 0 3px rgba(46,125,50,0.18), 0 0 16px rgba(46,125,50,0.20) !important;
      background: rgba(46,125,50,0.10) !important;
    }
    .ab-drag-ghost{
      position: fixed;
      left: 0;
      top: 0;
      z-index: 10001;
      pointer-events: none;
      opacity: .92;
      transform: translate3d(-9999px,-9999px,0);
      background:#fff;
      border:1px solid rgba(46,125,50,0.46);
      border-radius:12px;
      box-shadow: 0 10px 24px rgba(0,0,0,0.16), 0 0 0 2px rgba(46,125,50,0.12);
      padding: 10px 12px;
      line-height:1.7;
      font-size:14px;
      font-weight:900;
      color:#222;
      white-space: normal;
    }
    .ab-line.clickable{
      cursor:pointer;
      border-radius:12px;
      padding:6px 8px;
      margin: -4px -8px;
      transition: background .12s ease, transform .12s ease;
    }
    .ab-line.clickable:hover{
      background: rgba(241,123,42,0.08);
      transform: translateY(-0.6px);
    }
    .ab-hint{
      display:inline-block;
      font-size:12px;
      font-weight:900;
      color: rgba(126,49,6,0.72);
      margin-left:6px;
      opacity:.92;
    }
    .ab-hint.legacy-kor-hint{ display:none; }
    .tap-tip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      margin-left: 0;
      padding: 2px 7px;
      border-radius: 999px;
      border: 1px solid rgba(70,140,255,0.55);
      background: rgba(70,140,255,0.14);
      color: #1f4fb8;
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
      user-select: none;
      animation: tapBob 1s ease-in-out infinite;
      position:absolute;
      right:10px;
      top:-12px;
      z-index:2;
      pointer-events:none;
    }
    @keyframes tapBob{
      0%,100%{ transform: translateY(0); }
      50%{ transform: translateY(-2px); }
    }
    .inst-simple{
      font-weight:900;
      color:#7e3106;
      line-height:1.6;
    }
    .and-hint-wrap{
      display:flex;
      justify-content:center;
      margin: 4px 0 8px;
    }
    .and-hint-pill{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:4px 10px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.14);
      background:#fff;
      color:#7e3106;
      font-size:12px;
      font-weight:900;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      user-select:none;
      pointer-events:none;
    }

    .src-sentence{
      line-height: 2.0;
      font-size: 15px;
      font-weight: 900;
      color: #222;
      word-break: keep-all;
    }
    .srcTok{
      display:inline;
      border:none;
      border-radius:0;
      padding:0;
      background:transparent;
      margin: 0 4px 0 0;
      cursor: grab;
      user-select:none;
      text-decoration: underline;
      text-decoration-thickness: 1.5px;
      text-decoration-style: dashed;
      text-decoration-color: rgba(241,123,42,0.78);
      transition: color .12s ease, opacity .12s ease;
    }
    .srcTok:hover{ color:#b45716; }
    .srcTok.tok-a{ color: var(--aInk); text-decoration-color: rgba(241,123,42,0.82); }
    .srcTok.tok-b{ color: var(--bInk); text-decoration-color: rgba(70,140,255,0.82); }
    .srcTok.tok-a:hover{ color:#9a480f; }
    .srcTok.tok-b:hover{ color:#164fa1; }
    .srcTok.dragging{
      opacity:.42;
      cursor:grabbing;
    }
    .srcTok.used{
      opacity: .22;
      cursor: not-allowed;
      color: rgba(0,0,0,0.42);
      text-decoration-color: rgba(241,123,42,0.30);
    }
    .srcTok.nope{
      background: rgba(198,40,40,0.08);
    }
    .srcTok.verb{
      display:inline-block;
      padding:1px 6px;
      border-radius:9px;
      border: 1px solid currentColor;
      box-shadow: 0 0 0 2px rgba(0,0,0,0.05);
      background: rgba(0,0,0,0.03);
    }
    .srcTok.tok-a.verb{
      box-shadow: 0 0 0 2px rgba(241,123,42,0.14);
      background: rgba(241,123,42,0.10);
    }
    .srcTok.tok-b.verb{
      box-shadow: 0 0 0 2px rgba(70,140,255,0.16);
      background: rgba(70,140,255,0.12);
    }

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
      cursor: pointer;
      position: relative;
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
    .drop-word-slot.bad{
      box-shadow: 0 0 0 3px rgba(198,40,40,0.12);
      background: rgba(198,40,40,0.10);
      border-color: rgba(198,40,40,0.58);
      color: #7e3106;
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
      transition: background .12s ease, transform .12s ease, box-shadow .12s ease;
    }
    .slot:hover{
      background: var(--slot2);
      transform: translateY(-0.6px);
    }
    .slot.selected{
      box-shadow: 0 0 0 3px rgba(126,49,6,0.10);
    }
    .slot.bad{
      box-shadow: 0 0 0 3px rgba(198,40,40,0.10);
      background: rgba(198,40,40,0.06);
    }
    .ghost{ opacity:.25; font-weight:900; }

    .noun-pending{
      border-color: rgba(241,123,42,0.70) !important;
      box-shadow: 0 0 0 2px rgba(241,123,42,0.12);
      animation: nounPulse 0.95s ease-in-out infinite;
    }
    @keyframes nounPulse{
      0%,100%{ transform: translateY(0); box-shadow: 0 0 0 2px rgba(241,123,42,0.10); }
      50%{ transform: translateY(-0.6px); box-shadow: 0 0 0 4px rgba(241,123,42,0.14); }
    }
    .noun-done{
      border-color: rgba(212,175,55,0.85) !important;
      background: linear-gradient(180deg, rgba(255, 244, 210, 0.92) 0%, rgba(255, 235, 170, 0.58) 100%);
      box-shadow: 0 0 0 2px rgba(212,175,55,0.16), 0 8px 18px rgba(212,175,55,0.14);
    }
    .noun-bang{ animation: nounBang 320ms cubic-bezier(.15, 1.25, .25, 1) both; }
    @keyframes nounBang{
      0%{ transform: scale(1); }
      35%{ transform: scale(1.18) rotate(-1.2deg); }
      70%{ transform: scale(0.98) rotate(0.6deg); }
      100%{ transform: scale(1); }
    }
    .noun-float{
      position:absolute;
      right:-6px;
      top:-12px;
      font-size:11px;
      font-weight:900;
      letter-spacing:0.2px;
      color: rgba(126,49,6,0.45);
      text-shadow: 0 10px 16px rgba(0,0,0,0.10);
      transform: rotate(-10deg);
      pointer-events:none;
      animation: nounFloat 760ms ease-out forwards;
    }
    @keyframes nounFloat{
      0%{ opacity:0; transform: translateY(2px) scale(0.96) rotate(-10deg); }
      22%{ opacity:0.55; }
      100%{ opacity:0; transform: translateY(-16px) scale(1.10) rotate(-10deg); }
    }

    .controls-inline{
      display:flex;
      gap:8px;
      margin-top:10px;
      justify-content:flex-end;
    }
    .icon-btn{
      padding:8px 10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      font-weight:900;
      cursor:pointer;
      user-select:none;
    }
    .icon-btn:disabled{ opacity:.45; cursor:not-allowed; }

    .answer-line{
      min-height:44px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.10);
      background:#fff;
      line-height:1.6;
      font-size:15px;
      word-break:keep-all;
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

    .shake{ animation: shake 260ms ease-in-out; }
    @keyframes shake{
      0%{ transform: translateX(0); }
      25%{ transform: translateX(-4px); }
      50%{ transform: translateX(4px); }
      75%{ transform: translateX(-3px); }
      100%{ transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);
}

/* ================== Load Excel ================== */
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

/* ================== Build Questions ================== */
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
    const transformRaw =
      String(r["Transforms"] ?? r["Transform"] ?? r["TransformMap"] ?? "").trim();
    const laststageFinalRaw =
      String(r["Laststage-FinalSentence"] ?? r["LaststageFinalSentence"] ?? "").trim();
    const laststageKRTokensRaw =
      String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();

    const { a, b, c } = splitAandBandC(questionRaw);
    const { english, korean } = splitEnglishAndKoreanByDash(answerRaw);

    // Answer에서 (A명사구) and (B명사구) + (C의 predicate) 분리
    const split = extractTwoNominalsFromAnswer(english, c);

    return {
      qNumber,
      title,
      instruction,
      aRaw: a,
      bRaw: b,
      cRaw: c,
      englishAnswer: english,
      koreanAnswer: korean,
      subjectA: split.subjectA,
      subjectB: split.subjectB,
      subjectCombined: split.subjectCombined,
      transformRules: parseTransformRules(transformRaw),
      laststageFinalSentence: laststageFinalRaw,
      laststageKRTokens: laststageKRTokensRaw
    };
  });
}

function parseTransformRules(raw){
  const s = String(raw || "").trim();
  if (!s) return [];
  const chunks = s.split(/[;,|]/).map(x => x.trim()).filter(Boolean);
  const out = [];
  chunks.forEach((c) => {
    let m = c.match(/^(.+?)\s*->\s*(.+)$/);
    if (!m) m = c.match(/^(.+?)\s*>\s*(.+)$/);
    if (!m) m = c.match(/^(.+?)\s*:\s*(.+)$/);
    if (!m) return;
    const from = normalizeWord(m[1]);
    const to = normalizeWord(m[2]);
    if (!from || !to) return;
    out.push({ from, to });
  });
  return out;
}

function isPrefillTransformSource(fromLower){
  const f = normalizeWord(fromLower || "");
  return f === "_" || f === "prefill" || f === "fixed" || f === "insert" || f === "auto";
}

function findConfiguredTransformSourceForTarget(targetLower, srcTokens){
  const tgt = normalizeWord(targetLower || "");
  if (!tgt) return "";
  const srcSet = new Set((srcTokens || []).map((t) => normalizeWord(t?.lower || "")));
  const rules = Array.isArray(currentTransformRules) ? currentTransformRules : [];
  for (const r of rules) {
    const to = normalizeWord(r?.to || "");
    const from = normalizeWord(r?.from || "");
    if (!to || !from || to !== tgt) continue;
    if (isPrefillTransformSource(from)) continue;
    if (srcSet.has(from)) return from;
  }
  return "";
}

function hasConfiguredPrefillForTarget(targetLower){
  const tgt = normalizeWord(targetLower || "");
  if (!tgt) return false;
  const rules = Array.isArray(currentTransformRules) ? currentTransformRules : [];
  return rules.some((r) => {
    const to = normalizeWord(r?.to || "");
    const from = normalizeWord(r?.from || "");
    return to === tgt && isPrefillTransformSource(from);
  });
}

function splitAandBandC(questionRaw){
  const s = String(questionRaw || "").trim();
  // A. ... B. ... C. ...
  const m = s.match(/A\.\s*([\s\S]*?)\s*B\.\s*([\s\S]*?)\s*C\.\s*([\s\S]*)$/i);
  if (m) return { a: m[1].trim(), b: m[2].trim(), c: m[3].trim() };
  // fallback: A/B only
  const m2 = s.match(/A\.\s*([\s\S]*?)\s*B\.\s*([\s\S]*)$/i);
  if (m2) return { a: m2[1].trim(), b: m2[2].trim(), c: "" };
  return { a: s, b: "", c: "" };
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

/* ---- 핵심: Answer에서 A명사구/B명사구 추출 ---- */
function extractTwoNominalsFromAnswer(englishAnswer, cRaw){
  const ans = stripTrailingPunct(String(englishAnswer || "").trim());
  const c = stripTrailingPunct(stripDoubleStarMarkers(String(cRaw || "").trim()));

  if (!c) {
    // C가 없으면 기존처럼 "답의 앞 절반"을 A로
    return { subjectA: guessSubjectByVerb(ans), subjectB:"", subjectCombined: guessSubjectByVerb(ans) };
  }

  const cTokens = wordsOnly(c);
  const cPred = cTokens.filter((w, i) => !(i === 0 && normalizeWord(w) === "it")); // remove leading It
  const ansTokens = wordsOnly(ans);

  const pos = findSubsequence(ansTokens.map(normalizeWord), cPred.map(normalizeWord));
  let combined = "";
  if (pos === -1) {
    // fallback: main verb-ish split
    combined = guessSubjectByVerb(ans);
  } else {
    combined = ansTokens.slice(0, pos).join(" ").trim();
  }

  // split by the first "and" token
  const combTokens = wordsOnly(combined);
  const andIdx = combTokens.map(normalizeWord).indexOf("and");
  if (andIdx === -1) {
    return { subjectA: combined.trim(), subjectB:"", subjectCombined: combined.trim() };
  }
  const aPhrase = combTokens.slice(0, andIdx).join(" ").trim();
  const bPhrase = combTokens.slice(andIdx + 1).join(" ").trim();

  return { subjectA: aPhrase, subjectB: bPhrase, subjectCombined: combined.trim() };
}

function guessSubjectByVerb(answer){
  const toks = wordsOnly(answer);
  if (toks.length <= 2) return answer;
  const idx = toks.findIndex((w, i) => i>0 && i<toks.length-1 && looksVerbish(w));
  if (idx <= 0) return toks.slice(0, Math.max(1, Math.floor(toks.length/2))).join(" ");
  return toks.slice(0, idx).join(" ");
}
function looksVerbish(w){
  const lw = normalizeWord(w);
  return /(ed|ing|s)$/.test(lw) || ["is","are","was","were","be","been","being","has","have","had","did","do","does"].includes(lw);
}
function wordsOnly(s){
  return (String(s||"").match(/\s+|[^\s]+/g) || []).filter(p => !/^\s+$/.test(p));
}
function findSubsequence(hay, needle){
  if (!needle.length) return -1;
  for (let i=0; i<=hay.length-needle.length; i++){
    let ok = true;
    for (let j=0; j<needle.length; j++){
      if (hay[i+j] !== needle[j]) { ok=false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

/* ================== Intro ================== */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L6-E2";
  const instruction =
    questions[0]?.instruction ||
    "A와 B를 각각 명사구로 만들고, C의 It을 눌러 한 문장으로 만든 뒤 뜻을 완성하세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L6-E2</div>

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
        1) A를 눌러 명사구 만들기 완료<br/>
        2) B를 눌러 명사구 만들기 완료<br/>
        3) C의 <b>It</b>을 눌러 한 문장으로 합치기<br/>
        4) 뜻(순서) 완성 후 제출
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

/* ================== Main Render ================== */
function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  // reset flags
  isAnswered = false;
  stage1AOk = false;
  stage1BOk = false;
  stageReduceOk = false;
  stageABOk = false;
  stage2Ok = false;
  stage3Ok = false;
  stage3Shown = false;

  nominalOpen = false;
  nominalPart = null;
  selectedSlotIndex = -1;
  moveHistory = [];
  nominalActiveSlotIndex = 0;
  nominalHasFirstDrag = false;
  stopNominalDragTipArcHint();
  stopReduceDragTipArcHint();
  removeABJoinGhost();
  abFlipDefaultHeight = 0;
  if (nominalFlipCleanupTimer) {
    clearTimeout(nominalFlipCleanupTimer);
    nominalFlipCleanupTimer = null;
  }
  korBankTokens = [];
  korSelectedTokens = [];

  // set raw
  aRaw = String(q.aRaw || "").trim();
  bRaw = String(q.bRaw || "").trim();
  cRaw = String(q.cRaw || "").trim();
  englishAnswerRaw = String(q.englishAnswer || "").trim();
  koreanAnswerRaw = String(q.koreanAnswer || "").trim();
  currentTransformRules = Array.isArray(q.transformRules) ? q.transformRules.slice() : [];
  laststageFinalSentenceRaw = String(q.laststageFinalSentence || "").trim();
  laststageKRTokensRaw = String(q.laststageKRTokens || "").trim();

  // nominal targets
  subjA = String(q.subjectA || "").trim();
  subjB = String(q.subjectB || "").trim();
  subjCombined = String(q.subjectCombined || "").trim();

  // build per-part token/slot plans
  nominalState.A.targetPhrase = subjA;
  nominalState.B.targetPhrase = subjB;

  nominalState.A.srcTokens = buildSourceTokensFromDoubleStarSentence(aRaw);
  nominalState.B.srcTokens = buildSourceTokensFromDoubleStarSentence(bRaw);

  const planA = buildSlotsPlanForNominal(subjA, nominalState.A.srcTokens);
  const planB = buildSlotsPlanForNominal(subjB, nominalState.B.srcTokens);

  nominalState.A.slots = planA.slots;
  nominalState.A.headLower = planA.headLower;
  nominalState.A.headText  = planA.headText;

  nominalState.B.slots = planB.slots;
  nominalState.B.headLower = planB.headLower;
  nominalState.B.headText  = planB.headText;

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" id="instruction-box">
      <div class="inst-simple" id="instruction-text"></div>
    </div>

    <div class="box" id="ab-box">
      <div class="ab-flip-scene">
        <div class="ab-flip-card" id="ab-flip-card">
          <!-- A/B/C 원문 화면 -->
          <div class="ab-face front" id="ab-face-front">
            <div id="ab-view"></div>
          </div>

          <!-- 인플레이스 1단계(명사구 만들기) 화면 -->
          <div class="ab-face back" id="ab-face-back">
            <div id="nominal-view"></div>
          </div>
        </div>
      </div>
    </div>

    ${window.HermaStageTemplates?.translateBlockHTML?.() || `
      <div id="translate-block" class="hidden">
        <div class="box" style="margin-bottom:10px;">
          <div class="sentence" id="plain-english-line"></div>
        </div>
        <div class="sentence" id="answer-line" style="min-height:86px; display:flex; flex-wrap:wrap; align-items:flex-start; gap:6px;"></div>
        <div class="box" style="margin-top:10px;">
          <div id="bank-area"></div>
          <div id="remain-info" style="margin-top:8px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78);"></div>
        </div>
      </div>
    `}

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()" disabled>제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  renderInstruction();
  renderABView();
  wireABDelegation();
  deferCaptureABFlipDefaultHeight();
}

function renderABView(){
  const ab = document.getElementById("ab-view");
  if (!ab) return;

  renderInstruction();

  // stage2 이후: 완결 문장만 표시
  if (stage2Ok) {
    stopReduceDragTipArcHint();
    const finalHtml = renderFinalSegmentUnderlinedHtml();
    ab.innerHTML = `
      <div class="ab-row part-a">
        <div class="ab-card">${finalHtml}</div>
      </div>
    `;
    syncABFlipCardHeight("front");
    return;
  }
  const canBDrag = stage1AOk && stage1BOk && !stageABOk;
  const canReduceAfterJoin = stage1AOk && stage1BOk && stageABOk && !stageReduceOk;
  const canCDrag = stage1AOk && stage1BOk && stageABOk && stageReduceOk;

  if (canCDrag) {
    const combined = renderFinalSentenceWithNounHighlights(buildCombinedNominalDisplay());
    const cLineHtml = renderCWithItClickable(cRaw, false, true);
    ab.innerHTML = `
      <div class="ab-row part-a">
        <div class="ab-tag">A+B문장</div>
        <div id="ab-combined-target" class="ab-card done joined-glow"><span class="tone-a">${combined}</span></div>
      </div>
      <div class="ab-row part-c">
        <div class="ab-tag">C문장</div>
        <div id="c-drag-source" class="ab-card done drag-source" draggable="true">
          <span class="tone-b">${cLineHtml}</span>
        </div>
      </div>
    `;
    setupReductionDrag();
    startReduceDragTipArc("c-drag-source", "ab-combined-target");
    syncABFlipCardHeight("front");
    return;
  }

  if (canReduceAfterJoin) {
    const combined = renderFinalSentenceWithNounHighlights(buildCombinedNominalDisplay());
    const cLineHtml = renderCWithItClickable(cRaw, true, false);
    ab.innerHTML = `
      <div class="ab-row part-a">
        <div class="ab-tag">A+B문장</div>
        <div class="ab-card done joined-glow"><span class="tone-a">${combined}</span></div>
      </div>
      <div class="ab-row part-c">
        <div class="ab-tag">C문장</div>
        <div class="ab-card">
          <span id="c-it-wrap" class="tone-b">${cLineHtml}</span>
        </div>
      </div>
    `;
    stopReduceDragTipArcHint();
    syncABFlipCardHeight("front");
    return;
  }

  stopReduceDragTipArcHint();
  const aDisplay = stage1AOk
    ? renderNominalPhraseWithHead(buildPartNominalDisplay("A") || subjA, nominalState.A.headLower)
    : renderDoubleStarAsHighlight(aRaw);
  const bDisplay = stage1BOk
    ? renderNominalPhraseWithHead(buildPartNominalDisplay("B") || subjB, nominalState.B.headLower)
    : renderDoubleStarAsHighlight(bRaw);
  const cDisplay = renderCWithItClickable(cRaw, false, false);
  const aHint = stage1AOk
    ? ``
    : `<span class="ab-hint legacy-kor-hint">👆 눌러서 명사구</span><span class="tap-tip">tap</span>`;
  const bHint = stage1BOk || !stage1AOk
    ? ``
    : `<span class="ab-hint legacy-kor-hint">👆 눌러서 명사구</span><span class="tap-tip">tap</span>`;

  const aCardId = canBDrag ? "a-drop-target" : "a-line";
  const aRole = stage1AOk ? "" : `data-role="a-line"`;
  const bRole = (stage1AOk && !stage1BOk) ? `data-role="b-line"` : "";
  const bDragAttr = canBDrag ? `id="b-drag-source" draggable="true"` : "";
  const bDragClass = canBDrag ? "drag-source" : "";
  const andHintHtml = canBDrag
    ? `<div class="and-hint-wrap"><span class="and-hint-pill">${UI_HINT_AND}</span></div>`
    : ``;

  ab.innerHTML = `
    <div class="ab-row part-a">
      <div class="ab-tag">A문장</div>
      <div id="${aCardId}" class="ab-card ${stage1AOk ? "done" : "clickable"}" ${aRole}>
        <span class="tone-a">${aDisplay}</span> ${aHint}
      </div>
    </div>
    ${andHintHtml}
    <div class="ab-row part-b">
      <div class="ab-tag">B문장</div>
      <div class="ab-card ${(stage1AOk && !stage1BOk) ? "clickable" : (stage1BOk ? "done" : "")} ${bDragClass}" ${bRole} ${bDragAttr}>
        <span class="tone-b">${bDisplay}</span> ${bHint}
      </div>
    </div>
    <div class="ab-row part-c">
      <div class="ab-tag">C문장</div>
      <div class="ab-card ${stageReduceOk ? "done" : ""}">
        <span id="c-it-wrap" class="tone-c">${cDisplay}</span>
      </div>
    </div>
  `;

  if (canBDrag) {
    setupABJoinDrag();
    startReduceDragTipArc("b-drag-source", "a-drop-target");
  } else {
    stopReduceDragTipArcHint();
  }
  syncABFlipCardHeight("front");
}

function renderInstruction(){
  const box = document.getElementById("instruction-box");
  const text = document.getElementById("instruction-text");
  if (!box || !text) return;

  if (stage2Ok) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  if (!stage1AOk || !stage1BOk) {
    text.textContent = UI_INST_FLIP;
    return;
  }
  if (!stageABOk) {
    text.textContent = UI_INST_DRAG;
    return;
  }
  text.textContent = stageReduceOk ? UI_INST_DRAG : UI_INST_REDUCE_SAME;
}

function buildPartNominalDisplay(part){
  const st = nominalState[part];
  if (!st || !Array.isArray(st.slots)) return "";
  const words = [];
  st.slots.forEach((s) => {
    if (s.kind === "fixed" && s.text) words.push(s.text);
    else if (s.kind === "slot" && s.filled && s.text) words.push(s.text);
  });
  return words.join(" ").trim();
}

function buildCombinedNominalDisplay(){
  const a = buildPartNominalDisplay("A") || subjA;
  const b = buildPartNominalDisplay("B") || subjB;
  if (a && b) return `${a} and ${b}`;
  return subjCombined || `${a} ${b}`.trim();
}

function getTransparentDragImage(){
  if (transparentDragImage) return transparentDragImage;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  transparentDragImage = canvas;
  return transparentDragImage;
}

function createABJoinGhostFromSource(srcEl, x, y){
  removeABJoinGhost();
  if (!srcEl) return;
  const rect = srcEl.getBoundingClientRect();
  const ghost = document.createElement("div");
  ghost.className = "ab-drag-ghost";
  ghost.innerHTML = srcEl.innerHTML;
  ghost.style.width = `${Math.max(120, rect.width)}px`;
  document.body.appendChild(ghost);
  abJoinGhostEl = ghost;
  moveABJoinGhost(x || (rect.left + rect.width / 2), y || (rect.top + rect.height / 2));
}

function moveABJoinGhost(x, y){
  if (!abJoinGhostEl) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const w = abJoinGhostEl.offsetWidth || 140;
  const h = abJoinGhostEl.offsetHeight || 44;
  const gx = x - (w / 2);
  const gy = y - (h / 2);
  abJoinGhostEl.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
}

function removeABJoinGhost(){
  if (abJoinGhostEl && abJoinGhostEl.parentNode) {
    abJoinGhostEl.parentNode.removeChild(abJoinGhostEl);
  }
  abJoinGhostEl = null;
}

function setupABJoinDrag(){
  const src = document.getElementById("b-drag-source");
  const dst = document.getElementById("a-drop-target");
  if (!src || !dst || stage2Ok || stageABOk) return;

  src.draggable = true;
  const onDocDragOver = (ev) => {
    moveABJoinGhost(ev.clientX, ev.clientY);
  };
  const cleanup = () => {
    document.removeEventListener("dragover", onDocDragOver, true);
    dst.classList.remove("join-target-glow");
    dst.classList.remove("over");
    removeABJoinGhost();
  };
  src.addEventListener("dragstart", (e) => {
    if (isAnswered || stage2Ok || stageABOk) return;
    src.classList.add("dragging");
    stopReduceDragTipArcHint();
    try { e.dataTransfer.setData("text/abjoin", "1"); } catch (_) {}
    try { e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0); } catch (_) {}
    createABJoinGhostFromSource(src, e.clientX, e.clientY);
    document.addEventListener("dragover", onDocDragOver, true);
  });
  src.addEventListener("dragend", () => {
    src.classList.remove("dragging");
    cleanup();
  });

  dst.addEventListener("dragover", (e) => {
    if (isAnswered || stage2Ok || stageABOk) return;
    e.preventDefault();
    dst.classList.add("over");
    dst.classList.add("join-target-glow");
    moveABJoinGhost(e.clientX, e.clientY);
  });
  dst.addEventListener("dragleave", () => {
    dst.classList.remove("over");
    dst.classList.remove("join-target-glow");
  });
  dst.addEventListener("drop", (e) => {
    if (isAnswered || stage2Ok || stageABOk) return;
    e.preventDefault();
    cleanup();
    onABJoinDragDone();
  });
}

function setupReductionDrag(){
  const src = document.getElementById("c-drag-source");
  const dst = document.getElementById("ab-combined-target");
  if (!src || !dst || stage2Ok || !stageReduceOk || !stageABOk) return;

  src.draggable = true;
  src.addEventListener("dragstart", (e) => {
    if (isAnswered || stage2Ok) return;
    src.classList.add("dragging");
    stopReduceDragTipArcHint();
    try { e.dataTransfer.setData("text/reduce", "1"); } catch (_) {}
  });
  src.addEventListener("dragend", () => {
    src.classList.remove("dragging");
  });

  dst.addEventListener("dragover", (e) => {
    if (isAnswered || stage2Ok) return;
    e.preventDefault();
    dst.classList.add("over");
  });
  dst.addEventListener("dragleave", () => {
    dst.classList.remove("over");
  });
  dst.addEventListener("drop", (e) => {
    if (isAnswered || stage2Ok) return;
    e.preventDefault();
    dst.classList.remove("over");
    onReduceDragDone();
  });
}

function stopReduceDragTipArcHint(){
  if (typeof stopReduceDragTipArc === "function") {
    try { stopReduceDragTipArc(); } catch (_) {}
  }
  stopReduceDragTipArc = null;
}

function startReduceDragTipArc(sourceId = "c-drag-source", targetId = "ab-combined-target"){
  stopReduceDragTipArcHint();
  if (isAnswered || stage2Ok) return;
  const source = document.getElementById(sourceId);
  const target = document.getElementById(targetId);
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
  const arcLift = 34;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const frame = (ts) => {
    if (!alive) return;
    if (!document.body.contains(tip)) { alive = false; return; }
    if (!cycleStartTs) cycleStartTs = ts;
    let elapsed = ts - cycleStartTs;
    if (elapsed > durationMs + pauseMs) { cycleStartTs = ts; elapsed = 0; }
    const sRect = source.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    if (!sRect.width || !tRect.width) { rafId = requestAnimationFrame(frame); return; }

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
  stopReduceDragTipArc = () => {
    alive = false;
    cancelAnimationFrame(rafId);
    if (tip.parentNode) tip.parentNode.removeChild(tip);
  };
}

function wireABDelegation(){
  const box = document.getElementById("ab-box");
  if (!box) return;

  box.onclick = (ev) => {
    if (isAnswered) return;

    const aLine = ev.target.closest('[data-role="a-line"]');
    if (aLine && !stage1AOk && !nominalOpen) {
      openNominalInPlace("A");
      return;
    }

    const bLine = ev.target.closest('[data-role="b-line"]');
    if (bLine && stage1AOk && !stage1BOk && !nominalOpen) {
      openNominalInPlace("B");
      return;
    }

    const itEl = ev.target.closest("[data-ctok]");
    if (itEl && stage1AOk && stage1BOk && stageABOk && !stageReduceOk && !stage2Ok) {
      if ((itEl.getAttribute("data-clean") || "") !== "it") return;
      onItClicked(itEl);
      return;
    }
  };
}

function captureABFlipDefaultHeight(){
  const front = document.getElementById("ab-view");
  if (!front) return;
  const h = Math.max(
    Math.ceil(front.getBoundingClientRect().height || 0),
    Math.ceil(front.scrollHeight || 0)
  );
  if (h > 0) abFlipDefaultHeight = h;
}

function deferCaptureABFlipDefaultHeight(){
  requestAnimationFrame(() => {
    if (!nominalOpen) captureABFlipDefaultHeight();
  });
}

function syncABFlipCardHeight(face){
  const card = document.getElementById("ab-flip-card");
  if (!card) return;
  if (face === "back") {
    card.style.height = "";
    return;
  }
  if (face === "front" && abFlipDefaultHeight > 0) {
    const front = document.getElementById("ab-view");
    if (front) {
      const h = Math.max(
        Math.ceil(front.getBoundingClientRect().height || 0),
        Math.ceil(front.scrollHeight || 0)
      );
      if (h > 0) abFlipDefaultHeight = h;
    }
    card.style.height = `${abFlipDefaultHeight}px`;
    return;
  }
  card.style.height = "";
}

function deferSyncABFlipCardHeight(face){
  requestAnimationFrame(() => syncABFlipCardHeight(face));
}

/* ================== Stage1 In-place Nominal Builder (A or B) ================== */
function openNominalInPlace(part){
  const ab = document.getElementById("ab-view");
  const nv = document.getElementById("nominal-view");
  const flip = document.getElementById("ab-flip-card");
  const abBox = document.getElementById("ab-box");
  if (!ab || !nv) return;
  if (nominalFlipCleanupTimer) {
    clearTimeout(nominalFlipCleanupTimer);
    nominalFlipCleanupTimer = null;
  }

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.classList.add("hidden");

  nominalPart = part;
  const st = nominalState[part];
  if (!st) return;

  // switch active refs
  srcTokens = st.srcTokens;
  slots = st.slots;
  selectedSlotIndex = 0;
  nominalActiveSlotIndex = 0;
  nominalHasFirstDrag = false;
  moveHistory = [];

  stopReduceDragTipArcHint();
  stopNominalDragTipArcHint();
  nominalOpen = true;

  nv.innerHTML = `
    <div class="sentence">
      <div class="src-sentence" id="src-sentence"></div>
    </div>
    <div class="sentence" style="margin-top:8px;">
      <div class="target-line" id="target-line"></div>
    </div>
  `;

  renderSourceSentence();
  renderTargetLine();
  startNominalDragTipArc();
  syncABFlipCardHeight("back");
  requestAnimationFrame(() => {
    if (abBox) abBox.classList.add("nominal-face");
    if (flip) flip.classList.add("is-flipped");
  });
}

function closeNominalInPlace(){
  const ab = document.getElementById("ab-view");
  const nv = document.getElementById("nominal-view");
  const flip = document.getElementById("ab-flip-card");
  const abBox = document.getElementById("ab-box");
  if (!ab || !nv) return;

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn && !isAnswered) submitBtn.classList.remove("hidden");

  stopNominalDragTipArcHint();
  nominalOpen = false;
  nominalPart = null;

  renderABView();
  syncABFlipCardHeight("front");
  requestAnimationFrame(() => {
    if (flip) flip.classList.remove("is-flipped");
    if (abBox) abBox.classList.remove("nominal-face");
  });
  nominalFlipCleanupTimer = setTimeout(() => {
    if (nv) nv.innerHTML = "";
    nominalFlipCleanupTimer = null;
  }, 620);
}

function maybeAutoCompleteStage1(){
  if (!areAllSlotsFilled()) return;

  const built = buildUserSubjectPhrase();
  const target = normalizeEnglish((nominalState[nominalPart]?.targetPhrase || "").trim());

  if (built === target) {
    if (nominalPart === "A") stage1AOk = true;
    if (nominalPart === "B") stage1BOk = true;
    stopNominalDragTipArcHint();
    if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");

    setTimeout(() => {
      closeNominalInPlace();
    }, 320);
    return;
  }

  if (hasPendingNounConversion()) {
    return;
  }
}

/* ---- render / click ---- */
function renderSourceSentence(){
  const wrap = document.getElementById("src-sentence");
  if (!wrap) return;

  wrap.innerHTML = "";
  const tokPartClass = nominalPart === "B" ? "tok-b" : "tok-a";
  srcTokens.forEach((t) => {
    const sp = document.createElement("span");
    sp.className = "srcTok " + tokPartClass + (t.used ? " used" : "") + (t.verb ? " verb" : "");
    sp.textContent = t.display;
    sp.setAttribute("data-token-id", t.id);
    sp.draggable = !t.used;

    sp.addEventListener("click", () => {
      if (isAnswered || t.used) return;
      onClickSourceToken(t.id, sp);
    });
    sp.addEventListener("dragstart", (e) => {
      if (isAnswered || t.used) return;
      sp.classList.add("dragging");
      try { e.dataTransfer.setData("text/plain", t.id); } catch (_) {}
    });
    sp.addEventListener("dragend", () => {
      sp.classList.remove("dragging");
    });

    wrap.appendChild(sp);
  });

  if (nominalOpen) deferSyncABFlipCardHeight("back");
}

function onClickSourceToken(tokenId, el){
  const t = srcTokens.find(x => x.id === tokenId);
  if (!t || t.used || isAnswered) return;

  const targetIndex = pickTargetSlotIndex();
  if (targetIndex === -1) return;

  const slot = slots[targetIndex];
  if (!slot || slot.kind !== "slot" || slot.filled) return;

  const prevText = slot.text || "";
  const prevApplied = !!slot.nounApplied;

  slot.filled = true;
  slot.fromTokenId = t.id;

  if (slot.fillRule === "verbNOUN" || slot.fillRule === "transform") {
    slot.text = t.clean;
    slot.canNoun = canApplyNounConversion(slot, t);
    slot.nounText = slot.nounText || "";
    slot.nounApplied = false;
  } else {
    slot.text = t.clean;
    slot.canNoun = false;
    slot.nounText = "";
    slot.nounApplied = false;
  }

  t.used = true;
  if (!nominalHasFirstDrag) {
    nominalHasFirstDrag = true;
    stopNominalDragTipArcHint();
  }

  moveHistory.push({
    slotIndex: targetIndex,
    tokenId: t.id,
    prevSlotText: prevText,
    prevNounApplied: prevApplied,
  });

  const nextSlot = findNextEmptySlotIndex(targetIndex + 1);
  nominalActiveSlotIndex = nextSlot >= 0 ? nextSlot : targetIndex;
  selectedSlotIndex = nominalActiveSlotIndex;
  renderSourceSentence();
  renderTargetLine();

  maybeAutoCompleteStage1();
}

function renderTargetLine(){
  const tl = document.getElementById("target-line");
  if (!tl) return;

  tl.innerHTML = "";

  slots.forEach((s, i) => {
    if (s.kind === "fixed") {
      const span = document.createElement("span");
      span.className = "fixed" + (s.faded ? " faded" : "");
      span.textContent = s.text;
      tl.appendChild(span);
      tl.appendChild(document.createTextNode(" "));
      return;
    }

    const slot = document.createElement("span");
    const filled = !!(s.filled && s.text);
    slot.className =
      "drop-word-slot" +
      (filled ? " filled" : " empty") +
      (i === nominalActiveSlotIndex ? " active" : "") +
      (s.canNoun && !s.nounApplied ? " noun-pending" : "") +
      (s.nounApplied ? " noun-done" : "");
    slot.setAttribute("data-slot", String(i));

    const label = document.createElement("span");
    label.className = s.filled ? "" : "ghost";
    label.textContent = s.filled ? s.text : "…";
    slot.appendChild(label);

    slot.addEventListener("click", () => {
      if (isAnswered) return;

      // verbNOUN 슬롯: 2nd click => noun으로 변환
      if (s.filled && s.canNoun && !s.nounApplied) {
        s.text = s.nounText || s.text;
        s.nounApplied = true;

        label.textContent = s.text;

        slot.classList.remove("noun-pending");
        slot.classList.add("noun-done");
        slot.classList.remove("noun-bang");
        void slot.offsetWidth;
        slot.classList.add("noun-bang");

        const fx = document.createElement("span");
        fx.className = "noun-float";
        fx.textContent = "noun!";
        slot.appendChild(fx);
        setTimeout(() => fx.remove(), 900);

        setTimeout(() => {
          renderTargetLine();
          maybeAutoCompleteStage1();
        }, 220);
        return;
      }

      if (s.filled) {
        const tokId = s.fromTokenId || "";
        s.filled = false;
        s.text = "";
        s.fromTokenId = "";
        s.canNoun = false;
        s.nounText = "";
        s.nounApplied = false;

        const tok = srcTokens.find(x => x.id === tokId);
        if (tok) tok.used = false;

        nominalActiveSlotIndex = i;
        selectedSlotIndex = i;
        renderSourceSentence();
        renderTargetLine();
        return;
      }

      if (!s.filled) {
        nominalActiveSlotIndex = i;
        selectedSlotIndex = i;
        renderTargetLine();
      }
    });
    slot.addEventListener("dragover", (e) => {
      if (isAnswered) return;
      if (s.filled) return;
      e.preventDefault();
      slot.classList.add("over");
    });
    slot.addEventListener("dragleave", () => {
      slot.classList.remove("over");
    });
    slot.addEventListener("drop", (e) => {
      if (isAnswered) return;
      if (s.filled) return;
      e.preventDefault();
      slot.classList.remove("over");
      const tokenId = String(e.dataTransfer?.getData("text/plain") || "").trim();
      if (!tokenId) return;
      nominalActiveSlotIndex = i;
      selectedSlotIndex = i;
      onClickSourceToken(tokenId, null);
    });

    tl.appendChild(slot);
    tl.appendChild(document.createTextNode(" "));
  });

  if (!nominalHasFirstDrag) startNominalDragTipArc();
  if (nominalOpen) deferSyncABFlipCardHeight("back");
}

function pickTargetSlotIndex(){
  if (nominalActiveSlotIndex >= 0) {
    const s0 = slots[nominalActiveSlotIndex];
    if (s0 && s0.kind === "slot" && !s0.filled) return nominalActiveSlotIndex;
  }
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

function findNextEmptySlotIndex(startIdx){
  const start = Number.isFinite(startIdx) ? startIdx : 0;
  for (let i=start; i<slots.length; i++){
    const s = slots[i];
    if (s && s.kind === "slot" && !s.filled) return i;
  }
  for (let i=0; i<start; i++){
    const s = slots[i];
    if (s && s.kind === "slot" && !s.filled) return i;
  }
  return -1;
}

function buildUserSubjectPhrase(){
  const words = [];
  slots.forEach((s) => {
    if (s.kind === "fixed") words.push(s.text);
    else if (s.kind === "slot" && s.filled && s.text) words.push(s.text);
  });
  return normalizeEnglish(words.join(" "));
}
function areAllSlotsFilled(){
  return slots.every(s => s.kind !== "slot" || s.filled);
}

function hasPendingNounConversion(){
  return slots.some(
    s => s.kind === "slot" && s.filled && s.canNoun && !s.nounApplied
  );
}

function isTokenConvertibleToNoun(tokenLower, nounText){
  const tok = String(tokenLower || "").toLowerCase().trim();
  const noun = normalizeWord(nounText || "");
  if (!tok || !noun) return false;
  if (tok === noun) return true;

  const rules = Array.isArray(currentTransformRules) ? currentTransformRules : [];
  return rules.some((r) => normalizeWord(r.from) === tok && normalizeWord(r.to) === noun);
}

function canApplyNounConversion(slot, token){
  if (!slot || !slot.fillRule) return false;
  if (!token) return false;
  const noun = slot.nounText || "";
  if (slot.fillRule === "transform") {
    const expected = normalizeWord(slot.expectedLower || "");
    if (expected && normalizeWord(token.lower || "") !== expected) return false;
    return isTokenConvertibleToNoun(token.lower, noun);
  }
  if (slot.fillRule === "verbNOUN") {
    return isTokenConvertibleToNoun(token.lower, noun);
  }
  return false;
}

function undoMove(){
  if (!moveHistory.length || isAnswered) return;

  const last = moveHistory.pop();
  const s = slots[last.slotIndex];

  if (s && s.kind === "slot") {
    s.filled = false;
    s.text = last.prevSlotText || "";
    s.fromTokenId = "";
    s.canNoun = false;
    s.nounText = "";
    s.nounApplied = false;
  }

  const t = srcTokens.find(x => x.id === last.tokenId);
  if (t) t.used = false;

  nominalActiveSlotIndex = last.slotIndex;
  selectedSlotIndex = nominalActiveSlotIndex;
  if (nominalPart === "A") stage1AOk = false;
  if (nominalPart === "B") stage1BOk = false;
  renderSourceSentence();
  renderTargetLine();
}

function resetMoves(){
  if (isAnswered) return;

  moveHistory = [];
  nominalActiveSlotIndex = 0;
  selectedSlotIndex = nominalActiveSlotIndex;
  if (nominalPart === "A") stage1AOk = false;
  if (nominalPart === "B") stage1BOk = false;

  slots.forEach((s) => {
    if (s.kind === "slot") {
      s.filled = false;
      s.text = "";
      s.fromTokenId = "";
      s.canNoun = false;
      s.nounText = s.nounText || ""; // keep
      s.nounApplied = false;
    }
  });

  srcTokens.forEach((t) => (t.used = false));

  const takenBaseWords = new Set(
    slots
      .filter(x => x.kind === "fixed" && x.prefillTakenBase)
      .map(x => String(x.prefillTakenBase).toLowerCase())
  );
  srcTokens.forEach((t) => {
    if (takenBaseWords.has(t.lower)) t.used = true;
  });

  renderSourceSentence();
  renderTargetLine();
}

function stopNominalDragTipArcHint(){
  if (typeof stopNominalDragTipArc === "function") {
    try { stopNominalDragTipArc(); } catch (_) {}
  }
  stopNominalDragTipArc = null;
}

function startNominalDragTipArc(){
  stopNominalDragTipArcHint();
  if (isAnswered || !nominalOpen) return;
  if (nominalHasFirstDrag) return;

  const targetIndex = pickTargetSlotIndex();
  const targetSlot = (targetIndex >= 0) ? slots[targetIndex] : null;
  let preferredToken = null;
  if (targetSlot && targetSlot.kind === "slot") {
    if (targetSlot.fillRule === "verbNOUN") {
      preferredToken =
        srcTokens.find(t => !t.used && canApplyNounConversion(targetSlot, t))
        || srcTokens.find(t => !t.used && t.verb)
        || null;
    } else if (targetSlot.fillRule === "transform") {
      preferredToken =
        srcTokens.find(t => !t.used && canApplyNounConversion(targetSlot, t))
        || null;
    } else if (targetSlot.fillRule === "exact") {
      preferredToken =
        srcTokens.find(t => !t.used && t.lower === normalizeWord(targetSlot.expectedLower || ""))
        || null;
    }
  }
  if (!preferredToken) {
    preferredToken = srcTokens.find(t => !t.used && /^approv/.test(String(t.lower || "")))
      || srcTokens.find(t => !t.used && isTokenConvertibleToNoun(t.lower, t.clean))
      || srcTokens.find(t => !t.used);
  }

  const source = preferredToken
    ? document.querySelector(`.srcTok[data-token-id="${preferredToken.id}"]`)
    : document.querySelector(".srcTok:not(.used)");
  const target = (targetIndex >= 0)
    ? document.querySelector(`.drop-word-slot[data-slot="${targetIndex}"]`)
    : document.querySelector(`.drop-word-slot[data-slot="${nominalActiveSlotIndex}"]`)
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
    if (!document.body.contains(tip)) { alive = false; return; }
    if (!cycleStartTs) cycleStartTs = ts;
    let elapsed = ts - cycleStartTs;
    if (elapsed > durationMs + pauseMs) { cycleStartTs = ts; elapsed = 0; }

    const sRect = source.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    if (!sRect.width || !tRect.width) { rafId = requestAnimationFrame(frame); return; }

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
  stopNominalDragTipArc = () => {
    alive = false;
    cancelAnimationFrame(rafId);
    if (tip.parentNode) tip.parentNode.removeChild(tip);
  };
}

/* ================== Stage2: C It click ================== */
function onItClicked(itEl){
  if (stage2Ok || stageReduceOk) return;

  const itNode = itEl || document.querySelector('#c-it-wrap [data-clean="it"]');
  if (itNode) {
    itNode.style.opacity = "0.22";
    itNode.style.textDecoration = "line-through";
  }
  stageReduceOk = true;

  renderABView();
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
}

function onABJoinDragDone(){
  if (stage2Ok || stageABOk) return;
  stopReduceDragTipArcHint();
  stageABOk = true;
  renderABView();
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
}

function onReduceDragDone(){
  if (stage2Ok || !stageReduceOk || !stageABOk) return;
  stopReduceDragTipArcHint();
  stage2Ok = true;
  renderABView();
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
  ensureStage3();

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = false;
}

function renderCWithItClickable(c, enabled, reduced = false){
  const segs = splitByDoubleStar(String(c || ""));
  const hasExplicitItMarker = segs.some((s) => s.hl);
  const toks = [];
  segs.forEach((seg) => {
    const parts = String(seg.text || "").match(/\s+|[^\s]+/g) || [];
    parts.forEach((p) => {
      if (!p) return;
      if (/^\s+$/.test(p)) toks.push({ isSpace: true, raw: p, hl: false, clean: "" });
      else toks.push({ isSpace: false, text: p, hl: !!seg.hl, clean: normalizeWord(p) });
    });
  });

  let tokenIdx = -1;
  return toks.map((t) => {
    if (t.isSpace) return escapeHtml(t.raw);
    tokenIdx += 1;
    const isIt = (t.clean === "it");
    const isTarget = hasExplicitItMarker ? (t.hl && isIt) : isIt;
    if (!isTarget) return `<span>${escapeHtml(t.text)}</span>`;
    if (reduced) {
      return `<span class="hl" style="opacity:0.22; text-decoration:line-through;">${escapeHtml(t.text)}</span>`;
    }
    const data = enabled ? `data-ctok="${tokenIdx}" data-clean="${escapeHtml(t.clean)}"` : "";
    const style = enabled ? `style="cursor:pointer;"` : `style="opacity:.55; cursor:not-allowed;"`;
    return `<span class="hl" ${data} ${style}>${escapeHtml(t.text)}</span>`;
  }).join("");
}

/* ================== Stage3: Korean order ================== */
function ensureStage3(){
  if (stage3Shown) {
    renderKorBank();
    return;
  }

  stage3Shown = true;
  const abBox = document.getElementById("ab-box");
  const instBox = document.getElementById("instruction-box");
  const tb = document.getElementById("translate-block");
  if (window.HermaStageTemplates?.openFinalStage) {
    window.HermaStageTemplates.openFinalStage({
      abBlockEl: abBox,
      instructionBoxEl: instBox,
      translateBlockEl: tb,
    });
  } else {
    if (abBox) abBox.classList.add("hidden");
    if (instBox) instBox.classList.add("hidden");
    if (tb) tb.classList.remove("hidden");
  }

  const plain = document.getElementById("plain-english-line");
  if (plain) {
    plain.innerHTML = `<div>${renderFinalSegmentUnderlinedHtml()}</div>`;
  }

  const configured = parseLaststageKRTokens(laststageKRTokensRaw);
  const correctTokens = configured.length ? configured : buildLargeKoreanTokenObjectsBySolvedNominals(koreanAnswerRaw);
  korBankTokens = shuffleArray(correctTokens.map((t, i) => ({
    id: `k${i}_${t.text}_${Math.random().toString(16).slice(2,6)}`,
    text: t.text,
    seg: t.seg || ""
  })));
  korSelectedTokens = [];
  renderKorBank();
}

function renderKorBank(){
  const answerLine = document.getElementById("answer-line");
  const bankArea = document.getElementById("bank-area");
  const remainInfo = document.getElementById("remain-info");
  if (!answerLine || !bankArea) return;

  if (window.HermaFinalStage?.renderKoreanScramble) {
    window.HermaFinalStage.renderKoreanScramble({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo || null,
      selectedTokens: korSelectedTokens,
      bankTokens: korBankTokens,
      isKoLocked: isAnswered,
      onSelectToken: (tok) => {
        if (isAnswered) return;
        const idx = korBankTokens.findIndex((x) => x.id === tok.id);
        if (idx >= 0) {
          const moved = korBankTokens.splice(idx, 1)[0];
          if (moved) korSelectedTokens.push(moved);
        }
      },
      onUnselectLast: () => {
        if (isAnswered) return;
        const last = korSelectedTokens.pop();
        if (last) korBankTokens.push(last);
      },
      decorateToken: (el, tok) => {
        if (!el || !tok) return;
        applyKorSegUnderline(el, tok.seg);
      },
      rerender: () => renderKorBank(),
      guideHtml: "\uC870\uAC01\uC744 \uB204\uB974\uC138\uC694.<br>\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4."
    });
    return;
  }

  if (!korSelectedTokens.length) {
    answerLine.innerHTML = `<span style="opacity:.45; font-weight:900; line-height:1.45;">\uC870\uAC01\uC744 \uB204\uB974\uC138\uC694.<br>\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4.</span>`;
  } else {
    answerLine.innerHTML = "";
    korSelectedTokens.forEach((tok, idx) => {
      const isLast = idx === korSelectedTokens.length - 1;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill-btn";
      btn.textContent = tok.text;
      btn.style.margin = "0 6px 6px 0";
      btn.style.border = isLast ? "2px solid rgba(241,123,42,0.9)" : "1px solid rgba(0,0,0,0.12)";
      btn.style.cursor = isAnswered ? "not-allowed" : (isLast ? "pointer" : "default");
      btn.disabled = isAnswered;
      applyKorSegUnderline(btn, tok.seg);
      btn.addEventListener("click", () => {
        if (isAnswered || !isLast) return;
        const last = korSelectedTokens.pop();
        if (last) korBankTokens.push(last);
        renderKorBank();
      });
      answerLine.appendChild(btn);
    });
  }

  bankArea.innerHTML = "";
  korBankTokens.forEach((tok) => {
    const btn = document.createElement("button");
    btn.className = "pill-btn";
    btn.type = "button";
    btn.textContent = tok.text;
    btn.disabled = isAnswered;
    applyKorSegUnderline(btn, tok.seg);

    btn.addEventListener("click", () => {
      if (isAnswered) return;
      const idx = korBankTokens.findIndex((x) => x.id === tok.id);
      if (idx >= 0) {
        const [moved] = korBankTokens.splice(idx, 1);
        korSelectedTokens.push(moved);
        renderKorBank();
      }
    });

    bankArea.appendChild(btn);
  });
}

/* ================== Submit / Next / Result ================== */
function submitAnswer(){
  if (isAnswered) return;

  const q = questions[currentIndex];

  const korUser = normalizeKorean(korSelectedTokens.map(x => x.text).join(" "));
  const configured = parseLaststageKRTokens(laststageKRTokensRaw);
  const korTargetRaw = configured.length ? configured.map((t) => t.text).join(" ") : koreanAnswerRaw;
  const korTarget = normalizeKorean(korTargetRaw);
  stage3Ok = korTarget ? (korUser === korTarget) : true;

  const correct = stage1AOk && stage1BOk && stageReduceOk && stageABOk && stage2Ok && stage3Ok;
  if (!correct) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    return;
  }

  isAnswered = true;

  results.push({
    no: currentIndex + 1,
    word: `Herma L6-E2 / Q${q.qNumber}`,
    selected: `A명사구: ${buildPartNominalDisplay("A") || subjA || "-"} / B명사구: ${buildPartNominalDisplay("B") || subjB || "-"} / 뜻: ${korUser || "무응답"}`,
    correct,
    question: `A. ${q.aRaw}\nB. ${q.bRaw}\nC. ${q.cRaw}`,
    englishAnswer: englishAnswerRaw,
    koreanAnswer: koreanAnswerRaw,
  });

  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
}

function goNext(){
  if (!isAnswered){
    const q = questions[currentIndex];
    results.push({
      no: currentIndex + 1,
      word: `Herma L6-E2 / Q${q.qNumber}`,
      selected: `미제출`,
      correct: false,
      question: `A. ${q.aRaw}\nB. ${q.bRaw}\nC. ${q.cRaw}`,
      englishAnswer: englishAnswerRaw,
      koreanAnswer: koreanAnswerRaw,
    });
  }

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

function showResultPopup(){
  const total = results.length;
  const correctCount = results.filter(r => r.correct).length;
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
    testspecific: results
  };
  localStorage.setItem("QuizResults", JSON.stringify(resultObject));

  const popup = document.getElementById("result-popup");
  const content = document.getElementById("result-content");
  if (!popup || !content) return alert(`완료! 점수: ${score}점 (${correctCount}/${total})`);

  const rows = results.map(r => `
    <tr>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.no}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.word)}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(trimForTable(r.selected))}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.correct ? "⭕" : "❌"}</td>
    </tr>
  `).join("");

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
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 답</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">정답</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" onclick="window.location.reload()">🔁 재시험</button>
      <button class="quiz-btn" onclick="document.getElementById('result-popup').style.display='none'">닫기</button>
    </div>
  `;

  popup.style.display = "flex";
}

/* ================== ** 하이라이트 처리 ================== */
function renderDoubleStarAsHighlight(sentence){
  const s = String(sentence || "");
  const segs = splitByDoubleStar(s);
  return segs.map(seg => {
    if (seg.hl) return `<span class="hl">${escapeHtml(seg.text)}</span>`;
    return escapeHtml(seg.text);
  }).join("");
}

function splitByDoubleStar(s){
  const out = [];
  let buf = "";
  let hl = false;
  for (let i=0; i<s.length; i++){
    const ch = s[i];
    const nx = s[i+1];
    if (ch === "*" && nx === "*"){
      if (buf) out.push({ text: buf, hl });
      buf = "";
      hl = !hl;
      i++;
      continue;
    }
    buf += ch;
  }
  if (buf) out.push({ text: buf, hl });
  return out;
}
function stripDoubleStarMarkers(s){
  const segs = splitByDoubleStar(String(s || ""));
  return segs.map((x) => x.text).join("");
}

/* ================== Build Source Tokens (A/B) with ** ================== */
function buildSourceTokensFromDoubleStarSentence(sentence){
  const segs = splitByDoubleStar(String(sentence || ""));
  const tokens = [];
  let idx = 0;

  segs.forEach(seg => {
    const parts = seg.text.match(/\s+|[^\s]+/g) || [];
    parts.forEach(p => {
      if (!p || /^\s+$/.test(p)) return;
      const clean = cleanWord(p);
      idx++;
      tokens.push({
        pos: idx-1,
        id: `src_${idx}_${Math.random().toString(16).slice(2,6)}`,
        display: p,
        clean,
        lower: clean.toLowerCase(),
        used: false,
        verb: !!seg.hl && !!clean,
      });
    });
  });

  return tokens;
}

/* ================== Build Slots Plan (Nominal) ================== */
/* ✅ head(전치사 of/in/to 앞 단어) 1개만 verbNOUN 대상으로 지정 */
function buildSlotsPlanForNominal(subjectPhrase, srcTokens){
  const srcSet = new Set(srcTokens.map(t => t.lower));
  const { words, optionalMask } = explodeAnswerToWords(subjectPhrase);

  // head 선정
  const head = findNominalHead(words, optionalMask);
  const headLower = head?.lower || "";
  const headText  = head?.text  || "";

  const slots = [];

  // 맨 앞 the는 고정(소비 X)
  let startIdx = 0;
  if (words.length && !optionalMask[0] && words[0].toLowerCase() === "the") {
    slots.push({ kind:"fixed", text:"The", faded:false });
    startIdx = 1;
  }

  for (let i=startIdx; i<words.length; i++){
    const w = words[i];
    const lw = w.toLowerCase();
    const opt = !!optionalMask[i];

    if (opt) {
      slots.push({ kind:"fixed", text:w, faded:true });
      continue;
    }

    // possessive 소비 처리 (teacher's / scientists’ 등)
    if (/(?:'s|’s|['’])$/i.test(w)) {
      const base = w.replace(/(?:'s|’s|['’])$/i, "").toLowerCase();
      if (srcSet.has(base)) {
        slots.push({ kind:"fixed", text:w, faded:false, prefillTakenBase: base });
        continue;
      }
    }

    const configuredFrom = findConfiguredTransformSourceForTarget(lw, srcTokens);
    if (configuredFrom) {
      if (configuredFrom === lw) {
        slots.push({
          kind:"slot",
          text:"",
          expectedLower: configuredFrom,
          fillRule: "exact",
          filled:false,
          fromTokenId:"",
          canNoun:false,
          nounText:"",
          nounApplied:false,
        });
      } else {
        slots.push({
          kind:"slot",
          text:"",
          expectedLower: configuredFrom,
          fillRule: "transform",
          filled:false,
          fromTokenId:"",
          canNoun:false,
          nounText: w,
          nounApplied:false,
        });
      }
      continue;
    }
    if (hasConfiguredPrefillForTarget(lw)) {
      slots.push({ kind:"fixed", text:w, faded:false });
      continue;
    }

    // head 단어만 verb→noun 슬롯
    if (headLower && lw === headLower) {
      slots.push({
        kind:"slot",
        text:"",
        expectedLower: lw,
        fillRule: "verbNOUN",
        filled:false,
        fromTokenId:"",
        canNoun:false,
        nounText: w,        // 목표 noun
        nounApplied:false,
      });
      continue;
    }

    // A/B에서 그대로 가져오는 단어면 exact 슬롯
    if (srcSet.has(lw)) {
      slots.push({
        kind:"slot",
        text:"",
        expectedLower: lw,
        fillRule: "exact",
        filled:false,
        fromTokenId:"",
        canNoun:false,
        nounText:"",
        nounApplied:false,
      });
      continue;
    }

    // source에 있는 단어를 변환(망치 탭)해야 도달하는 target (she->her, they->their 등)
    const convSourceLower = findConvertibleSourceLowerForTarget(lw, srcTokens);
    if (convSourceLower) {
      slots.push({
        kind:"slot",
        text:"",
        expectedLower: convSourceLower,
        fillRule: "transform",
        filled:false,
        fromTokenId:"",
        canNoun:false,
        nounText: w,
        nounApplied:false,
      });
      continue;
    }

    // 나머지(rapid, of, in, to 등)는 fixed
    slots.push({ kind:"fixed", text:w, faded:false });
  }

  // prefillTakenBase로 소비된 토큰만 used 처리
  const taken = new Set(
    slots
      .filter(s => s.kind==="fixed" && s.prefillTakenBase)
      .map(s => s.prefillTakenBase)
  );
  srcTokens.forEach(t => { if (taken.has(t.lower)) t.used = true; });

  return { slots, headLower, headText };
}

function findConvertibleSourceLowerForTarget(targetLower, srcTokens){
  const tgt = String(targetLower || "").toLowerCase().trim();
  if (!tgt) return "";
  const blocked = new Set(["the","a","an","of","in","to","for","on","at","from","with","about","over","under","into","onto","by","after","before","and"]);
  if (blocked.has(tgt)) return "";

  const configured = findConfiguredTransformSourceForTarget(tgt, srcTokens);
  if (configured) return configured;

  for (const t of (srcTokens || [])) {
    const src = String(t?.lower || "").toLowerCase().trim();
    if (!src || src === tgt) continue;
    if (isTokenConvertibleToNoun(src, tgt)) return src;
  }
  return "";
}

function findNominalHead(words, optionalMask){
  const PREP = new Set(["of","in","to","for","on","at","from","with","about","over","under","into","onto","by","after","before"]);
  const DET = new Set(["the","a","an","this","that","these","those","my","your","his","her","its","our","their"]);

  const w = (words || []).map(x => cleanWord(x));
  const m = (optionalMask || []).map(Boolean);

  // find first prep
  let prepIdx = -1;
  for (let i=0; i<w.length; i++){
    if (m[i]) continue;
    const lw = w[i].toLowerCase();
    if (PREP.has(lw)) { prepIdx = i; break; }
  }

  let headIdx = -1;
  if (prepIdx > 0) headIdx = prepIdx - 1;
  else if (prepIdx === 0) headIdx = 0;
  else headIdx = w.length - 1;

  // skip determiners/empties backwards if needed
  while (headIdx > 0) {
    const lw = (w[headIdx] || "").toLowerCase();
    if (!lw || DET.has(lw)) headIdx--;
    else break;
  }
  const text = w[headIdx] || "";
  return { index: headIdx, text, lower: text.toLowerCase() };
}

/* ================== Answer explode (parentheses) ================== */
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
    if (ch === "(") { pushBuf(); buf=""; inParen=true; i++; continue; }
    if (ch === ")") { pushBuf(); buf=""; inParen=false; i++; continue; }
    buf += ch; i++;
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

/* ================== Tokenize plain ================== */
function tokenizePlain(sentence){
  const s = String(sentence || "");
  const parts = s.match(/\s+|[^\s]+/g) || [];
  const out = [];
  parts.forEach(p => {
    if (!p) return;
    if (/^\s+$/.test(p)) out.push({ isSpace:true, raw:p });
    else out.push({ isSpace:false, text:p, clean: normalizeWord(p) });
  });
  return out;
}

/* ================== Korean Utils ================== */
function tokenizeKorean(kor) {
  const s = String(kor || "").trim();
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}
function parseLaststageKRTokens(raw){
  const s = String(raw || "").trim();
  if (!s) return [];
  return s
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((token) => {
      const m = token.match(/^(ab|c)\s*::\s*(.+)$/i);
      if (m) return { text: m[2].trim(), seg: m[1].toLowerCase() };
      return { text: token, seg: "c" };
    });
}
function parseLaststageFinalSentence(raw){
  const s = stripTrailingPunct(String(raw || "").trim());
  if (!s) return [];
  return s
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(ab|a\+b|c)\s*::\s*(.+)$/i);
      if (!m) return { text: part, seg: "ab" };
      const segRaw = m[1].toLowerCase();
      const seg = segRaw === "c" ? "c" : "ab";
      return { text: m[2].trim(), seg };
    });
}
function applyKorSegUnderline(el, seg){
  if (!el) return;
  if (seg === "ab") {
    el.style.textDecorationLine = "underline";
    el.style.textDecorationThickness = "2px";
    el.style.textUnderlineOffset = "3px";
    el.style.textDecorationColor = "rgba(241,123,42,0.90)";
    return;
  }
  if (seg === "c") {
    el.style.textDecorationLine = "underline";
    el.style.textDecorationThickness = "2px";
    el.style.textUnderlineOffset = "3px";
    el.style.textDecorationColor = "rgba(70,140,255,0.92)";
  }
}
function stripKoreanTailPunct(w){
  return String(w || "").replace(/[.。!?,"'”’)\]]+$/g, "");
}
function groupTailKoreanTokens(arr){
  const a = (arr || []).filter(Boolean);
  if (!a.length) return [];
  if (a.length <= 2) return [a.join(" ")];
  if (a.length === 3) return [a.slice(0, 2).join(" "), a[2]];
  if (a.length === 4) return [a.slice(0, 2).join(" "), a.slice(2).join(" ")];
  return [
    a.slice(0, 2).join(" "),
    a.slice(2, 4).join(" "),
    a.slice(4).join(" ")
  ].filter(Boolean);
}
function buildLargeKoreanTokenObjectsBySolvedNominals(kor){
  const toks = tokenizeKorean(kor);
  if (toks.length <= 4) {
    return toks.map((t) => ({ text: t, seg: "c" }));
  }

  let andIdx = -1;
  for (let i = 0; i < toks.length; i++){
    const core = stripKoreanTailPunct(toks[i]);
    if (/(와|과|및)$/.test(core) || core === "그리고") { andIdx = i; break; }
  }
  const out = [];
  if (andIdx === -1) {
    const grouped = groupTailKoreanTokens(toks);
    return grouped.map((t) => ({ text: t, seg: "c" }));
  }

  out.push({ text: toks.slice(0, andIdx + 1).join(" "), seg: "ab" });
  const start2 = andIdx + 1;

  let topicIdx = -1;
  for (let i = start2; i < toks.length; i++){
    const core = stripKoreanTailPunct(toks[i]);
    if (/(은|는|이|가)$/.test(core)) { topicIdx = i; break; }
  }
  if (topicIdx !== -1) {
    out.push({ text: toks.slice(start2, topicIdx + 1).join(" "), seg: "ab" });
    out.push(...groupTailKoreanTokens(toks.slice(topicIdx + 1)).map((t) => ({ text: t, seg: "c" })));
  } else {
    out.push(...groupTailKoreanTokens(toks.slice(start2)).map((t) => ({ text: t, seg: "c" })));
  }
  return out.filter((o) => !!(o && o.text));
}
function normalizeKorean(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.。!?]+$/g, "")
    .trim();
}

/* ================== Misc Utils ================== */
function normalizeEnglish(s){
  return String(s || "")
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.。!?]+$/g, "")
    .trim()
    .toLowerCase();
}
function normalizeWord(w){
  return String(w || "")
    .replace(/[‘’]/g, "'")
    .replace(/^[“"']+|[”"']+$/g, "")
    .replace(/[,:;]+$/g, "")
    .replace(/[.?!]+$/g, "")
    .trim()
    .toLowerCase();
}
function stripTrailingPunct(s) {
  return String(s || "").trim().replace(/[.。!?]+$/g, "").trim();
}
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
  return String(w || "")
    .replace(/^[“"']+|[”"']+$/g, "")
    .replace(/[,:;]+$/g, "")
    .replace(/[.?!]+$/g, "")
    .trim();
}

/* ================== Nominal phrase renderer (completed A/B line) ================== */
function renderNominalPhraseWithHead(phrase, headLower){
  const toks = tokenizePlain(phrase);
  let done = false;
  const hl = (headLower || "").toLowerCase();
  return toks.map(t => {
    if (t.isSpace) return escapeHtml(t.raw);
    const w = normalizeWord(t.text);
    if (!done && hl && w === hl) {
      done = true;
      return `<span class="hl">${escapeHtml(t.text)}</span>`;
    }
    return escapeHtml(t.text);
  }).join("");
}

/* ================== Final sentence highlight (both heads) ================== */
function renderFinalSentenceWithNounHighlights(sentence){
  const h1 = (nominalState.A.headLower || "").toLowerCase();
  const h2 = (nominalState.B.headLower || "").toLowerCase();

  const toks = tokenizePlain(sentence);
  let d1 = false, d2 = false;

  return toks.map(t => {
    if (t.isSpace) return escapeHtml(t.raw);
    const w = normalizeWord(t.text);

    if (!d1 && h1 && w === h1) { d1 = true; return `<span class="hl">${escapeHtml(t.text)}</span>`; }
    if (!d2 && h2 && w === h2) { d2 = true; return `<span class="hl">${escapeHtml(t.text)}</span>`; }

    return escapeHtml(t.text);
  }).join("");
}

function buildReducedCDisplayFromRaw(){
  const toks = tokenizePlain(stripDoubleStarMarkers(cRaw));
  const kept = [];
  let removedIt = false;
  toks.forEach((t) => {
    if (t.isSpace) {
      if (kept.length && !kept[kept.length - 1].isSpace) kept.push({ isSpace: true, raw: " " });
      return;
    }
    if (!removedIt && t.clean === "it") {
      removedIt = true;
      return;
    }
    kept.push(t);
  });
  while (kept.length && kept[0].isSpace) kept.shift();
  while (kept.length && kept[kept.length - 1].isSpace) kept.pop();
  return kept.map((t) => (t.isSpace ? " " : t.text)).join("").replace(/\s+/g, " ").trim();
}

function renderFinalSegmentUnderlinedHtml(){
  if (laststageFinalSentenceRaw) {
    const parts = parseLaststageFinalSentence(laststageFinalSentenceRaw);
    if (parts.length) {
      return parts.map((part) => {
        const cls = part.seg === "c" ? "tone-b" : "tone-a";
        const highlighted = renderFinalSentenceWithNounHighlights(part.text);
        return `<span class="${cls}">${highlighted}</span>`;
      }).join(" ");
    }
  }
  const ab = buildCombinedNominalDisplay();
  const cReduced = buildReducedCDisplayFromRaw();
  if (!cReduced) return `<span class="tone-a">${escapeHtml(ab)}</span>`;
  return `<span class="tone-a">${escapeHtml(ab)}</span> <span class="tone-b">${escapeHtml(cReduced)}</span>`;
}
