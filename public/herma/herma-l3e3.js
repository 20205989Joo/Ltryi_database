// ver1.1_26.02.22
// herma-l3e5.js (L3-E5: 관계절·형용사절 압축해서 말하기)
// ------------------------------------------------------------
// ✅ UI/톤/구조: herma-l3e4.js 그대로
// ✅ 진행 흐름(한 박스 안에서 단계 교체):
//   1) 약분하기: 관계절에서 who/that/which (+ be) 또는 who/that + 동사(→ -ing) 를 눌러 줄긋기(페이드)
//   2) Scramble: 섞인 영단어를 순서대로 눌러 정답 문장 완성
//   3) 해석 순서: 섞인 한국어 조각을 순서대로 눌러 해석 완성
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 3;
const TARGET_EXERCISE = 3;
const TARGET_EXERCISE_LABEL = "3";
const SOURCE_EXERCISE_ODD = 4;
const SOURCE_EXERCISE_EVEN = 5;

let subcategory = "Grammar";
let level = "Basic";
let day = "111";
let quizTitle = "quiz_Grammar_Basic_111";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;

// stage states
let reducedOk = false;
let engOk = false;
let korOk = false;

let requiredIdxSet = new Set();
let fadedIdxSet = new Set();

let engBank = [];
let engSelected = [];
let korBank = [];
let korSelected = [];
let engSpawning = false;
let engGhostText = "";
let engRoleWords = { A: new Set(), B: new Set(), LINK: new Set(), LINKBOX: new Set() };

let currentPattern = ""; // IF_IT_IS | IF_YOU_ARE | REL_BE | REL_VERB | UNKNOWN
const SIMPLE_INSTRUCTION = "\uac19\uc740 \uc758\ubbf8\uac00 \ub418\ub3c4\ub85d, \uc904\uc5ec\ubcf4\uc138\uc694!";

// ---------- boot ----------
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

// ---------- params/nav ----------
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

