// aisth-l5e1.js
// Independent runtime for Aisth Lesson 5 Exercise 1
// Inline circle-select inside the main question box

const EXCEL_FILE = "LTRYI-grammar-lesson-questions.xlsx";
const TARGET_LESSON = 6;
const TARGET_EXERCISE = 5;
const PAGE_LABEL = "Aisth L6-E5";
const MAX_QUESTIONS = 0; // 0 = unlimited

const DEFAULT_INSTRUCTION = "문맥상 자연스러운 쪽을 동그라미!";

const TEXT = {
  START: "🚀 시작",
  INTRO_1: "선택지를 탭해서 정답을 고르세요.",
  INTRO_2: "선택하면 번호에 동그라미가 생기고 선택지 전체가 강조됩니다.",
  PIN: "📌",
  NO_QUESTIONS: "해당 Lesson/Exercise의 문제가 없습니다.",
  PICK_OPTION: "선택지를 먼저 고르세요.",
  CORRECT: "정답!",
  WRONG: "오답",
  QTYPE: "동그라미형",
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
let day = "024";
let quizTitle = "quiz_Grammar_aisth_l6e5";
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

    .prompt {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 12px;
      margin-top: 8px;
      line-height: 1.65;
      font-size: 14px;
      color: #3c2d22;
      word-break: keep-all;
      white-space: pre-wrap;
    }

    .choice-list {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .choice-item {
      display: flex;
      align-items: flex-start;
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
      flex-shrink: 0;
      line-height: 1;
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
      flex: 1;
      color: #3c2d22;
      font-size: 15px;
      line-height: 1.55;
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
    const title = normalizeEscapedBreaks(String(row["Title"] ?? "").trim());

    const parsed = parseChoiceQuestion(questionRaw);
    const correctOptionIndex = resolveCorrectOptionIndex(answerRaw, parsed.options);

    return {
      no: idx + 1,
      qNumber: Number(row["QNumber"]) || idx + 1,
      title,
      instruction: instructionRaw || DEFAULT_INSTRUCTION,
      answerRaw,
      prompt: parsed.prompt,
      options: parsed.options,
      correctOptionIndex,
      questionRaw,
    };
  });
}

function parseChoiceQuestion(raw) {
  const text = normalizeEscapedBreaks(String(raw || "")).trim();
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);

  const promptLines = [...lines];
  let options = [];

  const pairRe = /\(([^()]*\/[^()]*)\)/;
  const hitLineIndex = lines.findIndex((line) => pairRe.test(line));
  if (hitLineIndex >= 0) {
    const m = lines[hitLineIndex].match(pairRe);
    const inside = String(m?.[1] || "");
    const parts = inside.split("/").map((s) => s.trim()).filter(Boolean);
    options = parts.map((textPart, i) => ({
      label: String.fromCharCode(65 + i),
      text: textPart,
    }));
    promptLines[hitLineIndex] = lines[hitLineIndex].replace(pairRe, "___");
  }

  if (!options.length) {
    const recovered = [];
    for (const line of lines) {
      const m = line.match(/^([A-Z])\.\s*(.+)$/);
      if (m) recovered.push({ label: m[1].toUpperCase(), text: String(m[2] || "").trim() });
    }
    options = recovered;
  }

  return {
    prompt: promptLines.join("\n").trim(),
    options,
  };
}

function resolveCorrectOptionIndex(answerRaw, options) {
  const ans = String(answerRaw || "").trim();
  const letter = ans.match(/^([A-Z])\.?$/i)?.[1]?.toUpperCase();
  if (letter) {
    const idx = (options || []).findIndex((o) => o.label === letter);
    if (idx >= 0) return idx;
  }

  const normAns = normalizeLoose(ans);
  return (options || []).findIndex((o) => normalizeLoose(o.text) === normAns || normalizeLoose(`${o.label}. ${o.text}`) === normAns);
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

  const promptHtml = q.prompt
    ? `<div class="prompt">${renderTextWithEmphasis(q.prompt)}</div>`
    : "";

  const optionsHtml = q.options
    .map((opt, idx) => `
      <div class="choice-item" data-opt-index="${idx}" role="button" tabindex="0">
        <span class="choice-label">${escapeHtml(opt.label)}</span>
        <span class="choice-text">${renderTextWithEmphasis(opt.text)}</span>
      </div>
    `)
    .join("");

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="margin-bottom:8px;"><span class="pill">${escapeHtml(TEXT.QTYPE)}</span></div>
      <div style="font-size:13px; color:#7e3106; font-weight:900;">${escapeHtml(q.instruction || DEFAULT_INSTRUCTION)}</div>
      ${promptHtml}
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

  const selectedOpt = q.options[selectedOptionIndex];
  const fallbackOk = normalizeLoose(selectedOpt.label) === normalizeLoose(q.answerRaw)
    || normalizeLoose(selectedOpt.text) === normalizeLoose(q.answerRaw)
    || normalizeLoose(`${selectedOpt.label}. ${selectedOpt.text}`) === normalizeLoose(q.answerRaw);
  const ok = q.correctOptionIndex >= 0 ? selectedOptionIndex === q.correctOptionIndex : fallbackOk;

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

  const correctOpt = q.correctOptionIndex >= 0 ? q.options[q.correctOptionIndex] : null;

  results.push({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    question: buildQuestionPlainText(q),
    selected: `${selectedOpt.label}. ${selectedOpt.text}`,
    answer: correctOpt ? `${correctOpt.label}. ${correctOpt.text}` : q.answerRaw,
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
  const lines = [];
  if (q.prompt) lines.push(q.prompt);
  (q.options || []).forEach((opt) => {
    lines.push(`${opt.label}. ${opt.text}`);
  });
  return lines.join("\n");
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
    const correctOpt = q.correctOptionIndex >= 0 ? q.options[q.correctOptionIndex] : null;
    const answerShown = correctOpt ? `${correctOpt.label}. ${correctOpt.text}` : q.answerRaw;

    return `
      <div class="result-item">
        <div><b>Q${idx + 1}</b> ${escapeHtml(buildQuestionPlainText(q)).replaceAll("\n", "<br/>")}</div>
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

function normalizeEscapedBreaks(value) {
  return String(value ?? "")
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\\r", "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function normalizeLoose(value) {
  return String(value ?? "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!~]+$/g, "")
    .toLowerCase()
    .replace(/[\s'"`.,!?~:;()\/\[\]{}_-]+/g, "");
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
