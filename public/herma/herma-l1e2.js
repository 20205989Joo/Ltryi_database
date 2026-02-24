// ver1.1_26.02.22
// herma-l1e2.js
// ------------------------------------------------------------
// Herma L1-E2
// 1단계: 문장 안에서 연결 성분 직접 클릭 (토큰 버튼 UI X, 문장처럼 보이게)
//   - 정답 클릭 → 금색 하이라이트 잠깐 → 토스트 "정답" → 2단계로 자동 이동
//   - 오답 클릭 → 토스트 NO → 그대로
//
// 2단계: 단순문장 2개(위/아래) + 각 문장 한국어 + 가운데 연결 뜻(한국어)
//   - 가운데 pill: 갈색 테두리 + 금색 글자
//   - 위 문장/번역: 주황 밑줄
//   - 아래 문장/번역: 파란 밑줄
//   - "번역하기" → 3단계
//
// 3단계: 해석박스 (L1E1 스타일)
//   - 버튼: 제출/다음만
//   - 마지막 조각 클릭하면 되돌아감
//   - 제출 오답: 토스트만, 계속 수정 가능
//   - 정답: 토스트 OK + 잠금 + 다음 활성
//   - 영어 상단 문장: link(because 등) 금색 하이라이트 + (A=주황 밑줄, B=파랑 밑줄) ✅
//   - 번역 토큰: hinge(서/후에/거나...)는 "배경 X, 글자색만 금색"
//   - 토큰 밑줄: cut 메타로 A/B 분리해서 적용 ✅
//
// 데이터(Answer):
//   ||link=because||hinge=서||cut=4||a=...||b=...||그녀는 ... (전체 한국어)
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 1;
const TARGET_EXERCISE = 2;
const MAX_QUESTIONS = 0; // 0이면 제한 없음

/** doneinweb 호환 메타 */
let subcategory = "Grammar";
let level = "Basic";
let day = "102";
let quizTitle = "quiz_Grammar_Basic_102";
let userId = "";

/** 상태 */
let rawRows = [];
let questions = [];
let currentIndex = 0;
let results = [];

let stage = "pick"; // pick | view | translate
let pickedConnector = "";
let isKoLocked = false;

let bankTokens = [];
let selectedTokens = [];
let correctKo = "";

/** 색상 토큰 */
const COLOR_BROWN = "#7e3106";
const COLOR_GOLD = "#d5a22a";
const COLOR_ORANGE = "rgba(241,123,42,0.95)";
const COLOR_BLUE = "rgba(46,133,255,0.95)";

/** 연결 성분 사전(뜻 표시용) */
const CONNECTORS = [
  { en: "as soon as", ko: "~하자마자 / ~하는 대로" },
  { en: "because",    ko: "~해서 / 왜냐하면" },
  { en: "after",      ko: "~한 후에" },
  { en: "so",         ko: "그래서" },
  { en: "or",         ko: "~거나" },
  { en: "when",       ko: "~할 때" },
  { en: "until",      ko: "~할 때까지" },
  { en: "while",      ko: "~하는 동안 / ~할 때" }
];

/**
 * ✅ Korean 전체문장에서 cut 위치 기준으로 A/B 색을 나누는 "역전" 케이스들
 * - 영어: A + link + B (A=앞, B=뒤)
 * - 한국어: (보통) B(조건/이유/시간절) + hinge + A(메인)
 */
const REVERSE_KO_ORDER = new Set([
  "because",
  "after",
  "when",
  "until",
  "while",
  "as soon as"
]);

