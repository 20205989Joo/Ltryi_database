// pleks-l3e2.js
// L3-E2: Find the chunk

const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const DESC_FILE = "LTRYI-pleks-lesson-desc.xlsx";

const TARGET_LESSON = 3;
const TARGET_EXERCISE = 2;
const MAX_QUESTIONS = 0; // 0 = no limit

let subcategory = "Grammar";
let level = "Basic";
let day = "307";
let quizTitle = "quiz_Grammar_Basic_307";
let userId = "";

let rawRows = [];
let descRows = [];
let questions = [];
let currentIndex = 0;
let results = [];

let lessonTitle = "";
let exerciseTitle = "";

let selectedSet = new Set();
let isLocked = false;

window.addEventListener("DOMContentLoaded", async () => {
  if (window.PleksToastFX?.init) {
    window.PleksToastFX.init({ hostId: "cafe_int", top: 10 });
  }

  applyQueryParams();
  wireBackButton();

  try {
    const [qRows, dRows] = await Promise.all([
      loadExcelRows(EXCEL_FILE),
      loadExcelRows(DESC_FILE).catch(() => []),
    ]);
    rawRows = qRows;
    descRows = dRows;
  } catch (err) {
    console.error(err);
    alert("엑셀 파일을 불러오지 못했습니다.\n" + EXCEL_FILE);
    return;
  }

  buildLessonMeta();
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

async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status} (${filename})`);
  const buf = await res.arrayBuffer();

  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows.filter((row) => !isRowAllEmpty(row));
}

function isRowAllEmpty(row) {
  const keys = Object.keys(row || {});
  if (!keys.length) return true;
  return keys.every((k) => String(row[k] ?? "").trim() === "");
}

function buildLessonMeta() {
  const row = descRows.find(
    (r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE
  );
  lessonTitle = String(row?.["LessonTitle"] ?? "").trim();
  exerciseTitle = String(row?.["Title"] ?? "").trim();
}

function buildQuestionsFromRows() {
  let filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  if (MAX_QUESTIONS > 0) filtered = filtered.slice(0, MAX_QUESTIONS);

  questions = filtered.map((r, idx) => {
    const sentence = compactWhitespace(String(r["Question"] ?? "").trim());
    const parsedAnswer = parseChunkAnswer(String(r["Answer"] ?? "").trim());
    const sentenceTokens = splitSentenceTokens(sentence);
    const targetTokens = splitSentenceTokens(parsedAnswer.surfaceChunk);

    return {
      no: idx + 1,
      qNumber: Number(r["QNumber"]) || idx + 1,
      title: String(r["Title"] ?? "").trim(),
      instruction: String(r["Instruction"] ?? "").trim(),
      sentence,
      sentenceTokens,
      targetChunk: parsedAnswer.surfaceChunk,
      targetNorm: normalizeTokenArray(targetTokens),
      chunkCanonical: parsedAnswer.canonicalChunk,
      chunkMeaning: parsedAnswer.koreanMeaning,
    };
  });
}

function parseChunkAnswer(raw) {
  const text = compactWhitespace(raw);
  if (!text) return { surfaceChunk: "", canonicalChunk: "", koreanMeaning: "" };

  // 1) peel off meaning "(= ...)"
  let meaning = "";
  let body = text;
  const mm = text.match(/\(\s*=\s*([^)]+)\)\s*$/);
  if (mm) {
    meaning = mm[1].trim();
    body = text.slice(0, mm.index).trim();
  }

  // 2) split surface/canonical by explicit arrow first
  let surfaceChunk = "";
  let canonicalChunk = "";
  let parts = body.split(/\s*(?:→|->|=>|➝)\s*/);
  if (parts.length >= 2) {
    surfaceChunk = (parts[0] || "").trim();
    canonicalChunk = parts.slice(1).join(" ").trim();
  } else {
    // 3) fallback: any symbolic separator between spaces (handles broken arrow char like '?')
    parts = body.split(/\s+[^\w\s~']+\s+/);
    if (parts.length >= 2) {
      surfaceChunk = (parts[0] || "").trim();
      canonicalChunk = parts.slice(1).join(" ").trim();
    } else {
      surfaceChunk = body.trim();
      canonicalChunk = "";
    }
  }

  if (canonicalChunk) {
    canonicalChunk = canonicalChunk.replace(/\s+/g, " ").trim();
  }

  return { surfaceChunk, canonicalChunk, koreanMeaning: meaning };
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = lessonTitle || "Pleks L3";
  const subTitle = exerciseTitle || (questions[0]?.title || "Find the Chunk");
  const inst = questions[0]?.instruction || "문장에서 chunk를 찾아 선택하세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L3-E2</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">총 ${total}문제</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-size:14px; font-weight:900; color:#444; margin-bottom:2px;">${escapeHtml(title)}</div>
      <div style="font-size:13px; color:#555; margin-bottom:8px;">${escapeHtml(subTitle)}</div>
      <div style="font-size:13px; color:#7e3106; line-height:1.6;">${escapeHtml(inst)}</div>

      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">시작</button>
    </div>
  `;
}

