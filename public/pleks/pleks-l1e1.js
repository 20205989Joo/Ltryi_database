// pleks-l1e1.js
// L1-E1: Block ordering quiz (Korean prompt -> English blocks reorder)

const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const DESC_FILE = "LTRYI-pleks-lesson-desc.xlsx";

const TARGET_LESSON = 1;
const TARGET_EXERCISE = 1;
const MAX_QUESTIONS = 0; // 0 = no limit
const FLEXIBLE_ADJACENT_SWAP_BY_QNUMBER = {
  // canonical block order index pairs (0-based)
  1: [[2, 3]], // in the 19th century <-> in the countryside
};

// doneinweb-compatible metadata
let subcategory = "Grammar";
let level = "Basic";
let day = "201";
let quizTitle = "quiz_Grammar_Basic_101";
let userId = "";

// runtime state
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
    const rawQuestion = String(r["Question"] ?? "").trim();
    const parsed = parseBlocksQuestion(rawQuestion);
    const qNumber = Number(r["QNumber"]) || idx + 1;
    const answerEnglish = String(r["Answer"] ?? "").trim();
    const canonicalBlocks = orderBlocksByAnswer(parsed.blocks, answerEnglish);
    const acceptedNormalizedAnswers = buildAcceptedNormalizedAnswers({
      qNumber,
      answerEnglish,
      canonicalBlocks,
    });

    return {
      no: idx + 1,
      qNumber,
      title: String(r["Title"] ?? "").trim(),
      instruction: String(r["Instruction"] ?? "").trim(),
      rawQuestion,
      answerEnglish,
      blocks: parsed.blocks,
      koreanPrompt: parsed.koreanPrompt,
      acceptedNormalizedAnswers,
    };
  });
}

function parseBlocksQuestion(raw) {
  const text = String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  let body = text;
  if (/^Blocks:/i.test(body)) {
    body = body.replace(/^Blocks:/i, "").trim();
  }

  let blocksPart = body;
  let koreanPrompt = "";

  const km = body.match(/Korean\s*:/i);
  if (km && typeof km.index === "number") {
    blocksPart = body.slice(0, km.index).trim();
    koreanPrompt = body.slice(km.index + km[0].length).trim();
  }

  const rawBlocks = blocksPart
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  const blocks = rawBlocks
    .map((s) => s.replace(/^(?:[\u2460-\u2473]|\d+[.)])\s*/u, "").trim())
    .filter(Boolean);

  return { blocks, koreanPrompt };
}

function orderBlocksByAnswer(blocks, answerEnglish) {
  const ans = String(answerEnglish || "").toLowerCase();
  const list = Array.isArray(blocks) ? blocks.slice() : [];
  const pos = [];

  for (const b of list) {
    const t = String(b || "").trim().toLowerCase();
    const p = ans.indexOf(t);
    if (p === -1) return null;
    pos.push({ p, text: b });
  }
  pos.sort((a, b) => a.p - b.p);
  return pos.map((x) => x.text);
}

function buildAcceptedNormalizedAnswers({ qNumber, answerEnglish, canonicalBlocks }) {
  const base = normalizeEnglishForCompare(answerEnglish);
  const set = new Set([base]);

  const swaps = FLEXIBLE_ADJACENT_SWAP_BY_QNUMBER[qNumber] || [];
  if (!Array.isArray(canonicalBlocks) || !canonicalBlocks.length || !swaps.length) {
    return Array.from(set);
  }

  for (const pair of swaps) {
    const i = Number(pair?.[0]);
    const j = Number(pair?.[1]);
    if (!Number.isInteger(i) || !Number.isInteger(j)) continue;
    if (i < 0 || j < 0 || i >= canonicalBlocks.length || j >= canonicalBlocks.length) continue;
    if (Math.abs(i - j) !== 1) continue;

    const alt = canonicalBlocks.slice();
    [alt[i], alt[j]] = [alt[j], alt[i]];
    const altSentence = alt.join(" ");
    set.add(normalizeEnglishForCompare(altSentence));
  }

  return Array.from(set);
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const qTitle = questions[0]?.title || "Block Ordering";
  const inst = questions[0]?.instruction || "영어 blocks의 순서를 맞게 배열하세요.";
  const bigTitle = lessonTitle || "Pleks L1";
  const smallTitle = exerciseTitle || qTitle;

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:8px;">Pleks L1-E1</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">총 ${total}문제</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-size:14px; font-weight:900; color:#444; margin-bottom:2px;">
        ${escapeHtml(bigTitle)}
      </div>
      <div style="font-size:13px; color:#555; margin-bottom:8px;">
        ${escapeHtml(smallTitle)}
      </div>

      <div style="font-size:13px; line-height:1.65; color:#333;">
        한국어 문장을 보고 영어 블록을 순서대로 조립하세요.<br/>
        정답일 때만 <b>다음</b> 버튼이 활성화됩니다.
      </div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106;">
        ${escapeHtml(inst)}
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

  selectedTokens = [];
  bankTokens = shuffleArray(
    q.blocks.map((text, i) => ({
      id: `b${currentIndex}_${i}_${Math.random().toString(16).slice(2, 7)}`,
      text,
    }))
  );
  isLocked = false;

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${questions.length} (Q${q.qNumber})</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${escapeHtml(q.koreanPrompt || "(한국어 문장 없음)")}</div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div id="answer-line" class="token-wrap"></div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div id="bank-area" class="token-wrap"></div>
      <div id="remain-info" style="margin-top:8px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78);"></div>
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
  const remainInfo = document.getElementById("remain-info");
  if (!answerLine || !bankArea || !remainInfo) return;

  if (window.PleksScramble?.render) {
    window.PleksScramble.render({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo,
      state: { selectedTokens, bankTokens, isLocked },
      onSelectToken: (tok) => {
        if (isLocked) return;
        const i = bankTokens.findIndex((x) => x.id === tok.id);
        if (i >= 0) {
          const [moved] = bankTokens.splice(i, 1);
          selectedTokens.push(moved);
        }
      },
      onUnselectLast: () => {
        if (isLocked) return;
        const popped = selectedTokens.pop();
        if (popped) bankTokens.push(popped);
      },
      rerender: renderTokenUI,
    });
    return;
  }

  // fallback renderer
  answerLine.innerHTML = "";
  if (!selectedTokens.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = "블록을 클릭해 문장을 조립하세요.";
    answerLine.appendChild(placeholder);
  } else {
    selectedTokens.forEach((tok, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "token-btn answer";
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
      renderTokenUI();
    });
    bankArea.appendChild(btn);
  });

  remainInfo.textContent = `남은 블록: ${bankTokens.length}개`;
}

