// aisth-l2e1.js
// Independent runtime for Aisth Lesson 2 Exercise 1
// Pattern: choose one option in parentheses + Korean hint emphasis (**...**)

const EXCEL_FILE = "LTRYI-grammar-lesson-questions.xlsx";
const TARGET_LESSON = 2;
const TARGET_EXERCISE = 1;
const PAGE_LABEL = "Aisth L2-E1";
const MAX_QUESTIONS = 0; // 0 = unlimited

const DEFAULT_INSTRUCTION = "적절한 변형을 동그라미 쳐보세요.";

const TEXT = {
  START: "🚀 시작",
  INTRO_1: "간호 안 보기에서 올바른 형태를 고르세요.",
  INTRO_2: "선택지를 누르면 동그라미로 표시됩니다.",
  PIN: "📌",
  NO_QUESTIONS: "해당 Lesson/Exercise의 문제가 없습니다.",
  PICK_OPTION: "선택지를 먼저 고르세요.",
  CORRECT: "정답!",
  WRONG: "오답",
  QTYPE: "시제 변형 고르기",
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
};

let subcategory = "Grammar";
let level = "aisth";
let day = "005";
let quizTitle = "quiz_Grammar_aisth_l2e1";
let userId = "";

let rawRows = [];
let questions = [];
let currentIndex = 0;
let results = [];
let isCurrentLocked = false;
let selectedOptionIndex = -1;

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

    .quiz-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
      white-space: normal;
    }

    .en-line,
    .ko-line {
      white-space: pre-wrap;
    }

    .en-line {
      line-height: 1.65;
    }

    .opt-token {
      position: relative;
      display: inline-block;
      color: #3c2d22;
      font-weight: 700;
      font-size: inherit;
      line-height: inherit;
      padding: 0 1px;
      margin: 0 2px;
      cursor: pointer;
      user-select: none;
      transition: color 0.15s ease;
      z-index: 0;
    }

    .opt-token:hover {
      color: #7e3106;
    }

    .opt-token.selected {
      color: #7e3106;
      font-weight: 900;
    }

    .opt-token.selected::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: max(calc(100% + 14px), 28px);
      height: max(calc(100% + 14px), 28px);
      transform: translate(-50%, -50%);
      border: 2px solid #7e3106;
      border-radius: 50%;
      pointer-events: none;
      box-sizing: border-box;
    }

    .slash {
      color: #6f5847;
      font-weight: 700;
    }

    .ko-line {
      margin-top: 8px;
      color: #5a4637;
      font-size: 13px;
    }

    .ko-focus {
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight: 900;
      color: #7e3106;
    }

    .choice-line {
      font-size: 15px;
      line-height: 1.9;
      padding: 4px 0;
      color: #3c2d22;
      word-break: keep-all;
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

    .btn-row .quiz-btn { flex: 1; margin-top: 0; }

    .feedback {
      margin-top: 8px;
      font-weight: 900;
      font-size: 13px;
      line-height: 1.6;
    }

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
    const questionRaw = normalizeEscapedBreaks(String(row["Question"] ?? "").trim());
    const answerRaw = normalizeEscapedBreaks(String(row["Answer"] ?? "").trim());
    const instructionRaw = normalizeEscapedBreaks(String(row["Instruction"] ?? "").trim());
    const parsed = parseChoiceQuestion(questionRaw);

    return {
      no: idx + 1,
      qNumber: Number(row["QNumber"]) || idx + 1,
      title: normalizeEscapedBreaks(String(row["Title"] ?? "").trim()),
      instruction: instructionRaw || DEFAULT_INSTRUCTION,
      questionRaw,
      answerRaw,
      pre: parsed.pre,
      options: parsed.options,
      post: parsed.post,
      koreanHint: parsed.koreanHint,
      correctOptionIndex: resolveCorrectOptionIndex(answerRaw, parsed.options),
    };
  });
}

function parseChoiceQuestion(raw) {
  const s = normalizeEscapedBreaks(String(raw || "")).trim();

  let englishPart = s;
  let koreanHint = "";

  const tail = s.match(/^(.*)\(\s*([^()]*)\s*\)\s*$/s);
  if (tail) {
    const maybeKor = String(tail[2] || "").trim();
    if (/[가-힣]/.test(maybeKor) || maybeKor.includes("**")) {
      englishPart = String(tail[1] || "").trim();
      koreanHint = maybeKor;
    }
  }

  const m = englishPart.match(/^(.*)\(([^()]*)\)(.*)$/s);
  if (!m) {
    return {
      pre: normalizeEscapedBreaks(englishPart),
      options: [],
      post: "",
      koreanHint,
    };
  }

  const pre = normalizeEscapedBreaks(String(m[1] || "").replace(/\s+/g, " ").trim());
  const options = String(m[2] || "")
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);
  const post = normalizeEscapedBreaks(String(m[3] || "").replace(/\s+/g, " ").trim());

  return { pre, options, post, koreanHint };
}

function resolveCorrectOptionIndex(answerRaw, options) {
  const opts = Array.isArray(options) ? options : [];
  if (!opts.length) return -1;

  const normOpts = opts.map((o) => normalizeEnglish(o));
  const ans = normalizeEnglish(answerRaw);
  if (!ans) return -1;

  let idx = normOpts.indexOf(ans);
  if (idx >= 0) return idx;

  const firstPart = normalizeEnglish(String(answerRaw || "").split(",")[0]);
  if (firstPart) {
    idx = normOpts.indexOf(firstPart);
    if (idx >= 0) return idx;
  }

  const forms = buildAnswerForms(firstPart || ans);
  for (const f of forms) {
    idx = normOpts.indexOf(f);
    if (idx >= 0) return idx;
  }

  for (let i = 0; i < normOpts.length; i++) {
    const o = normOpts[i];
    if (o.startsWith(ans + " ") || ans.startsWith(o + " ")) return i;
  }

  return -1;
}

