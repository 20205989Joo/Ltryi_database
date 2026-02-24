// ver1.1_26.02.22
// herma-l2e2.js (애니메이션 + A 내부 삽입 클릭 시 "full mix" 프리뷰 추가 버전)
// ------------------------------------------------------------
// 요구사항 반영
// 1) B문장에서 약분 완료되면:
//    - B문장 영역이 좌우로 쪼그라들며 사라짐
//    - 그 자리에서 +로 변해서 위로 "날아감"
//    - 이후 A문장 내부에 + 슬롯들이 나타남
// 2) + 색상은 B문장과 동일한 쿨톤(blue)으로 통일
// 3) A문장 내부 +를 클릭하면:
//    - 그 자리에 B문장(약분된 형태)을 끼워넣은 "관계사 없는 full mix" 문장 프리뷰 표시
//      예: The girl ~~the girl~~ came early is here
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 2;
const TARGET_EXERCISE = 2;

let subcategory = "Grammar";
let level = "Basic";
let day = "106";
let quizTitle = "quiz_Grammar_Basic_106";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;

let requiredIdxSet = new Set();
let fadedIdxSet = new Set();

let reduced = false;
let insertOk = false;
let translateMode = false;
let englishAutoDone = false;
let isKoLocked = false;

let bankTokens = [];
let selectedTokens = [];

let correctInsAfter = 0;

let tokensA = [];
let tokensB = [];
let mixRendered = false;

