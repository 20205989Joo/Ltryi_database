// ver1.1_26.02.22
// herma-l5e2.js
// L5-E2 redesigned flow:
// 1) Korean(original) + English original mini scramble
// 2) Korean(flipped) + English flipped mini scramble (revealed after #1 correct)
// 3) Final stage: random English (original/flipped) + dual-layer Korean token bank

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 5;
const TARGET_EXERCISE = 2;

let subcategory = "Grammar";
let level = "Basic";
let day = "119";
let quizTitle = "quiz_Grammar_Basic_119";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];

let stage = "build"; // build | final
let isAnswered = false;
let finalLocked = false;

let s1Expected = [];
let s1Bank = [];
let s1Selected = [];
let s1Solved = false;

let s2Expected = [];
let s2Bank = [];
let s2Selected = [];
let s2Solved = false;
let s2Ready = false;
let buildFlipped = false;

let finalUseOriginal = false;
let finalTargetKo = "";
let finalOriginalKo = "";
let finalFlippedKo = "";
let finalTopEnglish = "";
let finalBank = [];
let finalSelected = [];

const KR_LABEL_ORIGINAL = "\uC6D0\uBB38\uC7A5";
const KR_LABEL_FLIPPED = "\uB4A4\uC9D1\uC73C\uBA74...";
const KR_HINT_TAP = "\uC870\uAC01\uC744 \uC21C\uC11C\uB300\uB85C \uB204\uB974\uC138\uC694 / \uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uB418\uB3CC\uC544\uAC00\uC694";

