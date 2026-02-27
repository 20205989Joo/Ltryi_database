// aisth-l8e4.js
// Independent runtime for Aisth Lesson 8 Exercise 4
// Word-tap highlight mode (sentence-style, no detached token pills)

const EXCEL_FILE = "LTRYI-grammar-lesson-questions.xlsx";
const TARGET_LESSON = 8;
const TARGET_EXERCISE = 4;
const PAGE_LABEL = "Aisth L8-E4";
const MAX_QUESTIONS = 0; // 0 = unlimited

const DEFAULT_INSTRUCTION = "간접의문문을 탭해보세요.";

const TEXT = {
  START: "🚀 시작",
  SUBMIT: "제출",
  TRANSLATE_TITLE: "번역해봅시다!",
  INTRO_1: "문장 안 단어를 클릭해 간접의문문 구간을 고르세요.",
  INTRO_2: "단어 선택 후 제출하면 채점됩니다.",
  PIN: "📌",
  NO_QUESTIONS: "해당 Lesson/Exercise의 문제가 없습니다.",
  INPUT_REQUIRED: "단어를 하나 이상 선택하세요.",
  TYPE_REQUIRED: "탭한 문구를 입력해보세요.",
  TYPE_HINT: "탭한 구간을 그대로 입력하세요.",
  CORRECT: "정답!",
  WRONG: "오답",
  QTYPE_TAP: "Tap",
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
let day = "033";
let quizTitle = "quiz_Grammar_aisth_l8e4";
let userId = "";

let rawRows = [];
let questions = [];
let currentIndex = 0;
let results = [];
let isCurrentLocked = false;
let selectedTokenIndexes = new Set();
let selectedPhrase = "";
let typingMode = false;

const INDIRECT_RE = /\b(what|where|when|why|how|who|which|whose|whom|if|whether)\b/i;
const LATIN_RE = /[A-Za-z]/;
const KOREAN_RE = /[가-힣]/;
const ROLE_TAG_RE = /\[(Q|S|V)\]([\s\S]*?)\[\/\1\]/gi;

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

    .quiz-btn.hidden {
      display: none;
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
      line-height: 1.75;
      font-size: 15px;
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

    .tap-token {
      cursor: pointer;
      user-select: none;
      padding: 0 1px;
      border-radius: 6px;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }

    .tap-token:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .tap-token.selected {
      box-shadow: inset 0 0 0 1px rgba(126, 49, 6, 0.2);
    }

    .tap-token.role-hl-q {
      background: rgba(242, 156, 191, 0.28);
      box-shadow: inset 0 0 0 2px rgba(203, 102, 150, 0.3);
    }

    .tap-token.role-hl-s {
      background: rgba(92, 187, 120, 0.24);
      box-shadow: inset 0 0 0 2px rgba(60, 148, 88, 0.28);
    }

    .tap-token.role-hl-v {
      background: rgba(255, 214, 102, 0.35);
      box-shadow: inset 0 0 0 2px rgba(216, 166, 42, 0.3);
    }

    .tap-token.wrong-flash {
      background: rgba(200, 40, 40, 0.08);
      box-shadow: inset 0 0 0 1px rgba(200, 40, 40, 0.18);
    }

    .tap-guide {
      margin-top: 10px;
      font-size: 12px;
      font-weight: 900;
      color: rgba(126, 49, 6, 0.78);
      line-height: 1.5;
    }

    .type-box {
      margin-top: 10px;
      display: none;
    }

    .type-box.on {
      display: block;
    }

    .type-panel {
      padding: 10px;
      background: #fff;
      border: 1px dashed #d7c7b5;
      border-radius: 10px;
    }

    .type-title {
      font-size: 13px;
      font-weight: 900;
      color: #7e3106;
      margin-bottom: 8px;
    }

    .type-ko {
      font-size: 13px;
      font-weight: 900;
      color: #7e3106;
      line-height: 1.5;
      margin-bottom: 8px;
    }

    .ko-role-q {
      color: #c86b97;
      font-weight: 900;
    }

    .ko-role-s {
      color: #2f9d57;
      font-weight: 900;
    }

    .ko-role-v {
      color: #ba8400;
      font-weight: 900;
    }

    .type-input {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 10px;
      font-size: 16px;
      font-weight: 800;
      box-sizing: border-box;
      outline: none;
      background: #fff;
      letter-spacing: 0.2px;
    }

    .type-input::placeholder {
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
    const answerRaw = stripRoleTags(stripEmphasisMarkers(normalizeEscapedBreaks(String(row["Answer"] ?? "").trim())));
    const title = stripEmphasisMarkers(normalizeEscapedBreaks(String(row["Title"] ?? "").trim()));
    const rawInstruction = normalizeEscapedBreaks(String(row["Instruction"] ?? "").trim());
    const clauseRole = normalizeEscapedBreaks(String(row["ClauseRole"] ?? "").trim());

    const sentence = extractDisplaySentence(questionRaw, answerRaw);
    const answer = extractIndirectClause(answerRaw, sentence);
    const tokens = tokenizeSentence(sentence);
    const koreanHint = normalizeEscapedBreaks(String(row["KoreanHint"] ?? "").trim());

    return {
      no: idx + 1,
      qNumber: Number(row["QNumber"]) || idx + 1,
      title,
      instruction: rawInstruction || DEFAULT_INSTRUCTION,
      sentence,
      tokens,
      answer,
      koreanHint,
      clauseRole,
    };
  });
}