window.addEventListener("DOMContentLoaded", async () => {  var __r2_guard = (new URLSearchParams(window.location.search || "")).get("round2") === "1";
  if (__r2_guard) return;
  applyQueryParams();
  wireBackButton();
  injectStyles();
  if (window.HermaToastFX) window.HermaToastFX.init({ hostId: "cafe_int", top: 10 });

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

function toastOk(msg) {
  if (!window.HermaToastFX) return;
  try { window.HermaToastFX.show("ok", String(msg || "")); } catch (_) {}
}

function toastNo(msg) {
  if (!window.HermaToastFX) return;
  try { window.HermaToastFX.show("no", String(msg || "")); } catch (_) {}
}

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
      --boxWarm: #fff3e0;
      --uA: rgba(241,123,42,0.95);
      --uB: rgba(70,120,255,0.95);

      /* B문장 쿨톤 */
      --bBlue: #468cff;
      --bBg: rgba(70, 140, 255, 0.10);
      --bBorder: rgba(70, 140, 255, 0.35);

      /* ✅ +도 B랑 동일 톤으로 */
      --plus: var(--bBlue);
      --plusSoft: rgba(70, 140, 255, 0.10);
      --plusSoft2: rgba(70, 140, 255, 0.18);
      --plusBorder: rgba(70, 140, 255, 0.55);

      /* A active */
      --aActive: rgba(126, 49, 6, 0.06);
      --aActiveBorder: rgba(126, 49, 6, 0.22);
    }

    .tok{ cursor:pointer; user-select:none; }
    .tok.uA, .tok.uB, .uA, .uB{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 5px;
    }
    .tok.uA, .uA{ text-decoration-color: var(--uA); }
    .tok.uB, .uB{ text-decoration-color: var(--uB); }
    .uLink{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 5px;
      text-decoration-color: rgba(255, 208, 90, 0.95);
      font-weight: 900;
    }
    .tok.pre{
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight: 900;
    }
    .tok.faded{
      opacity: 0.22 !important;
      text-decoration: line-through !important;
      filter: blur(0.2px) !important;
    }
    .tok.nope{
      box-shadow: inset 0 0 0 1px rgba(200, 40, 40, 0.22);
      background: rgba(200, 40, 40, 0.05);
    }

    .ab-shell{
      background: var(--boxWarm);
      border: 1px solid #e9c7a7;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
      position: relative;
      overflow: visible;
    }
    .ab-title{
      font-weight: 900; color:#7e3106; margin-bottom:6px;
    }
    #b-area{ position: relative; }

    .sentence-a.active{
      border: 1px solid var(--aActiveBorder) !important;
      background: #fff !important;
      box-shadow: 0 0 0 2px rgba(126,49,6,0.06);
    }
    .sentence-a{
      position: relative;
      z-index: 30;
    }
    .sentence-b{
      position: relative;
      z-index: 10;
    }

    .sentence-b.cool{
      border: 1px solid var(--bBorder) !important;
      background: #fff !important;
      box-shadow: none;
    }

    .hint-pill{
      display:inline-block;
      font-size:12px;
      background: rgba(255, 208, 90, 0.45);
      border:1px solid rgba(160, 110, 0, 0.22);
      color:#7e3106;
      padding:6px 10px;
      border-radius:999px;
      font-weight:900;
      margin-top:10px;
    }
    .hidden{ display:none !important; }

    .tap-tip{
      position:absolute;
      right:8px;
      top:-4px;
      z-index:2;
      padding:2px 8px;
      border-radius:999px;
      background:#1f4fb8;
      color:#fff;
      font-size:11px;
      font-weight:900;
      border:1px solid #163a8f;
      box-shadow:0 3px 8px rgba(31,79,184,0.22);
      animation: tapFloat 1.05s ease-in-out infinite;
      pointer-events:none;
    }
    .tap-tip.drag-mode{
      left:50%;
      right:auto;
      top:-16px;
      transform: translate(-50%, 0);
      animation: none;
      background:#1f4fb8;
      border-color:#163a8f;
      box-shadow:0 3px 8px rgba(31,79,184,0.22);
    }
    .tap-tip.drag-arc{
      position:fixed;
      transform:none;
    }
    @keyframes tapFloat{
      0%, 100%{ transform: translateY(0px); }
      50%{ transform: translateY(-8px); }
    }

    .b-drag-chip{
      position: fixed;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      border: 2px solid #1f4fb8;
      background: rgba(70, 140, 255, 0.18);
      color: #13409a;
      font-weight: 900;
      user-select: none;
      cursor: grab;
      box-shadow: 0 6px 12px rgba(31,79,184,0.22);
    }
    .b-drag-chip.dragging{ cursor: grabbing; }
    .b-handle-point{
      position:absolute;
      left:8px;
      top:50%;
      transform: translate(-50%, -50%);
      width:22px;
      height:22px;
      border-radius:6px;
      border:2px solid #1f4fb8;
      background: rgba(70,140,255,0.18);
      color:#13409a;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      font-weight:900;
      box-shadow:0 6px 12px rgba(31,79,184,0.22);
      cursor:grab;
      user-select:none;
      z-index:3;
    }
    .b-handle-point.dragging{
      cursor:grabbing;
    }
    .b-handle-point.target-hot{
      background: rgba(46,125,50,0.20);
      border-color: rgba(46,125,50,0.92);
      color:#1f4fb8;
      box-shadow: 0 0 0 3px rgba(46,125,50,0.18), 0 8px 16px rgba(46,125,50,0.22);
      animation: handleHotPulse .62s ease-in-out infinite;
    }
    .b-drag-plus{
      width: 12px;
      height: 12px;
      border-radius: 3px;
      border: 1px solid rgba(31,79,184,0.55);
      background: rgba(255,255,255,0.55);
      color: #1f4fb8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 900;
      line-height: 1;
      flex: 0 0 auto;
    }
    .a-gap{
      display:inline-block;
      width:12px;
      height:11px;
      border:1px dashed rgba(31,79,184,0.82);
      background: rgba(70,140,255,0.09);
      border-radius:3px;
      vertical-align:middle;
      margin: 0 1px;
      transform-origin:center center;
      animation: gapUncollapse .22s ease-out both;
      animation-delay: calc(var(--gap-i, 0) * 36ms);
    }
    .a-gap.target-hot{
      transform: scale(1.46);
      border-color: rgba(46,125,50,0.95);
      background: rgba(46,125,50,0.22);
      box-shadow: 0 0 0 3px rgba(46,125,50,0.16), 0 4px 10px rgba(46,125,50,0.20);
      animation: targetHotPulse .58s ease-in-out infinite;
    }
    @keyframes gapUncollapse{
      from{ transform: scaleX(0.2); opacity:0; }
      to{ transform: scaleX(1); opacity:1; }
    }
    @keyframes handleHotPulse{
      0%,100%{ transform: translate(-50%, -50%) scale(1); }
      50%{ transform: translate(-50%, -50%) scale(1.18); }
    }
    @keyframes targetHotPulse{
      0%,100%{ transform: scale(1.36); }
      50%{ transform: scale(1.56); }
    }

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

    .answer-wrap{
      display:flex;
      gap:10px;
      align-items:flex-end;
      background:#fff;
      border:1px solid #e9c7a7;
      border-radius:14px;
      padding:10px 12px;
      box-shadow: 0 1px 0 rgba(0,0,0,0.03) inset;
      margin-top:10px;
    }
    textarea.eng{
      width:100%;
      border:none;
      outline:none;
      background:transparent;
      resize:vertical;
      font-size:14px;
      line-height:1.5;
      padding:0;
      margin:0;
      min-height:72px;
    }

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

    .ok{ font-weight:900; font-size:18px; color:#2e7d32; text-align:center; }
    .no{ font-weight:900; font-size:18px; color:#c62828; text-align:center; }

    /* mixed preview */
    .mix-insert{
      display:inline-flex;
      align-items:center;
      min-height:18px;
      background: rgba(70,140,255,0.12);
      border: 1px dashed rgba(70,140,255,0.62);
      padding: 3px 6px;
      border-radius: 8px;
      margin: 0 3px;
      box-shadow: 0 0 0 2px rgba(70,140,255,0.06);
    }
    .mix-strike{
      text-decoration: line-through;
      opacity: 0.45;
      margin-right: 6px;
      color: rgba(0,0,0,0.62);
      font-weight: 900;
    }
    .mix-rest{
      color: #1f4fb8;
      font-weight: 900;
    }
    .who-gold{
      display:inline-block;
      padding:1px 6px;
      border-radius:999px;
      background: rgba(255, 208, 90, 0.45);
      border: 1px solid rgba(160, 110, 0, 0.22);
      color:#7e3106;
      font-weight:900;
      margin-right:0;
    }
    .mix-fadein{
      animation: mixIn .18s ease-out both;
    }
    @keyframes mixIn{
      from{ transform: translateY(1px); opacity: 0; }
      to{ transform: translateY(0); opacity: 1; }
    }

    .sentence-b.collapsing-center{
      transform-origin: center center;
      animation: bCollapseCenter .30s ease-in forwards;
    }
    @keyframes bCollapseCenter{
      0%{ transform: scaleX(1); opacity:1; }
      70%{ transform: scaleX(0.18); opacity:0.45; }
      100%{ transform: scaleX(0.04); opacity:0; }
    }
    .sentence-b.collapsed-slot{
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      pointer-events:none;
      overflow:hidden;
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
    const transformsRaw =
      String(r["Transforms"] ?? r["Transform"] ?? r["TransformMap"] ?? "").trim();
    const laststageFinalRaw =
      String(r["Laststage-FinalSentence"] ?? r["LaststageFinalSentence"] ?? "").trim();
    const laststageKRTokensRaw =
      String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();

    const { english, korean, koreanTagged, insAfter } = splitEnglishKoreanAndIns(answerRaw);
    const { stem, hint } = splitStemAndHint(questionRaw);
    const { A, B } = splitABStem(stem);

    return {
      qNumber, title, instruction,
      questionRaw, stem, A, B, hint,
      englishAnswer: english,
      koreanAnswer: korean,
      koreanTagged,
      transformsRaw,
      laststageFinalSentence: laststageFinalRaw,
      laststageKRTokens: laststageKRTokensRaw,
      insAfter: insAfter || 0,
    };
  });
}

function splitStemAndHint(questionRaw) {
  const s = String(questionRaw || "").trim();
  const braceHints = s.match(/\{([^{}]+)\}/g) || [];
  if (braceHints.length) {
    const lastHint = String(braceHints[braceHints.length - 1] || "").replace(/[{}]/g, "").trim();
    const lastBraceRaw = braceHints[braceHints.length - 1] || "";
    const cutAt = s.lastIndexOf(lastBraceRaw);
    if (cutAt > 0) {
      const stem = s.slice(0, cutAt).replace(/[→]+/g, "").trim();
      return { stem, hint: lastHint };
    }
  }
  const arrowIdx = s.lastIndexOf("→");
  if (arrowIdx === -1) return { stem: s, hint: "" };
  const stem = s.slice(0, arrowIdx).trim();
  const hintRaw = s.slice(arrowIdx + 1).trim();
  const hint = hintRaw.replace(/[{}]/g, "").trim();
  return { stem, hint };
}

function splitEnglishKoreanAndIns(answerRaw) {
  let s = String(answerRaw || "").trim();
  let insAfter = 0;

  const m = s.match(/\|\|\s*ins\s*:\s*(\d+)\s*$/i);
  if (m) {
    insAfter = Number(m[1]) || 0;
    s = s.replace(/\|\|\s*ins\s*:\s*\d+\s*$/i, "").trim();
  }

  if (!s) return { english: "", korean: "", koreanTagged: "", insAfter };

  if (s.includes("||")) {
    const parts = s.split("||");
    const english = stripTrailingPeriod(stripRoleMarkers((parts[0] || "").trim()));
    const koreanTagged = (parts.slice(1).join("||") || "").trim();
    const korean = stripRoleMarkers(koreanTagged);
    return { english, korean, koreanTagged, insAfter };
  }

  const firstKor = s.search(/[가-힣]/);
  if (firstKor === -1) {
    const english = stripTrailingPeriod(stripRoleMarkers(s));
    return { english, korean: "", koreanTagged: "", insAfter };
  }

  const english = stripTrailingPeriod(stripRoleMarkers(s.slice(0, firstKor).trim()));
  const koreanTagged = s.slice(firstKor).trim();
  const korean = stripRoleMarkers(koreanTagged);
  return { english, korean, koreanTagged, insAfter };
}

function splitABStem(stem) {
  const s = String(stem || "").trim();
  const aPos = s.search(/A\.\s*/i);
  const bPos = s.search(/B\.\s*/i);
  if (aPos === -1) return { A: "", B: s };

  if (bPos !== -1 && bPos > aPos) {
    const afterA = s.slice(aPos).replace(/^A\.\s*/i, "");
    const A = afterA.slice(0, Math.max(0, bPos - aPos)).replace(/B\.\s*$/i, "").trim();
    const B = s.slice(bPos).replace(/^B\.\s*/i, "").trim();
    return { A, B };
  }
  return { A: s.replace(/^A\.\s*/i, "").trim(), B: "" };
}

/** ================== Intro ================== */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L2-E2";
  const instruction = "두 문장을 약분해보세요!";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L2-E2</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106; line-height:1.6;">
        📝 ${escapeHtml(instruction)}
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
  document.querySelectorAll(".b-drag-chip, .b-handle-point").forEach((el) => el.remove());
  const staleTap = document.getElementById("tap-tip");
  if (staleTap) {
    stopTapTipArc(staleTap);
    if (staleTap.parentElement === document.body) staleTap.remove();
  }

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  isAnswered = false;
  reduced = false;
  insertOk = false;
  translateMode = false;
  mixRendered = false;
  englishAutoDone = false;
  isKoLocked = false;

  bankTokens = [];
  selectedTokens = [];
  fadedIdxSet = new Set();
  requiredIdxSet = new Set();

  correctInsAfter = Number(q.insAfter) || 0;

  tokensA = tokenizeStarAndBrace(q.A);
  const aMax = getMaxIdx(tokensA);
  tokensB = tokenizeStarAndBrace(q.B).map(t => ({ ...t, idx: t.idx ? (t.idx + aMax) : 0 }));

  for (const t of [...tokensA, ...tokensB]) {
    if (!t.isSpace && t.isReq) requiredIdxSet.add(String(t.idx));
  }

  const translateBlockTpl =
    window.HermaStageTemplates?.translateBlockHTML?.() ||
    `
      <div id="translate-block" class="hidden">
        <div class="box" style="margin-bottom:10px;">
          <div class="sentence" id="plain-english-line"></div>
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
      </div>
    `;

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" id="instruction-box">
      <div id="instruction-text" style="font-weight:900; color:#7e3106; line-height:1.6;">
        두 문장을 약분해보세요!
      </div>
    </div>

    <div class="ab-shell" id="ab-block">
      <div class="ab-title" id="ab-title-a">문장 A</div>
      <div class="sentence sentence-a" id="sentence-a"></div>
      <div id="merge-hint" class="hint-pill hidden"></div>

      <div id="b-area">
        <div class="ab-title" style="margin-top:10px;">문장 B</div>
        <div class="sentence sentence-b cool" id="sentence-b"></div>
        <div id="tap-tip" class="tap-tip hidden">tap!</div>
      </div>
    </div>

    <div class="box hidden" id="after-pass">
      <div class="answer-wrap">
        <textarea id="user-english" class="eng" rows="3" placeholder="한 문장으로 합쳐보세요! ex) The girl who came early is here"></textarea>
        <div style="flex:0 0 auto; font-weight:900; font-size:22px; color:#7e3106; padding-bottom:2px;">.</div>
      </div>
    </div>

    ${translateBlockTpl}

    <div id="stage-action-row" class="btn-row" style="margin-top:12px; display:none;">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  const sa = document.getElementById("sentence-a");
  const sb = document.getElementById("sentence-b");
  const bArea = document.getElementById("b-area");
  const engEl = document.getElementById("user-english");

  if (sa) sa.innerHTML = buildSentenceHTML(tokensA, "A");
  if (sb) sb.innerHTML = buildSentenceHTML(tokensB, "B");

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  const actionRow = document.getElementById("stage-action-row");
  if (actionRow) actionRow.style.display = "none";

  const onClickToken = (ev) => {
    if (reduced) return;

    const el = ev.target.closest("[data-idx]");
    if (!el) return;

    const idx = el.getAttribute("data-idx");
    const isReq = el.getAttribute("data-req") === "1";
    if (!idx) return;

    if (!isReq) {
      el.classList.add("nope");
      setTimeout(() => el.classList.remove("nope"), 120);
      return;
    }

    el.classList.toggle("faded");
    if (el.classList.contains("faded")) fadedIdxSet.add(idx);
    else fadedIdxSet.delete(idx);

    if (!reduced && requiredIdxSet.size > 0 && isAllRequiredFaded()) {
      enterTouchStage();
    }
  };

  if (sa) sa.addEventListener("click", onClickToken);
  if (sb) sb.addEventListener("click", onClickToken);

  if (engEl) {
    engEl.addEventListener("input", () => {
      autoCheckEnglish(false);
    });
    engEl.addEventListener("blur", () => {
      autoCheckEnglish(true);
    });
  }

  function enterTouchStage() {
    reduced = true;
    toastOk("1단계 완료!");

    const it = document.getElementById("instruction-text");
    if (it) it.textContent = "두 문장을 합쳐보세요!";

    if (sa) sa.classList.add("active");
    if (sa) {
      sa.innerHTML = buildSentenceWithGapsHTML(tokensA, "A");
      sa.style.position = "relative";
      sa.style.zIndex = "30";
    }

    const tapTip = document.getElementById("tap-tip");
    if (tapTip) tapTip.classList.remove("hidden");

    if (!sb || !bArea || !sa) return;
    sb.style.cursor = "pointer";
    sb.addEventListener("click", () => spawnHandlePointAndEnableDrag(sa, sb, bArea, q, engEl), { once: true });
  }

  function spawnHandlePointAndEnableDrag(sa, sb, bArea, q, engEl) {
    const tapTip = document.getElementById("tap-tip");
    if (tapTip) {
      tapTip.textContent = "drag";
      tapTip.classList.remove("hidden");
    }

    sb.style.position = "relative";
    sb.style.zIndex = "10";
    sb.style.cursor = "default";

    const point = document.createElement("span");
    point.className = "b-handle-point";
    point.textContent = "+";
    point.style.position = "fixed";
    point.style.transform = "translate(-50%, -50%)";
    point.style.zIndex = "9999";

    const reqSpans = Array.from(sb.querySelectorAll('[data-req="1"].faded'));
    const reqSpansFallback = reqSpans.length ? reqSpans : Array.from(sb.querySelectorAll('[data-req="1"]'));
    const sbRect = sb.getBoundingClientRect();
    let anchorCX = sbRect.left + (sbRect.width / 2);
    let anchorCY = sbRect.top + (sbRect.height / 2);
    if (reqSpansFallback.length) {
      const rr = getSpanGroupRect(reqSpansFallback);
      anchorCX = rr.left + (rr.width / 2);
      anchorCY = rr.top + (rr.height / 2);
    }
    const startLeft = Math.round(anchorCX);
    const startTop = Math.round(anchorCY);
    document.body.appendChild(point);
    point.style.left = `${startLeft}px`;
    point.style.top = `${startTop}px`;

    if (tapTip) {
      const toRect = sa.getBoundingClientRect();
      startTapTipArc(
        tapTip,
        { x: anchorCX, y: anchorCY },
        { x: toRect.left + (toRect.width / 2), y: toRect.top + (toRect.height / 2) }
      );
    }

    let dragging = false;
    let startPX = 0;
    let startPY = 0;
    let baseTX = 0;
    let baseTY = 0;
    let baseLeft = startLeft;
    let baseTop = startTop;

    const parseTranslate = (v) => {
      const m = String(v || "").match(/translate\(\s*(-?\d+)px,\s*(-?\d+)px\s*\)/);
      if (!m) return { x: 0, y: 0 };
      return { x: Number(m[1]) || 0, y: Number(m[2]) || 0 };
    };

    const resetPoint = () => {
      point.classList.remove("dragging");
      point.classList.remove("target-hot");
      sb.style.transform = "";
      clearGapHotState(sa);
      baseTX = 0;
      baseTY = 0;
      baseLeft = startLeft;
      baseTop = startTop;
      point.style.left = `${startLeft}px`;
      point.style.top = `${startTop}px`;
    };

    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startPX;
      const dy = e.clientY - startPY;
      const tx = Math.round(baseTX + dx);
      const ty = Math.round(baseTY + dy);
      sb.style.transform = `translate(${tx}px, ${ty}px)`;
      point.style.left = `${Math.round(baseLeft + dx)}px`;
      point.style.top = `${Math.round(baseTop + dy)}px`;

      const cRect = point.getBoundingClientRect();
      const gapEl = pickDropGapElement(sa, cRect);
      const hot = !!gapEl;
      clearGapHotState(sa);
      if (hot && gapEl) gapEl.classList.add("target-hot");
      point.classList.toggle("target-hot", hot);
    };

    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      point.classList.remove("dragging");
      point.classList.remove("target-hot");
      point.releasePointerCapture?.(e.pointerId);
      clearGapHotState(sa);

      const cRect = point.getBoundingClientRect();
      const expectedAfter = Number(correctInsAfter) || 2;
      const gapEl = pickDropGapElement(sa, cRect);
      const dropGap = gapEl ? (Number(gapEl.getAttribute("data-after")) || 0) : 0;
      if (!dropGap || dropGap !== expectedAfter) {
        resetPoint();
        toastNo("오답…");
        return;
      }

      insertOk = true;
      point.remove();
      sb.style.transform = "";

      const after = dropGap;
      renderMixedPreview(sa, after, q);

      if (tapTip) {
        stopTapTipArc(tapTip);
        tapTip.classList.add("hidden");
      }

      const aTitle = document.getElementById("ab-title-a");
      if (aTitle) aTitle.textContent = "문장 A+B";
      const bAreaEl = document.getElementById("b-area");
      collapseUpAndRemove(bAreaEl);

      const instBox = document.getElementById("instruction-box");
      collapseUpAndRemove(instBox);

      const ap = document.getElementById("after-pass");
      if (ap) ap.classList.remove("hidden");
      if (engEl) engEl.focus();
      toastOk("2단계 완료!");
    };

    const onDown = (e) => {
      dragging = true;
      point.classList.add("dragging");
      startPX = e.clientX;
      startPY = e.clientY;
      const t = parseTranslate(sb.style.transform);
      baseTX = t.x;
      baseTY = t.y;
      const pr = point.getBoundingClientRect();
      baseLeft = pr.left + (pr.width / 2);
      baseTop = pr.top + (pr.height / 2);
      point.setPointerCapture?.(e.pointerId);
    };

    point.addEventListener("pointerdown", onDown);
    point.addEventListener("pointermove", onMove);
    point.addEventListener("pointerup", onUp);
    point.addEventListener("pointercancel", onUp);
  }

  function autoCheckEnglish(isBlur) {
    if (!insertOk || englishAutoDone || !engEl) return;

    const userRaw = (engEl.value || "").trim();
    if (!userRaw) return;

    const user = stripTrailingPeriod(userRaw);
    const model = stripTrailingPeriod(q.englishAnswer);
    const isCorrect = (user === model);

    if (isCorrect) {
      englishAutoDone = true;
      engEl.disabled = true;
      toastOk("정답!");
      setTimeout(() => enterTranslateMode(q), 420);
      return;
    }

    if (isBlur) toastNo("오답…");
  }

  function enterTranslateMode(q) {
    if (translateMode || !englishAutoDone) return;
    translateMode = true;

    const ab = document.getElementById("ab-block");
    const afterPass = document.getElementById("after-pass");
    const instBox = document.getElementById("instruction-box");
    const tb = document.getElementById("translate-block");
    if (window.HermaStageTemplates?.openFinalStage) {
      window.HermaStageTemplates.openFinalStage({
        abBlockEl: ab,
        afterPassEl: afterPass,
        instructionBoxEl: instBox,
        translateBlockEl: tb,
        collapseRemove: collapseUpAndRemove,
      });
    } else {
      if (ab) ab.classList.add("hidden");
      if (afterPass) afterPass.classList.add("hidden");
      collapseUpAndRemove(instBox);
      if (tb) tb.classList.remove("hidden");
    }

    const plain = document.getElementById("plain-english-line");
    if (plain) {
      const configuredFinalParts = parseLaststageFinalSentenceForL2E2(q.laststageFinalSentence);
      if (configuredFinalParts.length) {
        plain.innerHTML = `<div>${renderConfiguredFinalSentenceForL2E2(configuredFinalParts)}</div>`;
      } else {
        const after = correctInsAfter || 2;
        const rest = stripTrailingPeriod(getReducedClauseText(tokensB));
        const hint = getHintWord(q.hint || "who / that");
        plain.innerHTML = `
          <div>${buildFinalLineHTML(tokensA, after, hint, rest)}</div>
        `;
      }
    }

    revealTranslate(q);

    const actionRow = document.getElementById("stage-action-row");
    if (actionRow) actionRow.style.display = "flex";
    const submit = document.getElementById("submit-btn");
    if (submit) submit.disabled = false;
  }

  function renderMixedPreview(sa, afterPos, q){
    if (!sa || mixRendered) return;
    mixRendered = true;

    const struck = stripTrailingPeriod(concatTokens(tokensB, (t) => t.isReq).trim());
    const rest = stripTrailingPeriod(getReducedClauseText(tokensB));
    const hint = getHintWord(q.hint || "who / that");
    sa.innerHTML = buildMixedPreviewHTML(tokensA, afterPos, struck, rest);

    const mergeHint = document.getElementById("merge-hint");
    if (mergeHint) {
      mergeHint.textContent = buildHintHTML(hint);
      mergeHint.classList.remove("hidden");
    }

    sa.classList.add("active");
    sa.style.pointerEvents = "none";
    sa.classList.add("mix-fadein");
  }
}

