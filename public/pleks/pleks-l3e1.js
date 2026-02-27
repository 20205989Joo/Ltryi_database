// pleks-l3e1.js
// L3-E1: Chunk-based Translation (given chunk + Korean scramble)

const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const DESC_FILE = "LTRYI-pleks-lesson-desc.xlsx";

const TARGET_LESSON = 3;
const TARGET_EXERCISE = 1;
const MAX_QUESTIONS = 0; // 0 = no limit

let subcategory = "Grammar";
let level = "Basic";
let day = "306";
let quizTitle = "quiz_Grammar_Basic_306";
let userId = "";

let rawRows = [];
let descRows = [];
let questions = [];
let currentIndex = 0;
let results = [];

let lessonTitle = "";
let exerciseTitle = "";

let bankTokens = [];
let selectedTokens = [];
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
    const parsedQ = parseQuestionField(String(r["Question"] ?? "").trim());
    const parsedChunk = parseChunkField(parsedQ.chunkRaw);
    const marked = parseMarkedSentence(parsedQ.sentence);
    const answerRaw = String(r["Answer"] ?? "").trim();
    const markedAnswer = parseMarkedKoreanAnswer(answerRaw);
    const grouped = markedAnswer.markedTokenIndices.length
      ? { tokens: markedAnswer.tokens, chunkTokenIndices: markedAnswer.markedTokenIndices }
      : buildChunkGroupedKoreanTokens(markedAnswer.plainAnswer, parsedChunk.koreanMeaning);

    return {
      no: idx + 1,
      qNumber: Number(r["QNumber"]) || idx + 1,
      title: String(r["Title"] ?? "").trim(),
      instruction: String(r["Instruction"] ?? "").trim(),
      sentence: marked.plainSentence,
      sentenceMarkedSegments: marked.segments,
      chunkRaw: parsedQ.chunkRaw,
      chunkEnglish: parsedChunk.englishPart,
      chunkKorean: parsedChunk.koreanMeaning,
      answerKorean: markedAnswer.plainAnswer,
      groupedTokens: grouped.tokens,
      chunkTokenIndices: grouped.chunkTokenIndices,
      answerNorm: normalizeKoreanForCompare(markedAnswer.plainAnswer),
    };
  });
}

function parseQuestionField(raw) {
  const text = compactWhitespace(raw);
  if (!text) return { sentence: "", chunkRaw: "" };

  const m = text.match(/Sentence:\s*(.+?)\s*Chunk:\s*(.+)$/i);
  if (m) {
    return { sentence: m[1].trim(), chunkRaw: m[2].trim() };
  }

  const sentenceOnly = text.replace(/^Sentence:\s*/i, "").trim();
  return { sentence: sentenceOnly, chunkRaw: "" };
}

function parseMarkedSentence(sentenceText) {
  const src = String(sentenceText || "");
  const re = /\[([^[\]]+)\]/g;
  const segments = [];
  let last = 0;
  let m;

  while ((m = re.exec(src))) {
    if (m.index > last) {
      segments.push({ text: src.slice(last, m.index), marked: false });
    }
    segments.push({ text: m[1], marked: true });
    last = re.lastIndex;
  }
  if (last < src.length) {
    segments.push({ text: src.slice(last), marked: false });
  }

  if (!segments.length) {
    segments.push({ text: src, marked: false });
  }

  return {
    plainSentence: segments.map((s) => s.text).join(""),
    segments,
  };
}

