// aisth-l1e4.js
// Independent runtime for Aisth Lesson 1 Exercise 4
// Flow: click correct word in sentence -> highlight -> show translation box

const EXCEL_FILE = "LTRYI-grammar-lesson-questions.xlsx";
const TARGET_LESSON = 1;
const TARGET_EXERCISE = 4;
const PAGE_LABEL = "Aisth L1-E4";
const MAX_QUESTIONS = 0; // 0 = unlimited

const FIXED_INSTRUCTION = "문장에서 정답 단어(부사)를 클릭하고 번역해보세요.";

const TEXT = {
  START: "🚀 시작",
  INTRO_1: "문장에서 정답 단어를 클릭한 뒤 번역을 입력하세요.",
  INTRO_2: "정답 단어를 맞게 누르면 번역 박스가 나타납니다.",
  PIN: "📌",
  NO_QUESTIONS: "해당 Lesson/Exercise의 문제가 없습니다.",
  PICK_WORD_FIRST: "먼저 문장에서 정답 단어를 클릭하세요.",
  INPUT_REQUIRED: "번역을 입력하세요.",
  CORRECT: "정답!",
  WRONG: "오답",
  QTYPE: "단어 찾기 + 번역",
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
  TRANSLATE_HINT: "선택한 단어를 번역해보세요.",
  TRANSLATE_HINT_FREE: "선택한 단어의 뜻을 자유롭게 적어보세요. (채점 X)",
};

let subcategory = "Grammar";
let level = "aisth";
let day = "004";
let quizTitle = "quiz_Grammar_aisth_l1e4";
let userId = "";

let rawRows = [];
let questions = [];
let currentIndex = 0;
let results = [];
let isCurrentLocked = false;

let selectedWordOk = false;
let selectedWordIndex = -1;
let selectedWordText = "";

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
      line-height: 1.75;
      font-size: 14px;
      word-break: keep-all;
      white-space: pre-wrap;
    }

    .word-token {
      cursor: pointer;
      border-radius: 6px;
      transition: background-color 0.15s ease;
    }

    .word-token:hover {
      background: rgba(241,123,42,0.15);
    }

    .word-token.hit {
      background: rgba(255, 208, 90, 0.45);
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight: 900;
    }

    .word-token.miss {
      background: rgba(198,40,40,0.12);
      box-shadow: inset 0 0 0 1px rgba(198,40,40,0.35);
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
    const parsed = parseAnswer(answerRaw);

    return {
      no: idx + 1,
      qNumber: Number(row["QNumber"]) || idx + 1,
      title: normalizeEscapedBreaks(String(row["Title"] ?? "").trim()),
      question,
      instruction: FIXED_INSTRUCTION,
      answerWord: parsed.word,
      answerWordNorm: normalizeToken(parsed.word),
      answerKo: parsed.ko,
      answerKoNorm: normalizeKorean(parsed.ko),
    };
  });
}