/** ================== Core Helpers ================== */
function isAllRequiredFaded() {
  for (const idx of requiredIdxSet) {
    if (!fadedIdxSet.has(String(idx))) return false;
  }
  return true;
}

function buildSentenceHTML(tokens, role) {
  let out = "";

  for (const t of tokens) {
    if (t.isSpace) { out += escapeHtml(t.text); continue; }

    const cls = ["tok"];
    if (t.isPre) cls.push("pre");
    if (role === "A") cls.push("uA");
    if (role === "B") cls.push("uB");
    const req = t.isReq ? "1" : "0";

    out += `<span class="${cls.join(" ")}" data-idx="${t.idx}" data-req="${req}">${escapeHtml(t.text)}</span>`;
  }
  return out;
}

function buildSentenceWithGapsHTML(tokens, role) {
  let out = "";
  let wordPos = 0;
  let gapIdx = 0;
  const gapAfterSet = new Set();

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.isSpace) continue;

    const raw = String(t.text || "");
    if (/^[.,!?]+$/.test(raw)) {
      out += escapeHtml(raw);
      continue;
    }

    const m = raw.match(/^(.+?)([.,!?])$/);
    const core = m ? m[1] : raw;
    const punct = m ? m[2] : "";

    const cls = ["tok"];
    if (t.isPre) cls.push("pre");
    if (role === "A") cls.push("uA");
    if (role === "B") cls.push("uB");
    const req = t.isReq ? "1" : "0";

    wordPos += 1;
    out += `<span class="${cls.join(" ")}" data-idx="${t.idx}" data-req="${req}">${escapeHtml(core)}</span>`;

    const next = tokens[i + 1];
    const hasSpaceAfter = !!(next && next.isSpace);
    const coreLower = core.toLowerCase();
    const isWord = /[a-z]/i.test(core);
    const allowGapAfter = isWord && coreLower !== "the";
    const shouldGapAfterWord = hasSpaceAfter && allowGapAfter;
    const shouldGapBeforePunct = !!punct && allowGapAfter;

    if (shouldGapAfterWord || shouldGapBeforePunct) {
      gapIdx += 1;
      gapAfterSet.add(wordPos);
      out += `<span class="a-gap" data-after="${wordPos}" style="--gap-i:${gapIdx}" aria-hidden="true"></span>`;
    } else if (hasSpaceAfter) {
      out += " ";
    }

    if (punct) out += escapeHtml(punct);
  }

  // 문장 끝 삽입(insAfter가 마지막 단어 뒤)도 반드시 드롭 슬롯을 보장
  if (role === "A") {
    const needAfter = Number(correctInsAfter) || 0;
    if (needAfter > 0 && needAfter === wordPos && !gapAfterSet.has(needAfter)) {
      gapIdx += 1;
      out += `<span class="a-gap" data-after="${needAfter}" style="--gap-i:${gapIdx}" aria-hidden="true"></span>`;
    }
  }

  return out;
}

