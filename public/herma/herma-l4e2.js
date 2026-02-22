// ver1.1_26.02.22
// herma-l4e2.js (L4-E2: 다의어 — 뿌리는 같고 뜻은 달라지는 단어)
// ------------------------------------------------------------
// ✅ 흐름: A/B 문장(같은 단어 하이라이트) + "뿌리(원뜻) → (1)(2)" 표시
//        → A/B 해석을 '좌우 이동'하며 조각 순서 맞추기
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 4;
const TARGET_EXERCISE = 2;

let subcategory = "Grammar";
let level = "Basic";
let day = "116";
let quizTitle = "quiz_Grammar_Basic_116";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;
let stage = "meaning"; // meaning | final
let stage1Solved = false;
let finalKoLocked = false;
let finalBankTokens = [];
let finalSelectedTokens = [];
let finalTargetLine = "A"; // A | B
let finalTargetKoRaw = "";
let resultRecorded = false;

let activeBox = "A"; // "A" | "B"
let korBank = [];
let korSelectedA = [];
let korSelectedB = [];
let meaningAll = [];
let placedMeaningA = "";
let placedMeaningB = "";
let pickedMeaningId = "";
let draggingMeaningId = "";
let stopDragTipArc = null;
let expectedMeaningA = "m1";
let expectedMeaningB = "m2";

const UI_DROP_MEANING = "\uB9DE\uB294 \uB73B\uC740 \uC5B4\uB290\uAC78\uAE4C\uC694!";

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

// ---------- params/nav ----------
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

