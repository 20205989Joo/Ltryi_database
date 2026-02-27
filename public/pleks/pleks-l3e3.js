// pleks-l3e3.js
// L3-E3: pivot-overlapped chunks -> translation scramble

const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const DESC_FILE = "LTRYI-pleks-lesson-desc.xlsx";

const TARGET_LESSON = 3;
const TARGET_EXERCISE = 3;
const MAX_QUESTIONS = 0; // 0 = no limit

let subcategory = "Grammar";
let level = "Basic";
let day = "308";
let quizTitle = "quiz_Grammar_Basic_308";
let userId = "";

let rawRows = [];
let descRows = [];
let questions = [];
let currentIndex = 0;
let results = [];

let lessonTitle = "";
let exerciseTitle = "";

let chunksState = [];
let selectedTokens = [];
let bankTokens = [];
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
    const parsed = parseQuestion(String(r["Question"] ?? "").trim());
    const sentenceTokens = splitWords(parsed.sentence);
    const chunks = buildChunkContexts(sentenceTokens, parsed.chunks);

    return {
      no: idx + 1,
      qNumber: Number(r["QNumber"]) || idx + 1,
      title: String(r["Title"] ?? "").trim(),
      instruction: String(r["Instruction"] ?? "").trim(),
      sentence: parsed.sentence,
      sentenceTokens,
      chunks,
      answerKorean: String(r["Answer"] ?? "").trim(),
      answerNorm: normalizeKoreanForCompare(String(r["Answer"] ?? "").trim()),
    };
  });
}

function parseQuestion(raw) {
  const text = compactWhitespace(raw);
  const m = text.match(/Sentence:\s*(.+?)\s*Chunks:\s*(.+)$/i);
  if (!m) return { sentence: text, chunks: [] };

  const sentence = m[1].trim();
  const chunkBlock = m[2].trim();
  const chunkItems = chunkBlock
    .split(/\s*-\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

  const chunks = chunkItems.map((line, i) => {
    const mm = line.match(/^(.*?)\(\s*=\s*([^)]+)\)\s*$/);
    const base = (mm ? mm[1] : line).replace(/~/g, "").trim().replace(/\s+/g, " ");
    const meaning = mm ? mm[2].trim() : "";
    const baseWords = splitWords(base);
    const pivotNorm = normalizeWord(baseWords[0] || "");
    const prepNorm = normalizeWord(baseWords[baseWords.length - 1] || "");
    return {
      id: i,
      base,
      meaning,
      pivotNorm,
      prepNorm,
      caught: false,
      pivotIdx: -1,
      prepIdx: -1,
      endIdx: -1,
      expandedText: base,
    };
  });

  return { sentence, chunks };
}

function buildChunkContexts(sentenceTokens, chunks) {
  const tokenNorms = sentenceTokens.map((w) => normalizeWord(w));
  const prepared = (chunks || []).map((ch) => ({ ...ch }));

  for (let i = 0; i < prepared.length; i += 1) {
    const ch = prepared[i];
    const pivotIdx = tokenNorms.findIndex((x) => x === ch.pivotNorm);
    let prepIdx = -1;
    if (pivotIdx >= 0) {
      for (let j = pivotIdx + 1; j < tokenNorms.length; j += 1) {
        if (tokenNorms[j] === ch.prepNorm) {
          prepIdx = j;
          break;
        }
      }
    }
    if (prepIdx < 0) {
      prepIdx = tokenNorms.findIndex((x) => x === ch.prepNorm);
    }

    ch.pivotIdx = pivotIdx;
    ch.prepIdx = prepIdx;
  }

  const prepPositions = prepared
    .map((ch) => ch.prepIdx)
    .filter((x) => Number.isInteger(x) && x >= 0)
    .sort((a, b) => a - b);

  for (let i = 0; i < prepared.length; i += 1) {
    const ch = prepared[i];
    if (ch.pivotIdx < 0 || ch.prepIdx < 0) {
      ch.endIdx = -1;
      ch.expandedText = ch.base;
      continue;
    }

    const nextPrep = prepPositions.find((p) => p > ch.prepIdx);
    const endIdx = Number.isInteger(nextPrep) ? nextPrep - 1 : sentenceTokens.length - 1;
    ch.endIdx = Math.max(ch.prepIdx, endIdx);

    const pivotWord = sentenceTokens[ch.pivotIdx] || "";
    const tail = sentenceTokens.slice(ch.prepIdx, ch.endIdx + 1).join(" ");
    ch.expandedText = compactWhitespace(`${pivotWord} ${tail}`);
  }

  return prepared;
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = lessonTitle || "Pleks L3";
  const subTitle = exerciseTitle || (questions[0]?.title || "Pivot + Chunk");
  const inst = questions[0]?.instruction || "pivot chunk를 먼저 캐치한 뒤, 번역 scramble을 수행하세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L3-E3</div>

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

  chunksState = (q.chunks || []).map((x) => ({ ...x, caught: false }));
  selectedTokens = [];
  bankTokens = [];
  isLocked = false;

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${questions.length} (Q${q.qNumber})</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${escapeHtml(q.instruction || "(지시문 없음)")}</div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence" id="sentence-line"></div>
      <div class="status" id="status-line"></div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div class="chunk-picks" id="chunk-picks"></div>
      <div class="capture-list" id="capture-list"></div>
    </div>

    <div class="box hidden" id="scramble-box" style="margin-bottom:10px;">
      <div id="answer-line" class="token-wrap"></div>
      <div id="bank-area" class="token-wrap" style="margin-top:8px;"></div>
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

  renderChunkStage();
}