function pickDropGapAfter(sa, cx, cy){
  const gap = pickDropGapElement(sa, cx, cy);
  if (!gap) return 0;
  return Number(gap.getAttribute("data-after")) || 0;
}

function pickDropGapElement(sa, cxOrRect, cy){
  const gaps = Array.from(sa.querySelectorAll(".a-gap[data-after]"));
  const isRect =
    cxOrRect &&
    typeof cxOrRect === "object" &&
    Number.isFinite(cxOrRect.left) &&
    Number.isFinite(cxOrRect.top) &&
    Number.isFinite(cxOrRect.right) &&
    Number.isFinite(cxOrRect.bottom);

  const pad = 2;
  let best = null;
  let bestDist = Infinity;
  for (const g of gaps) {
    const r = g.getBoundingClientRect();
    if (isRect) {
      const rl = Number(cxOrRect.left) + pad;
      const rr = Number(cxOrRect.right) - pad;
      const rt = Number(cxOrRect.top) + pad;
      const rb = Number(cxOrRect.bottom) - pad;
      const hit = rr >= r.left && rl <= r.right && rb >= r.top && rt <= r.bottom;
      if (!hit) continue;
      const cx = (Number(cxOrRect.left) + Number(cxOrRect.right)) / 2;
      const cy2 = (Number(cxOrRect.top) + Number(cxOrRect.bottom)) / 2;
      const gx = (r.left + r.right) / 2;
      const gy = (r.top + r.bottom) / 2;
      const dist = Math.abs(cx - gx) + Math.abs(cy2 - gy);
      if (dist < bestDist) {
        bestDist = dist;
        best = g;
      }
      continue;
    }

    const cx = Number(cxOrRect);
    if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
      return g;
    }
  }
  return best;
}

