// herma-l1e1.js
// ------------------------------------------------------------
// Herma L1-E1
// 1단계: A/B 문장 + 힌트 → 합친 문장 타이핑
//   - 엄격 채점(끝 온점(.)만 무시)
//   - 정답 되는 순간 토스트(OK) + 자동 2단계 이동
//   - 오답은 blur시에만 토스트(NO) (너무 시끄럽지 않게)
//
// 2단계: 해석 박스(조각 순서 맞추기)
//   - 구두점은 "조각으로 분리하지 않음" (앞 단어에 붙임)
//   - 버튼 0개(되돌리기/전체삭제 없음)
//     · 선택된 마지막 조각을 누르면 pop되어 뱅크로 복귀
//   - 제출 눌렀을 때:
//     · 오답이면 토스트(NO)만 띄우고 "다시 수정 가능"(disable 안 함)
//     · 정답이면 토스트(OK) 띄우고 그때만 잠그고 "다음" 활성화
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 1;
const TARGET_EXERCISE = 1;
const MAX_QUESTIONS = 25; // 0이면 제한 없음

/** doneinweb 호환 메타 */
let subcategory = "Grammar";
let level = "Basic";
let day = "101";
let quizTitle = "quiz_Grammar_Basic_101";
let userId = "";

/** 상태 */
let rawRows = [];
let questions = [];
let currentIndex = 0;
let results = [];

let stage = "compose"; // compose | translate
let currentRecord = null;

let lastEnCorrect = false;
let autoTransitioned = false;

let bankTokens = [];
let selectedTokens = [];
let correctKo = "";
let isKoLocked = false;

window.addEventListener("DOMContentLoaded", async () => {
  if (window.HermaToastFX) window.HermaToastFX.init({ hostId: "cafe_int", top: 10 });

  applyQueryParams();
  wireBackButton();

  try {
    rawRows = await loadExcelRows(EXCEL_FILE);
  } catch (e) {
    console.error(e);
    alert("엑셀 파일을 불러오지 못했습니다. 파일명/경로를 확인하세요.\n" + EXCEL_FILE);
    return;
  }

  buildQuestionsFromRows();
  renderIntro();
});

/** ===== query params ===== */
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

/** ===== back ===== */
function wireBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;
  backBtn.addEventListener("click", () => history.back());
}

/** ===== excel load ===== */
async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();

  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return rows.filter((r) => !isRowAllEmpty(r));
}

function isRowAllEmpty(row) {
  const keys = Object.keys(row || {});
  if (!keys.length) return true;
  return keys.every((k) => String(row[k] ?? "").trim() === "");
}

/** ===== build questions ===== */
function buildQuestionsFromRows() {
  let filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  if (MAX_QUESTIONS > 0) filtered = filtered.slice(0, MAX_QUESTIONS);

  questions = filtered.map((r, idx) => {
    const rawQ = String(r["Question"] ?? "").trim();
    const rawA = String(r["Answer"] ?? "").trim();
    const inst = String(r["Instruction"] ?? "").trim();
    const title = String(r["Title"] ?? "").trim();

    const parsed = parseL1E1Question(rawQ);

    return {
      no: idx + 1,
      qNumber: Number(r["QNumber"]) || idx + 1,
      title,
      instruction: inst,
      rawQuestion: rawQ,
      modelAnswer: rawA,
      modelEnglish: extractEnglish(rawA),
      modelKorean: extractKorean(rawA),
      A: parsed.A,
      B: parsed.B,
      hint: parsed.hint,
    };
  });
}

