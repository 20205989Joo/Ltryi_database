// aisth-l3e2.js
// Independent runtime for Aisth Lesson 3 Exercise 2

const EXCEL_FILE = "LTRYI-grammar-lesson-questions.xlsx";
const TARGET_LESSON = 3;
const TARGET_EXERCISE = 2;
const PAGE_LABEL = "Aisth L3-E2";
const MAX_QUESTIONS = 0; // 0 = unlimited

const FIXED_INSTRUCTION = "메인동사를 앞으로 끌어놓고 의문문을 완성해보세요.";

const TEXT = {
  START: "🚀 시작",
  INTRO_1: "Herma 스타일 규칙을 따르는 독립형 Aisth 퀴즈입니다.",
  INTRO_2: "제출하면 채점되고, 다음 문제로 이동할 수 있습니다.",
  PIN: "📌",
  NO_QUESTIONS: "해당 Lesson/Exercise의 문제가 없습니다.",
  INPUT_REQUIRED: "입력 후 제출하세요.",
  PICK_VERB_FIRST: "먼저 메인동사를 드래그하세요.",
  CORRECT: "정답!",
  WRONG: "오답",
  QTYPE: "의문문 변환",
  DRAG_HINT: "메인동사를 누르거나 끌어 앞칸으로 옮기세요.",
  NO_DRAG_ROW: "이 문항은 드래그 단계 없이 바로 입력하세요.",
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
let day = "009";
let quizTitle = "quiz_Grammar_aisth_l3e2";
let userId = "";

let rawRows = [];
let questions = [];
let currentIndex = 0;
let results = [];
let isCurrentLocked = false;
let rewritePlaceholderExample = "";
let dragPlaced = false;
let dragLead = "";

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

    .blank-slot {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 7px;
      border: 1px dashed #d5a22a;
      background: #fff8e4;
      color: #7e3106;
      font-weight: 900;
      margin: 0 2px;
    }

    .focus-token {
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      color: #7e3106;
      font-weight: 900;
    }

    .drag-line {
      display: block;
      line-height: 1.75;
      word-break: keep-all;
      white-space: normal;
    }

    .front-slot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: baseline;
      margin-right: 5px;
      min-width: 30px;
      height: 1.15em;
      padding: 0 4px;
      border-radius: 4px;
      transition: background 0.12s ease, border-color 0.12s ease;
    }

    .front-slot.empty {
      color: transparent;
      border: 1px dashed rgba(126, 49, 6, 0.09);
      background: transparent;
    }

    .front-slot.hover {
      border-color: rgba(241, 123, 42, 0.35);
      background: rgba(241, 123, 42, 0.06);
    }

    .front-slot.ready {
      border: none;
      background: transparent;
    }

    .drag-token {
      display: inline-block;
      padding: 0 3px;
      border-radius: 4px;
      border: none;
      background: rgba(255, 208, 90, 0.45);
      color: #7e3106;
      font-weight: 900;
      cursor: grab;
      user-select: none;
    }

    .drag-token:active { cursor: grabbing; }
    .drag-token.dragging {
      animation: slime-pull 0.32s ease-out;
      transform-origin: 50% 58%;
      filter: saturate(1.06);
    }

    .drag-token.used-dim {
      opacity: 0.38;
      pointer-events: none;
      cursor: default;
      background: rgba(255, 208, 90, 0.2);
    }

    .drag-token.used-hide {
      display: none;
    }

    .verb-wrap {
      position: relative;
      display: inline-block;
    }

    .aux-pop-token {
      position: absolute;
      left: -0.95em;
      top: -1.15em;
      display: inline-block;
      padding: 0 3px;
      border-radius: 4px;
      border: none;
      background: rgba(255, 208, 90, 0.56);
      color: #7e3106;
      font-weight: 900;
      opacity: 0;
      pointer-events: none;
      transform: translate(0, 6px) scale(0.86);
      transition: opacity 0.18s ease, transform 0.2s ease;
      user-select: none;
    }

    .aux-pop-token.ready {
      opacity: 1;
      pointer-events: auto;
      cursor: grab;
      transform: translate(0, 0) scale(1);
    }

    .aux-pop-token.dragging {
      animation: slime-pull 0.3s ease-out;
      transform-origin: 60% 62%;
    }

    .aux-pop-token.burst {
      animation: aux-burst 0.2s ease-out;
    }

    .aux-pop-token.used {
      display: none;
    }

    .aux-pop-token.lifted {
      opacity: 0;
    }

    .verb-wrap.split-open .drag-token {
      background: rgba(255, 208, 90, 0.24);
      color: rgba(126, 49, 6, 0.72);
    }

    .verb-wrap.split-open .aux-pop-token.ready {
      background: rgba(255, 208, 90, 0.32);
      color: rgba(126, 49, 6, 0.76);
    }

    .ghost-chip {
      display: inline;
      padding: 0 2px;
      border-radius: 4px;
      border: none;
      color: #7e3106;
      font-size: 14px;
      font-weight: 900;
      background: rgba(255, 208, 90, 0.55);
    }

    textarea,
    .short-input {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 10px;
      font-size: 13px;
      box-sizing: border-box;
      outline: none;
      background: #fff;
    }

    textarea { resize: vertical; }

    .short-input {
      font-size: 18px;
      font-weight: 900;
      text-align: center;
      letter-spacing: 0.3px;
    }

    .answer-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      max-width: 360px;
      margin: 0 auto;
    }

    .answer-row .short-input {
      flex: 0 1 auto;
      width: 320px;
      max-width: calc(100% - 34px);
    }

    .answer-mark {
      flex: 0 0 auto;
      display: inline-block;
      min-width: 16px;
      text-align: center;
      font-size: 24px;
      font-weight: 900;
      color: #7e3106;
      line-height: 1;
      opacity: 1;
      visibility: visible;
      user-select: none;
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
      margin-top: 8px;
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

    @keyframes slime-pull {
      0% { transform: scale(1, 1); }
      38% { transform: scale(1.22, 0.8) skewX(-6deg); }
      72% { transform: scale(0.94, 1.1) skewX(3deg); }
      100% { transform: scale(1.04, 0.94); }
    }

    @keyframes aux-burst {
      0% { transform: translate(0.78em, 0.54em) scale(0.22, 0.88); opacity: 0.02; filter: blur(0.6px); }
      36% { transform: translate(0.2em, 0.16em) scale(1.22, 0.72); opacity: 1; filter: blur(0.2px); }
      68% { transform: translate(-0.03em, -0.04em) scale(0.93, 1.08); opacity: 1; filter: blur(0); }
      100% { transform: translate(0, 0) scale(1); opacity: 1; filter: blur(0); }
    }
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

  const firstRowAnswer = cleanAnswerForScoring(normalizeEscapedBreaks(String(filtered[0]?.["Answer"] ?? "").trim()));
  rewritePlaceholderExample = clipExample(firstRowAnswer || "Do you ...?");

  questions = filtered.map((row, idx) => {
    const question = normalizeEscapedBreaks(String(row["Question"] ?? "").trim());
    const answerRaw = stripEmphasisMarkers(normalizeEscapedBreaks(String(row["Answer"] ?? "").trim()));
    const answer = cleanAnswerForScoring(answerRaw);
    const title = stripEmphasisMarkers(normalizeEscapedBreaks(String(row["Title"] ?? "").trim()));
    const rawInstruction = normalizeEscapedBreaks(String(row["Instruction"] ?? "").trim());
    const qNumber = Number(row["QNumber"]) || idx + 1;
    const instruction = rawInstruction || FIXED_INSTRUCTION;

    return {
      no: idx + 1,
      qNumber,
      question,
      answer,
      instruction,
      title,
      dragMeta: buildDragMeta(question, answer),
    };
  });
}

