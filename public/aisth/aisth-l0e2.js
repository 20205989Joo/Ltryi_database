// aisth-l0e2.js
// Aisth Prologue 2: keyword-to-sentence warm-up

const EXCEL_FILE = "LTRYI-grammar-lesson-questions.xlsx";
const TARGET_LESSON = 0;
const TARGET_EXERCISE = 2;
const PAGE_LABEL = "Aisth L0-E2";
const MAX_QUESTIONS = 0; // 0 = unlimited

const DEFAULT_INSTRUCTION = "주어진 단어로 문장을 완성해보세요.";

const EN_TOKENS_BY_QNUMBER = {
  1: ["crow", "fly", "pear", "fall"],
  2: ["sun", "rise", "time", "bright"],
  3: ["child", "cry", "mom", "run over"],
  4: ["door", "open", "wind", "strongly"],
  5: ["person", "head", "bow", "respect"],
  6: ["night", "quiet", "window", "open"],
  7: ["wolf", "howl", "moon", "bright"],
  8: ["friend", "silence", "worry", "feel"],
  9: ["fire", "make", "smoke", "rise"],
  10: ["rain", "bed", "blanket", "cozy"],
  11: ["rice", "cooked", "with rice", "premium"],
  12: ["flower", "blooming", "on hill", "yellow"],
  13: ["letter", "written", "by hand", "she"],
  14: ["sound", "coming", "from afar", "strange"],
  15: ["puppy", "adopted", "from shelter", "child"],
  16: ["photo", "taken", "on trip", "we"],
  17: ["house", "built", "with wood", "traditional"],
  18: ["story", "told", "in childhood", "grandmother"],
  19: ["book", "reading", "quietly", "by window"],
  20: ["cake", "made", "with chocolate", "mom"],
};

const TEXT = {
  START: "🚀 시작",
  INTRO_1: "프롤로그 워밍업: 키워드 뜰음을 읽고 자연스럽게 문장으로 완성해보세요.",
  INTRO_2: "키워드를 참고해 아랫 칸에 문장을 입력하세요.",
  PIN: "📌",
  NO_QUESTIONS: "해당 Lesson/Exercise의 문제가 없습니다.",
  INPUT_REQUIRED: "입력 후 제출하세요.",
  TAP_ALL_FIRST: "영어 단어를 먼저 모두 탭해 한국어로 바꿔보세요.",
  STEP1_INST: "1단계: 단어를 터치해보세요!",
  STEP2_INST: "2단계: 단어를 사용해 아래 빈칸을 채워보세요!",
  CORRECT: "정답!",
  WRONG: "오답",
  QTYPE: "프롤로그 작문형",
  SUBMIT: "제출",
  NEXT: "다음",
  PLACEHOLDER: "예시 문장처럼 자연스럽게 입력하세요.",
  LOAD_FAIL: "엑셀 파일을 불러오지 못했습니다. 파일명/경로를 확인하세요.",
  RESULT_TITLE: "결과 요약",
  SCORE: "점수",
  CORRECT_COUNT: "정답",
  MY_ANSWER: "내 답",
  ANSWER: "정답",
  RETRY: "다시하기",
  CLOSE: "닫기",
  UNANSWERED: "(미응답)",
};

let subcategory = "Grammar";
let level = "aisth";
let day = "002";
let quizTitle = "quiz_Grammar_aisth_l0e2";
let userId = "";

let rawRows = [];
let questions = [];
let currentIndex = 0;
let results = [];
let isCurrentLocked = false;
let revealedKeywordFlags = [];

window.addEventListener("DOMContentLoaded", async () => {
  injectRuntimeStyles();

  if (window.HermaToastFX) {
    window.HermaToastFX.init({ hostId: "cafe_int", top: 10 });
  }

  applyQueryParams();
  wireBackButton();
  wirePopupEvents();

  try {
    rawRows = await loadExcelRows(EXCEL_FILE);
  } catch (err) {
    console.error(err);
    alert(TEXT.LOAD_FAIL + "\n" + EXCEL_FILE);
    return;
  }

  buildQuestionsFromRows();
  renderIntro();
});

function injectRuntimeStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .quiz-btn {
      display: inline-block;
      margin-top: 12px;
      padding: 8px 16px;
      font-size: 14px;
      background: #f17b2a;
      color: #fff;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 900;
    }

    .quiz-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pill {
      display: inline-block;
      font-size: 12px;
      background: #fff3e0;
      border: 1px solid #e9c7a7;
      color: #7e3106;
      padding: 4px 8px;
      border-radius: 999px;
      margin-right: 6px;
      margin-bottom: 6px;
    }

    .box {
      background: #fff3e0;
      border: 1px solid #e9c7a7;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .q-label {
      font-weight: 900;
      font-size: 16px;
      margin-bottom: 10px;
      color: #7e3106;
    }

    .keyword-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }

    .keyword-panel {
      margin-top: 8px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 10px;
    }

    .keyword-chip {
      display: inline-flex;
      align-items: center;
      padding: 6px 9px;
      border-radius: 999px;
      border: 1px solid #f1c18e;
      background: #fff;
      color: #7e3106;
      font-size: 13px;
      font-weight: 900;
      line-height: 1;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease;
      user-select: none;
    }

    .keyword-chip.tap-target {
      cursor: pointer;
    }

    .keyword-chip.tap-target:hover {
      border-color: #f1b884;
    }

    .keyword-chip.is-en {
      background: #fff;
      color: #7e3106;
    }

    .keyword-chip.is-ko {
      background: #fff7ee;
      border-color: #f17b2a;
      color: #7e3106;
      box-shadow: 0 0 0 1px rgba(241, 123, 42, 0.2), 0 0 10px rgba(241, 123, 42, 0.18);
    }

    .answer-stage {
      margin-top: 10px;
    }

    .answer-template {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 10px 11px;
      line-height: 1.9;
      font-size: 14px;
      color: #3c2d22;
      word-break: keep-all;
      white-space: pre-wrap;
    }

    .blank-inline {
      display: inline-flex;
      align-items: flex-end;
      margin: 0 2px;
      vertical-align: middle;
    }

    .blank-input {
      width: 60px;
      border: none;
      border-bottom: 2px solid #d9c0a7;
      background: transparent;
      padding: 0 2px 2px;
      font-size: 14px;
      font-weight: 900;
      color: #3c2d22;
      text-align: center;
      outline: none;
      line-height: 1.2;
    }

    .blank-input:focus {
      border-bottom-color: #f17b2a;
    }

    .blank-input::placeholder {
      color: #d1cac3;
      opacity: 1;
    }

    textarea {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 10px;
      font-size: 14px;
      box-sizing: border-box;
      outline: none;
      background: #fff;
      resize: vertical;
      line-height: 1.55;
      min-height: 78px;
    }

    textarea::placeholder {
      color: #b9b2aa;
      opacity: 1;
    }

    .focus-token {
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      color: #7e3106;
      font-weight: 900;
    }

    .btn-row {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }

    .btn-row .quiz-btn {
      flex: 1;
      margin-top: 0;
    }

    .feedback {
      margin-top: 8px;
      font-weight: 900;
      font-size: 13px;
      line-height: 1.6;
    }

    .result-item {
      background: #fffaf4;
      border: 1px solid #f0d9bf;
      border-radius: 10px;
      padding: 10px;
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.5;
    }

    .result-ok { color: #2e7d32; font-weight: 900; }
    .result-bad { color: #c62828; font-weight: 900; }
  `;
  document.head.appendChild(style);
}

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
  }
}

function wireBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;
  backBtn.addEventListener("click", () => history.back());
}

function wirePopupEvents() {
  const popup = document.getElementById("result-popup");
  if (!popup) return;
  popup.addEventListener("click", (ev) => {
    if (ev.target === popup) closePopup();
  });
}

async function loadExcelRows(filename) {
  const cacheBust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${cacheBust}` : `${filename}?${cacheBust}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return rows.filter((row) => !isRowAllEmpty(row));
}

function isRowAllEmpty(row) {
  const keys = Object.keys(row || {});
  if (!keys.length) return true;
  return keys.every((k) => String(row[k] ?? "").trim() === "");
}

function buildQuestionsFromRows() {
  let filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  if (MAX_QUESTIONS > 0) filtered = filtered.slice(0, MAX_QUESTIONS);

  questions = filtered.map((row, idx) => {
    const qNumber = Number(row["QNumber"]) || idx + 1;
    const questionRaw = normalizeEscapedBreaks(String(row["Question"] ?? "").trim());
    const answerRaw = normalizeEscapedBreaks(String(row["Answer"] ?? "").trim());
    const title = normalizeEscapedBreaks(String(row["Title"] ?? "").trim());
    const instruction = normalizeEscapedBreaks(String(row["Instruction"] ?? "").trim()) || DEFAULT_INSTRUCTION;

    const keywordsKo = questionRaw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const englishTokens = EN_TOKENS_BY_QNUMBER[qNumber] || [];
    const keywordPairs = keywordsKo.map((ko, tokenIndex) => ({
      ko,
      en: String(englishTokens[tokenIndex] ?? `word ${tokenIndex + 1}`),
    }));
    const blankPlan = buildBlankPlan(answerRaw, keywordsKo);
    const usedKeywordPairs = buildUsedKeywordPairs(keywordPairs, blankPlan.usedKeywordsOrder);

    return {
      no: idx + 1,
      qNumber,
      title,
      instruction,
      questionRaw,
      keywordPairs: usedKeywordPairs.length ? usedKeywordPairs : keywordPairs,
      blankPlan,
      answerRaw,
    };
  });
}

function buildIntroWordChip(text, variant) {
  const variantClass = variant === "ko" ? " is-ko" : " is-en";
  return `<span class="lip-word-chip-demo${variantClass}">${escapeHtml(text)}</span>`;
}

function buildStep1ExampleHtml() {
  const chips = [
    buildIntroWordChip("rain", "en"),
    buildIntroWordChip("stop", "en"),
    buildIntroWordChip("child", "en"),
    buildIntroWordChip("smile", "en"),
  ].join("");
  return `<div class="lip-word-flow">${chips}</div>`;
}

function buildStep2ExampleHtml() {
  const chips = [
    buildIntroWordChip("\uBE44", "ko"),
    buildIntroWordChip("\uADF8\uCE68", "ko"),
    buildIntroWordChip("\uC544\uC774", "ko"),
    buildIntroWordChip("\uC6C3\uC74C", "ko"),
  ].join("");
  return `<div class="lip-word-flow">${chips}</div>`;
}

function buildStep3ExampleHtml() {
  return `
    <div class="lip-sentence-build">
      <span class="lip-sentence-chip">\uBE44</span>
      <span class="lip-sentence-link">\uAC00 </span>
      <span class="lip-sentence-chip">\uADF8\uCE58</span>
      <span class="lip-sentence-link">\uC790 </span>
      <span class="lip-sentence-chip">\uC544\uC774</span>
      <span class="lip-sentence-link">\uAC00 </span>
      <span class="lip-sentence-chip">\uC6C3</span>
      <span class="lip-sentence-link">\uB294\uB2E4</span>
    </div>
  `;
}

function buildIntroPlayerConfig() {
  return {
    pageLabel: PAGE_LABEL,
    title: "키워드로 문장 만들기",
    nextLabel: "다음",
    primaryLabel: TEXT.START,
    onPrimary: startQuiz,
    steps: [
      {
        title: "영어는 단어만 나열합니다.",
        exampleHtml: buildStep1ExampleHtml(),
      },
      {
        title: "한국어로 바꾸려면, 말을 더 넣어줘야해요",
        exampleHtml: buildStep2ExampleHtml(),
      },
      {
        title: "적절한 말을 넣어보세요!",
        exampleHtml: buildStep3ExampleHtml(),
      },
    ],
  };
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  if (window.LessonIntroPlayer && typeof window.LessonIntroPlayer.render === "function") {
    try {
      if (window.LessonIntroPlayer.render(area, buildIntroPlayerConfig())) {
        return;
      }
    } catch (err) {
      console.error("LessonIntroPlayer render failed:", err);
    }
  }

  const total = questions.length;
  const title = questions[0]?.title || PAGE_LABEL;
  const firstInst = questions[0]?.instruction || DEFAULT_INSTRUCTION;

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">🧩 ${escapeHtml(PAGE_LABEL)}</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">총 ${total}문제</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>
      <div style="font-size:13px; line-height:1.6; color:#333;">
        ${escapeHtml(TEXT.INTRO_1)}<br/>
        ${escapeHtml(TEXT.INTRO_2)}
      </div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106;">${TEXT.PIN} ${escapeHtml(firstInst)}</div>
      <button class="quiz-btn" id="start-btn" style="width:100%; margin-top:12px;">${escapeHtml(TEXT.START)}</button>
    </div>
  `;

  const startBtn = document.getElementById("start-btn");
  if (startBtn) startBtn.addEventListener("click", startQuiz);
}

function startQuiz() {
  if (!questions.length) {
    alert(TEXT.NO_QUESTIONS);
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
  if (!q) {
    showResultPopup();
    return;
  }

  isCurrentLocked = false;
  revealedKeywordFlags = new Array((q.keywordPairs || []).length).fill(false);
  const chipsHtml = buildKeywordChipsHtml(q);

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="margin-bottom:8px;"><span class="pill">${escapeHtml(TEXT.QTYPE)}</span></div>
      <div id="stage-instruction" style="font-size:13px; color:#7e3106; font-weight:900;">${escapeHtml(TEXT.STEP1_INST)}</div>

      <div class="keyword-panel">
        <div class="keyword-wrap" id="keyword-wrap">${chipsHtml}</div>
      </div>
      <div class="answer-stage" id="answer-stage"></div>
      <div id="feedback" class="feedback"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" type="button" disabled>${escapeHtml(TEXT.SUBMIT)}</button>
      <button class="quiz-btn" id="next-btn" type="button" disabled>${escapeHtml(TEXT.NEXT)}</button>
    </div>
  `;

  wireKeywordTapEvents();

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");

  if (submitBtn) submitBtn.addEventListener("click", submitCurrentAnswer);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
}

function submitCurrentAnswer() {
  if (isCurrentLocked) return;

  const q = questions[currentIndex];
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const feedback = document.getElementById("feedback");

  if (!q) return;

  if (!areAllKeywordsRevealed(q)) {
    showToast("no", TEXT.TAP_ALL_FIRST);
    return;
  }

  const inputEls = [...document.querySelectorAll(".blank-input")];
  if (!inputEls.length) {
    showToast("no", TEXT.INPUT_REQUIRED);
    return;
  }

  const values = inputEls.map((el) => String(el.value || "").trim());
  if (values.some((v) => !v)) {
    showToast("no", TEXT.INPUT_REQUIRED);
    return;
  }

  const ok = isBlankAnswerCorrect(values, q.blankPlan);
  if (!ok) {
    if (feedback) {
      feedback.className = "feedback";
      feedback.innerHTML = "";
    }
    showToast("no", TEXT.WRONG);
    return;
  }

  isCurrentLocked = true;
  inputEls.forEach((el) => { el.disabled = true; });
  if (submitBtn) submitBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;

  const userRaw = composeSentenceFromBlankPlan(q.blankPlan, values);
  results.push({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    question: q.questionRaw,
    selected: userRaw,
    answer: q.answerRaw,
    instruction: q.instruction,
    correct: true,
  });

  if (feedback) {
    feedback.className = "feedback";
    feedback.innerHTML = "";
  }

  storeLatestResultSnapshot();
  showToast("ok", TEXT.CORRECT);
}

function buildKeywordChipsHtml(q) {
  return (q.keywordPairs || [])
    .map((pair, idx) => {
      const revealed = Boolean(revealedKeywordFlags[idx]);
      const cls = revealed ? "keyword-chip tap-target is-ko" : "keyword-chip tap-target is-en";
      const label = revealed ? renderTextWithEmphasis(pair.ko) : escapeHtml(pair.en);
      return `<span class="${cls}" data-keyword-idx="${idx}" role="button" tabindex="0">${label}</span>`;
    })
    .join("");
}

function wireKeywordTapEvents() {
  document.querySelectorAll(".keyword-chip.tap-target").forEach((el) => {
    const activate = () => {
      if (isCurrentLocked) return;
      const idx = Number(el.dataset.keywordIdx ?? -1);
      if (!Number.isInteger(idx) || idx < 0) return;
      if (revealedKeywordFlags[idx]) return;

      revealedKeywordFlags[idx] = true;
      refreshKeywordChipStage();

      const q = questions[currentIndex];
      if (q && areAllKeywordsRevealed(q)) {
        updateStageInstruction(TEXT.STEP2_INST);
        openBlankStage(q);
      }
    };

    el.addEventListener("click", activate);
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        activate();
      }
    });
  });
}

function refreshKeywordChipStage() {
  const q = questions[currentIndex];
  const wrap = document.getElementById("keyword-wrap");
  if (!q || !wrap) return;
  wrap.innerHTML = buildKeywordChipsHtml(q);
  wireKeywordTapEvents();
}

function areAllKeywordsRevealed(q) {
  const total = (q?.keywordPairs || []).length;
  if (!total) return false;
  if (revealedKeywordFlags.length !== total) return false;
  return revealedKeywordFlags.every(Boolean);
}

function openBlankStage(q) {
  const stage = document.getElementById("answer-stage");
  const submitBtn = document.getElementById("submit-btn");
  if (!stage || !q) return;

  const html = renderBlankStageHtml(q.blankPlan);
  stage.innerHTML = html;
  if (submitBtn) submitBtn.disabled = false;

  const first = stage.querySelector(".blank-input");
  if (first) first.focus();
}

function updateStageInstruction(text) {
  const el = document.getElementById("stage-instruction");
  if (!el) return;
  el.textContent = String(text ?? "");
}

function renderBlankStageHtml(plan) {
  if (!plan || !Array.isArray(plan.parts) || !plan.parts.length) return "";

  const body = plan.parts.map((part) => {
    if (part.type === "blank") {
      return `<span class="blank-inline"><input class="blank-input" data-blank-idx="${part.slotIndex}" type="text" autocomplete="off" placeholder="" /></span>`;
    }
    return escapeHtml(part.text);
  }).join("");

  return `<div class="answer-template">${body}</div>`;
}

function isBlankAnswerCorrect(values, plan) {
  if (!plan || !Array.isArray(plan.slots)) return false;
  if (values.length !== plan.slots.length) return false;

  for (let i = 0; i < values.length; i += 1) {
    const user = values[i];
    const slot = plan.slots[i];
    const candidates = Array.isArray(slot?.answers) ? slot.answers : [];
    if (!isOneBlankCorrect(user, candidates)) return false;
  }
  return true;
}

function isOneBlankCorrect(userRaw, modelCandidates) {
  const userStrict = normalizeForCompare(userRaw);
  const userLoose = normalizeLoose(userRaw);
  if (!userStrict && !userLoose) return false;

  for (const cand of (modelCandidates || [])) {
    const candStrict = normalizeForCompare(cand);
    const candLoose = normalizeLoose(cand);
    if (userStrict && candStrict && userStrict === candStrict) return true;
    if (userLoose && candLoose && userLoose === candLoose) return true;
  }
  return false;
}

function composeSentenceFromBlankPlan(plan, values) {
  if (!plan || !Array.isArray(plan.parts)) return values.join(" ");
  const map = values.map((v) => String(v ?? ""));
  return plan.parts.map((part) => {
    if (part.type === "blank") return map[part.slotIndex] ?? "";
    return part.text ?? "";
  }).join("");
}

function buildBlankPlan(answerRaw, keywordsKo) {
  const answer = stripEmphasisMarkers(normalizeEscapedBreaks(String(answerRaw ?? ""))).trim();
  const keywords = (keywordsKo || []).map((x) => String(x ?? "").trim()).filter(Boolean);
  if (!answer || !keywords.length) return { answer, parts: [{ type: "text", text: answer }], slots: [], usedKeywordsOrder: [] };

  const found = [];
  let searchStart = 0;

  for (const keyword of keywords) {
    const match = findAnswerMatch(answer, keyword, searchStart);
    if (!match) continue;
    found.push({
      keyword,
      text: match.text,
      index: match.index,
      length: match.text.length,
    });
    searchStart = match.index + match.text.length;
  }

  found.sort((a, b) => a.index - b.index);

  const nonOverlap = [];
  let lastEnd = -1;
  for (const m of found) {
    if (m.index < lastEnd) continue;
    nonOverlap.push(m);
    lastEnd = m.index + m.length;
  }

  if (!nonOverlap.length) {
    return { answer, parts: [{ type: "text", text: answer }], slots: [], usedKeywordsOrder: [] };
  }

  const parts = [];
  const slots = [];
  const usedKeywordsOrder = [];
  let cursor = 0;

  for (const m of nonOverlap) {
    if (m.index > cursor) {
      parts.push({ type: "text", text: answer.slice(cursor, m.index) });
    }
    const slotIndex = slots.length;
    parts.push({ type: "blank", slotIndex });
    slots.push({
      keyword: m.keyword,
      answers: buildBlankAnswerCandidates(m.keyword, m.text),
    });
    usedKeywordsOrder.push(m.keyword);
    cursor = m.index + m.length;
  }

  if (cursor < answer.length) {
    parts.push({ type: "text", text: answer.slice(cursor) });
  }

  return { answer, parts, slots, usedKeywordsOrder };
}

function buildUsedKeywordPairs(keywordPairs, usedKeywordsOrder) {
  const pairs = Array.isArray(keywordPairs) ? keywordPairs : [];
  const order = Array.isArray(usedKeywordsOrder) ? usedKeywordsOrder : [];
  if (!pairs.length || !order.length) return [];

  const pool = pairs.map((pair, idx) => ({
    idx,
    ko: String(pair?.ko ?? "").trim(),
    en: String(pair?.en ?? ""),
  }));

  const picked = [];
  for (const key of order) {
    const keyText = String(key ?? "").trim();
    if (!keyText) continue;

    const pos = pool.findIndex((p) => p.ko === keyText);
    if (pos < 0) continue;

    picked.push({
      ko: pool[pos].ko,
      en: pool[pos].en,
    });
    pool.splice(pos, 1);
  }

  return picked;
}

function findAnswerMatch(answer, keyword, fromIndex) {
  const candidates = buildKeywordCandidates(keyword);
  let best = null;

  for (const cand of candidates) {
    if (!cand) continue;
    const idx = answer.indexOf(cand, Math.max(0, fromIndex || 0));
    if (idx < 0) continue;
    if (!best || idx < best.index || (idx === best.index && cand.length > best.text.length)) {
      best = { text: cand, index: idx };
    }
  }

  if (best) return best;

  for (const cand of candidates) {
    if (!cand) continue;
    const idx = answer.indexOf(cand);
    if (idx < 0) continue;
    if (!best || idx < best.index || (idx === best.index && cand.length > best.text.length)) {
      best = { text: cand, index: idx };
    }
  }

  return best;
}

function buildKeywordCandidates(keyword) {
  const src = String(keyword ?? "").trim();
  if (!src) return [];

  const list = [src];
  if (src === "최고품종의") list.push("최고 품종의");
  if (src === "숙임") list.push("숙인");
  if (src === "세게") list.push("세차게");
  if (src.endsWith("음")) list.push(src.slice(0, -1));
  if (src.endsWith("뜸")) list.push(`${src.slice(0, -1)}뜨`);
  if (src.endsWith("함")) {
    list.push(src.slice(0, -1));
    list.push(`${src.slice(0, -1)}하`);
  }
  if (src.endsWith("짐")) {
    list.push(src.slice(0, -1));
    list.push(`${src.slice(0, -1)}지`);
  }
  if (src.endsWith("림")) {
    list.push(src.slice(0, -1));
    list.push(`${src.slice(0, -1)}리`);
  }
  if (src.endsWith("감")) {
    list.push(src.slice(0, -1));
    list.push(`${src.slice(0, -1)}가`);
  }
  if (src.endsWith("옴")) {
    list.push(src.slice(0, -1));
    list.push(`${src.slice(0, -1)}오`);
  }
  if (src.endsWith("움")) {
    list.push(src.slice(0, -1));
    list.push(`${src.slice(0, -1)}우`);
  }
  if (src.endsWith("없음")) list.push(src.replace(/없음$/, "없"));
  if (src.endsWith("말없음")) {
    list.push("말이 없");
    list.push("없");
  }

  return [...new Set(list)].sort((a, b) => b.length - a.length);
}

function buildBlankAnswerCandidates(keyword, matched) {
  const list = [matched, keyword];
  for (const cand of buildKeywordCandidates(keyword)) {
    list.push(cand);
  }
  return [...new Set(list.map((x) => String(x ?? "").trim()).filter(Boolean))];
}

function goNext() {
  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function showResultPopup() {
  const popup = document.getElementById("result-popup");
  const content = document.getElementById("result-content");
  if (!popup || !content) return;

  const total = questions.length;
  const correctCount = results.filter((r) => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const rowsHtml = questions.map((q, idx) => {
    const row = results.find((r) => r.qNumber === q.qNumber);
    const user = row?.selected ?? TEXT.UNANSWERED;
    const state = row?.correct ? TEXT.CORRECT : TEXT.WRONG;
    const stateClass = row?.correct ? "result-ok" : "result-bad";

    return `
      <div class="result-item">
        <div><b>Q${idx + 1}</b> ${escapeHtml(q.questionRaw || "")}</div>
        <div style="margin-top:4px;"><span class="${stateClass}">${state}</span></div>
        <div>${TEXT.MY_ANSWER}: ${escapeHtml(user)}</div>
        <div>${TEXT.ANSWER}: ${escapeHtml(q.answerRaw)}</div>
      </div>
    `;
  }).join("");

  content.innerHTML = `
    <div style="font-size:18px; font-weight:900; color:#7e3106;">${TEXT.RESULT_TITLE}</div>
    <div style="margin-top:8px;">
      <span class="pill">${TEXT.SCORE} ${score}점</span>
      <span class="pill">${TEXT.CORRECT_COUNT} ${correctCount}/${total}</span>
    </div>

    <div style="margin-top:8px; font-size:12px; color:#7e3106; font-weight:900;">
      ${escapeHtml(quizTitle)}
    </div>

    <div style="margin-top:10px;">${rowsHtml}</div>

    <div class="btn-row" style="margin-top:14px;">
      <button class="quiz-btn" id="retry-btn" type="button">${TEXT.RETRY}</button>
      <button class="quiz-btn" id="close-popup-btn" type="button">${TEXT.CLOSE}</button>
    </div>
  `;

  const retryBtn = document.getElementById("retry-btn");
  const closeBtn = document.getElementById("close-popup-btn");
  if (retryBtn) retryBtn.addEventListener("click", () => window.location.reload());
  if (closeBtn) closeBtn.addEventListener("click", closePopup);

  popup.style.display = "flex";
  popup.setAttribute("aria-hidden", "false");
}

function closePopup() {
  const popup = document.getElementById("result-popup");
  if (!popup) return;
  popup.style.display = "none";
  popup.setAttribute("aria-hidden", "true");
}

function showToast(kind, text) {
  if (window.HermaToastFX) {
    window.HermaToastFX.show(kind, text);
    return;
  }
  if (kind === "ok") console.info(text);
  else console.warn(text);
}

function storeLatestResultSnapshot() {
  try {
    const total = questions.length;
    const correctCount = results.filter((r) => r.correct).length;
    const score = total ? Math.round((correctCount / total) * 100) : 0;
    const payload = {
      id: userId,
      quiztitle: quizTitle,
      subcategory,
      level,
      day,
      score,
      total,
      correctCount,
      results,
    };
    localStorage.setItem("QuizResults", JSON.stringify(payload));
  } catch (_) {}
}

function normalizeEscapedBreaks(value) {
  return String(value ?? "")
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\\r", "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function stripEmphasisMarkers(value) {
  return String(value ?? "").replace(/\*\*(.*?)\*\*/gs, "$1");
}

function normalizeForCompare(value) {
  return stripEmphasisMarkers(normalizeEscapedBreaks(String(value ?? "")))
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!~]+$/g, "")
    .trim();
}

function normalizeLoose(value) {
  return normalizeForCompare(value)
    .toLowerCase()
    .replace(/[\s'"`.,!?~:;()\[\]{}_-]+/g, "");
}

function renderTextWithEmphasis(value) {
  const text = normalizeEscapedBreaks(String(value ?? ""));
  const re = /\*\*(.*?)\*\*/gs;
  let out = "";
  let last = 0;
  let m;

  while ((m = re.exec(text)) !== null) {
    out += escapeHtml(text.slice(last, m.index));
    out += `<span class="focus-token">${escapeHtml(String(m[1] ?? "").trim())}</span>`;
    last = re.lastIndex;
  }

  out += escapeHtml(text.slice(last));
  return out;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(str) {
  return escapeHtml(stripEmphasisMarkers(normalizeEscapedBreaks(str))).replaceAll("\n", " ");
}