function clearGapHotState(sa){
  if (!sa) return;
  sa.querySelectorAll(".a-gap.target-hot").forEach((g) => g.classList.remove("target-hot"));
}

// 2단계 드래그 직후 미리보기: ~~B공통어~~ + B나머지 (who 제외)
function buildMixedPreviewHTML(tokensA, afterPos, struckText, bRestText){
  const struck = stripTrailingPeriod(String(struckText || "").trim());
  const rest = stripTrailingPeriod(String(bRestText || "").trim());
  if (window.HermaStageTemplates?.buildMixedPreviewHTML) {
    return window.HermaStageTemplates.buildMixedPreviewHTML({
      tokensA,
      afterPos,
      struckText: struck,
      clauseText: rest,
      escapeHtml,
    });
  }
  return "";
}

// 3단계 상단 완성 문장: A + who/that + B나머지
function buildFinalLineHTML(tokensA, afterPos, hintWord, bRestText){
  const hint = escapeHtml(getHintWord(hintWord || "who"));
  const rest = stripTrailingPeriod(String(bRestText || "").trim());
  if (window.HermaStageTemplates?.buildFinalLineHTML) {
    return window.HermaStageTemplates.buildFinalLineHTML({
      tokensA,
      afterPos,
      hintText: hint,
      clauseText: rest,
      escapeHtml,
    });
  }
  return "";
}
function buildHintHTML(hintWord){
  const hint = escapeHtml(getHintWord(hintWord || "who"));
  return `힌트:${hint}`;
}