window.addEventListener("DOMContentLoaded", async () => {  var __r2_guard = (new URLSearchParams(window.location.search || "")).get("round2") === "1";
  if (__r2_guard) return;
  if (window.HermaToastFX) window.HermaToastFX.init({ hostId: "cafe_int", top: 10 });

  injectStyles();      // ✅ 기존 UI는 그대로, 필요한 클래스만 추가
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

/** ===== styles (기존 UI 오버라이드 금지: 필요한 클래스만 추가) ===== */
function injectStyles() {
  if (window.hermaStylePacks) {
    window.hermaStylePacks.ensure(["core"]);
  }
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --brown:${COLOR_BROWN};
      --gold:${COLOR_GOLD};
      --ulineA:${COLOR_ORANGE};
      --ulineB:${COLOR_BLUE};
    }

    /* 1단계: 문장처럼 보이게 (버튼/알약 X) */
    .pick-sentence{
      line-height:1.75;
      font-size:15px;
      word-break:keep-all;
    }
    .pickTok{
      cursor:pointer;
      user-select:none;
      padding:0 1px;
      border-radius:6px;
    }
    .pickTok:hover{
      background:rgba(0,0,0,0.05);
    }
    .pickTok.wrongFlash{
      background:rgba(200,40,40,0.08);
      box-shadow:inset 0 0 0 1px rgba(200,40,40,0.18);
    }
    .pickTok.correctFlash{
      background:rgba(213,162,42,0.22);
      box-shadow:inset 0 0 0 2px rgba(213,162,42,0.25);
    }

    .inst-link-pill{
      display:inline-block;
      padding:2px 8px;
      border-radius:999px;
      border:1px solid #e9c7a7;
      background:#fff;
      color:var(--brown);
      font-weight:900;
      line-height:1.25;
      vertical-align:baseline;
    }

    /* 2단계: 가운데 pill */
    .link-pill{
      display:inline-block;
      padding:6px 10px;
      border-radius:999px;
      border:2px solid var(--brown);
      color:#111;
      background:rgba(213,162,42,0.20);
      font-weight:900;
      font-size:13px;
      letter-spacing:-0.2px;
    }

    /* 밑줄 스타일(문장/토큰 공용) */
    .ulineA{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-decoration-color: var(--ulineA);
      text-underline-offset: 6px;
    }
    .ulineB{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-decoration-color: var(--ulineB);
      text-underline-offset: 6px;
    }

    /* 3단계: 영어 link 하이라이트 */
    .linkGold{
      background:rgba(213,162,42,0.20);
      box-shadow:inset 0 0 0 1px rgba(213,162,42,0.25);
      border-radius:6px;
      padding:0 3px;
      font-weight:900;
    }

    /* 3단계: hinge(서/후에/거나...)는 글자색만 금색 */
    .hingeGold{
      color:var(--gold);
      font-weight:950;
    }
  `;
  document.head.appendChild(style);
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
    const qEn = String(r["Question"] ?? "").trim();
    const rawA = String(r["Answer"] ?? "").trim();
    const inst = String(r["Instruction"] ?? "").trim();
    const title = String(r["Title"] ?? "").trim();
    const transformRaw =
      String(r["Transforms"] ?? r["Transform"] ?? r["TransformMap"] ?? "").trim();
    const laststageFinalRaw =
      String(r["Laststage-FinalSentence"] ?? r["LaststageFinalSentence"] ?? "").trim();
    const laststageKRTokensRaw =
      String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();

    const parsed = parseAnswerMetaAll(rawA);
    const transformMeta = parseTransformsMetaForL1E2(transformRaw);

    let linkEn = (transformMeta.link || parsed.meta.link || "").trim();
    const hinge = (transformMeta.hinge || parsed.meta.hinge || "").trim();
    const koA = (transformMeta.koA || parsed.meta.a || "").trim();
    const koB = (transformMeta.koB || parsed.meta.b || "").trim();
    const cut = Number(transformMeta.cut || parsed.meta.cut || 0) || 0;
    const cleanKo = (parsed.cleanKo || "").trim();

    if (!linkEn) linkEn = inferLinkFromQuestion(qEn);

    const connectorKo = getConnectorKo(linkEn);
    const split = resolveClauseSplitForL1E2(qEn, linkEn, laststageFinalRaw);

    return {
      no: idx + 1,
      qNumber: Number(r["QNumber"]) || idx + 1,
      title,
      instruction: inst || "해석해보세요",
      questionEn: qEn,

      connectorEn: linkEn,
      connectorKo,

      clauseA: split.a,
      clauseB: split.b,

      koA, koB, hinge,
      cut,
      transformsRaw: transformRaw,
      laststageFinalSentence: laststageFinalRaw,
      laststageKRTokens: laststageKRTokensRaw,

      modelKorean: cleanKo,

      rawAnswer: rawA
    };
  });
}

function parseTransformsMetaForL1E2(raw) {
  const s = String(raw || "").trim();
  if (!s) return {};

  const out = {};
  const chunks = s.split(/[;|]/).map((x) => x.trim()).filter(Boolean);
  chunks.forEach((chunk) => {
    const eq = chunk.indexOf("=");
    if (eq <= 0) return;
    const k = chunk.slice(0, eq).trim().toLowerCase();
    const v = chunk.slice(eq + 1).trim();
    if (!v) return;

    if (k === "link" || k === "connector") out.link = v;
    else if (k === "hinge") out.hinge = v;
    else if (k === "cut") out.cut = v;
    else if (k === "a" || k === "koa") out.koA = v;
    else if (k === "b" || k === "kob") out.koB = v;
  });
  return out;
}

function resolveClauseSplitForL1E2(questionEn, connectorEn, laststageFinalSentenceRaw) {
  const configured = parseLaststageFinalSentenceForL1E2(laststageFinalSentenceRaw);
  if (configured.length) {
    const partA = configured.find((x) => String(x.seg || "").toLowerCase() === "a");
    const partB = configured.find((x) => String(x.seg || "").toLowerCase() === "b");
    if (partA && partB) {
      return {
        a: ensurePeriod(String(partA.text || "").trim()),
        b: ensurePeriod(String(partB.text || "").trim())
      };
    }
  }
  return splitByConnector(questionEn, connectorEn);
}

function inferLinkFromQuestion(qEn) {
  const s = ` ${String(qEn || "").toLowerCase()} `;
  const list = CONNECTORS.map(x => x.en).slice().sort((a,b)=> b.length - a.length);
  for (const ph of list) {
    const re = new RegExp(`\\b${escapeRegExp(ph)}\\b`, "i");
    if (re.test(s)) return ph;
  }
  return "";
}

/** ===== intro ===== */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const title = questions[0]?.title || "Herma L1-E2";
  const instruction = questions[0]?.instruction || "해석해보세요";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:${COLOR_BROWN}; margin-bottom:10px;">📘 Herma L1-E2</div>

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
        • 1단계: 문장 안에서 <b>연결 성분을 직접 클릭</b>하세요.<br/>
        • 2단계: 문장 A/B 단순문장 + <b>한국어</b> + 가운데 <b>연결 뜻</b> 확인<br/>
        • 3단계: 토큰 밑줄(주황/파랑) 힌트로 번역 순서를 맞추세요
      </div>

      <div style="margin-top:10px; font-size:13px; color:${COLOR_BROWN};">
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
  renderPickStage();
}

/** ==================== 1단계: pick ==================== */
function renderPickStage() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  stage = "pick";
  pickedConnector = "";

  const clickableHtml = buildPickSentenceHTML(q.questionEn);

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" id="pick-inst-box" style="margin-bottom:10px;">
      <div style="font-weight:900; color:${COLOR_BROWN}; margin-bottom:6px;"><span class="inst-link-pill">\uC5F0\uACB0</span> \uC131\uBD84\uC744 \uD074\uB9AD\uD558\uC138\uC694</div>
    </div>

    <div class="box">
      <div class="sentence pick-sentence" id="click-sentence">${clickableHtml}</div>

      <div style="margin-top:10px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78); line-height:1.5;">
        (문장 안 단어를 눌러보세요)
      </div>
    </div>
  `;

  const host = document.getElementById("click-sentence");
  if (!host) return;

  host.addEventListener("click", (e) => {
    const el = e.target.closest(".pickTok[data-tok]");
    if (!el) return;

    const clicked = el.getAttribute("data-tok") || "";
    const q2 = questions[currentIndex];
    const correct = normEn(clicked) === normEn(q2.connectorEn);

    if (!correct) {
      el.classList.add("wrongFlash");
      setTimeout(() => el.classList.remove("wrongFlash"), 140);
      if (window.HermaToastFX) window.HermaToastFX.show("no", "\uB2E4\uB978 \uB2E8\uC5B4\uB97C \uACE8\uB77C\uBCF4\uC138\uC694!");
      return;
    }

    pickedConnector = q2.connectorEn;

    // ✅ 금색 하이라이트 잠깐 보여주고 넘어가기
    el.classList.add("correctFlash");
    if (window.HermaToastFX) window.HermaToastFX.show("ok", "\uC815\uB2F5!");

    host.style.pointerEvents = "none";
    setTimeout(() => renderViewStage(), 180);
  }, { once: false });
}

/** ==================== 2단계: view ==================== */
function renderViewStage() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  stage = "view";

  const midText = q.connectorKo || q.connectorEn || "(뜻 없음)";

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" style="margin-bottom:10px;">
      <div style="font-weight:900; color:${COLOR_BROWN}; margin-bottom:6px;">\uBB38\uC7A5 A</div>
      <div class="sentence ulineA">${escapeHtml(q.clauseA || "")}</div>
      <div class="sentence ulineA" style="margin-top:8px;">${escapeHtml(q.koA || "")}</div>

      <div style="text-align:center; margin:10px 0;">
        <span class="link-pill">${escapeHtml(midText)}</span>
      </div>

      <div style="font-weight:900; color:${COLOR_BROWN}; margin-bottom:6px;">\uBB38\uC7A5 B</div>
      <div class="sentence ulineB">${escapeHtml(q.clauseB || "")}</div>
      <div class="sentence ulineB" style="margin-top:8px;">${escapeHtml(q.koB || "")}</div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" onclick="renderTranslateStage()">번역하기</button>
    </div>
  `;
}

/** ==================== 3단계: translate (L1E1 방식) ==================== */
function renderTranslateStage() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  stage = "translate";
  isKoLocked = false;

  correctKo = String(q.modelKorean || "").trim();

  // ✅ cut 메타 기반 A/B 밑줄을 안정적으로 만든다
  const plan = buildKoreanTokenPlan(
    correctKo,
    q.koA,
    q.koB,
    q.hinge,
    q.cut,
    q.connectorEn,
    q.laststageKRTokens
  );

  selectedTokens = [];
  bankTokens = shuffleArray(plan.map(p => ({
    id: p.id,
    text: p.text,
    group: p.group,
    html: p.html
  })));

  // ✅ 영어도 A/B 밑줄 + link gold
  const enTopHtml = renderEnglishWithLinkAndClauseUnderline(
    q.questionEn,
    q.connectorEn,
    q.laststageFinalSentence
  );

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${enTopHtml}</div>
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
  `;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = true;

  renderTranslateUI();
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
      selectedTokens,
      bankTokens,
      isKoLocked,
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
      decorateToken: (el, tok) => applyUnderlineStyle(el, tok.group),
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
      decorateToken: (el, tok) => applyUnderlineStyle(el, tok.group),
      rerender: () => renderTranslateUI(),
    });
    applyTranslateGuideText();
    return;
  }

  applyTranslateGuideText();

  if (remainInfo) remainInfo.textContent = `남은 조각: ${bankTokens.length}개`;
}