// ---------- styles ----------
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --boxWarm: #fff3e0;
      --inkBrown: #7e3106;
      --reqBg: rgba(255, 208, 90, 0.45);
      --reqBd: rgba(160, 110, 0, 0.18);
    }

    .tok{ cursor:pointer; user-select:none; }
    .uA, .uB, .uLink{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 5px;
      font-weight: 900;
    }
    .uA{ text-decoration-color: rgba(241,123,42,0.95); }
    .uB{ text-decoration-color: rgba(70,120,255,0.95); }
    .uLink{ text-decoration-color: rgba(255, 208, 90, 0.95); }
    .who-gold{
      display:inline-block;
      padding:1px 6px;
      border-radius:999px;
      background: rgba(255, 208, 90, 0.45);
      border: 1px solid rgba(160, 110, 0, 0.22);
      color:#7e3106;
      font-weight:900;
    }
    .tok.req{
      background: transparent;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
      font-weight: inherit;
    }
    .tok.locked{ cursor: default !important; }
    .tok.locked:hover{ transform: none !important; }
    .tok.faded{
      opacity: 0.22 !important;
      text-decoration: line-through !important;
      filter: blur(0.2px) !important;
    }
    .tok.nope{
      box-shadow: inset 0 0 0 1px rgba(200, 40, 40, 0.22);
      background: rgba(200, 40, 40, 0.05);
    }

    .ab-shell{
      background: var(--boxWarm);
      border: 1px solid #e9c7a7;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
      position: relative;
      overflow: visible;
    }
    #main-shell.flat-shell{
      background: transparent;
      border: none;
      padding: 0;
    }
    .ab-title{ font-weight: 900; color: var(--inkBrown); margin-bottom:6px; }

    .stage-pill{
      display:inline-block;
      font-size:12px;
      padding:6px 10px;
      border-radius:999px;
      font-weight:900;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      margin-bottom:10px;
    }

    .hidden{ display:none !important; }
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
      white-space:nowrap;
    }
    .pill-btn.uA{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 4px;
      text-decoration-color: rgba(241,123,42,0.95);
    }
    .pill-btn.uB{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 4px;
      text-decoration-color: rgba(70,120,255,0.95);
    }
    .pill-btn.uLink{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 4px;
      text-decoration-color: rgba(255, 208, 90, 0.95);
      font-weight: 900;
    }
    .pill-btn.who-gold{
      background: rgba(255, 208, 90, 0.45);
      border-color: rgba(160, 110, 0, 0.22);
      color:#7e3106;
      font-weight: 900;
    }
    .pill-btn:disabled{ opacity:0.35; cursor:not-allowed; }

    .ok{ font-weight:900; font-size:18px; color:#2e7d32; text-align:center; }
    .no{ font-weight:900; font-size:18px; color:#c62828; text-align:center; }

    .swap-in{ animation: swapIn .18s ease-out both; }
    @keyframes swapIn{
      from{ transform: translateY(2px); opacity:0; }
      to{ transform: translateY(0); opacity:1; }
    }

    .fall-away{
      animation: fallAway .24s ease-in forwards;
      transform-origin: center top;
    }
    @keyframes fallAway{
      0%{ transform: translateY(0) scale(1); opacity:1; }
      100%{ transform: translateY(24px) scale(0.98); opacity:0; }
    }

    .shake{ animation: hermaShake 0.22s linear; }
    @keyframes hermaShake{
      0%{ transform: translateX(0); }
      25%{ transform: translateX(-3px); }
      50%{ transform: translateX(3px); }
      75%{ transform: translateX(-2px); }
      100%{ transform: translateX(0); }
    }

    .source-word{
      display:inline-block;
      margin-right: 3px;
      transform-origin: center top;
    }
    .source-word.drop{
      animation: sourceDrop .28s ease-in forwards;
    }
    @keyframes sourceDrop{
      0%{ transform: translateY(0px) rotate(0deg); opacity:1; }
      100%{ transform: translateY(28px) rotate(4deg); opacity:0; }
    }
    .eng-ghost-text{
      visibility: hidden;
      display: block;
      white-space: pre-wrap;
      user-select: none;
    }
    #eng-plain-line.stage2-live{
      display: grid;
      align-content: start;
      min-height: 44px;
    }
    #eng-plain-line.stage2-live .eng-ghost-text,
    #eng-plain-line.stage2-live .eng-live-text{
      grid-area: 1 / 1;
    }
    .eng-live-text{
      display: block;
      white-space: pre-wrap;
    }
  `;
  document.head.appendChild(style);
}

// ---------- load excel ----------
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

// ---------- build questions ----------
function buildQuestionsFromRows() {
  const rowsOdd = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === SOURCE_EXERCISE_ODD)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));
  const rowsEven = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === SOURCE_EXERCISE_EVEN)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  const merged = [];
  const maxLen = Math.max(rowsOdd.length, rowsEven.length);
  for (let i = 0; i < maxLen; i++) {
    if (rowsOdd[i]) merged.push({ row: rowsOdd[i], sourceExercise: SOURCE_EXERCISE_ODD });
    if (rowsEven[i]) merged.push({ row: rowsEven[i], sourceExercise: SOURCE_EXERCISE_EVEN });
  }

  questions = merged.map((item, idx) => {
    const r = item.row;
    const qNumber = idx + 1;
    const sourceQNumber = Number(r["QNumber"]) || idx + 1;
    const title = String(r["Title"] ?? "").trim();
    const instruction = String(r["Instruction"] ?? "").trim();
    const question = String(r["Question"] ?? "").trim();
    const answerRaw = String(r["Answer"] ?? "").trim();
    const transformsRaw =
      String(r["Transforms"] ?? r["Transform"] ?? r["TransformMap"] ?? "").trim();
    const laststageFinalRaw =
      String(r["Laststage-FinalSentence"] ?? r["LaststageFinalSentence"] ?? "").trim();
    const laststageKRTokensRaw =
      String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();
    const transformMeta = parseTransformsMetaE33(transformsRaw);
    const configuredFinalParts = parseLaststageFinalSentenceForE33(laststageFinalRaw);
    const configuredKRTokens = parseLaststageKRTokensForE33(laststageKRTokensRaw);
    const configuredScrambleParts =
      parseScrambleColorPartsForE33(transformMeta.scrambleColorTokens || transformMeta.engColorTokens || "");

    const { engAnswer, korAnswer } = splitEngKor(answerRaw);

    return {
      qNumber,
      sourceQNumber,
      sourceExercise: item.sourceExercise,
      title,
      instruction,
      question,
      engAnswer: stripTrailingPeriod(engAnswer),
      korAnswer: String(korAnswer || "").trim(),
      transformsRaw,
      transformMeta,
      laststageFinalSentence: laststageFinalRaw,
      laststageKRTokens: laststageKRTokensRaw,
      configuredFinalParts,
      configuredKRTokens,
      configuredScrambleParts,
    };
  });
}

function splitEngKor(answerRaw) {
  const s = String(answerRaw || "").trim();
  if (!s) return { engAnswer: "", korAnswer: "" };

  if (s.includes("||")) {
    const parts = s.split("||").map((x) => String(x || "").trim()).filter(Boolean);
    const eng = String(parts[0] || "").trim();
    const kor = String(parts.slice(1).join(" ") || "").trim();
    return { engAnswer: eng, korAnswer: kor };
  }

  let cut = s.search(/[가-힣]/);
  if (cut === -1) cut = s.search(/[^\x00-\x7F]/);
  if (cut === -1) return { engAnswer: s, korAnswer: "" };
  const eng = s.slice(0, cut).trim();
  const kor = s.slice(cut).trim();
  return { engAnswer: eng, korAnswer: kor };
}

function parseTransformsMetaE33(raw) {
  const meta = {};
  const s = String(raw || "").trim();
  if (!s) return meta;
  const parts = s.split(/[;|]/).map((x) => x.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^([a-zA-Z0-9_-]+)\s*[:=]\s*(.+)$/);
    if (!m) continue;
    const key = String(m[1] || "").trim().toLowerCase();
    const val = String(m[2] || "").trim();
    if (!key) continue;
    meta[key] = val;
  }
  if (meta.scramblecolortokens !== undefined) meta.scrambleColorTokens = String(meta.scramblecolortokens || "").trim();
  if (meta.engcolortokens !== undefined) meta.engColorTokens = String(meta.engcolortokens || "").trim();
  return meta;
}

function parseTaggedPartsE33(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];

  let tagged = false;
  const out = [];
  for (const part of parts) {
    const m = part.match(/^(plain|a|b|c|ab|pair|link|linkbox|hint)\s*::\s*(.+)$/i);
    if (m) {
      tagged = true;
      out.push({ seg: String(m[1] || "").toLowerCase(), text: String(m[2] || "").trim() });
      continue;
    }
    out.push({ seg: "plain", text: part });
  }
  if (!tagged) return [];
  return out.filter((x) => x.text);
}

function parseLaststageFinalSentenceForE33(raw) {
  return parseTaggedPartsE33(raw);
}

function parseScrambleColorPartsForE33(raw) {
  return parseTaggedPartsE33(raw);
}

function parseLaststageKRTokensForE33(raw) {
  return parseTaggedPartsE33(raw).map((x) => ({ text: x.text, seg: x.seg }));
}

function mapFinalSegClassForE33(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "uA";
  if (s === "b" || s === "c") return "uB";
  if (s === "link") return "uLink";
  if (s === "linkbox" || s === "hint") return "who-gold";
  return "";
}

function mapKRTokensSegToRoleForE33(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "A";
  if (s === "b" || s === "c") return "B";
  if (s === "link") return "LINK";
  if (s === "linkbox" || s === "hint") return "LINKBOX";
  return null;
}

function tokenRoleClassForE33(role) {
  if (role === "A") return "uA";
  if (role === "B") return "uB";
  if (role === "LINK") return "uLink";
  if (role === "LINKBOX") return "who-gold";
  return "";
}

function renderConfiguredFinalSentenceForE33(parts) {
  const chunks = (parts || [])
    .map((part) => {
      const text = String(part?.text || "").trim();
      if (!text) return "";
      const cls = mapFinalSegClassForE33(part.seg);
      if (!cls) return escapeHtml(text);
      return `<span class="${cls}">${escapeHtml(text)}</span>`;
    })
    .filter(Boolean);
  if (!chunks.length) return "";
  const joined = chunks.join(" ").trim();
  if (/[.!?]$/.test(joined)) return joined;
  return `${joined}.`;
}

// ---------- intro ----------
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L3-E3";
  const instruction = SIMPLE_INSTRUCTION;

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L3-E3</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE_LABEL}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106; line-height:1.6;">
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
  renderQuestion();
}

// ---------- main ----------
function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  isAnswered = false;
  reducedOk = false;
  engOk = false;
  korOk = false;
  requiredIdxSet = new Set();
  fadedIdxSet = new Set();
  engBank = [];
  engSelected = [];
  korBank = [];
  korSelected = [];
  engSpawning = false;
  engGhostText = "";
  engRoleWords = buildEngRoleWordsForE33(q);

  const sentenceRaw = stripTrailingPeriod(String(q.question || "").trim());
  const wordsOnly = sentenceRaw.split(/\s+/).filter(Boolean);
  const reqPos = getRequiredWordPositions(wordsOnly, q.sourceExercise);

  const t = tokenizeTextWithReq(sentenceRaw, reqPos, 0);
  const tokens = t.tokens;

  for (const tok of tokens) {
    if (!tok.isSpace && tok.isReq) requiredIdxSet.add(String(tok.idx));
  }

  const stage1Hint = "";
  const translateBlockTpl =
    window.HermaStageTemplates?.translateBlockHTML?.() ||
    `
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
    `;

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" id="instruction-box">
      <div class="stage-pill" id="stage-pill">1단계: 약분하기</div>
      <div id="instruction-text" style="font-weight:900; color:#7e3106; line-height:1.6;">
        ${escapeHtml(SIMPLE_INSTRUCTION)}
      </div>
      <div id="instruction-sub" style="margin-top:8px; font-size:12px; color:#555; line-height:1.5;">
        ${escapeHtml(stage1Hint)}
      </div>
    </div>

    <div class="ab-shell" id="main-shell">
      <div class="ab-title">문장</div>
      <div class="sentence" id="sentence-line"></div>

      <div id="stage2" class="hidden">
        <div class="box" style="margin-bottom:10px;">
          <div class="sentence stage2-live" id="eng-plain-line"></div>
        </div>
        <div class="box" style="margin-top:10px;">
          <div id="eng-bank-area"></div>
          <div id="eng-remain-info" style="margin-top:8px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78);"></div>
        </div>
      </div>
    </div>

    ${translateBlockTpl}

    <div id="stage-action-row" class="btn-row" style="margin-top:12px; display:none;">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  const stagePillEl = document.getElementById("stage-pill");
  if (stagePillEl) stagePillEl.style.display = "none";
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  const actionRow = document.getElementById("stage-action-row");
  if (actionRow) actionRow.style.display = "none";

  const sentenceLine = document.getElementById("sentence-line");
  if (sentenceLine) sentenceLine.innerHTML = buildSentenceHTML(tokens);

  if (sentenceLine) {
    sentenceLine.addEventListener("click", (ev) => {
      if (reducedOk) return;

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
        reducedOk = true;
        completeStage1AndProceed(q, sentenceLine);
      }
      if (requiredIdxSet.size === 0 && !reducedOk) {
        reducedOk = true;
        completeStage1AndProceed(q, sentenceLine);
      }
    });
  }

  if (requiredIdxSet.size === 0 && !reducedOk) {
    reducedOk = true;
    setTimeout(() => completeStage1AndProceed(q, sentenceLine), 120);
  }
}

function completeStage1AndProceed(q, sentenceEl) {
  if (sentenceEl) {
    sentenceEl.classList.add("shake");
    setTimeout(() => sentenceEl.classList.remove("shake"), 220);
  }
  toastOk("1단계 완료!");
  const sourceText = stripTrailingPeriod(String(sentenceEl?.textContent || q.engAnswer || "").trim());
  setTimeout(() => toStage2(q, sourceText), 220);
}

async function toStage2(q, sourceSentenceText) {
  const stageLine = document.getElementById("sentence-line");
  const stage2 = document.getElementById("stage2");
  const instBox = document.getElementById("instruction-box");
  const shell = document.getElementById("main-shell");

  if (stageLine) stageLine.classList.add("fall-away");
  if (instBox) {
    instBox.style.overflow = "hidden";
    instBox.animate(
      [
        { maxHeight: `${instBox.scrollHeight || 200}px`, opacity: 1, transform: "translateY(0)" },
        { maxHeight: "0px", opacity: 0, transform: "translateY(-10px)" },
      ],
      { duration: 280, easing: "ease" }
    );
  }
  await wait(300);

  if (stageLine) stageLine.classList.add("hidden");
  if (instBox) instBox.remove();
  if (shell) shell.classList.add("flat-shell");
  if (stage2) {
    stage2.classList.remove("hidden");
    stage2.classList.add("swap-in");
  }

  initEngScramble(q.engAnswer, { spawnFrom: sourceSentenceText || stripTrailingPeriod(q.engAnswer || "") });
}

function toStage3(q) {
  const stage2 = document.getElementById("stage2");
  if (stage2) stage2.classList.add("hidden");
  const shell = document.getElementById("main-shell");
  const instBox = document.getElementById("instruction-box");
  const tb = document.getElementById("translate-block");
  if (window.HermaStageTemplates?.openFinalStage) {
    window.HermaStageTemplates.openFinalStage({
      abBlockEl: shell,
      instructionBoxEl: instBox,
      translateBlockEl: tb,
      collapseRemove: collapseUpAndRemove,
    });
  } else {
    if (shell) shell.classList.add("hidden");
    collapseUpAndRemove(instBox);
    if (tb) tb.classList.remove("hidden");
  }

  const plain = document.getElementById("plain-english-line");
  if (plain) {
    if (Array.isArray(q.configuredFinalParts) && q.configuredFinalParts.length) {
      plain.innerHTML = `<div>${renderConfiguredFinalSentenceForE33(q.configuredFinalParts)}</div>`;
    } else if (engSelected && engSelected.length) {
      plain.innerHTML = `<div>${renderEngTokensHTML(engSelected)}.</div>`;
    } else {
      const tmp = tokenizeEnglish(q.engAnswer || "").map((t) => ({ text: t }));
      plain.innerHTML = `<div>${renderEngTokensHTML(tmp)}.</div>`;
    }
  }

  initKorOrder(q);
  const actionRow = document.getElementById("stage-action-row");
  if (actionRow) actionRow.style.display = "flex";
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = false;
}

// ---------- stage2: English scramble ----------
function initEngScramble(engAnswer, options = {}) {
  const tokens = tokenizeEnglish(engAnswer);
  engSelected = [];
  engBank = [];
  engSpawning = true;
  engGhostText = stripTrailingPeriod(String(engAnswer || "").trim());
  renderEng();

  const spawnFrom = stripTrailingPeriod(String(options.spawnFrom || engAnswer || "").trim());
  const shuffled = shuffleArray(tokens.map((t, i) => ({ id: `e${i}_${t}`, text: t })));
  animateEngTokenSpawn(spawnFrom, shuffled);
}

function renderEngTokensHTML(arr) {
  const a = Array.isArray(arr) ? arr : [];
  return a.map((x) => escapeHtml(String(x?.text ?? ""))).join(" ");
}

function renderEng() {
  const bankArea = document.getElementById("eng-bank-area");
  const plainLine = document.getElementById("eng-plain-line");
  const remainInfo = document.getElementById("eng-remain-info");
  if (!bankArea || !plainLine || !remainInfo) return;

  if (!engSpawning) {
    const base = stripTrailingPeriod(String(engGhostText || questions[currentIndex]?.engAnswer || "").trim());
    const live = renderEngTokensHTML(engSelected);
    plainLine.innerHTML = `
      <span class="eng-ghost-text">${escapeHtml(base ? `${base}.` : ".")}</span>
      <span class="eng-live-text">${live}</span>
    `;
    plainLine.style.cursor = !engOk && engSelected.length ? "pointer" : "default";
    plainLine.onclick = () => {
      if (engOk || engSpawning || !engSelected.length) return;
      const last = engSelected.pop();
      if (last) engBank.push(last);
      renderEng();
    };
  }

  remainInfo.textContent = `남은 조각: ${engBank.length}개`;
  bankArea.innerHTML = "";
  engBank.forEach((tok) => {
    const btn = document.createElement("button");
    btn.className = "pill-btn";
    btn.type = "button";
    btn.textContent = tok.text;
    btn.disabled = engOk || engSpawning;

    btn.addEventListener("click", () => {
      if (engOk || engSpawning) return;

      const idx = engBank.findIndex((x) => x.id === tok.id);
      if (idx >= 0) {
        const [moved] = engBank.splice(idx, 1);
        engSelected.push(moved);
        renderEng();
        checkEngComplete();
      }
    });

    bankArea.appendChild(btn);
  });
}

async function animateEngTokenSpawn(sourceSentence, shuffledTokens) {
  const plain = document.getElementById("eng-plain-line");
  const words = tokenizeEnglish(sourceSentence);
  engGhostText = stripTrailingPeriod(String(sourceSentence || "").trim());

  if (plain) {
    const base = stripTrailingPeriod(String(engGhostText || "").trim());
    const src = words.map((w) => `<span class="source-word">${escapeHtml(w)}</span>`).join(" ");
    plain.innerHTML = `
      <span class="eng-ghost-text">${escapeHtml(base ? `${base}.` : ".")}</span>
      <span class="eng-live-text">${src}</span>
    `;
  }

  const wordEls = plain ? Array.from(plain.querySelectorAll(".source-word")) : [];
  const total = Math.max(shuffledTokens.length, wordEls.length);
  await wait(700);

  for (let i = 0; i < total; i++) {
    if (wordEls[i]) wordEls[i].classList.add("drop");
    if (shuffledTokens[i]) engBank.push(shuffledTokens[i]);
    renderEng();
    await wait(70);
  }

  await wait(160);
  engSpawning = false;
  renderEng();
}

function checkEngComplete() {
  const q = questions[currentIndex];
  const userEng = engSelected.map((x) => x.text).join(" ");
  if (normalizeEnglish(userEng) === normalizeEnglish(q.engAnswer)) {
    engOk = true;
    lockEngScramble();
    toastOk("2단계 완료!");
    setTimeout(() => toStage3(q), 180);
  }
}

function lockEngScramble() {
  const bankArea = document.getElementById("eng-bank-area");
  if (bankArea) Array.from(bankArea.querySelectorAll("button")).forEach((b) => (b.disabled = true));
}

// ---------- stage3: Korean order ----------
function initKorOrder(q) {
  const configured = Array.isArray(q?.configuredKRTokens) ? q.configuredKRTokens : [];
  if (configured.length) {
    korBank = shuffleArray(
      configured.map((t, i) => ({
        id: `k${i}_${t.text}`,
        text: t.text,
        role: mapKRTokensSegToRoleForE33(t.seg),
      }))
    );
  } else {
    const tokens = tokenizeKorean(cleanPipesText(q?.korAnswer || ""));
    korBank = shuffleArray(tokens.map((t, i) => ({ id: `k${i}_${t}`, text: t, role: null })));
  }
  korSelected = [];
  renderKor();
}

function renderKor() {
  const bankArea = document.getElementById("bank-area");
  const answerLine = document.getElementById("answer-line");
  const remainInfo = document.getElementById("remain-info");
  if (!bankArea || !answerLine || !remainInfo) return;

  if (window.HermaFinalStage?.renderKoreanScramble) {
    window.HermaFinalStage.renderKoreanScramble({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo,
      selectedTokens: korSelected,
      bankTokens: korBank,
      isKoLocked: isAnswered,
      onSelectToken: (tok) => {
        if (isAnswered) return;
        const idx = korBank.findIndex((x) => x.id === tok.id);
        if (idx >= 0) {
          const [moved] = korBank.splice(idx, 1);
          korSelected.push(moved);
        }
      },
      onUnselectLast: () => {
        if (isAnswered) return;
        const last = korSelected.pop();
        if (last) korBank.push(last);
      },
      decorateToken: (el, tok) => {
        if (!el || !tok) return;
      },
      rerender: () => renderKor(),
    });
    return;
  }

  remainInfo.textContent = `남은 조각: ${korBank.length}개`;
  answerLine.textContent = korSelected.map((x) => x.text).join(" ");
  bankArea.innerHTML = "";
  korBank.forEach((tok) => {
    const btn = document.createElement("button");
    btn.className = "pill-btn";
    btn.type = "button";
    btn.textContent = tok.text;
    btn.disabled = isAnswered;
    btn.addEventListener("click", () => {
      if (isAnswered) return;
      const idx = korBank.findIndex((x) => x.id === tok.id);
      if (idx >= 0) {
        const [moved] = korBank.splice(idx, 1);
        korSelected.push(moved);
        renderKor();
      }
    });
    bankArea.appendChild(btn);
  });
}

// ---------- submit/next ----------
function submitAnswer() {
  if (!engOk) {
    toastNo("오답…");
    return;
  }
  if (isAnswered) return;

  const q = questions[currentIndex];
  const userEng = engSelected.length ? engSelected.map((x) => x.text).join(" ") : "";
  const userKor = korSelected.length ? korSelected.map((x) => x.text).join(" ") : "";
  const engCorrect = normalizeEnglish(userEng) === normalizeEnglish(q.engAnswer);
  const korCorrect = normalizeKorean(userKor) === normalizeKorean(q.korAnswer);
  korOk = korCorrect;
  const correct = !!(reducedOk && engCorrect && korCorrect);

  if (!correct) {
    toastNo("오답…");
    return;
  }

  isAnswered = true;
  results.push({
    no: currentIndex + 1,
    word: `Herma L3-E3 / Q${q.qNumber}`,
    selected: `${userEng || "무응답"} || kor:${userKor || "무응답"} || reduced:${reducedOk ? 1 : 0}`,
    correct,
    question: q.question,
    engAnswer: q.engAnswer,
    korAnswer: q.korAnswer,
  });

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  const engBankArea = document.getElementById("eng-bank-area");
  if (engBankArea) Array.from(engBankArea.querySelectorAll("button")).forEach((b) => (b.disabled = true));
  const korBankArea = document.getElementById("bank-area");
  if (korBankArea) Array.from(korBankArea.querySelectorAll("button")).forEach((b) => (b.disabled = true));
  renderKor();
  toastOk("정답!");
}

function goNext() {
  if (!isAnswered) {
    const q = questions[currentIndex];
    const userEng = engSelected.length ? engSelected.map((x) => x.text).join(" ") : "";
    const userKor = korSelected.length ? korSelected.map((x) => x.text).join(" ") : "";

    results.push({
      no: currentIndex + 1,
      word: `Herma L3-E3 / Q${q.qNumber}`,
      selected: `${userEng || "무응답"} || kor:${userKor || "무응답"} || reduced:${reducedOk ? 1 : 0}`,
      correct: false,
      question: q.question,
      engAnswer: q.engAnswer,
      korAnswer: q.korAnswer,
    });
  }

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

// ---------- result popup ----------
function showResultPopup() {
  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const resultObject = {
    quiztitle: quizTitle,
    subcategory,
    level,
    day,
    teststatus: "done",
    course: "herma",
    lesson: TARGET_LESSON,
    exercise: TARGET_EXERCISE_LABEL,
    userId: userId || "",
    testspecific: results,
  };

  localStorage.setItem("QuizResults", JSON.stringify(resultObject));

  const popup = document.getElementById("result-popup");
  const content = document.getElementById("result-content");
  if (!popup || !content) return alert(`완료! 점수: ${score}점 (${correctCount}/${total})`);

  const rows = results
    .map(
      (r) => `
    <tr>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.no}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.word)}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(trimForTable(r.selected))}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.correct ? "⭕" : "❌"}</td>
    </tr>
  `
    )
    .join("");

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
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 상태</th>
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

function restartQuiz() {
  window.location.reload();
}

function closePopup() {
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

// ---------- stage1 helpers ----------
function getRequiredWordPositions(words, sourceExercise) {
  if (Number(sourceExercise) === SOURCE_EXERCISE_ODD) {
    return getRequiredWordPositionsE34(words);
  }
  return getRequiredWordPositionsE35(words);
}

function getRequiredWordPositionsE34(words) {
  currentPattern = "UNKNOWN";
  const set = new Set();

  const w1 = cleanWord(words[0] || "");
  const w2 = cleanWord(words[1] || "");
  const w3 = cleanWord(words[2] || "");

  if (w1 === "if" && w2 === "it" && w3 === "is") {
    currentPattern = "IF_IT_IS";
    set.add(2);
    set.add(3);
  } else if (w1 === "if" && w2 === "you" && w3 === "are") {
    currentPattern = "IF_YOU_ARE";
    set.add(2);
    set.add(3);
  }

  return set;
}

function getRequiredWordPositionsE35(words) {
  currentPattern = "UNKNOWN";
  const set = new Set();

  const relIdx0 = words.findIndex((w) => ["who", "that", "which"].includes(cleanWord(w)));
  if (relIdx0 === -1) return set;

  const relPos = relIdx0 + 1; // 1-based
  const nextPos = relPos + 1;
  const next = cleanWord(words[relIdx0 + 1] || "");

  set.add(relPos);

  const beForms = new Set(["is", "are", "was", "were", "be", "been", "being"]);
  if (beForms.has(next)) {
    currentPattern = "REL_BE";
    set.add(nextPos);
    return set;
  }

  // no-be: who/that + verb -> delete both (verb becomes -ing in reduced answer)
  currentPattern = "REL_VERB";
  if (words[relIdx0 + 1]) set.add(nextPos);

  return set;
}

function buildStage1Hint(pattern) {
  if (pattern === "REL_BE") return "(who/that/which + be를 눌러 지우세요)";
  if (pattern === "REL_VERB") return "(who/that를 누르고, 바로 뒤 동사도 함께 눌러 지우세요 → 정답에서는 -ing)";
  return "(노란 부분을 눌러 줄여보세요)";
}

function tokenizeTextWithReq(text, requiredWordPositionsSet, startIdx) {
  const s = String(text || "");
  const parts = s.split(/(\s+)/);

  let idx = startIdx;
  let wordPos = 0;
  const tokens = [];

  for (const p of parts) {
    if (p === "") continue;
    const isSpace = /^\s+$/.test(p);

    if (isSpace) {
      tokens.push({ text: p, isSpace: true, isReq: false, idx: 0 });
    } else {
      idx += 1;
      wordPos += 1;
      const isReq = requiredWordPositionsSet.has(wordPos);
      tokens.push({ text: p, isSpace: false, isReq, idx });
    }
  }

  return { tokens, nextIdx: idx };
}

function buildSentenceHTML(tokens) {
  let out = "";
  for (const t of tokens) {
    if (t.isSpace) {
      out += escapeHtml(t.text);
      continue;
    }
    const cls = ["tok"];
    if (t.isReq) cls.push("req");
    const req = t.isReq ? "1" : "0";
    out += `<span class="${cls.join(" ")}" data-idx="${t.idx}" data-req="${req}">${escapeHtml(t.text)}</span>`;
  }
  if (!/\.[\s\S]*$/.test(out.trim())) out += ".";
  return out;
}

function isAllRequiredFaded() {
  for (const idx of requiredIdxSet) {
    if (!fadedIdxSet.has(String(idx))) return false;
  }
  return true;
}

function cleanWord(w) {
  return String(w || "")
    .trim()
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

function buildEngRoleWordsForE33(q) {
  const out = { A: new Set(), B: new Set(), LINK: new Set(), LINKBOX: new Set() };
  const parts =
    (Array.isArray(q?.configuredScrambleParts) && q.configuredScrambleParts.length)
      ? q.configuredScrambleParts
      : (Array.isArray(q?.configuredFinalParts) ? q.configuredFinalParts : []);
  if (!parts.length) return out;
  for (const part of parts) {
    const cls = mapFinalSegClassForE33(part?.seg || "");
    const role = cls === "uA" ? "A" : cls === "uB" ? "B" : cls === "uLink" ? "LINK" : cls === "who-gold" ? "LINKBOX" : "";
    if (!role) continue;
    const toks = tokenizeEnglish(String(part?.text || ""));
    toks.forEach((tok) => {
      const c = cleanWord(tok);
      if (c) out[role].add(c);
    });
  }
  return out;
}

function getEngWordRoleClassForE33(cleanedWord) {
  const w = String(cleanedWord || "").trim();
  if (!w) return "";
  if (engRoleWords?.LINKBOX?.has(w)) return "who-gold";
  if (engRoleWords?.LINK?.has(w)) return "uLink";
  if (engRoleWords?.A?.has(w)) return "uA";
  if (engRoleWords?.B?.has(w)) return "uB";
  return "";
}

// ---------- utils ----------
function cleanPipesText(s) {
  return String(s || "")
    .replace(/\|\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeEnglish(eng) {
  const s = stripTrailingPeriod(String(eng || "").trim());
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}

function tokenizeKorean(kor) {
  const s = cleanPipesText(kor);
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}

function normalizeEnglish(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.。!?]+$/g, "")
    .toLowerCase();
}

function normalizeKorean(s) {
  return cleanPipesText(String(s || ""))
    .replace(/[.。!?]+$/g, "")
    .trim();
}

function stripTrailingPeriod(s) {
  return String(s || "")
    .trim()
    .replace(/\.+\s*$/g, "")
    .trim();
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collapseUpAndRemove(el) {
  if (!el) return;
  el.style.overflow = "hidden";
  el.animate(
    [
      { maxHeight: `${el.scrollHeight || 200}px`, opacity: 1, transform: "translateY(0)" },
      { maxHeight: "0px", opacity: 0, transform: "translateY(-8px)" },
    ],
    { duration: 280, easing: "ease" }
  );
  setTimeout(() => el.remove(), 290);
}