function renderChunkStage() {
  const q = questions[currentIndex];
  if (!q) return;

  const sentenceLine = document.getElementById("sentence-line");
  const statusLine = document.getElementById("status-line");
  const chunkPicks = document.getElementById("chunk-picks");
  const captureList = document.getElementById("capture-list");
  const scrambleBox = document.getElementById("scramble-box");
  if (!sentenceLine || !statusLine || !chunkPicks || !captureList || !scrambleBox) return;

  sentenceLine.innerHTML = renderSentenceLineHtml(q.sentenceTokens, chunksState);
  chunkPicks.innerHTML = renderChunkPickButtonsHtml(chunksState);
  captureList.innerHTML = renderCaptureListHtml(chunksState);

  chunkPicks.onclick = (ev) => {
    if (isLocked) return;
    const btn = ev.target.closest("[data-chunk-id]");
    if (!btn) return;
    const cid = Number(btn.getAttribute("data-chunk-id"));
    if (!Number.isInteger(cid)) return;
    const ch = chunksState.find((x) => x.id === cid);
    if (!ch || ch.caught) return;
    ch.caught = true;
    renderChunkStage();
  };

  const caughtCount = chunksState.filter((c) => c.caught).length;
  if (caughtCount < chunksState.length) {
    statusLine.textContent = `chunk를 캐치하세요. (${caughtCount}/${chunksState.length})`;
    scrambleBox.classList.add("hidden");
    return;
  }

  statusLine.textContent = "chunk 캐치 완료. 해석 scramble을 완성하세요.";
  scrambleBox.classList.remove("hidden");

  if (!bankTokens.length && !selectedTokens.length) {
    bankTokens = shuffleArray(
      splitWords(q.answerKorean).map((text, i) => ({
        id: `k${currentIndex}_${i}_${Math.random().toString(16).slice(2, 7)}`,
        text,
      }))
    );
  }
  renderScrambleUI();
}

function renderSentenceLineHtml(sentenceTokens, chunks) {
  const active = (chunks || []).filter((c) => c.caught).slice(0, 2);
  const a = active[0] || null;
  const b = active[1] || null;

  return sentenceTokens
    .map((tok, idx) => {
      const classes = ["tok"];
      const hasABase = !!a && (idx === a.pivotIdx || idx === a.prepIdx);
      const hasAExt = !!a && (idx === a.pivotIdx || (idx >= a.prepIdx && idx <= a.endIdx));
      const hasBBase = !!b && (idx === b.pivotIdx || idx === b.prepIdx);
      const hasBExt = !!b && (idx === b.pivotIdx || (idx >= b.prepIdx && idx <= b.endIdx));

      if (hasAExt && hasBExt) {
        classes.push("overlap");
      } else if (hasABase) {
        classes.push("base-a");
      } else if (hasBBase) {
        classes.push("base-b");
      } else if (hasAExt) {
        classes.push("ext-a");
      } else if (hasBExt) {
        classes.push("ext-b");
      }

      return `<span class="${classes.join(" ")}">${escapeHtml(tok)}</span>`;
    })
    .join(" ");
}

