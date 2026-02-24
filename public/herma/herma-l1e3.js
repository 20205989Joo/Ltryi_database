// ver1.1_26.02.22
// herma-l1e3.js
// ------------------------------------------------------------
// L1-E3: 공통 분모 약분하기 (+ 병렬 찾기 2단계 + 1-1 토스트/해석박스)
// 1단계(약분): *...* 힌트 강조, {...} 클릭해서 faded
// 2단계(병렬 찾기): anchor(주황 밑줄) / and(or)=금색 / target도 주황 밑줄(같은 레벨)
// 3단계(해석): 상단 문장을 "약분된 상태"로 표시 + 1-1 해석박스 UI (군더더기 제목/정답표시 없음)
// - 단계 전환은 stage-host 내용을 교체(아래에 붙이지 않음)
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 1;
const TARGET_EXERCISE = 3;

let subcategory = "Grammar";
let level = "Basic";
let day = "103";
let quizTitle = "quiz_Grammar_Basic_103";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];

let stage = "intro"; // intro | reduce | pair | translate

// stage1 state
let curTokens = [];
let requiredIdxSet = new Set();
let fadedIdxSet = new Set();

// stage2 targets
let pairAnchorIdx = null;
let pairTargetIdx = null;
let conjIdx = null;

// stage3 translate state (1-1 스타일)
let wbBank = [];
let wbPicked = [];
let wbLocked = false; // 정답 후 잠금
let correctKo = "";

