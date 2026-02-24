// ver1.1_26.02.22
// herma-l3e6.js (L3-E6: 후치수식 → 앞수식으로 압축하기)
// ------------------------------------------------------------
// ✅ 흐름(한 박스 안에서 단계 교체):
//   1) 약분하기: 후치수식(관계절/전치사절 등)을 눌러 줄긋기(페이드)
//   2) Scramble: 섞인 영단어를 순서대로 눌러 정답 문장 완성
//   3) 해석 순서: 섞인 한국어 조각을 순서대로 눌러 해석 완성
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 3;
const TARGET_EXERCISE = 4;
const TARGET_EXERCISE_LABEL = "4";

let subcategory = "Grammar";
let level = "Basic";
let day = "112";
let quizTitle = "quiz_Grammar_Basic_112";
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
let dragDone = false;
let dragPayload = null;
let stage1Phase = "reduce";
let stage1Plan = null;
let shortenDone = false;
let engGhostText = "";
let engSpawning = false;
let engGlowWords = new Set();
let selectedHeadWord = "";
let engRoleWords = { MOD: new Set(), HEAD: new Set(), A: new Set(), B: new Set(), LINK: new Set(), LINKBOX: new Set() };

// ---------- boot ----------
window.addEventListener("DOMContentLoaded", async () => {  var __r2_guard = (new URLSearchParams(window.location.search || "")).get("round2") === "1";
  if (__r2_guard) return;
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
    .tok.req{
      background: var(--reqBg);
      border-radius: 8px;
      padding: 0 4px;
      box-shadow: inset 0 0 0 1px var(--reqBd);
      font-weight: 900;
    }
    .tok.modifier-live{
      background: rgba(70, 140, 255, 0.18);
      border-radius: 8px;
      padding: 0 4px;
      box-shadow: inset 0 0 0 1px rgba(70, 140, 255, 0.35);
      font-weight: 900;
    }
    .tok.modifier-underline{
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
      text-decoration-color: #2f6bff;
      font-weight: 900;
    }
    .tok.head-target{
      background: rgba(255, 208, 90, 0.45);
      border-radius: 8px;
      padding: 0 4px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.26);
      font-weight: 900;
    }
    .tok.head-picked{
      background: rgba(76, 175, 80, 0.24);
      border-radius: 8px;
      padding: 0 4px;
      box-shadow: inset 0 0 0 1px rgba(46, 125, 50, 0.34);
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

    .hint-pill{
      display:inline-block;
      font-size:12px;
      background:#ffffff;
      border:1px solid rgba(0,0,0,0.12);
      color: var(--inkBrown);
      padding:6px 10px;
      border-radius:999px;
      font-weight:900;
      margin-top:10px;
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
    .pill-btn.eng-mod{
      color:#7e3106;
      font-weight:900;
      background: linear-gradient(180deg, rgba(255,255,255,0) 58%, rgba(255, 208, 90, 0.34) 58%), #fff;
      box-shadow: inset 0 0 0 1px rgba(160,110,0,0.12);
      border-color: rgba(160,110,0,0.18);
    }
    .pill-btn.eng-head{
      color: #2e7d32;
      font-weight: 900;
      background: rgba(76, 175, 80, 0.20);
      box-shadow: inset 0 0 0 1px rgba(46,125,50,0.28);
      border-color: rgba(46,125,50,0.16);
    }
    .pill-btn:disabled{ opacity:0.35; cursor:not-allowed; }

    .controls{ display:flex; gap:8px; margin-top:10px; }
    #stage2 .controls,
    .hidden .controls{ display:none !important; }
    .mini-btn{
      flex:1;
      padding:10px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      font-weight:900;
      cursor:pointer;
    }
    .mini-btn:disabled{ opacity:.45; cursor:not-allowed; }

    .drag-line{
      position: relative;
      line-height: 1.7;
      word-break: keep-all;
    }
    .drag-slot{
      display:inline-block;
      min-width: 82px;
      height: 24px;
      border-radius: 999px;
      border: 1.5px dashed rgba(70,140,255,0.55);
      background: rgba(70,140,255,0.10);
      vertical-align: -2px;
      margin: 0 4px;
      padding: 0 8px;
      text-align: center;
      font-weight: 900;
      color: #1f4fb8;
      transition: box-shadow .15s ease, background .15s ease;
    }
    .drag-slot.over{
      box-shadow: 0 0 0 2px rgba(70,140,255,0.12);
      background: rgba(70,140,255,0.16);
    }
    .drag-slot.filled{
      border-style: solid;
      background: rgba(70,140,255,0.18);
    }
    .drag-slot.filled.shrink-ready{
      min-width: 0;
      height: auto;
      border: none;
      background: transparent;
      padding: 0;
      margin: 0 4px;
      text-align: left;
      color: inherit;
      box-shadow: none;
      vertical-align: baseline;
    }
    .drag-slot.shorten-glow{
      border-style: solid;
      border-color: rgba(160,110,0,0.36);
      background: rgba(255, 208, 90, 0.30);
      box-shadow: 0 0 0 1px rgba(160,110,0,0.14) inset, 0 0 16px rgba(255,208,90,0.28);
      color: #7e3106;
    }
    .hint-pill.drag-bank{
      display:flex;
      align-items:center;
      justify-content:center;
      gap: 8px;
      width: 100%;
      box-sizing:border-box;
    }
    .drag-chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height: 26px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(70,140,255,0.45);
      background: rgba(70,140,255,0.12);
      color:#1f4fb8;
      font-weight:900;
      cursor: grab;
      user-select:none;
    }
    .drag-chip.inline{
      min-height: auto;
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      line-height: inherit;
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
      text-decoration-color: #2f6bff;
    }
    .drag-chip.dragging{
      opacity: 0.45;
      cursor: grabbing;
    }
    .drag-tip{
      position: absolute;
      left: 0;
      top: 0;
      z-index: 20;
      pointer-events: none;
      font-size: 11px;
      font-weight: 900;
      color: #1f4fb8;
      background: rgba(70, 140, 255, 0.16);
      border: 1px solid rgba(70, 140, 255, 0.42);
      border-radius: 999px;
      padding: 2px 6px;
      transform: translate(-9999px, -9999px);
      white-space: nowrap;
    }
    .shorten-target{
      display:inline-block;
      cursor: pointer;
      padding:0 8px;
      border-radius:999px;
      letter-spacing:0.02em;
      line-height: inherit;
      color:#1f4fb8;
      font-weight: 900;
      background: rgba(70,140,255,0.12);
      box-shadow: inset 0 0 0 1px rgba(70,140,255,0.45);
      text-decoration: none !important;
      transform-origin: center center;
      transition: background .18s ease, box-shadow .18s ease, color .18s ease, padding .18s ease, border-radius .18s ease;
    }
    .shorten-target.done{
      cursor: default;
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
    .eng-ghost-text{
      visibility: hidden;
      display: block;
      white-space: pre-wrap;
      user-select: none;
    }
    .eng-live-text{
      display: block;
      white-space: pre-wrap;
    }

    .source-word{
      display:inline-block;
      margin-right: 3px;
      transform-origin: center top;
    }
    .source-word.source-short,
    .source-word.source-chunk{
      border-radius: 4px;
      padding: 0 2px;
      color:#7e3106;
      font-weight: 900;
      background: linear-gradient(180deg, rgba(255,255,255,0) 58%, rgba(255, 208, 90, 0.34) 58%);
      box-shadow: inset 0 0 0 1px rgba(160,110,0,0.12);
    }
    .source-word.source-head{
      border-radius: 8px;
      padding: 0 3px;
      background: rgba(76, 175, 80, 0.24);
      box-shadow: inset 0 0 0 1px rgba(46,125,50,0.34);
      color: #2e7d32;
      font-weight: 900;
    }
    .source-word.drop{
      animation: sourceDrop .28s ease-in forwards;
    }
    @keyframes sourceDrop{
      0%{ transform: translateY(0px) rotate(0deg); opacity:1; }
      100%{ transform: translateY(28px) rotate(4deg); opacity:0; }
    }

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

    .tap-tip{
      position: fixed;
      z-index: 30;
      pointer-events: none;
      font-size: 11px;
      font-weight: 900;
      color: #7e3106;
      background: rgba(255, 208, 90, 0.95);
      border: 1px solid rgba(160, 110, 0, 0.28);
      border-radius: 999px;
      padding: 2px 7px;
      left: 0;
      top: 0;
      transform: translate(-9999px, -9999px);
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(126,49,6,0.14);
    }

    .chunk-final,
    .to-final{
      display:inline-block;
      font-weight:900;
      line-height: inherit;
      font-size: inherit;
      vertical-align: baseline;
      letter-spacing:0.02em;
      color:#7e3106;
      padding:0 2px;
      border-radius:4px;
      background: linear-gradient(180deg, rgba(255,255,255,0) 58%, rgba(255, 208, 90, 0.34) 58%);
      box-shadow: inset 0 0 0 1px rgba(160,110,0,0.12);
      text-decoration: none !important;
    }
    .chunk-final.to-sheen,
    .to-final.to-sheen{
      animation: toSheen .6s ease-out both;
    }
    @keyframes toSheen{
      0%{ box-shadow: inset 0 0 0 1px rgba(160,110,0,0.10), 0 0 0 rgba(255,208,90,0); filter: brightness(1); }
      55%{ box-shadow: inset 0 0 0 1px rgba(160,110,0,0.16), 0 10px 26px rgba(255,208,90,0.16); filter: brightness(1.035); }
      100%{ box-shadow: inset 0 0 0 1px rgba(160,110,0,0.12), 0 0 0 rgba(255,208,90,0); filter: brightness(1); }
    }
    .head-token-final{
      display:inline-block;
      border-radius: 8px;
      padding: 0 4px;
      background: rgba(76, 175, 80, 0.24);
      box-shadow: inset 0 0 0 1px rgba(46,125,50,0.34);
      color: #2e7d32;
      font-weight: 900;
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
  const filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  questions = filtered.map((r, idx) => {
    const qNumber = Number(r["QNumber"]) || idx + 1;
    const title = String(r["Title"] ?? "").trim();
    const instruction = String(r["Instruction"] ?? "").trim();
    const question = sanitizeQuestion(String(r["Question"] ?? "").trim());
    const answerRaw = String(r["Answer"] ?? "").trim();
    const transformsRaw =
      String(r["Transforms"] ?? r["Transform"] ?? r["TransformMap"] ?? "").trim();
    const laststageFinalRaw =
      String(r["Laststage-FinalSentence"] ?? r["LaststageFinalSentence"] ?? "").trim();
    const laststageKRTokensRaw =
      String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();
    const transformMeta = parseTransformsMetaE34(transformsRaw);
    const configuredFinalParts = parseLaststageFinalSentenceForE34(laststageFinalRaw);
    const configuredKRTokens = parseLaststageKRTokensForE34(laststageKRTokensRaw);
    const configuredScrambleParts =
      parseScrambleColorPartsForE34(transformMeta.scrambleColorTokens || transformMeta.engColorTokens || "");

    const { engAnswer, korAnswer } = parseAnswerSmart(answerRaw);

    return {
      qNumber,
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

function parseTransformsMetaE34(raw) {
  const meta = {};
  const s = String(raw || "").trim();
  if (!s) return meta;
  const parts = (
    s.includes(";")
      ? s.split(";")
      : s.split("|")
  ).map((x) => x.trim()).filter(Boolean);
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

function parseTaggedPartsE34(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];
  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];

  let tagged = false;
  const out = [];
  for (const part of parts) {
    const m = part.match(/^(plain|mod|head|a|b|c|ab|pair|link|linkbox|hint)\s*::\s*(.+)$/i);
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

function parseLaststageFinalSentenceForE34(raw) {
  return parseTaggedPartsE34(raw);
}

function parseScrambleColorPartsForE34(raw) {
  return parseTaggedPartsE34(raw);
}

function parseLaststageKRTokensForE34(raw) {
  return parseTaggedPartsE34(raw).map((x) => ({ text: x.text, seg: x.seg }));
}

function mapFinalSegClassForE34(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "mod" || s === "a" || s === "ab" || s === "pair") return "to-final";
  if (s === "head" || s === "b" || s === "c") return "head-token-final";
  if (s === "link") return "to-final";
  if (s === "linkbox" || s === "hint") return "head-token-final";
  return "";
}

function mapKRTokensSegToRoleForE34(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "mod" || s === "a" || s === "ab" || s === "pair") return "MOD";
  if (s === "head" || s === "b" || s === "c") return "HEAD";
  if (s === "link") return "LINK";
  if (s === "linkbox" || s === "hint") return "LINKBOX";
  return null;
}

function tokenRoleClassForE34(role) {
  if (role === "MOD") return "to-final";
  if (role === "HEAD") return "head-token-final";
  if (role === "LINK") return "to-final";
  if (role === "LINKBOX") return "head-token-final";
  return "";
}

function renderConfiguredFinalSentenceForE34(parts) {
  const chunks = (parts || [])
    .map((part) => {
      const text = String(part?.text || "").trim();
      if (!text) return "";
      const cls = mapFinalSegClassForE34(part.seg);
      if (!cls) return escapeHtml(text);
      return `<span class="${cls}">${escapeHtml(text)}</span>`;
    })
    .filter(Boolean);
  if (!chunks.length) return "";
  const joined = chunks.join(" ").trim();
  if (/[.!?]$/.test(joined)) return joined;
  return `${joined}.`;
}

function buildEngRoleWordsForE34(q) {
  const out = { MOD: new Set(), HEAD: new Set(), A: new Set(), B: new Set(), LINK: new Set(), LINKBOX: new Set() };
  const parts =
    (Array.isArray(q?.configuredScrambleParts) && q.configuredScrambleParts.length)
      ? q.configuredScrambleParts
      : (Array.isArray(q?.configuredFinalParts) ? q.configuredFinalParts : []);
  if (!parts.length) return out;

  for (const part of parts) {
    const cls = mapFinalSegClassForE34(part?.seg || "");
    const role = cls === "head-token-final" ? "HEAD" : cls === "to-final" ? "MOD" : "";
    if (!role) continue;
    const toks = tokenizeEnglish(String(part?.text || ""));
    toks.forEach((tok) => {
      const c = cleanWord(tok);
      if (c) out[role].add(c);
    });
  }
  return out;
}

function getEngWordRoleClassForE34(cleanedWord) {
  const w = String(cleanedWord || "").trim();
  if (!w) return "";
  if (engRoleWords?.HEAD?.has(w)) return "head-token-final";
  if (engRoleWords?.MOD?.has(w)) return "to-final";
  return "";
}

function sanitizeQuestion(s) {
  // 혹시 엑셀에 **강조** 같은 표식이 들어있으면 제거
  return String(s || "").replace(/\*\*/g, "").trim();
}

// ✅ Answer 파싱: (1) "||" 메타가 있으면 제거하고, (2) 영/한 분리
function parseAnswerSmart(answerRaw) {
  const s0 = String(answerRaw || "").trim();
  if (!s0) return { engAnswer: "", korAnswer: "" };

  // 케이스 A) "a||meta||kor" 같은 형식
  if (s0.includes("||")) {
    const parts = s0
      .split("||")
      .map((x) => String(x || "").trim())
      .filter((x) => x !== "");

    const first = parts[0] || "";
    // 마지막 Hangul 포함 파트 = 해석
    const lastHangul = [...parts].reverse().find((p) => /[가-힣]/.test(p)) || "";
    const eng = first.replace(/[가-힣].*$/g, "").trim(); // 혹시 섞여 있으면 잘라냄
    const kor = stripMetaPipes(lastHangul);
    return { engAnswer: stripMetaPipes(eng), korAnswer: kor };
  }

  // 케이스 B) 그냥 "ENG...KOR..." 붙어있는 형식
  const s = stripMetaPipes(s0);
  const hangulIdx = s.search(/[가-힣]/);
  if (hangulIdx === -1) return { engAnswer: s, korAnswer: "" };
  const eng = s.slice(0, hangulIdx).trim();
  const kor = s.slice(hangulIdx).trim();
  return { engAnswer: eng, korAnswer: kor };
}

function stripMetaPipes(s) {
  return String(s || "").replaceAll("||", " ").replace(/\s+/g, " ").trim();
}

// ---------- intro ----------
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L3-E4";
  const instruction =
    questions[0]?.instruction ||
    "후치수식(관계절/전치사절)을 눌러 줄이고, 정답 문장을 Scramble로 만든 뒤 해석 순서를 맞추세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L3-E4</div>

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

  // reset
  isAnswered = false;
  reducedOk = false;
  engOk = false;
  korOk = false;
  dragDone = false;
  dragPayload = null;
  stage1Phase = "reduce";
  stage1Plan = null;
  shortenDone = false;
  engGhostText = "";
  engSpawning = false;
  engGlowWords = new Set();
  selectedHeadWord = "";
  engRoleWords = buildEngRoleWordsForE34(q);

  requiredIdxSet = new Set();
  fadedIdxSet = new Set();

  engBank = [];
  engSelected = [];
  korBank = [];
  korSelected = [];

  // stage1: token build + required detect
  const sentenceRaw = stripTrailingPeriod(String(q.question || "").trim());
  const wordsOnly = sentenceRaw.split(/\s+/).filter(Boolean);
  const plan = buildStage1Plan(wordsOnly);
  stage1Plan = plan;
  const reqPos = plan ? plan.reduceWordPosSet : getRequiredWordPositions(wordsOnly);

  const t = tokenizeTextWithReq(sentenceRaw, reqPos, 0);
  const tokens = t.tokens;

  for (const tok of tokens) {
    if (!tok.isSpace && tok.isReq) requiredIdxSet.add(String(tok.idx));
  }

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
        ${escapeHtml(q.instruction || "문장에서 후치수식(노란 부분)을 눌러 줄이세요.")}
      </div>
      <div id="instruction-sub" style="margin-top:8px; font-size:12px; color:#555; line-height:1.5;">
        (노란 부분을 전부 줄이면 다음 단계로 넘어갑니다)
      </div>
    </div>

    <div class="ab-shell" id="main-shell">
      <!-- Stage 1 -->
      <div id="stage1">
        <div class="ab-title">문장</div>
        <div class="sentence" id="sentence-q"></div>
        <div class="hint-pill">(노란 부분을 눌러 줄여보세요)</div>
      </div>

      <!-- Stage 2: English Scramble -->
      <div id="stage2" class="hidden">
        <div class="box" style="margin-bottom:10px;">
          <div class="sentence stage2-live" id="eng-plain-line"></div>
        </div>
        <div class="controls">
          <button class="mini-btn" id="eng-undo-btn" type="button">↩︎ 되돌리기</button>
          <button class="mini-btn" id="eng-clear-btn" type="button">🧹 전체지우기</button>
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

  const sentenceQ = document.getElementById("sentence-q");
  if (sentenceQ) sentenceQ.innerHTML = buildSentenceHTML(tokens);
  const initPill = document.getElementById("stage-pill");
  const initText = document.getElementById("instruction-text");
  const initSub = document.getElementById("instruction-sub");
  const initHint = document.querySelector("#stage1 .hint-pill");
  if (initPill) initPill.textContent = "1\ub2e8\uacc4";
  if (initText) initText.textContent = "\uc904\uc77c \ubd80\ubd84\uc744 \ub20c\ub7ec\ubcf4\uc138\uc694.";
  if (initSub) initSub.textContent = "";
  if (initHint) initHint.classList.add("hidden");
  if (initPill) initPill.style.display = "none";

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  const actionRow = document.getElementById("stage-action-row");
  if (actionRow) actionRow.style.display = "none";

  if (sentenceQ) {
    sentenceQ.addEventListener("click", (ev) => {
      const el = ev.target.closest("[data-idx]");
      if (!el) return;

      const idx = el.getAttribute("data-idx");
      if (!idx) return;

      if (!stage1Plan) {
        if (reducedOk) return;
        const isReq = el.getAttribute("data-req") === "1";
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
          enterDragStage(q);
        }
        if (requiredIdxSet.size === 0 && !reducedOk) {
          reducedOk = true;
          enterDragStage(q);
        }
        return;
      }

      if (stage1Phase === "reduce") {
        const isReq = requiredIdxSet.has(String(idx));
        if (!isReq) {
          el.classList.add("nope");
          setTimeout(() => el.classList.remove("nope"), 120);
          return;
        }
        el.classList.toggle("faded");
        if (el.classList.contains("faded")) fadedIdxSet.add(String(idx));
        else fadedIdxSet.delete(String(idx));

        if (isAllRequiredFaded()) {
          reducedOk = true;
          enterPickHeadStage(q);
        }
        return;
      }

      if (stage1Phase === "pickHead") {
        if (String(idx) !== String(stage1Plan.headWordPos)) {
          el.classList.add("nope");
          setTimeout(() => el.classList.remove("nope"), 120);
          return;
        }
        selectedHeadWord = cleanWord(el.textContent || "");
        el.classList.add("head-picked");
        toastOk("2\ub2e8\uacc4 \uc644\ub8cc!");
        setTimeout(() => enterDragStage(q), 120);
        return;
      }
    });
  }

  if (!stage1Plan) {
    if (requiredIdxSet.size === 0 && !reducedOk) {
      reducedOk = true;
      setTimeout(() => enterDragStage(q), 120);
    }
    return;
  }

  if (requiredIdxSet.size === 0 && !reducedOk) {
    reducedOk = true;
    setTimeout(() => enterPickHeadStage(q), 120);
  }
}

function enterPickHeadStage(q) {
  if (!stage1Plan) return;
  stage1Phase = "pickHead";

  const sentenceQ = document.getElementById("sentence-q");
  const hintPill = document.querySelector("#stage1 .hint-pill");
  const pill = document.getElementById("stage-pill");
  const it = document.getElementById("instruction-text");
  const sub = document.getElementById("instruction-sub");

  if (pill) pill.textContent = "2\ub2e8\uacc4";
  if (it) it.textContent = "\uafb8\uba70\uc9c0\ub294 \ub2e8\uc5b4\ub97c \uace0\ub974\uc138\uc694.";
  if (sub) sub.textContent = "";
  if (hintPill) {
    hintPill.classList.remove("drag-bank");
    hintPill.classList.add("hidden");
  }

  if (!sentenceQ) return;
  const spans = Array.from(sentenceQ.querySelectorAll("[data-idx]"));
  spans.forEach((span) => {
    const idx = Number(span.getAttribute("data-idx") || 0);
    span.classList.remove("req", "modifier-live", "head-target", "head-picked", "modifier-underline");
    span.setAttribute("data-req", "0");
    if (stage1Plan.modifierWordPosSet.has(idx)) span.classList.add("modifier-underline");
  });
  toastOk("1\ub2e8\uacc4 \uc644\ub8cc!");
}

function enterDragStage(q) {
  if (dragDone) return;
  if (!stage1Plan) {
    dragDone = true;
    toStage2(q);
    return;
  }
  stage1Phase = "drag";

  const sentenceQ = document.getElementById("sentence-q");
  const hintPill = document.querySelector("#stage1 .hint-pill");
  const pill = document.getElementById("stage-pill");
  const it = document.getElementById("instruction-text");
  const sub = document.getElementById("instruction-sub");
  if (!sentenceQ) {
    dragDone = true;
    toStage2(q);
    return;
  }

  const payload = buildDragPayloadFromPlan(stage1Plan);
  dragPayload = payload;
  if (!payload || !payload.modifierText) {
    dragDone = true;
    toStage2(q);
    return;
  }

  if (pill) pill.textContent = "3\ub2e8\uacc4";
  if (it) it.textContent = "\uc218\uc2dd\uc5b4\ub97c \uc55e\ucabd\uc73c\ub85c \uc62e\uaca8\ubcf4\uc138\uc694.";
  if (sub) sub.textContent = "";

  sentenceQ.innerHTML = renderDragSentenceHTML(payload);
  sentenceQ.classList.add("drag-line");

  if (hintPill) hintPill.classList.add("hidden");

  const slot = document.getElementById("drag-slot");
  const chip = document.getElementById("drag-chip");
  if (!slot || !chip) {
    dragDone = true;
    toStage2(q);
    return;
  }

  const clearDragTip = mountDragTooltip(sentenceQ, chip, slot);

  const completeDrop = () => {
    if (dragDone) return;
    dragDone = true;
    if (clearDragTip) clearDragTip();
    slot.classList.add("filled", "shrink-ready");
    slot.innerHTML = `<span id="shorten-target" class="shorten-target">${escapeHtml(payload.modifierText)}</span>`;
    chip.remove();
    toastOk("3\ub2e8\uacc4 \uc644\ub8cc!");
    setTimeout(() => enterShortenStage(q, payload), 200);
  };

  chip.addEventListener("dragstart", (e) => {
    chip.classList.add("dragging");
    try { e.dataTransfer.setData("text/plain", payload.modifierText); } catch (_) {}
  });
  chip.addEventListener("dragend", () => chip.classList.remove("dragging"));

  slot.addEventListener("dragover", (e) => {
    e.preventDefault();
    slot.classList.add("over");
  });
  slot.addEventListener("dragleave", () => slot.classList.remove("over"));
  slot.addEventListener("drop", (e) => {
    e.preventDefault();
    slot.classList.remove("over");
    const dt = String(e.dataTransfer?.getData("text/plain") || "").trim();
    if (!dt || dt !== payload.modifierText) return;
    completeDrop();
  });
}

function renderDragSentenceHTML(payload) {
  const pieces = [];
  if (payload.beforeText) pieces.push(escapeHtml(payload.beforeText));
  pieces.push(`<span id="drag-slot" class="drag-slot"></span>`);
  if (payload.nounText) {
    const nounCls = cleanWord(payload.nounText) === selectedHeadWord ? ` class="tok head-picked"` : "";
    pieces.push(`<span${nounCls}>${escapeHtml(payload.nounText)}</span>`);
  }
  pieces.push(`<span id="drag-chip" class="drag-chip inline" draggable="true">${escapeHtml(payload.modifierText)}</span>`);
  if (payload.afterText) pieces.push(escapeHtml(payload.afterText));
  return `${pieces.join(" ").trim()}.`;
}

function enterShortenStage(q, payload) {
  if (shortenDone) return;
  const pill = document.getElementById("stage-pill");
  const it = document.getElementById("instruction-text");
  const sub = document.getElementById("instruction-sub");
  if (pill) pill.textContent = "4\ub2e8\uacc4";
  if (it) it.textContent = "\uae34 \uc218\uc2dd\uc744 \ub20c\ub7ec \uc904\uc5ec\ubcf4\uc138\uc694.";
  if (sub) sub.textContent = "";

  const target = document.getElementById("shorten-target");
  if (!target) {
    shortenDone = true;
    const sentenceQ = document.getElementById("sentence-q");
    const sourceText = stripTrailingPeriod(String(sentenceQ?.textContent || q.engAnswer || "").trim());
    toStage2(q, sourceText);
    return;
  }

  const shortText = getShortModifierFromAnswer(q, payload) || payload.modifierText;
  engGlowWords = new Set(tokenizeEnglish(shortText).map((w) => cleanWord(w)).filter(Boolean));
  const clearTapTip = mountTapTooltip(target);
  target.addEventListener(
    "click",
    () => {
      if (shortenDone) return;
      shortenDone = true;
      if (clearTapTip) clearTapTip();
      const shrinkAnim = target.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(0.9)" },
        ],
        { duration: 160, easing: "cubic-bezier(.2,.9,.2,1)" }
      );
      shrinkAnim.finished.then(() => {
        try { shrinkAnim.cancel(); } catch (_) {}
        target.style.transform = "";
        target.textContent = shortText;
        target.classList.add("done", "chunk-final", "to-final", "to-sheen");
        const sentenceQ = document.getElementById("sentence-q");
        const sourceText = stripTrailingPeriod(String(sentenceQ?.textContent || q.engAnswer || "").trim());
        setTimeout(() => {
          toastOk("4\ub2e8\uacc4 \uc644\ub8cc!");
          setTimeout(() => toStage2(q, sourceText), 260);
        }, 260);
      });
    },
    { once: true }
  );
}

function getShortModifierFromAnswer(q, payload) {
  const ansWords = tokenizeEnglish(q?.engAnswer || "");
  if (!ansWords.length) return "";

  const noun = cleanWord(payload?.nounText || "");
  const nounIdx = ansWords.findIndex((w) => cleanWord(w) === noun);
  if (nounIdx <= 0) return "";

  const beforeWords = tokenizeEnglish(payload?.beforeText || "");
  const art = new Set(["a", "an", "the"]);
  const eqWord = (a, b) => {
    const aa = cleanWord(a);
    const bb = cleanWord(b);
    if (!aa || !bb) return false;
    if (aa === bb) return true;
    if (art.has(aa) && art.has(bb)) return true;
    return false;
  };

  let prefixLen = 0;
  while (
    prefixLen < beforeWords.length &&
    prefixLen < ansWords.length &&
    eqWord(beforeWords[prefixLen], ansWords[prefixLen])
  ) {
    prefixLen++;
  }

  let shortWords = [];
  if (nounIdx > prefixLen) shortWords = ansWords.slice(prefixLen, nounIdx);
  if (!shortWords.length) shortWords = [ansWords[nounIdx - 1]];
  return joinEnglishTokens(shortWords);
}

function mountDragTooltip(root, fromEl, toEl) {
  if (!root || !fromEl || !toEl) return null;

  const tip = document.createElement("span");
  tip.className = "drag-tip";
  tip.textContent = "drag";
  root.appendChild(tip);

  let rafId = 0;
  let stopped = false;
  const startedAt = performance.now();
  const duration = 1200;

  const measure = (el) => {
    const r = el.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    return {
      x: r.left - b.left + r.width / 2 - 14,
      y: r.top - b.top - 18,
    };
  };

  const tick = (now) => {
    if (stopped || !tip.isConnected) return;

    const s = measure(fromEl);
    const d = measure(toEl);
    const t = ((now - startedAt) % duration) / duration;
    const mx = (s.x + d.x) / 2;
    const my = Math.min(s.y, d.y) - 16;
    const x = (1 - t) * (1 - t) * s.x + 2 * (1 - t) * t * mx + t * t * d.x;
    const y = (1 - t) * (1 - t) * s.y + 2 * (1 - t) * t * my + t * t * d.y;
    const fadeIn = t < 0.15 ? t / 0.15 : 1;
    const fadeOut = t > 0.88 ? (1 - t) / 0.12 : 1;
    const op = Math.max(0, Math.min(1, fadeIn * fadeOut));
    tip.style.transform = `translate(${x}px, ${y}px)`;
    tip.style.opacity = String(op);
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    tip.remove();
  };
}

function mountTapTooltip(targetEl) {
  if (!targetEl) return null;

  const tip = document.createElement("span");
  tip.className = "tap-tip";
  tip.textContent = "tap!";
  document.body.appendChild(tip);

  let rafId = 0;
  let stopped = false;
  const startAt = performance.now();

  const tick = (now) => {
    if (stopped || !tip.isConnected || !targetEl.isConnected) return;
    const tr = targetEl.getBoundingClientRect();
    const t = (now - startAt) / 1000;
    const bob = Math.sin(t * 6.2) * 4;
    const tw = tip.offsetWidth || 36;
    const th = tip.offsetHeight || 18;
    const x = tr.left + tr.width / 2 - tw / 2;
    const y = tr.top - th - 6 + bob;
    tip.style.transform = `translate(${x}px, ${y}px)`;
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    tip.remove();
  };
}

function buildDragPayloadFromPlan(plan) {
  if (!plan) return null;
  return {
    beforeText: plan.beforeText,
    modifierText: plan.modifierText,
    nounText: plan.nounText,
    afterText: plan.afterText,
  };
}

function joinEnglishTokens(tokens) {
  return (tokens || []).map((x) => String(x || "").trim()).filter(Boolean).join(" ").trim();
}

async function toStage2(q, sourceSentenceText) {
  const stageLine = document.getElementById("sentence-q");
  const stage1 = document.getElementById("stage1");
  const stage2 = document.getElementById("stage2");
  const instBox = document.getElementById("instruction-box");
  const shell = document.getElementById("main-shell");
  const pill = document.getElementById("stage-pill");
  const it = document.getElementById("instruction-text");
  const sub = document.getElementById("instruction-sub");

  if (stageLine) stageLine.classList.add("fall-away");
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

  if (stage1) stage1.classList.add("hidden");
  if (instBox) instBox.remove();
  if (shell) shell.classList.add("flat-shell");
  if (stage2) {
    stage2.classList.remove("hidden");
    stage2.classList.add("swap-in");
  }

  if (pill) pill.textContent = "5\ub2e8\uacc4";
  if (it) it.textContent = "\uc601\uc5b4 \ubb38\uc7a5\uc744 \uc644\uc131\ud574\ubcf4\uc138\uc694.";
  if (sub) sub.textContent = "";

  await wait(180);
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
    if (Array.isArray(q?.configuredFinalParts) && q.configuredFinalParts.length) {
      plain.innerHTML = `<div>${renderConfiguredFinalSentenceForE34(q.configuredFinalParts)}</div>`;
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
  return a
    .map((x) => {
      const t = String(x?.text ?? "");
      const cw = cleanWord(t);
      const cls = [];
      const roleCls = getEngWordRoleClassForE34(cw);
      if (roleCls) cls.push(roleCls);
      if (!roleCls) {
        if (engGlowWords && engGlowWords.has(cw)) cls.push("to-final");
        if (selectedHeadWord && cw === selectedHeadWord) cls.push("head-token-final");
      }
      if (!cls.length) return escapeHtml(t);
      return `<span class="${cls.join(" ")}">${escapeHtml(t)}</span>`;
    })
    .join(" ");
}

function renderEng() {
  const bankArea = document.getElementById("eng-bank-area");
  const remainInfo = document.getElementById("eng-remain-info");
  const plainLine = document.getElementById("eng-plain-line");
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
    const roleCls = getEngWordRoleClassForE34(cleanWord(tok.text || ""));
    if (roleCls === "to-final") btn.classList.add("eng-mod");
    if (roleCls === "head-token-final") btn.classList.add("eng-head");

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
    const src = words
      .map((w) => {
        const cw = cleanWord(w);
        const cls = ["source-word"];
        const roleCls = getEngWordRoleClassForE34(cw);
        if (roleCls) {
          if (roleCls === "to-final") cls.push("source-short");
          else if (roleCls === "head-token-final") cls.push("source-head");
        } else {
          if (engGlowWords && engGlowWords.has(cw)) cls.push("source-short");
          if (selectedHeadWord && cw === selectedHeadWord) cls.push("source-head");
        }
        return `<span class="${cls.join(" ")}">${escapeHtml(w)}</span>`;
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
    toastOk("5\ub2e8\uacc4 \uc644\ub8cc!");
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
        role: mapKRTokensSegToRoleForE34(t.seg),
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
  if (!bankArea || !answerLine) return;

  if (window.HermaFinalStage?.renderKoreanScramble) {
    window.HermaFinalStage.renderKoreanScramble({
      answerLineEl: answerLine,
      bankAreaEl: bankArea,
      remainInfoEl: remainInfo || null,
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
        const roleCls = tokenRoleClassForE34(tok.role);
        if (!roleCls) return;
        el.classList.add(roleCls);
      },
      rerender: () => renderKor(),
    });
    return;
  }

  if (!korSelected.length) {
    answerLine.textContent = "";
  } else {
    answerLine.textContent = korSelected.map((x) => x.text).join(" ");
  }
  if (remainInfo) remainInfo.textContent = `남은 조각: ${korBank.length}개`;

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
  if (isAnswered) return;

  const q = questions[currentIndex];

  const userEng = engSelected.length ? engSelected.map((x) => x.text).join(" ") : "";
  const userKor = korSelected.length ? korSelected.map((x) => x.text).join(" ") : "";

  const engCorrect = normalizeEnglish(userEng) === normalizeEnglish(q.engAnswer);
  const korCorrect = normalizeKorean(userKor) === normalizeKorean(q.korAnswer);

  const correct = !!(reducedOk && engCorrect && korCorrect);

  if (!correct) {
    toastNo("\uc624\ub2f5\u2026");
    return;
  }

  isAnswered = true;

  results.push({
    no: currentIndex + 1,
    word: `Herma L3-E4 / Q${q.qNumber}`,
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
  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";
  toastOk("\uc815\ub2f5!");
}

function goNext() {
  if (!isAnswered) {
    const q = questions[currentIndex];
    const userEng = engSelected.length ? engSelected.map((x) => x.text).join(" ") : "";
    const userKor = korSelected.length ? korSelected.map((x) => x.text).join(" ") : "";

    results.push({
      no: currentIndex + 1,
      word: `Herma L3-E4 / Q${q.qNumber}`,
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
function buildStage1Plan(words) {
  const src = Array.isArray(words) ? words : [];
  if (!src.length) return null;

  const relSet = new Set(["who", "that", "which", "where", "when", "why"]);
  const beLikeSet = new Set(["am", "is", "are", "was", "were", "be", "been", "being"]);

  const relIdx0 = src.findIndex((w) => relSet.has(cleanWord(w)));
  if (relIdx0 <= 0) return null;

  const relPos = relIdx0 + 1;
  const headWordPos = relPos - 1;

  let reduceEndPos = relPos;
  const next1 = cleanWord(src[relIdx0 + 1] || "");
  const next2 = cleanWord(src[relIdx0 + 2] || "");

  if (next1 === "had" || next1 === "has" || next1 === "have") {
    reduceEndPos = Math.min(src.length, relPos + 1);
    if (next2 === "been") reduceEndPos = Math.min(src.length, relPos + 2);
  } else if (beLikeSet.has(next1)) {
    reduceEndPos = Math.min(src.length, relPos + 1);
  }

  const reduceWordPosSet = new Set();
  for (let p = relPos; p <= reduceEndPos; p++) reduceWordPosSet.add(p);

  let modifierStartPos = reduceEndPos + 1;
  let modifierEndPos = src.length;
  if (modifierStartPos > src.length) modifierStartPos = src.length + 1;

  const modifierWordPosSet = new Set();
  if (modifierStartPos <= modifierEndPos) {
    for (let p = modifierStartPos; p <= modifierEndPos; p++) modifierWordPosSet.add(p);
  } else {
    const fallbackStart = Math.min(src.length, relPos + 1);
    if (fallbackStart >= 1) {
      for (let p = fallbackStart; p <= src.length; p++) modifierWordPosSet.add(p);
      modifierStartPos = fallbackStart;
      modifierEndPos = src.length;
    }
  }

  const beforeWords = src.slice(0, Math.max(0, headWordPos - 1));
  const nounText = String(src[headWordPos - 1] || "").trim();
  const modifierWords =
    modifierWordPosSet.size && modifierStartPos <= modifierEndPos
      ? src.slice(modifierStartPos - 1, modifierEndPos)
      : [];
  const afterWords =
    modifierWordPosSet.size && modifierStartPos <= modifierEndPos
      ? src.slice(modifierEndPos)
      : src.slice(reduceEndPos);

  return {
    relWordPos: relPos,
    headWordPos,
    reduceWordPosSet,
    modifierWordPosSet,
    beforeText: joinEnglishTokens(beforeWords),
    modifierText: joinEnglishTokens(modifierWords),
    nounText,
    afterText: joinEnglishTokens(afterWords),
  };
}

// ✅ 규칙: 관계사/관계부사(또는 that/who/which/where...)가 처음 등장하는 지점부터 끝까지 "후치수식"으로 간주
function getRequiredWordPositions(words) {
  const relSet = new Set(["who", "that", "which", "where", "when", "why"]);
  const relIdx0 = words.findIndex((w) => relSet.has(cleanWord(w)));
  if (relIdx0 === -1) return new Set();

  const set = new Set();
  // 1-based positions: relIdx0+1 부터 끝까지
  for (let p = relIdx0 + 1; p <= words.length; p++) set.add(p);
  return set;
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
  // 마침표 보정(이미 있으면 추가 안 함)
  if (!/[.?!]\s*$/.test(out.trim())) out += ".";
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

// ---------- utils ----------
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, Number(ms) || 0));
}

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
