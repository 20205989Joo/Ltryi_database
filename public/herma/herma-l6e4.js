// ver1.1_26.02.22
// herma-l6e4.js (L6-E4: 압축된 명사구 찾기(클릭) -> 명사구 번역(빈칸 타이핑) -> 해석(순서))
// ------------------------------------------------------------
// ✅ 이번 수정
// - 3단계 토큰 스타일을 herma-l1e3.js의 "하얀 토큰(pill)" 느낌으로 변경
// - 3단계에서 "명사구 덩어리 토큰"은, 원본 명사구 밑줄색(주황/파랑 등)과 같은 색으로 밑줄 표시
//   (조사/구두점이 붙어서 '실업률이 증가함은' 같이 되어도 동일 색 밑줄 유지)
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 6;
const TARGET_EXERCISE = 4;

let subcategory = "Grammar";
let level = "Basic";
let day = "123";
let quizTitle = "quiz_Grammar_Basic_123";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;

// 현재 문제 상태
let cur = null; // { sentence, nominals[], transBlanks[], korean, title, instruction, qNumber, answerRaw }
let stage = 0; // 1=명사구찾기, 2=번역빈칸, 3=해석순서

// stage1
let sentenceParts = [];
let sentenceWords = [];
let phraseWordIndices = [];
let selectedSet = new Set();
let donePhrase = [];
let activePhraseIdx = null;
let wordToPhraseList = new Map();

// stage2
let stage2Segments = []; // [{type:"text", value}, {type:"blank", expected}]
let stage2ExpectedTokens = [];
let stage2BankTokens = [];
let stage2SelectedTokens = [];
let stage2FlipReady = false;
let stage1BoxSnapshotHtml = "";

// stage3
let korBankTokens = [];
let korSelectedTokens = [];

const UI_TOP_INST_L6E4 = "\uBB38\uC7A5\uC744 \uD558\uB098\uC529 \uBD84\uD574\uD574\uBCF4\uC138\uC694!";

