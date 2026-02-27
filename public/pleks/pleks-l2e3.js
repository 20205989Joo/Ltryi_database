// pleks-l2e3.js
// L2-E3: Pivot Split (Single) - token bank to A/B blocks

const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const DESC_FILE = "LTRYI-pleks-lesson-desc.xlsx";

const TARGET_LESSON = 2;
const TARGET_EXERCISE = 3;
const MAX_QUESTIONS = 0; // 0 = no limit

let subcategory = "Grammar";
let level = "Basic";
let day = "305";
let quizTitle = "quiz_Grammar_Basic_305";
let userId = "";

let rawRows = [];
let descRows = [];
let questions = [];
let currentIndex = 0;
let results = [];

let lessonTitle = "";
let exerciseTitle = "";

let isLocked = false;
let activeTarget = "A";
let selectedATokens = [];
let selectedBTokens = [];
let pivotSlashPlayed = false;

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
    const rawQuestion = String(r["Question"] ?? "").trim();
    const rawAnswer = String(r["Answer"] ?? "").trim();

    const questionParsed = parseQuestionPivot(rawQuestion);
    const answerParsed = parseAnswerBlocks(rawAnswer);

    const bankTokens = tokenizeBySpace(questionParsed.sentence);
    const answerATokens = tokenizeBySpace(answerParsed.block1);
    const answerBTokens = tokenizeBySpace(answerParsed.block2);

    return {
      no: idx + 1,
      qNumber: Number(r["QNumber"]) || idx + 1,
      title: String(r["Title"] ?? "").trim(),
      instruction: String(r["Instruction"] ?? "").trim(),
      sentence: questionParsed.sentence,
      pivot: questionParsed.pivot,
      bankTokens,
      answerA: answerParsed.block1,
      answerB: answerParsed.block2,
      answerATokens,
      answerBTokens,
      answerANorm: normalizeTokenArray(answerATokens),
      answerBNorm: normalizeTokenArray(answerBTokens),
    };
  });
}

function parseQuestionPivot(raw) {
  const text = compactWhitespace(raw);
  if (!text) return { sentence: "", pivot: "" };

  const m = text.match(/Sentence:\s*(.+?)\s*Pivot:\s*(.+)$/i);
  if (m) {
    return {
      sentence: m[1].trim(),
      pivot: cleanPivotText(m[2]),
    };
  }

  const sentenceOnly = text.replace(/^Sentence:\s*/i, "").trim();
  const pm = sentenceOnly.match(/^(.*?)\s*Pivot:\s*(.+)$/i);
  if (pm) {
    return {
      sentence: pm[1].trim(),
      pivot: cleanPivotText(pm[2]),
    };
  }

  return { sentence: sentenceOnly, pivot: "" };
}