const BE_VERBS = new Set(["am", "is", "are", "was", "were"]);
const KEEP_AUX = new Set(["can", "will", "should", "must", "may", "might", "could", "would", "shall"]);
const DO_AUX = new Set(["do", "does", "did"]);
const SUBJECT_WORDS = new Set(["i", "you", "he", "she", "it", "we", "they", "the", "a", "an", "this", "that", "these", "those"]);

function buildDragMeta(question, answer) {
  const lines = normalizeEscapedBreaks(String(question || ""))
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const lineIndex = lines.findIndex((x) => /[A-Za-z]/.test(x));
  if (lineIndex < 0) {
    return { canDrag: false, lines, lineIndex: -1, tokens: [], verbIndex: -1, ghostLead: "" };
  }

  const dragLine = lines[lineIndex];
  const tokens = dragLine.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return { canDrag: false, lines, lineIndex, tokens: [], verbIndex: -1, ghostLead: "" };
  }

  const answerWords = parseAnswerWords(answer);
  const verbIndex = detectMainVerbIndex(tokens, answerWords);
  if (verbIndex < 0) {
    return { canDrag: false, lines, lineIndex, tokens, verbIndex: -1, ghostLead: "" };
  }

  const draggedNorm = normalizeWordToken(tokens[verbIndex]);
  const leadMeta = computeGhostLead(draggedNorm, answerWords);
  return {
    canDrag: true,
    lines,
    lineIndex,
    tokens,
    verbIndex,
    ghostLead: leadMeta.ghostLead,
    keepSourceToken: leadMeta.keepSourceToken,
  };
}