function applyTranslateGuideText() {
  if (selectedTokens.length) return;
  const answerLine = document.getElementById("answer-line");
  if (!answerLine) return;
  const hint = answerLine.querySelector("span");
  if (!hint) return;
  hint.style.display = "inline-block";
  hint.style.lineHeight = "1.45";
  hint.innerHTML = "\uC870\uAC01\uC744 \uB20C\uB7EC \uC21C\uC11C\uB300\uB85C \uCC44\uC6CC\uC8FC\uC138\uC694.<br>\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4.";
}

function applyUnderlineStyle(el, group) {
  if (!el) return;
  if (group === "A") {
    el.classList.add("ulineA");
  } else if (group === "B") {
    el.classList.add("ulineB");
  }
}

function submitKorean() {
  const q = questions[currentIndex];
  const userKo = selectedTokens.map(t => t.text).join(" ").trim();

  const koOk = normalizeKoreanForCompare(userKo) === normalizeKoreanForCompare(correctKo);

  if (!koOk) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답… 다시!");
    return;
  }

  if (isKoLocked) return;
  isKoLocked = true;

  results.push({
    no: currentIndex + 1,
    word: q.questionEn,
    selected: userKo || "무응답",
    correct: true,

    qNumber: q.qNumber,
    modelEnglish: q.questionEn,
    modelKorean: q.modelKorean,
    modelAnswer: q.rawAnswer,
    connectorEn: q.connectorEn,
    connectorKo: q.connectorKo,
    selectedConnectorEn: pickedConnector,
    cut: q.cut
  });

  const submitBtn = document.getElementById("submit-ko-btn");
  if (submitBtn) submitBtn.disabled = true;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;

  renderTranslateUI();
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
}