window.addEventListener("DOMContentLoaded", async () => {
  applyQueryParams();
  wireBackButton();
  injectStyles();

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

/* ================== Params / Nav ================== */
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

/* ================== Styles ================== */
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .hidden{ display:none !important; }

    .stage-pill{
      display:none !important;
      font-size:12px;
      padding:6px 10px;
      border-radius:999px;
      font-weight:900;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      margin-bottom:8px;
      color:#7e3106;
    }

    .wTok{
      display:inline-block;
      padding:2px 6px;
      border-radius:10px;
      cursor:pointer;
      user-select:none;
      transition: transform .12s ease, background .12s ease, box-shadow .12s ease, opacity .12s ease;
    }
    .wTok:hover{ transform: translateY(-0.6px); background: rgba(0,0,0,0.03); }

    .wTok.sel{ font-weight:900; color:#222; }

    .wTok.done{
      background: rgba(46,125,50,0.10);
      box-shadow: 0 0 0 2px rgba(46,125,50,0.10), inset 0 0 0 1px rgba(46,125,50,0.42);
      font-weight:900;
      color:#222;
      cursor: default;
      text-decoration: none !important;
    }
    .wTok.disabled{ opacity:1; cursor:not-allowed; color:#222; }
    .wTok.bad{
      background: rgba(198,40,40,0.10);
      box-shadow: inset 0 0 0 1px rgba(198,40,40,0.32);
    }

    .mini-hint{
      font-size:12px;
      color: rgba(126,49,6,0.78);
      font-weight:900;
      margin-top:8px;
      line-height:1.5;
    }

    .inline-row{
      display:flex;
      gap:8px;
      margin-top:10px;
      flex-wrap:wrap;
    }
    .inline-row .quiz-btn{
      flex:1;
      margin-top:0;
      min-width:110px;
    }

    .ok{ font-weight:900; font-size:16px; color:#2e7d32; }
    .no{ font-weight:900; font-size:16px; color:#c62828; }

    .shake{ animation: shake 240ms ease-in-out; }
    @keyframes shake{
      0%{ transform: translateX(0); }
      25%{ transform: translateX(-4px); }
      50%{ transform: translateX(4px); }
      75%{ transform: translateX(-3px); }
      100%{ transform: translateX(0); }
    }

    /* ====== 3단계: L1-E3 스타일의 "하얀 토큰" ====== */
    .pill-btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 11px;
      margin:4px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.14);
      background:#fff;
      font-weight:900;
      font-size:13px;
      cursor:pointer;
      user-select:none;
      box-shadow: 0 1px 0 rgba(0,0,0,0.04);
      transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
    }
    .pill-btn:hover{
      transform: translateY(-0.6px);
      box-shadow: 0 2px 0 rgba(0,0,0,0.06);
      background: rgba(0,0,0,0.01);
    }
    .pill-btn:disabled{
      opacity:.6;
      cursor: default;
      transform:none;
      box-shadow: none;
    }

    .pill-static{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 10px;
      margin:4px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.14);
      background:#fff;
      font-weight:900;
      font-size:13px;
      user-select:none;
    }

    /* 3단계 토큰 영역이 너무 커 보이지 않게 */
    #kor-bank{ margin-top:10px; }
    #kor-line{ margin-top:8px; }

    .kor-wrap{
      display:flex;
      flex-wrap:wrap;
      gap:0px;
      align-items:flex-start;
    }

    .mini-answer-line{
      min-height:44px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.10);
      background:#fff;
      line-height:1.6;
      display:flex;
      flex-wrap:wrap;
      align-items:flex-start;
      gap:6px;
    }
    .mini-bank{
      margin-top:10px;
      display:flex;
      flex-wrap:wrap;
      gap:6px;
    }
    .mini-token{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 9px;
      border-radius:999px;
      border:1px solid rgba(0,0,0,0.14);
      background:#fff;
      font-weight:900;
      font-size:12px;
      line-height:1.2;
      cursor:pointer;
      user-select:none;
    }
    .mini-token:disabled{
      opacity:.4;
      cursor:not-allowed;
    }
    .mini-token.answer-chip:disabled{
      opacity:1;
    }
    .mini-token.answer-chip{
      border-width:1.5px;
    }
    .answer-line{
      min-height:44px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.10);
      background:#fff;
      line-height:1.6;
      font-size:15px;
      word-break:keep-all;
    }

    .inst-simple{
      font-weight:900;
      color:#7e3106;
      line-height:1.6;
    }

    .stage-work-box{
      transition: background .28s ease, border-color .28s ease, box-shadow .28s ease;
    }
    .stage-work-box.nominal-face{
      background: linear-gradient(180deg, rgba(246,239,230,0.98) 0%, rgba(236,226,214,0.98) 100%);
      border-color: rgba(126,49,6,0.18);
      box-shadow: 0 10px 22px rgba(126,49,6,0.06);
    }
    .stage-work-box .sentence{
      transition: background .18s ease, border-color .18s ease;
    }
    .stage-work-box.nominal-face .sentence{
      background: rgba(255,255,255,0.94);
      border-color: rgba(126,49,6,0.16);
    }
    .work-flip-scene{
      perspective: 1200px;
    }
    .work-flip-card{
      display:grid;
      position:relative;
      transform-style: preserve-3d;
      transition: transform .58s cubic-bezier(.22,.88,.28,1);
    }
    .work-flip-card.is-flipped{
      transform: rotateY(180deg);
    }
    .work-face{
      grid-area: 1 / 1;
      min-width:0;
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
      transform-style: preserve-3d;
      pointer-events:none;
    }
    .work-face.front{
      transform: rotateY(0deg);
      pointer-events:auto;
      transition: opacity .12s ease;
    }
    .work-face.back{
      transform: rotateY(180deg);
    }
    .work-flip-card.is-flipped .work-face.front{
      opacity:0;
      pointer-events:none;
    }
    .work-flip-card.is-flipped .work-face.back{
      pointer-events:auto;
    }
  `;
  document.head.appendChild(style);
}

/* ================== Load Excel ================== */
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

/* ================== Build Questions ================== */
function buildQuestionsFromRows() {
  const filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  questions = filtered.map((r, idx) => {
    const qNumber = Number(r["QNumber"]) || idx + 1;
    const title = String(r["Title"] ?? "").trim();
    const instruction = String(r["Instruction"] ?? "").trim();
    const questionRaw = stripStars(String(r["Question"] ?? "").trim());
    const answerRaw = stripStars(String(r["Answer"] ?? "").trim());
    const laststageKRTokensRaw =
      String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();

    const parsed = parseAnswerForL6E4(answerRaw);

    return {
      qNumber,
      title,
      instruction,
      sentence: questionRaw,
      nominals: parsed.nominals,
      transBlanks: parsed.transBlanks,
      korean: parsed.korean,
      laststageKRTokens: laststageKRTokensRaw,
      answerRaw
    };
  });
}

function stripStars(s){
  return String(s || "").replace(/\*\*/g, "").replace(/\*/g, "");
}

/* ================== Answer 파싱 (명사구 / 번역빈칸 / 해석) ================== */
function parseAnswerForL6E4(answerRaw){
  const s = String(answerRaw || "").replace(/\r/g, "").trim();

  const idxNom = s.indexOf("명사구:");
  let idxTB  = s.indexOf("번역빈칸:");
  if (idxTB === -1) idxTB = s.indexOf("번역 빈칸:");
  if (idxTB === -1) idxTB = s.indexOf("번역:");
  const idxKor = s.indexOf("해석:");

  let nomStr = "";
  let tbStr = "";
  let korStr = "";

  if (idxNom !== -1) {
    if (idxTB !== -1) nomStr = s.slice(idxNom + "명사구:".length, idxTB).trim();
    else if (idxKor !== -1) nomStr = s.slice(idxNom + "명사구:".length, idxKor).trim();
    else nomStr = s.slice(idxNom + "명사구:".length).trim();
  }

  if (idxTB !== -1) {
    const tbKeyLen = s.includes("번역 빈칸:") ? "번역 빈칸:".length
                   : s.includes("번역빈칸:") ? "번역빈칸:".length
                   : "번역:".length;

    if (idxKor !== -1) tbStr = s.slice(idxTB + tbKeyLen, idxKor).trim();
    else tbStr = s.slice(idxTB + tbKeyLen).trim();
  }

  if (idxKor !== -1) {
    korStr = s.slice(idxKor + "해석:".length).trim();
  }

  const nominals = parseListByDelims(nomStr);
  const transBlanks = parseListByDelims(tbStr);

  return { nominals, transBlanks, korean: korStr };
}

/* ✅ "||" / "/" / 슬래시류 모두 분리해서 리스트로 */
function parseListByDelims(rawStr){
  let raw = String(rawStr || "").trim();
  if (!raw) return [];

  raw = raw.replace(/[／∕⁄]/g, "/");
  raw = raw.replace(/\|\|/g, "/");  // ✅ 중요: ||도 구분자로
  const parts = raw.split(/\s*\/\s*/).map(x => x.trim()).filter(Boolean);

  return parts.map(p => {
    let x = p;
    x = x.replace(/\(\s*=\s*[^)]*\)/g, " ").trim();
    x = x.replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
    x = x.replace(/[.。!?]+$/g, "").trim();
    return x;
  });
}

/* ================== Intro ================== */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L6-E4";
  const instruction =
    questions[0]?.instruction ||
    "문장 안에서 ‘사건 전체를 이름처럼 묶은’ 명사구를 찾고, 그 명사구를 한국어 빈칸으로 번역한 뒤 전체 해석을 완성하세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L6-E4</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106; line-height:1.6;">
        📝 ${escapeHtml(instruction)}
      </div>

      <div style="margin-top:10px; font-size:12px; color:#555; line-height:1.6;">
        1) 원본 문장에서 <b>명사구 1개</b>를 골라 단어를 전부 클릭<br/>
        2) 그 명사구를 <b>한국어 빈칸</b>으로 완성<br/>
        3) 남은 명사구가 있으면 1~2 반복<br/>
        4) 해석(순서) 완성 후 제출
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

/* ================== Main Render ================== */
function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  isAnswered = false;

  cur = {
    qNumber: q.qNumber,
    title: q.title,
    instruction: q.instruction || questions[0]?.instruction || "",
    sentence: String(q.sentence || "").replace(/[’]/g, "'").trim(),
    nominals: (q.nominals || []).slice(),
    transBlanks: (q.transBlanks || []).slice(),
    korean: String(q.korean || "").trim(),
    laststageKRTokens: String(q.laststageKRTokens || "").trim(),
    answerRaw: q.answerRaw
  };

  stage = 1;

  sentenceParts = tokenizeSentence(cur.sentence);
  sentenceWords = sentenceParts.filter(p => p.kind === "word").map(p => p.norm);

  phraseWordIndices = cur.nominals.map(ph => matchPhraseToSentenceWordIndices(ph, sentenceWords));
  donePhrase = cur.nominals.map(() => false);

  selectedSet = new Set();
  activePhraseIdx = null;

  rebuildWordToPhraseMap();

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" id="instruction-box-top">
      <div class="inst-simple">${UI_TOP_INST_L6E4}</div>
    </div>

    <div id="stage-host"></div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()" disabled>제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  renderStage();
}

function renderStage(){
  const host = document.getElementById("stage-host");
  if (!host) return;
  const topInst = document.getElementById("instruction-box-top");

  host.innerHTML = "";
  if (topInst) topInst.classList.toggle("hidden", stage === 3);

  if (stage === 1) return renderStage1(host);
  if (stage === 2) return renderStage2(host);
  if (stage === 3) return renderStage3(host);
}

function captureStage1BoxSnapshotFrom(el){
  try {
    const box = el?.closest?.(".box");
    if (box) stage1BoxSnapshotHtml = box.innerHTML;
  } catch (_) {}
}

/* ================== Stage 1 ================== */
function renderStage1(host){
  if (donePhrase.every(Boolean)) {
    stage = 3;
    renderStage();
    return;
  }

  const total = Math.max(1, cur.nominals.length);
  const doneCount = donePhrase.filter(Boolean).length;
  const now = Math.min(doneCount + 1, total);

  const doneWordSet = new Set();
  donePhrase.forEach((isDone, i) => {
    if (!isDone) return;
    (phraseWordIndices[i] || []).forEach(ix => doneWordSet.add(ix));
  });

  host.innerHTML = `
    <div class="box">
      <div class="stage-pill">1단계: 명사구 찾기 (${now}/${total})</div>

      <div class="sentence" id="sentence-line"></div>

      <div class="mini-hint">
        문장 안에서 <b>명사구 1개</b>를 골라 구성 단어를 전부 눌러보세요.<br/>
        (끝낸 명사구는 <span style="color:#2e7d32;">초록</span>으로 표시)
      </div>

      <div class="inline-row">
        <button class="quiz-btn" type="button" id="clear-select">선택 초기화</button>
      </div>
    </div>
  `;

  const line = document.getElementById("sentence-line");
  const clearBtn = document.getElementById("clear-select");
  const miniHintEl = host.querySelector(".mini-hint");
  const inlineRowEl = host.querySelector(".inline-row");

  if (miniHintEl) miniHintEl.remove();
  if (inlineRowEl) inlineRowEl.remove();

  if (clearBtn) {
    clearBtn.onclick = () => {
      selectedSet = new Set();
      activePhraseIdx = null;
      renderSentenceClickable(line, doneWordSet);
    };
  }

  renderSentenceClickable(line, doneWordSet);
}

/* 클릭 전 밑줄 없음 → 선택(클릭)된 단어에만 밑줄 + 하이라이트(명사구별 색상) */
function renderSentenceClickable(container, doneWordSet){
  if (!container) return;
  container.innerHTML = "";

  let wordCursor = 0;

  sentenceParts.forEach((p) => {
    if (p.kind === "space") {
      container.appendChild(document.createTextNode(p.raw));
      return;
    }
    if (p.kind !== "word") {
      const sp = document.createElement("span");
      sp.textContent = p.raw;
      container.appendChild(sp);
      return;
    }

    const wi = wordCursor++;
    const span = document.createElement("span");
    span.className = "wTok";
    span.textContent = p.raw;

    const isDoneWord = doneWordSet.has(wi);
    const belongs = (wordToPhraseList.get(wi) || []).filter(pi => !donePhrase[pi]);

    if (isDoneWord){
      span.classList.add("done");
      container.appendChild(span);
      return;
    }

    const clickableNow = (() => {
      if (!belongs.length) return false;
      if (activePhraseIdx === null) return true;
      return belongs.includes(activePhraseIdx);
    })();

    if (!clickableNow) {
      span.classList.add("disabled");
      span.addEventListener("click", () => {
        span.classList.add("bad");
        setTimeout(() => span.classList.remove("bad"), 160);
        container.classList.remove("shake");
        void container.offsetWidth;
        container.classList.add("shake");
      });
      container.appendChild(span);
      return;
    }

    span.addEventListener("click", () => {
      if (activePhraseIdx === null) {
        activePhraseIdx = belongs[0]; // 첫 클릭이 "어느 명사구를 할지" 선택
        selectedSet = new Set([wi]);
      } else {
        if (selectedSet.has(wi)) selectedSet.delete(wi);
        else selectedSet.add(wi);
      }

      renderSentenceClickable(container, doneWordSet);

      const req = new Set(phraseWordIndices[activePhraseIdx] || []);
      if (isStage1Complete(req, selectedSet)){
        captureStage1BoxSnapshotFrom(container);
        stage = 2;
        renderStage();
      }
    });

    // 선택된 단어에만 색상 밑줄 + 하이라이트
    if (selectedSet.has(wi) && activePhraseIdx !== null){
      const acc = phraseAccent(activePhraseIdx);
      span.classList.add("sel");
      span.style.background = acc.bg;
      span.style.boxShadow = `inset 0 0 0 1px ${acc.border}`;
      applyUnderlineStyle(span, activePhraseIdx); // ✅ 여기서도 동일 밑줄 룰 사용
    }

    container.appendChild(span);
  });
}

function isStage1Complete(reqSet, selSet){
  if (!reqSet.size) return false;
  if (selSet.size !== reqSet.size) return false;
  for (const x of reqSet) if (!selSet.has(x)) return false;
  return true;
}

function rebuildWordToPhraseMap(){
  wordToPhraseList = new Map();
  phraseWordIndices.forEach((arr, pi) => {
    (arr || []).forEach(wi => {
      if (!wordToPhraseList.has(wi)) wordToPhraseList.set(wi, []);
      wordToPhraseList.get(wi).push(pi);
    });
  });
}

function phraseAccent(pi){
  const lines   = ["rgba(241,123,42,0.98)","rgba(66,133,244,0.98)","rgba(142,36,170,0.98)","rgba(0,150,136,0.98)"];
  const bgs     = ["rgba(241,123,42,0.18)","rgba(66,133,244,0.14)","rgba(142,36,170,0.14)","rgba(0,150,136,0.14)"];
  const borders = ["rgba(241,123,42,0.55)","rgba(66,133,244,0.45)","rgba(142,36,170,0.45)","rgba(0,150,136,0.45)"];
  return { line: lines[pi % lines.length], bg: bgs[pi % bgs.length], border: borders[pi % borders.length] };
}

function applyUnderlineStyle(el, phraseIdx){
  if (!el) return;
  const acc = phraseAccent(phraseIdx);
  el.style.textDecoration = "underline";
  el.style.textDecorationThickness = "2px";
  el.style.textDecorationColor = acc.line;
  el.style.textUnderlineOffset = "3px";
}

/* phrase -> sentence word indices 매칭 */
function matchPhraseToSentenceWordIndices(phrase, sentenceWordNormList){
  const ph = cleanPhraseForMatch(phrase);
  const phWords = extractWordNorms(ph);
  if (!phWords.length) return [];

  const start = findSubsequence(sentenceWordNormList, phWords);
  if (start !== -1){
    const out = [];
    for (let i=0; i<phWords.length; i++) out.push(start + i);
    return out;
  }

  // 느슨 매칭(순서 유지)
  const out = [];
  let curPos = 0;
  for (const w of phWords){
    let found = -1;
    for (let i=curPos; i<sentenceWordNormList.length; i++){
      if (sentenceWordNormList[i] === w){ found = i; break; }
    }
    if (found === -1) return [];
    out.push(found);
    curPos = found + 1;
  }
  return out;
}

function cleanPhraseForMatch(s){
  let x = String(s || "").replace(/[’]/g, "'");
  x = x.replace(/\(\s*=\s*[^)]*\)/g, " ");
  x = x.replace(/[()]/g, "");
  x = stripStars(x);
  return x.replace(/\s+/g, " ").trim();
}

/* ================== Stage 2 (번역빈칸) ================== */
function renderStage2(host){
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  stage2FlipReady = false;

  const total = Math.max(1, cur.nominals.length);
  const doneCount = donePhrase.filter(Boolean).length;
  const now = Math.min(doneCount + 1, total);

  if (activePhraseIdx === null) {
    stage = 1;
    renderStage();
    return;
  }

  const nominalTextNew = cur.nominals[activePhraseIdx] || "";
  const templateStrNew = getExpectedTransBlankForPhrase(activePhraseIdx);
  stage2Segments = parseBraceTemplate(templateStrNew);
  const expectedText = renderTemplateAsText(stage2Segments).trim();
  stage2ExpectedTokens = tokenizeKoreanSimple(expectedText);
  if (!stage2ExpectedTokens.length) {
    donePhrase[activePhraseIdx] = true;
    selectedSet = new Set();
    activePhraseIdx = null;
    if (donePhrase.every(Boolean)) stage = 3;
    else stage = 1;
    renderStage();
    return;
  }
  stage2SelectedTokens = [];
  stage2BankTokens = shuffleArray(stage2ExpectedTokens.map((t, i) => ({
    id: `s2_${activePhraseIdx}_${i}_${Math.random().toString(16).slice(2, 6)}`,
    text: t
  })));

  const frontSnapshot = stage1BoxSnapshotHtml || `
    <div class="sentence"><span style="font-weight:900;">${escapeHtml(cur.sentence || "")}</span></div>
  `;
  host.innerHTML = `
    <div class="box stage-work-box nominal-face" id="stage2-work-box">
      <div class="work-flip-scene">
        <div class="work-flip-card" id="stage2-flip-card">
          <div class="work-face front" id="stage2-face-front">
            ${frontSnapshot}
          </div>
          <div class="work-face back" id="stage2-face-back">
            <div class="stage-pill">2단계: 명사구 번역(빈칸) (${now}/${total})</div>

            <div class="sentence" style="margin-top:8px;">
              <span style="font-weight:900; color:#7e3106;">명사구</span><br/>
              <span style="font-weight:900;">${escapeHtml(nominalTextNew)}</span>
            </div>

            <div class="sentence" style="margin-top:10px;">
              <div class="mini-answer-line" id="stage2-answer-line"></div>
              <div class="mini-bank" id="stage2-bank-area"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const renderStage2Mini = () => {
    const answerLine = document.getElementById("stage2-answer-line");
    const bankArea = document.getElementById("stage2-bank-area");
    if (!answerLine || !bankArea) return;

    answerLine.innerHTML = "";
    if (!stage2SelectedTokens.length) {
      const hint = document.createElement("span");
      hint.style.opacity = ".45";
      hint.style.fontWeight = "900";
      hint.style.color = "#7e3106";
      hint.textContent = "(토큰을 순서대로 눌러서 채우세요)";
      answerLine.appendChild(hint);
    } else {
      stage2SelectedTokens.forEach((tok, idx) => {
        const isLast = idx === stage2SelectedTokens.length - 1;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "mini-token answer-chip";
        chip.textContent = tok.text;
        chip.disabled = !isLast || !stage2FlipReady;
        chip.style.cursor = (isLast && stage2FlipReady) ? "pointer" : "default";
        if (isLast) chip.style.borderWidth = "2px";
        chip.onclick = () => {
          if (!isLast || !stage2FlipReady) return;
          const popped = stage2SelectedTokens.pop();
          if (popped) stage2BankTokens.push(popped);
          renderStage2Mini();
        };
        answerLine.appendChild(chip);
      });
    }

    bankArea.innerHTML = "";
    stage2BankTokens.forEach((tok) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mini-token";
      btn.textContent = tok.text;
      btn.disabled = !stage2FlipReady;
      btn.onclick = () => {
        if (!stage2FlipReady) return;
        const idx = stage2BankTokens.findIndex((x) => x.id === tok.id);
        if (idx < 0) return;
        const [moved] = stage2BankTokens.splice(idx, 1);
        stage2SelectedTokens.push(moved);
        renderStage2Mini();
        if (stage2SelectedTokens.length === stage2ExpectedTokens.length) {
          const built = stage2SelectedTokens.map((x) => x.text);
          const ok = sameKoreanTokenOrder(built, stage2ExpectedTokens);
          if (!ok) {
            if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
            stage2SelectedTokens = [];
            stage2BankTokens = shuffleArray(stage2ExpectedTokens.map((t, i) => ({
              id: `s2r_${activePhraseIdx}_${i}_${Math.random().toString(16).slice(2, 6)}`,
              text: t
            })));
            renderStage2Mini();
            return;
          }
          donePhrase[activePhraseIdx] = true;
          if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
          const goNextStage = () => {
            selectedSet = new Set();
            activePhraseIdx = null;
            if (donePhrase.every(Boolean)) {
              stage = 3;
              renderStage();
              return;
            }
            const flip = document.getElementById("stage2-flip-card");
            const work = document.getElementById("stage2-work-box");
            stage2FlipReady = false;
            if (flip) flip.classList.remove("is-flipped");
            if (work) work.classList.remove("nominal-face");
            setTimeout(() => {
              stage = 1;
              renderStage();
            }, 420);
          };
          setTimeout(goNextStage, 120);
        }
      };
      bankArea.appendChild(btn);
    });
  };

  renderStage2Mini();
  requestAnimationFrame(() => {
    const flip = document.getElementById("stage2-flip-card");
    if (flip) flip.classList.add("is-flipped");
    setTimeout(() => {
      stage2FlipReady = true;
      renderStage2Mini();
    }, 520);
  });
}