function detectMainVerbIndex(tokens, answerWords) {
  const norms = tokens.map((t) => normalizeWordToken(t));
  for (let i = 0; i < norms.length; i++) {
    if (BE_VERBS.has(norms[i]) || KEEP_AUX.has(norms[i])) return i;
  }

  const lead = answerWords[0] || "";
  const subject = answerWords[1] || "";
  const baseVerb = answerWords[2] || "";
  if (DO_AUX.has(lead)) {
    return findLexicalVerbIndex(norms, baseVerb, subject);
  }

  return findLexicalVerbIndex(norms, baseVerb, subject);
}

function findLexicalVerbIndex(normTokens, baseVerb, subjectWord) {
  if (baseVerb) {
    const forms = buildVerbForms(baseVerb);
    for (let i = 0; i < normTokens.length; i++) {
      if (forms.has(normTokens[i])) return i;
    }
  }

  if (subjectWord) {
    const si = normTokens.indexOf(subjectWord);
    if (si >= 0) {
      for (let i = si + 1; i < normTokens.length; i++) {
        if (/^[a-z]+$/.test(normTokens[i])) return i;
      }
    }
  }

  for (let i = 1; i < normTokens.length; i++) {
    if (/^[a-z]+$/.test(normTokens[i]) && !SUBJECT_WORDS.has(normTokens[i])) return i;
  }
  return normTokens.length > 1 ? 1 : 0;
}

function buildVerbForms(baseVerb) {
  const b = String(baseVerb || "").toLowerCase().trim();
  const out = new Set([b]);
  if (!b) return out;

  if (b === "have") out.add("has");
  if (b === "go") out.add("goes");
  if (b === "do") out.add("does");

  out.add(b + "s");
  out.add(b + "es");
  if (b.endsWith("y") && b.length > 1) out.add(b.slice(0, -1) + "ies");
  return out;
}

function computeGhostLead(draggedNorm, answerWords) {
  if (BE_VERBS.has(draggedNorm) || KEEP_AUX.has(draggedNorm)) {
    return { ghostLead: capitalizeWord(draggedNorm), keepSourceToken: false };
  }

  const lead = String(answerWords?.[0] || "").toLowerCase().trim();
  const aux = DO_AUX.has(lead) ? lead : "do";
  return { ghostLead: capitalizeWord(aux), keepSourceToken: true };
}

