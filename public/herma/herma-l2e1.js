// ver1.1_26.02.22
// herma-l2e1.js
// ------------------------------------------------------------
// L2-E1
// 1단계: 공통된 부분 약분
// 2단계: 영어 정답 타이핑 시 자동 전환
// 3단계: 해석 순서 맞추기 + 제출
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 2;
const TARGET_EXERCISE = 1;

let subcategory = "Grammar";
let level = "Basic";
let day = "105";
let quizTitle = "quiz_Grammar_Basic_105";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;

// {} 약분 대상 토큰 인덱스(1-base)
let requiredIdxSet = new Set();
let fadedIdxSet = new Set();

// stage
let reduced = false;
let translateMode = false;     // 영어 정답 후 자동 진입한 해석 단계
let englishAutoDone = false;

// 해석(단어뱅크) 상태
let bankTokens = [];
let selectedTokens = [];
let revealedTranslate = false;
let isKoLocked = false;

window.addEventListener("DOMContentLoaded", async () => {
  applyQueryParams();
  wireBackButton();
  injectStyles();
  if (window.HermaToastFX) window.HermaToastFX.init({ hostId: "cafe_int", top: 10 });

  try {
    rawRows = await loadExcelRows(EXCEL_FILE);
  } catch (e) {
    console.error(e);
    alert("엑셀 파일을 불러오지 못했습니다.\n" + EXCEL_FILE);
    return;
  }

  buildQuestionsFromRows();
  renderIntro();
});

function toastOk(msg) {
  if (!window.HermaToastFX) return;
  try { window.HermaToastFX.show("ok", String(msg || "")); } catch (_) {}
}

function toastNo(msg) {
  if (!window.HermaToastFX) return;
  try { window.HermaToastFX.show("no", String(msg || "")); } catch (_) {}
}

/** ================== Params / Nav ================== */
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

