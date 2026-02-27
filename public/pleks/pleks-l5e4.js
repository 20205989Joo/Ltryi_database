const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const TARGET_LESSON = 5;
const TARGET_EXERCISE = 4;

let subcategory = "Grammar";
let level = "Basic";
let day = "317";
let quizTitle = "quiz_Grammar_Basic_317";
let userId = "";

let sequence = [];
let currentIndex = 0;
let results = [];
let currentState = null;

const MSG_OK = "\uC815\uB2F5!";
const MSG_NO = "\uC624\uB2F5";
const MSG_NOANSWER = "\uBB34\uC751\uB2F5";
const DEFAULT_INST = "\uAC15\uC870/\uB3C4\uCE58 \uAD6C\uC870\uB97C \uC77D\uACE0, \uC758\uBBF8\uAC00 \uAC00\uC7A5 \uBE44\uC2B7\uD55C \uC77C\uBC18 \uC5B4\uC21C \uBB38\uC7A5\uC744 \uACE0\uB974\uC138\uC694.";
const MSG_EMPTY = "L5-E4 \uBB38\uD56D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
const MSG_LOAD_FAIL = "\uD30C\uC77C \uBD88\uB7EC\uC624\uAE30 \uC2E4\uD328";
const MSG_START = "\uC2DC\uC791";
const MSG_NEXT = "\uB2E4\uC74C";

window.addEventListener("DOMContentLoaded", async () => {
  applyQueryParams();
  wireBackButton();

  if (window.PleksToastFX?.init) {
    window.PleksToastFX.init({ hostId: "cafe_int", top: 10 });
  }

  try {
    const rows = await loadExcelRows(EXCEL_FILE);
    sequence = buildSequence(rows);
  } catch (e) {
    console.error(e);
    renderEmpty(`${MSG_LOAD_FAIL}\n${EXCEL_FILE}`);
    return;
  }

  if (!sequence.length) {
    renderEmpty(MSG_EMPTY);
    return;
  }

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
  }
}

function wireBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;
  backBtn.addEventListener("click", () => history.back());
}

function renderEmpty(text) {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  area.innerHTML = `<div class="box">${escapeHtml(String(text || ""))}</div>`;
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  const count = sequence.length;
  area.innerHTML = `
    <div class="box">
      <div class="q-label">L5-E4</div>
      <div style="font-size:13px; line-height:1.55;">
        ${escapeHtml(DEFAULT_INST)}
      </div>
      <div style="margin-top:8px; font-weight:900; color:#7e3106;">
        ${count} Questions
      </div>
      <div class="btn-row">
        <button class="quiz-btn" type="button" id="start-btn">${escapeHtml(MSG_START)}</button>
      </div>
    </div>
  `;

  const startBtn = document.getElementById("start-btn");
  if (startBtn) startBtn.addEventListener("click", startQuiz);
}

function startQuiz() {
  currentIndex = 0;
  results = [];
  currentState = null;
  renderQuestion();
}

function toastOk(msg) {
  if (window.PleksToastFX?.show) window.PleksToastFX.show("ok", String(msg || ""));
}

function toastNo(msg) {
  if (window.PleksToastFX?.show) window.PleksToastFX.show("no", String(msg || ""));
}

async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

function compactWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function parseChoiceAnswer(raw) {
  const src = compactWhitespace(raw);
  const m = src.match(/\b([A-D])\s*[.)]/i) || src.match(/\b([A-D])\b/i);
  return m ? String(m[1] || "").toUpperCase() : "";
}

function parseEx4Question(raw) {
  const src = compactWhitespace(raw);
  const optionMatches = Array.from(src.matchAll(/\b([A-D])\.\s*/gi));
  if (!optionMatches.length) {
    return { stem: src, options: [] };
  }

  const stem = compactWhitespace(src.slice(0, optionMatches[0].index));
  const options = [];

  optionMatches.forEach((m, i) => {
    const key = String(m[1] || "").toUpperCase();
    const textStart = m.index + m[0].length;
    const textEnd = i + 1 < optionMatches.length ? optionMatches[i + 1].index : src.length;
    const text = compactWhitespace(src.slice(textStart, textEnd));
    if (!key || !text) return;
    options.push({ key, text });
  });

  return { stem, options };
}

