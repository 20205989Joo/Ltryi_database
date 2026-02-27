// aisth-l4e1.js
// Independent runtime for Aisth Lesson 4 Exercise 1
// Pronoun-case table selection (circle choice)

const EXCEL_FILE = "LTRYI-grammar-lesson-questions.xlsx";
const TARGET_LESSON = 4;
const TARGET_EXERCISE = 1;
const PAGE_LABEL = "Aisth L4-E1";
const MAX_QUESTIONS = 0; // 0 = unlimited

const FIXED_INSTRUCTION = "괄호 안의 원단어를 알맞은 격으로 골라보세요.";

const TEXT = {
  START: "🚀 시작",
  INTRO_1: "문장 속 (원단어)를 확인하고, 아래 격 표에서 알맞은 형태를 고르세요.",
  INTRO_2: "정답이면 다음으로 넘어가고, 오답이면 다시 선택할 수 있습니다.",
  PIN: "📌",
  NO_QUESTIONS: "해당 Lesson/Exercise의 문제가 없습니다.",
  PICK_OPTION: "표에서 답을 먼저 고르세요.",
  CORRECT: "정답!",
  WRONG: "오답",
  QTYPE: "대명사 격 선택",
  CASE_SUBJ: "주격",
  CASE_OBJ: "목적격",
  CASE_POS_ADJ: "소유형용사",
  CASE_POS_PRO: "소유대명사",
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

const PRONOUN_FORMS = {
  i: { subject: "I", object: "me", possessiveAdj: "my", possessivePro: "mine" },
  you: { subject: "you", object: "you", possessiveAdj: "your", possessivePro: "yours" },
  he: { subject: "he", object: "him", possessiveAdj: "his", possessivePro: "his" },
  she: { subject: "she", object: "her", possessiveAdj: "her", possessivePro: "hers" },
  it: { subject: "it", object: "it", possessiveAdj: "its", possessivePro: "its" },
  we: { subject: "we", object: "us", possessiveAdj: "our", possessivePro: "ours" },
  they: { subject: "they", object: "them", possessiveAdj: "their", possessivePro: "theirs" },
};

const PRONOUN_GLOSS = {
  i: { subject: "나는", object: "나를", possessiveAdj: "나의", possessivePro: "내 것" },
  you: { subject: "너는", object: "너를", possessiveAdj: "너의", possessivePro: "네 것" },
  he: { subject: "그는", object: "그를", possessiveAdj: "그의", possessivePro: "그의 것" },
  she: { subject: "그녀는", object: "그녀를", possessiveAdj: "그녀의", possessivePro: "그녀의 것" },
  it: { subject: "그것은", object: "그것을", possessiveAdj: "그것의", possessivePro: "그것의 것" },
  we: { subject: "우리는", object: "우리를", possessiveAdj: "우리의", possessivePro: "우리 것" },
  they: { subject: "그들은", object: "그들을", possessiveAdj: "그들의", possessivePro: "그들의 것" },
};

let subcategory = "Grammar";
let level = "aisth";
let day = "013";
let quizTitle = "quiz_Grammar_aisth_l4e1";
let userId = "";

let rawRows = [];
let questions = [];
let currentIndex = 0;
let results = [];
let isCurrentLocked = false;
let selectedCellIndex = -1;

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

    .sentence {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 12px;
      margin-top: 8px;
      line-height: 1.65;
      font-size: 14px;
      word-break: keep-all;
      white-space: pre-wrap;
    }

    .focus-token {
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      color: #7e3106;
      font-weight: 900;
    }

    .case-table-wrap {
      margin-top: 10px;
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid #ebd9c4;
      background: #fff;
    }

    .case-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      min-width: 250px;
    }

    .case-table th,
    .case-table td {
      border: 1px solid #efdfcb;
      text-align: center;
      padding: 8px 6px;
    }

    .case-table th {
      background: #fff6eb;
      color: #7e3106;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.1px;
    }

    .case-table td {
      background: #fff;
      color: #3c2d22;
      font-size: 14px;
      font-weight: 700;
    }

    .table-choice {
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      padding: 0 3px;
      cursor: pointer;
      user-select: none;
      transition: color 0.15s ease;
      z-index: 0;
    }

    .table-choice:hover {
      color: #7e3106;
    }

    .table-choice.selected {
      color: #7e3106;
      font-weight: 900;
    }

    .table-choice.selected::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: max(calc(100% + 16px), 30px);
      height: max(calc(100% + 16px), 30px);
      transform: translate(-50%, -50%);
      border: 2px solid #7e3106;
      border-radius: 50%;
      pointer-events: none;
      box-sizing: border-box;
    }

    .cell-word {
      font-size: 14px;
      font-weight: 900;
      line-height: 1.2;
    }

    .cell-mean {
      font-size: 10px;
      color: #8b7968;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
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
    const questionRaw = normalizeEscapedBreaks(String(row["Question"] ?? "").trim());
    const answerRaw = stripEmphasisMarkers(normalizeEscapedBreaks(String(row["Answer"] ?? "").trim()));
    const title = stripEmphasisMarkers(normalizeEscapedBreaks(String(row["Title"] ?? "").trim()));
    const base = extractBasePronoun(questionRaw, answerRaw);
    const forms = resolvePronounForms(base, answerRaw);
    const gloss = resolvePronounGloss(base, answerRaw);

    const cells = [
      { label: TEXT.CASE_SUBJ, value: forms.subject, gloss: gloss.subject },
      { label: TEXT.CASE_OBJ, value: forms.object, gloss: gloss.object },
      { label: TEXT.CASE_POS_ADJ, value: forms.possessiveAdj, gloss: gloss.possessiveAdj },
      { label: TEXT.CASE_POS_PRO, value: forms.possessivePro, gloss: gloss.possessivePro },
    ];

    return {
      no: idx + 1,
      qNumber: Number(row["QNumber"]) || idx + 1,
      title,
      questionRaw,
      answerRaw,
      instruction: FIXED_INSTRUCTION,
      base,
      cells,
    };
  });
}

