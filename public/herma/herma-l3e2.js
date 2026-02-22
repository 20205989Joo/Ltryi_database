// ver1.1_26.02.22
// herma-l3e3.js (L3-E3: 동명사로 압축해서 말하기)
// ------------------------------------------------------------
// ✅ UI/톤/구조: herma-l2e4 / herma-l3e2 흐름 유지
// ✅ 로직:
//   1) 문장 앞 that절(노란 하이라이트) 클릭 → 흐려짐
//   2) 전부 흐려지면, 그 자리(같은 줄)에 textarea 등장 → 동명사구 입력
//   3) 입력 정답이면 3단계 해석순서(단어뱅크) 오픈
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 3;
const TARGET_EXERCISE = 2;
const TARGET_EXERCISE_LABEL = "2";
const SOURCE_EXERCISE_ODD = 2;  // old 3-2
const SOURCE_EXERCISE_EVEN = 22; // old 3-3

let subcategory = "Grammar";
let level = "Basic";
let day = "110";
let quizTitle = "quiz_Grammar_Basic_110";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;

// stage state
let fadedReq = new Set();
let reqIdxSet = new Set();
let stage1Done = false;
let engOk = false;
let korOk = false;

// translation bank
let bankTokens = [];
let selectedTokens = [];
let engBank = [];
let engSelected = [];
let engSpawning = false;
let engGhostText = "";
let engHighlightWords = new Set();
let engRoleWords = { A: new Set(), B: new Set(), LINK: new Set(), LINKBOX: new Set() };

// per question caches
let qTokens = [];
let aTokens = [];
let commonSuffixLen = 0;
let reqTokenIdxs = [];
let predTokens = [];
let expectedChunkTokens = [];
let expectedChunkText = "";
const STAGE1_SIMPLE_INSTRUCTION_E33 = "\uac19\uc740 \uc758\ubbf8\uac00 \ub418\ub3c4\ub85d, \uc904\uc5ec\ubcf4\uc138\uc694!";

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
      background: var(--reqBg);
      border-radius: 8px;
      padding: 0 4px;
      box-shadow: inset 0 0 0 1px var(--reqBd);
      font-weight: 900;
    }
    .tok.locked{ cursor: default !important; }
    .tok.locked:hover{ transform: none !important; }
    .tok.faded{
      opacity: 0.22 !important;
      text-decoration: line-through !important;
      filter: blur(0.2px) !important;
    }
    .pred-tail{ font-weight: 900; }
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

    .bank-wrap{
      margin-top:10px;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.08);
      background: rgba(255,255,255,0.75);
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
    .pill-btn.hl{
      background: rgba(255, 208, 90, 0.45);
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      border-color: rgba(160, 110, 0, 0.22);
      font-weight: 900;
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

    .controls{ display:flex; gap:8px; margin-top:10px; }
    .mini-btn{
      flex:1;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      font-weight:900;
      cursor:pointer;
    }

    .ok{ font-weight:900; font-size:18px; color:#2e7d32; text-align:center; }
    .no{ font-weight:900; font-size:18px; color:#c62828; text-align:center; }

    .swap-in{ animation: swapIn .18s ease-out both; }
    @keyframes swapIn{ from{ transform: translateY(2px); opacity:0; } to{ transform: translateY(0); opacity:1; } }

    .fall-away{
      animation: fallAway .24s ease-in forwards;
      transform-origin: center top;
    }
    @keyframes fallAway{
      0%{ transform: translateY(0) scale(1); opacity:1; }
      100%{ transform: translateY(24px) scale(0.98); opacity:0; }
    }

    .shake{ animation: hermaShake 0.22s linear; }
    @keyframes hermaShake{ 0%{ transform: translateX(0); } 25%{ transform: translateX(-3px); } 50%{ transform: translateX(3px); } 75%{ transform: translateX(-2px); } 100%{ transform: translateX(0); } }

    .req-collapse-chip{
      position: fixed;
      z-index: 9998;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      background: rgba(255, 208, 90, 0.45);
      border-radius: 8px;
      padding: 0 4px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight: 900;
      color: #7e3106;
      pointer-events: none;
      transform-origin: center center;
    }
    .chunk-overlay{
      position: fixed;
      z-index: 9999;
      font-weight: 900;
      color: #7e3106;
      opacity: 0;
      pointer-events: none;
      letter-spacing: 0.02em;
      transform: translate(-50%, -50%) scale(0.98);
    }
    .chunk-overlay.show{
      animation: chunkFadeIn .44s ease-out forwards;
    }
    @keyframes chunkFadeIn{
      from{ opacity:0; transform: translate(-50%, -50%) scale(0.98); }
      to{ opacity:1; transform: translate(-50%, -50%) scale(1); }
    }
    .chunk-final{
      display:inline-block;
      font-weight:900;
      letter-spacing:0.02em;
      color:#7e3106;
      padding:0 2px;
      border-radius:4px;
      background: linear-gradient(180deg, rgba(255,255,255,0) 58%, rgba(255, 208, 90, 0.34) 58%);
      box-shadow: inset 0 0 0 1px rgba(160,110,0,0.12);
    }
    .source-word{
      display:inline-block;
      margin-right: 3px;
      transform-origin: center top;
    }
    .source-word.source-chunk{
      background: linear-gradient(180deg, rgba(255,255,255,0) 58%, rgba(255, 208, 90, 0.34) 58%);
      box-shadow: inset 0 0 0 1px rgba(160,110,0,0.12);
      border-radius: 4px;
      padding: 0 2px;
      font-weight: 900;
      color: #7e3106;
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
async function loadTSVRows(tsvPath) {
  const res = await fetch(tsvPath, { cache: "no-store" });
  if (!res.ok) throw new Error("TSV fetch failed: " + res.status + " " + res.statusText);
  const text = await res.text();
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split("\t").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const obj = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = (cols[c] ?? "").trim();
    rows.push(obj);
  }
  return rows;
}
async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();

  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!Array.isArray(aoa) || aoa.length === 0) return [];

  const headerRow = aoa[0].map((v) => String(v ?? "").trim());
  const hasHeader = headerRow.some((h) => {
    const n = normalizeHeader(h);
    return [
      "lesson",
      "exercise",
      "title",
      "question",
      "answer",
      "instruction",
      "qnumber",
      "단원",
      "문제",
      "정답",
      "지시문",
      "번호",
    ].includes(n);
  });

  const col = hasHeader ? buildExcelColMap(headerRow) : null;
  const startIdx = hasHeader ? 1 : 0;

  const out = [];
  for (let r = startIdx; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row || row.every((x) => String(x ?? "").trim() === "")) continue;

    const get = (key, fallbackIdx) => {
      const idx = col && col[key] != null ? col[key] : fallbackIdx;
      return String(row[idx] ?? "").trim();
    };

    out.push({
      Lesson: get("Lesson", 0),
      Exercise: get("Exercise", 1),
      Title: get("Title", 2),
      Question: get("Question", 3),
      QNumber: get("QNumber", 4),
      Answer: get("Answer", 5),
      Instruction: get("Instruction", 6),
    });
  }
  return out;
}