function getExpectedTransBlankForPhrase(pi){
  const arr = cur.transBlanks || [];
  if (arr[pi]) return String(arr[pi]).trim();
  if (arr.length === 1) return String(arr[0]).trim();
  return arr.map(x => String(x||"").trim()).filter(Boolean).join(" / ");
}

/* "{가격}의 {빠른} {오름}" -> segments */
function parseBraceTemplate(s){
  const raw = String(s || "").trim();
  if (!raw) return [{ type:"text", value:"" }];

  const out = [];
  const re = /\{([^}]+)\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw)) !== null){
    const before = raw.slice(last, m.index);
    if (before) out.push({ type:"text", value: before });
    out.push({ type:"blank", expected: String(m[1] || "").trim() });
    last = m.index + m[0].length;
  }
  const tail = raw.slice(last);
  if (tail) out.push({ type:"text", value: tail });
  return out;
}

function renderTemplateAsText(segments){
  return segments.map(seg => seg.type === "text" ? seg.value : seg.expected).join("");
}

/* ================== Stage 3 (해석 순서) ================== */
function renderStage3(host){
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = false;

  korSelectedTokens = [];
  korBankTokens = [];

  // ✅ 원문(완료 표시 포함) 보여주기
  const doneWordSet = new Set();
  donePhrase.forEach((isDone, i) => {
    if (!isDone) return;
    (phraseWordIndices[i] || []).forEach(ix => doneWordSet.add(ix));
  });

  const configuredTokens = parseLaststageKRTokensL6E4(cur.laststageKRTokens || "");
  let tokenObjs = configuredTokens;
  if (!tokenObjs.length) {
    const phraseChunkObjs = buildPhraseChunkObjectsFromTransBlanks(); // [{text, phraseIdx}]
    const tokens = buildKoreanTokensWithPhraseChunks(cur.korean, phraseChunkObjs.map(o => o.text));
    tokenObjs = tokens.map((t) => ({
      text: t,
      phraseIdx: detectPhraseIdxForToken(t, phraseChunkObjs)
    }));
  }

  korBankTokens = shuffleArray(tokenObjs.map((t, i) => ({
    id: `k${i}_${Math.random().toString(16).slice(2,6)}`,
    text: t.text,
    phraseIdx: (t.phraseIdx ?? null)
  })));

  host.innerHTML = `${window.HermaStageTemplates?.translateBlockHTML?.() || `
    <div id="translate-block">
      <div class="box" style="margin-bottom:10px;">
        <div class="sentence" id="plain-english-line"></div>
      </div>
      <div class="sentence" id="answer-line" style="min-height:86px; display:flex; flex-wrap:wrap; align-items:flex-start; gap:6px;"></div>
      <div class="box" style="margin-top:10px;">
        <div id="bank-area"></div>
        <div id="remain-info" style="margin-top:8px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78);"></div>
      </div>
    </div>
  `}`;

  const tb = document.getElementById("translate-block");
  if (tb) tb.classList.remove("hidden");

  const plainLine = document.getElementById("plain-english-line");
  renderSentenceStatic(plainLine, doneWordSet);

  renderKor();
}