function parseMarkedKoreanAnswer(answerText) {
  const src = String(answerText || "");
  const re = /\[([^[\]]+)\]/g;
  const segments = [];
  let last = 0;
  let m;

  while ((m = re.exec(src))) {
    if (m.index > last) segments.push({ text: src.slice(last, m.index), marked: false });
    segments.push({ text: m[1], marked: true });
    last = re.lastIndex;
  }
  if (last < src.length) segments.push({ text: src.slice(last), marked: false });
  if (!segments.length) segments.push({ text: src, marked: false });

  const tokens = [];
  const markedTokenIndices = [];
  segments.forEach((seg) => {
    if (seg.marked) {
      const t = compactWhitespace(seg.text);
      if (!t) return;
      tokens.push(t);
      markedTokenIndices.push(tokens.length - 1);
      return;
    }
    tokenizeKorean(seg.text).forEach((t) => tokens.push(t));
  });

  // Attach standalone punctuation token to previous token
  for (let i = 0; i < tokens.length; i += 1) {
    if (!/^[.,!?;:]+$/.test(tokens[i])) continue;
    if (i === 0) continue;
    tokens[i - 1] += tokens[i];
    tokens.splice(i, 1);
    for (let j = 0; j < markedTokenIndices.length; j += 1) {
      if (markedTokenIndices[j] >= i) markedTokenIndices[j] -= 1;
    }
    i -= 1;
  }

  return {
    plainAnswer: src.replace(/\[|\]/g, "").trim(),
    tokens,
    markedTokenIndices,
  };
}

function parseChunkField(rawChunk) {
  const chunk = compactWhitespace(rawChunk);
  if (!chunk) return { englishPart: "", koreanMeaning: "" };

  const m = chunk.match(/^(.*?)\(\s*=\s*([^)]+)\)\s*$/);
  if (m) {
    return {
      englishPart: m[1].trim(),
      koreanMeaning: m[2].trim(),
    };
  }

  const m2 = chunk.match(/^(.*?)=\s*(.+)$/);
  if (m2) {
    return {
      englishPart: m2[1].trim(),
      koreanMeaning: m2[2].trim(),
    };
  }

  return { englishPart: chunk, koreanMeaning: "" };
}

function buildChunkGroupedKoreanTokens(answerKorean, chunkKoreanMeaning) {
  const tokens = tokenizeKorean(answerKorean);
  if (!tokens.length) return { tokens: [], chunkTokenIndices: [] };
  if (!chunkKoreanMeaning) return { tokens, chunkTokenIndices: [] };

  const keywords = extractChunkKeywords(chunkKoreanMeaning);
  if (!keywords.length) return { tokens, chunkTokenIndices: [] };

  const normTokens = tokens.map(normalizeKoreanToken);
  const hitIndices = [];

  for (let i = 0; i < normTokens.length; i += 1) {
    const nt = normTokens[i];
    if (!nt) continue;

    const tokenVars = buildTokenVariantsForMatch(nt);
    const hit = keywords.some((kw) => {
      const kwVars = buildKeywordVariantsForMatch(kw);
      for (const tv of tokenVars) {
        for (const kv of kwVars) {
          if (!tv || !kv) continue;
          if (tv.includes(kv) || kv.includes(tv)) return true;
        }
      }
      return false;
    });
    if (hit) hitIndices.push(i);
  }

  if (!hitIndices.length) return { tokens, chunkTokenIndices: [] };

  let start = Math.min(...hitIndices);
  const end = Math.max(...hitIndices);

  if (start > 0 && hasLikelyObjectParticle(normTokens[start - 1])) {
    start -= 1;
  }

  if (start === end) return { tokens, chunkTokenIndices: [start] };

  const groupedToken = tokens.slice(start, end + 1).join(" ");
  const merged = [
    ...tokens.slice(0, start),
    groupedToken,
    ...tokens.slice(end + 1),
  ];

  return { tokens: merged, chunkTokenIndices: [start] };
}