function renderChunkPickButtonsHtml(chunks) {
  const list = (chunks || []).slice(0, 2);
  return list
    .map((ch, i) => {
      const cls = ["chunk-btn"];
      if (ch.caught) cls.push(i === 0 ? "caught-a" : "caught-b");
      return `<button class="${cls.join(" ")}" data-chunk-id="${ch.id}" ${ch.caught ? "disabled" : ""}>${escapeHtml(ch.base)}</button>`;
    })
    .join("");
}

function renderCaptureListHtml(chunks) {
  const list = (chunks || []).slice(0, 2).filter((c) => c.caught);
  if (!list.length) return "";

  return list
    .map((ch, i) => {
      const baseClass = i === 0 ? "base-a" : "base-b";
      const extClass = i === 0 ? "ext-a" : "ext-b";
      return `
        <div class="capture-item">
          <span class="chip ${baseClass}">${escapeHtml(ch.base)}</span>
          <span class="chip ${extClass}">${escapeHtml(ch.expandedText)}</span>
        </div>
      `;
    })
    .join("");
}

function renderScrambleUI() {
  const answerLine = document.getElementById("answer-line");
  const bankArea = document.getElementById("bank-area");
  if (!answerLine || !bankArea) return;

  answerLine.innerHTML = "";
  if (!selectedTokens.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = "토큰을 눌러 해석을 완성하세요.";
    answerLine.appendChild(placeholder);
  } else {
    selectedTokens.forEach((tok, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "token-btn answer";
      btn.textContent = tok.text;
      btn.disabled = isLocked;
      btn.addEventListener("click", () => {
        if (isLocked) return;
        const [moved] = selectedTokens.splice(idx, 1);
        if (moved) bankTokens.push(moved);
        renderScrambleUI();
      });
      answerLine.appendChild(btn);
    });
  }

  bankArea.innerHTML = "";
  bankTokens.forEach((tok) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "token-btn bank";
    btn.textContent = tok.text;
    btn.disabled = isLocked;
    btn.addEventListener("click", () => {
      if (isLocked) return;
      const i = bankTokens.findIndex((x) => x.id === tok.id);
      if (i >= 0) {
        const [moved] = bankTokens.splice(i, 1);
        selectedTokens.push(moved);
      }
      renderScrambleUI();
    });
    bankArea.appendChild(btn);
  });
}

function submitCurrent() {
  const q = questions[currentIndex];
  if (!q || isLocked) return;

  const allCaught = chunksState.length ? chunksState.every((c) => c.caught) : false;
  if (!allCaught) {
    showToast("no", "먼저 chunk를 캐치하세요.");
    return;
  }

  const userKorean = selectedTokens.map((t) => t.text).join(" ").trim();
  const correct = normalizeKoreanForCompare(userKorean) === q.answerNorm;

  if (!correct) {
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L3-E3 / Q${q.qNumber}`,
      question: q.sentence,
      selected: `${userKorean || "무응답"} | chunk: ${chunksState.filter((c) => c.caught).map((c) => c.base).join(", ")}`,
      correct: false,
      modelAnswer: q.answerKorean,
    });
    showToast("no", "오답...");
    return;
  }

  isLocked = true;
  upsertResult({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Pleks L3-E3 / Q${q.qNumber}`,
    question: q.sentence,
    selected: `${userKorean || "무응답"} | chunk: ${chunksState.filter((c) => c.caught).map((c) => c.base).join(", ")}`,
    correct: true,
    modelAnswer: q.answerKorean,
  });

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  if (submitBtn) submitBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;

  renderScrambleUI();
  showToast("ok", "정답!");
}

function goNext() {
  const q = questions[currentIndex];
  if (q && !isLocked) {
    const userKorean = selectedTokens.map((t) => t.text).join(" ").trim();
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L3-E3 / Q${q.qNumber}`,
      question: q.sentence,
      selected: `${userKorean || "무응답"} | chunk: ${chunksState.filter((c) => c.caught).map((c) => c.base).join(", ") || "-"}`,
      correct: false,
      modelAnswer: q.answerKorean,
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
        word: `Pleks L3-E3 / Q${q.qNumber}`,
        question: q.sentence,
        selected: "무응답",
        correct: false,
        modelAnswer: q.answerKorean,
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

function splitWords(text) {
  return compactWhitespace(text).split(" ").filter(Boolean);
}

function compactWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWord(token) {
  return String(token || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function normalizeKoreanForCompare(text) {
  return String(text || "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
}

function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