/* stage3 원문은 클릭 불가(완료만 초록) */
function renderSentenceStatic(container, doneWordSet){
  if (!container) return;
  container.innerHTML = "";

  let wordCursor = 0;
  sentenceParts.forEach((p) => {
    if (p.kind === "space") {
      container.appendChild(document.createTextNode(p.raw));
      return;
    }
    if (p.kind !== "word") {
      const sp = document.createElement("span");
      sp.textContent = p.raw;
      container.appendChild(sp);
      return;
    }
    const wi = wordCursor++;
    const span = document.createElement("span");
    span.className = "wTok";
    span.textContent = p.raw;

    if (doneWordSet.has(wi)) span.classList.add("done");
    else span.style.cursor = "default";

    container.appendChild(span);
  });
}

/* 번역빈칸들로부터 '정답 청크' 만들기 (+ phraseIdx) */
function buildPhraseChunkObjectsFromTransBlanks(){
  const out = [];
  const arr = cur.transBlanks || [];
  for (let i=0; i<arr.length; i++){
    const segs = parseBraceTemplate(arr[i] || "");
    const txt = renderTemplateAsText(segs).trim();
    if (txt) out.push({ text: txt, phraseIdx: i }); // ✅ 기본: transBlanks 순서 = 명사구 순서
  }
  return out;
}