window.addEventListener("DOMContentLoaded", async () => {  var __r2_guard = (new URLSearchParams(window.location.search || "")).get("round2") === "1";
  if (__r2_guard) return;
  applyQueryParams();
  wireBackButton();
  injectStyles();

  try {
    rawRows = await loadExcelRows(EXCEL_FILE);
  } catch (e) {
    console.error(e);
    alert("\uC5D1\uC140 \uD30C\uC77C\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.\n" + EXCEL_FILE);
    return;
  }

  buildQuestionsFromRows();
  renderIntro();
});

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

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .hidden{ display:none !important; }
    .mini-answer-line{
      min-height:44px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.10);
      background:#fff;
      line-height:1.6;
      display:flex;
      flex-wrap:wrap;
      align-items:flex-start;
      gap:6px;
    }
    .mini-bank{
      margin-top:10px;
      display:flex;
      flex-wrap:wrap;
      gap:6px;
    }
    .ko-sentence-box{
      margin-top:6px;
      background:#fff;
      border:1px solid rgba(0,0,0,0.12);
      border-radius:10px;
      padding:10px;
      line-height:1.65;
      font-size:14px;
      color:#222;
      word-break:keep-all;
    }
    .build-flip-scene{
      perspective: 1200px;
    }
    .build-flip-card{
      display:grid;
      transform-style: preserve-3d;
      transition: transform .58s cubic-bezier(.22,.88,.28,1);
    }
    .build-flip-card.is-flipped{
      transform: rotateY(180deg);
    }
    .build-face{
      grid-area: 1 / 1;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      transform-style: preserve-3d;
      pointer-events: none;
    }
    .build-face.front{
      transform: rotateY(0deg);
      pointer-events: auto;
    }
    .build-face.back{
      transform: rotateY(180deg);
      background: linear-gradient(180deg, rgba(246,239,230,0.98) 0%, rgba(236,226,214,0.98) 100%);
      border:1px solid rgba(126,49,6,0.18);
      box-shadow: 0 10px 22px rgba(126,49,6,0.06);
    }
    .build-face.back .ko-sentence-box{
      background: rgba(255,255,255,0.86);
      border-color: rgba(126,49,6,0.14);
    }
    .build-face.back .mini-answer-line{
      background: rgba(255,255,255,0.90);
      border-color: rgba(126,49,6,0.14);
    }
    .build-face.back .build-divider-dashed{
      border-top-color: rgba(126,49,6,0.20);
    }
    .build-flip-card.is-flipped .front{
      pointer-events: none;
    }
    .build-flip-card.is-flipped .back{
      pointer-events: auto;
    }
    .build-divider-dashed{
      border-top:1px dashed rgba(0,0,0,0.25);
      margin:10px 0 8px 0;
    }
    .mini-token{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 8px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.14);
      background:#fff;
      font-weight:900;
      font-size:12px;
      line-height:1.2;
      cursor:pointer;
      user-select:none;
    }
    .mini-token:disabled{
      opacity:.38;
      cursor:not-allowed;
    }
    .mini-token.original{
      border-color: rgba(241,123,42,0.82);
      background: rgba(241,123,42,0.11);
      color:#7e3106;
    }
    .mini-token.flipped{
      border-color: rgba(70,140,255,0.82);
      background: rgba(70,140,255,0.10);
      color:#1f4fb8;
    }
    .mini-token.answer-chip{
      border-width: 1.5px;
    }
    .final-answer-line{
      min-height:86px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.10);
      background:#fff;
      line-height:1.6;
      display:flex;
      flex-wrap:wrap;
      align-items:flex-start;
      gap:6px;
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
      border-top:1px dashed rgba(0,0,0,0.22);
      margin:1px 0;
    }
    .final-token{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 8px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.14);
      background:#fff;
      font-weight:900;
      font-size:12px;
      line-height:1.2;
      cursor:pointer;
      user-select:none;
    }
    .final-token:disabled{
      opacity:.35;
      cursor:not-allowed;
    }
    .final-token.original{
      border-color: rgba(241,123,42,0.82);
      background: rgba(241,123,42,0.11);
      color:#7e3106;
    }
    .final-token.flipped{
      border-color: rgba(70,140,255,0.82);
      background: rgba(70,140,255,0.10);
      color:#1f4fb8;
    }
    .final-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:8px 10px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.14);
      background:#fff;
      font-weight:900;
      font-size:13px;
      user-select:none;
      margin:2px 6px 2px 0;
    }
    .final-chip.last{
      border-width:2px;
      cursor:pointer;
    }
  `;
  document.head.appendChild(style);
}

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

function buildQuestionsFromRows() {
  const filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  questions = filtered.map((r, idx) => {
    const qNumber = Number(r["QNumber"]) || idx + 1;
    const title = String(r["Title"] ?? "").trim();
    const instruction = String(r["Instruction"] ?? "").trim();
    const sentenceRaw = String(r["Question"] ?? "").trim();
    const { eng: sentenceEng, kor: sentenceKor } = splitSentenceEnglishKorean(sentenceRaw);
    const answerRaw = String(r["Answer"] ?? "").trim();
    const { englishNP: englishNPRaw, koreanMeaning } = splitAnswerNPAndMeaning(answerRaw);
    const englishNP = harmonizeNPBySentenceLexicon(sentenceEng, englishNPRaw);

    return {
      qNumber,
      title,
      instruction,
      sentenceRaw,
      sentenceEng,
      sentenceKor,
      englishNP,
      koreanMeaning,
      answerRaw,
    };
  });
}

function splitAnswerNPAndMeaning(answerRaw) {
  const s = String(answerRaw || "").trim();
  if (!s) return { englishNP: "", koreanMeaning: "" };

  const dashMatch = s.match(/\s*[–—-]\s*/);
  if (!dashMatch) return { englishNP: stripTrailingPeriod(s), koreanMeaning: "" };

  const sep = dashMatch[0];
  const idx = s.indexOf(sep);
  const eng = stripTrailingPeriod(s.slice(0, idx).trim());
  const korRaw = s.slice(idx + sep.length).trim();
  const kor = pickPrimaryKoreanMeaning(korRaw);
  return { englishNP: eng, koreanMeaning: kor };
}

function pickPrimaryKoreanMeaning(korRaw) {
  const raw = String(korRaw || "").trim();
  if (!raw) return "";
  const segs = raw.split(/\s*\/\s*/).map((x) => String(x || "").trim()).filter(Boolean);
  return segs[0] || raw;
}

function harmonizeNPBySentenceLexicon(sentenceEng, npEng) {
  let out = String(npEng || "").trim();
  if (!out) return out;
  const src = String(sentenceEng || "").toLowerCase();

  const hasQuick = /\bquickly\b|\bquick\b/.test(src);
  const hasFast = /\bfast\b/.test(src);
  if (hasQuick) {
    out = out.replace(/\brapidly\b/gi, (m) => matchWordCase(m, "quickly"));
    out = out.replace(/\brapid\b/gi, (m) => matchWordCase(m, "quick"));
  } else if (hasFast) {
    out = out.replace(/\brapidly\b/gi, (m) => matchWordCase(m, "fast"));
    out = out.replace(/\brapid\b/gi, (m) => matchWordCase(m, "fast"));
  }
  return out;
}

function matchWordCase(src, target) {
  const s = String(src || "");
  const t = String(target || "");
  if (!s) return t;
  if (s === s.toUpperCase()) return t.toUpperCase();
  if (s[0] && s[0] === s[0].toUpperCase()) return t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

function splitSentenceEnglishKorean(sentenceRaw) {
  const raw = String(sentenceRaw || "").trim();
  if (!raw) return { eng: "", kor: "" };

  const m = raw.match(/\(([^()]*)\)\s*$/);
  if (m) {
    const inside = String(m[1] || "").trim();
    if (/[가-힣]/.test(inside)) {
      const engPart = raw.replace(/\s*\([^()]*\)\s*$/, "").trim();
      return { eng: engPart, kor: inside };
    }
  }
  return { eng: raw, kor: "" };
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L5-E2";
  const instruction =
    questions[0]?.instruction ||
    "\uBB38\uC7A5\uC758 \uB3D9\uC791 \uC804\uCCB4\uB97C \uD558\uB098\uC758 \uBA85\uC0AC\uAD6C\uB85C \uBC14\uAFB8\uACE0, \uADF8 \uBA85\uC0AC\uAD6C\uB97C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uD574\uC11D\uD574\uBCF4\uC138\uC694.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L5-E2</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>
      <div style="margin-top:10px; font-size:13px; color:#7e3106; line-height:1.6;">📝 ${escapeHtml(instruction)}</div>

      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">🚀 시작</button>
    </div>
  `;
}