function parseL1E1Question(raw) {
  const text = String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  let main = text;
  let hint = "";
  const arrowIdx = text.lastIndexOf("→");
  if (arrowIdx !== -1) {
    main = text.slice(0, arrowIdx).trim();
    hint = text.slice(arrowIdx + 1).trim();
  }

  let A = "";
  let B = "";

  const aPos = main.search(/A\.\s*/i);
  const bPos = main.search(/B\.\s*/i);

  if (aPos === -1) return { A: "", B: text, hint };

  if (bPos !== -1 && bPos > aPos) {
    const afterA = main.slice(aPos).replace(/^A\.\s*/i, "");
    A = afterA.slice(0, Math.max(0, bPos - aPos)).replace(/B\.\s*$/i, "").trim();
    B = main.slice(bPos).replace(/^B\.\s*/i, "").trim();
  } else {
    A = main.replace(/^A\.\s*/i, "").trim();
    B = "";
  }

  return { A: A.trim(), B: B.trim(), hint };
}

/** ===== intro ===== */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = questions[0]?.title || "Herma L1-E1";
  const instruction = questions[0]?.instruction || "두 문장을 이어서 한 문장으로 써보고, 해석해보세요";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L1-E1</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">총 ${total}문제</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">
        ${escapeHtml(title)}
      </div>

      <div style="font-size:13px; line-height:1.6; color:#333;">
        • 1단계는 정답이 되는 순간 <b>자동으로</b> 해석 단계로 넘어갑니다.<br/>
        • 해석 단계는 <b>오답이면 다시 수정</b> 가능합니다.<br/>
        • 해석 정답일 때만 <b>다음</b>이 활성화됩니다.
      </div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106;">
        📝 ${escapeHtml(instruction)}
      </div>

      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">🚀 시작</button>
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
  renderComposeStage();
}

/** ==================== 1단계: compose ==================== */
function renderComposeStage() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  stage = "compose";
  lastEnCorrect = false;
  autoTransitioned = false;
  currentRecord = null;

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${questions.length} (Q${q.qNumber})</div>

    <div class="box" style="margin-bottom:10px;">
      <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">문장 A</div>
      <div class="sentence">${escapeHtml(q.A || "(파싱 실패)")}</div>

      <div style="font-weight:900; color:#7e3106; margin-top:10px; margin-bottom:6px;">문장 B</div>
      <div class="sentence">${escapeHtml(q.B || q.rawQuestion)}</div>

      <div style="margin-top:10px;">
        <span class="pill">힌트: ${escapeHtml(q.hint || "—")}</span>
      </div>
    </div>

    <div style="
      display:flex;
      gap:10px;
      align-items:flex-end;
      background:#fff;
      border:1px solid #e9c7a7;
      border-radius:14px;
      padding:10px 12px;
      box-shadow: 0 1px 0 rgba(0,0,0,0.03) inset;
    ">
      <textarea id="user-en" rows="3"
        style="
          width:100%;
          border:none;
          outline:none;
          background:transparent;
          resize:vertical;
          font-size:14px;
          line-height:1.5;
          padding:0;
          margin:0;
        "
        placeholder="한 문장으로 합쳐서 쓰세요"></textarea>

      <div style="flex:0 0 auto; font-weight:900; font-size:22px; color:#7e3106; padding-bottom:2px;">.</div>
    </div>

    <div class="btn-row" style="margin-top:12px;">
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>
  `;

  const enEl = document.getElementById("user-en");
  if (enEl) {
    enEl.addEventListener("input", () => autoGradeEnglish(false));
    enEl.addEventListener("blur", () => autoGradeEnglish(true));
  }
}

function autoGradeEnglish(isBlur) {
  if (autoTransitioned) return;

  const q = questions[currentIndex];
  const inputEl = document.getElementById("user-en");
  const nextBtn = document.getElementById("next-btn");
  if (!q || !inputEl) return;

  const userRaw = (inputEl.value || "").trim();
  if (!userRaw) {
    lastEnCorrect = false;
    return;
  }

  const userForCompare = stripTrailingPeriod(userRaw);
  const modelForCompare = stripTrailingPeriod(q.modelEnglish);
  const isCorrect = (userForCompare === modelForCompare);

  const prev = lastEnCorrect;
  lastEnCorrect = !!isCorrect;

  if (isCorrect && !prev) {
    autoTransitioned = true;

    if (nextBtn) nextBtn.disabled = true;
    inputEl.disabled = true;

    if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
    setTimeout(() => goTranslateAuto(userRaw), 520);
    return;
  }

  // 오답 토스트는 blur일 때만(난사 방지)
  if (!isCorrect && isBlur) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
  }
}

function goTranslateAuto(userEnRaw) {
  const q = questions[currentIndex];

  currentRecord = {
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Herma L1-E1 / Q${q.qNumber}`,
    question: q.rawQuestion,
    modelEnglish: q.modelEnglish,
    modelKorean: q.modelKorean,
    selectedEn: (userEnRaw || "").trim(),
    correctEn: true,
    selectedKo: "",
    correctKo: false,
    correct: false,
    modelAnswer: q.modelAnswer
  };

  renderTranslateStage();
}