function extractBasePronoun(questionRaw, answerRaw) {
  const q = normalizeEscapedBreaks(String(questionRaw || ""));
  const m = q.match(/\(([^()]+)\)/);
  if (m) return normalizePronounKey(m[1]);

  const a = normalizeForCompare(answerRaw).toLowerCase();
  for (const key of Object.keys(PRONOUN_FORMS)) {
    const forms = PRONOUN_FORMS[key];
    const values = [forms.subject, forms.object, forms.possessiveAdj, forms.possessivePro]
      .map((v) => normalizeForCompare(v).toLowerCase());
    if (values.includes(a)) return key;
  }

  return "you";
}

function normalizePronounKey(raw) {
  return String(raw || "").trim().toLowerCase();
}

function resolvePronounForms(baseKey, answerRaw) {
  if (PRONOUN_FORMS[baseKey]) return PRONOUN_FORMS[baseKey];

  const answer = normalizeForCompare(answerRaw).toLowerCase();
  for (const key of Object.keys(PRONOUN_FORMS)) {
    const f = PRONOUN_FORMS[key];
    const values = [f.subject, f.object, f.possessiveAdj, f.possessivePro]
      .map((v) => normalizeForCompare(v).toLowerCase());
    if (values.includes(answer)) return f;
  }

  return PRONOUN_FORMS.you;
}