function startQuiz() {
  if (!questions.length) {
    alert("\uD574\uB2F9 Lesson/Exercise\uC5D0 \uBB38\uC81C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }
  currentIndex = 0;
  results = [];
  renderQuestion();
}

function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  stage = "build";
  isAnswered = false;
  finalLocked = false;

  s1Expected = tokenizeEnglish(q.sentenceEng);
  s1Bank = shuffleArray(s1Expected.map((t, i) => ({ id: `s1_${i}_${t}`, text: t, group: "original", order: i })));
  s1Selected = [];
  s1Solved = false;

  s2Expected = tokenizeEnglish(q.englishNP);
  s2Bank = shuffleArray(s2Expected.map((t, i) => ({ id: `s2_${i}_${t}`, text: t, group: "flipped", order: i })));
  s2Selected = [];
  s2Solved = false;
  s2Ready = false;
  buildFlipped = false;

  finalUseOriginal = Math.random() < 0.5;
  finalOriginalKo = firstNonEmpty(q.sentenceKor, q.koreanMeaning, "");
  finalFlippedKo = firstNonEmpty(q.koreanMeaning, q.sentenceKor, "");
  finalTargetKo = finalUseOriginal ? finalOriginalKo : finalFlippedKo;
  finalTopEnglish = finalUseOriginal ? stripTrailingPeriod(q.sentenceEng) : stripTrailingPeriod(q.englishNP);
  finalBank = [];
  finalSelected = [];

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="build-flip-scene">
      <div class="build-flip-card" id="build-flip-card">
        <div class="box build-face front" id="build-box-1">
          <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">${KR_LABEL_ORIGINAL}</div>
          <div class="ko-sentence-box">${escapeHtml(finalOriginalKo)}</div>
          <div class="build-divider-dashed"></div>
          <div class="mini-answer-line" id="s1-answer-line"></div>
          <div class="mini-bank" id="s1-bank-area"></div>
        </div>

        <div class="box build-face back" id="build-box-2">
          <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">${KR_LABEL_FLIPPED}</div>
          <div class="ko-sentence-box">${escapeHtml(finalFlippedKo)}</div>
          <div class="build-divider-dashed"></div>
          <div class="mini-answer-line" id="s2-answer-line"></div>
          <div class="mini-bank" id="s2-bank-area"></div>
        </div>
      </div>
    </div>
  `;

  renderBuildStage1();
  renderBuildStage2();
  if (!s1Expected.length) {
    s1Solved = true;
    renderBuildStage1();
    triggerBuildFlipToStage2();
  }
}

function renderBuildStage1() {
  renderMiniScramble({
    answerLineId: "s1-answer-line",
    bankAreaId: "s1-bank-area",
    selected: s1Selected,
    bank: s1Bank,
    group: "original",
    locked: s1Solved,
    onPick: (tokId) => {
      if (s1Solved) return;
      const idx = s1Bank.findIndex((x) => x.id === tokId);
      if (idx < 0) return;
      const [moved] = s1Bank.splice(idx, 1);
      s1Selected.push(moved);
      renderBuildStage1();
      checkBuildStage1();
    },
    onUndoLast: () => {
      if (s1Solved || !s1Selected.length) return;
      const popped = s1Selected.pop();
      if (popped) s1Bank.push(popped);
      renderBuildStage1();
    },
  });
}

function checkBuildStage1() {
  if (s1Selected.length !== s1Expected.length) return;
  const built = s1Selected.map((x) => x.text);
  const ok = sameEnglishTokenOrder(built, s1Expected);
  if (!ok) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    resetStage1Build();
    return;
  }

  s1Solved = true;
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
  renderBuildStage1();
  renderBuildStage2();
  triggerBuildFlipToStage2();
}

function triggerBuildFlipToStage2() {
  if (buildFlipped) return;
  buildFlipped = true;

  const card = document.getElementById("build-flip-card");
  if (card) card.classList.add("is-flipped");

  window.setTimeout(() => {
    s2Ready = true;
    renderBuildStage2();

    if (!s2Expected.length && !s2Solved) {
      s2Solved = true;
      window.setTimeout(() => renderFinalStage(), 80);
    }
  }, 520);
}

function resetStage1Build() {
  s1Selected = [];
  s1Bank = shuffleArray(s1Expected.map((t, i) => ({ id: `s1r_${i}_${Math.random().toString(16).slice(2, 6)}`, text: t, group: "original", order: i })));
  renderBuildStage1();
}

function renderBuildStage2() {
  renderMiniScramble({
    answerLineId: "s2-answer-line",
    bankAreaId: "s2-bank-area",
    selected: s2Selected,
    bank: s2Bank,
    group: "flipped",
    locked: s2Solved || !s2Ready,
    onPick: (tokId) => {
      if (s2Solved || !s2Ready) return;
      const idx = s2Bank.findIndex((x) => x.id === tokId);
      if (idx < 0) return;
      const [moved] = s2Bank.splice(idx, 1);
      s2Selected.push(moved);
      renderBuildStage2();
      checkBuildStage2();
    },
    onUndoLast: () => {
      if (s2Solved || !s2Ready || !s2Selected.length) return;
      const popped = s2Selected.pop();
      if (popped) s2Bank.push(popped);
      renderBuildStage2();
    },
  });
}

function checkBuildStage2() {
  if (s2Selected.length !== s2Expected.length) return;
  const built = s2Selected.map((x) => x.text);
  const ok = sameEnglishTokenOrder(built, s2Expected);
  if (!ok) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    resetStage2Build();
    return;
  }

  s2Solved = true;
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
  setTimeout(() => renderFinalStage(), 120);
}

function resetStage2Build() {
  s2Selected = [];
  s2Bank = shuffleArray(s2Expected.map((t, i) => ({ id: `s2r_${i}_${Math.random().toString(16).slice(2, 6)}`, text: t, group: "flipped", order: i })));
  renderBuildStage2();
}

function renderMiniScramble({ answerLineId, bankAreaId, selected, bank, group, locked, onPick, onUndoLast }) {
  const answerLine = document.getElementById(answerLineId);
  const bankArea = document.getElementById(bankAreaId);
  if (!answerLine || !bankArea) return;

  answerLine.innerHTML = "";
  if (!selected.length) {
    const hint = document.createElement("span");
    hint.textContent = `(${KR_HINT_TAP})`;
    hint.style.opacity = ".45";
    hint.style.fontWeight = "900";
    hint.style.color = "#7e3106";
    answerLine.appendChild(hint);
  } else {
    selected.forEach((tok, idx) => {
      const isLast = idx === selected.length - 1;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `mini-token answer-chip ${group}`;
      chip.textContent = tok.text;
      chip.disabled = locked || !isLast;
      chip.style.cursor = locked ? "not-allowed" : (isLast ? "pointer" : "default");
      if (isLast && !locked) chip.style.borderWidth = "2px";
      chip.onclick = () => {
        if (locked || !isLast || typeof onUndoLast !== "function") return;
        onUndoLast();
      };
      answerLine.appendChild(chip);
    });
  }

  bankArea.innerHTML = "";
  bank.forEach((tok) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `mini-token ${group}`;
    btn.textContent = tok.text;
    btn.disabled = locked;
    btn.onclick = () => {
      if (locked || typeof onPick !== "function") return;
      onPick(tok.id);
    };
    bankArea.appendChild(btn);
  });
}

function renderFinalStage() {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  const q = questions[currentIndex];
  if (!q) return;

  stage = "final";
  isAnswered = false;
  finalLocked = false;
  finalSelected = [];
  finalBank = buildDualKoreanBank(finalOriginalKo, finalFlippedKo);

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${escapeHtml(finalTopEnglish)}${finalTopEnglish ? "." : ""}</div>
    </div>

    <div class="final-answer-line" id="final-answer-line"></div>

    <div class="box" style="margin-top:10px;">
      <div id="final-bank-area"></div>
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
  renderFinalUI();
}

function renderFinalUI() {
  const answerLine = document.getElementById("final-answer-line");
  const bankArea = document.getElementById("final-bank-area");
  const remainInfo = document.getElementById("remain-info");
  if (!answerLine || !bankArea || !remainInfo) return;
  const activeGroup = finalSelected.length ? String(finalSelected[0]?.group || "") : "";

  answerLine.innerHTML = "";
  if (!finalSelected.length) {
    const hint = document.createElement("span");
    hint.textContent = `(${KR_HINT_TAP})`;
    hint.style.opacity = ".45";
    hint.style.fontWeight = "900";
    hint.style.color = "#7e3106";
    answerLine.appendChild(hint);
  } else {
    finalSelected.forEach((tok, idx) => {
      const isLast = idx === finalSelected.length - 1;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `final-chip${isLast ? " last" : ""}`;
      chip.textContent = tok.text;
      chip.style.borderColor = tok.group === "original" ? "rgba(241,123,42,0.72)" : "rgba(70,140,255,0.68)";
      chip.style.background = tok.group === "original" ? "rgba(241,123,42,0.10)" : "rgba(70,140,255,0.10)";
      chip.style.color = tok.group === "original" ? "#7e3106" : "#1f4fb8";
      chip.disabled = finalLocked || !isLast;
      chip.style.cursor = finalLocked ? "not-allowed" : (isLast ? "pointer" : "default");
      chip.onclick = () => {
        if (finalLocked || !isLast) return;
        const popped = finalSelected.pop();
        if (popped) {
          finalBank.push(popped);
          sortDualBank(finalBank);
        }
        renderFinalUI();
      };
      answerLine.appendChild(chip);
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

  finalBank.forEach((tok) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `final-token ${tok.group}`;
    btn.textContent = tok.text;
    const blockedByGroup = !!(activeGroup && tok.group !== activeGroup);
    btn.disabled = finalLocked || blockedByGroup;
    btn.onclick = () => {
      if (finalLocked) return;
      if (activeGroup && tok.group !== activeGroup) return;
      const idx = finalBank.findIndex((x) => x.id === tok.id);
      if (idx < 0) return;
      const [moved] = finalBank.splice(idx, 1);
      finalSelected.push(moved);
      renderFinalUI();
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

  remainInfo.textContent = `\uB0A8\uC740 \uC870\uAC01: ${finalBank.length}\uAC1C`;
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = finalLocked;
}

function buildDualKoreanBank(originalKo, flippedKo) {
  const top = shuffleArray(tokenizeKorean(originalKo)).map((t, i) => ({
    id: `ko_o_${i}_${Math.random().toString(16).slice(2, 6)}`,
    text: t,
    group: "original",
    groupRank: 0,
    order: i,
  }));
  const bottom = shuffleArray(tokenizeKorean(flippedKo)).map((t, i) => ({
    id: `ko_f_${i}_${Math.random().toString(16).slice(2, 6)}`,
    text: t,
    group: "flipped",
    groupRank: 1,
    order: i,
  }));
  return top.concat(bottom);
}

function sortDualBank(arr) {
  arr.sort((a, b) => {
    const ga = Number(a?.groupRank ?? 9);
    const gb = Number(b?.groupRank ?? 9);
    if (ga !== gb) return ga - gb;
    return Number(a?.order ?? 0) - Number(b?.order ?? 0);
  });
}

function submitAnswer() {
  if (stage !== "final" || finalLocked) return;

  const userKo = finalSelected.map((x) => x.text).join(" ").trim();
  const ok = normalizeKoreanForCheck(userKo) === normalizeKoreanForCheck(finalTargetKo);
  if (!ok) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    return;
  }

  finalLocked = true;
  isAnswered = true;
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
  renderFinalUI();
}

function goNext() {
  const q = questions[currentIndex];
  if (!q) return;

  const userKo = finalSelected.map((x) => x.text).join(" ").trim();
  const correct = !!(isAnswered && normalizeKoreanForCheck(userKo) === normalizeKoreanForCheck(finalTargetKo));

  results.push({
    no: currentIndex + 1,
    word: `Herma L5-E2 / Q${q.qNumber}`,
    selected: userKo || "무응답",
    correct,
    question: q.sentenceRaw,
    englishAnswer: finalUseOriginal ? stripTrailingPeriod(q.sentenceEng) : stripTrailingPeriod(q.englishNP),
    koreanAnswer: finalTargetKo,
  });

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

function showResultPopup() {
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
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 답</th>
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

function tokenizeEnglish(s) {
  const t = stripTrailingPeriod(s);
  if (!t) return [];
  const raw = t
    .split(/\s+/)
    .map((w) => cleanEnglishToken(w))
    .filter(Boolean);
  const merged = [];
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i];
    const next = raw[i + 1] || "";
    if (/^the$/i.test(cur) && next) {
      merged.push(`${cur} ${next}`);
      i += 1;
      continue;
    }
    merged.push(cur);
  }
  return merged;
}

function cleanEnglishToken(w) {
  return String(w || "")
    .replace(/^[“"']+|[”"']+$/g, "")
    .replace(/[.,!?;:]+$/g, "")
    .trim();
}

function sameEnglishTokenOrder(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const aw = cleanEnglishToken(String(a[i] || "")).toLowerCase();
    const bw = cleanEnglishToken(String(b[i] || "")).toLowerCase();
    if (aw !== bw) return false;
  }
  return true;
}

function tokenizeKorean(kor) {
  const s = String(kor || "").trim();
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}

function normalizeKoreanForCheck(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.。!?]+$/g, "")
    .trim();
}

function stripTrailingPeriod(s) {
  return String(s || "")
    .trim()
    .replace(/\.\s*$/, "")
    .trim();
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const t = String(v || "").trim();
    if (t) return t;
  }
  return "";
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