/* ✅ 토큰이 명사구 덩어리를 포함하면 phraseIdx 부여 (조사/구두점이 붙어도) */
function detectPhraseIdxForToken(tokenText, chunkObjs){
  const tNorm = normalizeKoreanKeepPunct(tokenText).replace(/\s+/g,"");
  let best = null;
  let bestLen = 0;

  (chunkObjs || []).forEach(obj => {
    const cNorm = normalizeKoreanKeepPunct(obj.text).replace(/\s+/g,"");
    if (!cNorm) return;
    if (tNorm.includes(cNorm) && cNorm.length > bestLen){
      best = obj.phraseIdx;
      bestLen = cNorm.length;
    }
  });

  return best;
}

/* ✅ 한국어 토큰: phraseChunks가 해석 문장 안에 있으면 그 구간은 1토큰으로 (조사/구두점 붙어도 복구) */
function buildKoreanTokensWithPhraseChunks(korean, phraseChunks){
  let s = normalizeKoreanKeepPunct(korean);
  if (!s) return [];

  const chunks = (phraseChunks || []).map(x => String(x).trim()).filter(Boolean);

  const sorted = chunks
    .map((t, idx) => ({ t, idx }))
    .sort((a,b) => b.t.length - a.t.length);

  const map = new Map(); // placeholder -> text
  let usedAny = false;

  sorted.forEach(({t, idx}) => {
    const ph = `§P${idx}§`;
    const rep = replaceFirst(s, t, ph);
    if (rep.ok){
      usedAny = true;
      s = rep.str;
      map.set(ph, t);
    }
  });

  if (!usedAny){
    return tokenizeKoreanSimple(korean);
  }

  // ✅ 공백 기준 토큰화(placeholder는 공백이 없으니 한 덩어리 유지)
  const rawToks = s.split(/\s+/).filter(Boolean);

  // ✅ placeholder가 붙어도 복구
  const out = rawToks.map(tok => restorePlaceholdersInToken(tok, map));

  if (out.some(t => /§P\d+§/.test(t))){
    return out.map(t => restorePlaceholdersInToken(t, map, true));
  }

  return out;
}