function parseAnswerBlocks(raw) {
  const text = compactWhitespace(raw);
  if (!text) return { block1: "", block2: "" };

  let m = text.match(/Block1:\s*(.+?)\s*Block2:\s*(.+)$/i);
  if (m) {
    return { block1: m[1].trim(), block2: m[2].trim() };
  }

  m = text.match(/Block2:\s*(.+?)\s*Block1:\s*(.+)$/i);
  if (m) {
    return { block1: m[2].trim(), block2: m[1].trim() };
  }

  const slashParts = text
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (slashParts.length >= 2) {
    return {
      block1: slashParts[0].replace(/^Block1:\s*/i, "").trim(),
      block2: slashParts[1].replace(/^Block2:\s*/i, "").trim(),
    };
  }

  return { block1: text.trim(), block2: "" };
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = lessonTitle || "Pleks L2";
  const subTitle = exerciseTitle || (questions[0]?.title || "Pivot Split");

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L2-E3</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">총 ${total}문제</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-size:14px; font-weight:900; color:#444; margin-bottom:2px;">${escapeHtml(title)}</div>
      <div style="font-size:13px; color:#555; margin-bottom:8px;">${escapeHtml(subTitle)}</div>

      <div style="font-size:13px; line-height:1.65; color:#333;">
        1. 원문 token bank에서 단어를 골라 A/B 문장을 만드세요.<br/>
        2. bank token은 사라지지 않고, 같은 token을 여러 번 선택할 수 있습니다.<br/>
        3. A/B는 순서 제한 없이 자유롭게 오가며 완성하면 됩니다.
      </div>

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

  isLocked = false;
  activeTarget = "A";
  selectedATokens = [];
  selectedBTokens = [];
  pivotSlashPlayed = false;

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${questions.length} (Q${q.qNumber})</div>

    <div class="box">
      <div class="sentence">${escapeHtml(q.instruction || "지시문이 없습니다.")}</div>
    </div>

    <div class="box">
      <div class="token-line" id="bank-area"></div>
    </div>

    <div class="box">
      <div class="builder" id="builder-a" data-target="A">
        <div class="builder-label">A 문장</div>
        <div class="token-line" id="line-a"></div>
      </div>

      <div class="builder" id="builder-b" data-target="B">
        <div class="builder-label">B 문장</div>
        <div class="token-line" id="line-b"></div>
      </div>

      <div class="status-line" id="status-line"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="next-btn">다음</button>
    </div>
  `;

  wireQuestionEvents();
  renderComposer();
}

function wireQuestionEvents() {
  const bankArea = document.getElementById("bank-area");
  const builderA = document.getElementById("builder-a");
  const builderB = document.getElementById("builder-b");
  const lineA = document.getElementById("line-a");
  const lineB = document.getElementById("line-b");
  const nextBtn = document.getElementById("next-btn");

  if (bankArea) {
    bankArea.addEventListener("click", (ev) => {
      if (isLocked) return;
      const btn = ev.target.closest("[data-bank-idx]");
      if (!btn) return;

      const idx = Number(btn.getAttribute("data-bank-idx"));
      if (!Number.isInteger(idx)) return;

      const q = questions[currentIndex];
      const token = q?.bankTokens?.[idx];
      if (!token) return;

      if (activeTarget === "A") selectedATokens.push(token);
      else selectedBTokens.push(token);
      renderComposer();
    });
  }

  if (builderA) {
    builderA.addEventListener("click", () => {
      if (isLocked) return;
      activeTarget = "A";
      renderComposer();
    });
  }

  if (builderB) {
    builderB.addEventListener("click", () => {
      if (isLocked) return;
      activeTarget = "B";
      renderComposer();
    });
  }

  if (lineA) {
    lineA.addEventListener("click", (ev) => {
      if (isLocked) return;
      ev.stopPropagation();
      const btn = ev.target.closest("[data-built-idx]");
      if (!btn) {
        activeTarget = "A";
        renderComposer();
        return;
      }
      const idx = Number(btn.getAttribute("data-built-idx"));
      if (!Number.isInteger(idx)) return;
      selectedATokens.splice(idx, 1);
      activeTarget = "A";
      renderComposer();
    });
  }

  if (lineB) {
    lineB.addEventListener("click", (ev) => {
      if (isLocked) return;
      ev.stopPropagation();
      const btn = ev.target.closest("[data-built-idx]");
      if (!btn) {
        activeTarget = "B";
        renderComposer();
        return;
      }
      const idx = Number(btn.getAttribute("data-built-idx"));
      if (!Number.isInteger(idx)) return;
      selectedBTokens.splice(idx, 1);
      activeTarget = "B";
      renderComposer();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", goNext);
    nextBtn.disabled = true;
  }
}

function renderComposer() {
  const q = questions[currentIndex];
  if (!q) return;

  const bankArea = document.getElementById("bank-area");
  const lineA = document.getElementById("line-a");
  const lineB = document.getElementById("line-b");
  const builderA = document.getElementById("builder-a");
  const builderB = document.getElementById("builder-b");
  const statusEl = document.getElementById("status-line");
  const nextBtn = document.getElementById("next-btn");
  if (!bankArea || !lineA || !lineB || !builderA || !builderB || !statusEl || !nextBtn) return;

  builderA.classList.toggle("active", activeTarget === "A");
  builderB.classList.toggle("active", activeTarget === "B");

  const pivotNorm = normalizeToken(q.pivot);
  const shouldPlayPivotSlash = !pivotSlashPlayed && !isLocked;
  let slashAppliedCount = 0;
  bankArea.innerHTML = q.bankTokens
    .map((tok, idx) => {
      const isPivotToken = pivotNorm && normalizeToken(tok) === pivotNorm;
      const classes = ["token-chip", "bank"];
      if (isPivotToken) {
        classes.push("pivot-hit");
        if (shouldPlayPivotSlash && slashAppliedCount === 0) {
          classes.push("pivot-slash");
          slashAppliedCount += 1;
        }
      }
      return `<button class="${classes.join(" ")}" data-bank-idx="${idx}" ${isLocked ? "disabled" : ""}>${escapeHtml(tok)}</button>`;
    })
    .join("");
  if (shouldPlayPivotSlash && slashAppliedCount > 0) pivotSlashPlayed = true;

  lineA.innerHTML = buildTargetLineHTML(selectedATokens);
  lineB.innerHTML = buildTargetLineHTML(selectedBTokens);

  const state = evaluateProgress(q);
  if (state.correctAll && !isLocked) {
    isLocked = true;
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L2-E3 / Q${q.qNumber}`,
      question: q.sentence,
      selected: `A: ${selectedATokens.join(" ")} || B: ${selectedBTokens.join(" ")}`,
      correct: true,
      modelAnswer: `A: ${q.answerA} || B: ${q.answerB} || 피봇: ${q.pivot || "-"}`,
    });
    showToast("ok", "정답!");
  }

  const targetText = activeTarget === "A" ? "현재 입력: A 문장" : "현재 입력: B 문장";
  statusEl.textContent = isLocked ? "정답입니다. 다음으로 이동하세요." : `${targetText} / ${state.message}`;
  nextBtn.disabled = !isLocked;
}