function buildAnswerForms(base) {
  const s = normalizeEnglish(base);
  const out = new Set([s]);

  if (/^[a-z]+$/.test(s)) {
    out.add(s + "s");
    out.add(s + "es");
    if (s.endsWith("y") && s.length > 1) {
      out.add(s.slice(0, -1) + "ies");
    }
  }

  return [...out];
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

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
  selectedOptionIndex = -1;

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="margin-bottom:8px;"><span class="pill">${escapeHtml(TEXT.QTYPE)}</span></div>
      <div style="font-size:13px; color:#7e3106; font-weight:900;">${escapeHtml(q.instruction || DEFAULT_INSTRUCTION)}</div>
      <div class="sentence">
        <div class="en-line">${renderEnglishStemLine(q)}</div>
        ${q.koreanHint ? `<div class="ko-line">(${renderKoreanHint(q.koreanHint)})</div>` : ""}
      </div>
    </div>

    <div class="box" style="background:#fff;">
      <div class="choice-line">${renderChoiceOptionsLine(q)}</div>
      <div id="feedback" class="feedback"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" type="button">${escapeHtml(TEXT.SUBMIT)}</button>
      <button class="quiz-btn" id="next-btn" type="button" disabled>${escapeHtml(TEXT.NEXT)}</button>
    </div>
  `;

  wireOptionClicks();

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  if (submitBtn) submitBtn.addEventListener("click", submitCurrentAnswer);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
}

function renderEnglishStemLine(q) {
  const pre = escapeHtml(q.pre || "");
  const post = escapeHtml(q.post || "");

  if (!Array.isArray(q.options) || !q.options.length) {
    return `${pre} ${post}`.trim();
  }
  const leftGap = pre ? " " : "";
  const rightGap = post ? " " : "";
  return `${pre}${leftGap}( ___ )${rightGap}${post}`;
}

function renderChoiceOptionsLine(q) {
  if (!Array.isArray(q.options) || !q.options.length) {
    return "";
  }

  const opts = q.options
    .map((opt, idx) => `<span class="opt-token" data-opt-index="${idx}">${escapeHtml(opt)}</span>`)
    .join(`<span class="slash"> / </span>`);

  return `(${opts})`;
}

function wireOptionClicks() {
  document.querySelectorAll(".opt-token").forEach((el) => {
    el.addEventListener("click", () => {
      if (isCurrentLocked) return;
      const idx = Number(el.dataset.optIndex ?? -1);
      if (!Number.isInteger(idx) || idx < 0) return;
      selectedOptionIndex = idx;
      refreshOptionSelection();
    });
  });
}

function refreshOptionSelection() {
  document.querySelectorAll(".opt-token").forEach((el) => {
    const idx = Number(el.dataset.optIndex ?? -1);
    el.classList.toggle("selected", idx === selectedOptionIndex);
  });
}

function submitCurrentAnswer() {
  if (isCurrentLocked) return;

  const q = questions[currentIndex];
  const feedback = document.getElementById("feedback");
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");

  if (!q) return;
  if (selectedOptionIndex < 0) {
    showToast("no", TEXT.PICK_OPTION);
    return;
  }

  const selectedText = String(q.options[selectedOptionIndex] ?? "").trim();
  const fallbackOk = normalizeEnglish(selectedText) === normalizeEnglish(q.answerRaw);
  const ok = q.correctOptionIndex >= 0 ? (selectedOptionIndex === q.correctOptionIndex) : fallbackOk;

  const answerShown = q.correctOptionIndex >= 0
    ? String(q.options[q.correctOptionIndex] ?? q.answerRaw)
    : q.answerRaw;

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

  document.querySelectorAll(".opt-token").forEach((el) => {
    el.style.pointerEvents = "none";
  });

  results.push({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    question: buildQuestionPlainText(q),
    selected: selectedText,
    answer: answerShown,
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

function goNext() {
  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function buildQuestionPlainText(q) {
  const en = `${q.pre} (${(q.options || []).join(" / ")}) ${q.post}`.replace(/\s+/g, " ").trim();
  const ko = q.koreanHint ? ` (${stripEmphasisMarkers(q.koreanHint)})` : "";
  return en + ko;
}

function renderKoreanHint(raw) {
  const s = normalizeEscapedBreaks(String(raw || ""));
  return escapeHtml(s).replace(/\*\*(.*?)\*\*/g, (_, m) => `<span class="ko-focus">${escapeHtml(m)}</span>`);
}

function stripEmphasisMarkers(s) {
  return String(s || "").replace(/\*\*(.*?)\*\*/g, "$1");
}

function normalizeEscapedBreaks(value) {
  return String(value ?? "")
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\\r", "\n")
    .replace(/\n+/g, "\n")
    .trim();
}

function normalizeEnglish(value) {
  return String(value ?? "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!~]+$/g, "")
    .toLowerCase();
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
    const answerShown = q.correctOptionIndex >= 0
      ? String(q.options[q.correctOptionIndex] ?? q.answerRaw)
      : q.answerRaw;

    return `
      <div class="result-item">
        <div><b>Q${idx + 1}</b> ${escapeHtml(buildQuestionPlainText(q))}</div>
        <div style="margin-top:4px;"><span class="${stateClass}">${state}</span></div>
        <div>${TEXT.MY_ANSWER}: ${escapeHtml(user)}</div>
        <div>${TEXT.ANSWER}: ${escapeHtml(answerShown)}</div>
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