/** ==================== 2단계: translate ==================== */
function renderTranslateStage() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  stage = "translate";
  isKoLocked = false;

  correctKo = String(q.modelKorean || "").trim();
  selectedTokens = [];

  // ✅ 구두점은 앞 단어에 붙인 채로 토큰화
  const toks = tokenizeKoreanForBox(correctKo);
  bankTokens = shuffleArray(toks).map((t, i) => ({
    id: `k${i}_${Math.random().toString(16).slice(2, 6)}`,
    text: t
  }));

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${questions.length} (Q${q.qNumber})</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${escapeHtml((currentRecord?.selectedEn || "").trim() ? (currentRecord.selectedEn.trim() + ".") : "(무응답)")}</div>
    </div>

    <div class="sentence" id="answer-line" style="
      min-height:86px;
      display:flex;
      flex-wrap:wrap;
      align-items:flex-start;
      gap:6px;
    "></div>

    <div class="box" style="margin-top:10px;">
      <div id="bank-area"></div>
      <div id="remain-info" style="margin-top:8px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78);"></div>
    </div>

    <div class="btn-row" style="margin-top:12px;">
      <button class="quiz-btn" id="submit-ko-btn" onclick="submitKorean()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="reveal-area" style="margin-top:12px;"></div>
  `;

  // ✅ 정답 전엔 다음 비활성
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = true;

  renderTranslateUI();
}

function renderTranslateUI() {
  const answerLine = document.getElementById("answer-line");
  const bankArea = document.getElementById("bank-area");
  const remainInfo = document.getElementById("remain-info");

  if (window.HermaKRScramble?.render) {
    window.HermaKRScramble.render({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo,
      state: { selectedTokens, bankTokens, isKoLocked },
      onSelectToken: (tok) => {
        if (isKoLocked) return;
        const idx = bankTokens.findIndex((x) => x.id === tok.id);
        if (idx >= 0) {
          const [moved] = bankTokens.splice(idx, 1);
          selectedTokens.push(moved);
        }
      },
      onUnselectLast: () => {
        if (isKoLocked) return;
        const popped = selectedTokens.pop();
        if (popped) bankTokens.push(popped);
      },
      rerender: () => renderTranslateUI(),
    });
    return;
  }

  if (remainInfo) remainInfo.textContent = `남은 조각: ${bankTokens.length}개`;
}

function submitKorean() {
  const q = questions[currentIndex];
  const userKo = selectedTokens.map(t => t.text).join(" ").trim();

  const koOk =
    normalizeKoreanForCompare(userKo) === normalizeKoreanForCompare(correctKo);

  // ✅ 오답이면: 토스트만, 잠그지 말고 그대로 재도전
  if (!koOk) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답… 다시!");
    return;
  }

  // ✅ 정답이면: 그때만 확정/잠금 + 다음 활성화
  if (isKoLocked) return;
  isKoLocked = true;

  if (!currentRecord) {
    currentRecord = {
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Herma L1-E1 / Q${q.qNumber}`,
      question: q.rawQuestion,
      modelEnglish: q.modelEnglish,
      modelKorean: q.modelKorean,
      selectedEn: "(정답이었음)",
      correctEn: true,
      modelAnswer: q.modelAnswer
    };
  }

  currentRecord.selectedKo = userKo || "무응답";
  currentRecord.correctKo = true;
  currentRecord.correct = true;

  // ✅ 정답일 때 1번만 저장
  results.push({
    no: currentRecord.no,
    word: currentRecord.word,
    selected: currentRecord.selectedEn,
    correct: true,
    qNumber: currentRecord.qNumber,
    selectedKo: currentRecord.selectedKo,
    correctEn: true,
    correctKo: true,
    modelEnglish: currentRecord.modelEnglish,
    modelKorean: currentRecord.modelKorean,
    question: currentRecord.question,
    modelAnswer: currentRecord.modelAnswer
  });

  // UI: 정답일 때만 submit 잠그고 next 풀기
  const submitBtn = document.getElementById("submit-ko-btn");
  if (submitBtn) submitBtn.disabled = true;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;

  renderTranslateUI();

  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
}

