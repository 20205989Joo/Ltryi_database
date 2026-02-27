const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const TARGET_LESSON = 5;
const EXERCISE_ORDER = [3, 32, 33];

let subcategory = "Grammar";
let level = "Basic";
let day = "316";
let quizTitle = "quiz_Grammar_Basic_316";
let userId = "";

let sequence = [];
let currentIndex = 0;
let results = [];
let currentState = null;

const MSG_OK = "\uC815\uB2F5!";
const MSG_NO = "\uC624\uB2F5";

window.addEventListener("DOMContentLoaded", async () => {
  applyQueryParams();
  wireBackButton();

  if (window.PleksToastFX?.init) {
    window.PleksToastFX.init({ hostId: "cafe_int", top: 10 });
  }

  try {
    const rows = await loadExcelRows(EXCEL_FILE);
    sequence = buildSequence(rows);
  } catch (e) {
    console.error(e);
    renderEmpty(`\uD30C\uC77C \uBD88\uB7EC\uC624\uAE30 \uC2E4\uD328\n${EXCEL_FILE}`);
    return;
  }

  if (!sequence.length) {
    renderEmpty("L5-E3/32/33 \uBB38\uD56D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

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
  }
}

function wireBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;
  backBtn.addEventListener("click", () => history.back());
}

function renderEmpty(text) {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  area.innerHTML = `<div class="box">${escapeHtml(String(text || ""))}</div>`;
}

function toastOk(msg) {
  if (window.PleksToastFX?.show) window.PleksToastFX.show("ok", String(msg || ""));
}

function toastNo(msg) {
  if (window.PleksToastFX?.show) window.PleksToastFX.show("no", String(msg || ""));
}

async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

function compactWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(text) {
  return String(text || "").replace(/<[^>]*>/g, " ");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeLoose(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWordToken(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function splitSentenceTokens(text) {
  return compactWhitespace(text).split(/\s+/).filter(Boolean);
}

function hasOverlap(span, occupied) {
  if (!span) return false;
  const [s, e] = span;
  for (const [os, oe] of occupied) {
    if (Math.max(s, os) <= Math.min(e, oe)) return true;
  }
  return false;
}

function findExactSpan(sentenceTokens, phraseText) {
  const s = sentenceTokens.map((t) => normalizeWordToken(t));
  const p = splitSentenceTokens(phraseText).map((t) => normalizeWordToken(t)).filter(Boolean);
  if (!s.length || !p.length || p.length > s.length) return null;

  for (let i = 0; i <= s.length - p.length; i += 1) {
    let ok = true;
    for (let j = 0; j < p.length; j += 1) {
      if (s[i + j] !== p[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return [i, i + p.length - 1];
  }
  return null;
}

function findBestSpan(sentenceTokens, phraseText, occupied = []) {
  const exact = findExactSpan(sentenceTokens, phraseText);
  if (exact && !hasOverlap(exact, occupied)) return exact;

  const s = sentenceTokens.map((t) => normalizeWordToken(t));
  const p = splitSentenceTokens(phraseText).map((t) => normalizeWordToken(t)).filter(Boolean);
  if (!s.length || !p.length) return null;

  const pSet = new Set(p.filter(Boolean));
  let best = null;
  let bestScore = -1;

  for (let i = 0; i < s.length; i += 1) {
    const maxJ = Math.min(s.length - 1, i + 12);
    for (let j = i; j <= maxJ; j += 1) {
      const span = [i, j];
      if (hasOverlap(span, occupied)) continue;

      const words = s.slice(i, j + 1).filter(Boolean);
      if (!words.length) continue;

      let overlap = 0;
      words.forEach((w) => {
        if (pSet.has(w)) overlap += 1;
      });
      if (!overlap) continue;

      const coverageSpan = overlap / words.length;
      const coverageAns = overlap / Math.max(1, pSet.size);
      const lenPenalty = words.length > 8 ? (words.length - 8) * 0.03 : 0;
      const score = coverageAns * 0.7 + coverageSpan * 0.3 - lenPenalty;
      if (score > bestScore) {
        bestScore = score;
        best = span;
      }
    }
  }

  return best;
}

function tokenInSpan(idx, span) {
  if (!Array.isArray(span) || span.length !== 2) return false;
  return idx >= span[0] && idx <= span[1];
}

function extractUnderlinedSegments(html) {
  const out = [];
  const re = /<u>(.*?)<\/u>/gis;
  let m;
  while ((m = re.exec(String(html || ""))) !== null) {
    const t = compactWhitespace(stripTags(m[1] || ""));
    if (t) out.push(t);
  }
  return out;
}

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function repairBrokenUnderlines(raw) {
  let src = String(raw || "");
  const openCount = (src.match(/<u>/gi) || []).length;
  let closeCount = (src.match(/<\/u>/gi) || []).length;

  while (closeCount < openCount) {
    const openIdx = src.toLowerCase().indexOf("<u>");
    const optionMatch = /\bA\.\s*/i.exec(src);
    const optionIdx = optionMatch ? optionMatch.index : src.length;

    let insertAt = optionIdx;
    const dotIdx = src.indexOf(".", Math.max(0, openIdx));
    if (dotIdx >= 0 && dotIdx < optionIdx) insertAt = dotIdx + 1;

    src = `${src.slice(0, insertAt)}</u>${src.slice(insertAt)}`;
    closeCount += 1;
  }

  src = src.replace(/<\/u>(?=[A-Z])/g, "</u> ");

  const optionMatch = /\bA\.\s*/i.exec(src);
  if (!optionMatch) return src.replace(/([.!?])(?=[A-Z])/g, "$1 ");

  const pre = src.slice(0, optionMatch.index).replace(/([.!?])(?=[A-Z])/g, "$1 ");
  const post = src.slice(optionMatch.index);
  return pre + post;
}

function renderStemWithUnderline(stem, underlineText) {
  const src = String(stem || "");
  const targetRaw = compactWhitespace(underlineText || "");
  if (!targetRaw) return escapeHtml(src);

  const candidates = [
    targetRaw,
    targetRaw.replace(/[.]+$/g, "").trim(),
  ].filter(Boolean);

  for (const c of candidates) {
    const pattern = escapeRegExp(c).replace(/\s+/g, "\\s+");
    const re = new RegExp(pattern, "i");
    const m = re.exec(src);
    if (!m) continue;

    const start = m.index;
    const end = start + m[0].length;
    return (
      escapeHtml(src.slice(0, start)) +
      `<u class="t32-under">${escapeHtml(src.slice(start, end))}</u>` +
      escapeHtml(src.slice(end))
    );
  }
  return escapeHtml(src);
}

function renderTextWithUnderlines(text, underlines = []) {
  const src = String(text || "");
  const list = Array.isArray(underlines) ? underlines.filter((x) => compactWhitespace(x)) : [];
  if (!list.length) return escapeHtml(src);

  let cursor = 0;
  let html = "";
  list.forEach((u) => {
    const pattern = escapeRegExp(compactWhitespace(u)).replace(/\s+/g, "\\s+");
    const re = new RegExp(pattern, "i");
    const part = src.slice(cursor);
    const m = re.exec(part);
    if (!m) return;
    const start = cursor + m.index;
    const end = start + m[0].length;
    html += escapeHtml(src.slice(cursor, start));
    html += `<u class="t32-under">${escapeHtml(src.slice(start, end))}</u>`;
    cursor = end;
  });
  html += escapeHtml(src.slice(cursor));
  return html;
}

function extractAnswerValue(raw, key, allKeys) {
  const src = String(raw || "");
  const startRe = new RegExp(`${key}\\s*=\\s*`, "i");
  const startMatch = startRe.exec(src);
  if (!startMatch) return "";

  const from = startMatch.index + startMatch[0].length;
  let to = src.length;

  allKeys.forEach((k) => {
    if (k === key) return;
    const re = new RegExp(`${k}\\s*=\\s*`, "ig");
    re.lastIndex = from;
    const m = re.exec(src);
    if (m && m.index < to) to = m.index;
  });

  return compactWhitespace(src.slice(from, to));
}

function parseChoiceAnswer(raw) {
  const src = compactWhitespace(raw);
  const m = src.match(/\b([A-D])\s*[.)]/i) || src.match(/\b([A-D])\b/i);
  return m ? String(m[1] || "").toUpperCase() : "";
}

function parseEx3Question(raw) {
  const src = String(raw || "");
  return {
    sentenceText: compactWhitespace(stripTags(src)),
    underlined: extractUnderlinedSegments(src),
  };
}

function parseEx3Answer(raw) {
  return compactWhitespace(stripTags(raw));
}

function parseEx32Question(raw) {
  const src = repairBrokenUnderlines(raw);
  const idxA = src.search(/\bA\.\s*/i);
  const stemRaw = idxA >= 0 ? src.slice(0, idxA) : src;
  const stemNoView = stemRaw.replace(/보기\s*:?\s*$/i, "");
  const stem = compactWhitespace(stripTags(stemNoView));
  const underlined = extractUnderlinedSegments(stemNoView);

  const optSrc = idxA >= 0 ? src.slice(idxA) : "";
  const re = /([A-D])\.\s*(.*?)(?=(?:[A-D]\.\s)|$)/gis;
  const options = [];
  let m;
  while ((m = re.exec(optSrc)) !== null) {
    options.push({
      key: String(m[1] || "").toUpperCase(),
      text: compactWhitespace(stripTags(m[2] || "")),
    });
  }

  return { stem, options, underlined };
}

function repairBrokenPairUnderlines(raw) {
  let src = String(raw || "");
  const openCount = (src.match(/<u>/gi) || []).length;
  const closeCount = (src.match(/<\/u>/gi) || []).length;
  if (openCount <= closeCount) return src;

  if (openCount >= 2 && closeCount === 0) {
    const firstOpen = src.toLowerCase().indexOf("<u>");
    const secondOpen = src.toLowerCase().indexOf("<u>", firstOpen + 3);
    if (secondOpen > firstOpen) {
      src = `${src.slice(0, secondOpen)}</u>${src.slice(secondOpen)}`;
    }
    const s2 = /Sentence\s*2\s*:/i.exec(src);
    const insertAt = s2 ? s2.index : src.length;
    src = `${src.slice(0, insertAt)}</u>${src.slice(insertAt)}`;
    src = src.replace(/<\/u>(?=Sentence\s*2)/i, "</u> ");
    return src;
  }

  return repairBrokenUnderlines(src);
}
function sanitizePairValue(text, key) {
  let s = compactWhitespace(stripTags(text || ""));
  s = s.replace(new RegExp(`^${key}\\s*=\\s*`, "i"), "");
  s = s.replace(/^[AB]\s*=\s*/i, "");
  return compactWhitespace(s);
}

function parseEx33Question(raw) {
  const src = repairBrokenPairUnderlines(raw);
  const m1 = src.match(/Sentence\s*1\s*:\s*(.*?)(?=Sentence\s*2\s*:|$)/is);
  const m2 = src.match(/Sentence\s*2\s*:\s*(.*?)(?=A\s*:\s*_+|$)/is);
  const s1Raw = m1 ? m1[1] : src;
  return {
    sentence1: compactWhitespace(stripTags(s1Raw)),
    sentence2: compactWhitespace(stripTags(m2 ? m2[1] : src)),
    underlined: extractUnderlinedSegments(s1Raw),
  };
}

function parseEx33Answer(raw) {
  const src = String(raw || "");
  const ma = src.match(/A\s*=\s*(.*?)(?=B\s*=|$)/is);
  const mb = src.match(/B\s*=\s*(.*)$/is);
  const a = ma ? ma[1] : extractAnswerValue(src, "A", ["A", "B"]);
  const b = mb ? mb[1] : extractAnswerValue(src, "B", ["A", "B"]);
  return {
    A: sanitizePairValue(a, "A"),
    B: sanitizePairValue(b, "B"),
  };
}

function normalizeInstruction(inst, fallback) {
  const s = compactWhitespace(inst);
  if (!s) return fallback || "";
  if (/위와\s*같음/.test(s)) return fallback || "";
  if (s.includes("?꾩?")) return fallback || "";
  return s;
}

function buildSequence(rows) {
  const byEx = { 3: [], 32: [], 33: [] };

  (rows || []).forEach((r) => {
    const lesson = Number(r?.Lesson);
    const exercise = Number(r?.Exercise);
    if (lesson !== TARGET_LESSON || !EXERCISE_ORDER.includes(exercise)) return;

    const qNumber = Number(r?.QNumber);
    if (!Number.isFinite(qNumber)) return;

    byEx[exercise].push({
      exercise,
      qNumber,
      title: compactWhitespace(r?.Title || ""),
      instruction: compactWhitespace(r?.Instruction || ""),
      questionRaw: String(r?.Question || ""),
      answerRaw: String(r?.Answer || ""),
    });
  });

  EXERCISE_ORDER.forEach((ex) => {
    byEx[ex].sort((a, b) => a.qNumber - b.qNumber);
    let prevInst = "";
    byEx[ex] = byEx[ex].map((q) => {
      const inst = normalizeInstruction(q.instruction, prevInst);
      if (inst) prevInst = inst;
      return { ...q, instruction: inst };
    });
  });

  byEx[3] = byEx[3].map((q) => {
    const parsedQ = parseEx3Question(q.questionRaw);
    const target = parseEx3Answer(q.answerRaw);
    const tokens = splitSentenceTokens(parsedQ.sentenceText);
    const targetSpan = findBestSpan(tokens, target, []);
    const seedSpan = parsedQ.underlined.length ? findBestSpan(tokens, parsedQ.underlined[0], []) : null;

    return {
      ...q,
      type: "T3",
      parsedQuestion: parsedQ,
      parsedAnswer: { target },
      sentenceTokens: tokens,
      targetSpan,
      seedSpan,
    };
  });

  byEx[32] = byEx[32].map((q) => {
    const parsedQ = parseEx32Question(q.questionRaw);
    const answerKey = parseChoiceAnswer(q.answerRaw);
    return {
      ...q,
      type: "T32",
      parsedQuestion: parsedQ,
      answerKey,
    };
  });

  byEx[33] = byEx[33].map((q) => {
    const parsedQ = parseEx33Question(q.questionRaw);
    const parsedA = parseEx33Answer(q.answerRaw);
    const tokens = splitSentenceTokens(parsedQ.sentence2);
    const spanA = findBestSpan(tokens, parsedA.A, []);
    const spanB = findBestSpan(tokens, parsedA.B, []);
    return {
      ...q,
      type: "T33",
      parsedQuestion: parsedQ,
      parsedAnswer: parsedA,
      sentenceTokens: tokens,
      keySpans: { A: spanA, B: spanB },
    };
  });

  const maxLen = Math.max(byEx[3].length, byEx[32].length, byEx[33].length);
  const seq = [];
  for (let i = 0; i < maxLen; i += 1) {
    EXERCISE_ORDER.forEach((ex) => {
      const q = byEx[ex][i];
      if (!q) return;
      seq.push({
        ...q,
        seqIndex: seq.length + 1,
        roundIndex: i + 1,
        id: `${ex}-${q.qNumber}`,
      });
    });
  }
  return seq;
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L5-E3</div>
      <button class="quiz-btn" style="width:100%; margin-top:4px;" onclick="startQuiz()">Start</button>
    </div>
  `;
}

function startQuiz() {
  currentIndex = 0;
  results = [];
  renderQuestion();
}

function getFallbackInstruction(type) {
  if (type === "T3") return "\uB3D9\uC77C\uD55C \uB300\uC0C1\uC744 \uAC00\uB9AC\uD0A4\uB294 \uD45C\uD604\uC744 \uD0ED\uD558\uC138\uC694.";
  if (type === "T32") return "\uC815\uB2F5 \uC120\uC9C0\uB97C \uACE0\uB974\uC138\uC694.";
  return "Sentence 2\uC5D0\uC11C A/B\uC5D0 \uD574\uB2F9\uD558\uB294 \uD45C\uD604\uC744 \uCC3E\uC73C\uC138\uC694.";
}

function buildQuestionState(q) {
  const state = {
    correct: false,
    selectedChoice: "",
    t3Solved: false,
    t33: {
      active: "A",
      solved: { A: false, B: false },
    },
  };

  if (q.type === "T33") {
    if (!Array.isArray(q.keySpans?.A)) state.t33.solved.A = true;
    if (!Array.isArray(q.keySpans?.B)) state.t33.solved.B = true;
    state.t33.active = !state.t33.solved.A ? "A" : !state.t33.solved.B ? "B" : "";
  }
  return state;
}

function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  const q = sequence[currentIndex];
  if (!q) {
    showResultPopup();
    return;
  }

  currentState = buildQuestionState(q);
  const instruction = q.instruction || getFallbackInstruction(q.type);

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${sequence.length}</div>

    <div class="box">
      <div style="font-weight:900; color:#7e3106; font-size:13px;">
        ${escapeHtml(instruction)}
      </div>
    </div>

    <div class="box">
      <div class="sentence">${renderQuestionBody(q)}</div>
      ${renderAnswerArea(q)}
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="next-btn" onclick="goNext()" disabled>\uB2E4\uC74C</button>
    </div>
  `;

  wireQuestionEvents(q);
  if (q.type === "T33") paintType33State(q);
}

function buildTokenHtml(tokens, tokenClass, seedSpan = null) {
  return tokens
    .map((t, i) => {
      const seedCls = tokenInSpan(i, seedSpan) ? " seed" : "";
      return `<span class="${tokenClass}${seedCls}" data-idx="${i}">${escapeHtml(t)}</span>`;
    })
    .join(" ");
}

function renderQuestionBody(q) {
  if (q.type === "T3") {
    return `<div id="t3-sentence" class="token-sentence">${buildTokenHtml(q.sentenceTokens, "t3-tok", q.seedSpan)}</div>`;
  }
  if (q.type === "T32") {
    const u = q?.parsedQuestion?.underlined?.[0] || "";
    return `<div>${renderStemWithUnderline(q.parsedQuestion.stem || q.questionRaw, u)}</div>`;
  }
  const s1Rendered = renderTextWithUnderlines(q.parsedQuestion.sentence1 || "", q?.parsedQuestion?.underlined || []);
  return `
    <div class="pair-s1"><b>Sentence 1:</b> ${s1Rendered}</div>
    <div class="pair-s2"><b>Sentence 2:</b> <span id="t33-sentence" class="token-sentence">${buildTokenHtml(q.sentenceTokens, "t33-tok")}</span></div>
  `;
}

function renderAnswerArea(q) {
  if (q.type === "T3") {
    return `<div class="hint-line">\uBC11\uC904 \uD45C\uD604\uACFC \uAC19\uC740 \uBD80\uBD84\uC744 \uD0ED\uD558\uC138\uC694.</div>`;
  }

  if (q.type === "T32") {
    return `
      <div class="choice-list" id="choice-list">
        ${q.parsedQuestion.options
          .map(
            (opt) => `
              <button class="choice-btn" type="button" data-choice="${escapeHtml(opt.key)}">
                <b>${escapeHtml(opt.key)}.</b> ${escapeHtml(opt.text)}
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  return `
    <div class="pair-slot-row" id="pair-slot-row">
      <button type="button" class="pair-slot" data-slot="A">A: ____</button>
      <button type="button" class="pair-slot" data-slot="B">B: ____</button>
    </div>
  `;
}

function wireQuestionEvents(q) {
  if (q.type === "T3") {
    const sent = document.getElementById("t3-sentence");
    if (!sent) return;
    sent.addEventListener("click", (ev) => {
      if (currentState.correct) return;
      const tok = ev.target?.closest?.(".t3-tok[data-idx]");
      if (!tok) return;
      const idx = Number(tok.getAttribute("data-idx"));
      if (!Number.isFinite(idx)) return;

      if (!tokenInSpan(idx, q.targetSpan)) {
        toastNo(MSG_NO);
        return;
      }
      finalizeType3Question(q);
    });
    return;
  }

  if (q.type === "T32") {
    const list = document.getElementById("choice-list");
    if (!list) return;
    list.addEventListener("click", (ev) => {
      if (currentState.correct) return;
      const btn = ev.target?.closest?.(".choice-btn[data-choice]");
      if (!btn) return;
      const key = btn.getAttribute("data-choice") || "";
      currentState.selectedChoice = key;
      list.querySelectorAll(".choice-btn").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");

      const picked = String(key || "").toUpperCase();
      const answerKey = String(q.answerKey || "").toUpperCase();
      if (!picked || picked !== answerKey) {
        toastNo(MSG_NO);
        return;
      }

      currentState.correct = true;
      upsertResult({
        id: q.id,
        no: currentIndex + 1,
        qNumber: q.qNumber,
        word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
        selected: picked,
        correct: true,
        question: q.questionRaw,
        answer: q.answerRaw,
      });

      const nextBtn = document.getElementById("next-btn");
      if (nextBtn) nextBtn.disabled = false;
      list.querySelectorAll(".choice-btn").forEach((el) => {
        el.disabled = true;
      });
      toastOk(MSG_OK);
    });
    return;
  }

  const slotRow = document.getElementById("pair-slot-row");
  const sent = document.getElementById("t33-sentence");
  if (!slotRow || !sent) return;

  slotRow.addEventListener("click", (ev) => {
    if (currentState.correct) return;
    const btn = ev.target?.closest?.(".pair-slot[data-slot]");
    if (!btn) return;
    const slot = String(btn.getAttribute("data-slot") || "");
    if (!slot || currentState.t33.solved[slot]) return;
    currentState.t33.active = slot;
    paintType33State(q);
  });

  sent.addEventListener("click", (ev) => {
    if (currentState.correct) return;
    const tok = ev.target?.closest?.(".t33-tok[data-idx]");
    if (!tok) return;
    const idx = Number(tok.getAttribute("data-idx"));
    if (!Number.isFinite(idx)) return;

    const active = currentState.t33.active;
    if (!active) return;
    const span = q.keySpans?.[active];
    if (!tokenInSpan(idx, span)) {
      toastNo(MSG_NO);
      return;
    }

    currentState.t33.solved[active] = true;
    if (!currentState.t33.solved.A) currentState.t33.active = "A";
    else if (!currentState.t33.solved.B) currentState.t33.active = "B";
    else currentState.t33.active = "";

    paintType33State(q);
    if (currentState.t33.solved.A && currentState.t33.solved.B) {
      finalizeType33Question(q);
    }
  });
}

function paintType33State(q) {
  const sent = document.getElementById("t33-sentence");
  if (sent) {
    const nodes = sent.querySelectorAll(".t33-tok[data-idx]");
    nodes.forEach((n) => n.classList.remove("hit-a", "hit-b"));
    if (currentState?.t33?.solved?.A) {
      nodes.forEach((n) => {
        const idx = Number(n.getAttribute("data-idx"));
        if (tokenInSpan(idx, q.keySpans?.A)) n.classList.add("hit-a");
      });
    }
    if (currentState?.t33?.solved?.B) {
      nodes.forEach((n) => {
        const idx = Number(n.getAttribute("data-idx"));
        if (tokenInSpan(idx, q.keySpans?.B)) n.classList.add("hit-b");
      });
    }
  }

  const row = document.getElementById("pair-slot-row");
  if (!row) return;
  row.querySelectorAll(".pair-slot[data-slot]").forEach((btn) => {
    const slot = String(btn.getAttribute("data-slot") || "");
    const solved = Boolean(currentState?.t33?.solved?.[slot]);
    btn.classList.remove("active", "solved");
    if (solved) btn.classList.add("solved");
    if (!solved && slot === currentState?.t33?.active) btn.classList.add("active");
    const value = solved ? q?.parsedAnswer?.[slot] || "" : "____";
    btn.textContent = `${slot}: ${value}`;
  });
}

function finalizeType3Question(q) {
  if (currentState.correct) return;
  currentState.correct = true;
  const sent = document.getElementById("t3-sentence");
  if (sent) {
    sent.querySelectorAll(".t3-tok[data-idx]").forEach((n) => {
      const idx = Number(n.getAttribute("data-idx"));
      if (tokenInSpan(idx, q.targetSpan)) n.classList.add("hit-target");
    });
  }

  upsertResult({
    id: q.id,
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
    selected: q.parsedAnswer?.target || "",
    correct: true,
    question: q.questionRaw,
    answer: q.answerRaw,
  });

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;
  toastOk(MSG_OK);
}

function finalizeType33Question(q) {
  if (currentState.correct) return;
  currentState.correct = true;

  const summary = `A=${q?.parsedAnswer?.A || ""} | B=${q?.parsedAnswer?.B || ""}`;
  upsertResult({
    id: q.id,
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
    selected: summary,
    correct: true,
    question: q.questionRaw,
    answer: q.answerRaw,
  });

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;
  toastOk(MSG_OK);
}

function upsertResult(item) {
  const idx = results.findIndex((x) => x.id === item.id);
  if (idx >= 0) results[idx] = item;
  else results.push(item);
}

function goNext() {
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn && nextBtn.disabled) return;

  currentIndex += 1;
  if (currentIndex >= sequence.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function showResultPopup() {
  const ordered = sequence.map((q, i) => {
    const found = results.find((r) => r.id === q.id);
    return (
      found || {
        id: q.id,
        no: i + 1,
        qNumber: q.qNumber,
        word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
        selected: "\uBB34\uC751\uB2F5",
        correct: false,
        question: q.questionRaw,
        answer: q.answerRaw,
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

  const score = ordered.filter((x) => x.correct).length;
  alert(`\uC644\uB8CC! (${score}/${ordered.length})`);
}