function resolvePronounGloss(baseKey, answerRaw) {
  if (PRONOUN_GLOSS[baseKey]) return PRONOUN_GLOSS[baseKey];

  const answer = normalizeForCompare(answerRaw).toLowerCase();
  for (const key of Object.keys(PRONOUN_FORMS)) {
    const f = PRONOUN_FORMS[key];
    const values = [f.subject, f.object, f.possessiveAdj, f.possessivePro]
      .map((v) => normalizeForCompare(v).toLowerCase());
    if (values.includes(answer) && PRONOUN_GLOSS[key]) return PRONOUN_GLOSS[key];
  }

  return PRONOUN_GLOSS.you;
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = questions[0]?.title || PAGE_LABEL;

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

      <div style="margin-top:10px; font-size:13px; color:#7e3106;">${TEXT.PIN} ${escapeHtml(FIXED_INSTRUCTION)}</div>
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
  selectedCellIndex = -1;

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="margin-bottom:8px;">
        <span class="pill">${escapeHtml(TEXT.QTYPE)}</span>
      </div>
      <div style="font-size:13px; color:#7e3106; font-weight:900;">${escapeHtml(FIXED_INSTRUCTION)}</div>
      <div class="sentence">${renderQuestionWithBaseHighlight(q.questionRaw)}</div>
    </div>

    <div class="box" style="background:#fff;">
      ${renderCaseTable(q.cells)}
      <div id="feedback" class="feedback"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" type="button">제출</button>
      <button class="quiz-btn" id="next-btn" type="button" disabled>다음</button>
    </div>
  `;

  wireCaseClicks();

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  if (submitBtn) submitBtn.addEventListener("click", submitCurrentAnswer);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
}

function renderCaseTable(cells) {
  const header = cells.map((c) => `<th><span>${escapeHtml(c.label)}</span></th>`).join("");
  const body = cells
    .map((c, idx) => `
      <td>
        <span class="table-choice" data-cell-index="${idx}">
          <span class="cell-word">${escapeHtml(c.value)}</span>
          <span class="cell-mean">${escapeHtml(c.gloss || "")}</span>
        </span>
      </td>
    `)
    .join("");

  return `
    <div class="case-table-wrap">
      <table class="case-table">
        <thead><tr>${header}</tr></thead>
        <tbody><tr>${body}</tr></tbody>
      </table>
    </div>
  `;
}

function wireCaseClicks() {
  document.querySelectorAll(".table-choice").forEach((el) => {
    el.addEventListener("click", () => {
      if (isCurrentLocked) return;
      const idx = Number(el.dataset.cellIndex ?? -1);
      if (!Number.isInteger(idx) || idx < 0) return;
      selectedCellIndex = idx;
      refreshCaseSelection();
    });
  });
}

function refreshCaseSelection() {
  document.querySelectorAll(".table-choice").forEach((el) => {
    const idx = Number(el.dataset.cellIndex ?? -1);
    el.classList.toggle("selected", idx === selectedCellIndex);
  });
}

function submitCurrentAnswer() {
  if (isCurrentLocked) return;

  const q = questions[currentIndex];
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const feedback = document.getElementById("feedback");

  if (!q) return;

  if (selectedCellIndex < 0 || selectedCellIndex >= q.cells.length) {
    showToast("no", TEXT.PICK_OPTION);
    return;
  }

  const selectedText = String(q.cells[selectedCellIndex].value || "").trim();
  const ok = isAnswerCorrect(selectedText, q.answerRaw);

  if (!ok) {
    if (feedback) {
      feedback.className = "feedback";
      feedback.innerHTML = "";
    }
    showToast("no", TEXT.WRONG);
    return;
  }

  isCurrentLocked = true;
  if (submitBtn) submitBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;

  document.querySelectorAll(".table-choice").forEach((el) => {
    el.style.pointerEvents = "none";
  });

  results.push({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    question: q.questionRaw,
    selected: selectedText,
    answer: q.answerRaw,
    instruction: FIXED_INSTRUCTION,
    correct: true,
  });

  if (feedback) {
    feedback.className = "feedback";
    feedback.innerHTML = "";
  }

  storeLatestResultSnapshot();
  showToast("ok", TEXT.CORRECT);
}

function goNext() {
  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function isAnswerCorrect(userRaw, modelRaw) {
  const userStrict = normalizeForCompare(userRaw);
  const userLoose = normalizeLoose(userRaw);
  if (!userStrict && !userLoose) return false;

  const candidates = buildModelCandidates(modelRaw);
  for (const cand of candidates) {
    const candStrict = normalizeForCompare(cand);
    const candLoose = normalizeLoose(cand);
    if (userStrict && candStrict && userStrict === candStrict) return true;
    if (userLoose && candLoose && userLoose === candLoose) return true;
  }
  return false;
}

function buildModelCandidates(modelRaw) {
  const raw = String(modelRaw ?? "").trim();
  if (!raw) return [""];

  const set = new Set([raw]);

  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    set.add(t);

    for (const part of t.split("||")) {
      const p = part.trim();
      if (p) set.add(p);
    }

    if (/\bor\b/i.test(t)) {
      for (const part of t.split(/\bor\b/i)) {
        const p = part.trim();
        if (p && p.length <= 80) set.add(p);
      }
    }

    if (t.includes("/")) {
      const parts = t.split("/").map((x) => x.trim()).filter(Boolean);
      if (parts.length >= 2 && parts.length <= 6) {
        parts.forEach((p) => { if (p.length <= 80) set.add(p); });
      }
    }

    if (t.includes(",")) {
      const parts = t.split(",").map((x) => x.trim()).filter(Boolean);
      if (parts.length >= 2 && parts.length <= 4) {
        parts.forEach((p) => { if (p.length <= 80) set.add(p); });
      }
    }
  }

  return [...set];
}

function renderQuestionWithBaseHighlight(value) {
  const text = stripEmphasisMarkers(normalizeEscapedBreaks(String(value ?? "")));
  const m = /\(([^()]+)\)/.exec(text);
  if (!m) return escapeHtml(text);

  const full = m[0];
  const inner = String(m[1] ?? "").trim();
  const idx = m.index;

  const before = text.slice(0, idx);
  const after = text.slice(idx + full.length);

  return `${escapeHtml(before)}<span class="focus-token">${escapeHtml(inner)}</span>${escapeHtml(after)}`;
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

function formatMultilineText(value) {
  return escapeHtml(stripEmphasisMarkers(normalizeEscapedBreaks(String(value ?? "")))).replaceAll("\n", "<br/>");
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
        <div><b>Q${idx + 1}</b> ${renderQuestionWithBaseHighlight(q.questionRaw)}</div>
        <div style="margin-top:4px;"><span class="${stateClass}">${state}</span></div>
        <div>${TEXT.MY_ANSWER}: ${escapeHtml(user)}</div>
        <div>${TEXT.ANSWER}: ${formatMultilineText(q.answerRaw)}</div>
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

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