function normalizeInstruction(raw, fallback) {
  const inst = compactWhitespace(raw);
  if (!inst || inst === "\uC704\uC640 \uAC19\uC74C") return fallback || DEFAULT_INST;
  return inst;
}

function buildSequence(rows) {
  const filtered = rows
    .filter((r) => Number(r.Lesson) === TARGET_LESSON && Number(r.Exercise) === TARGET_EXERCISE)
    .sort((a, b) => Number(a.QNumber || 0) - Number(b.QNumber || 0));

  const out = [];
  let prevInstruction = "";

  filtered.forEach((r, idx) => {
    const qNumber = Number(r.QNumber || idx + 1);
    const questionRaw = String(r.Question || "");
    const answerRaw = String(r.Answer || "");
    const parsedQuestion = parseEx4Question(questionRaw);
    const answerKey = parseChoiceAnswer(answerRaw);

    if (!parsedQuestion.options.length || !answerKey) return;

    const instruction = normalizeInstruction(r.Instruction, prevInstruction);
    prevInstruction = instruction;

    out.push({
      id: `L5_E4_Q${qNumber}_${idx + 1}`,
      lesson: TARGET_LESSON,
      exercise: TARGET_EXERCISE,
      qNumber,
      instruction,
      questionRaw,
      answerRaw,
      stem: parsedQuestion.stem,
      options: parsedQuestion.options,
      answerKey,
    });
  });

  return out;
}

function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = sequence[currentIndex];
  if (!q) {
    showResultPopup();
    return;
  }

  currentState = {
    selectedChoice: "",
    correct: false,
  };

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${sequence.length}</div>

    <div class="box">
      <div style="font-weight:900; color:#7e3106; font-size:13px;">
        ${escapeHtml(q.instruction || DEFAULT_INST)}
      </div>
    </div>

    <div class="box">
      <div class="sentence">${escapeHtml(q.stem)}</div>
      <div class="choice-list" id="choice-list">
        ${q.options
          .map(
            (opt) => `
              <button class="choice-btn" type="button" data-choice="${escapeHtml(opt.key)}">
                <b>${escapeHtml(opt.key)}.</b> ${escapeHtml(opt.text)}
              </button>
            `
          )
          .join("")}
      </div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="next-btn" onclick="goNext()" disabled>${escapeHtml(MSG_NEXT)}</button>
    </div>
  `;

  const list = document.getElementById("choice-list");
  if (!list) return;

  list.addEventListener("click", (ev) => {
    if (currentState.correct) return;
    const btn = ev.target?.closest?.(".choice-btn[data-choice]");
    if (!btn) return;

    const picked = String(btn.getAttribute("data-choice") || "").toUpperCase();
    if (!picked) return;

    currentState.selectedChoice = picked;
    list.querySelectorAll(".choice-btn").forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");

    if (picked !== String(q.answerKey || "").toUpperCase()) {
      toastNo(MSG_NO);
      return;
    }

    currentState.correct = true;
    upsertResult({
      id: q.id,
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
      selected: picked,
      correct: true,
      question: q.questionRaw,
      answer: q.answerRaw,
    });

    list.querySelectorAll(".choice-btn").forEach((el) => {
      el.disabled = true;
    });
    const nextBtn = document.getElementById("next-btn");
    if (nextBtn) nextBtn.disabled = false;

    toastOk(MSG_OK);
  });
}

function upsertResult(item) {
  const idx = results.findIndex((x) => x.id === item.id);
  if (idx >= 0) results[idx] = item;
  else results.push(item);
}

function goNext() {
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn && nextBtn.disabled) return;

  currentIndex += 1;
  if (currentIndex >= sequence.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function showResultPopup() {
  const ordered = sequence.map((q, i) => {
    const found = results.find((r) => r.id === q.id);
    return (
      found || {
        id: q.id,
        no: i + 1,
        qNumber: q.qNumber,
        word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
        selected: MSG_NOANSWER,
        correct: false,
        question: q.questionRaw,
        answer: q.answerRaw,
      }
    );
  });

  if (window.DishQuizResultsTable?.show) {
    window.DishQuizResultsTable.show({
      results: ordered,
      quizTitle,
      subcategory,
      level,
      day,
      passScore: 80,
    });
    return;
  }

  const score = ordered.filter((x) => x.correct).length;
  alert(`\uC644\uB8CC! (${score}/${ordered.length})`);
}
