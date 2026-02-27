// aisth-l1e2.js
// Independent runtime for Aisth Lesson 1 Exercise 2 (noun vs adjective classification)

const EXCEL_FILE = "LTRYI-grammar-lesson-questions.xlsx";
const TARGET_LESSON = 1;
const TARGET_EXERCISE = 2;
const PAGE_LABEL = "Aisth L1-E2";
const MAX_QUESTIONS = 0; // 0 = unlimited

const FIXED_INSTRUCTION = "명사일까요, 형용사일까요?";

const TEXT = {
  START: "🚀 시작",
  INTRO_1: "표시된 단어가 명사인지 형용사인지 고르세요.",
  INTRO_2: "각 문제에서 둘 중 하나만 선택하면 됩니다.",
  PIN: "📌",
  NO_QUESTIONS: "해당 Lesson/Exercise의 문제가 없습니다.",
  CHOICE_REQUIRED: "명사/형용사 중 하나를 선택하세요.",
  CORRECT: "정답!",
  WRONG: "오답",
  QTYPE: "품사 분류",
  LOAD_FAIL: "엑셀 파일을 불러오지 못했습니다. 파일명/경로를 확인하세요.",
  RESULT_TITLE: "결과 요약",
  SCORE: "점수",
  CORRECT_COUNT: "정답",
  MY_ANSWER: "내 답",
  ANSWER: "정답",
  RETRY: "다시하기",
  CLOSE: "닫기",
  UNANSWERED: "(미응답)",
  SUBMIT: "제출",
  NEXT: "다음",
  CHOICE_NOUN: "명사",
  CHOICE_ADJ: "형용사",
};

let subcategory = "Grammar";
let level = "aisth";
let day = "002";
let quizTitle = "quiz_Grammar_aisth_l1e2";
let userId = "";