function restorePlaceholdersInToken(tok, map, aggressive=false){
  let t = String(tok);
  for (const [ph, real] of map.entries()){
    if (t.includes(ph)){
      t = t.split(ph).join(real);
    }
  }
  if (aggressive && /§P\d+§/.test(t)){
    t = t.replace(/§P\d+§/g, (m) => map.get(m) || m);
  }
  return t;
}

function replaceFirst(str, find, repl){
  const s = String(str);
  const f = String(find);
  const i = s.indexOf(f);
  if (i === -1) return { str: s, ok:false };
  return { str: s.slice(0,i) + repl + s.slice(i + f.length), ok:true };
}

function tokenizeKoreanSimple(kor){
  const s = String(kor || "").trim();
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}

function parseLaststageKRTokensL6E4(raw){
  const s = String(raw || "").trim();
  if (!s) return [];
  return s
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((part) => {
      let m = part.match(/^p(\d+)\s*::\s*(.+)$/i);
      if (m) return { text: m[2].trim(), phraseIdx: Number(m[1]) };
      m = part.match(/^(plain|none|x)\s*::\s*(.+)$/i);
      if (m) return { text: m[2].trim(), phraseIdx: null };
      m = part.match(/^(ab)\s*::\s*(.+)$/i);
      if (m) return { text: m[2].trim(), phraseIdx: 0 };
      return { text: part, phraseIdx: null };
    })
    .filter((t) => String(t.text || "").trim() !== "");
}