function normalizeHeader(h) {
  return String(h ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9가-힣]/g, "");
}

function buildExcelColMap(headerRow) {
  const norm = headerRow.map(normalizeHeader);
  const find = (candidates) => {
    for (let i = 0; i < norm.length; i++) {
      if (candidates.includes(norm[i])) return i;
    }
    return null;
  };

  return {
    Lesson: find(["lesson", "lessono", "단원", "레슨", "day", "unit", "챕터", "chapter"]) ?? 0,
    Exercise: find(["exercise", "ex", "exerciseno", "유형", "문항유형", "파트", "part"]) ?? 1,
    Title: find(["title", "subcategory", "topic", "설명", "유형명", "제목"]) ?? 2,
    Question: find(["question", "q", "english", "sentence", "원문", "문제", "지문"]) ?? 3,
    QNumber: find(["qnumber", "no", "number", "index", "문항", "번호", "순번", "id"]) ?? 4,
    Answer: find(["answer", "ans", "정답", "해설", "변환", "결과"]) ?? 5,
    Instruction: find(["instruction", "prompt", "task", "지시문", "설명문", "요구사항"]) ?? 6,
  };
}

// ---------- build questions ----------
function buildQuestionsFromRows() {
  const inLesson = rawRows.filter((r) => Number(r["Lesson"]) === TARGET_LESSON);
  const rowsOdd = inLesson
    .filter((r) => Number(r["Exercise"]) === SOURCE_EXERCISE_ODD)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));
  const rowsEven = inLesson
    .filter((r) => Number(r["Exercise"]) === SOURCE_EXERCISE_EVEN)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  const mapRowToQuestion = (r, fallbackNo) => {
    const srcNo = Number(r["QNumber"]) || fallbackNo;
    const sourceExercise = Number(r["Exercise"]) || 0;
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
    const transformMeta = parseTransformsMetaE32(transformsRaw);
    const configuredFinalParts = parseLaststageFinalSentenceForE32(laststageFinalRaw);
    const configuredKRTokens = parseLaststageKRTokensForE32(laststageKRTokensRaw);
    const configuredScrambleParts =
      parseScrambleColorPartsForE32(transformMeta.scrambleColorTokens || transformMeta.engColorTokens || "");

    const qParts = parseQuestionMarked(questionRaw);
    const aParts = parseAnswerMarked(answerRaw);

    if (!qParts.ok || !aParts.ok) {
      const question = stripTrailingPeriod(questionRaw.replace(/\*\*/g, "").trim());
      const qt = tokenizeEnglish(question);
      const at = tokenizeEnglish(stripTrailingPeriod(aParts.answerSentence || ""));
      const { suffixLen } = longestCommonSuffix(qt, at);
      const predT = qt.slice(qt.length - suffixLen);
      const expectedChunkT = at.slice(0, at.length - suffixLen);
      const fullEng = joinEnglishTokens(expectedChunkT.concat(predT));

      return {
        sourceExercise,
        sourceQNumber: srcNo,
        qNo: srcNo,
        qNumber: srcNo,
        title,
        instruction,
        question,
        koreanAnswer: cleanPipesText(aParts.koreanFull || ""),
        chunkKor: cleanPipesText(aParts.chunkKor || ""),
        chunkEng: joinEnglishTokens(expectedChunkT),
        expectedChunkTokens: expectedChunkT,
        expectedChunkText: joinEnglishTokens(expectedChunkT),
        qt,
        at,
        suffixLen,
        reqIdxSet: new Set([...Array(Math.max(0, qt.length - predT.length)).keys()].map(String)),
        predTokens: predT,
        engAnswer: fullEng,
        transformsRaw,
        transformMeta,
        laststageFinalSentence: laststageFinalRaw,
        laststageKRTokens: laststageKRTokensRaw,
        configuredFinalParts,
        configuredKRTokens,
        configuredScrambleParts,
      };
    }

    const at2 = tokenizeEnglish(stripTrailingPeriod(aParts.answerSentence || ""));
    const { suffixLen } = longestCommonSuffix(qParts.qTokens, at2);
    return {
      sourceExercise,
      sourceQNumber: srcNo,
      qNo: srcNo,
      qNumber: srcNo,
      title,
      instruction,
      question: qParts.question,
      qt: qParts.qTokens,
      at: at2,
      suffixLen,
      reqIdxSet: qParts.reqIdxSet,
      predTokens: qParts.predTokens,
      chunkEng: aParts.chunkEng,
      expectedChunkTokens: tokenizeEnglish(stripTrailingPeriod(aParts.chunkEng || "")),
      expectedChunkText: aParts.chunkEng || "",
      chunkKor: cleanPipesText(aParts.chunkKor),
      koreanAnswer: cleanPipesText(aParts.koreanFull),
      answerSentence: aParts.answerSentence,
      engAnswer: aParts.answerSentence,
      transformsRaw,
      transformMeta,
      laststageFinalSentence: laststageFinalRaw,
      laststageKRTokens: laststageKRTokensRaw,
      configuredFinalParts,
      configuredKRTokens,
      configuredScrambleParts,
    };
  };

  const merged = [];
  const maxLen = Math.max(rowsOdd.length, rowsEven.length);
  for (let i = 0; i < maxLen; i++) {
    if (rowsOdd[i]) merged.push(mapRowToQuestion(rowsOdd[i], merged.length + 1));
    if (rowsEven[i]) merged.push(mapRowToQuestion(rowsEven[i], merged.length + 1));
  }

  questions = merged.map((q, i) => ({
    ...q,
    qNumber: i + 1,
    qNo: i + 1,
  }));
}