function parseLaststageFinalSentenceForL2E2(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];

  let tagged = false;
  const out = [];
  parts.forEach((part) => {
    const m = part.match(/^(plain|a|b|c|ab|pair|link|linkbox|hint)\s*::\s*(.+)$/i);
    if (m) {
      tagged = true;
      out.push({ seg: String(m[1] || "").toLowerCase(), text: String(m[2] || "").trim() });
      return;
    }
    out.push({ seg: "plain", text: part });
  });

  if (!tagged) return [];
  return out.filter((x) => x.text);
}

function mapFinalSegClassForL2E2(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "uA";
  if (s === "b" || s === "c") return "uB";
  if (s === "link") return "uLink";
  if (s === "linkbox" || s === "hint") return "who-gold";
  return "";
}

function renderConfiguredFinalSentenceForL2E2(parts) {
  const chunks = parts.map((part) => {
    const text = String(part?.text || "").trim();
    if (!text) return "";
    const cls = mapFinalSegClassForL2E2(part.seg);
    if (!cls) return escapeHtml(text);
    return `<span class="${cls}">${escapeHtml(text)}</span>`;
  }).filter(Boolean);
  if (!chunks.length) return "";
  const joined = chunks.join(" ").trim();
  if (/[.!?]$/.test(joined)) return joined;
  return `${joined}.`;
}

function parseLaststageKRTokensForL2E2(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const tokens = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!tokens.length) return [];

  let tagged = false;
  const out = [];
  tokens.forEach((token) => {
    const m = token.match(/^(plain|a|b|c|ab|pair|link|linkbox|hint)\s*::\s*(.+)$/i);
    if (m) {
      tagged = true;
      out.push({ text: String(m[2] || "").trim(), seg: String(m[1] || "").toLowerCase() });
      return;
    }
    out.push({ text: token, seg: "plain" });
  });

  if (!tagged) return [];
  return out.filter((x) => x.text);
}

function mapKRTokensSegToRoleForL2E2(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "A";
  if (s === "b" || s === "c") return "B";
  if (s === "link") return "LINK";
  if (s === "linkbox" || s === "hint") return "LINKBOX";
  return null;
}

function tokenRoleClassForL2E2(role) {
  if (role === "A") return "uA";
  if (role === "B") return "uB";
  if (role === "LINK") return "uLink";
  if (role === "LINKBOX") return "who-gold";
  return "";
}

/** ================== Tokenizer ================== */
function tokenizeStarAndBrace(input) {
  const s = String(input || "");
  let mode = "normal"; // normal | star | brace
  const out = [];
  let buf = "";

  const flush = () => {
    if (!buf) return;
    out.push({ text: buf, mode });
    buf = "";
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "*") { flush(); mode = (mode === "star") ? "normal" : "star"; continue; }
    if (ch === "{") { flush(); mode = "brace"; continue; }
    if (ch === "}") { flush(); mode = "normal"; continue; }
    buf += ch;
  }
  flush();

  const tokens = [];
  let idx = 0;
  for (const seg of out) {
    const parts = seg.text.split(/(\s+)/);
    for (const p of parts) {
      if (p === "") continue;
      const isSpace = /^\s+$/.test(p);

      // ✅ brace 모드면 space도 isReq=true로 둬서 "The girl" 같이 공백 포함 복원 가능
      if (isSpace) {
        tokens.push({
          text: p,
          isSpace: true,
          isPre: false,
          isReq: seg.mode === "brace",
          idx: 0
        });
      } else {
        idx += 1;
        tokens.push({
          text: p,
          isSpace: false,
          isPre: seg.mode === "star",
          isReq: seg.mode === "brace",
          idx
        });
      }
    }
  }
  return tokens;
}