function startQuiz() {
  if (!questions.length) {
    alert("해당 Lesson/Exercise에 문제가 없습니다.");
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

  selectedSet = new Set();
  isLocked = false;

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${questions.length} (Q${q.qNumber})</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${escapeHtml(q.instruction || "(지시문 없음)")}</div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence" id="sentence-area"></div>
      <div class="status" id="status-line"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn">제출</button>
      <button class="quiz-btn" id="next-btn">다음</button>
    </div>
  `;

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");

  if (submitBtn) submitBtn.addEventListener("click", submitCurrent);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
  if (nextBtn) nextBtn.disabled = true;

  renderSentenceTokens();
}

function renderSentenceTokens() {
  const q = questions[currentIndex];
  const sentenceArea = document.getElementById("sentence-area");
  const statusLine = document.getElementById("status-line");
  if (!q || !sentenceArea || !statusLine) return;

  sentenceArea.innerHTML = q.sentenceTokens
    .map((tok, i) => {
      const classes = ["tok"];
      if (selectedSet.has(i)) classes.push("selected");
      return `<span class="${classes.join(" ")}" data-idx="${i}">${escapeHtml(tok)}</span>`;
    })
    .join(" ");

  sentenceArea.onclick = (ev) => {
    if (isLocked) return;
    const target = ev.target.closest("[data-idx]");
    if (!target) return;
    const idx = Number(target.getAttribute("data-idx"));
    if (!Number.isInteger(idx)) return;

    if (selectedSet.has(idx)) selectedSet.delete(idx);
    else selectedSet.add(idx);
    renderSentenceTokens();
  };

  const selected = getSelectedChunkText(q);
  if (!selected) {
    statusLine.textContent = "문장에서 chunk 구간을 눌러 선택하세요.";
  } else {
    statusLine.textContent = `선택: ${selected}`;
  }
}

function getSelectedChunkText(q) {
  const indices = Array.from(selectedSet).sort((a, b) => a - b);
  if (!indices.length) return "";
  return indices.map((i) => q.sentenceTokens[i]).join(" ").trim();
}

function submitCurrent() {
  const q = questions[currentIndex];
  if (!q || isLocked) return;

  const selected = getSelectedChunkText(q);
  const selectedNorm = normalizeTokenArray(splitSentenceTokens(selected));
  const isCorrect = isSameArray(selectedNorm, q.targetNorm);

  if (!isCorrect) {
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L3-E2 / Q${q.qNumber}`,
      question: q.sentence,
      selected: selected || "무응답",
      correct: false,
      modelAnswer: q.targetChunk,
    });
    showToast("no", "오답...");
    return;
  }

  isLocked = true;
  upsertResult({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Pleks L3-E2 / Q${q.qNumber}`,
    question: q.sentence,
    selected: selected || "무응답",
    correct: true,
    modelAnswer: q.targetChunk,
  });

  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");
  if (nextBtn) nextBtn.disabled = false;
  if (submitBtn) submitBtn.disabled = true;

  showToast("ok", "정답!");
}

function goNext() {
  const q = questions[currentIndex];
  if (q && !isLocked) {
    const selected = getSelectedChunkText(q);
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L3-E2 / Q${q.qNumber}`,
      question: q.sentence,
      selected: selected || "무응답",
      correct: false,
      modelAnswer: q.targetChunk,
    });
  }

  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function upsertResult(record) {
  const i = results.findIndex((r) => Number(r.qNumber) === Number(record.qNumber));
  if (i >= 0) results[i] = record;
  else results.push(record);
}

function showResultPopup() {
  const ordered = questions.map((q, i) => {
    const found = results.find((x) => Number(x.qNumber) === Number(q.qNumber));
    return (
      found || {
        no: i + 1,
        qNumber: q.qNumber,
        word: `Pleks L3-E2 / Q${q.qNumber}`,
        question: q.sentence,
        selected: "무응답",
        correct: false,
        modelAnswer: q.targetChunk,
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

  alert("결과표 모듈을 찾지 못했습니다.");
}

function showToast(type, message) {
  if (window.PleksToastFX?.show) {
    window.PleksToastFX.show(type, message);
  }
}

function compactWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentenceTokens(text) {
  return compactWhitespace(text).split(" ").filter(Boolean);
}

function normalizeTokenArray(tokens) {
  return (tokens || [])
    .map((t) => normalizeEnglishToken(t))
    .filter(Boolean);
}

function normalizeEnglishToken(token) {
  return String(token || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function isSameArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