function extractDisplaySentence(questionRaw, answerRaw) {
  const q = normalizeEscapedBreaks(String(questionRaw ?? "").trim());
  const a = normalizeEscapedBreaks(String(answerRaw ?? "").trim());
  const joined = joinIndexedQuestion(q);

  if ((!LATIN_RE.test(joined) || KOREAN_RE.test(joined) && !LATIN_RE.test(joined)) && LATIN_RE.test(a)) {
    return a;
  }
  return joined || a;
}

function joinIndexedQuestion(questionText) {
  const s = String(questionText || "").trim();
  if (!s) return "";
  const lines = s.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return s;

  const segs = [];
  for (const line of lines) {
    const m = line.match(/^\[(\d+)\]\s*(.+)$/);
    if (!m) return s;
    segs.push(String(m[2] || "").trim());
  }
  return segs.join(" ").replace(/\s+/g, " ").trim();
}

function extractIndirectClause(answerRaw, sentence) {
  const a = normalizeEscapedBreaks(String(answerRaw ?? "").trim());
  const s = normalizeEscapedBreaks(String(sentence ?? "").trim());
  const clauseFromSentence = extractClauseFromSentence(s);

  if (!a) return clauseFromSentence || s;
  if (/^\d+$/.test(a)) return clauseFromSentence || s;

  const aLoose = normalizeLoose(a, "rewrite");
  const sLoose = normalizeLoose(s, "rewrite");

  if (aLoose && sLoose && aLoose === sLoose) return clauseFromSentence || a;
  if (INDIRECT_RE.test(a)) return a;

  if (clauseFromSentence) {
    const cLoose = normalizeLoose(clauseFromSentence, "rewrite");
    if (cLoose && aLoose && cLoose.includes(aLoose)) return a;
    return clauseFromSentence;
  }
  return a;
}

function extractClauseFromSentence(sentence) {
  const s = String(sentence || "").trim();
  if (!s) return "";
  const m = s.match(INDIRECT_RE);
  if (!m || typeof m.index !== "number") return "";
  return s.slice(m.index).trim();
}