function concatTokens(tokens, predicate){
  let out = "";
  for (const t of tokens) {
    if (predicate(t)) out += t.text;
  }
  return out;
}

function getReducedClauseText(tokensB){
  const rest = concatTokens(tokensB, (t) => !t.isReq).trim();
  return rest.replace(/\s+/g, " ");
}

function getMaxIdx(tokens) {
  let m = 0;
  for (const t of tokens) if (!t.isSpace && t.idx > m) m = t.idx;
  return m;
}

/** ================== Word Bank ================== */
function revealTranslate(q) {
  isKoLocked = false;
  const configured = parseLaststageKRTokensForL2E2(String(q?.laststageKRTokens || "").trim());
  if (configured.length) {
    bankTokens = shuffleArray(configured.map((t, i) => ({
      id: `t${i}_${t.text}`,
      text: t.text,
      role: mapKRTokensSegToRoleForL2E2(t.seg),
    })));
  } else {
    const taggedPlan = tokenizeKoreanTaggedForBox(String(q?.koreanTagged || "").trim());
    if (taggedPlan.length) {
      bankTokens = shuffleArray(taggedPlan.map((t, i) => ({
        id: `t${i}_${t.text}`,
        text: t.text,
        role: t.role || null,
      })));
    } else {
      const correctTokens = tokenizeKorean(String(q?.koreanAnswer || "").trim());
      bankTokens = shuffleArray(correctTokens.map((t, i) => ({
        id: `t${i}_${t}`,
        text: t,
        role: null,
      })));
    }
  }

  selectedTokens = [];
  renderBankAndAnswer();
}

function renderBankAndAnswer() {
  const bankArea = document.getElementById("bank-area");
  const answerLine = document.getElementById("answer-line");
  const remainInfo = document.getElementById("remain-info");
  if (!bankArea || !answerLine || !remainInfo) return;

  if (window.HermaKRScramble?.render) {
    window.HermaKRScramble.render({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo,
      state: { selectedTokens, bankTokens, isKoLocked },
      onSelectToken: (tok) => {
        if (isKoLocked) return;
        const idx = bankTokens.findIndex((x) => x.id === tok.id);
        if (idx >= 0) {
          const [moved] = bankTokens.splice(idx, 1);
          selectedTokens.push(moved);
        }
      },
      onUnselectLast: () => {
        if (isKoLocked) return;
        const popped = selectedTokens.pop();
        if (popped) bankTokens.push(popped);
      },
      decorateToken: (el, tok) => {
        if (!el || !tok) return;
        const cls = tokenRoleClassForL2E2(tok.role);
        if (cls) el.classList.add(cls);
      },
      rerender: () => renderBankAndAnswer(),
    });
    return;
  }

  remainInfo.textContent = `남은 조각: ${bankTokens.length}개`;
  answerLine.textContent = selectedTokens.map((x) => x.text).join(" ");

  bankArea.innerHTML = "";
  bankTokens.forEach((tok) => {
    const btn = document.createElement("button");
    const roleClass = tokenRoleClassForL2E2(tok.role);
    btn.className = `pill-btn ${roleClass}`;
    btn.type = "button";
    btn.textContent = tok.text;
    btn.disabled = isKoLocked;

    btn.addEventListener("click", () => {
      if (isKoLocked) return;
      const idx = bankTokens.findIndex((x) => x.id === tok.id);
      if (idx >= 0) {
        const [moved] = bankTokens.splice(idx, 1);
        selectedTokens.push(moved);
        renderBankAndAnswer();
      }
    });

    bankArea.appendChild(btn);
  });
}

/** ================== Submit / Next ================== */
function submitAnswer() {
  if (!translateMode) {
    toastNo("3단계에서 제출하세요.");
    return;
  }
  if (isAnswered) return;

  const q = questions[currentIndex];
  const engEl = document.getElementById("user-english");
  const userEngRaw = (engEl?.value || "").trim();
  const userEng = stripTrailingPeriod(userEngRaw);
  const userKor = selectedTokens.length ? selectedTokens.map((x) => x.text).join(" ") : "";
  const englishCorrect = userEng === stripTrailingPeriod(String(q.englishAnswer || ""));
  const koreanCorrect = normalizeKorean(userKor) === normalizeKorean(q.koreanAnswer);
  const correct = !!englishCorrect && !!koreanCorrect;

  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";

  if (!correct) {
    toastNo("오답…");
    return;
  }

  isAnswered = true;

  results.push({
    no: currentIndex + 1,
    word: `Herma L2-E2 / Q${q.qNumber}`,
    selected: `${userEngRaw || "무응답"} || ${userKor || "무응답"} || insPick:${insertOk ? correctInsAfter : 0}`,
    correct,
    question: q.questionRaw,
    englishAnswer: q.englishAnswer,
    koreanAnswer: q.koreanAnswer,
    hint: q.hint || "",
    insAfter: q.insAfter || 0,
  });

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  if (engEl) engEl.disabled = true;
  isKoLocked = true;
  renderBankAndAnswer();
  toastOk("정답!");
}