function buildTargetLineHTML(tokens) {
  if (!tokens.length) {
    return `<span class="token-placeholder">token을 눌러 문장을 완성하세요.</span>`;
  }

  return tokens
    .map(
      (tok, idx) =>
        `<button class="token-chip built" data-built-idx="${idx}">${escapeHtml(tok)}</button>`
    )
    .join("");
}

function evaluateProgress(q) {
  const aNorm = normalizeTokenArray(selectedATokens);
  const bNorm = normalizeTokenArray(selectedBTokens);

  const aOk = isSameTokenArray(aNorm, q.answerANorm);
  const bOk = isSameTokenArray(bNorm, q.answerBNorm);

  if (aOk && bOk) {
    return { correctAll: true, message: "두 문장을 모두 완성했습니다." };
  }

  if (aOk && !bOk) {
    return {
      correctAll: false,
      message: `A는 정답입니다. B를 맞춰보세요. (B ${bNorm.length}/${q.answerBNorm.length})`,
    };
  }

  if (!aOk && bOk) {
    return {
      correctAll: false,
      message: `B는 정답입니다. A를 맞춰보세요. (A ${aNorm.length}/${q.answerANorm.length})`,
    };
  }

  if (!aNorm.length && !bNorm.length) {
    return {
      correctAll: false,
      message: "A/B를 선택하고 bank token을 눌러 문장을 만드세요.",
    };
  }

  return {
    correctAll: false,
    message: `진행 중: A ${aNorm.length}/${q.answerANorm.length}, B ${bNorm.length}/${q.answerBNorm.length}`,
  };
}

function goNext() {
  const q = questions[currentIndex];
  if (q && !isLocked) {
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L2-E3 / Q${q.qNumber}`,
      question: q.sentence,
      selected: `A: ${selectedATokens.join(" ") || "무응답"} || B: ${selectedBTokens.join(" ") || "무응답"}`,
      correct: false,
      modelAnswer: `A: ${q.answerA} || B: ${q.answerB} || 피봇: ${q.pivot || "-"}`,
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
        word: `Pleks L2-E3 / Q${q.qNumber}`,
        question: q.sentence,
        selected: "무응답",
        correct: false,
        modelAnswer: `A: ${q.answerA} || B: ${q.answerB} || 피봇: ${q.pivot || "-"}`,
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

function tokenizeBySpace(text) {
  return compactWhitespace(text).split(" ").filter(Boolean);
}

function cleanPivotText(text) {
  return String(text || "")
    .trim()
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "")
    .replace(/[.,!?;:]+$/g, "")
    .trim();
}

function normalizeTokenArray(tokens) {
  return (tokens || [])
    .map((t) => normalizeToken(t))
    .filter(Boolean);
}

function normalizeToken(token) {
  return String(token || "")
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function isSameTokenArray(a, b) {
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