function parseAnswerWords(answer) {
  return cleanAnswerForScoring(answer)
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .match(/[a-z']+/g) || [];
}

function normalizeWordToken(token) {
  return String(token || "")
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

function capitalizeWord(word) {
  const s = String(word || "").trim();
  if (!s) return "";
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

function cleanAnswerForScoring(raw) {
  let s = stripEmphasisMarkers(normalizeEscapedBreaks(String(raw ?? ""))).trim();
  const outer = s.match(/^\((.*)\)$/);
  if (outer) s = String(outer[1] || "").trim();
  const tailNote = s.match(/^(.+?)\s*\([^)]*\)\s*$/);
  if (tailNote && tailNote[1].trim()) s = tailNote[1].trim();
  return s;
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = questions[0]?.title || PAGE_LABEL;
  const firstInst = stripEmphasisMarkers(questions[0]?.instruction || FIXED_INSTRUCTION);

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
  dragPlaced = !q.dragMeta?.canDrag;
  dragLead = "";
  const dragEnabled = !!q.dragMeta?.canDrag;
  const placeholderRaw = dragEnabled
    ? (rewritePlaceholderExample || "you tired?")
    : (rewritePlaceholderExample || "Do you ...?");
  const placeholder = stripTrailingQuestionMark(placeholderRaw);

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="margin-bottom:8px;">
        <span class="pill">${escapeHtml(TEXT.QTYPE)}</span>
      </div>
      <div style="font-size:13px; color:#7e3106; font-weight:900;">${renderTextWithEmphasis(FIXED_INSTRUCTION)}</div>
      <div class="sentence">${renderDragSentenceHtml(q)}</div>
    </div>

    <div class="box" style="background:#fff; display:${dragEnabled ? "none" : "block"};" id="compose-box">
      <div class="answer-row">
        <input id="user-answer" class="short-input" type="text" autocomplete="off" placeholder="${escapeHtmlAttr(placeholder)}" />
        <span class="answer-mark" aria-hidden="true">?</span>
      </div>
      <div id="feedback" class="feedback"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" type="button">제출</button>
      <button class="quiz-btn" id="next-btn" type="button" disabled>다음</button>
    </div>
  `;

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const input = document.getElementById("user-answer");

  if (submitBtn) submitBtn.addEventListener("click", submitCurrentAnswer);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
  wireDragUI(q);

  if (input) {
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitCurrentAnswer();
      }
    });
    if (!dragEnabled) input.focus();
  }
}

function renderDragSentenceHtml(q) {
  const meta = q.dragMeta;
  if (!meta?.canDrag) {
    return renderTextWithEmphasis(q.question);
  }

  return meta.lines.map((line, idx) => {
    if (idx !== meta.lineIndex) return renderTextWithEmphasis(line);
    return renderDraggableLine(meta);
  }).join("<br/>");
}

function renderDraggableLine(meta) {
  return `<div class="drag-line"><span class="front-slot empty" id="lead-inline-slot" title="${escapeHtmlAttr(TEXT.DRAG_HINT)}">&nbsp;</span>${meta.tokens.map((token, idx) => {
    if (idx === meta.verbIndex) {
      if (meta.keepSourceToken) {
        return `<span class="verb-wrap"><span class="aux-pop-token" id="spawn-aux-token" draggable="false">${escapeHtml(meta.ghostLead)}</span><span class="drag-token" id="drag-verb-token" draggable="false">${escapeHtml(token)}</span></span>`;
      }
      return `<span class="drag-token" id="drag-verb-token" draggable="true">${escapeHtml(token)}</span>`;
    }
    return `<span>${escapeHtml(token)}</span>`;
  }).join(" ")}</div>`;
}

function wireDragUI(q) {
  const meta = q.dragMeta;
  if (!meta?.canDrag) return;

  const token = document.getElementById("drag-verb-token");
  const auxToken = document.getElementById("spawn-aux-token");
  const dropSlot = document.getElementById("lead-inline-slot");
  if (!token || !dropSlot) return;
  let dragGhostNode = null;
  const dragToken = meta.keepSourceToken ? auxToken : token;

  if (meta.keepSourceToken && auxToken) {
    token.addEventListener("click", () => revealAuxToken(auxToken));
    token.addEventListener("dragstart", (ev) => ev.preventDefault());
  } else {
    token.addEventListener("click", () => completeVerbDrag(q));
  }

  if (!dragToken) return;

  dragToken.addEventListener("dragstart", (ev) => {
    if (isCurrentLocked || dragPlaced) {
      ev.preventDefault();
      return;
    }
    if (meta.keepSourceToken && auxToken && !auxToken.classList.contains("ready")) {
      ev.preventDefault();
      return;
    }

    dragToken.classList.remove("dragging");
    // Force reflow so repeated drags replay the pull animation.
    void dragToken.offsetWidth;
    dragToken.classList.add("dragging");
    if (meta.keepSourceToken && auxToken) {
      requestAnimationFrame(() => {
        if (!dragPlaced) auxToken.classList.add("lifted");
      });
    }

    const ghostText = String(q.dragMeta?.ghostLead || dragToken.textContent || "").trim();
    dragGhostNode = createDragGhostNode(ghostText || "Do");

    if (ev.dataTransfer) {
      ev.dataTransfer.setData("text/plain", "verb");
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setDragImage(dragGhostNode, 18, 12);
    }
  });
  dragToken.addEventListener("dragend", () => {
    dropSlot.classList.remove("hover");
    dragToken.classList.remove("dragging");
    if (auxToken) auxToken.classList.remove("lifted");
    if (dragGhostNode) {
      dragGhostNode.remove();
      dragGhostNode = null;
    }
  });

  dropSlot.addEventListener("dragover", (ev) => {
    if (isCurrentLocked || dragPlaced) return;
    ev.preventDefault();
    dropSlot.classList.add("hover");
  });
  dropSlot.addEventListener("dragleave", () => dropSlot.classList.remove("hover"));
  dropSlot.addEventListener("drop", (ev) => {
    if (isCurrentLocked || dragPlaced) return;
    ev.preventDefault();
    dropSlot.classList.remove("hover");
    if (dragGhostNode) {
      dragGhostNode.remove();
      dragGhostNode = null;
    }
    completeVerbDrag(q);
  });
}

function revealAuxToken(auxToken) {
  if (!auxToken) return;
  const wrap = auxToken.closest(".verb-wrap");
  auxToken.classList.remove("used");
  auxToken.classList.add("ready");
  auxToken.setAttribute("draggable", "true");
  if (wrap) wrap.classList.add("split-open");

  auxToken.classList.remove("burst");
  // Force reflow so repeated taps replay the burst animation.
  void auxToken.offsetWidth;
  auxToken.classList.add("burst");
}

function createDragGhostNode(text) {
  const node = document.createElement("span");
  node.textContent = text;
  node.style.position = "fixed";
  node.style.left = "-9999px";
  node.style.top = "-9999px";
  node.style.pointerEvents = "none";
  node.style.display = "inline-block";
  node.style.padding = "0 4px";
  node.style.borderRadius = "4px";
  node.style.fontWeight = "900";
  node.style.fontSize = "14px";
  node.style.color = "#7e3106";
  node.style.background = "rgba(255, 208, 90, 0.55)";
  node.style.boxShadow = "inset 0 0 0 1px rgba(160, 110, 0, 0.15)";
  document.body.appendChild(node);
  return node;
}

function completeVerbDrag(q) {
  if (isCurrentLocked || dragPlaced || !q.dragMeta?.canDrag) return;

  const token = document.getElementById("drag-verb-token");
  const auxToken = document.getElementById("spawn-aux-token");
  const wrap = token?.closest(".verb-wrap");
  const dropSlot = document.getElementById("lead-inline-slot");
  const composeBox = document.getElementById("compose-box");
  const input = document.getElementById("user-answer");
  if (!dropSlot || !composeBox) return;

  dragPlaced = true;
  dragLead = q.dragMeta.ghostLead;

  dropSlot.classList.add("ready");
  dropSlot.classList.remove("empty");
  dropSlot.innerHTML = `<span class="ghost-chip">${escapeHtml(dragLead)}</span>`;
  composeBox.style.display = "block";

  if (token) {
    if (wrap) wrap.classList.remove("split-open");
    token.classList.remove("dragging");
    token.classList.remove("used-dim", "used-hide");
    if (q.dragMeta?.keepSourceToken) token.classList.add("used-dim");
    else token.classList.add("used-hide");
  }
  if (auxToken) {
    auxToken.classList.remove("dragging", "burst", "ready");
    auxToken.classList.add("used");
    auxToken.setAttribute("draggable", "false");
  }
  if (input) input.focus();
}

function submitCurrentAnswer() {
  if (isCurrentLocked) return;

  const q = questions[currentIndex];
  const input = document.getElementById("user-answer");
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const feedback = document.getElementById("feedback");

  if (!q || !input) return;

  if (q.dragMeta?.canDrag && !dragPlaced) {
    showToast("no", TEXT.PICK_VERB_FIRST);
    return;
  }

  const userRaw = String(input.value || "").trim();
  if (!userRaw) {
    showToast("no", TEXT.INPUT_REQUIRED);
    return;
  }

  const userWithLead = q.dragMeta?.canDrag
    ? composeLeadAnswer(dragLead, userRaw)
    : userRaw;
  const ok = q.dragMeta?.canDrag
    ? isAnswerCorrect(userWithLead, q.answer) || isAnswerCorrect(userRaw, q.answer)
    : isAnswerCorrect(userRaw, q.answer);

  if (!ok) {
    if (feedback) {
      feedback.className = "feedback";
      feedback.innerHTML = "";
    }
    showToast("no", TEXT.WRONG);
    return;
  }

  isCurrentLocked = true;
  input.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;

  results.push({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    question: q.question,
    selected: userWithLead,
    answer: q.answer,
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

function composeLeadAnswer(lead, typed) {
  const head = String(lead || "").trim();
  const body = String(typed || "").trim();
  if (!head) return body;
  if (!body) return head;

  const headLoose = normalizeLoose(head);
  const first = body.split(/\s+/)[0] || "";
  if (normalizeLoose(first) === headLoose) return body;
  if (normalizeLoose(body).startsWith(headLoose)) return body;
  return `${head} ${body}`.replace(/\s+/g, " ").trim();
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
        parts.forEach((p) => { if (p.length <= 40) set.add(p); });
      }
    }
  }

  return [...set];
}

function normalizeForCompare(value) {
  let s = stripEmphasisMarkers(normalizeEscapedBreaks(String(value ?? "")))
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!~]+$/g, "")
    .trim();

  return s;
}

function normalizeLoose(value) {
  return normalizeForCompare(value)
    .toLowerCase()
    .replace(/[\s'"`.,!?~:;()\[\]{}_-]+/g, "");
}

function clipExample(s) {
  const oneLine = stripEmphasisMarkers(normalizeEscapedBreaks(String(s ?? ""))).replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  return oneLine.length > 36 ? oneLine.slice(0, 36) + "..." : oneLine;
}

function stripTrailingQuestionMark(s) {
  return String(s ?? "").replace(/[?？]+\s*$/g, "").trim();
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
        <div><b>Q${idx + 1}</b> ${renderTextWithEmphasis(q.question)}</div>
        <div style="margin-top:4px;"><span class="${stateClass}">${state}</span></div>
        <div>${TEXT.MY_ANSWER}: ${escapeHtml(user)}</div>
        <div>${TEXT.ANSWER}: ${formatMultilineText(q.answer)}</div>
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

function escapeHtmlAttr(str) {
  return escapeHtml(stripEmphasisMarkers(normalizeEscapedBreaks(str))).replaceAll("\n", " ");
}