function tokenizeSentence(sentence) {
  return String(sentence || "")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((text, index) => ({ index, text }));
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = questions[0]?.title || PAGE_LABEL;
  const firstInst = stripEmphasisMarkers(questions[0]?.instruction || DEFAULT_INSTRUCTION);

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
  selectedTokenIndexes = new Set();
  selectedPhrase = "";
  typingMode = false;

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="margin-bottom:8px;"><span class="pill">${escapeHtml(TEXT.QTYPE_TAP)}</span></div>
      <div style="font-size:13px; color:#7e3106; font-weight:900;">${renderTextWithEmphasis(q.instruction || DEFAULT_INSTRUCTION)}</div>
      <div class="sentence" id="tap-sentence">${renderSentenceTokens(q.tokens)}</div>
      <div id="feedback" class="feedback"></div>
    </div>

    <div id="type-box" class="box type-box">
      <div class="type-title">${escapeHtml(TEXT.TRANSLATE_TITLE)}</div>
      <div class="type-panel">
        <div class="type-ko" id="type-ko"></div>
        <input id="type-input" class="type-input" type="text" autocomplete="off" placeholder="${escapeHtmlAttr(TEXT.TYPE_HINT)}" />
      </div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn hidden" id="submit-btn" type="button" disabled>${escapeHtml(TEXT.SUBMIT)}</button>
      <button class="quiz-btn" id="next-btn" type="button" disabled>다음</button>
    </div>
  `;

  wireSentenceTokenClicks();

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  if (submitBtn) submitBtn.addEventListener("click", () => handleTypingCheck(true));
  if (nextBtn) nextBtn.addEventListener("click", goNext);

  const typeInput = document.getElementById("type-input");
  if (typeInput) {
    typeInput.addEventListener("input", () => {
      const feedback = document.getElementById("feedback");
      if (feedback) {
        feedback.className = "feedback";
        feedback.innerHTML = "";
      }
    });
    typeInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        handleTypingCheck(true);
      }
    });
  }
}

function renderSentenceTokens(tokens) {
  const list = Array.isArray(tokens) ? tokens : [];
  return list
    .map((tok) => `<span class="tap-token" data-idx="${escapeHtmlAttr(tok.index)}">${escapeHtml(tok.text)}</span>`)
    .join(" ");
}

function wireSentenceTokenClicks() {
  document.querySelectorAll(".tap-token").forEach((el) => {
    const activate = () => {
      if (isCurrentLocked || typingMode) return;
      const idx = Number(el.dataset.idx ?? -1);
      if (!Number.isInteger(idx) || idx < 0) return;
      if (selectedTokenIndexes.has(idx)) selectedTokenIndexes.delete(idx);
      else selectedTokenIndexes.add(idx);
      refreshTokenSelection();
      maybeEnterTypingMode();
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

function refreshTokenSelection() {
  document.querySelectorAll(".tap-token").forEach((el) => {
    const idx = Number(el.dataset.idx ?? -1);
    el.classList.toggle("selected", selectedTokenIndexes.has(idx));
  });

  const q = questions[currentIndex];
  if (!q || !selectedTokenIndexes.size) {
    clearRoleTokenHighlights();
    return;
  }

  const sorted = [...selectedTokenIndexes].sort((a, b) => a - b);
  applyRoleTokenHighlights(sorted, q);
}

function maybeEnterTypingMode() {
  if (typingMode || isCurrentLocked) return;
  const q = questions[currentIndex];
  if (!q || !selectedTokenIndexes.size) return;

  const sorted = [...selectedTokenIndexes].sort((a, b) => a - b);
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
  const selectedText = sorted.map((i) => q.tokens[i]?.text || "").join(" ").trim();
  const ok = contiguous && isAnswerCorrect("rewrite", selectedText, q.answer);
  if (!ok) return;

  typingMode = true;
  selectedPhrase = selectedText;

  const typeBox = document.getElementById("type-box");
  const koEl = document.getElementById("type-ko");
  const input = document.getElementById("type-input");
  const submitBtn = document.getElementById("submit-btn");

  applyRoleTokenHighlights(sorted, q);
  if (typeBox) typeBox.classList.add("on");
  if (koEl) koEl.innerHTML = renderRoleTaggedText(q.koreanHint || "");
  if (input) {
    input.value = "";
    input.placeholder = selectedPhrase;
    input.focus();
  }
  if (submitBtn) {
    submitBtn.classList.remove("hidden");
    submitBtn.disabled = false;
  }
}

function handleTypingCheck(showWrongOnEnter) {
  if (!typingMode || isCurrentLocked) return;
  const q = questions[currentIndex];
  const input = document.getElementById("type-input");
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const feedback = document.getElementById("feedback");

  if (!q || !input) return;

  const typed = String(input.value || "").trim();
  if (!typed) {
    if (showWrongOnEnter) showToast("no", TEXT.TYPE_REQUIRED);
    return;
  }

  const ok = isAnswerCorrect("rewrite", typed, selectedPhrase);
  if (!ok) {
    if (showWrongOnEnter) {
      if (feedback) {
        feedback.className = "feedback";
        feedback.innerHTML = "";
      }
      showToast("no", TEXT.WRONG);
    }
    return;
  }

  isCurrentLocked = true;
  document.querySelectorAll(".tap-token").forEach((el) => {
    el.style.pointerEvents = "none";
  });
  input.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;

  results.push({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    question: q.sentence,
    selected: typed,
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

function flashWrongTokens(indexes) {
  const set = new Set(indexes || []);
  document.querySelectorAll(".tap-token").forEach((el) => {
    const idx = Number(el.dataset.idx ?? -1);
    if (!set.has(idx)) return;
    el.classList.add("wrong-flash");
    setTimeout(() => el.classList.remove("wrong-flash"), 150);
  });
}

function goNext() {
  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function isAnswerCorrect(type, userRaw, modelRaw) {
  const userStrict = normalizeForCompare(userRaw, type);
  const userLoose = normalizeLoose(userRaw, type);
  if (!userStrict && !userLoose) return false;

  const candidates = buildModelCandidates(modelRaw);
  for (const cand of candidates) {
    const candStrict = normalizeForCompare(cand, type);
    const candLoose = normalizeLoose(cand, type);
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

function normalizeForCompare(value, type) {
  let s = stripEmphasisMarkers(normalizeEscapedBreaks(String(value ?? "")))
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!~]+$/g, "")
    .trim();

  if (type === "blank") s = s.toLowerCase();
  return s;
}

function normalizeLoose(value, type) {
  return normalizeForCompare(value, type)
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

function stripRoleTags(value) {
  return String(value ?? "").replace(/\[(\/)?[QSV]\]/gi, "");
}

function parseRoleTaggedSegments(value) {
  const text = normalizeEscapedBreaks(String(value ?? ""));
  const segs = [];
  let m;
  ROLE_TAG_RE.lastIndex = 0;
  while ((m = ROLE_TAG_RE.exec(text)) !== null) {
    const role = String(m[1] || "").toLowerCase();
    const body = stripRoleTags(String(m[2] || "")).trim();
    if (!role || !body) continue;
    if (role !== "q" && role !== "s" && role !== "v") continue;
    segs.push({ role, text: body });
  }
  return segs;
}

function buildFallbackRoleSegments(text) {
  const parts = stripRoleTags(normalizeEscapedBreaks(String(text ?? "")))
    .replace(/[.?!~]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return [];
  if (parts.length === 1) return [{ role: "v", text: parts[0] }];
  if (parts.length === 2) return [{ role: "q", text: parts[0] }, { role: "v", text: parts[1] }];

  return [
    { role: "q", text: parts[0] },
    { role: "s", text: parts.slice(1, -1).join(" ") },
    { role: "v", text: parts[parts.length - 1] },
  ];
}

function tokenizeRoleText(text) {
  return stripRoleTags(normalizeEscapedBreaks(String(text ?? "")))
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function clearRoleTokenHighlights() {
  document.querySelectorAll(".tap-token").forEach((el) => {
    el.classList.remove("role-hl-q", "role-hl-s", "role-hl-v");
  });
}

function applyRoleTokenHighlights(sortedIndexes, q) {
  clearRoleTokenHighlights();
  const segments = parseRoleTaggedSegments(q?.clauseRole || "");
  const roleSegments = segments.length ? segments : buildFallbackRoleSegments(q?.answer || "");
  if (!roleSegments.length) return;

  const idxToEl = new Map();
  document.querySelectorAll(".tap-token").forEach((el) => {
    idxToEl.set(Number(el.dataset.idx ?? -1), el);
  });

  let cursor = 0;
  for (const seg of roleSegments) {
    const tks = tokenizeRoleText(seg.text);
    const take = tks.length || 0;
    if (!take) continue;

    for (let i = 0; i < take && cursor < sortedIndexes.length; i += 1) {
      const idx = sortedIndexes[cursor];
      const el = idxToEl.get(idx);
      if (el) el.classList.add(`role-hl-${seg.role}`);
      cursor += 1;
    }
  }

  if (cursor < sortedIndexes.length) {
    const fallbackRole = roleSegments[roleSegments.length - 1]?.role || "v";
    while (cursor < sortedIndexes.length) {
      const idx = sortedIndexes[cursor];
      const el = idxToEl.get(idx);
      if (el) el.classList.add(`role-hl-${fallbackRole}`);
      cursor += 1;
    }
  }
}

function renderRoleTaggedText(value) {
  const text = normalizeEscapedBreaks(String(value ?? ""));
  if (!ROLE_TAG_RE.test(text)) {
    ROLE_TAG_RE.lastIndex = 0;
    return escapeHtml(text).replaceAll("\n", "<br/>");
  }
  ROLE_TAG_RE.lastIndex = 0;

  let out = "";
  let last = 0;
  let m;
  while ((m = ROLE_TAG_RE.exec(text)) !== null) {
    out += escapeHtml(text.slice(last, m.index));
    const role = String(m[1] || "").toLowerCase();
    const cls = role === "q" ? "ko-role-q" : role === "s" ? "ko-role-s" : "ko-role-v";
    out += `<span class="${cls}">${escapeHtml(String(m[2] ?? "").trim())}</span>`;
    last = ROLE_TAG_RE.lastIndex;
  }
  out += escapeHtml(text.slice(last));
  return out.replaceAll("\n", "<br/>");
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
        <div><b>Q${idx + 1}</b> ${escapeHtml(q.sentence)}</div>
        <div style="margin-top:4px;"><span class="${stateClass}">${state}</span></div>
        <div>${TEXT.MY_ANSWER}: ${escapeHtml(user)}</div>
        <div>${TEXT.ANSWER}: ${escapeHtml(q.answer)}</div>
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