/** ===== next ===== */
function goNext() {
  const q = questions[currentIndex];

  // compose에서 스킵
  if (stage === "compose") {
    const inputEl = document.getElementById("user-en");
    const userRaw = (inputEl?.value || "").trim();

    const userForCompare = stripTrailingPeriod(userRaw);
    const modelForCompare = stripTrailingPeriod(q.modelEnglish);
    const enOk = (userRaw.length > 0 && userForCompare === modelForCompare);

    results.push({
      no: results.length + 1,
      word: `Herma L1-E1 / Q${q.qNumber}`,
      selected: userRaw || "무응답",
      correct: false,
      qNumber: q.qNumber,
      selectedKo: "무응답",
      correctEn: !!enOk,
      correctKo: false,
      modelEnglish: q.modelEnglish,
      modelKorean: q.modelKorean,
      question: q.rawQuestion,
      modelAnswer: q.modelAnswer
    });
  }

  // translate에서 "정답 확정 없이" 다음 누르는 경우(원칙상 next disabled라 거의 없음)
  if (stage === "translate" && !isKoLocked) {
    results.push({
      no: results.length + 1,
      word: `Herma L1-E1 / Q${q.qNumber}`,
      selected: currentRecord?.selectedEn || "(정답이었음)",
      correct: false,
      qNumber: q.qNumber,
      selectedKo: "무응답",
      correctEn: true,
      correctKo: false,
      modelEnglish: q.modelEnglish,
      modelKorean: q.modelKorean,
      question: q.rawQuestion,
      modelAnswer: q.modelAnswer
    });
  }

  currentIndex++;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderComposeStage();
}

/** ===== result popup ===== */
function showResultPopup() {
  if (window.DishQuizResultsTable?.show) {
    window.DishQuizResultsTable.show({
      results,
      quizTitle,
      subcategory,
      level,
      day,
      passScore: 80,
    });
    return;
  }

  alert("결과표 모듈이 로드되지 않았습니다.");
}

function restartQuiz() { window.location.reload(); }
function closePopup() {
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

/** ===== utils ===== */
function extractEnglish(modelAnswer) {
  const s = String(modelAnswer || "").trim();
  const idx = s.search(/[가-힣]/);
  return (idx === -1 ? s : s.slice(0, idx)).trim();
}

function extractKorean(modelAnswer) {
  const s = String(modelAnswer || "").trim();
  const idx = s.search(/[가-힣]/);
  return (idx === -1 ? "" : s.slice(idx)).trim();
}

function stripTrailingPeriod(s) {
  return String(s || "").trim().replace(/\.\s*$/, "").trim();
}

/**
 * ✅ 해석박스용 토큰화
 * - 구두점은 앞 단어에 붙인다(단독 토큰 금지)
 */
function tokenizeKoreanForBox(kor) {
  const s = String(kor || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1"); // 구두점은 앞 단어에 붙임

  if (!s) return [];
  return s.split(" ").filter(Boolean);
}

function normalizeKoreanForCompare(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1");
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