/** ===== next ===== */
function goNext() {
  currentIndex++;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderPickStage();
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
    });
    return;
  }

  alert("결과표 모듈이 로드되지 않았습니다.");
}

function closePopup() {
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

/* =========================================================
   Helpers
========================================================= */

/**
 * ✅ 핵심: 네 데이터 포맷을 그대로 파싱
 * Answer 예:
 * ||link=because||hinge=서||cut=4||a=...||b=...||전체한국어
 *
 * - split("||") 후, key=value 형태만 meta로
 * - 나머지는 전부 "cleaned"로 합쳐서 한국어 추출
 */
function parseAnswerMetaAll(answerRaw) {
  const raw = String(answerRaw || "").trim();

  const chunks = raw.split("||").map(s => s.trim()).filter(Boolean);

  const meta = {};
  const leftovers = [];

  for (const ch of chunks) {
    const eq = ch.indexOf("=");
    if (eq > 0) {
      const k = ch.slice(0, eq).trim().toLowerCase();
      const v = ch.slice(eq + 1).trim();

      // ✅ 허용 키만 meta로
      if (k === "link" || k === "hinge" || k === "a" || k === "b" || k === "cut") {
        meta[k] = v;
        continue;
      }
    }
    leftovers.push(ch);
  }

  const cleaned = leftovers.join(" ").replace(/\s+/g, " ").trim();
  const cleanKo = extractKorean(cleaned);

  return { meta, cleanKo };
}

function getConnectorKo(connectorEn) {
  const c = CONNECTORS.find(x => normEn(x.en) === normEn(connectorEn));
  return c ? c.ko : "";
}

/** 1단계: 문장처럼 보이게 */
function buildPickSentenceHTML(sentence) {
  const s0 = String(sentence || "").replace(/\s+/g, " ").trim();
  if (!s0) return "";

  const phrases = CONNECTORS.map(x => x.en).slice().sort((a,b)=> b.length - a.length);

  let replaced = s0;
  const phHits = [];

  phrases.forEach(ph => {
    const re = new RegExp(`\\b${escapeRegExp(ph)}\\b`, "gi");
    replaced = replaced.replace(re, (m) => {
      const key = `§§C${phHits.length}§§`;
      phHits.push({ key, text: m, tok: ph });
      return key;
    });
  });

  const parts = replaced.split(" ").filter(Boolean);

  return parts.map(part => {
    const hit = phHits.find(h => h.key === part);
    if (hit) {
      return `<span class="pickTok" data-tok="${escapeAttr(hit.tok)}">${escapeHtml(hit.text)}</span>`;
    }
    const norm = normalizeClickedToken(part);
    return `<span class="pickTok" data-tok="${escapeAttr(norm)}">${escapeHtml(part)}</span>`;
  }).join(" ");
}

function normalizeClickedToken(tok) {
  return String(tok || "")
    .replace(/^[“”"']+|[“”"']+$/g, "")
    .replace(/^[\(\[]+|[\)\]]+$/g, "")
    .replace(/[.,!?;:]+$/g, "")
    .trim()
    .toLowerCase();
}

function splitByConnector(sentence, connectorEn) {
  const s = String(sentence || "").trim();
  const c = String(connectorEn || "").trim();
  if (!s || !c) return { a: ensurePeriod(s), b: "" };

  const re = new RegExp(`\\b${escapeRegExp(c)}\\b`, "i");
  const m = s.match(re);
  if (!m) return { a: ensurePeriod(s), b: "" };

  const idx = s.toLowerCase().indexOf(m[0].toLowerCase());
  let a = s.slice(0, idx).trim();
  let b = s.slice(idx + m[0].length).trim();

  a = a.replace(/[,\s]+$/g, "").trim();
  b = b.replace(/^[,\s]+/g, "").trim();

  return { a: ensurePeriod(a), b: ensurePeriod(b) };
}

function ensurePeriod(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  if (/[.?!]$/.test(t)) return t;
  return t + ".";
}

/** ✅ 3단계: 영어 문장 = (A 밑줄) + (link 골드) + (B 밑줄) */
function renderEnglishWithLinkAndClauseUnderline(sentence, connectorEn, laststageFinalSentenceRaw) {
  const configured = parseLaststageFinalSentenceForL1E2(laststageFinalSentenceRaw);
  if (configured.length) {
    return renderConfiguredFinalSentenceHtmlForL1E2(configured, connectorEn);
  }

  const s0 = String(sentence || "").replace(/\s+/g, " ").trim();
  const c0 = String(connectorEn || "").trim();
  if (!s0) return "";
  if (!c0) return escapeHtml(s0);

  const re = new RegExp(`\\b${escapeRegExp(c0)}\\b`, "i");
  const m = s0.match(re);
  if (!m) return escapeHtml(s0);

  const hit = m[0];
  const idx = s0.toLowerCase().indexOf(hit.toLowerCase());
  if (idx < 0) return escapeHtml(s0);

  const before = s0.slice(0, idx);
  const after = s0.slice(idx + hit.length);

  // before/after 그대로 밑줄 (쉼표 포함돼도 OK)
  return `<span class="ulineA">${escapeHtml(before)}</span><span class="linkGold">${escapeHtml(hit)}</span><span class="ulineB">${escapeHtml(after)}</span>`;
}

function parseLaststageFinalSentenceForL1E2(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];

  let tagged = false;
  const out = [];

  parts.forEach((part) => {
    const m = part.match(/^(a|b|ab|c|link)\s*::\s*(.+)$/i);
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

function mapFinalSentenceSegToClassForL1E2(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "link") return "linkGold";
  if (s === "a" || s === "ab") return "ulineA";
  if (s === "b" || s === "c") return "ulineB";
  return "";
}

function renderConfiguredFinalSentenceHtmlForL1E2(parts, connectorEn) {
  return parts.map((part) => {
    const text = String(part?.text || "").trim();
    if (!text) return "";

    const cls = mapFinalSentenceSegToClassForL1E2(part.seg);
    if (cls) return `<span class="${cls}">${escapeHtml(text)}</span>`;

    if (connectorEn && normEn(text) === normEn(connectorEn)) {
      return `<span class="linkGold">${escapeHtml(text)}</span>`;
    }
    return escapeHtml(text);
  }).join(" ");
}

/** 3단계: 토큰 그룹(A/B) + hinge 글자색 처리 */
function buildKoreanTokenPlan(fullKo, koA, koB, hinge, cut, connectorEn, laststageKRTokensRaw) {
  const configured = parseLaststageKRTokensForL1E2(laststageKRTokensRaw);
  if (configured.length) {
    return configured.map((t, i) => {
      const id = `k${i}_${Math.random().toString(16).slice(2, 6)}`;
      return {
        id,
        text: t.text,
        group: mapKRTokensSegToGroupForL1E2(t.seg),
        html: renderTokenWithHinge(t.text, hinge)
      };
    });
  }

  const full = tokenizeKoreanForBox(fullKo);

  // group 배열 기본값 ""
  const group = new Array(full.length).fill("");

  // ✅ cut이 유효하면 cut 기반으로 그룹 결정(가장 안정적)
  const cutIdx = Number(cut || 0);
  if (cutIdx > 0 && cutIdx < full.length) {
    const rev = REVERSE_KO_ORDER.has(normEn(connectorEn || ""));
    const firstGroup = rev ? "B" : "A";
    const secondGroup = rev ? "A" : "B";

    for (let i = 0; i < full.length; i++) {
      group[i] = (i < cutIdx) ? firstGroup : secondGroup;
    }
  } else {
    // (fallback) 예전 방식: a/b 문장 토큰이 full에 "연속"으로 들어있는 경우만
    const aT = tokenizeKoreanForBox(koA);
    const bT = tokenizeKoreanForBox(koB);

    const ar = findSubseqRange(full, aT);
    const br = findSubseqRange(full, bT);

    if (ar) for (let i = ar.start; i <= ar.end; i++) group[i] = "A";
    if (br) for (let i = br.start; i <= br.end; i++) group[i] = "B";
  }

  return full.map((t, i) => {
    const id = `k${i}_${Math.random().toString(16).slice(2, 6)}`;
    return {
      id,
      text: t,
      group: group[i],
      html: renderTokenWithHinge(t, hinge)
    };
  });
}

function parseLaststageKRTokensForL1E2(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const tokens = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!tokens.length) return [];

  let tagged = false;
  const out = [];
  tokens.forEach((token) => {
    const m = token.match(/^(a|b|ab|c)\s*::\s*(.+)$/i);
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

function mapKRTokensSegToGroupForL1E2(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab") return "A";
  if (s === "b" || s === "c") return "B";
  return "";
}

function findSubseqRange(fullTokens, partTokens) {
  if (!partTokens || partTokens.length === 0) return null;
  if (!fullTokens || fullTokens.length === 0) return null;

  // 1) 정확 매칭
  for (let i = 0; i <= fullTokens.length - partTokens.length; i++) {
    let ok = true;
    for (let j = 0; j < partTokens.length; j++) {
      if (fullTokens[i + j] !== partTokens[j]) { ok = false; break; }
    }
    if (ok) return { start: i, end: i + partTokens.length - 1 };
  }

  // 2) 관대 매칭(끝 구두점 제거)
  const nf = fullTokens.map(normKoTok);
  const np = partTokens.map(normKoTok);

  for (let i = 0; i <= nf.length - np.length; i++) {
    let ok = true;
    for (let j = 0; j < np.length; j++) {
      if (nf[i + j] !== np[j]) { ok = false; break; }
    }
    if (ok) return { start: i, end: i + np.length - 1 };
  }

  return null;
}

function normKoTok(t) {
  return String(t || "").replace(/[.?!]+$/g, "");
}

function renderTokenWithHinge(token, hinge) {
  const t = String(token || "");
  const h = String(hinge || "").trim();
  if (!h) return escapeHtml(t);

  const esc = escapeRegExp(h);
  const re = new RegExp(esc, "g");
  if (!re.test(t)) return escapeHtml(t);

  const parts = t.split(re);
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    out += escapeHtml(parts[i]);
    if (i !== parts.length - 1) {
      out += `<span class="hingeGold">${escapeHtml(h)}</span>`;
    }
  }
  return out;
}

function tokenizeKoreanForBox(kor) {
  return String(kor || "").trim().split(/\s+/).filter(Boolean);
}

function normalizeKoreanForCompare(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function extractKorean(s) {
  const str = String(s || "").trim();
  const idx = str.search(/[가-힣]/);
  return (idx === -1 ? str : str.slice(idx)).trim();
}

function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trimForTable(s) {
  const t = String(s || "").trim();
  return t.length > 28 ? (t.slice(0, 28) + "…") : t;
}

function normEn(s) {
  return String(s || "").trim().toLowerCase();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeRegExp(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}




