// pleks-l2e1.js
// L2-E1: pivot 약분 + 직접 쓰기

const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const DESC_FILE = "LTRYI-pleks-lesson-desc.xlsx";

const TARGET_LESSON = 2;
const TARGET_EXERCISE = 1;
const MAX_QUESTIONS = 0; // 0 = no limit

const WEAK_WORDS = new Set([
  "a", "an", "the",
  "of", "to", "in", "on", "at", "for", "from", "by", "with", "as",
  "and", "or", "but", "so", "if", "then", "than",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "have", "has", "had",
  "this", "that", "these", "those",
]);

let subcategory = "Grammar";
let level = "Basic";
let day = "303";
let quizTitle = "quiz_Grammar_Basic_303";
let userId = "";

let rawRows = [];
let descRows = [];
let questions = [];
let currentIndex = 0;
let results = [];

let lessonTitle = "";
let exerciseTitle = "";

let isLocked = false;
let pivotReady = false;
let pickAIndex = -1;
let pickBIndex = -1;

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
    alert("Failed to load excel files.\n" + EXCEL_FILE);
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
    const parsedQuestion = parseABQuestion(rawQuestion);

    const rawAnswer = String(r["Answer"] ?? "").trim();
    const parsedAnswer = parseCombinedPivot(rawAnswer);

    const pivot = parsedAnswer.pivot || inferPivot(parsedQuestion.a, parsedQuestion.b);

    return {
      no: idx + 1,
      qNumber: Number(r["QNumber"]) || idx + 1,
      title: String(r["Title"] ?? "").trim(),
      instruction: String(r["Instruction"] ?? "").trim(),
      aText: parsedQuestion.a,
      bText: parsedQuestion.b,
      answerCombined: parsedAnswer.combined,
      answerPivot: pivot,
    };
  });
}

function parseABQuestion(raw) {
  const text = String(raw || "").replace(/\r\n/g, " ").replace(/\r/g, " ").trim();
  const oneLine = text.replace(/\s+/g, " ");

  const m = oneLine.match(/A:\s*(.+?)\s*B:\s*(.+)$/i);
  if (m) {
    return {
      a: m[1].trim(),
      b: m[2].trim(),
    };
  }

  return { a: "", b: oneLine };
}

function parseCombinedPivot(raw) {
  const text = String(raw || "").replace(/\r\n/g, " ").replace(/\r/g, " ").trim();
  const cm = text.match(/Combined:\s*(.+?)(?:\s*Pivot:|$)/i);
  const pm = text.match(/Pivot:\s*(.+)$/i);

  return {
    combined: cm ? cm[1].trim() : "",
    pivot: pm ? pm[1].trim() : "",
  };
}