// ---------- styles (minimal, warm) ----------
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .hl-word{
      display:inline-block;
      background: rgba(255, 208, 90, 0.45);
      border-radius: 8px;
      padding: 0 6px;
      font-weight: 900;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
    }

    .root-line{
      margin-top:10px;
      padding:10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.10);
      background: rgba(255,255,255,0.78);
      color:#7e3106;
      font-weight: 900;
      line-height: 1.55;
      font-size: 13px;
    }

    .ab-nav{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin: 10px 0 10px;
    }
    .nav-arrow{
      width:44px;
      height:36px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.12);
      background:#fff;
      font-weight: 900;
      cursor:pointer;
      user-select:none;
    }
    .nav-arrow:disabled{ opacity:0.35; cursor:not-allowed; }

    .nav-label{
      flex:1;
      text-align:center;
      font-weight: 900;
      color:#7e3106;
    }

    .kor-carousel{
      overflow:hidden;
      border-radius: 12px;
    }
    .kor-track{
      display:flex;
      width:200%;
      transition: transform .16s ease-out;
      will-change: transform;
    }
    .kor-panel{
      width:50%;
      padding:0;
    }

    .answer-line{
      min-height:44px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.10);
      background:#fff;
      line-height:1.6;
      font-size:15px;
      user-select:none;
      cursor:pointer;
    }
    .answer-line.active{
      box-shadow: 0 0 0 2px rgba(255, 208, 90, 0.45);
      border-color: rgba(160, 110, 0, 0.22);
    }

    .bank-wrap{
      margin-top:10px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.08);
      background: rgba(255,255,255,0.75);
      display:flex;
      flex-wrap:wrap;
      justify-content:center;
      align-items:center;
      gap:8px;
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
    .mini-btn:disabled{ opacity:0.35; cursor:not-allowed; }

    .sentence-drop{
      transition: box-shadow .15s ease, border-color .15s ease, background .15s ease;
    }
    .sentence-drop.over{
      border-color: rgba(70,140,255,0.52);
      box-shadow: 0 0 0 2px rgba(70,140,255,0.12);
      background: rgba(70,140,255,0.05);
    }
    .sentence-drop.filled{
      border-color: rgba(70,140,255,0.45);
      box-shadow: 0 0 0 1px rgba(70,140,255,0.10) inset;
    }
    .meaning-inline{
      margin-top:8px;
      padding:7px 10px;
      border-radius: 10px;
      border: 1.5px dashed rgba(70,140,255,0.45);
      background: rgba(70,140,255,0.08);
      color:#1f4fb8;
      font-weight:900;
      line-height:1.45;
      min-height: 20px;
    }
    .meaning-inline.empty{
      opacity:0.72;
      font-weight:800;
    }
    .sentence-drop.filled .meaning-inline{
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
    .meaning-chip{
      cursor: grab;
      margin:0;
      border-color: rgba(70,140,255,0.60);
      background: rgba(70,140,255,0.16);
      color:#113a9a;
    }
    .meaning-chip.pick{
      box-shadow: 0 0 0 2px rgba(70,140,255,0.25) inset;
      border-color: rgba(70,140,255,0.55);
      background: rgba(70,140,255,0.26);
    }
    .meaning-chip.dragging{
      opacity:0.42;
      cursor: grabbing;
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
    .dual-token.a{
      border-color: rgba(241,123,42,0.82);
      background: rgba(241,123,42,0.11);
      color:#7e3106;
    }
    .dual-token.b{
      border-color: rgba(70,140,255,0.8);
      background: rgba(70,140,255,0.10);
      color:#1f4fb8;
    }

    .ok{ font-weight:900; font-size:18px; color:#2e7d32; text-align:center; }
    .no{ font-weight:900; font-size:18px; color:#c62828; text-align:center; }
  `;
  document.head.appendChild(style);
}

// ---------- load excel ----------
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

// ---------- build questions ----------
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

    const qParsed = parseABWithGloss(questionRaw);
    const aParsed = parseABKor(answerRaw);
    const meanings = parseMeaningChoices(qParsed.glossLine);

    const targetWord = qParsed.targetWord || guessTargetWord(qParsed.aEng, qParsed.bEng);

    return {
      qNumber,
      title,
      instruction,
      aEng: qParsed.aEng,
      bEng: qParsed.bEng,
      glossLine: qParsed.glossLine, // 예: support: ‘...’ → (1) ... (2) ...
      targetWord,
      meaning1: meanings.m1,
      meaning2: meanings.m2,
      aKor: aParsed.aKor,
      bKor: aParsed.bKor,
    };
  });
}

// Question: "A. ... B. ... support: ‘...’ → (1) ... (2) ..."
function parseABWithGloss(s) {
  const txt = String(s || "").trim().replace(/\s+/g, " ");
  let aEng = "", bEng = "", glossLine = "", targetWord = "";

  const m = txt.match(/A\.\s*([\s\S]*?)\s*B\.\s*([\s\S]*)/i);
  if (!m) {
    aEng = stripTrailingPeriod(txt);
    return { aEng, bEng: "", glossLine: "", targetWord: "" };
  }

  aEng = stripTrailingPeriod(m[1]).trim();
  const rest = String(m[2] || "").trim();

  const glossIdx = rest.search(/\b[A-Za-z][A-Za-z-]*\s*:/);
  if (glossIdx !== -1) {
    bEng = stripTrailingPeriod(rest.slice(0, glossIdx)).trim();
    glossLine = rest.slice(glossIdx).trim();

    const m2 = glossLine.match(/^([A-Za-z][A-Za-z-]*)\s*:/);
    if (m2) targetWord = String(m2[1] || "").trim();
  } else {
    bEng = stripTrailingPeriod(rest).trim();
  }

  return { aEng, bEng, glossLine, targetWord };
}

// Answer: "A. ... B. ..."
function parseABKor(answerRaw) {
  const s = String(answerRaw || "").trim();
  let aKor = "", bKor = "";

  const m = s.match(/A\.\s*([\s\S]*?)\s*B\.\s*([\s\S]*)/i);
  if (m) {
    aKor = stripTrailingPeriod(String(m[1] || "").trim());
    bKor = stripTrailingPeriod(String(m[2] || "").trim());
  } else {
    const lines = s.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    if (lines.length >= 2) {
      aKor = stripTrailingPeriod(lines[0].replace(/^A\.\s*/i, "").trim());
      bKor = stripTrailingPeriod(lines[1].replace(/^B\.\s*/i, "").trim());
    } else {
      aKor = stripTrailingPeriod(s.replace(/^A\.\s*/i, "").trim());
      bKor = "";
    }
  }

  return { aKor, bKor };
}

function parseMeaningChoices(glossLine) {
  const raw = String(glossLine || "").trim();
  if (!raw) return { m1: "", m2: "" };

  const rhs = raw.includes("→") ? raw.split("→").slice(1).join("→").trim() : raw;
  const m = rhs.match(/\(1\)\s*([\s\S]*?)\s*\(2\)\s*([\s\S]*)$/);
  if (m) {
    return {
      m1: stripTrailingPeriod(String(m[1] || "").trim()),
      m2: stripTrailingPeriod(String(m[2] || "").trim()),
    };
  }

  const parts = rhs
    .split(/\(\d+\)/)
    .map((x) => stripTrailingPeriod(String(x || "").trim()))
    .filter(Boolean);

  return {
    m1: parts[0] || "",
    m2: parts[1] || "",
  };
}

function guessTargetWord(aEng, bEng) {
  const a = tokenizeEnglish(aEng).map(cleanWord).filter(Boolean);
  const b = tokenizeEnglish(bEng).map(cleanWord).filter(Boolean);
  const setA = new Set(a);
  for (const w of b) {
    if (setA.has(w) && w.length >= 3) return w;
  }
  return "";
}

// ---------- intro ----------
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L4-E2";
  const instruction =
    questions[0]?.instruction ||
    "두 문장에서 같은 단어가 문맥에 따라 어떻게 다르게 쓰이는지 보고, 각각 자연스럽게 해석해보세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L4-E2</div>

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

// ---------- main ----------
function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  stopDragTipArcHint();

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  isAnswered = false;
  stage = "meaning";
  stage1Solved = false;
  finalKoLocked = false;
  finalBankTokens = [];
  finalSelectedTokens = [];
  finalTargetLine = "A";
  finalTargetKoRaw = "";
  resultRecorded = false;
  placedMeaningA = "";
  placedMeaningB = "";
  pickedMeaningId = "";
  draggingMeaningId = "";

  const m1 = String(q.meaning1 || "").trim();
  const m2 = String(q.meaning2 || "").trim();
  const options = [];
  if (m1) options.push({ id: "m1", text: m1 });
  if (m2) options.push({ id: "m2", text: m2 });
  meaningAll = shuffleArray(options);

  const aEngHL = highlightWord(q.aEng, q.targetWord);
  const bEngHL = highlightWord(q.bEng, q.targetWord);
  const isSwapped = Math.random() < 0.5;
  const shownA = isSwapped
    ? { sentence: q.bEng, highlighted: bEngHL, meaningId: "m2" }
    : { sentence: q.aEng, highlighted: aEngHL, meaningId: "m1" };
  const shownB = isSwapped
    ? { sentence: q.aEng, highlighted: aEngHL, meaningId: "m1" }
    : { sentence: q.bEng, highlighted: bEngHL, meaningId: "m2" };
  expectedMeaningA = shownA.meaningId;
  expectedMeaningB = shownB.meaningId;

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">문장 A</div>
      <div class="sentence sentence-drop" id="meaning-slot-a" data-slot="A">
        <div>${shownA.highlighted}${shownA.sentence ? "." : ""}</div>
        <div class="meaning-inline empty" id="meaning-line-a">${UI_DROP_MEANING}</div>
      </div>

      <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">문장 B</div>
      <div class="sentence sentence-drop" id="meaning-slot-b" data-slot="B">
        <div>${shownB.highlighted}${shownB.sentence ? "." : ""}</div>
        <div class="meaning-inline empty" id="meaning-line-b">${UI_DROP_MEANING}</div>
      </div>
    </div>

    <div class="box">
      <div class="bank-wrap" id="meaning-bank-area"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()" disabled>다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  initMeaningDnD();
  renderMeaningUI();
}

function stopDragTipArcHint() {
  if (typeof stopDragTipArc === "function") {
    try { stopDragTipArc(); } catch (_) {}
  }
  stopDragTipArc = null;
}

function startDragTipArc() {
  stopDragTipArcHint();
  if (isAnswered || stage !== "meaning") return;

  const bank = document.getElementById("meaning-bank-area");
  const slotA = document.getElementById("meaning-slot-a");
  const slotB = document.getElementById("meaning-slot-b");
  if (!bank || !slotA || !slotB) return;

  const tip = document.createElement("div");
  tip.className = "drag-tip-fly";
  tip.textContent = "drag";
  document.body.appendChild(tip);

  let alive = true;
  let rafId = 0;
  let cycleStartTs = 0;
  const durationMs = 1300;
  const pauseMs = 220;
  const arcLift = 54;

  const easeInOut = (t) => (
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  );

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

    const bankRect = bank.getBoundingClientRect();
    const aRect = slotA.getBoundingClientRect();
    const bRect = slotB.getBoundingClientRect();
    if (!bankRect.width || !aRect.width || !bRect.width) {
      rafId = requestAnimationFrame(frame);
      return;
    }

    const start = {
      x: bankRect.left + (bankRect.width / 2),
      y: bankRect.top + Math.min(bankRect.height * 0.28, 26),
    };
    const end = {
      x: ((aRect.left + (aRect.width / 2)) + (bRect.left + (bRect.width / 2))) / 2,
      y: ((aRect.top + (aRect.height / 2)) + (bRect.top + (bRect.height / 2))) / 2,
    };
    const control = {
      x: (start.x + end.x) / 2,
      y: Math.min(start.y, end.y) - arcLift,
    };

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

function syncMeaningDragTip() {
  if (stage !== "meaning" || isAnswered) {
    stopDragTipArcHint();
    return;
  }
  if (placedMeaningA && placedMeaningB) {
    stopDragTipArcHint();
    return;
  }
  startDragTipArc();
}

function getMeaningTextById(id) {
  const hit = meaningAll.find((x) => x.id === id);
  return hit ? String(hit.text || "") : "";
}

function assignMeaningToSlot(slot, meaningId) {
  if (isAnswered) return;
  const id = String(meaningId || "");
  if (!id) return;
  if (!meaningAll.some((x) => x.id === id)) return;

  if (placedMeaningA === id) placedMeaningA = "";
  if (placedMeaningB === id) placedMeaningB = "";

  if (slot === "A") placedMeaningA = id;
  else if (slot === "B") placedMeaningB = id;

  pickedMeaningId = "";
  renderMeaningUI();
}

function clearMeaningSlot(slot) {
  if (isAnswered) return;
  if (slot === "A") placedMeaningA = "";
  else if (slot === "B") placedMeaningB = "";
  renderMeaningUI();
}

function initMeaningDnD() {
  const slotA = document.getElementById("meaning-slot-a");
  const slotB = document.getElementById("meaning-slot-b");
  const slots = [slotA, slotB].filter(Boolean);

  slots.forEach((slotEl) => {
    const slot = String(slotEl.getAttribute("data-slot") || "");
    slotEl.addEventListener("dragover", (e) => {
      if (isAnswered) return;
      e.preventDefault();
      slotEl.classList.add("over");
    });
    slotEl.addEventListener("dragleave", () => slotEl.classList.remove("over"));
    slotEl.addEventListener("drop", (e) => {
      if (isAnswered) return;
      e.preventDefault();
      slotEl.classList.remove("over");
      const dt = String(e.dataTransfer?.getData("text/plain") || draggingMeaningId || "").trim();
      if (!dt) return;
      assignMeaningToSlot(slot, dt);
    });
    slotEl.addEventListener("click", () => {
      if (isAnswered) return;
      if (pickedMeaningId) {
        assignMeaningToSlot(slot, pickedMeaningId);
      } else {
        clearMeaningSlot(slot);
      }
    });
  });
}

function renderMeaningUI() {
  const slotA = document.getElementById("meaning-slot-a");
  const slotB = document.getElementById("meaning-slot-b");
  const lineA = document.getElementById("meaning-line-a");
  const lineB = document.getElementById("meaning-line-b");
  const bank = document.getElementById("meaning-bank-area");
  if (!slotA || !slotB || !lineA || !lineB || !bank) return;

  const textA = getMeaningTextById(placedMeaningA);
  const textB = getMeaningTextById(placedMeaningB);

  lineA.textContent = textA || UI_DROP_MEANING;
  lineA.classList.toggle("empty", !textA);
  slotA.classList.toggle("filled", !!textA);

  lineB.textContent = textB || UI_DROP_MEANING;
  lineB.classList.toggle("empty", !textB);
  slotB.classList.toggle("filled", !!textB);

  const used = new Set([placedMeaningA, placedMeaningB].filter(Boolean));
  const bankItems = meaningAll.filter((x) => !used.has(x.id));

  bank.innerHTML = "";
  bankItems.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = `pill-btn meaning-chip${pickedMeaningId === item.id ? " pick" : ""}`;
    btn.type = "button";
    btn.draggable = !isAnswered;
    btn.textContent = item.text;
    if (isAnswered) btn.disabled = true;

    btn.addEventListener("click", () => {
      if (isAnswered) return;
      pickedMeaningId = pickedMeaningId === item.id ? "" : item.id;
      renderMeaningUI();
    });
    btn.addEventListener("dragstart", (e) => {
      if (isAnswered) return;
      draggingMeaningId = item.id;
      btn.classList.add("dragging");
      try { e.dataTransfer.setData("text/plain", item.id); } catch (_) {}
    });
    btn.addEventListener("dragend", () => {
      btn.classList.remove("dragging");
      draggingMeaningId = "";
    });

    bank.appendChild(btn);
  });

  syncMeaningDragTip();
}

function renderFinalStage() {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  const q = questions[currentIndex];
  if (!q) return;

  stopDragTipArcHint();
  stage = "final";
  isAnswered = false;
  finalKoLocked = false;
  finalSelectedTokens = [];

  const hasA = !!String(q.aKor || "").trim();
  const hasB = !!String(q.bKor || "").trim();
  if (hasA && hasB) finalTargetLine = Math.random() < 0.5 ? "A" : "B";
  else finalTargetLine = hasA ? "A" : "B";

  finalTargetKoRaw = String(finalTargetLine === "A" ? q.aKor : q.bKor || "").trim();
  finalBankTokens = buildDualKoBankTokensForL4(q.aKor, q.bKor);
  sortDualKoBankTokensForL4(finalBankTokens);

  const topEng = finalTargetLine === "A" ? q.aEng : q.bEng;
  const topEnglishHtml = highlightWord(topEng, q.targetWord);

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${topEnglishHtml}${topEng ? "." : ""}</div>
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
      <button class="quiz-btn" id="next-btn" onclick="goNext()" disabled>다음</button>
    </div>
    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  renderFinalTranslateUI();
}

function renderFinalTranslateUI() {
  const answerLine = document.getElementById("answer-line");
  const bankArea = document.getElementById("bank-area");
  const remainInfo = document.getElementById("remain-info");
  if (!answerLine || !bankArea || !remainInfo) return;
  const activeGroup = finalSelectedTokens.length ? String(finalSelectedTokens[0]?.group || "") : "";

  answerLine.innerHTML = "";
  if (!finalSelectedTokens.length) {
    const hint = document.createElement("span");
    hint.innerHTML = "\uC870\uAC01\uC744 \uB20C\uB7EC \uC21C\uC11C\uB300\uB85C \uCC44\uC6CC\uC8FC\uC138\uC694.<br>\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4.";
    hint.style.opacity = ".45";
    hint.style.fontWeight = "900";
    hint.style.color = "#7e3106";
    hint.style.lineHeight = "1.45";
    answerLine.appendChild(hint);
  } else {
    finalSelectedTokens.forEach((tok, idx) => {
      const isLast = idx === finalSelectedTokens.length - 1;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = tok.text;
      btn.style.display = "inline-flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.padding = "8px 10px";
      btn.style.borderRadius = "999px";
      btn.style.border = isLast ? "2px solid rgba(241,123,42,0.9)" : "1px solid rgba(0,0,0,0.14)";
      btn.style.background = "#fff";
      btn.style.fontWeight = "900";
      btn.style.fontSize = "13px";
      btn.style.userSelect = "none";
      btn.style.cursor = finalKoLocked ? "not-allowed" : (isLast ? "pointer" : "default");
      btn.style.opacity = finalKoLocked ? "0.6" : "1";
      btn.style.margin = "2px 6px 2px 0";

      if (tok.group === "a") {
        btn.style.borderColor = isLast ? "rgba(241,123,42,0.9)" : "rgba(241,123,42,0.68)";
        btn.style.background = "rgba(241,123,42,0.10)";
        btn.style.color = "#7e3106";
      } else if (tok.group === "b") {
        btn.style.borderColor = isLast ? "rgba(70,140,255,0.88)" : "rgba(70,140,255,0.62)";
        btn.style.background = "rgba(70,140,255,0.11)";
        btn.style.color = "#1f4fb8";
      }

      btn.onclick = () => {
        if (finalKoLocked || !isLast) return;
        const popped = finalSelectedTokens.pop();
        if (popped) {
          finalBankTokens.push(popped);
          sortDualKoBankTokensForL4(finalBankTokens);
        }
        renderFinalTranslateUI();
      };
      answerLine.appendChild(btn);
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

  finalBankTokens.forEach((tok) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = tok.text;
    btn.className = `dual-token ${tok.group === "a" ? "a" : "b"}`;
    const blockedByGroup = !!(activeGroup && tok.group !== activeGroup);
    btn.disabled = finalKoLocked || blockedByGroup;
    btn.onclick = () => {
      if (finalKoLocked) return;
      if (activeGroup && tok.group !== activeGroup) return;
      const idx = finalBankTokens.findIndex((x) => x.id === tok.id);
      if (idx < 0) return;
      const [moved] = finalBankTokens.splice(idx, 1);
      finalSelectedTokens.push(moved);
      renderFinalTranslateUI();
    };
    if (tok.group === "a") rowTop.appendChild(btn);
    else rowBottom.appendChild(btn);
  });

  wrap.appendChild(rowTop);
  wrap.appendChild(divider);
  wrap.appendChild(rowBottom);
  if (activeGroup === "a") {
    rowBottom.style.opacity = "0.38";
  } else if (activeGroup === "b") {
    rowTop.style.opacity = "0.38";
  }
  bankArea.appendChild(wrap);

  remainInfo.textContent = `\uB0A8\uC740 \uC870\uAC01: ${finalBankTokens.length}\uAC1C`;
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = finalKoLocked;
}

function buildDualKoBankTokensForL4(aKorRaw, bKorRaw) {
  const top = shuffleArray(tokenizeKorean(aKorRaw)).map((t, i) => ({
    id: `ko_a_${i}_${Math.random().toString(16).slice(2, 6)}`,
    text: t,
    group: "a",
    groupRank: 0,
    order: i,
  }));
  const bottom = shuffleArray(tokenizeKorean(bKorRaw)).map((t, i) => ({
    id: `ko_b_${i}_${Math.random().toString(16).slice(2, 6)}`,
    text: t,
    group: "b",
    groupRank: 1,
    order: i,
  }));
  return top.concat(bottom);
}

function sortDualKoBankTokensForL4(arr) {
  arr.sort((a, b) => {
    const ga = Number(a?.groupRank ?? 9);
    const gb = Number(b?.groupRank ?? 9);
    if (ga !== gb) return ga - gb;
    return Number(a?.order ?? 0) - Number(b?.order ?? 0);
  });
}

function recordCurrentResult(correct) {
  if (resultRecorded) return;
  const q = questions[currentIndex];
  if (!q) return;

  const userA = getMeaningTextById(placedMeaningA);
  const userB = getMeaningTextById(placedMeaningB);
  const userKo = finalSelectedTokens.map((t) => t.text).join(" ").trim();

  results.push({
    no: currentIndex + 1,
    word: `Herma L4-E2 / Q${q.qNumber}`,
    selected: `A:${userA || "\uBB34\uC751\uB2F5"} || B:${userB || "\uBB34\uC751\uB2F5"} || ko:${userKo || "\uBB34\uC751\uB2F5"}`,
    correct: !!correct,
    question: `A:${q.aEng} / B:${q.bEng}`,
    engAnswer: q.glossLine || "",
    korAnswer: `A:${q.aKor} / B:${q.bKor} || target:${finalTargetKoRaw || "\uBBF8\uC9C4\uC785"}`,
  });
  resultRecorded = true;
}

function buildMixedKorBank(aKor, bKor) {
  const a = tokenizeKorean(aKor);
  const b = tokenizeKorean(bKor);
  const mixed = a.concat(b).map((t, i) => ({ id: `k${i}_${t}`, text: t }));
  return shuffleArray(mixed);
}

// ---------- A/B 이동 (캐러셀) ----------
function wireAnswerBoxes() {
  const aLine = document.getElementById("kor-line-a");
  const bLine = document.getElementById("kor-line-b");
  if (!aLine || !bLine) return;

  aLine.addEventListener("click", () => setActiveBox("A"));
  bLine.addEventListener("click", () => setActiveBox("B"));

  wireNavArrows();
  setActiveBox("A");
  renderKorLines();
}

function wireNavArrows() {
  const left = document.getElementById("nav-left");
  const right = document.getElementById("nav-right");
  if (!left || !right) return;

  left.onclick = () => {
    if (isAnswered) return;
    if (activeBox === "B") setActiveBox("A");
  };
  right.onclick = () => {
    if (isAnswered) return;
    if (activeBox === "A") setActiveBox("B");
  };
}

function setActiveBox(which) {
  activeBox = which === "B" ? "B" : "A";

  const aLine = document.getElementById("kor-line-a");
  const bLine = document.getElementById("kor-line-b");
  const track = document.getElementById("kor-track");
  const label = document.getElementById("nav-label");
  const left = document.getElementById("nav-left");
  const right = document.getElementById("nav-right");

  if (aLine && bLine) {
    aLine.classList.toggle("active", activeBox === "A");
    bLine.classList.toggle("active", activeBox === "B");
  }

  if (track) {
    track.style.transform = activeBox === "A" ? "translateX(0%)" : "translateX(-50%)";
  }

  if (label) {
    label.textContent = activeBox === "A" ? "A 해석" : "B 해석";
  }

  if (left) left.disabled = (activeBox === "A") || isAnswered;
  if (right) right.disabled = (activeBox === "B") || isAnswered;
}

// ---------- controls ----------
function initKorControls() {
  const undoBtn = document.getElementById("kor-undo-btn");
  const clearBtn = document.getElementById("kor-clear-btn");

  if (undoBtn) {
    undoBtn.onclick = () => {
      if (isAnswered) return;
      const sel = activeBox === "A" ? korSelectedA : korSelectedB;
      if (!sel.length) return;
      const last = sel.pop();
      korBank.push(last);
      renderKorUI();
    };
  }

  if (clearBtn) {
    clearBtn.onclick = () => {
      if (isAnswered) return;
      const sel = activeBox === "A" ? korSelectedA : korSelectedB;
      if (!sel.length) return;
      korBank = korBank.concat(sel);
      if (activeBox === "A") korSelectedA = [];
      else korSelectedB = [];
      renderKorUI();
    };
  }
}

// ---------- render ----------
function renderKorUI() {
  renderKorLines();
  renderKorBank();
  setActiveBox(activeBox);
}

function renderKorLines() {
  const aLine = document.getElementById("kor-line-a");
  const bLine = document.getElementById("kor-line-b");
  if (!aLine || !bLine) return;

  aLine.textContent = korSelectedA.length
    ? korSelectedA.map((x) => x.text).join(" ")
    : "(A 해석: 조각을 눌러 채우세요)";

  bLine.textContent = korSelectedB.length
    ? korSelectedB.map((x) => x.text).join(" ")
    : "(B 해석: 조각을 눌러 채우세요)";

  aLine.style.opacity = korSelectedA.length ? "1" : "0.55";
  bLine.style.opacity = korSelectedB.length ? "1" : "0.55";
}

function renderKorBank() {
  const bankArea = document.getElementById("kor-bank-area");
  if (!bankArea) return;

  bankArea.innerHTML = "";
  korBank.forEach((tok) => {
    const btn = document.createElement("button");
    btn.className = "pill-btn";
    btn.type = "button";
    btn.textContent = tok.text;
    if (isAnswered) btn.disabled = true;

    btn.addEventListener("click", () => {
      if (isAnswered) return;

      const idx = korBank.findIndex((x) => x.id === tok.id);
      if (idx < 0) return;

      const [moved] = korBank.splice(idx, 1);
      if (activeBox === "A") korSelectedA.push(moved);
      else korSelectedB.push(moved);

      renderKorUI();
    });

    bankArea.appendChild(btn);
  });
}

// ---------- submit/next ----------
function submitAnswer() {
  if (stage === "meaning") {
    if (isAnswered) return;

    const aCorrect = placedMeaningA === expectedMeaningA;
    const bCorrect = placedMeaningB === expectedMeaningB;
    const correct = !!(aCorrect && bCorrect);

    if (!correct) {
      if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
      return;
    }

    stage1Solved = true;
    isAnswered = true;
    stopDragTipArcHint();

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) submitBtn.disabled = true;
    const bankArea = document.getElementById("meaning-bank-area");
    if (bankArea) Array.from(bankArea.querySelectorAll("button")).forEach((b) => (b.disabled = true));
    renderMeaningUI();

    if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
    setTimeout(() => renderFinalStage(), 180);
    return;
  }

  if (stage !== "final") return;
  if (finalKoLocked || isAnswered) return;

  const userKo = finalSelectedTokens.map((t) => t.text).join(" ").trim();
  const koOk = normalizeKorean(userKo) === normalizeKorean(finalTargetKoRaw);
  if (!koOk) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    return;
  }

  finalKoLocked = true;
  isAnswered = true;
  recordCurrentResult(true);

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;

  renderFinalTranslateUI();
  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
}

function goNext() {
  if (!resultRecorded) recordCurrentResult(false);

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

// ---------- result popup ----------
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
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 상태</th>
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

function restartQuiz() {
  window.location.reload();
}

function closePopup() {
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

// ---------- helpers ----------
function renderGlossLine(glossLine, targetWord) {
  const raw = String(glossLine || "").trim();
  if (!raw) return "";

  // 앞의 "word:" 부분만 하이라이트
  const m = raw.match(/^([A-Za-z][A-Za-z-]*)\s*:\s*([\s\S]*)$/);
  if (m) {
    const w = m[1];
    const rest = m[2];
    return `<span class="hl-word">${escapeHtml(w)}</span>: ${escapeHtml(rest)}`;
  }

  // 혹시 패턴이 다르면 그냥 출력
  // (그래도 targetWord 있으면 단어만 강조 시도)
  if (targetWord) {
    const re = new RegExp(`\\b(${escapeRegExp(targetWord)})\\b`, "gi");
    return escapeHtml(raw).replace(re, `<span class="hl-word">$1</span>`);
  }
  return escapeHtml(raw);
}

function highlightWord(sentence, word) {
  const s = String(sentence || "");
  const w = String(word || "").trim();
  if (!s || !w) return escapeHtml(s);

  const re = new RegExp(`\\b(${escapeRegExp(w)})\\b`, "gi");
  return escapeHtml(s).replace(re, `<span class="hl-word">$1</span>`);
}

function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenizeEnglish(eng) {
  const s = stripTrailingPeriod(String(eng || "").trim());
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}

function tokenizeKorean(kor) {
  const s = stripTrailingPeriod(String(kor || "").trim());
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

function stripTrailingPeriod(s) {
  return String(s || "")
    .trim()
    .replace(/\.+\s*$/g, "")
    .trim();
}

function cleanWord(w) {
  return String(w || "")
    .trim()
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
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