function undoOne() {
  if (isLocked) return;
  const popped = selectedTokens.pop();
  if (popped) {
    bankTokens.push(popped);
    renderTokenUI();
  }
}

function clearAllSelected() {
  if (isLocked) return;
  if (!selectedTokens.length) return;
  bankTokens.push(...selectedTokens);
  selectedTokens = [];
  renderTokenUI();
}

function submitCurrent() {
  const q = questions[currentIndex];
  if (!q || isLocked) return;

  const selectedSentence = selectedTokens.map((t) => t.text).join(" ").trim();
  const selectedNorm = normalizeEnglishForCompare(selectedSentence);
  const accepted = Array.isArray(q.acceptedNormalizedAnswers) ? q.acceptedNormalizedAnswers : [];
  const isCorrect = accepted.length
    ? accepted.includes(selectedNorm)
    : selectedNorm === normalizeEnglishForCompare(q.answerEnglish);

  if (!isCorrect) {
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L1-E1 / Q${q.qNumber}`,
      question: q.koreanPrompt,
      selected: selectedSentence || "무응답",
      correct: false,
      modelAnswer: q.answerEnglish,
    });
    showToast("no", "오답...");
    return;
  }

  isLocked = true;
  upsertResult({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Pleks L1-E1 / Q${q.qNumber}`,
    question: q.koreanPrompt,
    selected: selectedSentence || "무응답",
    correct: true,
    modelAnswer: q.answerEnglish,
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
      word: `Pleks L1-E1 / Q${q.qNumber}`,
      question: q.koreanPrompt,
      selected: selectedSentence || "무응답",
      correct: false,
      modelAnswer: q.answerEnglish,
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
        word: `Pleks L1-E1 / Q${q.qNumber}`,
        question: q.koreanPrompt,
        selected: "무응답",
        correct: false,
        modelAnswer: q.answerEnglish,
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

  // final fallback
  const popup = document.getElementById("result-popup");
  const content = document.getElementById("result-content");
  if (!popup || !content) return;

  const total = ordered.length;
  const correct = ordered.filter((r) => r.correct).length;
  const score = total ? Math.round((correct / total) * 100) : 0;

  const rowsHtml = ordered
    .map((r) => {
      const badge = r.correct ? "O" : "X";
      return `
        <tr>
          <td style="padding:6px; border-bottom:1px solid #eee;">Q${r.qNumber}</td>
          <td style="padding:6px; border-bottom:1px solid #eee;">${badge}</td>
          <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.selected || "")}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:6px 6px 10px; border-bottom:1px solid #eee; font-size:12px; color:#555;">
            정답: ${escapeHtml(r.modelAnswer || "")}
          </td>
        </tr>
      `;
    })
    .join("");

  content.innerHTML = `
    <div style="font-weight:900; font-size:18px; color:#7e3106; margin-bottom:8px;">결과</div>
    <div style="font-size:13px; margin-bottom:8px;">
      총 ${total}문제 / 정답 ${correct}문제 / 점수 ${score}점
    </div>
    <div style="max-height:300px; overflow-y:auto; border:1px solid #eee; border-radius:8px;">
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="background:#faf6ef;">
            <th style="padding:6px; text-align:left;">문항</th>
            <th style="padding:6px; text-align:left;">채점</th>
            <th style="padding:6px; text-align:left;">내 답</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div class="btn-row" style="margin-top:10px;">
      <button class="quiz-btn" onclick="restartQuiz()">다시하기</button>
      <button class="quiz-btn" onclick="closePopup()">닫기</button>
    </div>
  `;

  popup.style.display = "flex";
}

function restartQuiz() {
  window.location.reload();
}

function closePopup() {
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

let toastTimer = null;
function showToast(type, message) {
  if (window.PleksToastFX?.show) {
    window.PleksToastFX.show(type, message);
    return;
  }

  const host = document.getElementById("cafe_int") || document.body;
  if (!host) return;

  let box = document.getElementById("mini-toast");
  if (!box) {
    box = document.createElement("div");
    box.id = "mini-toast";
    box.style.cssText = `
      position:absolute;
      left:50%;
      top:10px;
      transform:translateX(-50%);
      padding:6px 10px;
      border-radius:8px;
      color:white;
      font-weight:900;
      font-size:12px;
      z-index:9999;
      opacity:0;
      transition:opacity .18s ease;
      pointer-events:none;
    `;
    host.appendChild(box);
  }

  box.textContent = message;
  box.style.background = type === "ok" ? "#2d8a34" : "#c3442d";
  box.style.opacity = "1";

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    box.style.opacity = "0";
  }, 900);
}

function normalizeEnglishForCompare(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/[.!?]\s*$/, "")
    .trim();
}

function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i--) {
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
