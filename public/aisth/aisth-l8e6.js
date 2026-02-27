// aisth-l8e6.js
// Pair-based prototype for Aisth Lesson 8 Exercise 6

const EXCEL_FILE = "LTRYI-grammar-lesson-questions.xlsx";
const TARGET_LESSON = 8;
const TARGET_EXERCISE = 6;
const PAGE_LABEL = "Aisth L8-E6";
const MAX_PAIRS = 0; // 0 = unlimited

const DEFAULT_INSTRUCTION = "문장 쌍을 읽고 화살표 질문에 맞는 문장을 고르세요.";

const TEXT = {
  START: "🚀 시작",
  INTRO_1: "홀수/짝수 문장을 한 묶음으로 사용하는 샘플 형식입니다.",
  INTRO_2: "화살표 질문에 대답할 수 있는 A/B 문장을 고르세요.",
  PIN: "📌",
  NO_QUESTIONS: "해당 Lesson/Exercise의 문제가 없습니다.",
  PICK_OPTION: "A 또는 B를 먼저 고르세요.",
  CORRECT: "정답!",
  WRONG: "오답",
  QTYPE: "페어 동그라미형",
  ASK_LINE: "질문에 대답할 수 있는 문장은?",
  OPTION_A: "A",
  OPTION_B: "B",
  SUBMIT: "제출",
  NEXT: "다음",
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
let day = "035";
let quizTitle = "quiz_Grammar_aisth_l8e6";
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

    .arrow-q {
      margin-top: 10px;
      background: #fff;
      border: 1px dashed #d9c0a7;
      border-radius: 10px;
      padding: 11px 12px;
      min-height: 48px;
      font-size: 14px;
      font-weight: 900;
      color: #7e3106;
      line-height: 1.5;
      word-break: keep-all;
    }

    .ask-line {
      margin-top: 10px;
      font-size: 13px;
      font-weight: 900;
      color: #7e3106;
    }

    .choice-list {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .choice-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 10px 12px;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }

    .choice-item:hover {
      border-color: #f1b884;
    }

    .choice-item.selected {
      border-color: #f17b2a;
      background: #fff7ee;
      box-shadow: 0 0 0 1px rgba(241, 123, 42, 0.28), 0 0 12px rgba(241, 123, 42, 0.35);
    }

    .choice-label {
      position: relative;
      width: 24px;
      height: 24px;
      border: 1px solid #d9c0a7;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 900;
      color: #7e3106;
      line-height: 1;
      flex-shrink: 0;
      z-index: 0;
    }

    .choice-item.selected .choice-label::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 34px;
      height: 34px;
      transform: translate(-50%, -50%);
      border: 2px solid #7e3106;
      border-radius: 50%;
      pointer-events: none;
      box-sizing: border-box;
    }

    .choice-text {
      font-size: 15px;
      font-weight: 900;
      color: #3c2d22;
      line-height: 1.4;
      word-break: keep-all;
    }

    .focus-token {
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      color: #7e3106;
      font-weight: 900;
    }

    .form-focus {
      background: rgba(255, 208, 90, 0.35);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.15);
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

  const entries = filtered.map((row, idx) => {
    const qRaw = normalizeEscapedBreaks(String(row["Question"] ?? "").trim());
    const aRaw = normalizeEscapedBreaks(String(row["Answer"] ?? "").trim());
    const iRaw = normalizeEscapedBreaks(String(row["Instruction"] ?? "").trim());
    const title = normalizeEscapedBreaks(String(row["Title"] ?? "").trim());
    const parsed = splitSentenceAndArrow(qRaw);

    return {
      no: idx + 1,
      qNumber: Number(row["QNumber"]) || idx + 1,
      title,
      sentence: parsed.sentence,
      arrowQuestion: parsed.arrowQuestion,
      answerRaw: aRaw,
      instruction: iRaw,
    };
  });

  const pairs = [];
  for (let i = 0; i + 1 < entries.length; i += 2) {
    const left = entries[i];
    const right = entries[i + 1];
    const leftHasQ = !!left.arrowQuestion;
    const rightHasQ = !!right.arrowQuestion;
    const targetIndex = leftHasQ ? 0 : (rightHasQ ? 1 : 0);
    const target = targetIndex === 0 ? left : right;
    const fallback = targetIndex === 0 ? right : left;

    const arrowQuestion = target.arrowQuestion || fallback.arrowQuestion || "";
    const instruction = cleanInstruction(target.instruction || fallback.instruction || DEFAULT_INSTRUCTION);

    pairs.push({
      pairNo: pairs.length + 1,
      title: left.title || right.title || PAGE_LABEL,
      instruction,
      left,
      right,
      arrowQuestion,
      correctOptionIndex: targetIndex,
      options: [
        { label: TEXT.OPTION_A, text: left.sentence },
        { label: TEXT.OPTION_B, text: right.sentence },
      ],
    });
  }

  if (MAX_PAIRS > 0) questions = pairs.slice(0, MAX_PAIRS);
  else questions = pairs;
}