function parseAnswer(answerRaw) {
  const raw = stripEmphasisMarkers(String(answerRaw || "").trim());
  if (!raw) return { word: "", ko: "" };

  if (raw.includes(",")) {
    const [first, ...rest] = raw.split(",");
    return {
      word: stripEmphasisMarkers(String(first || "").trim()),
      ko: stripEmphasisMarkers(rest.join(",").trim()),
    };
  }

  return { word: raw, ko: "" };
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
  selectedWordOk = false;
  selectedWordIndex = -1;
  selectedWordText = "";

  const translateHint = q.answerKo ? TEXT.TRANSLATE_HINT : TEXT.TRANSLATE_HINT_FREE;
  const translatePlaceholder = q.answerKo
    ? `번역 입력 (ex. ${clipExample(q.answerKo) || "뜻"})`
    : "번역 입력 (자유 입력)";

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="margin-bottom:8px;"><span class="pill">${escapeHtml(TEXT.QTYPE)}</span></div>
      <div style="font-size:13px; color:#7e3106; font-weight:900;">${escapeHtml(FIXED_INSTRUCTION)}</div>
      <div class="sentence" id="clickable-sentence">${renderClickableSentence(q.question)}</div>
    </div>

    <div class="box" id="translate-wrap" style="background:#fff; display:none;">
      <div style="font-size:13px; color:#7e3106; font-weight:900; margin-bottom:6px;">${escapeHtml(translateHint)}</div>
      <textarea id="user-ko" rows="2" placeholder="${escapeHtmlAttr(translatePlaceholder)}"></textarea>
      <div id="feedback" class="feedback"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" type="button">${escapeHtml(TEXT.SUBMIT)}</button>
      <button class="quiz-btn" id="next-btn" type="button" disabled>${escapeHtml(TEXT.NEXT)}</button>
    </div>
  `;

  wireWordClicks();

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  if (submitBtn) submitBtn.addEventListener("click", submitCurrentAnswer);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
}

function renderClickableSentence(text) {
  const parts = stripEmphasisMarkers(normalizeEscapedBreaks(String(text || ""))).split(/(\s+)/);
  let tokenIndex = 0;

  return parts.map((part) => {
    if (/^\s+$/.test(part)) return part;
    const html = `<span class="word-token" data-token-index="${tokenIndex}">${escapeHtml(part)}</span>`;
    tokenIndex += 1;
    return html;
  }).join("");
}

function wireWordClicks() {
  const q = questions[currentIndex];
  document.querySelectorAll(".word-token").forEach((el) => {
    el.addEventListener("click", () => {
      if (!q || isCurrentLocked || selectedWordOk) return;

      const raw = String(el.textContent || "").trim();
      const norm = normalizeToken(raw);

      if (!norm) return;

      if (norm === q.answerWordNorm) {
        selectedWordOk = true;
        selectedWordText = raw;
        selectedWordIndex = Number(el.dataset.tokenIndex || -1);
        refreshWordHighlight();

        const wrap = document.getElementById("translate-wrap");
        if (wrap) wrap.style.display = "block";

        const input = document.getElementById("user-ko");
        if (input) input.focus();

        showToast("ok", TEXT.CORRECT);
      } else {
        el.classList.add("miss");
        setTimeout(() => el.classList.remove("miss"), 220);
        showToast("no", TEXT.WRONG);
      }
    });
  });
}

function refreshWordHighlight() {
  document.querySelectorAll(".word-token").forEach((el) => {
    const idx = Number(el.dataset.tokenIndex || -1);
    el.classList.toggle("hit", selectedWordOk && idx === selectedWordIndex);
  });
}

function submitCurrentAnswer() {
  if (isCurrentLocked) return;

  const q = questions[currentIndex];
  const feedback = document.getElementById("feedback");
  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const input = document.getElementById("user-ko");

  if (!q) return;

  if (!selectedWordOk) {
    showToast("no", TEXT.PICK_WORD_FIRST);
    return;
  }

  const userKo = String(input?.value || "").trim();

  if (q.answerKo) {
    if (!userKo) {
      showToast("no", TEXT.INPUT_REQUIRED);
      return;
    }

    const koOk = normalizeKorean(userKo) === q.answerKoNorm;
    if (!koOk) {
      if (feedback) {
        feedback.className = "feedback";
        feedback.innerHTML = "";
      }
      showToast("no", TEXT.WRONG);
      return;
    }
  }

  isCurrentLocked = true;
  if (input) input.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;

  if (feedback) {
    feedback.className = "feedback";
    feedback.innerHTML = "";
  }

  const shownAnswer = q.answerKo ? `${q.answerWord}, ${q.answerKo}` : q.answerWord;
  const shownSelected = q.answerKo
    ? `${stripTokenPunct(selectedWordText)}${userKo ? `, ${userKo}` : ""}`
    : stripTokenPunct(selectedWordText);

  results.push({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    question: q.question,
    selected: shownSelected,
    answer: shownAnswer,
    instruction: FIXED_INSTRUCTION,
    correct: true,
  });

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

function normalizeToken(value) {
  return stripTokenPunct(value).toLowerCase();
}

function stripTokenPunct(value) {
  return String(value ?? "")
    .trim()
    .replace(/^[^A-Za-z0-9가-힣]+/g, "")
    .replace(/[^A-Za-z0-9가-힣]+$/g, "");
}

function normalizeKorean(value) {
  return stripEmphasisMarkers(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!~]+$/g, "")
    .trim();
}

function normalizeEscapedBreaks(value) {
  return String(value ?? "")
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\\r", "\n");
}

function stripEmphasisMarkers(value) {
  return String(value ?? "").replace(/\*\*(.*?)\*\*/gs, "$1");
}

function clipExample(s) {
  const oneLine = stripEmphasisMarkers(normalizeEscapedBreaks(String(s ?? ""))).replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  return oneLine.length > 28 ? oneLine.slice(0, 28) + "..." : oneLine;
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
    const answerShown = q.answerKo ? `${q.answerWord}, ${q.answerKo}` : q.answerWord;

    return `
      <div class="result-item">
        <div><b>Q${idx + 1}</b> ${escapeHtml(stripEmphasisMarkers(q.question))}</div>
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

function escapeHtmlAttr(str) {
  return escapeHtml(stripEmphasisMarkers(normalizeEscapedBreaks(str))).replaceAll("\n", " ");
}