function parseQuestionMarked(questionRaw) {
  const s = String(questionRaw || "").trim();
  const m = s.match(/\*\*([\s\S]+?)\*\*/);
  if (!m) {
    const plain = stripTrailingPeriod(s.replace(/\*\*/g, "").trim());
    return { ok: false, question: plain, qTokens: tokenizeEnglish(plain), reqIdxSet: new Set(), predTokens: [] };
  }

  const chunkText = String(m[1] || "").trim();
  const pre = s.slice(0, m.index);
  const post = s.slice(m.index + m[0].length);
  const predText = (pre + post).replace(/\*\*/g, "").trim();
  const plain = stripTrailingPeriod((pre + chunkText + post).replace(/\*\*/g, "").trim());

  const chunkTokens = tokenizeEnglish(chunkText);
  const predTokens = tokenizeEnglish(stripTrailingPeriod(predText));
  const qTokens = chunkTokens.concat(predTokens);
  const reqIdxSet = new Set(chunkTokens.map((_, i) => String(i)));

  return { ok: true, question: plain, chunkText, predText, qTokens, reqIdxSet, predTokens };
}

function deriveKorChunk(koreanFull) {
  return extractKoreanSubjectPhrase(cleanPipesText(koreanFull || ""));
}

function parseAnswerMarked(answerRaw) {
  const raw = String(answerRaw || "").trim();
  if (!raw) return { ok: false, answerSentence: "", chunkEng: "", chunkKor: "", koreanFull: "" };

  const braces = [];
  const cleaned = raw
    .replace(/\{([^}]+)\}/g, (_, inside) => {
      braces.push(String(inside).trim());
      return " ";
    })
    .replace(/\s{2,}/g, " ")
    .trim();

  let eng = "";
  let kor = "";
  if (cleaned.includes("||")) {
    const parts = cleaned.split("||");
    eng = (parts[0] || "").trim();
    kor = parts.slice(1).join("||").trim();
  } else {
    const legacy = splitEngKorLegacy(cleaned);
    eng = legacy.eng;
    kor = legacy.kor || "";
  }

  const answerSentence = stripTrailingPeriod(eng);
  const koreanFull = cleanPipesText(String(kor || "").trim());

  const chunkEng = (braces[0] || "").trim();
  let chunkKor = cleanPipesText((braces[1] || "").trim());
  if (!chunkKor && koreanFull) chunkKor = deriveKorChunk(koreanFull);

  return {
    ok: !!chunkEng,
    answerSentence,
    chunkEng,
    chunkKor,
    koreanFull,
  };
}