function inferPivot(aText, bText) {
  const aWords = splitWordsRaw(aText);
  const bSet = new Set(splitWordsRaw(bText).map(normalizeWord));

  for (const w of aWords) {
    const n = normalizeWord(w);
    if (!n || WEAK_WORDS.has(n)) continue;
    if (bSet.has(n)) return w;
  }

  for (const w of aWords) {
    const n = normalizeWord(w);
    if (n && bSet.has(n)) return w;
  }

  return "";
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = lessonTitle || "Pleks L2";
  const subTitle = exerciseTitle || (questions[0]?.title || "Pivot 약분");
  const instruction = questions[0]?.instruction || "A/B에서 피봇을 고르고 한 문장으로 직접 쓰세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L2-E1</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">총 ${total}문제</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-size:14px; font-weight:900; color:#444; margin-bottom:2px;">${escapeHtml(title)}</div>
      <div style="font-size:13px; color:#555; margin-bottom:8px;">${escapeHtml(subTitle)}</div>

      <div style="font-size:13px; line-height:1.6; color:#333;">
        1. A와 B에서 각각 단어를 하나씩 선택해 피봇을 맞추세요.<br/>
        2. 피봇이 맞으면 아래에 합쳐 쓰기 창이 열립니다.
      </div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106;">${escapeHtml(instruction)}</div>

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
  pivotReady = false;
  pickAIndex = -1;
  pickBIndex = -1;

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${questions.length} (Q${q.qNumber})</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${escapeHtml(q.instruction || "A/B에서 피봇을 고르고 한 문장으로 쓰세요.")}</div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div class="ab-title">문장 A</div>
      <div class="sentence" id="sentence-a"></div>

      <div class="ab-title" style="margin-top:10px;">문장 B</div>
      <div class="sentence" id="sentence-b"></div>

      <div class="pivot-status" id="pivot-status"></div>
    </div>

    <div class="box hidden" id="write-box" style="margin-bottom:10px;">
      <div class="answer-wrap">
        <textarea id="user-english" class="eng" rows="3" placeholder="합친 문장을 입력하세요."></textarea>
      </div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="next-btn">다음</button>
    </div>
  `;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.addEventListener("click", goNext);
  if (nextBtn) nextBtn.disabled = true;

  const userEngEl = document.getElementById("user-english");
  if (userEngEl) {
    userEngEl.addEventListener("input", () => tryAutoCompleteWrite(false));
    userEngEl.addEventListener("blur", () => tryAutoCompleteWrite(true));
  }

  renderABTokens();
}

function renderABTokens() {
  const q = questions[currentIndex];
  if (!q) return;

  const aEl = document.getElementById("sentence-a");
  const bEl = document.getElementById("sentence-b");
  const statusEl = document.getElementById("pivot-status");
  const writeBox = document.getElementById("write-box");
  if (!aEl || !bEl || !statusEl || !writeBox) return;

  const aWords = splitWordsRaw(q.aText);
  const bWords = splitWordsRaw(q.bText);

  aEl.innerHTML = buildWordLineHTML(aWords, pickAIndex, "a");
  bEl.innerHTML = buildWordLineHTML(bWords, pickBIndex, "b");

  aEl.onclick = (ev) => {
    if (isLocked) return;
    const target = ev.target.closest("[data-side='a'][data-idx]");
    if (!target) return;
    const idx = Number(target.getAttribute("data-idx"));
    if (!Number.isInteger(idx)) return;

    pickAIndex = idx;
    pivotReady = false;
    renderABTokens();
  };

  bEl.onclick = (ev) => {
    if (isLocked) return;
    const target = ev.target.closest("[data-side='b'][data-idx]");
    if (!target) return;
    const idx = Number(target.getAttribute("data-idx"));
    if (!Number.isInteger(idx)) return;

    pickBIndex = idx;
    pivotReady = false;
    renderABTokens();
  };

  const evalInfo = evaluatePivotState(q, aWords, bWords);
  statusEl.textContent = evalInfo.message;
  pivotReady = evalInfo.ok;

  if (pivotReady) writeBox.classList.remove("hidden");
  else writeBox.classList.add("hidden");
}

function buildWordLineHTML(words, selectedIndex, side) {
  if (!words.length) return "";
  return words
      .map((w, i) => {
        const classes = ["tok"];
        if (i === selectedIndex) classes.push("selected");
        return `<span class="${classes.join(" ")}" data-side="${side}" data-idx="${i}">${escapeHtml(w)}</span>`;
      })
    .join(" ");
}

function evaluatePivotState(q, aWords, bWords) {
  if (pickAIndex < 0 || pickBIndex < 0) {
    return { ok: false, message: "A와 B에서 단어를 하나씩 고르세요." };
  }

  const aWord = aWords[pickAIndex] || "";
  const bWord = bWords[pickBIndex] || "";
  const aNorm = normalizeWord(aWord);
  const bNorm = normalizeWord(bWord);

  if (!aNorm || !bNorm || aNorm !== bNorm) {
    return { ok: false, message: "두 문장에서 같은 단어를 골라야 합니다." };
  }

  const modelNorm = normalizeWord(q.answerPivot);
  if (modelNorm && aNorm !== modelNorm) {
    return { ok: false, message: "공통 단어지만 정답 피봇은 아닙니다. 다시 고르세요." };
  }

  return { ok: true, message: "약분 완료." };
}

function tryAutoCompleteWrite(isBlur) {
  const q = questions[currentIndex];
  if (!q || isLocked) return;

  if (!pivotReady) {
    if (isBlur) showToast("no", "먼저 A/B에서 피봇을 맞추세요.");
    return;
  }

  const userEngEl = document.getElementById("user-english");
  const userSentence = String(userEngEl?.value || "").trim();
  if (!userSentence) {
    if (isBlur) showToast("no", "합친 문장을 입력하세요.");
    return;
  }

  const ok = normalizeEnglishForCompare(userSentence) === normalizeEnglishForCompare(q.answerCombined);
  if (!ok) {
    if (isBlur) showToast("no", "아직 정답이 아닙니다.");
    return;
  }

  const selectedPivot = getSelectedPivotWord(q);
  upsertResult({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Pleks L2-E1 / Q${q.qNumber}`,
    question: `${q.aText} / ${q.bText}`,
    selected: `${userSentence} | 피봇: ${selectedPivot || "-"}`,
    correct: true,
    modelAnswer: `${q.answerCombined} | 피봇: ${q.answerPivot}`,
  });

  isLocked = true;
  const nextBtn = document.getElementById("next-btn");
  const userEngInput = document.getElementById("user-english");
  if (nextBtn) nextBtn.disabled = false;
  if (userEngInput) userEngInput.disabled = true;

  renderABTokens();
  showToast("ok", "정답!");
}

function goNext() {
  const q = questions[currentIndex];
  if (q && !isLocked) {
    const userEngEl = document.getElementById("user-english");
    const userSentence = String(userEngEl?.value || "").trim();
    const selectedPivot = getSelectedPivotWord(q);

    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L2-E1 / Q${q.qNumber}`,
      question: `${q.aText} / ${q.bText}`,
      selected: `${userSentence || "무응답"} | 피봇: ${selectedPivot || "-"}`,
      correct: false,
      modelAnswer: `${q.answerCombined} | 피봇: ${q.answerPivot}`,
    });
  }

  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function getSelectedPivotWord(q) {
  const words = splitWordsRaw(q?.aText || "");
  if (!Number.isInteger(pickAIndex) || pickAIndex < 0 || pickAIndex >= words.length) return "";
  return words[pickAIndex];
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
        word: `Pleks L2-E1 / Q${q.qNumber}`,
        question: `${q.aText} / ${q.bText}`,
        selected: "무응답",
        correct: false,
        modelAnswer: `${q.answerCombined} | 피봇: ${q.answerPivot}`,
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

function splitWordsRaw(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean);
}

function normalizeWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function normalizeEnglishForCompare(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/\.+$/g, "")
    .trim();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