function cleanInstruction(value) {
  const text = String(value || "").trim();
  if (!text) return DEFAULT_INSTRUCTION;
  if (/^[A-Za-z ]{2,}$/.test(text)) return DEFAULT_INSTRUCTION;
  return text;
}

function splitSentenceAndArrow(raw) {
  const text = normalizeEscapedBreaks(String(raw ?? "")).trim();
  const m = text.match(/^(.*?)(?:\s*(?:→|->)\s*)(.+)$/);
  if (!m) return { sentence: text, arrowQuestion: "" };
  return {
    sentence: String(m[1] || "").trim(),
    arrowQuestion: String(m[2] || "").trim(),
  };
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = questions[0]?.title || PAGE_LABEL;
  const firstInst = DEFAULT_INSTRUCTION;

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">🧩 ${escapeHtml(PAGE_LABEL)}</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">총 ${total}쌍</span>
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

  const optionsHtml = q.options
    .map((opt, idx) => `
      <div class="choice-item" data-opt-index="${idx}" role="button" tabindex="0">
        <span class="choice-label">${escapeHtml(opt.label)}</span>
        <span class="choice-text">${renderSentenceOption(opt.text)}</span>
      </div>
    `)
    .join("");

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="margin-bottom:8px;"><span class="pill">${escapeHtml(TEXT.QTYPE)}</span></div>
      <div class="arrow-q">${escapeHtml(q.arrowQuestion || "...")}</div>
      <div class="ask-line">${escapeHtml(TEXT.ASK_LINE)}</div>

      <div class="choice-list">${optionsHtml}</div>
      <div id="feedback" class="feedback"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" type="button">${escapeHtml(TEXT.SUBMIT)}</button>
      <button class="quiz-btn" id="next-btn" type="button" disabled>${escapeHtml(TEXT.NEXT)}</button>
    </div>
  `;

  wireChoiceEvents();

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  if (submitBtn) submitBtn.addEventListener("click", submitCurrentAnswer);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
}

function wireChoiceEvents() {
  document.querySelectorAll(".choice-item").forEach((el) => {
    const activate = () => {
      if (isCurrentLocked) return;
      const idx = Number(el.dataset.optIndex ?? -1);
      if (!Number.isInteger(idx) || idx < 0) return;
      selectedOptionIndex = idx;
      refreshChoiceSelection();
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

function refreshChoiceSelection() {
  document.querySelectorAll(".choice-item").forEach((el) => {
    const idx = Number(el.dataset.optIndex ?? -1);
    el.classList.toggle("selected", idx === selectedOptionIndex);
  });
}

function submitCurrentAnswer() {
  if (isCurrentLocked) return;

  const q = questions[currentIndex];
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const feedback = document.getElementById("feedback");

  if (!q) return;

  if (selectedOptionIndex < 0 || selectedOptionIndex >= q.options.length) {
    showToast("no", TEXT.PICK_OPTION);
    return;
  }

  const ok = selectedOptionIndex === q.correctOptionIndex;
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

  document.querySelectorAll(".choice-item").forEach((el) => {
    el.style.pointerEvents = "none";
  });

  const selectedOpt = q.options[selectedOptionIndex];
  const correctOpt = q.options[q.correctOptionIndex];

  results.push({
    no: currentIndex + 1,
    qNumber: `${q.left.qNumber}-${q.right.qNumber}`,
    question: buildQuestionPlainText(q),
    selected: `${selectedOpt.label}. ${selectedOpt.text}`,
    answer: `${correctOpt.label}. ${correctOpt.text}`,
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

function buildQuestionPlainText(q) {
  return [
    `→ ${q.arrowQuestion}`,
    TEXT.ASK_LINE,
    `A. ${q.options[0]?.text || ""}`,
    `B. ${q.options[1]?.text || ""}`,
  ].join("\n");
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
    const row = results.find((r) => r.no === idx + 1);
    const user = row?.selected ?? TEXT.UNANSWERED;
    const state = row?.correct ? TEXT.CORRECT : TEXT.WRONG;
    const stateClass = row?.correct ? "result-ok" : "result-bad";
    const correctOpt = q.options[q.correctOptionIndex];

    return `
      <div class="result-item">
        <div><b>Q${idx + 1}</b> ${escapeHtml(buildQuestionPlainText(q)).replaceAll("\n", "<br/>")}</div>
        <div style="margin-top:4px;"><span class="${stateClass}">${state}</span></div>
        <div>${TEXT.MY_ANSWER}: ${escapeHtml(user)}</div>
        <div>${TEXT.ANSWER}: ${escapeHtml(`${correctOpt.label}. ${correctOpt.text}`)}</div>
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

function renderSentenceOption(value) {
  const base = renderTextWithEmphasis(value);
  return base
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith("<")) return part;
      return part.replace(/\bto\s+[A-Za-z][A-Za-z'-]*\b|\b[A-Za-z][A-Za-z'-]*ing\b/gi, (m) => {
        return `<span class="form-focus">${m}</span>`;
      });
    })
    .join("");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