function splitEngKorLegacy(answerRaw) {
  const s = String(answerRaw || "").trim();
  const kIdx = s.search(/[가-힣]/);
  if (kIdx === -1) return { eng: s, kor: "" };
  return { eng: s.slice(0, kIdx).trim(), kor: s.slice(kIdx).trim() };
}

function parseTransformsMetaE32(raw) {
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
  if (meta.scramblecolor !== undefined) meta.scrambleColor = String(meta.scramblecolor || "").trim();
  if (meta.scramblecolortokens !== undefined) meta.scrambleColorTokens = String(meta.scramblecolortokens || "").trim();
  if (meta.engcolortokens !== undefined) meta.engColorTokens = String(meta.engcolortokens || "").trim();
  return meta;
}

function parseTaggedPartsE32(raw) {
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

function parseLaststageFinalSentenceForE32(raw) {
  return parseTaggedPartsE32(raw);
}

function parseScrambleColorPartsForE32(raw) {
  return parseTaggedPartsE32(raw);
}

function parseLaststageKRTokensForE32(raw) {
  return parseTaggedPartsE32(raw).map((x) => ({ text: x.text, seg: x.seg }));
}

function mapFinalSegClassForE32(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "uA";
  if (s === "b" || s === "c") return "uB";
  if (s === "link") return "uLink";
  if (s === "linkbox" || s === "hint") return "who-gold";
  return "";
}

function mapKRTokensSegToRoleForE32(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "A";
  if (s === "b" || s === "c") return "B";
  if (s === "link") return "LINK";
  if (s === "linkbox" || s === "hint") return "LINKBOX";
  return null;
}

function tokenRoleClassForE32(role) {
  if (role === "A") return "uA";
  if (role === "B") return "uB";
  if (role === "LINK") return "uLink";
  if (role === "LINKBOX") return "who-gold";
  return "";
}

function renderConfiguredFinalSentenceForE32(parts) {
  const chunks = (parts || [])
    .map((part) => {
      const text = String(part?.text || "").trim();
      if (!text) return "";
      const cls = mapFinalSegClassForE32(part.seg);
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

  const title = questions[0]?.title || "Herma L3-E2";
  const instruction =
    questions[0]?.instruction ||
    "강조된 that절을 소유격 + 동명사(또는 being+형용사)로 줄여 쓰고, 해석해보세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L3-E2</div>

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
  stage1Done = false;
  engOk = false;
  korOk = false;
  fadedReq = new Set();
  reqIdxSet = new Set();
  bankTokens = [];
  selectedTokens = [];
  engBank = [];
  engSelected = [];
  engSpawning = false;
  engGhostText = "";

  qTokens = (q.qt || []).slice();
  predTokens = (q.predTokens || []).slice();
  expectedChunkText = q.expectedChunkText || "";
  expectedChunkTokens = (q.expectedChunkTokens || tokenizeEnglish(expectedChunkText)).slice();
  commonSuffixLen = predTokens.length;

  reqTokenIdxs = [];
  if (q.reqIdxSet) {
    if (q.reqIdxSet instanceof Set) {
      q.reqIdxSet.forEach((v) => reqIdxSet.add(String(v)));
    } else if (Array.isArray(q.reqIdxSet)) {
      q.reqIdxSet.forEach((v) => reqIdxSet.add(String(v)));
    }
  }
  if (reqIdxSet.size === 0) {
    for (let i = 0; i < qTokens.length - commonSuffixLen; i++) {
      if (isPunct(qTokens[i])) continue;
      reqIdxSet.add(String(i));
    }
  }
  reqTokenIdxs = [...reqIdxSet].map((x) => Number(x)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  engRoleWords = buildEngRoleWordsForE32(q);

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
      <div id="instruction-text" style="font-weight:900; color:#7e3106; line-height:1.6;">${escapeHtml(STAGE1_SIMPLE_INSTRUCTION_E33)}</div>
      <div id="instruction-sub" style="margin-top:8px; font-size:12px; color:#555; line-height:1.5;"></div>
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
  if (sentenceLine) sentenceLine.innerHTML = buildStage1SentenceE33(qTokens, reqIdxSet, fadedReq);

  if (sentenceLine) {
    sentenceLine.addEventListener("click", (ev) => {
      if (stage1Done) return;
      const el = ev.target.closest("[data-tok-idx]");
      if (!el) return;

      const idx = el.getAttribute("data-tok-idx");
      const isReq = el.getAttribute("data-req") === "1";
      if (!idx) return;

      if (!isReq) {
        el.classList.add("nope");
        setTimeout(() => el.classList.remove("nope"), 120);
        return;
      }

      el.classList.toggle("faded");
      if (el.classList.contains("faded")) fadedReq.add(idx);
      else fadedReq.delete(idx);

      if (isAllReqFaded(reqIdxSet, fadedReq)) {
        stage1Done = true;
        completeStage1AndProceedE33(sentenceLine, q);
      }
    });
  }
}

async function completeStage1AndProceedE33(sentenceEl, q) {
  if (!sentenceEl) {
    toStage2E33(q);
    return;
  }

  sentenceEl.classList.add("shake");
  setTimeout(() => sentenceEl.classList.remove("shake"), 220);
  await animateReqToChunkE33(sentenceEl, q);

  toastOk("1단계 완료!");
  const sourceText = stripTrailingPeriod(String(sentenceEl.textContent || q.engAnswer || "").trim());
  setTimeout(() => toStage2E33(q, sourceText), 220);
}

async function toStage2E33(q, sourceSentenceText) {
  const stage1 = document.getElementById("sentence-line");
  const stage2 = document.getElementById("stage2");
  const instBox = document.getElementById("instruction-box");
  const shell = document.getElementById("main-shell");

  if (stage1) stage1.classList.add("fall-away");
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

  const stageLine = document.getElementById("sentence-line");
  if (stageLine) stageLine.classList.add("hidden");
  if (instBox) instBox.remove();
  if (shell) shell.classList.add("flat-shell");
  if (stage2) {
    stage2.classList.remove("hidden");
    stage2.classList.add("swap-in");
  }

  initEngScrambleE33(q.engAnswer, { spawnFrom: sourceSentenceText || stripTrailingPeriod(q.engAnswer || "") });
}

async function toStage3E33(q) {
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
      plain.innerHTML = `<div>${renderConfiguredFinalSentenceForE32(q.configuredFinalParts)}</div>`;
    } else if (engSelected && engSelected.length) {
      plain.innerHTML = `<div>${renderEngTokensHTMLE33(engSelected)}.</div>`;
    } else {
      const tmp = tokenizeEnglishForScramble(q.engAnswer || "").map((t) => ({ text: t }));
      plain.innerHTML = `<div>${renderEngTokensHTMLE33(tmp)}.</div>`;
    }
  }

  initKorOrderE33(q);
  const actionRow = document.getElementById("stage-action-row");
  if (actionRow) actionRow.style.display = "flex";
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = false;
}

function buildStage1SentenceE33(tokens, reqSet, fadedSet) {
  let out = "";
  tokens.forEach((t, i) => {
    const isReq = reqSet.has(String(i));
    const cls = ["tok"];
    if (isReq) cls.push("req");
    if (fadedSet.has(String(i))) cls.push("faded");
    const ds = isReq ? "1" : "0";
    const leadSpace = i > 0 && !isPunct(t) ? " " : "";
    out += `${leadSpace}<span class="${cls.join(" ")}" data-tok-idx="${i}" data-req="${ds}">${escapeHtml(t)}</span>`;
  });
  return out.trim();
}

function renderReducedSentenceE33(chunkText, predToks) {
  const chunk = String(chunkText || "").trim();
  const tail = joinEnglishTokens(predToks || []);
  if (chunk && tail) return `<span class="chunk-final">${escapeHtml(chunk)}</span> ${escapeHtml(tail)}.`;
  if (chunk) return `<span class="chunk-final">${escapeHtml(chunk)}</span>.`;
  return `${escapeHtml(tail)}.`;
}

async function animateReqToChunkE33(sentenceEl, q) {
  const reqEls = Array.from(sentenceEl.querySelectorAll('[data-req="1"]'));
  const chunkText = String((q && q.expectedChunkText) || "").trim();
  if (!reqEls.length || !chunkText) {
    sentenceEl.innerHTML = renderReducedSentenceE33(chunkText, predTokens);
    return;
  }

  const rect = getElementsRectE33(reqEls);
  if (!rect) {
    sentenceEl.innerHTML = renderReducedSentenceE33(chunkText, predTokens);
    return;
  }

  const reqText = reqEls.map((el) => String(el.textContent || "").trim()).filter(Boolean).join(" ");
  reqEls.forEach((el) => { el.style.visibility = "hidden"; });

  const chip = document.createElement("span");
  chip.className = "req-collapse-chip";
  chip.textContent = reqText;
  chip.style.left = `${Math.round(rect.left)}px`;
  chip.style.top = `${Math.round(rect.top)}px`;
  chip.style.width = `${Math.max(1, Math.round(rect.width))}px`;
  chip.style.height = `${Math.max(1, Math.round(rect.height))}px`;
  chip.style.fontSize = window.getComputedStyle(reqEls[0]).fontSize;
  document.body.appendChild(chip);

  const overlay = document.createElement("span");
  overlay.className = "chunk-overlay";
  overlay.textContent = chunkText;
  overlay.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
  overlay.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
  overlay.style.fontSize = window.getComputedStyle(reqEls[0]).fontSize;
  document.body.appendChild(overlay);

  chip.animate(
    [
      { transform: "scaleX(1)", opacity: 1, filter: "blur(0px)" },
      { transform: "scaleX(0)", opacity: 0, filter: "blur(0.6px)" },
    ],
    { duration: 300, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
  );
  overlay.classList.add("show");

  await wait(420);
  chip.remove();
  overlay.remove();
  sentenceEl.innerHTML = renderReducedSentenceE33(chunkText, predTokens);
}

function getElementsRectE33(els) {
  if (!els || !els.length) return null;
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
  }
  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  return new DOMRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
}

function initEngScrambleE33(engAnswer, options = {}) {
  const chunkSet = new Set((expectedChunkTokens || []).map((t) => cleanWordE33(t)).filter(Boolean));
  engHighlightWords = chunkSet;

  const tokens = tokenizeEnglishForScramble(engAnswer);
  const shuffled = shuffleArray(tokens.map((t, i) => ({ id: `e${i}_${t}`, text: t })));
  engSelected = [];
  engBank = [];
  engSpawning = true;
  engGhostText = stripTrailingPeriod(String(engAnswer || "").trim());
  renderEngE33();

  const spawnFrom = stripTrailingPeriod(String(options.spawnFrom || engAnswer || "").trim());
  animateEngTokenSpawnE33(spawnFrom, shuffled);
}

function renderEngTokensHTMLE33(arr) {
  const a = Array.isArray(arr) ? arr : [];
  return a
    .map((x) => {
      const t = String(x?.text ?? "");
      const c = cleanWordE33(t);
      const roleCls = getEngWordRoleClassE32(c);
      if (roleCls) return `<span class="${roleCls}">${escapeHtml(t)}</span>`;
      if (engHighlightWords && engHighlightWords.has(c)) return `<span class="chunk-final">${escapeHtml(t)}</span>`;
      return escapeHtml(t);
    })
    .join(" ");
}

function renderEngE33() {
  const bankArea = document.getElementById("eng-bank-area");
  const plainLine = document.getElementById("eng-plain-line");
  const remainInfo = document.getElementById("eng-remain-info");
  if (!bankArea || !plainLine || !remainInfo) return;

  if (!engSpawning) {
    const base = stripTrailingPeriod(String(engGhostText || questions[currentIndex]?.engAnswer || "").trim());
    const live = renderEngTokensHTMLE33(engSelected);
    plainLine.innerHTML = `
      <span class="eng-ghost-text">${escapeHtml(base ? `${base}.` : ".")}</span>
      <span class="eng-live-text">${live}</span>
    `;
    plainLine.style.cursor = (!engOk && engSelected.length) ? "pointer" : "default";
    plainLine.onclick = () => {
      if (engOk || engSpawning || !engSelected.length) return;
      const last = engSelected.pop();
      if (last) engBank.push(last);
      renderEngE33();
    };
  }

  remainInfo.textContent = `남은 조각: ${engBank.length}개`;
  bankArea.innerHTML = "";
  engBank.forEach((tok) => {
    const btn = document.createElement("button");
    const roleCls = getEngWordRoleClassE32(cleanWordE33(tok.text));
    btn.className = `pill-btn ${roleCls}`.trim();
    btn.type = "button";
    btn.textContent = tok.text;
    if (!roleCls && engHighlightWords && engHighlightWords.has(cleanWordE33(tok.text))) btn.classList.add("hl");
    btn.disabled = engOk || engSpawning;
    btn.onclick = () => {
      if (engOk || engSpawning) return;
      const idx = engBank.findIndex((x) => x.id === tok.id);
      if (idx >= 0) {
        const [moved] = engBank.splice(idx, 1);
        engSelected.push(moved);
        renderEngE33();
        checkEngCompleteE33();
      }
    };
    bankArea.appendChild(btn);
  });
}

async function animateEngTokenSpawnE33(sourceSentence, shuffledTokens) {
  const plain = document.getElementById("eng-plain-line");
  const words = tokenizeEnglishForScramble(sourceSentence);
  engGhostText = stripTrailingPeriod(String(sourceSentence || "").trim());

  if (plain) {
    const base = stripTrailingPeriod(String(engGhostText || "").trim());
    const src = words
      .map((w) => {
        const cw = cleanWordE33(w);
        const roleCls = getEngWordRoleClassE32(cw);
        const cls = roleCls
          ? `source-word ${roleCls}`
          : ((engHighlightWords && engHighlightWords.has(cw)) ? "source-word source-chunk" : "source-word");
        return `<span class="${cls}">${escapeHtml(w)}</span>`;
      })
      .join(" ");
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
    renderEngE33();
    await wait(70);
  }

  await wait(160);
  engSpawning = false;
  renderEngE33();
}

function checkEngCompleteE33() {
  const q = questions[currentIndex];
  const userEng = joinEnglishTokens(engSelected.map((x) => x.text));
  if (normalizeEng(userEng) === normalizeEng(q.engAnswer)) {
    engOk = true;
    lockEngScrambleE33();
    toastOk("2단계 완료!");
    setTimeout(() => toStage3E33(q), 180);
  }
}

function lockEngScrambleE33() {
  const bankArea = document.getElementById("eng-bank-area");
  if (bankArea) Array.from(bankArea.querySelectorAll("button")).forEach((b) => (b.disabled = true));
}

function initKorOrderE33(q) {
  const configured = Array.isArray(q?.configuredKRTokens) ? q.configuredKRTokens : [];
  if (configured.length) {
    bankTokens = shuffleArray(
      configured.map((t, i) => ({
        id: `k${i}_${t.text}`,
        text: t.text,
        role: mapKRTokensSegToRoleForE32(t.seg),
      }))
    );
  } else {
    const tokens = tokenizeKorean(cleanPipesText(q?.koreanAnswer || ""));
    bankTokens = shuffleArray(tokens.map((t, i) => ({ id: `k${i}_${t}`, text: t, role: null })));
  }
  selectedTokens = [];
  renderKorE33();
}

function renderKorE33() {
  const bankArea = document.getElementById("bank-area");
  const answerLine = document.getElementById("answer-line");
  const remainInfo = document.getElementById("remain-info");
  if (!bankArea || !answerLine || !remainInfo) return;

  if (window.HermaFinalStage?.renderKoreanScramble) {
    window.HermaFinalStage.renderKoreanScramble({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo,
      selectedTokens,
      bankTokens,
      isKoLocked: isAnswered,
      onSelectToken: (tok) => {
        if (isAnswered) return;
        const idx = bankTokens.findIndex((x) => x.id === tok.id);
        if (idx >= 0) {
          const [moved] = bankTokens.splice(idx, 1);
          selectedTokens.push(moved);
        }
      },
      onUnselectLast: () => {
        if (isAnswered) return;
        const last = selectedTokens.pop();
        if (last) bankTokens.push(last);
      },
      decorateToken: (el, tok) => {
        if (!el || !tok) return;
        const cls = tokenRoleClassForE32(tok.role);
        if (cls) el.classList.add(cls);
      },
      rerender: () => renderKorE33(),
    });
    return;
  }

  remainInfo.textContent = `남은 조각: ${bankTokens.length}개`;
  answerLine.textContent = selectedTokens.map((x) => x.text).join(" ");
  bankArea.innerHTML = "";
  bankTokens.forEach((tok) => {
    const btn = document.createElement("button");
    const roleClass = tokenRoleClassForE32(tok.role);
    btn.className = `pill-btn ${roleClass}`;
    btn.type = "button";
    btn.textContent = tok.text;
    btn.disabled = isAnswered;
    btn.onclick = () => {
      if (isAnswered) return;
      const idx = bankTokens.findIndex((x) => x.id === tok.id);
      if (idx >= 0) {
        const [moved] = bankTokens.splice(idx, 1);
        selectedTokens.push(moved);
        renderKorE33();
      }
    };
    bankArea.appendChild(btn);
  });
}

function submitAnswer() {
  if (!engOk) {
    toastNo("오답…");
    return;
  }
  if (isAnswered) return;

  const q = questions[currentIndex];
  const userEng = engSelected.length ? joinEnglishTokens(engSelected.map((x) => x.text)) : "";
  const userKor = selectedTokens.length ? selectedTokens.map((x) => x.text).join(" ") : "";

  const engCorrect = normalizeEng(userEng) === normalizeEng(q.engAnswer);
  const korCorrect = normalizeKorean(userKor) === normalizeKorean(q.koreanAnswer);
  korOk = korCorrect;
  const correct = !!(stage1Done && engCorrect && korCorrect);

  if (!correct) {
    toastNo("오답…");
    return;
  }

  isAnswered = true;
  results.push({
    no: currentIndex + 1,
    word: `Herma L3-E2 / Q${q.qNumber}`,
    selected: `${userEng || "무응답"} || kor:${userKor || "무응답"} || reduced:${stage1Done ? 1 : 0}`,
    correct,
    question: q.question,
    engAnswer: q.engAnswer,
    koreanAnswer: q.koreanAnswer,
  });

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  const engBankArea = document.getElementById("eng-bank-area");
  if (engBankArea) Array.from(engBankArea.querySelectorAll("button")).forEach((b) => (b.disabled = true));
  const korBankArea = document.getElementById("bank-area");
  if (korBankArea) Array.from(korBankArea.querySelectorAll("button")).forEach((b) => (b.disabled = true));
  renderKorE33();
  toastOk("정답!");
}

function goNext() {
  if (!isAnswered) {
    const q = questions[currentIndex];
    const userEng = engSelected.length ? joinEnglishTokens(engSelected.map((x) => x.text)) : "";
    const userKor = selectedTokens.length ? selectedTokens.map((x) => x.text).join(" ") : "";
    results.push({
      no: currentIndex + 1,
      word: `Herma L3-E2 / Q${q.qNumber}`,
      selected: `${userEng || "무응답"} || kor:${userKor || "무응답"} || reduced:${stage1Done ? 1 : 0}`,
      correct: false,
      question: q.question,
      engAnswer: q.engAnswer,
      koreanAnswer: q.koreanAnswer,
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
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 답</th>
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

// ---------- utils ----------
function cleanPipesText(s) {
  return String(s || "")
    .replace(/\|\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeKorean(kor) {
  const s = cleanPipesText(kor);
  if (!s) return [];
  return s.split(/\s+/).filter(Boolean);
}

function normalizeKorean(s) {
  return cleanPipesText(String(s || ""))
    .replace(/[.。!?]+$/g, "")
    .trim();
}

function extractKoreanSubjectPhrase(korSentence) {
  const s = normalizeKorean(korSentence);
  if (!s) return "";
  const m = s.match(/(은|는|이|가)\s/);
  if (!m) return s;
  const idx = m.index ?? -1;
  if (idx <= 0) return s;
  return s.slice(0, idx).trim();
}

function stripTrailingPeriod(s) {
  return String(s || "").trim().replace(/\.[\s]*$/g, "").trim();
}

function normalizeEng(s) {
  return joinEnglishTokens(tokenizeEnglish(String(s || "")))
    .replace(/[.。!?]+$/g, "")
    .replace(/\s+/g, " ")
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

function buildEngRoleWordsForE32(q) {
  const out = { A: new Set(), B: new Set(), LINK: new Set(), LINKBOX: new Set() };
  const parts =
    (Array.isArray(q?.configuredScrambleParts) && q.configuredScrambleParts.length)
      ? q.configuredScrambleParts
      : (Array.isArray(q?.configuredFinalParts) ? q.configuredFinalParts : []);
  if (!parts.length) return out;
  for (const part of parts) {
    const cls = mapFinalSegClassForE32(part?.seg || "");
    const role = cls === "uA" ? "A" : cls === "uB" ? "B" : cls === "uLink" ? "LINK" : cls === "who-gold" ? "LINKBOX" : "";
    if (!role) continue;
    const toks = tokenizeEnglishForScramble(String(part?.text || ""));
    toks.forEach((tok) => {
      const c = cleanWordE33(tok);
      if (c) out[role].add(c);
    });
  }
  return out;
}

function getEngWordRoleClassE32(cleanWord) {
  const w = String(cleanWord || "").trim();
  if (!w) return "";
  if (engRoleWords?.LINKBOX?.has(w)) return "who-gold";
  if (engRoleWords?.LINK?.has(w)) return "uLink";
  if (engRoleWords?.A?.has(w)) return "uA";
  if (engRoleWords?.B?.has(w)) return "uB";
  return "";
}

function cleanWordE33(w) {
  return String(w || "")
    .trim()
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shake(el) {
  if (!el) return;
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
  setTimeout(() => el.classList.remove("shake"), 240);
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

function isAllReqFaded(reqSet, fadedSet) {
  for (const idx of reqSet) {
    if (!fadedSet.has(String(idx))) return false;
  }
  return true;
}

// ---------- english token helpers ----------
function tokenizeEnglish(s) {
  const str = String(s || "").trim();
  if (!str) return [];
  return str.match(/[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[^\s]/g) || [];
}

function tokenizeEnglishForScramble(s) {
  const raw = tokenizeEnglish(s);
  const out = [];
  for (const tok of raw) {
    if (isPunct(tok) && out.length) {
      out[out.length - 1] = `${out[out.length - 1]}${tok}`;
      continue;
    }
    out.push(tok);
  }
  return out;
}

function isPunct(tok) {
  return /^[.,!?;:)]$/.test(String(tok || "")) || tok === "\"" || tok === "”" || tok === "“";
}

function normTok(tok) {
  return String(tok || "")
    .toLowerCase()
    .replace(/^[\"“”]+|[\"“”]+$/g, "")
    .replace(/[.。!?]+$/g, "");
}

function longestCommonSuffix(qt, at) {
  let i = qt.length - 1;
  let j = at.length - 1;
  let len = 0;
  while (i >= 0 && j >= 0) {
    const qn = normTok(qt[i]);
    const an = normTok(at[j]);
    if (!qn || !an) break;
    if (qn !== an) break;
    len++;
    i--; j--;
  }
  return { suffixLen: len };
}

function joinEnglishTokens(tokens) {
  const arr = (tokens || []).slice();
  let out = "";
  for (let i = 0; i < arr.length; i++) {
    const t = String(arr[i] ?? "");
    if (!t) continue;
    const needSpace = i > 0 && !isPunct(t) && out && !out.endsWith("(") && !out.endsWith("\"") && !out.endsWith("“");
    out += (needSpace ? " " : "") + t;
  }
  return out.trim();
}