function normalizeKoreanKeepPunct(s){
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .trim();
}

/* ✅ 3단계 렌더: 하얀 토큰 + 명사구 덩어리 토큰은 밑줄색 유지 */
function renderKor(){
  const answerLine = document.getElementById("answer-line") || document.getElementById("kor-line");
  const bankArea = document.getElementById("bank-area") || document.getElementById("kor-bank");
  const remainInfo = document.getElementById("remain-info");
  if (!answerLine || !bankArea) return;

  if (window.HermaFinalStage?.renderKoreanScramble) {
    window.HermaFinalStage.renderKoreanScramble({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo || null,
      selectedTokens: korSelectedTokens,
      bankTokens: korBankTokens,
      isKoLocked: isAnswered,
      onSelectToken: (tok) => {
        if (isAnswered) return;
        const idx = korBankTokens.findIndex((x) => x.id === tok.id);
        if (idx >= 0) {
          const moved = korBankTokens.splice(idx, 1)[0];
          if (moved) korSelectedTokens.push(moved);
        }
      },
      onUnselectLast: () => {
        if (isAnswered) return;
        const last = korSelectedTokens.pop();
        if (last) korBankTokens.push(last);
      },
      decorateToken: (el, tok) => {
        if (!el || tok?.phraseIdx === null || tok?.phraseIdx === undefined) return;
        applyUnderlineStyle(el, tok.phraseIdx);
      },
      rerender: () => renderKor(),
      guideHtml: "\uC870\uAC01\uC744 \uB204\uB974\uC138\uC694.<br>\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4."
    });
    return;
  }

  answerLine.innerHTML = "";
  if (!korSelectedTokens.length){
    const hint = document.createElement("span");
    hint.style.opacity = "0.45";
    hint.style.fontWeight = "900";
    hint.style.lineHeight = "1.45";
    hint.innerHTML = "\uC870\uAC01\uC744 \uB204\uB974\uC138\uC694.<br>\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4.";
    answerLine.appendChild(hint);
  } else {
    korSelectedTokens.forEach((tok, idx) => {
      const isLast = idx === korSelectedTokens.length - 1;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill-btn";
      btn.textContent = tok.text;
      btn.style.margin = "0 6px 6px 0";
      btn.style.border = isLast ? "2px solid rgba(241,123,42,0.9)" : "1px solid rgba(0,0,0,0.12)";
      btn.style.cursor = isAnswered ? "not-allowed" : (isLast ? "pointer" : "default");
      btn.disabled = isAnswered;
      if (tok.phraseIdx !== null && tok.phraseIdx !== undefined){
        applyUnderlineStyle(btn, tok.phraseIdx);
      }
      btn.addEventListener("click", () => {
        if (isAnswered || !isLast) return;
        const last = korSelectedTokens.pop();
        if (last) korBankTokens.push(last);
        renderKor();
      });
      answerLine.appendChild(btn);
    });
  }

  bankArea.innerHTML = "";
  korBankTokens.forEach((tok) => {
    const btn = document.createElement("button");
    btn.className = "pill-btn";
    btn.type = "button";
    btn.textContent = tok.text;
    btn.disabled = isAnswered;
    if (tok.phraseIdx !== null && tok.phraseIdx !== undefined){
      applyUnderlineStyle(btn, tok.phraseIdx);
    }
    btn.addEventListener("click", () => {
      if (isAnswered) return;
      const idx = korBankTokens.findIndex(x => x.id === tok.id);
      if (idx >= 0){
        const [moved] = korBankTokens.splice(idx, 1);
        korSelectedTokens.push(moved);
        renderKor();
      }
    });
    bankArea.appendChild(btn);
  });
}