window.addEventListener("DOMContentLoaded", async () => {  var __r2_guard = (new URLSearchParams(window.location.search || "")).get("round2") === "1";
  if (__r2_guard) return;
  applyQueryParams();
  wireBackButton();
  injectStyles();

  // ✅ 1-1 토스트 init (이게 빠져있었음)
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

/** ================== Toast (1-1 방식만) ================== */
function toastOk(msg){
  if (window.HermaToastFX) window.HermaToastFX.show("ok", String(msg||""));
}
function toastNo(msg){
  if (window.HermaToastFX) window.HermaToastFX.show("no", String(msg||""));
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

/** ================== Styles (추가만, 기존 톤 유지) ================== */
function injectStyles() {
  if (window.hermaStylePacks) {
    window.hermaStylePacks.ensure(["core"]);
  }
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --brown:#7e3106;
      --gold:#d5a22a;
      --uline: rgba(241,123,42,0.95);
    }

    /* *...* 하이라이트 */
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

    /* {} 아닌 걸 눌렀을 때 */
/* 병렬(같은 레벨): 둘 다 주황 밑줄 */
    .tok.pairA{
      background: rgba(241,123,42,0.12) !important;
      box-shadow: inset 0 0 0 1px rgba(241,123,42,0.20) !important;
      font-weight: 900 !important;

      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-decoration-color: var(--uline);
      text-underline-offset: 6px;
    }

    /* and / or 금색 */
    .tok.pairLink{
      color: var(--gold) !important;
      font-weight: 950 !important;
    }

    /* 1-2의 연결 하이라이트 톤과 동일 */
    .linkGold{
      background:rgba(213,162,42,0.20);
      box-shadow:inset 0 0 0 1px rgba(213,162,42,0.25);
      border-radius:6px;
      padding:0 3px;
      font-weight:900;
    }

    /* 3단계 한국어 병렬 대응 강조 */
    .koPair{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-decoration-color: var(--uline);
      text-underline-offset: 4px;
      box-shadow: inset 0 -0.34em 0 rgba(241,123,42,0.14);
    }

    /* 상단 문장: 클릭/호버 비활성 */
    .sentence.readonly .tok{ cursor: default !important; }
    .sentence.readonly .tok:hover{ transform:none !important; filter:none !important; }
  `;
  document.head.appendChild(style);
}

/** ================== Excel ================== */
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

function buildQuestionsFromRows() {
  const filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  questions = filtered.map((r, idx) => {
    const qNumber = Number(r["QNumber"]) || idx + 1;
    const title = String(r["Title"] ?? "").trim();
    const instruction = String(r["Instruction"] ?? "").trim();
    const questionRaw = String(r["Question"] ?? "").trim();
    const answerRaw = String(r["Answer"] ?? "").trim();
    const transformRaw =
      String(r["Transforms"] ?? r["Transform"] ?? r["TransformMap"] ?? "").trim();
    const laststageFinalRaw =
      String(r["Laststage-FinalSentence"] ?? r["LaststageFinalSentence"] ?? "").trim();
    const laststageKRTokensRaw =
      String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();
    const korean = parseKoreanOnly(answerRaw);
    return {
      qNumber,
      title,
      instruction,
      questionRaw,
      korean,
      transformsRaw: transformRaw,
      transformMeta: parseTransformsMetaL1E3(transformRaw),
      laststageFinalSentence: laststageFinalRaw,
      laststageKRTokens: laststageKRTokensRaw
    };
  });
}

function parseTransformsMetaL1E3(raw) {
  const s = String(raw || "").trim();
  if (!s) return {};
  const out = {};
  const parts = s.split(/[;|]/).map((x) => x.trim()).filter(Boolean);
  parts.forEach((part) => {
    const eq = part.indexOf("=");
    if (eq <= 0) return;
    const k = part.slice(0, eq).trim().toLowerCase();
    const v = part.slice(eq + 1).trim();
    if (!v) return;
    out[k] = v;
  });
  return out;
}

function parseKoreanOnly(answerRaw) {
  const s = String(answerRaw || "").trim();
  const sepMatch = s.match(/[|｜]/);
  if (!sepMatch) return s;
  return s.slice(sepMatch.index + 1).trim();
}

/** ================== UI Shell ================== */
function renderIntro() {
  stage = "intro";
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L1-E3";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L1-E3</div>
      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>
      <div style="font-size:13px; line-height:1.6; color:#333;">
        • <b>노란 부분(*...*)</b>은 힌트(강조)입니다.<br/>
        • <b>중복 표현({..})</b>을 눌러 약분(흐리게)하세요.<br/>
        • 완료되면 <b>병렬(짝) 찾기</b> → <b>해석 순서</b>로 갑니다.
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
  renderQuestionShell();
  enterReduceStage();
}

function renderQuestionShell() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div id="stage-host"></div>

    <div class="btn-row" style="margin-top:12px;">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  // 초기: 다음은 무조건 잠금(1-1 방식)
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = true;
}

function setStageContent(html) {
  const host = document.getElementById("stage-host");
  if (!host) return;
  host.innerHTML = html;
}

/** ================== Stage 1: Reduce ================== */
function enterReduceStage() {
  stage = "reduce";

  fadedIdxSet = new Set();
  requiredIdxSet = new Set();

  pairAnchorIdx = null;
  pairTargetIdx = null;
  conjIdx = null;

  wbBank = [];
  wbPicked = [];
  wbLocked = false;
  correctKo = "";

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  curTokens = tokenizeStarAndBrace(q.questionRaw);
  for (const t of curTokens) {
    if (!t.isSpace && t.isReq) requiredIdxSet.add(String(t.idx));
  }

  setStageContent(`
    <div class="box" id="reduce-inst-box" style="margin-bottom:10px;">
      <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">
        ${buildReduceInstructionHtmlL1E3(q)}
      </div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence" id="sentence-area"></div>
      <div style="margin-top:10px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78); line-height:1.5;">
        \uB3D9\uC77C\uD55C \uB2E8\uC5B4\uB97C \uCC3E\uC544\uC11C \uB20C\uB7EC\uBCF4\uC138\uC694!
      </div>
    </div>
  `);

  const sentenceArea = document.getElementById("sentence-area");
  sentenceArea.innerHTML = buildSentenceHTML(curTokens);

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";

  sentenceArea.onclick = (ev) => {
    if (stage !== "reduce") return;
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

    if (requiredIdxSet.size > 0 && isAllRequiredFaded()) {
      toastOk("1단계 완료!");
      enterPairStage();
    }
  };
}

function isAllRequiredFaded() {
  for (const idx of requiredIdxSet) {
    if (!fadedIdxSet.has(String(idx))) return false;
  }
  return true;
}

/** ================== Stage 2: Pair ================== */
function enterPairStage() {
  stage = "pair";

  const q = questions[currentIndex] || {};
  const meta = q.transformMeta || {};

  const conjIdxConfigured = Number(meta.conjidx || meta.conj_idx || 0) || 0;
  const anchorIdxConfigured = Number(meta.pairanchoridx || meta.pair_anchor_idx || 0) || 0;
  const targetIdxConfigured = Number(meta.pairtargetidx || meta.pair_target_idx || 0) || 0;

  conjIdx = isValidWordIndex(curTokens, conjIdxConfigured)
    ? conjIdxConfigured
    : findConjunctionWordIdx(curTokens);

  if (isValidWordIndex(curTokens, anchorIdxConfigured) && isValidWordIndex(curTokens, targetIdxConfigured)) {
    pairAnchorIdx = anchorIdxConfigured;
    pairTargetIdx = targetIdxConfigured;
  } else {
    const pair = computePairTargets(curTokens, conjIdx);
    pairAnchorIdx = pair.anchorIdx;
    pairTargetIdx = pair.targetIdx;
  }

  setStageContent(`
    <div class="box" style="margin-bottom:10px;">
      <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">
        🔎 병렬(짝) 찾기
      </div>
      <div style="font-size:13px; line-height:1.55; color:#333; margin-bottom:10px;">
        <b>주황 밑줄</b>과 같은 레벨의 단어를 <b>뒤쪽</b>에서 찾아 눌러보세요.
      </div>
      <div class="sentence" id="pair-sentence"></div>
    </div>
  `);

  const sentenceArea = document.getElementById("pair-sentence");
  sentenceArea.innerHTML = buildSentenceHTML(curTokens, {
    forceFadedReq: true,
    decorate: (tok) => {
      const cls = [];
      if (!tok.isSpace) {
        if (tok.idx === pairAnchorIdx) cls.push("pairA");
        if (tok.idx === conjIdx) cls.push("pairLink");
      }
      return cls;
    }
  });

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";

  sentenceArea.onclick = (ev) => {
    if (stage !== "pair") return;
    const el = ev.target.closest("[data-idx]");
    if (!el) return;

    const idx = Number(el.getAttribute("data-idx") || 0);
    if (!idx) return;

    if (idx !== pairTargetIdx) {
      el.classList.add("nope");
      setTimeout(() => el.classList.remove("nope"), 120);
      return;
    }

    el.classList.add("pairA");
    toastOk("2단계 완료!");
    setTimeout(() => enterTranslateStage(), 120);
  };
}

/** ================== Stage 3: Translate (✅ 1-1 그대로) ================== */
function enterTranslateStage() {
  stage = "translate";
  wbLocked = false;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  const reducedTokens = removeReqTokens(curTokens);

  // ✅ '정답문장' '해석순서' 같은 제목 전부 없음. (1-1처럼 구성만)
  setStageContent(`
    <div class="box" style="margin-bottom:10px;">
      <div class="sentence readonly" id="reduced-sentence"></div>
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
  `);

  // 상단 약분 문장 표시(데이터 우선: Laststage-FinalSentence)
  const reducedEl = document.getElementById("reduced-sentence");
  const configuredFinalParts = parseLaststageFinalSentenceL1E3(q.laststageFinalSentence);
  if (reducedEl) {
    if (configuredFinalParts.length) {
      reducedEl.innerHTML = renderConfiguredFinalSentenceL1E3(configuredFinalParts);
    } else {
      reducedEl.innerHTML = buildSentenceHTML(reducedTokens, {
        decorate: (tok) => {
          const cls = [];
          if (!tok.isSpace) {
            if (tok.idx === pairAnchorIdx) cls.push("pairA");
            if (tok.idx === pairTargetIdx) cls.push("pairA");
            if (tok.idx === conjIdx) cls.push("linkGold");
          }
          return cls;
        }
      });
    }
  }

  // 버튼 상태(1-1처럼)
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = false;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = true;

  // ✅ 1-1처럼: 오답/정답 텍스트 박스 출력 없음
  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";

  // 1-1 방식 뱅크 세팅(데이터 우선: Laststage-KRTokens)
  wbPicked = [];
  const configuredKorTokens = parseLaststageKRTokensL1E3(q.laststageKRTokens);
  if (configuredKorTokens.length) {
    correctKo = configuredKorTokens.map((x) => x.text).join(" ").trim();
    wbBank = shuffleArray(
      configuredKorTokens.map((t, i) => ({
        id: `k${i}_${Math.random().toString(16).slice(2, 6)}`,
        text: t.text,
        koPair: isPairSegL1E3(t.seg)
      }))
    );
  } else {
    correctKo = String(q.korean || "").trim();
    const toks = tokenizeKoreanForBox(correctKo);
    const koPairIdxSet = computeKoPairTokenIndexes(toks);
    wbBank = shuffleArray(
      toks.map((t, i) => ({
        id: `k${i}_${Math.random().toString(16).slice(2, 6)}`,
        text: t,
        koPair: koPairIdxSet.has(i),
      }))
    );
  }

  renderTranslateUI();
}

function isValidWordIndex(tokens, idx) {
  const n = Number(idx || 0);
  if (!n) return false;
  return !!tokens.find((t) => !t.isSpace && Number(t.idx) === n);
}

function renderTranslateUI() {
  const answerLine = document.getElementById("answer-line");
  const bankArea = document.getElementById("bank-area");
  const remainInfo = document.getElementById("remain-info");
  const guideHtml = "\uC870\uAC01\uC744 \uB20C\uB7EC \uC21C\uC11C\uB300\uB85C \uCC44\uC6CC\uC8FC\uC138\uC694.<br>\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4.";

  if (window.HermaFinalStage?.renderKoreanScramble) {
    const handled = window.HermaFinalStage.renderKoreanScramble({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo,
      selectedTokens: wbPicked,
      bankTokens: wbBank,
      isKoLocked: wbLocked,
      onSelectToken: (tok) => {
        if (wbLocked) return;
        const idx = wbBank.findIndex((x) => x.id === tok.id);
        if (idx >= 0) {
          const [moved] = wbBank.splice(idx, 1);
          wbPicked.push(moved);
        }
      },
      onUnselectLast: () => {
        if (wbLocked) return;
        const popped = wbPicked.pop();
        if (popped) wbBank.push(popped);
      },
      decorateToken: (el, tok) => {
        if (tok?.koPair) el.classList.add("koPair");
      },
      rerender: () => renderTranslateUI(),
      guideHtml
    });
    if (handled) return;
  }

  if (window.HermaKRScramble?.render) {
    window.HermaKRScramble.render({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo,
      state: { selectedTokens: wbPicked, bankTokens: wbBank, isKoLocked: wbLocked },
      onSelectToken: (tok) => {
        if (wbLocked) return;
        const idx = wbBank.findIndex((x) => x.id === tok.id);
        if (idx >= 0) {
          const [moved] = wbBank.splice(idx, 1);
          wbPicked.push(moved);
        }
      },
      onUnselectLast: () => {
        if (wbLocked) return;
        const popped = wbPicked.pop();
        if (popped) wbBank.push(popped);
      },
      decorateToken: (el, tok) => {
        if (tok?.koPair) el.classList.add("koPair");
      },
      rerender: () => renderTranslateUI(),
    });
    return;
  }

  if (remainInfo) remainInfo.textContent = `남은 조각: ${wbBank.length}개`;
}

function submitAnswer() {
  if (stage !== "translate") return;
  if (wbLocked) return;

  const q = questions[currentIndex];

  const userKo = wbPicked.map(x => x.text).join(" ").trim();
  const koOk =
    normalizeKoreanForCompare(userKo) === normalizeKoreanForCompare(correctKo);

  // ✅ 오답: 토스트만 (정답 표시/박스 출력 없음)
  if (!koOk) {
    toastNo("오답… 다시!");
    return;
  }

  // ✅ 정답: 잠금 + 다음 활성 (정답 텍스트 박스 출력 없음)
  wbLocked = true;
  renderTranslateUI();

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;

  toastOk("정답!");

  // 문항당 1번만 저장 (정답 시점)
  results.push({
    no: currentIndex + 1,
    word: `Herma L1-E3 / Q${q.qNumber}`,
    selected: userKo || "무응답",
    correct: true,
    question: q.questionRaw,
    answer: q.korean,
    pair: { conjIdx, anchorIdx: pairAnchorIdx, targetIdx: pairTargetIdx }
  });
}

function goNext() {
  // 1-1처럼: 정답 전엔 못 넘어감
  if (stage !== "translate") return;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn && nextBtn.disabled) return;

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();

  renderQuestionShell();
  enterReduceStage();
}

/** ================== Result Popup ================== */
function showResultPopup() {
  if (window.DishQuizResultsTable?.show) {
    window.DishQuizResultsTable.show({
      results,
      quizTitle,
      subcategory,
      level,
      day,
    });
    return;
  }

  alert("??? ??? ???? ?????.");
}

/** ================== Pair logic ================== */
function computePairTargets(tokens, conjWordIdx) {
  const words = getWordList(tokens);

  const end1 = conjWordIdx ? (conjWordIdx - 1) : words.length;
  const start2 = conjWordIdx ? (conjWordIdx + 1) : 1;

  const clause1 = words.filter(w => w.idx >= 1 && w.idx <= end1);
  const clause2 = words.filter(w => w.idx >= start2 && w.idx <= words.length);

  const req2 = clause2.filter(w => w.isReq);
  const req2Start = req2.length ? req2[0].idx : null;
  const req2End = req2.length ? req2[req2.length - 1].idx : null;

  const pre1 = clause1.filter(w => w.isPre);
  let commonEnd1 = pre1.length ? pre1[pre1.length - 1].idx : 0;

  const rem1 = clause1.filter(w => w.idx > commonEnd1);
  const rem2 = clause2.filter(w => (req2End ? w.idx > req2End : true));

  const n1 = rem1.map(w => normWord(w.text));
  const n2 = rem2.map(w => normWord(w.text));

  let k = 0;
  while (k < n1.length && k < n2.length && n1[k] && n1[k] === n2[k]) k++;

  let anchorIdx = rem1[k]?.idx ?? rem1[0]?.idx ?? clause1[0]?.idx ?? 1;
  let targetIdx = rem2[k]?.idx ?? rem2[0]?.idx ?? clause2[0]?.idx ?? (conjWordIdx ? conjWordIdx + 1 : 1);

  if (req2End && targetIdx >= req2Start && targetIdx <= req2End) {
    const after = clause2.find(w => w.idx > req2End);
    if (after) targetIdx = after.idx;
  }

  return { anchorIdx, targetIdx };
}

function findConjunctionWordIdx(tokens) {
  const words = getWordList(tokens);
  for (const w of words) {
    const t = normWord(w.text);
    if (t === "and" || t === "or") return w.idx;
  }
  return null;
}

/** ================== Tokenize / Render ================== */
function tokenizeStarAndBrace(src) {
  const s = String(src || "");
  const segs = [];
  let preMode = false;
  let reqMode = false;
  let buf = "";

  const flush = () => {
    if (!buf) return;
    segs.push({ text: buf, isPre: preMode, isReq: reqMode });
    buf = "";
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "*") { flush(); preMode = !preMode; continue; }
    if (ch === "{") { flush(); reqMode = true; continue; }
    if (ch === "}") { flush(); reqMode = false; continue; }
    buf += ch;
  }
  flush();

  const tokens = [];
  let idx = 0;

  for (const seg of segs) {
    const pieces = seg.text.match(/\s+|[^\s]+/g) || [];
    for (const p of pieces) {
      if (p === "") continue;
      if (/\s+/.test(p)) tokens.push({ isSpace: true, raw: p });
      else {
        idx += 1;
        tokens.push({
          isSpace: false,
          idx,
          text: p,
          isPre: !!seg.isPre,
          isReq: !!seg.isReq
        });
      }
    }
  }
  return tokens;
}

function buildSentenceHTML(tokens, opts = {}) {
  const forceFadedReq = !!opts.forceFadedReq;
  const decorate = typeof opts.decorate === "function" ? opts.decorate : null;

  return tokens.map(t => {
    if (t.isSpace) return escapeHtml(t.raw);

    const cls = ["tok"];
    if (t.isPre) cls.push("pre");
    if (forceFadedReq && t.isReq) cls.push("faded");

    if (decorate) {
      const more = decorate(t) || [];
      more.forEach(c => cls.push(c));
    }

    const reqAttr = t.isReq ? "1" : "0";
    return `<span class="${cls.join(" ")}" data-idx="${t.idx}" data-req="${reqAttr}">${escapeHtml(t.text)}</span>`;
  }).join("");
}

function removeReqTokens(tokens) {
  const out = [];
  for (const t of tokens) {
    if (!t.isSpace && t.isReq) continue;
    out.push({ ...t, isReq: false });
  }

  const cleaned = [];
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    if (t.isSpace) {
      if (!cleaned.length) continue;
      const prev = cleaned[cleaned.length - 1];
      if (prev.isSpace) continue;
      cleaned.push({ isSpace: true, raw: " " });
    } else {
      cleaned.push(t);
    }
  }
  if (cleaned.length && cleaned[cleaned.length - 1].isSpace) cleaned.pop();
  return cleaned;
}

function parseLaststageFinalSentenceL1E3(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];

  let tagged = false;
  const out = [];
  parts.forEach((part) => {
    const m = part.match(/^(plain|pair|link|a|b|c)\s*::\s*(.+)$/i);
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

function renderConfiguredFinalSentenceL1E3(parts) {
  const arr = Array.isArray(parts) ? parts : [];
  return arr.map((part, idx) => {
    const seg = String(part?.seg || "").toLowerCase();
    const text = String(part?.text || "");
    if (!text) return "";

    if (seg === "link" || seg === "c") return `<span class="tok linkGold">${escapeHtml(text)}</span>`;
    if (seg === "pair" || seg === "a" || seg === "b") return `<span class="tok pairA">${escapeHtml(text)}</span>`;

    // 시작 위치의 plain + 다음 pair 조합은 한 덩어리로 보이게(예: I washed)
    const nextSeg = String(arr[idx + 1]?.seg || "").toLowerCase();
    if (seg === "plain" && idx === 0 && (nextSeg === "pair" || nextSeg === "a" || nextSeg === "b")) {
      return `<span class="tok pairA">${escapeHtml(text)}</span>`;
    }

    return escapeHtml(text);
  }).join(" ");
}

function parseLaststageKRTokensL1E3(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];

  let tagged = false;
  const out = [];
  parts.forEach((part) => {
    const m = part.match(/^(pair|plain|a|b|c)\s*::\s*(.+)$/i);
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

function isPairSegL1E3(seg) {
  const s = String(seg || "").toLowerCase();
  return s === "pair" || s === "a" || s === "b";
}

function buildReduceInstructionHtmlL1E3(q) {
  const text = String(q?.instruction || "\uAC15\uC870\uB41C \uBD80\uBD84\uC744 \uC57D\uBD84\uD574\uC11C \uD574\uC11D\uD574\uBCF4\uC138\uC694").trim();
  const key = "\uAC15\uC870\uB41C \uBD80\uBD84";
  const escText = escapeHtml(text);
  const escKey = escapeHtml(key);
  if (!escText.includes(escKey)) return escText;
  return escText.replace(escKey, `<span class="instPre">${escKey}</span>`);
}

/** ================== Korean bank (✅ 1-1 방식) ================== */
function tokenizeKoreanForBox(kor) {
  const s = String(kor || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1"); // 구두점은 앞 단어에 붙임

  if (!s) return [];
  return s.split(" ").filter(Boolean);
}

function computeKoPairTokenIndexes(tokens) {
  const out = new Set();
  if (!Array.isArray(tokens) || !tokens.length) return out;

  const clean = tokens.map((t) =>
    String(t || "").trim().replace(/[.,!?;:]+$/g, "")
  );

  const standalone = new Set(["그리고", "하고", "고", "또는", "혹은", "거나", "및"]);
  const attachRe = /(하고|아서|어서|고|서|거나)$/;

  let conjIdx = -1;
  let attached = false;

  for (let i = 0; i < clean.length - 1; i++) {
    if (standalone.has(clean[i])) {
      conjIdx = i;
      attached = false;
      break;
    }
  }
  if (conjIdx === -1) {
    for (let i = 0; i < clean.length - 1; i++) {
      const w = clean[i];
      if (w.length >= 2 && attachRe.test(w)) {
        conjIdx = i;
        attached = true;
        break;
      }
    }
  }

  if (conjIdx === -1) {
    out.add(0);
    if (tokens.length > 1) out.add(tokens.length - 1);
    return out;
  }

  const leftIdx = attached ? conjIdx : Math.max(0, conjIdx - 1);
  const rightIdx = tokens.length - 1;
  out.add(leftIdx);
  out.add(rightIdx);
  return out;
}

function normalizeKoreanForCompare(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1");
}

/** ================== Helpers ================== */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trimForTable(s){
  const t = String(s || "").trim();
  return t.length > 28 ? (t.slice(0, 28) + "…") : t;
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getWordList(tokens) {
  return tokens.filter(t => !t.isSpace).map(t => ({
    idx: t.idx,
    text: t.text,
    isPre: !!t.isPre,
    isReq: !!t.isReq
  }));
}

function normWord(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/^[“”"'(\[]+/, "")
    .replace(/[”"')\].,!?;:]+$/g, "")
    .trim();
}