let rawRows = [];
let questions = [];
let currentIndex = 0;
let results = [];
let isCurrentLocked = false;
let selectedChoiceKey = "";

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
      line-height: 1.7;
      font-size: 15px;
      word-break: keep-all;
      white-space: pre-wrap;
    }

    .focus-token {
      background: #ffe8b8;
      color: #7e3106;
      border: 1px solid #e7c187;
      border-radius: 7px;
      padding: 0 5px;
      font-weight: 900;
    }

    .choice-row {
      display: flex;
      gap: 10px;
      margin-top: 4px;
    }

    .choice-btn {
      flex: 1;
      border: 2px solid #d8bda0;
      border-radius: 12px;
      background: #fff;
      color: #7e3106;
      font-weight: 900;
      font-size: 16px;
      padding: 12px 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .choice-btn:hover {
      border-color: #f17b2a;
      transform: translateY(-1px);
    }

    .choice-btn.active {
      border-color: #f17b2a;
      background: #fff1e3;
      box-shadow: inset 0 0 0 1px rgba(241,123,42,0.25);
    }

    .choice-btn:disabled {
      cursor: not-allowed;
      opacity: 0.7;
      transform: none;
    }
    input::placeholder,
    textarea::placeholder {
      color: #b9b2aa;
      opacity: 1;
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
      margin-top: 10px;
      font-weight: 900;
      font-size: 13px;
      line-height: 1.6;
    }

    .ok { color: #2e7d32; }
    .bad { color: #c62828; }

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
    const question = normalizeEscapedBreaks(String(row["Question"] ?? "").trim());
    const answerRaw = normalizeEscapedBreaks(String(row["Answer"] ?? "").trim());

    return {
      no: idx + 1,
      qNumber: Number(row["QNumber"]) || idx + 1,
      title: normalizeEscapedBreaks(String(row["Title"] ?? "").trim()),
      question,
      questionPlain: stripHighlightMarkers(question),
      answerRaw,
      answerKey: normalizeChoiceKey(answerRaw),
      instruction: FIXED_INSTRUCTION,
    };
  });
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
  selectedChoiceKey = "";

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="margin-bottom:8px;">
        <span class="pill">${escapeHtml(TEXT.QTYPE)}</span>
      </div>
      <div style="font-size:13px; color:#7e3106; font-weight:900;">${escapeHtml(FIXED_INSTRUCTION)}</div>
      <div class="sentence">${renderQuestionWithHighlight(q.question)}</div>
    </div>

    <div class="box" style="background:#fff;">
      <div class="choice-row">
        <button class="choice-btn" type="button" data-choice="noun">${escapeHtml(TEXT.CHOICE_NOUN)}</button>
        <button class="choice-btn" type="button" data-choice="adjective">${escapeHtml(TEXT.CHOICE_ADJ)}</button>
      </div>
      <div id="feedback" class="feedback"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" type="button">${escapeHtml(TEXT.SUBMIT)}</button>
      <button class="quiz-btn" id="next-btn" type="button" disabled>${escapeHtml(TEXT.NEXT)}</button>
    </div>
  `;

  wireChoiceButtons();

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");

  if (submitBtn) submitBtn.addEventListener("click", submitCurrentAnswer);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
}

function wireChoiceButtons() {
  document.querySelectorAll(".choice-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isCurrentLocked) return;
      const key = String(btn.dataset.choice || "").trim();
      if (!key) return;
      selectedChoiceKey = key;
      refreshChoiceUI();
    });
  });
}

function refreshChoiceUI() {
  document.querySelectorAll(".choice-btn").forEach((btn) => {
    const key = String(btn.dataset.choice || "").trim();
    btn.classList.toggle("active", key === selectedChoiceKey);
  });
}

function submitCurrentAnswer() {
  if (isCurrentLocked) return;

  const q = questions[currentIndex];
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const feedback = document.getElementById("feedback");

  if (!q) return;

  if (!selectedChoiceKey) {
    showToast("no", TEXT.CHOICE_REQUIRED);
    return;
  }

  const answerKey = q.answerKey || normalizeChoiceKey(q.answerRaw);
  const ok = selectedChoiceKey === answerKey;

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

  document.querySelectorAll(".choice-btn").forEach((btn) => {
    btn.disabled = true;
  });

  results.push({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    question: q.questionPlain,
    selected: labelForChoice(selectedChoiceKey),
    answer: labelForChoice(answerKey),
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

function normalizeChoiceKey(value) {
  const s = String(value ?? "").toLowerCase().trim();
  const tight = s.replace(/\s+/g, "");

  if (
    tight.includes("명사") ||
    tight === "noun" ||
    tight === "n" ||
    tight === "명"
  ) return "noun";

  if (
    tight.includes("형용사") ||
    tight === "adjective" ||
    tight === "adj" ||
    tight === "형"
  ) return "adjective";

  return "";
}

function labelForChoice(key) {
  if (key === "noun") return TEXT.CHOICE_NOUN;
  if (key === "adjective") return TEXT.CHOICE_ADJ;
  return "";
}

function renderQuestionWithHighlight(raw) {
  const text = normalizeEscapedBreaks(String(raw ?? ""));
  const re = /\*\*(.*?)\*\*/gs;
  let out = "";
  let last = 0;
  let m;

  while ((m = re.exec(text)) !== null) {
    out += escapeHtml(text.slice(last, m.index));
    const inner = String(m[1] ?? "").replace(/\s+/g, " ").trim();
    out += `<span class="focus-token">${escapeHtml(inner)}</span>`;
    last = re.lastIndex;
  }

  out += escapeHtml(text.slice(last));
  return out;
}

function stripHighlightMarkers(raw) {
  return normalizeEscapedBreaks(String(raw ?? "")).replace(/\*\*(.*?)\*\*/g, "$1").replace(/\s+/g, " ").trim();
}

function normalizeEscapedBreaks(value) {
  return String(value ?? "")
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\\r", "\n");
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
    const answer = row?.answer || labelForChoice(q.answerKey || normalizeChoiceKey(q.answerRaw));

    return `
      <div class="result-item">
        <div><b>Q${idx + 1}</b> ${escapeHtml(q.questionPlain)}</div>
        <div style="margin-top:4px;"><span class="${stateClass}">${state}</span></div>
        <div>${TEXT.MY_ANSWER}: ${escapeHtml(user)}</div>
        <div>${TEXT.ANSWER}: ${escapeHtml(answer)}</div>
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