function extractChunkKeywords(chunkKoreanMeaning) {
  const raw = compactWhitespace(chunkKoreanMeaning);
  if (!raw) return [];

  const cleaned = raw
    .replace(/~\s*[은는이가을를의에게에로으로와과도만]+\s*\/\s*[은는이가을를의에게에로으로와과도만]+/g, " ")
    .replace(/~\s*[은는이가을를의에게에로으로와과도만]*/g, " ")
    .replace(/[=~(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const stop = new Set([
    "을", "를", "에", "의", "은", "는", "이", "가", "도", "와", "과",
    "으로", "로", "에게", "에서", "하다", "있다",
  ]);

  const parts = cleaned
    .split(/[\/\s]+/)
    .map((x) => stripKoreanParticleEnding(normalizeKoreanToken(x)))
    .filter((x) => x && x.length >= 1 && !stop.has(x));

  return Array.from(new Set(parts));
}

function buildKeywordVariantsForMatch(kw) {
  const base = String(kw || "");
  const out = new Set([base]);

  if (base.endsWith("하다") && base.length > 2) {
    out.add(base.slice(0, -2)); // 두려워하다 -> 두려워
    out.add(base.slice(0, -1)); // 두려워하다 -> 두려워하
  }
  if (base.endsWith("되다") && base.length > 2) {
    out.add(base.slice(0, -2)); // 관련되다 -> 관련
    out.add(base.slice(0, -1)); // 관련되다 -> 관련되
    out.add(base.slice(0, -2) + "돼");
  }
  if (base.endsWith("보다") && base.length > 2) {
    out.add(base.slice(0, -1)); // 돌보다 -> 돌보
    out.add(base.slice(0, -2) + "봐"); // 돌보다 -> 돌봐
  }
  if (base.endsWith("다") && base.length > 1) {
    out.add(base.slice(0, -1));
  }

  return Array.from(out).filter((x) => x && x.length >= 1);
}

function buildTokenVariantsForMatch(token) {
  const base = String(token || "");
  const out = new Set([base]);

  if (base.endsWith("한다") && base.length > 2) out.add(base.slice(0, -2));
  if (base.endsWith("했다") && base.length > 2) out.add(base.slice(0, -2));
  if (base.endsWith("한다면") && base.length > 3) out.add(base.slice(0, -3));
  if (base.endsWith("다") && base.length > 1) out.add(base.slice(0, -1));
  if (base.endsWith("고") && base.length > 1) out.add(base.slice(0, -1));
  if (base.endsWith("봐") && base.length > 1) out.add(base.slice(0, -1));
  if (base.endsWith("돼") && base.length > 1) out.add(base.slice(0, -1));

  return Array.from(out).filter((x) => x && x.length >= 1);
}

function stripKoreanParticleEnding(token) {
  const t = String(token || "");
  if (!t) return "";

  // lightweight stem normalization for matching quality
  if (/(으로|에게|에서)$/.test(t) && t.length > 2) return t.slice(0, -2);
  if (/(은|는|이|가|을|를|의|에|로|와|과|도)$/.test(t) && t.length > 1) return t.slice(0, -1);
  return t;
}

function hasLikelyObjectParticle(normToken) {
  return /(을|를|에|에게|으로|로|와|과|도|의|에서|께|께서)$/.test(normToken || "");
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const qTitle = questions[0]?.title || "Chunk Translation";
  const inst = questions[0]?.instruction || "chunk 힌트를 참고해서 한국어 해석을 완성하세요.";
  const bigTitle = lessonTitle || "Pleks L3";
  const smallTitle = exerciseTitle || qTitle;

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:8px;">Pleks L3-E1</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">총 ${total}문제</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-size:14px; font-weight:900; color:#444; margin-bottom:2px;">${escapeHtml(bigTitle)}</div>
      <div style="font-size:13px; color:#555; margin-bottom:8px;">${escapeHtml(smallTitle)}</div>

      <div style="font-size:13px; line-height:1.65; color:#333;">
        1. 문장과 chunk를 확인합니다.<br/>
        2. 아래 한국어 token을 순서대로 눌러 해석을 완성합니다.<br/>
        3. chunk 관련 token은 미리 묶여서 제공됩니다.
      </div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106;">${escapeHtml(inst)}</div>

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

  selectedTokens = [];
  bankTokens = shuffleArray(
    q.groupedTokens.map((text, i) => ({
      id: `k${currentIndex}_${i}_${Math.random().toString(16).slice(2, 7)}`,
      text,
      isChunkToken: Array.isArray(q.chunkTokenIndices) && q.chunkTokenIndices.includes(i),
    }))
  );
  isLocked = false;

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${questions.length} (Q${q.qNumber})</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${escapeHtml(q.instruction || "(지시문 없음)")}</div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${renderMarkedSentenceHtml(q.sentenceMarkedSegments)}</div>

      <div style="margin-top:10px;">
        ${q.chunkEnglish ? `<span class="chunk-pill">${escapeHtml(q.chunkEnglish)}</span>` : ""}
        ${q.chunkKorean ? `<span class="chunk-pill">${escapeHtml(q.chunkKorean)}</span>` : ""}
      </div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div id="answer-line" class="token-wrap"></div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div id="bank-area" class="token-wrap"></div>
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

  renderTokenUI();
}

function renderTokenUI() {
  const answerLine = document.getElementById("answer-line");
  const bankArea = document.getElementById("bank-area");
  if (!answerLine || !bankArea) return;

  answerLine.innerHTML = "";
  if (!selectedTokens.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = "토큰을 눌러 해석 문장을 완성하세요.";
    answerLine.appendChild(placeholder);
  } else {
    selectedTokens.forEach((tok, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `token-btn answer${tok.isChunkToken ? " chunk" : ""}`;
      btn.textContent = tok.text;
      btn.disabled = isLocked;
      btn.title = "클릭하면 답안에서 제거";
      btn.addEventListener("click", () => {
        if (isLocked) return;
        const [moved] = selectedTokens.splice(idx, 1);
        if (moved) bankTokens.push(moved);
        renderTokenUI();
      });
      answerLine.appendChild(btn);
    });
  }

  bankArea.innerHTML = "";
  bankTokens.forEach((tok) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `token-btn bank${tok.isChunkToken ? " chunk" : ""}`;
    btn.textContent = tok.text;
    btn.disabled = isLocked;
    btn.addEventListener("click", () => {
      if (isLocked) return;
      const i = bankTokens.findIndex((x) => x.id === tok.id);
      if (i >= 0) {
        const [moved] = bankTokens.splice(i, 1);
        selectedTokens.push(moved);
      }
      renderTokenUI();
    });
    bankArea.appendChild(btn);
  });

}

function renderMarkedSentenceHtml(segments) {
  const segs = Array.isArray(segments) && segments.length
    ? segments
    : [{ text: "", marked: false }];

  return segs
    .map((seg) => {
      if (!seg?.marked) return escapeHtml(seg?.text || "");
      return `<span class="eng-chunk-mark">${escapeHtml(seg?.text || "")}</span>`;
    })
    .join("");
}

function submitCurrent() {
  const q = questions[currentIndex];
  if (!q || isLocked) return;

  const selectedSentence = selectedTokens.map((t) => t.text).join(" ").trim();
  const isCorrect = normalizeKoreanForCompare(selectedSentence) === q.answerNorm;

  if (!isCorrect) {
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L3-E1 / Q${q.qNumber}`,
      question: `${q.sentence} | chunk: ${q.chunkEnglish}${q.chunkKorean ? ` (= ${q.chunkKorean})` : ""}`,
      selected: selectedSentence || "무응답",
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
    word: `Pleks L3-E1 / Q${q.qNumber}`,
    question: `${q.sentence} | chunk: ${q.chunkEnglish}${q.chunkKorean ? ` (= ${q.chunkKorean})` : ""}`,
    selected: selectedSentence || "무응답",
    correct: true,
    modelAnswer: q.answerKorean,
  });

  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");

  if (nextBtn) nextBtn.disabled = false;
  if (submitBtn) submitBtn.disabled = true;

  renderTokenUI();
  showToast("ok", "정답!");
}

function goNext() {
  const q = questions[currentIndex];
  if (q && !isLocked) {
    const selectedSentence = selectedTokens.map((t) => t.text).join(" ").trim();
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L3-E1 / Q${q.qNumber}`,
      question: `${q.sentence} | chunk: ${q.chunkEnglish}${q.chunkKorean ? ` (= ${q.chunkKorean})` : ""}`,
      selected: selectedSentence || "무응답",
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
        word: `Pleks L3-E1 / Q${q.qNumber}`,
        question: `${q.sentence} | chunk: ${q.chunkEnglish}${q.chunkKorean ? ` (= ${q.chunkKorean})` : ""}`,
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

function tokenizeKorean(text) {
  return compactWhitespace(text).split(" ").filter(Boolean);
}

function normalizeKoreanToken(text) {
  return String(text || "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
}

function normalizeKoreanForCompare(text) {
  return String(text || "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
}

function compactWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
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