/* ================== Submit / Next / Result ================== */
function submitAnswer(){
  if (isAnswered) return;
  const q = questions[currentIndex];
  const korUser = normalizeKorean(korSelectedTokens.map(x => x.text).join(" "));
  const korTarget = normalizeKorean(cur.korean);
  const stage3Ok = (korUser === korTarget);
  const correct = donePhrase.every(Boolean) && stage3Ok;

  if (!correct){
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    return;
  }

  isAnswered = true;
  results.push({
    no: currentIndex + 1,
    word: `Herma L6-E4 / Q${q.qNumber}`,
    selected: `해석: ${korUser || "무응답"}`,
    correct: true,
    question: cur.sentence,
    englishAnswer: cur.answerRaw,
    koreanAnswer: cur.korean
  });

  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  const bank = document.getElementById("kor-bank");
  if (bank) Array.from(bank.querySelectorAll("button")).forEach(b => (b.disabled = true));
}

function goNext(){
  if (!isAnswered){
    const q = questions[currentIndex];
    results.push({
      no: currentIndex + 1,
      word: `Herma L6-E4 / Q${q.qNumber}`,
      selected: `미제출`,
      correct: false,
      question: cur?.sentence || "",
      englishAnswer: cur?.answerRaw || "",
      koreanAnswer: cur?.korean || ""
    });
  }

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

function showResultPopup(){
  const total = results.length;
  const correctCount = results.filter(r => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const resultObject = {
    quiztitle: quizTitle,
    subcategory,
    level,
    day,
    teststatus: "done",
    course: "herma",
    lesson: TARGET_LESSON,
    exercise: TARGET_EXERCISE,
    userId: userId || "",
    testspecific: results
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
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 답</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">정답</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" onclick="window.location.reload()">🔁 재시험</button>
      <button class="quiz-btn" onclick="document.getElementById('result-popup').style.display='none'">닫기</button>
    </div>
  `;

  popup.style.display = "flex";
}

/* ================== Tokenize / Match Utils ================== */
function tokenizeSentence(sentence){
  const s = stripStars(String(sentence || "").replace(/[’]/g, "'"));
  const re = /(\s+|[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?|[^A-Za-z0-9\s]+)/g;
  const parts = [];
  const m = s.match(re) || [];
  for (const raw of m){
    if (!raw) continue;
    if (/^\s+$/.test(raw)){
      parts.push({ kind:"space", raw });
    } else if (/^[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?$/.test(raw)){
      parts.push({ kind:"word", raw, norm: normalizeWord(raw) });
    } else {
      parts.push({ kind:"punct", raw });
    }
  }
  return parts;
}

function extractWordNorms(text){
  const s = stripStars(String(text || "").replace(/[’]/g, "'"));
  const re = /[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g;
  const m = s.match(re) || [];
  return m.map(w => normalizeWord(w)).filter(Boolean);
}

function findSubsequence(hay, needle){
  if (!needle.length) return -1;
  for (let i=0; i<=hay.length-needle.length; i++){
    let ok = true;
    for (let j=0; j<needle.length; j++){
      if (hay[i+j] !== needle[j]) { ok=false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

/* ================== Korean Utils ================== */
function normalizeKorean(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.。!?]+$/g, "")
    .trim();
}
function normalizeKoreanLoose(s){
  return String(s || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[.。!?'"“”]+/g, "")
    .trim();
}
function sameKoreanTokenOrder(a, b){
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++){
    const aa = normalizeKoreanLoose(a[i] || "");
    const bb = normalizeKoreanLoose(b[i] || "");
    if (aa !== bb) return false;
  }
  return true;
}

/* ================== Misc Utils ================== */
function normalizeWord(w){
  return String(w || "")
    .replace(/[’]/g, "'")
    .replace(/^[“"']+|[”"']+$/g, "")
    .replace(/[,:;]+$/g, "")
    .replace(/[.?!]+$/g, "")
    .trim()
    .toLowerCase();
}

function shuffleArray(arr) {
  const a = arr.slice();
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
function trimForTable(s) {
  const t = String(s || "");
  return t.length > 70 ? t.slice(0, 70) + "..." : t;
}