function goNext() {
  if (!isAnswered) {
    const q = questions[currentIndex];
    results.push({
      no: currentIndex + 1,
      word: `Herma L2-E2 / Q${q.qNumber}`,
      selected: `무응답 || 무응답 || insPick:${insertOk ? correctInsAfter : 0}`,
      correct: false,
      question: q.questionRaw,
      englishAnswer: q.englishAnswer,
      koreanAnswer: q.koreanAnswer,
      hint: q.hint || "",
      insAfter: q.insAfter || 0,
    });
  }

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

/** ================== Result Popup ================== */
function showResultPopup() {
  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const resultObject = {
    quiztitle: quizTitle,
    subcategory, level, day,
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
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 답(영어||해석||삽입)</th>
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
function restartQuiz(){ window.location.reload(); }
function closePopup(){
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

/** ================== Korean Utils ================== */
function tokenizeKorean(kor){
  const s = String(kor || "").trim();
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}
function tokenizeKoreanTaggedForBox(korTagged) {
  const s = String(korTagged || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1");
  if (!s) return [];

  const segs = [];
  let mode = null; // a | b | null
  let buf = "";

  const flush = () => {
    if (!buf) return;
    segs.push({ text: buf, mode });
    buf = "";
  };

  for (let i = 0; i < s.length; i++) {
    if (s.startsWith("<a>", i)) { flush(); mode = "a"; i += 2; continue; }
    if (s.startsWith("</a>", i)) { flush(); mode = null; i += 3; continue; }
    if (s.startsWith("<b>", i)) { flush(); mode = "b"; i += 2; continue; }
    if (s.startsWith("</b>", i)) { flush(); mode = null; i += 3; continue; }
    buf += s[i];
  }
  flush();

  const out = [];
  for (const seg of segs) {
    const txt = String(seg.text || "")
      .replace(/\s+([.,!?])/g, "$1")
      .trim();
    if (!txt) continue;
    const parts = txt.split(/\s+/).filter(Boolean);
    for (const p of parts) {
      out.push({
        text: p,
        role: seg.mode === "b" ? "B" : (seg.mode === "a" ? "A" : null),
      });
    }
  }
  return out;
}
function normalizeKorean(s){
  return String(s || "").trim().replace(/\s+/g," ").replace(/[.。!?]+$/g,"").trim();
}

/** ================== Misc Utils ================== */
function stripTrailingPeriod(s){
  return String(s || "").trim().replace(/\.\s*$/,"").trim();
}
function stripRoleMarkers(s){
  return String(s || "")
    .replace(/<\/?(a|b)>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
function getHintWord(hintRaw){
  const raw = String(hintRaw || "").trim();
  if (!raw) return "who";
  const cleaned = raw.replace(/[{}]/g, "").trim();
  const first = cleaned.split("/")[0].trim();
  return first || cleaned || "who";
}
function shuffleArray(arr){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function trimForTable(s){
  const t = String(s || "");
  return t.length>70 ? t.slice(0,70)+"..." : t;
}
function collapseUpAndRemove(el, ms = 240){
  if (!el || !el.parentElement) return;
  if (el.dataset.collapsing === "1") return;
  el.dataset.collapsing = "1";

  const h = Math.max(1, Math.round(el.offsetHeight || 1));
  el.style.overflow = "hidden";
  el.style.transformOrigin = "bottom center";
  el.style.height = `${h}px`;

  try {
    el.animate(
      [
        { transform: "translateY(0px) scaleY(1)", opacity: 1, height: `${h}px` },
        { transform: "translateY(-8px) scaleY(0.04)", opacity: 0, height: "0px" },
      ],
      { duration: ms, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );
  } catch (_) {}

  setTimeout(() => {
    if (el && el.parentElement) el.remove();
  }, ms + 20);
}

function getSpanGroupRect(spans) {
  if (!spans || !spans.length) return new DOMRect(0, 0, 0, 0);
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const sp of spans) {
    const r = sp.getBoundingClientRect();
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
  }
  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) {
    return new DOMRect(0, 0, 0, 0);
  }
  return new DOMRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
}

function stopTapTipArc(tapTip) {
  if (!tapTip) return;
  const anim = tapTip._arcAnim;
  if (anim && typeof anim.cancel === "function") anim.cancel();
  tapTip._arcAnim = null;

  const homeParent = tapTip._homeParent;
  const homeNext = tapTip._homeNext;
  if (homeParent && tapTip.parentElement !== homeParent) {
    if (homeNext && homeNext.parentNode === homeParent) homeParent.insertBefore(tapTip, homeNext);
    else homeParent.appendChild(tapTip);
  }
  tapTip._homeParent = null;
  tapTip._homeNext = null;

  tapTip.style.position = "";
  tapTip.style.left = "";
  tapTip.style.top = "";
  tapTip.style.transform = "";
}

function toPointAnchor(v) {
  if (!v) return null;
  if (typeof v.x === "number" && typeof v.y === "number") return { x: v.x, y: v.y };
  if (typeof v.left === "number" && typeof v.top === "number") {
    const w = typeof v.width === "number" ? v.width : 0;
    const h = typeof v.height === "number" ? v.height : 0;
    return { x: v.left + (w / 2), y: v.top + (h / 2) };
  }
  return null;
}

function startTapTipArc(tapTip, fromRect, toRect) {
  if (!tapTip || !fromRect || !toRect) return;
  const from = toPointAnchor(fromRect);
  const to = toPointAnchor(toRect);
  if (!from || !to) return;
  stopTapTipArc(tapTip);

  tapTip._homeParent = tapTip.parentElement;
  tapTip._homeNext = tapTip.nextSibling;
  if (tapTip.parentElement !== document.body) document.body.appendChild(tapTip);

  tapTip.classList.add("drag-mode", "drag-arc");
  tapTip.classList.remove("hidden");
  tapTip.style.right = "auto";
  tapTip.style.position = "fixed";
  tapTip.style.left = "0px";
  tapTip.style.top = "0px";
  tapTip.style.transform = "none";

  const tr = tapTip.getBoundingClientRect();
  const tipW = Math.max(18, tr.width || 18);
  const tipH = Math.max(10, tr.height || 10);
  const host = document.getElementById("cafe_int");
  const hb = host ? host.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const minX = Math.round(hb.left + 2);
  const maxX = Math.round(hb.right - tipW - 2);
  const minY = Math.round(hb.top + 2);
  const maxY = Math.round(hb.bottom - tipH - 2);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const sx = clamp(Math.round(from.x - (tipW / 2)), minX, maxX);
  const sy = clamp(Math.round(from.y - tipH - 8), minY, maxY);
  const ex = clamp(Math.round(to.x - (tipW / 2)), minX, maxX);
  const ey = clamp(Math.round(to.y - tipH - 8), minY, maxY);
  const mx = Math.round((sx + ex) / 2);
  const lift = Math.max(20, Math.round(Math.abs(ex - sx) * 0.14));
  const my = clamp(Math.min(sy, ey) - lift, minY, maxY);

  tapTip.style.left = `${sx}px`;
  tapTip.style.top = `${sy}px`;

  tapTip._arcAnim = tapTip.animate(
    [
      { left: `${sx}px`, top: `${sy}px` },
      { left: `${mx}px`, top: `${my}px` },
      { left: `${ex}px`, top: `${ey}px` },
    ],
    { duration: 1100, easing: "ease-in-out", iterations: Infinity }
  );
}

function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