/** ================== Styles ================== */
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --uA: rgba(241,123,42,0.95);
      --uB: rgba(70,120,255,0.95);
    }
    .tok{ cursor:pointer; user-select:none; }
    .tok.uA, .tok.uB, .uA, .uB{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 5px;
    }
    .tok.uA, .uA{ text-decoration-color: var(--uA); }
    .tok.uB, .uB{ text-decoration-color: var(--uB); }
    .tok.pre{
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight: 900;
    }
    .instPre{
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight: 900;
    }
    .tok.faded{
      opacity: 0.22 !important;
      text-decoration: line-through !important;
      filter: blur(0.2px) !important;
    }
    .tok.nope{
      box-shadow: inset 0 0 0 1px rgba(200, 40, 40, 0.22);
      background: rgba(200, 40, 40, 0.05);
    }

    .hint-pill{
      display:inline-block;
      font-size:12px;
      background: rgba(255, 208, 90, 0.45);
      border:1px solid rgba(160, 110, 0, 0.22);
      color:#7e3106;
      padding:6px 10px;
      border-radius:999px;
      font-weight:900;
      margin-top:8px;
    }
    .hint-inline{
      display:inline-block;
      padding:2px 10px;
      border-radius:999px;
      background: rgba(255, 208, 90, 0.45);
      border: 1px solid rgba(160, 110, 0, 0.22);
      color:#7e3106;
      font-weight:900;
    }

    .answer-wrap{
      display:flex;
      gap:10px;
      align-items:flex-end;
      background:#fff;
      border:1px solid #e9c7a7;
      border-radius:14px;
      padding:10px 12px;
      box-shadow: 0 1px 0 rgba(0,0,0,0.03) inset;
      margin-top:10px;
    }
    textarea.eng{
      width:100%;
      border:none;
      outline:none;
      background:transparent;
      resize:vertical;
      font-size:14px;
      line-height:1.5;
      padding:0;
      margin:0;
      min-height:72px;
    }

    .answer-line{
      min-height:44px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.10);
      background:#fff;
      line-height:1.6;
      font-size:15px;
    }
    .pill-btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:8px 10px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      font-weight:800;
      font-size:14px;
      cursor:pointer;
      user-select:none;
      margin:6px 6px 0 0;
    }
    .pill-btn:disabled{ opacity:0.35; cursor:not-allowed; }

    .ok{ font-weight:900; font-size:18px; color:#2e7d32; text-align:center; }
    .no{ font-weight:900; font-size:18px; color:#c62828; text-align:center; }

    .ab-title{ font-weight:900; color:#7e3106; margin-bottom:6px; }
    /* 번역 모드에서 A/B 숨김 */
    .hidden{ display:none !important; }
  `;
  document.head.appendChild(style);
}

/** ================== Load Excel ================== */
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

/** ================== Build Questions ================== */
function buildQuestionsFromRows() {
  const filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]) );

  questions = filtered.map((r, idx) => {
    const qNumber = Number(r["QNumber"]) || idx + 1;
    const title = String(r["Title"] ?? "").trim();
    const instruction = String(r["Instruction"] ?? "").trim();
    const questionRaw = String(r["Question"] ?? "").trim();
    const answerRaw = String(r["Answer"] ?? "").trim();
    const transformsRaw =
      String(r["Transforms"] ?? r["Transform"] ?? r["TransformMap"] ?? "").trim();
    const laststageFinalRaw =
      String(r["Laststage-FinalSentence"] ?? r["LaststageFinalSentence"] ?? "").trim();
    const laststageKRTokensRaw =
      String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();

    const { english, korean, koreanTagged } = splitEnglishKorean(answerRaw);
    const { stem, hint } = splitStemAndHint(questionRaw);
    const { A, B } = splitABStem(stem);

    return {
      qNumber, title, instruction, questionRaw,
      stem, A, B, hint,
      transformsRaw,
      laststageFinalSentence: laststageFinalRaw,
      laststageKRTokens: laststageKRTokensRaw,
      answerRaw, englishAnswer: english, koreanAnswer: korean, koreanTagged,
    };
  });
}

function splitStemAndHint(questionRaw) {
  const s = String(questionRaw || "").trim();
  const arrowIdx = s.lastIndexOf("→");
  if (arrowIdx === -1) return { stem: s, hint: "" };
  const stem = s.slice(0, arrowIdx).trim();
  const hintRaw = s.slice(arrowIdx + 1).trim();
  const hint = hintRaw.replace(/[{}]/g, "").trim();
  return { stem, hint };
}

function splitEnglishKorean(answerRaw) {
  const s = String(answerRaw || "").trim();
  if (!s) return { english: "", korean: "", koreanTagged: "" };

  if (s.includes("||")) {
    const parts = s.split("||");
    const english = stripTrailingPeriod((parts[0] || "").trim());
    const koreanTagged = (parts.slice(1).join("||") || "").trim();
    return { english, korean: stripABMarkers(koreanTagged), koreanTagged };
  }

  const firstKor = s.search(/[가-힣]/);
  if (firstKor === -1) {
    const english = stripTrailingPeriod(stripABMarkers(s));
    return { english, korean: "", koreanTagged: "" };
  }

  const englishRaw = s.slice(0, firstKor).trim();
  const koreanTagged = s.slice(firstKor).trim();
  const english = stripTrailingPeriod(stripABMarkers(englishRaw));
  const korean = stripABMarkers(koreanTagged);
  return { english, korean, koreanTagged };
}

function splitABStem(stem) {
  const s = String(stem || "").trim();
  const aPos = s.search(/A\.\s*/i);
  const bPos = s.search(/B\.\s*/i);

  if (aPos === -1) return { A: "", B: s };

  if (bPos !== -1 && bPos > aPos) {
    const afterA = s.slice(aPos).replace(/^A\.\s*/i, "");
    const A = afterA.slice(0, Math.max(0, bPos - aPos)).replace(/B\.\s*$/i, "").trim();
    const B = s.slice(bPos).replace(/^B\.\s*/i, "").trim();
    return { A, B };
  }
  return { A: s.replace(/^A\.\s*/i, "").trim(), B: "" };
}

/** ================== UI ================== */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L2-E1";
  const instruction = "공통된 부분을 약분하고 한 문장으로 합쳐 해석해보세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L2-E1</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>

      <div style="font-size:13px; line-height:1.6; color:#333;">
        • 1단계: 공통된 부분을 약분해보세요.<br/>
        • 2단계: 영어 문장을 완성하면 자동으로 다음 단계로 넘어갑니다.<br/>
        • 3단계: 해석 순서를 맞춘 뒤 제출하세요.
      </div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106;">
        📝 지시문: ${escapeHtml(instruction)}
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
  renderQuestion();
}

function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  isAnswered = false;
  reduced = false;
  translateMode = false;
  englishAutoDone = false;
  revealedTranslate = false;
  isKoLocked = false;

  fadedIdxSet = new Set();
  requiredIdxSet = new Set();
  bankTokens = [];
  selectedTokens = [];

  const tokensA = tokenizeStarAndBrace(q.A);
  const aMax = getMaxIdx(tokensA);
  const tokensB = tokenizeStarAndBrace(q.B).map(t => ({ ...t, idx: t.idx ? (t.idx + aMax) : 0 }));

  for (const t of [...tokensA, ...tokensB]) {
    if (!t.isSpace && t.isReq) requiredIdxSet.add(String(t.idx));
  }

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" id="reduce-inst-box" style="margin-bottom:10px;">
      <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">${buildReduceInstructionHtmlL2E1()}</div>
    </div>

    <!-- A/B 영역 (번역 모드 들어가면 숨김) -->
    <div class="box" id="ab-block">
      <div class="ab-title">문장 A</div>
      <div class="sentence" id="sentence-a"></div>

      <div class="ab-title" style="margin-top:10px;">문장 B</div>
      <div class="sentence" id="sentence-b"></div>
    </div>

    <!-- 약분 완료 후에만 보이는 영역 -->
    <div class="box hidden" id="after-reduce">
      <div id="hint-area">
        <div class="hint-pill">${escapeHtml(`힌트: ${getHintWord(q.hint || "who/that")}`)}</div>
      </div>

      <div id="english-block" style="margin-top:10px;">
        <div class="answer-wrap">
          <textarea id="user-english" class="eng" rows="3" placeholder="한 문장으로 합쳐보세요! ex) I met a girl who was crying"></textarea>
          <div style="flex:0 0 auto; font-weight:900; font-size:22px; color:#7e3106; padding-bottom:2px;">.</div>
        </div>
      </div>
    </div>

    <!-- 번역 UI (영어 정답 시 자동 진입) -->
    <div id="translate-block" class="hidden">
      <div class="box" style="margin-bottom:10px;">
        <div class="sentence" id="plain-english-line"></div>
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
    </div>

    <div id="stage-action-row" class="btn-row" style="margin-top:12px; display:none;">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  const sa = document.getElementById("sentence-a");
  const sb = document.getElementById("sentence-b");
  if (sa) sa.innerHTML = buildSentenceHTML(tokensA, "A");
  if (sb) sb.innerHTML = buildSentenceHTML(tokensB, "B");

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  const actionRow = document.getElementById("stage-action-row");
  if (actionRow) actionRow.style.display = "none";

  const onClickToken = (ev) => {
    const el = ev.target.closest("[data-idx]");
    if (!el) return;

    const idx = el.getAttribute("data-idx");
    const isReq = el.getAttribute("data-req") === "1";
    if (!idx) return;

    if (!isReq) {
      el.classList.add("nope");
      setTimeout(() => el.classList.remove("nope"), 120);
      return;
    }

    el.classList.toggle("faded");
    if (el.classList.contains("faded")) fadedIdxSet.add(idx);
    else fadedIdxSet.delete(idx);

    if (!reduced && requiredIdxSet.size > 0 && isAllRequiredFaded()) {
      reduced = true;
      revealAfterReduce();
    }
  };

  if (sa) sa.addEventListener("click", onClickToken);
  if (sb) sb.addEventListener("click", onClickToken);

  // 영어 입력 자동 판정
  const engEl = document.getElementById("user-english");
  if (engEl) {
    engEl.addEventListener("input", () => {
      autoCheckEnglish(false);
    });
    engEl.addEventListener("blur", () => {
      autoCheckEnglish(true);
    });
  }

  function revealAfterReduce() {
    toastOk("1단계 완료!");
    const reduceInstBox = document.getElementById("reduce-inst-box");
    collapseUpAndRemove(reduceInstBox);

    const afterReduce = document.getElementById("after-reduce");
    if (afterReduce) afterReduce.classList.remove("hidden");

    if (engEl) engEl.focus();
  }

  function autoCheckEnglish(isBlur) {
    if (!reduced || englishAutoDone || !engEl) return;

    const userRaw = (engEl.value || "").trim();
    if (!userRaw) return;

    const user = stripTrailingPeriod(userRaw);
    const model = stripTrailingPeriod(q.englishAnswer);
    const isCorrect = (user === model);

    if (isCorrect) {
      englishAutoDone = true;
      engEl.disabled = true;
      toastOk("정답!");
      setTimeout(() => enterTranslateMode(), 420);
      return;
    }

    if (isBlur) toastNo("오답…");
  }

  function enterTranslateMode() {
    if (translateMode) return;
    if (!englishAutoDone) return;
    translateMode = true;

    // 1) A/B 숨김
    const ab = document.getElementById("ab-block");
    if (ab) ab.classList.add("hidden");

    const afterReduce = document.getElementById("after-reduce");
    if (afterReduce) afterReduce.classList.add("hidden");

    // 2) 한 문장으로 쓰기 블록을 위로 올리기: "after-reduce"를 A/B 자리 위로 이동
    // (A/B가 hidden이라 사실상 맨 위로 보이게 됨)
    // 3) 번역 UI 표시
    const tb = document.getElementById("translate-block");
    if (tb) tb.classList.remove("hidden");

    const plainLine = document.getElementById("plain-english-line");
    if (plainLine) {
      const userRaw = (engEl?.value || "").trim();
      const base = stripTrailingPeriod(userRaw || q.englishAnswer || "");
      const configuredFinalParts = parseLaststageFinalSentenceForL2E1(q.laststageFinalSentence);
      if (configuredFinalParts.length) {
        plainLine.innerHTML = renderConfiguredFinalSentenceForL2E1(configuredFinalParts);
      } else {
        plainLine.innerHTML = buildMergedLineHTML(base, getHintWord(q.hint || "who/that"));
      }
    }

    // 4) 번역 UI 구성
    revealTranslate(q);

    const actionRow = document.getElementById("stage-action-row");
    if (actionRow) actionRow.style.display = "flex";
    const submit = document.getElementById("submit-btn");
    if (submit) submit.disabled = false;
  }
}

function getMaxIdx(tokens) {
  let m = 0;
  for (const t of tokens) {
    if (!t.isSpace && t.idx > m) m = t.idx;
  }
  return m;
}

function isAllRequiredFaded() {
  for (const idx of requiredIdxSet) {
    if (!fadedIdxSet.has(String(idx))) return false;
  }
  return true;
}

/** ================== Word Bank ================== */
function revealTranslate(q) {
  revealedTranslate = true;
  isKoLocked = false;

  const configuredKorTokens = parseLaststageKRTokensForL2E1(String(q?.laststageKRTokens || "").trim());
  if (configuredKorTokens.length) {
    bankTokens = shuffleArray(configuredKorTokens.map((t, i) => ({
      id: `t${i}_${t.text}`,
      text: t.text,
      role: mapKRTokensSegToRoleForL2E1(t.seg),
    })));
  } else {
    const taggedPlan = tokenizeKoreanTaggedForBox(String(q?.koreanTagged || "").trim());
    if (taggedPlan.length) {
      bankTokens = shuffleArray(taggedPlan.map((t, i) => ({
        id: `t${i}_${t.text}`,
        text: t.text,
        role: t.role || null,
      })));
    } else {
      const koreanAnswer = String(q?.koreanAnswer || "").trim();
      const correctTokens = tokenizeKorean(koreanAnswer);
      const splitAt = estimateKorSplitIndex(q, correctTokens.length);
      bankTokens = shuffleArray(correctTokens.map((t, i) => ({
        id: `t${i}_${t}`,
        text: t,
        role: i < splitAt ? "A" : "B",
      })));
    }
  }
  selectedTokens = [];

  renderBankAndAnswer();
}

function renderBankAndAnswer() {
  const bankArea = document.getElementById("bank-area");
  const answerLine = document.getElementById("answer-line");
  const remainInfo = document.getElementById("remain-info");
  const guideHtml = "\uC870\uAC01\uC744 \uB20C\uB7EC \uC21C\uC11C\uB300\uB85C \uCC44\uC6CC\uC8FC\uC138\uC694.<br>\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4.";
  if (!bankArea || !answerLine || !remainInfo) return;

  if (window.HermaFinalStage?.renderKoreanScramble) {
    const handled = window.HermaFinalStage.renderKoreanScramble({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo,
      selectedTokens: selectedTokens,
      bankTokens: bankTokens,
      isKoLocked: isKoLocked,
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
      decorateToken: (el, tok) => {
        if (!el || !tok) return;
        if (tok.role === "A") el.classList.add("uA");
        if (tok.role === "B") el.classList.add("uB");
      },
      rerender: () => renderBankAndAnswer(),
      guideHtml
    });
    if (handled) return;
  }

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
      decorateToken: (el, tok) => {
        if (!el || !tok) return;
        if (tok.role === "A") el.classList.add("uA");
        if (tok.role === "B") el.classList.add("uB");
      },
      rerender: () => renderBankAndAnswer(),
    });
    return;
  }

  remainInfo.textContent = `남은 조각: ${bankTokens.length}개`;
  answerLine.textContent = selectedTokens.map((x) => x.text).join(" ");
  bankArea.innerHTML = "";
  bankTokens.forEach((tok) => {
    const btn = document.createElement("button");
    btn.className = `pill-btn ${tok.role === "A" ? "uA" : "uB"}`;
    btn.type = "button";
    btn.textContent = tok.text;
    btn.disabled = isKoLocked;

    btn.addEventListener("click", () => {
      if (isKoLocked) return;
      const idx = bankTokens.findIndex((x) => x.id === tok.id);
      if (idx >= 0) {
        const [moved] = bankTokens.splice(idx, 1);
        selectedTokens.push(moved);
        renderBankAndAnswer();
      }
    });

    bankArea.appendChild(btn);
  });
}

/** ================== Submit / Next ================== */
function submitAnswer() {
  if (!translateMode) {
    toastNo("영어 문장을 먼저 완성하세요.");
    return;
  }
  if (isAnswered) return;

  const q = questions[currentIndex];

  const engEl = document.getElementById("user-english");
  const userEngRaw = (engEl?.value || "").trim();
  const userEng = stripTrailingPeriod(userEngRaw);
  const userKor = selectedTokens.length ? selectedTokens.map((x) => x.text).join(" ") : "";
  const englishCorrect = userEng === stripTrailingPeriod(String(q.englishAnswer || ""));
  const koreanCorrect = normalizeKorean(userKor) === normalizeKorean(q.koreanAnswer);
  const correct = !!englishCorrect && !!koreanCorrect;

  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";

  if (!correct) {
    toastNo("오답…");
    return;
  }

  isAnswered = true;

  results.push({
    no: currentIndex + 1,
    word: `Herma L2-E1 / Q${q.qNumber}`,
    selected: `${userEngRaw || "무응답"} || ${userKor || "무응답"}`,
    correct,
    question: q.questionRaw,
    englishAnswer: q.englishAnswer,
    koreanAnswer: q.koreanAnswer,
    hint: q.hint || "",
  });

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  if (engEl) engEl.disabled = true;
  isKoLocked = true;
  renderBankAndAnswer();
  toastOk("정답!");
}

function goNext() {
  if (!isAnswered) {
    const q = questions[currentIndex];
    results.push({
      no: currentIndex + 1,
      word: `Herma L2-E1 / Q${q.qNumber}`,
      selected: "무응답 || 무응답",
      correct: false,
      question: q.questionRaw,
      englishAnswer: q.englishAnswer,
      koreanAnswer: q.koreanAnswer,
      hint: q.hint || "",
    });
  }

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

/** ================== Result Popup ================== */
function showResultPopup() {
  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const resultObject = {
    quiztitle: quizTitle,
    subcategory, level, day,
    teststatus: "done",
    course: "herma",
    lesson: TARGET_LESSON,
    exercise: TARGET_EXERCISE,
    userId: userId || "",
    testspecific: results,
  };

  localStorage.setItem("QuizResults", JSON.stringify(resultObject));

  const popup = document.getElementById("result-popup");
  const content = document.getElementById("result-content");
  if (!popup || !content) return alert(`완료! 점수: ${score}점 (${correctCount}/${total})`);

  const rows = results.map(r => `
    <tr>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.no}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.word)}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(trimForTable(r.selected))}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.correct ? "⭕" : "❌"}</td>
    </tr>
  `).join("");

  content.innerHTML = `
    <div style="font-weight:900; font-size:16px; margin-bottom:8px;">📄 전체 결과</div>
    <div style="margin-bottom:10px; font-size:14px;">
      점수: <b>${score}점</b> (${correctCount} / ${total})
    </div>

    <div style="max-height:260px; overflow-y:auto; margin-bottom:14px;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f6f6f6;">
            <th style="padding:6px; border-bottom:1px solid #ccc;">번호</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">문항</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 답(영어||해석)</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">정답</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" onclick="restartQuiz()">🔁 재시험</button>
      <button class="quiz-btn" onclick="closePopup()">닫기</button>
    </div>
  `;

  popup.style.display = "flex";
}

function restartQuiz(){ window.location.reload(); }
function closePopup(){
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

/** ================== Tokenize (*...* and {...}) ================== */
function tokenizeStarAndBrace(input) {
  const s = String(input || "");
  let mode = "normal"; // normal | star | brace
  const out = [];
  let buf = "";

  const flush = () => {
    if (!buf) return;
    out.push({ text: buf, mode });
    buf = "";
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "*") { flush(); mode = (mode === "star") ? "normal" : "star"; continue; }
    if (ch === "{") { flush(); mode = "brace"; continue; }
    if (ch === "}") { flush(); mode = "normal"; continue; }
    buf += ch;
  }
  flush();

  const tokens = [];
  let idx = 0;
  for (const seg of out) {
    const parts = seg.text.split(/(\s+)/);
    for (const p of parts) {
      if (p === "") continue;
      const isSpace = /^\s+$/.test(p);
      if (isSpace) tokens.push({ text: p, isSpace:true, isPre:false, isReq:false, idx:0 });
      else {
        idx += 1;
        tokens.push({ text: p, isSpace:false, isPre: seg.mode==="star", isReq: seg.mode==="brace", idx });
      }
    }
  }
  return tokens;
}

function buildSentenceHTML(tokens, role) {
  return tokens.map(t => {
    if (t.isSpace) return escapeHtml(t.text);
    const cls = ["tok"];
    if (t.isPre) cls.push("pre");
    if (role === "A") cls.push("uA");
    if (role === "B") cls.push("uB");
    const req = t.isReq ? "1" : "0";
    return `<span class="${cls.join(" ")}" data-idx="${t.idx}" data-req="${req}">${escapeHtml(t.text)}</span>`;
  }).join("");
}

/** ================== Korean Tokenize / Normalize ================== */
function tokenizeKorean(kor){
  const s = String(kor || "").trim();
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}

function tokenizeKoreanTaggedForBox(korTagged) {
  const s = String(korTagged || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1");
  if (!s) return [];

  const segs = [];
  let mode = null; // a | b | null
  let buf = "";

  const flush = () => {
    if (!buf) return;
    segs.push({ text: buf, mode });
    buf = "";
  };

  for (let i = 0; i < s.length; i++) {
    if (s.startsWith("<a>", i)) { flush(); mode = "a"; i += 2; continue; }
    if (s.startsWith("</a>", i)) { flush(); mode = null; i += 3; continue; }
    if (s.startsWith("<b>", i)) { flush(); mode = "b"; i += 2; continue; }
    if (s.startsWith("</b>", i)) { flush(); mode = null; i += 3; continue; }
    buf += s[i];
  }
  flush();

  const out = [];
  for (const seg of segs) {
    const txt = String(seg.text || "")
      .replace(/\s+([.,!?])/g, "$1")
      .trim();
    if (!txt) continue;
    const parts = txt.split(/\s+/).filter(Boolean);
    for (const p of parts) {
      out.push({
        text: p,
        role: seg.mode === "a" ? "A" : (seg.mode === "b" ? "B" : null),
      });
    }
  }
  return out;
}

function normalizeKorean(s){
  return String(s || "").trim().replace(/\s+/g," ").replace(/[.。!?]+$/g,"").trim();
}

function getHintWord(hintRaw){
  const raw = String(hintRaw || "").trim();
  if (!raw) return "who";
  const first = raw.split("/")[0].trim();
  return first || raw;
}

function normalizeEnToken(w){
  return String(w || "").toLowerCase().replace(/[^a-z']/g, "");
}

function splitByHint(sentence, hintWord){
  const s = stripTrailingPeriod(sentence || "");
  const words = s.split(/\s+/).filter(Boolean);
  const target = normalizeEnToken(hintWord);
  const idx = words.findIndex((w) => normalizeEnToken(w) === target);
  if (idx === -1) {
    return { found: false, before: s, hint: hintWord, after: "" };
  }
  return {
    found: true,
    before: words.slice(0, idx).join(" "),
    hint: words[idx],
    after: words.slice(idx + 1).join(" "),
  };
}

function buildMergedLineHTML(sentence, hintWord){
  const s = stripTrailingPeriod(sentence || "");
  if (!s) return "";

  const p = splitByHint(s, hintWord);
  if (!p.found) {
    return `<span class="uA">${escapeHtml(s)}</span>.`;
  }

  const chunks = [];
  if (p.before) chunks.push(`<span class="uA">${escapeHtml(p.before)}</span>`);
  chunks.push(`<span class="hint-inline">${escapeHtml(p.hint)}</span>`);
  if (p.after) chunks.push(`<span class="uB">${escapeHtml(p.after)}</span>`);
  return `${chunks.join(" ")}.`;
}

function parseLaststageFinalSentenceForL2E1(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];

  let tagged = false;
  const out = [];
  parts.forEach((part) => {
    const m = part.match(/^(plain|a|b|c|ab|pair|link|linkbox|hint)\s*::\s*(.+)$/i);
    if (m) {
      tagged = true;
      out.push({ seg: String(m[1] || "").toLowerCase(), text: String(m[2] || "").trim() });
      return;
    }
    out.push({ seg: "plain", text: part });
  });

  if (!tagged) return [];
  return out.filter((x) => x.text);
}

function mapFinalSegClassForL2E1(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "uA";
  if (s === "b" || s === "c") return "uB";
  if (s === "link" || s === "linkbox" || s === "hint") return "hint-inline";
  return "";
}

function renderConfiguredFinalSentenceForL2E1(parts) {
  const chunks = parts.map((part) => {
    const text = String(part?.text || "").trim();
    if (!text) return "";
    const cls = mapFinalSegClassForL2E1(part.seg);
    if (!cls) return escapeHtml(text);
    return `<span class="${cls}">${escapeHtml(text)}</span>`;
  }).filter(Boolean);
  if (!chunks.length) return "";
  return `${chunks.join(" ")}.`;
}

function parseLaststageKRTokensForL2E1(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const tokens = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!tokens.length) return [];

  let tagged = false;
  const out = [];
  tokens.forEach((token) => {
    const m = token.match(/^(plain|a|b|c|ab|pair)\s*::\s*(.+)$/i);
    if (m) {
      tagged = true;
      out.push({ text: String(m[2] || "").trim(), seg: String(m[1] || "").toLowerCase() });
      return;
    }
    out.push({ text: token, seg: "plain" });
  });

  if (!tagged) return [];
  return out.filter((x) => x.text);
}

function mapKRTokensSegToRoleForL2E1(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "A";
  if (s === "b" || s === "c") return "B";
  return null;
}

function estimateKorSplitIndex(q, korCount){
  if (!Number.isFinite(korCount) || korCount <= 1) return Math.max(0, korCount);

  const english = stripTrailingPeriod(String(q?.englishAnswer || ""));
  const hint = getHintWord(q?.hint || "who");
  const p = splitByHint(english, hint);

  let ratio = 0.5;
  if (p.found) {
    const aWords = p.before ? p.before.split(/\s+/).filter(Boolean).length : 0;
    const bWords = p.after ? p.after.split(/\s+/).filter(Boolean).length : 0;
    const total = aWords + bWords;
    if (total > 0) ratio = aWords / total;
  } else {
    const aWords = String(q?.A || "").split(/\s+/).filter(Boolean).length;
    const bWords = String(q?.B || "").split(/\s+/).filter(Boolean).length;
    const total = aWords + bWords;
    if (total > 0) ratio = aWords / total;
  }

  const idx = Math.round(korCount * ratio);
  return Math.max(1, Math.min(korCount - 1, idx));
}

/** ================== Utils ================== */
function stripTrailingPeriod(s){
  return String(s || "").trim().replace(/\.\s*$/,"").trim();
}
function stripABMarkers(s){
  return String(s || "")
    .replace(/<\/?(a|b)>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
function shuffleArray(arr){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function collapseUpAndRemove(el, ms = 240){
  if (!el || !el.parentElement) return;
  if (el.dataset.collapsing === "1") return;
  el.dataset.collapsing = "1";

  const h = Math.max(1, Math.round(el.offsetHeight || 1));
  el.style.overflow = "hidden";
  el.style.transformOrigin = "bottom center";
  el.style.height = `${h}px`;

  try {
    el.animate(
      [
        { transform: "translateY(0px) scaleY(1)", opacity: 1, height: `${h}px` },
        { transform: "translateY(-8px) scaleY(0.04)", opacity: 0, height: "0px" },
      ],
      { duration: ms, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );
  } catch (_) {}

  setTimeout(() => {
    if (el && el.parentElement) el.remove();
  }, ms + 20);
}
function trimForTable(s){
  const t = String(s || "");
  return t.length>70 ? t.slice(0,70)+"..." : t;
}

function buildReduceInstructionHtmlL2E1() {
  const text = "\uACF5\uD1B5\uB41C \uBD80\uBD84\uC744 \uC57D\uBD84\uD574\uBCF4\uC138\uC694!";
  const key = "\uACF5\uD1B5\uB41C \uBD80\uBD84";
  const escText = escapeHtml(text);
  const escKey = escapeHtml(key);
  if (!escText.includes(escKey)) return escText;
  return escText.replace(escKey, `<span class="instPre">${escKey}</span>`);
}
